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
  private _exhaustionTimerMs: number = 0;
  private _hasHitInCurrentAttack: boolean = false;
  private _comboHits: number = 0;
  private _comboResetTimerMs: number = 0;

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

  get exhaustionRemainingMs(): number {
    return this._exhaustionTimerMs;
  }

  get isExhausted(): boolean {
    return this._exhaustionTimerMs > 0;
  }

  get isParryingActive(): boolean {
    return this._parryTimerMs > 0;
  }

  get comboHits(): number {
    return this._comboHits;
  }

  public registerHitLanded(): number {
    this._comboHits++;
    this._comboResetTimerMs = 1600;
    return this._comboHits;
  }

  public resetCombo(): void {
    this._comboHits = 0;
    this._comboResetTimerMs = 0;
  }

  public startAttack(
    attackId: string,
    stamina: number,
    stateMachine: WarriorStateMachine
  ): { success: boolean; staminaConsumed: number } {
    if (this._hitstunTimerMs > 0 || this._exhaustionTimerMs > 0) {
      return { success: false, staminaConsumed: 0 };
    }

    // Determine target attack ID, resolving combo chains if attacking during active/recovery
    let targetAttackId = attackId;
    const canChainCombo = this._attackPhase === 'active' || this._attackPhase === 'recovery';

    if (canChainCombo && this._currentAttack) {
      if (
        this._currentAttack.id === 'light_slash' &&
        (attackId === 'light_slash' || attackId === 'slash_combo_2')
      ) {
        targetAttackId = 'slash_combo_2';
      } else if (
        this._currentAttack.id === 'slash_combo_2' &&
        (attackId === 'light_slash' || attackId === 'spinning_finisher')
      ) {
        targetAttackId = 'spinning_finisher';
      } else {
        return { success: false, staminaConsumed: 0 };
      }
    } else if (this._attackPhase !== 'none') {
      return { success: false, staminaConsumed: 0 };
    }

    const attack = getAttackDefinition(targetAttackId);
    if (stamina < attack.staminaCost) {
      return { success: false, staminaConsumed: 0 };
    }

    if (!stateMachine.transitionTo('attacking') && stateMachine.state !== 'attacking') {
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
    if (this._hitstunTimerMs > 0 || this._exhaustionTimerMs > 0) {
      return { success: false, staminaConsumed: 0 };
    }
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
    stateMachine: WarriorStateMachine,
    stamina: number = 100
  ): void {
    // Exhaustion update
    if (this._exhaustionTimerMs > 0) {
      this._exhaustionTimerMs -= deltaMs;
      if (this._exhaustionTimerMs <= 0) {
        this._exhaustionTimerMs = 0;
      }
    }

    // Combo timer decay
    if (this._comboResetTimerMs > 0) {
      this._comboResetTimerMs -= deltaMs;
      if (this._comboResetTimerMs <= 0) {
        this._comboHits = 0;
        this._comboResetTimerMs = 0;
      }
    }

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
          const canChainBlock = isBlockingInput && stamina > 0 && this._exhaustionTimerMs === 0;
          stateMachine.transitionTo(canChainBlock ? 'blocking' : 'idle');
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
          const whiffPenalty = !this._hasHitInCurrentAttack
            ? BALANCE_CONFIG.combat.whiffRecoveryPenaltyMs
            : 0;
          this._attackTimerMs = this._currentAttack.recoveryMs + whiffPenalty;
        } else if (this._attackPhase === 'recovery') {
          this._attackPhase = 'none';
          this._currentAttack = null;
          this._hasHitInCurrentAttack = false;
          if (stateMachine.state === 'attacking') {
            stateMachine.transitionTo('idle');
          }
        }
      }
    } else {
      // Defensive blocking check: requires stamina > 0 and not exhausted
      const canBlock =
        isBlockingInput &&
        this._hitstunTimerMs === 0 &&
        this._parryTimerMs === 0 &&
        this._exhaustionTimerMs === 0 &&
        stamina > 0;

      if (canBlock) {
        if (stateMachine.state !== 'blocking') {
          stateMachine.transitionTo('blocking');
        }
      } else if (stateMachine.state === 'blocking') {
        stateMachine.transitionTo('idle');
      }
    }
  }

  public canRegenStamina(): boolean {
    return (
      this._staminaRegenDelayTimerMs <= 0 &&
      this._attackPhase === 'none' &&
      this._hitstunTimerMs === 0 &&
      this._exhaustionTimerMs === 0
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
    let isCounterHit = false;

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
        attackId: attack.id,
        attackType: attack.type,
      };
    }

    // Check Block
    if (stateMachine.state === 'blocking' && isDefenderFacingAttacker) {
      if (attack.type === 'sweep') {
        // Low leg sweep bypasses standing shield guard, sweeping legs and tripping opponent!
        resolution = 'hit';
        isCritical = true;
        finalDamage = attack.damage;
        stunMs = attack.hitstunMs + 80;
        this.resetCombo();
        this.interruptAttack();
        stateMachine.forceState('hitstun');
        this._hitstunTimerMs = stunMs;
      } else {
        resolution = 'blocked';
        blockedDamage = attack.damage * BALANCE_CONFIG.combat.blockDamageReduction;
        finalDamage = attack.damage - blockedDamage;
        // Heavy strikes and aerial Helm Splitters apply crushing posture strain
        const staminaMultiplier =
          attack.type === 'heavy' || attack.type === 'aerial'
            ? 1.6
            : BALANCE_CONFIG.combat.blockStaminaCostPerDamage;
        staminaDamage = attack.damage * staminaMultiplier;
        stunMs = Math.floor(attack.hitstunMs * 0.4); // Greatly reduced hitstun on block
      }
    } else {
      // Clean Hit
      resolution = 'hit';
      const isBackstab = !isDefenderFacingAttacker;
      const isRiposte = this._exhaustionTimerMs > 0 || this._hitstunTimerMs > 0;
      isCounterHit = this._attackPhase === 'windup' || this._attackPhase === 'active';
      isCritical = isBackstab || isRiposte || isCounterHit;

      if (isRiposte) {
        finalDamage = Math.floor(finalDamage * 1.5); // Brutal 1.5x riposte puncture
      } else if (isCounterHit) {
        finalDamage = Math.floor(finalDamage * BALANCE_CONFIG.combat.counterHitDamageMultiplier); // +25% counter bonus
        stunMs += BALANCE_CONFIG.combat.counterHitStunBonusMs; // +100ms hitstun advantage
      } else if (isBackstab) {
        finalDamage = Math.floor(finalDamage * 1.3);
      }
      this.resetCombo();
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

    const isRiposteHit = resolution === 'hit' && (this._exhaustionTimerMs > 0 || isCritical);

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
      isRiposte: isRiposteHit,
      isCounterHit: isCounterHit && resolution === 'hit',
      attackId: attack.id,
      attackType: attack.type,
    };
  }

  public feintAttack(stateMachine: WarriorStateMachine): boolean {
    if (this._attackPhase === 'windup') {
      this.interruptAttack();
      if (stateMachine.state === 'attacking') {
        stateMachine.transitionTo('idle');
      }
      return true;
    }
    return false;
  }

  public applyClashStagger(durationMs: number, stateMachine: WarriorStateMachine): void {
    this.interruptAttack();
    stateMachine.forceState('hitstun');
    this._hitstunTimerMs = durationMs;
  }

  public applyCounterStun(stunDurationMs: number, stateMachine: WarriorStateMachine): void {
    this.interruptAttack();
    stateMachine.forceState('hitstun');
    this._hitstunTimerMs = stunDurationMs;
  }

  public applyExhaustion(durationMs: number, stateMachine: WarriorStateMachine): void {
    this.interruptAttack();
    stateMachine.forceState('hitstun');
    this._hitstunTimerMs = durationMs;
    this._exhaustionTimerMs = durationMs;
    this._staminaRegenDelayTimerMs = BALANCE_CONFIG.combat.staminaRegenDelayMs;
  }

  public interruptAttack(): void {
    this._attackPhase = 'none';
    this._currentAttack = null;
    this._hasHitInCurrentAttack = false;
  }
}
