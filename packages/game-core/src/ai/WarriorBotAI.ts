import { PlayerInputMessage, WarriorSnapshot, AttackType } from '@last-crown/shared';

export type BotDifficulty = 'novice' | 'adept' | 'master';

export type BotStance =
  'berserker' | 'leaping_slayer' | 'sweep_trickster' | 'tactical_counter' | 'bloodlust_executioner';

interface DifficultyConfig {
  decisionIntervalMinMs: number;
  decisionIntervalMaxMs: number;
  reactionDelayMs: number;
  parryChance: number;
  attackChance: number;
  heavyAttackChance: number;
  thrustAttackChance: number;
  sweepAttackChance: number;
  jumpChance: number;
  dashChance: number;
  feintChance: number;
  blockChance: number;
  retreatStaminaThreshold: number;
}

const DIFFICULTY_PROFILES: Record<BotDifficulty, DifficultyConfig> = {
  novice: {
    decisionIntervalMinMs: 180,
    decisionIntervalMaxMs: 300,
    reactionDelayMs: 240,
    parryChance: 0.18,
    attackChance: 0.4,
    heavyAttackChance: 0.15,
    thrustAttackChance: 0.15,
    sweepAttackChance: 0.12,
    jumpChance: 0.15,
    dashChance: 0.15,
    feintChance: 0.0,
    blockChance: 0.35,
    retreatStaminaThreshold: 35,
  },
  adept: {
    decisionIntervalMinMs: 100,
    decisionIntervalMaxMs: 180,
    reactionDelayMs: 130,
    parryChance: 0.5,
    attackChance: 0.6,
    heavyAttackChance: 0.28,
    thrustAttackChance: 0.22,
    sweepAttackChance: 0.22,
    jumpChance: 0.35,
    dashChance: 0.35,
    feintChance: 0.15,
    blockChance: 0.55,
    retreatStaminaThreshold: 20,
  },
  master: {
    decisionIntervalMinMs: 60,
    decisionIntervalMaxMs: 110,
    reactionDelayMs: 90,
    parryChance: 0.78,
    attackChance: 0.75,
    heavyAttackChance: 0.32,
    thrustAttackChance: 0.28,
    sweepAttackChance: 0.28,
    jumpChance: 0.5,
    dashChance: 0.5,
    feintChance: 0.28,
    blockChance: 0.65,
    retreatStaminaThreshold: 12,
  },
};

export class WarriorBotAI {
  public difficulty: BotDifficulty;

  private _sequence: number = 0;
  private _decisionTimerMs: number = 0;
  private _reactiveParryTimerMs: number = 0;
  private _isTrackingPlayerWindup: boolean = false;
  private _willParryCurrentAttack: boolean = false;
  private _willJumpOverSweep: boolean = false;

  private _stanceTimerMs: number = 0;
  private _currentStance: BotStance = 'berserker';

  private _currentMoveX: number = 0;
  private _currentJump: boolean = false;
  private _currentAttack: boolean = false;
  private _currentAttackType: AttackType = 'light';
  private _currentBlock: boolean = false;
  private _currentParry: boolean = false;
  private _currentDash: boolean = false;

  constructor(difficulty: BotDifficulty = 'adept') {
    this.difficulty = difficulty;
  }

  public setDifficulty(difficulty: BotDifficulty): void {
    this.difficulty = difficulty;
    this.reset();
  }

