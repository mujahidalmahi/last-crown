import { PlayerInputMessage, WarriorSnapshot, AttackType } from '@last-crown/shared';
import { getAttackDefinition, AI_DEFAULTS } from '@last-crown/game-config';

export type BotDifficulty = 'novice' | 'adept' | 'expert' | 'master';

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

const DIFFICULTY_PROFILES: Record<BotDifficulty, DifficultyConfig> = AI_DEFAULTS;

export class WarriorBotAI {
  public difficulty: BotDifficulty;

  private _sequence: number = 0;
  private _decisionTimerMs: number = 0;
  private _windupElapsedMs: number = 0;
  private _isTrackingPlayerWindup: boolean = false;
  private _trackedAttackId: string | null = null;
  private _willParryCurrentAttack: boolean = false;
  private _willJumpOverSweep: boolean = false;
  private _targetParryTimeMs: number = 0;

  private _feintTimerMs: number = 0;
  private _willFeintCurrentAttack: boolean = false;

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
    this._feintTimerMs -= deltaMs;

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

    // 0. FEINT ENGINE (Flaw 3 Fix): Cancel active attack windup if player attempts parry or on tactical read
    if (
      botSnapshot.attackPhase === 'windup' &&
      botSnapshot.stamina >= 10 &&
      !botSnapshot.isExhausted
    ) {
      const playerIsParrying =
        playerSnapshot.state === 'parrying' || playerSnapshot.parryWindowRemainingMs > 0;

      // Case A: Reactive Feint - player panic-parried; cancel into dash retreat to avoid 650ms counter-stun
      if (
        playerIsParrying &&
        this._feintTimerMs <= 0 &&
        Math.random() < Math.max(0.2, config.feintChance * 1.5)
      ) {
        this._feintTimerMs = 800;
        return {
          sequence: this._sequence,
          timestamp: Date.now(),
          moveX: dx > 0 ? -1 : 1,
          dash: true,
          jump: false,
          attack: false,
          block: false,
          parry: false,
          facing: facingPlayer,
        };
      }

      // Case B: Proactive Feint - Expert & Master condition the opponent with a windup cancel
      if (
        (this.difficulty === 'master' || this.difficulty === 'expert') &&
        this._willFeintCurrentAttack &&
        this._feintTimerMs <= 0
      ) {
        this._feintTimerMs = 1200;
        this._willFeintCurrentAttack = false;
        return {
          sequence: this._sequence,
          timestamp: Date.now(),
          moveX: dx > 0 ? 1 : -1,
          dash: true,
          jump: false,
          attack: false,
          block: false,
          parry: false,
          facing: facingPlayer,
        };
      }
    }

    // Dynamic Stance Switching (maintains varied combat pacing)
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

