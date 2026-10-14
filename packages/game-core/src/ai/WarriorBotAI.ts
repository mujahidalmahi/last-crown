import { PlayerInputMessage, WarriorSnapshot } from '@last-crown/shared';

export type BotDifficulty = 'novice' | 'adept' | 'master';

interface DifficultyConfig {
  decisionIntervalMinMs: number;
  decisionIntervalMaxMs: number;
  reactionDelayMs: number;
  parryChance: number;
  attackChance: number;
  heavyAttackChance: number;
  thrustAttackChance: number;
  blockChance: number;
  retreatStaminaThreshold: number;
}

const DIFFICULTY_PROFILES: Record<BotDifficulty, DifficultyConfig> = {
  novice: {
    decisionIntervalMinMs: 200,
    decisionIntervalMaxMs: 320,
    reactionDelayMs: 260,
    parryChance: 0.12,
    attackChance: 0.35,
    heavyAttackChance: 0.15,
    thrustAttackChance: 0.15,
    blockChance: 0.4,
    retreatStaminaThreshold: 40,
  },
  adept: {
    decisionIntervalMinMs: 120,
    decisionIntervalMaxMs: 200,
    reactionDelayMs: 150,
    parryChance: 0.4,
    attackChance: 0.5,
    heavyAttackChance: 0.3,
    thrustAttackChance: 0.25,
    blockChance: 0.55,
    retreatStaminaThreshold: 25,
  },
  master: {
    decisionIntervalMinMs: 70,
    decisionIntervalMaxMs: 130,
    reactionDelayMs: 90,
    parryChance: 0.7,
    attackChance: 0.65,
    heavyAttackChance: 0.35,
    thrustAttackChance: 0.35,
    blockChance: 0.65,
    retreatStaminaThreshold: 15,
  },
};

export class WarriorBotAI {
  public difficulty: BotDifficulty;

  private _sequence: number = 0;
  private _decisionTimerMs: number = 0;
  private _reactiveParryTimerMs: number = 0;
  private _isTrackingPlayerWindup: boolean = false;
  private _willParryCurrentAttack: boolean = false;

  private _currentMoveX: number = 0;
  private _currentAttack: boolean = false;
  private _currentAttackType: 'light' | 'heavy' | 'thrust' = 'light';
  private _currentBlock: boolean = false;
  private _currentParry: boolean = false;

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

    const config = DIFFICULTY_PROFILES[this.difficulty] || DIFFICULTY_PROFILES.adept;
    const dx = playerSnapshot.position.x - botSnapshot.position.x;
    const distance = Math.abs(dx);
    const facingPlayer = dx > 0 ? 'right' : 'left';

    this._currentParry = false;

    // Track opponent's attack wind-up with human-like reaction latency
    if (playerSnapshot.attackPhase === 'windup' && distance < 120) {
      if (!this._isTrackingPlayerWindup) {
        this._isTrackingPlayerWindup = true;
        this._reactiveParryTimerMs = config.reactionDelayMs - deltaMs;
        this._willParryCurrentAttack =
          Math.random() < config.parryChance &&
          botSnapshot.stamina >= 15 &&
          !botSnapshot.isExhausted;
      } else {
        this._reactiveParryTimerMs -= deltaMs;
      }

      if (
        this._reactiveParryTimerMs <= 0 &&
        this._willParryCurrentAttack &&
        botSnapshot.stamina >= 15 &&
        !botSnapshot.isExhausted
      ) {
        this._currentParry = true;
        this._willParryCurrentAttack = false; // consume reaction
      }
    } else {
      this._isTrackingPlayerWindup = false;
      this._willParryCurrentAttack = false;
    }

    // Fast return if parrying reactively
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

    // Periodic tactical decisions
    if (this._decisionTimerMs <= 0) {
      const intervalRange = config.decisionIntervalMaxMs - config.decisionIntervalMinMs;
      this._decisionTimerMs = config.decisionIntervalMinMs + Math.random() * intervalRange;

      this._currentAttack = false;
      this._currentBlock = false;

      // Master AI punishes exhausted player with aggressive heavy strikes
      if (this.difficulty === 'master' && playerSnapshot.isExhausted && distance < 110) {
        this._currentMoveX = 0;
        this._currentAttack = true;
        this._currentAttackType = 'heavy';
      } else if (botSnapshot.stamina < config.retreatStaminaThreshold || botSnapshot.isExhausted) {
        // Low stamina: retreat and block
        this._currentMoveX = dx > 0 ? -1 : 1;
        this._currentBlock =
          Math.random() < config.blockChance && !botSnapshot.isExhausted && botSnapshot.stamina > 0;
      } else if (distance > 120) {
        // Out of melee range: advance toward player
        this._currentMoveX = dx > 0 ? 1 : -1;
      } else {
        // In melee range
        this._currentMoveX = 0;
        const roll = Math.random();

        if (roll < config.attackChance) {
          this._currentAttack = true;
          const attackRoll = Math.random();
          if (attackRoll < config.heavyAttackChance) {
            this._currentAttackType = 'heavy';
          } else if (attackRoll < config.heavyAttackChance + config.thrustAttackChance) {
            this._currentAttackType = 'thrust';
          } else {
            this._currentAttackType = 'light';
          }
        } else if (roll < config.attackChance + config.blockChance * 0.5) {
          this._currentBlock = !botSnapshot.isExhausted && botSnapshot.stamina > 0;
        } else {
          // Tactical spacing adjustment
          this._currentMoveX = Math.random() < 0.4 ? (dx > 0 ? -1 : 1) : 0;
        }
      }
    }

    return {
      sequence: this._sequence,
      timestamp: Date.now(),
      moveX: this._currentMoveX,
      jump: false,
      attack: this._currentAttack,
      attackType: this._currentAttackType,
      block: this._currentBlock,
      parry: false,
      facing: facingPlayer,
    };
  }

  public reset(): void {
    this._sequence = 0;
    this._decisionTimerMs = 0;
    this._reactiveParryTimerMs = 0;
    this._isTrackingPlayerWindup = false;
    this._willParryCurrentAttack = false;
    this._currentMoveX = 0;
    this._currentAttack = false;
    this._currentAttackType = 'light';
    this._currentBlock = false;
    this._currentParry = false;
  }
}