  public update(
    botSnapshot: WarriorSnapshot,
    playerSnapshot: WarriorSnapshot,
    deltaMs: number
  ): PlayerInputMessage {
    this._sequence++;
    this._decisionTimerMs -= deltaMs;
    this._stanceTimerMs -= deltaMs;

    const config = DIFFICULTY_PROFILES[this.difficulty] || DIFFICULTY_PROFILES.adept;
    const dx = playerSnapshot.position.x - botSnapshot.position.x;
    const distance = Math.abs(dx);
    const facingPlayer = dx > 0 ? 'right' : 'left';

    // One-shot impulses reset per update frame
    this._currentParry = false;
    const wasJumpRequested = this._currentJump;
    this._currentJump = false;
    const wasDashRequested = this._currentDash;
    this._currentDash = false;

    // Periodic Dynamic Stance Switch (keeps the bot unpredictable & lively)
    if (this._stanceTimerMs <= 0) {
      this._stanceTimerMs = 2400 + Math.random() * 2000;
      if (playerSnapshot.health <= 28 || playerSnapshot.isExhausted) {
        this._currentStance = 'bloodlust_executioner';
      } else {
        const stances: BotStance[] = [
          'berserker',
          'leaping_slayer',
          'sweep_trickster',
          'tactical_counter',
        ];
        this._currentStance = stances[Math.floor(Math.random() * stances.length)] || 'berserker';
      }
    }

    // 1. Reactive Tracking: Parrying & Leaping over low sweeps
    if (playerSnapshot.attackPhase === 'windup' && distance < 130) {
      if (!this._isTrackingPlayerWindup) {
        this._isTrackingPlayerWindup = true;
        this._reactiveParryTimerMs = config.reactionDelayMs - deltaMs;

        // If player is sweeping low, high parry or leaping is needed
        const isSweep = playerSnapshot.currentAttackId === 'low_sweep';
        this._willJumpOverSweep =
          isSweep && Math.random() < config.jumpChance && botSnapshot.isGrounded;
        this._willParryCurrentAttack =
          !this._willJumpOverSweep &&
          Math.random() < config.parryChance &&
          botSnapshot.stamina >= 15 &&
          !botSnapshot.isExhausted;
      } else {
        this._reactiveParryTimerMs -= deltaMs;
      }

      if (this._reactiveParryTimerMs <= 0) {
        if (this._willJumpOverSweep && botSnapshot.isGrounded) {
          // Leap over ankle sweep!
          this._currentJump = true;
          this._currentMoveX = dx > 0 ? 1 : -1;
          this._willJumpOverSweep = false;
        } else if (
          this._willParryCurrentAttack &&
          botSnapshot.stamina >= 15 &&
          !botSnapshot.isExhausted
        ) {
          this._currentParry = true;
          this._willParryCurrentAttack = false;
        }
      }
    } else {
      this._isTrackingPlayerWindup = false;
      this._willParryCurrentAttack = false;
      this._willJumpOverSweep = false;
    }

    // Fast return if reactive parry triggered
    if (this._currentParry) {
      return {
        sequence: this._sequence,
        timestamp: Date.now(),
        moveX: 0,
        jump: false,
        attack: false,
        block: false,
        parry: true,
        facing: facingPlayer,
      };
    }

    // 2. Airborne Behavior: Plunge downwards with Helm Splitter or Fast-Fall to safety!
    if (!botSnapshot.isGrounded) {
      // If airborne and within striking distance of the player, dive with Helm Splitter
      if (distance < 120 && botSnapshot.stamina >= 25) {
        return {
          sequence: this._sequence,
          timestamp: Date.now(),
          moveX: dx > 0 ? 1 : -1,
          moveY: 1, // Fast-fall diving plunge
          jump: false,
          attack: true,
          attackType: 'aerial',
          block: false,
          parry: false,
          facing: facingPlayer,
        };
      } else if (botSnapshot.velocity.y > 50 && (this.difficulty === 'master' || this.difficulty === 'adept')) {
        // Fast-fall to return swiftly to earth and regain full ground defense
        return {
          sequence: this._sequence,
          timestamp: Date.now(),
          moveX: dx > 0 ? 1 : -1,
          moveY: 1,
          jump: false,
          attack: false,
          block: false,
          parry: false,
          facing: facingPlayer,
        };
      }
    }

    // 2.5. Whiff Punish: If rival missed an attack and is stuck in recovery, strike instantly!
    if (
      playerSnapshot.attackPhase === 'recovery' &&
      distance < 130 &&
      botSnapshot.isGrounded &&
      botSnapshot.stamina >= 15 &&
      !botSnapshot.isExhausted &&
      (this.difficulty === 'master' || (this.difficulty === 'adept' && Math.random() < 0.75))
    ) {
      return {
        sequence: this._sequence,
        timestamp: Date.now(),
        moveX: dx > 0 ? 1 : -1,
        jump: false,
        attack: true,
        attackType: distance > 85 ? 'thrust' : 'light',
        block: false,
        parry: false,
        facing: facingPlayer,
      };
    }

    // 3. Periodic Tactical Decisions (Pacing & Attack Execution)
    if (this._decisionTimerMs <= 0) {
      const intervalRange = config.decisionIntervalMaxMs - config.decisionIntervalMinMs;
      this._decisionTimerMs = config.decisionIntervalMinMs + Math.random() * intervalRange;

      this._currentAttack = false;
      this._currentBlock = false;

      // CRUEL BLOODLUST EXECUTIONER: Hunt low-health or exhausted players
      if (
        (this.difficulty === 'master' || this.difficulty === 'adept') &&
        (playerSnapshot.isExhausted || playerSnapshot.health <= 28)
      ) {
        if (distance > 130) {
          // Sprint or dash in for the execution
          this._currentMoveX = dx > 0 ? 1 : -1;
          this._currentDash = Math.random() < 0.6 && botSnapshot.stamina >= 18;
        } else {
          // In range: deliver fatal heavy strike execution
          this._currentMoveX = 0;
          this._currentAttack = true;
          this._currentAttackType = 'heavy';
        }
      } else if (botSnapshot.stamina < config.retreatStaminaThreshold || botSnapshot.isExhausted) {
        // Low stamina: defensive retreat and guard
        this._currentMoveX = dx > 0 ? -1 : 1;
        this._currentBlock =
          Math.random() < config.blockChance && !botSnapshot.isExhausted && botSnapshot.stamina > 0;
      } else if (distance > 180) {
        // Far away: close distance (sometimes with dash or leaping approach)
        this._currentMoveX = dx > 0 ? 1 : -1;
        if (Math.random() < config.dashChance && botSnapshot.stamina >= 25) {
          this._currentDash = true;
        } else if (
          Math.random() < config.jumpChance &&
          botSnapshot.isGrounded &&
          botSnapshot.stamina >= 30
        ) {
          this._currentJump = true; // Leaping forward hop
        }
      } else if (distance > 115) {
        // Medium distance: approach or lunge
        this._currentMoveX = dx > 0 ? 1 : -1;
        const roll = Math.random();
        if (roll < config.attackChance * 0.7) {
          // Dash lunge or forward thrust
          this._currentAttack = true;
          this._currentAttackType = Math.random() < 0.5 ? 'thrust' : 'dash';
          if (this._currentAttackType === 'dash') {
            this._currentDash = true;
          }
        } else if (
          roll < config.attackChance &&
          Math.random() < config.jumpChance &&
          botSnapshot.isGrounded
        ) {
          // Jump into air to prepare a Helm Splitter
          this._currentJump = true;
        }
      } else {
        // Close melee range: dynamic combat maneuvers based on active stance
        this._currentMoveX = 0;
        const attackRoll = Math.random();

        if (attackRoll < config.attackChance) {
          this._currentAttack = true;

          // Stance-specific tactical flavor
          if (this._currentStance === 'leaping_slayer' && botSnapshot.isGrounded) {
            this._currentJump = true; // Unpredictable jump attack
            this._currentAttackType = 'aerial';
          } else if (this._currentStance === 'sweep_trickster') {
            // Mix up between low sweep and heavy attack
            this._currentAttackType = Math.random() < 0.65 ? 'sweep' : 'heavy';
          } else if (this._currentStance === 'berserker') {
            // Rapid combo assault
            const subRoll = Math.random();
            if (subRoll < config.heavyAttackChance) {
              this._currentAttackType = 'heavy';
            } else if (subRoll < config.heavyAttackChance + config.thrustAttackChance) {
              this._currentAttackType = 'thrust';
            } else {
              this._currentAttackType = 'light';
            }
          } else {
            // Tactical counter: balance sweeps, thrusts and heavies
            const subRoll = Math.random();
            if (subRoll < config.sweepAttackChance) {
              this._currentAttackType = 'sweep';
            } else if (subRoll < config.sweepAttackChance + config.heavyAttackChance) {
              this._currentAttackType = 'heavy';
            } else {
              this._currentAttackType = 'light';
            }
          }
        } else if (attackRoll < config.attackChance + config.blockChance * 0.5) {
          // Guard with shield
          this._currentBlock = !botSnapshot.isExhausted && botSnapshot.stamina > 0;
        } else {
          // Tactical spacing: step back or hop unpredictably
          const spacingRoll = Math.random();
          if (spacingRoll < 0.35 && botSnapshot.isGrounded) {
            this._currentJump = true; // sudden hop
            this._currentMoveX = dx > 0 ? -1 : 1;
          } else {
            this._currentMoveX = spacingRoll < 0.7 ? (dx > 0 ? -1 : 1) : 0;
          }
        }
      }
    }

    return {
      sequence: this._sequence,
      timestamp: Date.now(),
      moveX: this._currentMoveX,
      jump: this._currentJump || wasJumpRequested,
      attack: this._currentAttack,
      attackType: this._currentAttackType,
      block: this._currentBlock,
      parry: false,
      dash: this._currentDash || wasDashRequested,
      facing: facingPlayer,
    };
  }

  public reset(): void {
    this._sequence = 0;
    this._decisionTimerMs = 0;
    this._reactiveParryTimerMs = 0;
    this._isTrackingPlayerWindup = false;
    this._willParryCurrentAttack = false;
    this._willJumpOverSweep = false;
    this._stanceTimerMs = 0;
    this._currentStance = 'berserker';
    this._currentMoveX = 0;
    this._currentJump = false;
    this._currentAttack = false;
    this._currentAttackType = 'light';
    this._currentBlock = false;
    this._currentParry = false;
    this._currentDash = false;
  }
}
