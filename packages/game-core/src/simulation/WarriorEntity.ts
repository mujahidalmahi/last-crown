import {
  AABB,
  Direction,
  Vector2,
  WarriorSnapshot,
  PlayerInputMessage,
  HitboxInstance,
} from '@last-crown/shared';
import {
  WarriorClassPreset,
  getWarriorPreset,
  ArenaConfig,
  BALANCE_CONFIG,
} from '@last-crown/game-config';
import { MovementController } from '../movement/MovementController.js';
import { WarriorStateMachine } from '../state-machine/WarriorStateMachine.js';
import { CombatController } from '../combat/CombatController.js';
import { IPhysicsAdapter } from '../physics/IPhysicsAdapter.js';
import { computeHurtboxAABB, computeDirectionalHitboxAABB } from '../collision/aabb.js';

export class WarriorEntity {
  public readonly id: string;
  public readonly name: string;
  public readonly preset: WarriorClassPreset;

  public health: number;
  public stamina: number;
  public burstMeter: number = 0;
  public isBurstActive: boolean = false;
  public roundsWon: number = 0;
  public isDecapitated: boolean = false;

  private _burstActiveTimerMs: number = 0;
  private _invulnerabilityTimerMs: number = 0;
  private _pendingBurstBreaker: boolean = false;
  private _pendingTechBreak: boolean = false;
  private _lastInput: PlayerInputMessage | null = null;

  get isInvulnerable(): boolean {
    return this._invulnerabilityTimerMs > 0;
  }

  get lastInput(): PlayerInputMessage | null {
    return this._lastInput;
  }

  get maxHealth(): number {
    return this.preset.attributes.maxHealth;
  }

  get maxStamina(): number {
    return this.preset.attributes.maxStamina;
  }

  public readonly movement: MovementController;
  public readonly stateMachine: WarriorStateMachine;
  public readonly combat: CombatController;
  private _hitboxSeq: number = 0;

  constructor(
    id: string,
    name: string,
    presetId: string,
    initialPosition: Vector2,
    initialFacing: Direction = 'right'
  ) {
    this.id = id;
    this.name = name;
    this.preset = getWarriorPreset(presetId);
    this.health = this.preset.attributes.maxHealth;
    this.stamina = this.preset.attributes.maxStamina;
    this.burstMeter = 0;
    this.isBurstActive = false;

    this.movement = new MovementController(initialPosition, initialFacing);
    this.stateMachine = new WarriorStateMachine();
    this.combat = new CombatController();
  }

  public resetRound(spawnPosition: Vector2, facing: Direction): void {
    this.health = this.preset.attributes.maxHealth;
    this.stamina = this.preset.attributes.maxStamina;
    this.burstMeter = 0;
    this.isBurstActive = false;
    this._burstActiveTimerMs = 0;
    this._invulnerabilityTimerMs = 0;
    this._pendingBurstBreaker = false;
    this._pendingTechBreak = false;
    this.isDecapitated = false;
    this.movement.setPosition(spawnPosition);
    this.movement.setVelocity({ x: 0, y: 0 });
    this.movement.setFacing(facing);
    this.stateMachine.forceState('idle');
    this.combat.interruptAttack();
    this.combat.resetCombo();
  }

  public consumeBurstBreaker(): boolean {
    if (this._pendingBurstBreaker) {
      this._pendingBurstBreaker = false;
      return true;
    }
    return false;
  }

  public consumeTechBreak(): boolean {
    if (this._pendingTechBreak) {
      this._pendingTechBreak = false;
      return true;
    }
    return false;
  }

  public getHurtbox(): AABB {
    return computeHurtboxAABB(
      this.movement.position,
      this.preset.hurtbox.width,
      this.preset.hurtbox.height
    );
  }

