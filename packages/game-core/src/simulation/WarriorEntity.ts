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
  public roundsWon: number = 0;
  public isDecapitated: boolean = false;

  public readonly movement: MovementController;
  public readonly stateMachine: WarriorStateMachine;
  public readonly combat: CombatController;

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

    this.movement = new MovementController(initialPosition, initialFacing);
    this.stateMachine = new WarriorStateMachine();
    this.combat = new CombatController();
  }

  public resetRound(spawnPosition: Vector2, facing: Direction): void {
    this.health = this.preset.attributes.maxHealth;
    this.stamina = this.preset.attributes.maxStamina;
    this.isDecapitated = false;
    this.movement.setPosition(spawnPosition);
    this.movement.setVelocity({ x: 0, y: 0 });
    this.movement.setFacing(facing);
    this.stateMachine.forceState('idle');
    this.combat.interruptAttack();
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
      id: `${this.id}_${attack.id}_${Date.now()}`,
      ownerId: this.id,
      attackId: attack.id,
      bounds,
      isActive: true,
    };
  }

  public processInput(input: PlayerInputMessage): void {
    if (this.health <= 0) return;

    // Attack requested
    if (input.attack && this.combat.attackPhase === 'none') {
      const attackType = input.attackType || 'light';
      const attackId =
        attackType === 'heavy'
          ? 'heavy_strike'
          : attackType === 'thrust'
            ? 'thrust'
            : 'light_slash';

      const result = this.combat.startAttack(attackId, this.stamina, this.stateMachine);
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
        input.moveX !== 0
          ? Math.sign(input.moveX)
          : this.movement.facing === 'right'
            ? 1
            : -1;
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
    const jumpRequested = input ? input.jump : false;

    // Movement speed halved when exhausted
    const effectiveWalkSpeed = this.combat.isExhausted
      ? this.preset.attributes.walkSpeed * 0.5
      : this.preset.attributes.walkSpeed;

    this.movement.update(
      moveX,
      jumpRequested,
      canMove,
      effectiveWalkSpeed,
      this.preset.attributes.jumpVelocity,
      deltaSec,
      arena,
      physics
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
    };
  }
}
