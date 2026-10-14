import { PlayerInputMessage, WarriorSnapshot } from '@last-crown/shared';

export class WarriorBotAI {
  private _sequence: number = 0;
  private _decisionTimerMs: number = 0;
  private _currentMoveX: number = 0;
  private _currentAttack: boolean = false;
  private _currentAttackType: 'light' | 'heavy' | 'thrust' = 'light';
  private _currentBlock: boolean = false;
  private _currentParry: boolean = false;

  public update(
    botSnapshot: WarriorSnapshot,
    playerSnapshot: WarriorSnapshot,
    deltaMs: number
  ): PlayerInputMessage {
    this._sequence++;
    this._decisionTimerMs -= deltaMs;

    const dx = playerSnapshot.position.x - botSnapshot.position.x;
    const distance = Math.abs(dx);
    const facingPlayer = dx > 0 ? 'right' : 'left';

    // Fast reactive decision: Parry incoming attack if within striking distance
    if (playerSnapshot.attackPhase === 'windup' && distance < 110 && botSnapshot.stamina > 20) {
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

    // Periodic tactical decisions (every 120-200ms)
    if (this._decisionTimerMs <= 0) {
      this._decisionTimerMs = 120 + Math.random() * 80;
      this._currentAttack = false;
      this._currentBlock = false;
      this._currentParry = false;

      if (botSnapshot.stamina < 25) {
        // Low stamina: retreat or block
        this._currentMoveX = dx > 0 ? -1 : 1;
        this._currentBlock = Math.random() < 0.6;
      } else if (distance > 120) {
        // Out of range: advance towards player
        this._currentMoveX = dx > 0 ? 1 : -1;
      } else {
        // In melee range
        this._currentMoveX = 0;
        const roll = Math.random();
        if (roll < 0.45) {
          this._currentAttack = true;
          this._currentAttackType = roll < 0.25 ? 'light' : roll < 0.38 ? 'heavy' : 'thrust';
        } else if (roll < 0.7) {
          this._currentBlock = true;
        } else {
          // Slight positional repositioning
          this._currentMoveX = Math.random() < 0.5 ? -1 : 0;
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
      parry: this._currentParry,
      facing: facingPlayer,
    };
  }

  public reset(): void {
    this._decisionTimerMs = 0;
    this._currentMoveX = 0;
    this._currentAttack = false;
    this._currentBlock = false;
    this._currentParry = false;
  }
}
