import {
  AttackDefinition,
  AttackPhase,
  HitResult,
  HitResolutionType,
  Direction,
  Vector2,
} from '@last-crown/shared';
import { BALANCE_CONFIG, getAttackDefinition } from '@last-crown/game-config';
import { WarriorStateMachine } from '../state-machine/WarriorStateMachine.js';

export class CombatController {
  private _currentAttack: AttackDefinition | null = null;
  private _attackPhase: AttackPhase = 'none';
  private _attackTimerMs: number = 0;
  private _parryTimerMs: number = 0;
  private _hitstunTimerMs: number = 0;
  private _staminaRegenDelayTimerMs: number = 0;
  private _hasHitInCurrentAttack: boolean = false;

  get attackPhase(): AttackPhase {
    return this._attackPhase;
  }

  get currentAttack(): AttackDefinition | null {
    return this._currentAttack;
  }

  get parryWindowRemainingMs(): number {
    return this._parryTimerMs;
  }

  get hitstunRemainingMs(): number {
    return this._hitstunTimerMs;
  }

  get isParryingActive(): boolean {
    return this._parryTimerMs > 0;
  }

  public startAttack(
    attackId: string,
    stamina: number,
    stateMachine: WarriorStateMachine
  ): { success: boolean; staminaConsumed: number } {
    if (this._hitstunTimerMs > 0) return { success: false, staminaConsumed: 0 };
    if (this._attackPhase !== 'none') return { success: false, staminaConsumed: 0 };

    const attack = getAttackDefinition(attackId);
    if (stamina < attack.staminaCost) {
      return { success: false, staminaConsumed: 0 };
    }

    if (!stateMachine.transitionTo('attacking')) {
      return { success: false, staminaConsumed: 0 };
    }

    this._currentAttack = attack;
    this._attackPhase = 'windup';
    this._attackTimerMs = attack.windupMs;
    this._hasHitInCurrentAttack = false;
    this._staminaRegenDelayTimerMs = BALANCE_CONFIG.combat.staminaRegenDelayMs;

    return { success: true, staminaConsumed: attack.staminaCost };
  }

  public startParry(
    stamina: number,
    stateMachine: WarriorStateMachine
  ): { success: boolean; staminaConsumed: number } {
    if (this._hitstunTimerMs > 0) return { success: false, staminaConsumed: 0 };
    if (this._attackPhase !== 'none') return { success: false, staminaConsumed: 0 };
    if (stamina < 15) return { success: false, staminaConsumed: 0 };

    if (!stateMachine.transitionTo('parrying')) {
      return { success: false, staminaConsumed: 0 };
    }

    this._parryTimerMs = BALANCE_CONFIG.combat.parryWindowMs;
    this._staminaRegenDelayTimerMs = BALANCE_CONFIG.combat.staminaRegenDelayMs;

    return { success: true, staminaConsumed: 15 };
  }

  public update(
    deltaMs: number,
    isBlockingInput: boolean,
    stateMachine: WarriorStateMachine
  ): void {
    // Hitstun update
    if (this._hitstunTimerMs > 0) {
      this._hitstunTimerMs -= deltaMs;
      if (this._hitstunTimerMs <= 0) {
        this._hitstunTimerMs = 0;
        if (stateMachine.state === 'hitstun') {
          stateMachine.transitionTo('idle');
        }
      }
    }

    // Parry window update
    if (this._parryTimerMs > 0) {
      this._parryTimerMs -= deltaMs;
      if (this._parryTimerMs <= 0) {
        this._parryTimerMs = 0;
        if (stateMachine.state === 'parrying') {
          stateMachine.transitionTo(isBlockingInput ? 'blocking' : 'idle');
        }
      }
    }

    // Stamina recovery delay countdown
    if (this._staminaRegenDelayTimerMs > 0) {
      this._staminaRegenDelayTimerMs -= deltaMs;
    }

    // Attack phases progression
    if (this._attackPhase !== 'none' && this._currentAttack) {
      this._attackTimerMs -= deltaMs;

      if (this._attackTimerMs <= 0) {
        if (this._attackPhase === 'windup') {
          this._attackPhase = 'active';
          this._attackTimerMs = this._currentAttack.activeMs;
        } else if (this._attackPhase === 'active') {
          this._attackPhase = 'recovery';
          this._attackTimerMs = this._currentAttack.recoveryMs;
        } else if (this._attackPhase === 'recovery') {
          this._attackPhase = 'none';
          this._currentAttack = null;
          this._hasHitInCurrentAttack = false;
          if (stateMachine.state === 'attacking') {
            stateMachine.transitionTo('idle');
          }
        }
      }
    } else if (isBlockingInput && this._hitstunTimerMs === 0 && this._parryTimerMs === 0) {
      if (stateMachine.state !== 'blocking') {
        stateMachine.transitionTo('blocking');
      }
    } else if (stateMachine.state === 'blocking' && !isBlockingInput) {
      stateMachine.transitionTo('idle');
    }
  }

