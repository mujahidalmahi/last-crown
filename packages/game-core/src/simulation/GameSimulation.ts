import {
  MatchState,
  PlayerInputMessage,
  HitResult,
  HitboxInstance,
  WarriorSnapshot,
} from '@last-crown/shared';
import { ArenaConfig, getArenaConfig, BALANCE_CONFIG } from '@last-crown/game-config';
import { WarriorEntity } from './WarriorEntity.js';
import { IPhysicsAdapter } from '../physics/IPhysicsAdapter.js';
import { KinematicPhysicsAdapter } from '../physics/KinematicPhysicsAdapter.js';
import { checkAABBOverlap } from '../collision/aabb.js';

export interface GameSimulationSnapshot {
  matchState: MatchState;
  roundNumber: number;
  timerSeconds: number;
  winnerId: string | null;
  p1: WarriorSnapshot;
  p2: WarriorSnapshot;
  activeHitboxes: HitboxInstance[];
}

export class GameSimulation {
  public readonly arena: ArenaConfig;
  public readonly p1: WarriorEntity;
  public readonly p2: WarriorEntity;

  private _physics: IPhysicsAdapter;
  private _matchState: MatchState = 'in_progress';
  private _roundNumber: number = 1;
  private _roundTimerSec: number = BALANCE_CONFIG.rules.roundDurationSeconds;
  private _roundTransitionTimerMs: number = 0;
  private _winnerId: string | null = null;
  private _combatEventListeners: ((result: HitResult) => void)[] = [];

  constructor(
    p1Id: string,
    p1Name: string,
    p1Preset: string,
    p2Id: string,
    p2Name: string,
    p2Preset: string,
    arenaId: string = 'bastion_courtyard',
    physicsAdapter?: IPhysicsAdapter
  ) {
    this.arena = getArenaConfig(arenaId);
    this._physics = physicsAdapter || new KinematicPhysicsAdapter();

    this.p1 = new WarriorEntity(p1Id, p1Name, p1Preset, this.arena.spawnPointP1, 'right');

    this.p2 = new WarriorEntity(p2Id, p2Name, p2Preset, this.arena.spawnPointP2, 'left');
  }

  get physics(): IPhysicsAdapter {
    return this._physics;
  }

  get matchState(): MatchState {
    return this._matchState;
  }

  get roundNumber(): number {
    return this._roundNumber;
  }

  get roundTimerSec(): number {
    return Math.max(0, Math.ceil(this._roundTimerSec));
  }

  get winnerId(): string | null {
    return this._winnerId;
  }

  public onCombatEvent(callback: (result: HitResult) => void): () => void {
    this._combatEventListeners.push(callback);
    return () => {
      this._combatEventListeners = this._combatEventListeners.filter(cb => cb !== callback);
    };
  }

  public step(
    p1Input: PlayerInputMessage | null,
    p2Input: PlayerInputMessage | null,
    deltaSec: number
  ): void {
    // Clamp delta to prevent physics tunneling or simulation jumps after tab suspension
    const clampedDeltaSec = Math.min(Math.max(0, deltaSec), 0.1);
    const deltaMs = clampedDeltaSec * 1000;

    // Handle round end or countdown transitions
    if (this._matchState === 'round_over') {
      this._roundTransitionTimerMs -= deltaMs;
      if (this._roundTransitionTimerMs <= 0) {
        this.startNextRound();
      }
      return;
    }

    if (this._matchState === 'match_over') {
      return;
    }

    // Process player inputs
    if (p1Input) this.p1.processInput(p1Input);
    if (p2Input) this.p2.processInput(p2Input);

    // Update warrior physics and states
    this.p1.update(p1Input, clampedDeltaSec, this.arena, this._physics);
    this.p2.update(p2Input, clampedDeltaSec, this.arena, this._physics);

    // Resolve soft-body fighter separation (prevent ghosting through each other)
    this.resolveFighterSeparation();

    // Check wall bounces
    this.checkWallBounces();

    // Decrement round timer
    this._roundTimerSec -= clampedDeltaSec;

    // Check combat collisions (including weapon clash)
    this.resolveCombatCollisions();

    // Check round win conditions
    this.checkRoundConditions();
  }

  private resolveFighterSeparation(): void {
    if (this.p1.health <= 0 || this.p2.health <= 0) return;
    if (this.p1.isDecapitated || this.p2.isDecapitated) return;

    const p1Pos = this.p1.movement.position;
    const p2Pos = this.p2.movement.position;

    // Only apply horizontal separation if roughly on same vertical level
    if (Math.abs(p1Pos.y - p2Pos.y) > 65) return;

    const minSep = BALANCE_CONFIG.movement.fighterSeparationDistance;
    const dx = p2Pos.x - p1Pos.x;
    const dist = Math.abs(dx);

    if (dist < minSep) {
      const overlap = minSep - dist;
      const pushSign = dx >= 0 ? 1 : -1;
      const halfOverlap = overlap * 0.5;

      const newP1X = Math.max(
        this.arena.leftBoundX,
        Math.min(this.arena.rightBoundX, p1Pos.x - pushSign * halfOverlap)
      );
      const newP2X = Math.max(
        this.arena.leftBoundX,
        Math.min(this.arena.rightBoundX, p2Pos.x + pushSign * halfOverlap)
      );

      this.p1.movement.setPosition({ x: newP1X, y: p1Pos.y });
      this.p2.movement.setPosition({ x: newP2X, y: p2Pos.y });
    }
  }