  public getActiveHitbox(): HitboxInstance | null {
    if (
      this.combat.attackPhase !== 'active' ||
      !this.combat.currentAttack ||
      this.combat.hasAlreadyHit()
    ) {
      return null;
    }

    const attack = this.combat.currentAttack;
    const bounds = computeDirectionalHitboxAABB(
      this.movement.position,
      this.movement.facing,
      attack.hitboxWidth,
      attack.hitboxHeight,
      attack.hitboxOffsetX,
      attack.hitboxOffsetY
    );

    return {
      id: `${this.id}_${attack.id}_${++this._hitboxSeq}`,
      ownerId: this.id,
      attackId: attack.id,
      bounds,
      isActive: true,
    };
  }

  public processInput(input: PlayerInputMessage): void {
    if (this.health <= 0) return;
    this._lastInput = input;

    // Crown Burst: Defensive Breaker or Offensive Roman Cancel
    if (input.burst && this.burstMeter >= BALANCE_CONFIG.combat.burstMaxMeter) {
      this.burstMeter = 0;
      if (this.combat.hitstunRemainingMs > 0 || this.stateMachine.state === 'hitstun') {
        // Defensive Burst Breaker: pop out of combo/hitstun
        this.combat.clearHitstun(this.stateMachine);
        this._pendingBurstBreaker = true;
      } else {
        // Offensive Golden Burst: cancel attack/recovery into immediate neutral with speed buff
        this.combat.interruptAttack();
        this.stateMachine.forceState('idle');
        this.isBurstActive = true;
        this._burstActiveTimerMs = BALANCE_CONFIG.combat.burstStateDurationMs;
      }
      return;
    }

    // Knockdown Tech Roll on floor impact or during hitstun when grounded
    if (
      this.combat.hitstunRemainingMs > 0 &&
      input.dash &&
      input.moveX !== 0 &&
      this.movement.isGrounded
    ) {
      this.combat.clearHitstun(this.stateMachine);
      this._invulnerabilityTimerMs = BALANCE_CONFIG.combat.techRollInvulnerabilityMs;
      const rollDir = Math.sign(input.moveX);
      this.movement.setVelocity({
        x: rollDir * BALANCE_CONFIG.combat.techRollSpeed,
        y: 0,
      });
      this.stateMachine.forceState('running');
      return;
    }

    // Command Grab / Throw or Throw Tech Break
    if (input.throw) {
      // If currently grabbed, tech break!
      if (this.combat.isGrabbed && this.combat.grabBreakWindowMs > 0) {
        this.combat.techBreak(this.stateMachine);
        this._pendingTechBreak = true;
        return;
      }

      // Initiate throw attempt
      if (
        this.movement.isGrounded &&
        this.combat.attackPhase === 'none' &&
        this.combat.hitstunRemainingMs === 0 &&
        this.stamina >= BALANCE_CONFIG.combat.throwStaminaCost &&
        !this.combat.isExhausted &&
        this.stateMachine.state !== 'parrying'
      ) {
        const result = this.combat.startAttack('command_throw', this.stamina, this.stateMachine);
        if (result.success) {
          this.stamina = Math.max(0, this.stamina - result.staminaConsumed);
        }
        return;
      }
    }

    // Feint / Attack Cancel: Cancel attack during windup with dash, block, or parry
    if (
      this.combat.attackPhase === 'windup' &&
      (input.dash || input.block || input.parry) &&
      this.stamina >= 10 &&
      !this.combat.isExhausted
    ) {
      this.combat.feintAttack(this.stateMachine);
      this.stamina = Math.max(0, this.stamina - 10);
      if (input.dash) {
        const dashDir =
          input.moveX !== 0 ? Math.sign(input.moveX) : this.movement.facing === 'right' ? 1 : -1;
        this.movement.setVelocity({
          x: dashDir * BALANCE_CONFIG.combat.dashSpeed,
          y: this.movement.velocity.y,
        });
      } else if (input.parry) {
        this.combat.startParry(this.stamina, this.stateMachine);
      } else if (input.block) {
        this.stateMachine.transitionTo('blocking');
      }
      return;
    }

    // Attack requested
    if (input.attack) {
      let attackId = 'light_slash';
      if (!this.movement.isGrounded) {
        attackId = 'aerial_strike';
      } else if (input.attackType === 'sweep') {
        attackId = 'low_sweep';
      } else if (input.attackType === 'heavy') {
        attackId = 'heavy_strike';
      } else if (input.attackType === 'thrust') {
        attackId = 'thrust';
      } else if (
        input.attackType === 'dash' ||
        (input.dash && input.attack) ||
        Math.abs(this.movement.velocity.x) > 350
      ) {
        attackId = 'dash_lunge';
      } else if (input.attackType === 'aerial') {
        attackId = !this.movement.isGrounded ? 'aerial_strike' : 'light_slash';
      } else {
        attackId = 'light_slash';
      }

      const result = this.combat.startAttack(attackId, this.stamina, this.stateMachine);
      if (result.success) {
        if (attackId === 'aerial_strike') {
          this.movement.setVelocity({
            x: this.movement.velocity.x * 0.5,
            y: BALANCE_CONFIG.movement.aerialStrikeDownwardSpeed,
          });
        }
        this.stamina = Math.max(0, this.stamina - result.staminaConsumed);
        if (this.stamina === 0) {
          this.combat.applyExhaustion(
            BALANCE_CONFIG.combat.staminaDepletedExhaustionMs,
            this.stateMachine
          );
        }
      }
      return;
    }

    // Parry requested
    if (input.parry && this.combat.attackPhase === 'none') {
      const result = this.combat.startParry(this.stamina, this.stateMachine);
      if (result.success) {
        this.stamina = Math.max(0, this.stamina - result.staminaConsumed);
        if (this.stamina === 0) {
          this.combat.applyExhaustion(
            BALANCE_CONFIG.combat.staminaDepletedExhaustionMs,
            this.stateMachine
          );
        }
      }
      return;
    }

    // Tactical Dash requested (agile evasive footwork)
    if (
      input.dash &&
      this.movement.isGrounded &&
      this.combat.attackPhase === 'none' &&
      this.combat.hitstunRemainingMs === 0 &&
      this.stamina >= BALANCE_CONFIG.combat.dashStaminaCost &&
      !this.combat.isExhausted &&
      this.stateMachine.state !== 'blocking' &&
      this.stateMachine.state !== 'parrying'
    ) {
      const dashDir =
        input.moveX !== 0 ? Math.sign(input.moveX) : this.movement.facing === 'right' ? 1 : -1;
      this.movement.setVelocity({
        x: dashDir * BALANCE_CONFIG.combat.dashSpeed,
        y: this.movement.velocity.y,
      });
      this.stamina = Math.max(0, this.stamina - BALANCE_CONFIG.combat.dashStaminaCost);
      return;
    }
  }

