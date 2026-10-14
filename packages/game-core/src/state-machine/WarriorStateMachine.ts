import { WarriorActionState } from '@last-crown/shared';

export class WarriorStateMachine {
  private _state: WarriorActionState = 'idle';
  private _previousState: WarriorActionState = 'idle';
  private _timeInStateMs: number = 0;

  get state(): WarriorActionState {
    return this._state;
  }

  get previousState(): WarriorActionState {
    return this._previousState;
  }

  get timeInStateMs(): number {
    return this._timeInStateMs;
  }

  public update(deltaMs: number): void {
    this._timeInStateMs += deltaMs;
  }

  public canTransitionTo(next: WarriorActionState): boolean {
    if (this._state === 'dead') {
      return false; // Dead is an absolute terminal state
    }

    if (this._state === next) {
      return true;
    }

    // Hitstun interrupts any active state except dead
    if (next === 'hitstun' || next === 'dead' || next === 'knocked_down') {
      return true;
    }

    // While in hitstun or knocked_down, warrior cannot freely attack, block, or run
    if (this._state === 'hitstun' || this._state === 'knocked_down') {
      return next === 'idle' || next === 'falling';
    }

    // While attacking, cannot transition to blocking/parrying until recovery is done
    if (this._state === 'attacking') {
      return next === 'idle' || next === 'falling';
    }

    // General transitions from neutral states
    switch (next) {
      case 'idle':
      case 'running':
      case 'jumping':
      case 'falling':
      case 'attacking':
      case 'blocking':
      case 'parrying':
        return true;
      default:
        return false;
    }
  }

  public transitionTo(next: WarriorActionState): boolean {
    if (!this.canTransitionTo(next)) {
      return false;
    }

    this._previousState = this._state;
    this._state = next;
    this._timeInStateMs = 0;
    return true;
  }

  public forceState(state: WarriorActionState): void {
    this._previousState = this._state;
    this._state = state;
    this._timeInStateMs = 0;
  }
}