  private checkWallBounces(): void {
    if (this.p1.movement.lastWallBounced) {
      this.p1.movement.clearWallBounce();
      const wallResult: HitResult = {
        resolution: 'hit',
        attackerId: 'arena_wall',
        defenderId: this.p1.id,
        damage: 0,
        blockedDamage: 0,
        staminaDamage: 0,
        knockback: { x: 0, y: 0 },
        hitstunMs: 140,
        isCritical: false,
        isWallBounce: true,
      };
      for (const listener of this._combatEventListeners) {
        listener(wallResult);
      }
    }

    if (this.p2.movement.lastWallBounced) {
      this.p2.movement.clearWallBounce();
      const wallResult: HitResult = {
        resolution: 'hit',
        attackerId: 'arena_wall',
        defenderId: this.p2.id,
        damage: 0,
        blockedDamage: 0,
        staminaDamage: 0,
        knockback: { x: 0, y: 0 },
        hitstunMs: 140,
        isCritical: false,
        isWallBounce: true,
      };
      for (const listener of this._combatEventListeners) {
        listener(wallResult);
      }
    }
  }

  private resolveCombatCollisions(): void {
    const p1Hitbox = this.p1.getActiveHitbox();
    const p2Hitbox = this.p2.getActiveHitbox();

    // 1. Check for simultaneous WEAPON CLASH
    if (
      p1Hitbox &&
      p2Hitbox &&
      !this.p1.combat.hasAlreadyHit() &&
      !this.p2.combat.hasAlreadyHit()
    ) {
      // If active hitboxes overlap directly, or both intersect opposing hurtboxes simultaneously
      const hitboxesOverlap = checkAABBOverlap(p1Hitbox.bounds, p2Hitbox.bounds);
      const mutualHurtboxIntersect =
        checkAABBOverlap(p1Hitbox.bounds, this.p2.getHurtbox()) &&
        checkAABBOverlap(p2Hitbox.bounds, this.p1.getHurtbox());

      if (hitboxesOverlap || mutualHurtboxIntersect) {
        this.executeClash();
        return;
      }
    }

    // 2. Check P1 attacking P2
    if (p1Hitbox && !this.p1.combat.hasAlreadyHit()) {
      const p2Hurtbox = this.p2.getHurtbox();
      if (checkAABBOverlap(p1Hitbox.bounds, p2Hurtbox)) {
        this.executeHit(this.p1, this.p2);
      }
    }

    // 3. Check P2 attacking P1
    if (p2Hitbox && !this.p2.combat.hasAlreadyHit()) {
      const p1Hurtbox = this.p1.getHurtbox();
      if (checkAABBOverlap(p2Hitbox.bounds, p1Hurtbox)) {
        this.executeHit(this.p2, this.p1);
      }
    }
  }

  private executeClash(): void {
    this.p1.combat.markHitConfirmed();
    this.p2.combat.markHitConfirmed();

    const stunDuration = BALANCE_CONFIG.combat.clashRecoilStunMs;
    this.p1.combat.applyClashStagger(stunDuration, this.p1.stateMachine);
    this.p2.combat.applyClashStagger(stunDuration, this.p2.stateMachine);

    // Apply opposing recoil impulses
    const p1FacingSign = this.p1.movement.facing === 'right' ? 1 : -1;
    const p2FacingSign = this.p2.movement.facing === 'right' ? 1 : -1;
    const recoil = BALANCE_CONFIG.combat.clashRecoilImpulse;

    this.p1.movement.applyImpulse({ x: -p1FacingSign * recoil, y: -40 }, this._physics);
    this.p2.movement.applyImpulse({ x: -p2FacingSign * recoil, y: -40 }, this._physics);

    const clashResult: HitResult = {
      resolution: 'clash',
      attackerId: this.p1.id,
      defenderId: this.p2.id,
      damage: 0,
      blockedDamage: 0,
      staminaDamage: 0,
      knockback: { x: 0, y: 0 },
      hitstunMs: stunDuration,
      isCritical: false,
      isClash: true,
    };

    for (const listener of this._combatEventListeners) {
      listener(clashResult);
    }
  }