    // 1. DYNAMIC PARRY TRACKING (Flaw 2 Fix): Match parry window to incoming attack windup
    if (playerSnapshot.attackPhase === 'windup' && distance < 135) {
      if (!this._isTrackingPlayerWindup) {
        this._isTrackingPlayerWindup = true;
        this._trackedAttackId = playerSnapshot.currentAttackId || 'light_slash';
        this._windupElapsedMs = 0;

        const attack = getAttackDefinition(this._trackedAttackId);
        const attackWindup = attack.windupMs; // 160ms light, 220ms thrust, 340ms heavy, 180ms sweep

        // To catch active frames, trigger parry ~70ms before windup finishes
        const optimalLead = 70;
        let targetTrigger = attackWindup - optimalLead;
        if (targetTrigger < config.reactionDelayMs) {
          targetTrigger = config.reactionDelayMs;
        }
        this._targetParryTimeMs = targetTrigger;

        const isSweep = this._trackedAttackId === 'low_sweep';
        this._willJumpOverSweep =
          isSweep && Math.random() < config.jumpChance && botSnapshot.isGrounded;
        this._willParryCurrentAttack =
          !this._willJumpOverSweep &&
          Math.random() < config.parryChance &&
          botSnapshot.stamina >= 15 &&
          !botSnapshot.isExhausted;
      }

      this._windupElapsedMs += deltaMs;

      if (this._windupElapsedMs >= this._targetParryTimeMs) {
        if (this._willJumpOverSweep && botSnapshot.isGrounded) {
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
      this._windupElapsedMs = 0;
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

    // 2. ANTI-AIR INTERCEPT (Flaw 5 Fix): Player is airborne approaching the bot
    if (!playerSnapshot.isGrounded && playerSnapshot.health > 0 && distance < 140) {
      if (this.difficulty === 'master' || this.difficulty === 'expert') {
        // Swat jump-in with Rising Slash / Overhead heavy if bot is grounded and has stamina
        if (botSnapshot.isGrounded && botSnapshot.stamina >= 25 && Math.random() < 0.6) {
          return {
            sequence: this._sequence,
            timestamp: Date.now(),
            moveX: 0,
            jump: false,
            attack: true,
            attackType: 'heavy',
            block: false,
            parry: false,
            facing: facingPlayer,
          };
        }
        // Or dash back to let player dive into empty air, preparing a landing punish
        if (botSnapshot.isGrounded && botSnapshot.stamina >= 18 && Math.random() < 0.55) {
          return {
            sequence: this._sequence,
            timestamp: Date.now(),
            moveX: dx > 0 ? -1 : 1,
            dash: true,
            jump: false,
            attack: false,
            block: false,
            parry: false,
            facing: facingPlayer,
          };
        }
      }

      // Default high guard against airborne threats
      return {
        sequence: this._sequence,
        timestamp: Date.now(),
        moveX: 0,
        jump: false,
        attack: false,
        block: botSnapshot.stamina > 0 && !botSnapshot.isExhausted,
        parry: false,
        facing: facingPlayer,
      };
    }

    // 3. AIRBORNE BOT BEHAVIOR: Plunge with Helm Splitter or Fast-Fall
    if (!botSnapshot.isGrounded) {
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
      } else if (
        botSnapshot.velocity.y > 50 &&
        (this.difficulty === 'master' || this.difficulty === 'adept')
      ) {
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

    // 4. CORNER ESCAPE (Flaw 8 Fix): Avoid getting pinned against arena boundary walls
    const isNearLeftWall = botSnapshot.position.x <= 180 && dx > 0;
    const isNearRightWall = botSnapshot.position.x >= 1100 && dx < 0;
    const isCornered = (isNearLeftWall || isNearRightWall) && distance < 140;

    if (isCornered && (this.difficulty === 'master' || this.difficulty === 'expert')) {
      if (botSnapshot.isGrounded && botSnapshot.stamina >= 20 && Math.random() < 0.6) {
        const escapeForward = dx > 0 ? 1 : -1;
        const useJump = Math.random() < 0.45;
        return {
          sequence: this._sequence,
          timestamp: Date.now(),
          moveX: escapeForward,
          jump: useJump,
          dash: !useJump,
          attack: false,
          block: false,
          parry: false,
          facing: facingPlayer,
        };
      }
    }

    // 5. WHIFF PUNISH (Flaw 6 Fix): Opponent stuck in attack recovery
    if (
      playerSnapshot.attackPhase === 'recovery' &&
      distance < 140 &&
      botSnapshot.isGrounded &&
      botSnapshot.stamina >= 15 &&
      !botSnapshot.isExhausted &&
      (this.difficulty === 'master' ||
        this.difficulty === 'expert' ||
        (this.difficulty === 'adept' && Math.random() < 0.8))
    ) {
      return {
        sequence: this._sequence,
        timestamp: Date.now(),
        moveX: dx > 0 ? 1 : -1,
        jump: false,
        attack: true,
        attackType: distance > 80 ? 'thrust' : 'light',
        block: false,
        parry: false,
        facing: facingPlayer,
      };
    }

    // 6. PERIODIC TACTICAL DECISIONS & SPACING (Flaws 1, 4, 7, 9, 10 Fixes)
    if (this._decisionTimerMs <= 0) {
      const intervalRange = config.decisionIntervalMaxMs - config.decisionIntervalMinMs;
      this._decisionTimerMs = config.decisionIntervalMinMs + Math.random() * intervalRange;

      this._currentAttack = false;
      this._currentBlock = false;

      // A. BLOODLUST EXECUTIONER: Hunt low-health or exhausted players with heavy finishing blows
      if (
        (this.difficulty === 'master' || this.difficulty === 'adept') &&
        (playerSnapshot.isExhausted || playerSnapshot.health <= 28)
      ) {
        if (distance > 100) {
          this._currentMoveX = dx > 0 ? 1 : -1;
          this._currentDash = Math.random() < 0.65 && botSnapshot.stamina >= 18;
        } else {
          this._currentMoveX = 0;
          this._currentAttack = true;
          this._currentAttackType = 'heavy';
        }
      }
      // B. STAMINA EMERGENCY: Low stamina retreat
      else if (botSnapshot.stamina < config.retreatStaminaThreshold || botSnapshot.isExhausted) {
        this._currentMoveX = dx > 0 ? -1 : 1; // Step back
        this._currentBlock =
          Math.random() < config.blockChance && !botSnapshot.isExhausted && botSnapshot.stamina > 0;
      }
      // C. SHIELD CRACKING (Flaw 7 Fix): Player is turtling behind block in melee range
      else if (
        playerSnapshot.state === 'blocking' &&
        distance <= 110 &&
        !playerSnapshot.isExhausted
      ) {
        const sweepPriority =
          this.difficulty === 'master' ? 0.75 : this.difficulty === 'expert' ? 0.65 : 0.45;
        if (Math.random() < sweepPriority && botSnapshot.stamina >= 18) {
          this._currentAttack = true;
          this._currentAttackType = 'sweep'; // Low Leg Sweep bypasses standing guard!
          this._currentMoveX = distance > 80 ? (dx > 0 ? 1 : -1) : 0;
        } else if (botSnapshot.stamina >= 30) {
          this._currentAttack = true;
          this._currentAttackType = 'heavy'; // Heavy overhead crushes posture (1.6x stamina drain)
          this._currentMoveX = distance > 80 ? (dx > 0 ? 1 : -1) : 0;
        } else {
          this._currentMoveX = dx > 0 ? 1 : -1;
        }
      }
      // D. LONG RANGE (> 180px): Close distance with footwork or leaping approach
      else if (distance > 180) {
        this._currentMoveX = dx > 0 ? 1 : -1;
        if (Math.random() < config.dashChance && botSnapshot.stamina >= 25) {
          this._currentDash = true;
        } else if (
          Math.random() < config.jumpChance &&
          botSnapshot.isGrounded &&
          botSnapshot.stamina >= 30
        ) {
          this._currentJump = true;
        }
      }
      // E. MID POKE RANGE (115px - 180px): Advance and poke with Forward Thrust or Dash Lunge
      else if (distance > 115) {
        this._currentMoveX = dx > 0 ? 1 : -1;
        const roll = Math.random();
        if (roll < config.attackChance * 0.75) {
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
          this._currentJump = true;
        }
      }
      // F. STRIDE & FOOSTE RANGE (75px - 115px) (Flaw 1 Fix):
      // Keep stepping forward if initiating light slashes; use thrust, heavy, sweep in range
      else if (distance > 75) {
        const roll = Math.random();
        if (roll < config.attackChance) {
          this._currentAttack = true;
          const subRoll = Math.random();
          if (subRoll < config.thrustAttackChance) {
            this._currentAttackType = 'thrust';
            this._currentMoveX = 0;
          } else if (subRoll < config.thrustAttackChance + config.heavyAttackChance) {
            this._currentAttackType = 'heavy';
            this._currentMoveX = 0;
          } else if (
            subRoll <
            config.thrustAttackChance + config.heavyAttackChance + config.sweepAttackChance
          ) {
            this._currentAttackType = 'sweep';
            this._currentMoveX = 0;
          } else {
            this._currentAttackType = 'light';
            this._currentMoveX = dx > 0 ? 1 : -1; // Keep stepping forward so light slash lands!
          }
        } else if (roll < config.attackChance + config.blockChance * 0.4) {
          this._currentBlock = !botSnapshot.isExhausted && botSnapshot.stamina > 0;
          this._currentMoveX = 0;
        } else {
          // Footsies micro-spacing dance: bait player into whiffing
          const spacingRoll = Math.random();
          if (spacingRoll < 0.45 && botSnapshot.isGrounded) {
            this._currentMoveX = dx > 0 ? -1 : 1; // Step back to bait whiff
          } else {
            this._currentMoveX = dx > 0 ? 1 : -1; // Step forward
          }
        }
      }
      // G. TRUE CLOSE MELEE RANGE (distance <= 75px): Full light slash, combo chains, and 50/50 mixups
      else {
        this._currentMoveX = 0;
        const attackRoll = Math.random();

        if (attackRoll < config.attackChance) {
          this._currentAttack = true;

          if (this._currentStance === 'leaping_slayer' && botSnapshot.isGrounded) {
            this._currentJump = true;
            this._currentAttackType = 'aerial';
          } else if (this._currentStance === 'sweep_trickster') {
            this._currentAttackType = Math.random() < 0.65 ? 'sweep' : 'heavy';
          } else if (this._currentStance === 'berserker') {
            const subRoll = Math.random();
            if (subRoll < config.heavyAttackChance) {
              this._currentAttackType = 'heavy';
            } else if (subRoll < config.heavyAttackChance + config.thrustAttackChance) {
              this._currentAttackType = 'thrust';
            } else {
              this._currentAttackType = 'light';
            }
          } else {
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
          this._currentBlock = !botSnapshot.isExhausted && botSnapshot.stamina > 0;
        } else {
          // Step back or hop
          const spacingRoll = Math.random();
          if (spacingRoll < 0.35 && botSnapshot.isGrounded) {
            this._currentJump = true;
            this._currentMoveX = dx > 0 ? -1 : 1;
          } else {
            this._currentMoveX = spacingRoll < 0.7 ? (dx > 0 ? -1 : 1) : 0;
          }
        }
      }

      // STAMINA SAFETY FLOOR (Flaw 4 Fix): Never commit to an attack that exhausts the bot to 0 SP
      if (this._currentAttack) {
        const attackDef = getAttackDefinition(this._currentAttackType);
        const willKillPlayer = playerSnapshot.health <= attackDef.damage;
        if (botSnapshot.stamina - attackDef.staminaCost <= 4 && !willKillPlayer) {
          this._currentAttack = false;
          this._currentMoveX = dx > 0 ? -1 : 1; // Retreat
          this._currentBlock = botSnapshot.stamina > 5;
        } else {
          // Check if this attack will be feinted on Expert / Master
          this._willFeintCurrentAttack =
            (this.difficulty === 'master' || this.difficulty === 'expert') &&
            Math.random() < config.feintChance;
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
    this._windupElapsedMs = 0;
    this._isTrackingPlayerWindup = false;
    this._trackedAttackId = null;
    this._willParryCurrentAttack = false;
    this._willJumpOverSweep = false;
    this._targetParryTimeMs = 0;
    this._feintTimerMs = 0;
    this._willFeintCurrentAttack = false;
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
