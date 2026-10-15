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

    // Decrement round timer
    this._roundTimerSec -= clampedDeltaSec;

    // Check combat collisions
    this.resolveCombatCollisions();

    // Check round win conditions
    this.checkRoundConditions();
  }

  private resolveCombatCollisions(): void {
    // Check P1 attacking P2
    const p1Hitbox = this.p1.getActiveHitbox();
    if (p1Hitbox && !this.p1.combat.hasAlreadyHit()) {
      const p2Hurtbox = this.p2.getHurtbox();
      if (checkAABBOverlap(p1Hitbox.bounds, p2Hurtbox)) {
        this.executeHit(this.p1, this.p2);
      }
    }

    // Check P2 attacking P1
    const p2Hitbox = this.p2.getActiveHitbox();
    if (p2Hitbox && !this.p2.combat.hasAlreadyHit()) {
      const p1Hurtbox = this.p1.getHurtbox();
      if (checkAABBOverlap(p2Hitbox.bounds, p1Hurtbox)) {
        this.executeHit(this.p2, this.p1);
      }
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
    } else {
      // Check for lethal finishing blow
      const willKill = defender.health <= result.damage;
      if (willKill) {
        defender.isDecapitated = true;
        result.isDecapitation = true;
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
