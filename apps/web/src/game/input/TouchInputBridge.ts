export interface TouchInputState {
  moveLeft: boolean;
  moveRight: boolean;
  moveUp: boolean;
  moveDown: boolean;
  jump: boolean;
  block: boolean;
  dashTrigger: boolean;
  lightAttackTrigger: boolean;
  heavyAttackTrigger: boolean;
  thrustTrigger: boolean;
  sweepTrigger: boolean;
  parryTrigger: boolean;
}

class TouchInputBridgeClass {
  private state: TouchInputState = {
    moveLeft: false,
    moveRight: false,
    moveUp: false,
    moveDown: false,
    jump: false,
    block: false,
    dashTrigger: false,
    lightAttackTrigger: false,
    heavyAttackTrigger: false,
    thrustTrigger: false,
    sweepTrigger: false,
    parryTrigger: false,
  };

  public setDirection(direction: {
    left?: boolean;
    right?: boolean;
    up?: boolean;
    down?: boolean;
  }): void {
    if (direction.left !== undefined) this.state.moveLeft = direction.left;
    if (direction.right !== undefined) this.state.moveRight = direction.right;
    if (direction.up !== undefined) {
      this.state.moveUp = direction.up;
      if (direction.up) this.state.jump = true;
    }
    if (direction.down !== undefined) this.state.moveDown = direction.down;
  }

  public setJump(jumping: boolean): void {
    this.state.jump = jumping;
    if (jumping) this.state.moveUp = true;
  }

  public setBlock(blocking: boolean): void {
    this.state.block = blocking;
  }

  public triggerDash(): void {
    this.state.dashTrigger = true;
  }

  public triggerLightAttack(): void {
    this.state.lightAttackTrigger = true;
  }

  public triggerHeavyAttack(): void {
    this.state.heavyAttackTrigger = true;
  }

  public triggerThrust(): void {
    this.state.thrustTrigger = true;
  }

  public triggerSweep(): void {
    this.state.sweepTrigger = true;
  }

  public triggerParry(): void {
    this.state.parryTrigger = true;
  }

  /**
   * Polls current touch input state and resets single-frame triggers.
   */
  public poll(): TouchInputState {
    const snapshot: TouchInputState = {
      ...this.state,
    };

    // Reset one-shot tactical buffers on poll
    this.state.dashTrigger = false;
    this.state.lightAttackTrigger = false;
    this.state.heavyAttackTrigger = false;
    this.state.thrustTrigger = false;
    this.state.sweepTrigger = false;
    this.state.parryTrigger = false;

    return snapshot;
  }

  public reset(): void {
    this.state = {
      moveLeft: false,
      moveRight: false,
      moveUp: false,
      moveDown: false,
      jump: false,
      block: false,
      dashTrigger: false,
      lightAttackTrigger: false,
      heavyAttackTrigger: false,
      thrustTrigger: false,
      sweepTrigger: false,
      parryTrigger: false,
    };
  }
}

export const TouchInputBridge = new TouchInputBridgeClass();