  public update(
    input: PlayerInputMessage | null,
    deltaSec: number,
    arena: ArenaConfig,
    physics: IPhysicsAdapter
  ): void {
    const deltaMs = deltaSec * 1000;
    this.stateMachine.update(deltaMs);

    // Update timers
    if (this._invulnerabilityTimerMs > 0) {
      this._invulnerabilityTimerMs -= deltaMs;
      if (this._invulnerabilityTimerMs <= 0) {
        this._invulnerabilityTimerMs = 0;
      }
    }

    if (this.isBurstActive) {
      this._burstActiveTimerMs -= deltaMs;
      if (this._burstActiveTimerMs <= 0) {
        this.isBurstActive = false;
        this._burstActiveTimerMs = 0;
      }
    }

    const isBlockingInput = Boolean(input?.block);
    this.combat.update(deltaMs, isBlockingInput, this.stateMachine, this.stamina);

    // Can warrior move?
    // Cannot move if attacking, in hitstun, knocked down, dead, or blocking
    const canMove =
      this.health > 0 &&
      this.combat.attackPhase === 'none' &&
      this.combat.hitstunRemainingMs === 0 &&
      this.stateMachine.state !== 'blocking' &&
      this.stateMachine.state !== 'parrying';

    const moveX = input ? input.moveX : 0;
    const moveY = input?.moveY;
    const jumpRequested = input ? input.jump : false;

    // Movement speed halved when exhausted, boosted when Crown Burst is active
    const speedMult = this.isBurstActive ? BALANCE_CONFIG.combat.burstSpeedMultiplier : 1.0;
    const baseWalkSpeed = this.combat.isExhausted
      ? this.preset.attributes.walkSpeed * 0.5
      : this.preset.attributes.walkSpeed;
    const effectiveWalkSpeed = baseWalkSpeed * speedMult;

    this.movement.update(
      moveX,
      jumpRequested,
      canMove,
      effectiveWalkSpeed,
      this.preset.attributes.jumpVelocity,
      deltaSec,
      arena,
      physics,
      moveY
    );

    // Update state machine based on movement
    if (
      canMove &&
      this.stateMachine.state !== 'attacking' &&
      this.stateMachine.state !== 'hitstun'
    ) {
      if (!this.movement.isGrounded) {
        if (this.movement.velocity.y < 0) {
          this.stateMachine.transitionTo('jumping');
        } else {
          this.stateMachine.transitionTo('falling');
        }
      } else if (Math.abs(this.movement.velocity.x) > 10) {
        this.stateMachine.transitionTo('running');
      } else {
        this.stateMachine.transitionTo('idle');
      }
    }

    // Stamina regeneration
    if (this.combat.canRegenStamina() && this.stamina < this.preset.attributes.maxStamina) {
      const regenRate =
        this.stateMachine.state === 'blocking'
          ? this.preset.attributes.staminaRegenRate * 0.25
          : this.preset.attributes.staminaRegenRate;

      this.stamina = Math.min(
        this.preset.attributes.maxStamina,
        this.stamina + regenRate * deltaSec
      );
    }
  }