  public canRegenStamina(): boolean {
    return (
      this._staminaRegenDelayTimerMs <= 0 &&
      this._attackPhase === 'none' &&
      this._hitstunTimerMs === 0
    );
  }

  public markHitConfirmed(): void {
    this._hasHitInCurrentAttack = true;
  }

  public hasAlreadyHit(): boolean {
    return this._hasHitInCurrentAttack;
  }

  public resolveIncomingHit(
    attackerId: string,
    defenderId: string,
    attack: AttackDefinition,
    attackerFacing: Direction,
    isDefenderFacingAttacker: boolean,
    stateMachine: WarriorStateMachine
  ): HitResult {
    let resolution: HitResolutionType = 'hit';
    let finalDamage = attack.damage;
    let blockedDamage = 0;
    let staminaDamage = 0;
    let stunMs = attack.hitstunMs;
    let isCritical = false;

    // Check Parry First
    if (this.isParryingActive && isDefenderFacingAttacker) {
      resolution = 'parried';
      finalDamage = 0;
      blockedDamage = attack.damage;
      staminaDamage = 0;
      stunMs = 0; // Defender is NOT stunned!
      this._parryTimerMs = 0;
      return {
        resolution,
        attackerId,
        defenderId,
        damage: 0,
        blockedDamage,
        staminaDamage: 0,
        knockback: { x: 0, y: 0 },
        hitstunMs: 0,
        isCritical: false,
      };
    }

    // Check Block
    if (stateMachine.state === 'blocking' && isDefenderFacingAttacker) {
      resolution = 'blocked';
      blockedDamage = attack.damage * BALANCE_CONFIG.combat.blockDamageReduction;
      finalDamage = attack.damage - blockedDamage;
      staminaDamage = attack.damage * BALANCE_CONFIG.combat.blockStaminaCostPerDamage;
      stunMs = Math.floor(attack.hitstunMs * 0.4); // Greatly reduced hitstun on block
    } else {
      // Clean Hit
      resolution = 'hit';
      isCritical = !isDefenderFacingAttacker; // Backstab / flanking critical
      if (isCritical) {
        finalDamage = Math.floor(finalDamage * 1.3);
      }
      this.interruptAttack();
      stateMachine.forceState('hitstun');
      this._hitstunTimerMs = stunMs;
    }

    // Calculate knockback direction
    const knockbackSign = attackerFacing === 'right' ? 1 : -1;
    const knockback: Vector2 = {
      x: attack.knockback.x * knockbackSign * (resolution === 'blocked' ? 0.35 : 1),
      y: attack.knockback.y * (resolution === 'blocked' ? 0.2 : 1),
    };

    return {
      resolution,
      attackerId,
      defenderId,
      damage: Math.round(finalDamage),
      blockedDamage: Math.round(blockedDamage),
      staminaDamage: Math.round(staminaDamage),
      knockback,
      hitstunMs: stunMs,
      isCritical,
    };
  }

  public applyCounterStun(stunDurationMs: number, stateMachine: WarriorStateMachine): void {
    this.interruptAttack();
    stateMachine.forceState('hitstun');
    this._hitstunTimerMs = stunDurationMs;
  }

  public interruptAttack(): void {
    this._attackPhase = 'none';
    this._currentAttack = null;
    this._hasHitInCurrentAttack = false;
  }
}