  private executeHit(attacker: WarriorEntity, defender: WarriorEntity): void {
    if (!attacker.combat.currentAttack) return;

    attacker.combat.markHitConfirmed();

    const isDefenderFacingAttacker =
      (attacker.movement.facing === 'right' && defender.movement.facing === 'left') ||
      (attacker.movement.facing === 'left' && defender.movement.facing === 'right');

    const result = defender.combat.resolveIncomingHit(
      attacker.id,
      defender.id,
      attacker.combat.currentAttack,
      attacker.movement.facing,
      isDefenderFacingAttacker,
      defender.stateMachine
    );

    if (result.resolution === 'parried') {
      // Defender successfully parried attacker!
      // Attacker is put into counter stun
      attacker.combat.applyCounterStun(
        BALANCE_CONFIG.combat.parryCounterStunMs,
        attacker.stateMachine
      );
      // Slight pushback on attacker
      const counterSign = defender.movement.facing === 'right' ? 1 : -1;
      attacker.movement.applyImpulse({ x: -counterSign * 180, y: -60 }, this._physics);
      attacker.combat.resetCombo();
    } else {
      if (result.resolution === 'hit') {
        const combo = attacker.combat.registerHitLanded();
        result.comboCount = combo;
        defender.combat.resetCombo();
      } else {
        attacker.combat.resetCombo();
      }

      // Check for lethal finishing blow
      const willKill = defender.health <= result.damage;
      if (willKill) {
        // A mortal decapitation execution is earned by landing a heavy blow, combo finisher,
        // aerial helm splitter, backstab critical, or striking an exhausted / guard-broken rival.
        const isExecutionAttack =
          attacker.combat.currentAttack?.type === 'heavy' ||
          attacker.combat.currentAttack?.id === 'spinning_finisher' ||
          attacker.combat.currentAttack?.type === 'aerial' ||
          defender.combat.isExhausted ||
          defender.combat.hitstunRemainingMs > 0 ||
          result.isCritical;

        if (isExecutionAttack) {
          defender.isDecapitated = true;
          result.isDecapitation = true;
        }
      }

      // Damage applied to defender
      defender.applyDamage(result.damage);
      const isGuardBroken = defender.applyStaminaDamage(result.staminaDamage);
      if (isGuardBroken) {
        defender.combat.applyExhaustion(
          BALANCE_CONFIG.combat.staminaDepletedExhaustionMs,
          defender.stateMachine
        );
      }
      defender.movement.applyImpulse(result.knockback, this._physics);
    }

    // Notify listeners
    for (const listener of this._combatEventListeners) {
      listener(result);
    }
  }

  private checkRoundConditions(): void {
    let roundWinner: WarriorEntity | null = null;
    let isRoundOver = false;

    if (this.p1.health <= 0 && this.p2.health <= 0) {
      // Simultaneous double KO -> Draw round
      roundWinner = null;
      isRoundOver = true;
    } else if (this.p1.health <= 0) {
      roundWinner = this.p2;
      isRoundOver = true;
    } else if (this.p2.health <= 0) {
      roundWinner = this.p1;
      isRoundOver = true;
    } else if (this._roundTimerSec <= 0) {
      // Timeout
      isRoundOver = true;
      if (this.p1.health > this.p2.health) {
        roundWinner = this.p1;
      } else if (this.p2.health > this.p1.health) {
        roundWinner = this.p2;
      } else {
        roundWinner = null;
      }
    }

    if (isRoundOver) {
      this._matchState = 'round_over';
      this._roundTransitionTimerMs = 2500; // 2.5s transition pause

      if (roundWinner) {
        roundWinner.roundsWon++;
        if (roundWinner.roundsWon >= BALANCE_CONFIG.rules.roundsToWin) {
          this._matchState = 'match_over';
          this._winnerId = roundWinner.id;
        }
      } else {
        // Draw round: check if deciding round reached
        if (
          this.p1.roundsWon >= BALANCE_CONFIG.rules.roundsToWin - 1 &&
          this.p2.roundsWon >= BALANCE_CONFIG.rules.roundsToWin - 1
        ) {
          this._matchState = 'match_over';
          this._winnerId = 'draw';
        }
      }
    }
  }

  private startNextRound(): void {
    this._roundNumber++;
    this._roundTimerSec = BALANCE_CONFIG.rules.roundDurationSeconds;
    this.p1.resetRound(this.arena.spawnPointP1, 'right');
    this.p2.resetRound(this.arena.spawnPointP2, 'left');
    this._matchState = 'in_progress';
  }

  public resetMatch(): void {
    this._roundNumber = 1;
    this._roundTimerSec = BALANCE_CONFIG.rules.roundDurationSeconds;
    this._roundTransitionTimerMs = 0;
    this._winnerId = null;
    this.p1.roundsWon = 0;
    this.p2.roundsWon = 0;
    this.p1.resetRound(this.arena.spawnPointP1, 'right');
    this.p2.resetRound(this.arena.spawnPointP2, 'left');
    this._matchState = 'in_progress';
  }

  public getSnapshot(): GameSimulationSnapshot {
    const activeHitboxes: HitboxInstance[] = [];
    const h1 = this.p1.getActiveHitbox();
    if (h1) activeHitboxes.push(h1);
    const h2 = this.p2.getActiveHitbox();
    if (h2) activeHitboxes.push(h2);

    return {
      matchState: this._matchState,
      roundNumber: this._roundNumber,
      timerSeconds: this.roundTimerSec,
      winnerId: this._winnerId,
      p1: this.p1.toSnapshot(),
      p2: this.p2.toSnapshot(),
      activeHitboxes,
    };
  }
}