  public applyDamage(amount: number): void {
    this.health = Math.max(0, this.health - amount);
    this.burstMeter = Math.min(
      BALANCE_CONFIG.combat.burstMaxMeter,
      this.burstMeter + amount * BALANCE_CONFIG.combat.burstMeterPerDamageTaken
    );
    if (this.health <= 0) {
      this.stateMachine.forceState('dead');
    }
  }

  public applyStaminaDamage(amount: number): boolean {
    const hadStamina = this.stamina > 0;
    this.stamina = Math.max(0, this.stamina - amount);
    if (hadStamina && this.stamina === 0) {
      return true; // Triggered guard break / exhaustion
    }
    return false;
  }

  public toSnapshot(): WarriorSnapshot {
    return {
      id: this.id,
      name: this.name,
      position: { ...this.movement.position },
      velocity: { ...this.movement.velocity },
      facing: this.movement.facing,
      isGrounded: this.movement.isGrounded,
      health: this.health,
      maxHealth: this.preset.attributes.maxHealth,
      stamina: Math.round(this.stamina),
      maxStamina: this.preset.attributes.maxStamina,
      state: this.stateMachine.state,
      attackPhase: this.combat.attackPhase,
      currentAttackId: this.combat.currentAttack?.id || null,
      parryWindowRemainingMs: this.combat.parryWindowRemainingMs,
      hitstunRemainingMs: this.combat.hitstunRemainingMs,
      hurtbox: this.getHurtbox(),
      roundsWon: this.roundsWon,
      isExhausted: this.combat.isExhausted,
      isDecapitated: this.isDecapitated,
      comboCount: this.combat.comboHits,
      burstMeter: Math.round(this.burstMeter),
      isBurstActive: this.isBurstActive,
      isGrabbed: this.combat.isGrabbed,
      grabBreakWindowMs: Math.round(this.combat.grabBreakWindowMs),
    };
  }
}
