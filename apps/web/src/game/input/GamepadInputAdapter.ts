import { PlayerInputMessage, AttackType } from '@last-crown/shared';
import { CONTROLLER_DEFAULTS } from '@last-crown/game-config';

export interface GamepadInfo {
  index: number;
  id: string;
  connected: boolean;
}

export class GamepadInputAdapter {
  // Previous button press state per gamepad index for edge triggering
  private prevButtonStates: Map<number, boolean[]> = new Map();
  private sequence: number = 0;
  private onConnectHandler: (e: Event) => void;
  private onDisconnectHandler: (e: Event) => void;

  constructor() {
    this.onConnectHandler = (e: Event) => {
      const gp = (e as GamepadEvent).gamepad;
      console.info(`[Gamepad] Connected at index ${gp.index}: ${gp.id}`);
    };
    this.onDisconnectHandler = (e: Event) => {
      const gp = (e as GamepadEvent).gamepad;
      console.info(`[Gamepad] Disconnected from index ${gp.index}: ${gp.id}`);
      this.prevButtonStates.delete(gp.index);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('gamepadconnected', this.onConnectHandler);
      window.addEventListener('gamepaddisconnected', this.onDisconnectHandler);
    }
  }

  public destroy(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('gamepadconnected', this.onConnectHandler);
      window.removeEventListener('gamepaddisconnected', this.onDisconnectHandler);
    }
    this.prevButtonStates.clear();
  }

  public getConnectedGamepads(): GamepadInfo[] {
    if (typeof navigator === 'undefined' || !navigator.getGamepads) {
      return [];
    }
    const raw = navigator.getGamepads();
    const result: GamepadInfo[] = [];
    for (let i = 0; i < raw.length; i++) {
      const gp = raw[i];
      if (gp && gp.connected) {
        result.push({
          index: gp.index,
          id: gp.id,
          connected: gp.connected,
        });
      }
    }
    return result;
  }

  public hasGamepad(index: number): boolean {
    if (typeof navigator === 'undefined' || !navigator.getGamepads) {
      return false;
    }
    const raw = navigator.getGamepads();
    const gp = raw[index];
    return !!(gp && gp.connected);
  }

  public pollInput(gamepadIndex: number): PlayerInputMessage | null {
    if (typeof navigator === 'undefined' || !navigator.getGamepads) {
      return null;
    }

    const rawGamepads = navigator.getGamepads();
    const gp = rawGamepads[gamepadIndex];
    if (!gp || !gp.connected) {
      return null;
    }

    this.sequence++;

    // Retrieve or initialize button state tracking for edge detection
    let prev = this.prevButtonStates.get(gamepadIndex);
    if (!prev) {
      prev = new Array(gp.buttons.length).fill(false);
      this.prevButtonStates.set(gamepadIndex, prev);
    }

    const isPressed = (btnIndex: number): boolean => {
      const b = gp.buttons[btnIndex];
      return b ? b.pressed || b.value > 0.5 : false;
    };

    const isEdgeTrigger = (btnIndex: number): boolean => {
      const current = isPressed(btnIndex);
      const was = prev[btnIndex] ?? false;
      return current && !was;
    };

    const gpConfig = CONTROLLER_DEFAULTS.gamepad;
    const deadzone = gpConfig.deadzone;
    const rawX = gp.axes[0] ?? 0;
    const rawY = gp.axes[1] ?? 0;
    const axisX = Math.abs(rawX) > deadzone ? rawX : 0;
    const axisY = Math.abs(rawY) > deadzone ? rawY : 0;

    // Movement resolution
    let moveX = 0;
    if (axisX < -gpConfig.stickThresholds.moveX || isPressed(gpConfig.buttons.dpadLeft)) {
      moveX -= 1; // Left (Stick Left or D-Pad Left)
    }
    if (axisX > gpConfig.stickThresholds.moveX || isPressed(gpConfig.buttons.dpadRight)) {
      moveX += 1; // Right (Stick Right or D-Pad Right)
    }

    let moveY = 0;
    if (axisY > gpConfig.stickThresholds.moveYDown || isPressed(gpConfig.buttons.dpadDown)) {
      moveY += 1; // Down / Crouch / Fast-fall (Stick Down or D-Pad Down)
    }
    if (axisY < gpConfig.stickThresholds.moveYUp || isPressed(gpConfig.buttons.dpadUp)) {
      moveY -= 1; // Up (Stick Up or D-Pad Up)
    }

    // Jump: Configured jump buttons or Stick Up
    const jump =
      gpConfig.buttons.jump.some(btn => isPressed(btn)) || axisY < gpConfig.stickThresholds.moveYUp;

    // Guard / Block: Configured block triggers / shoulder buttons
    const block = gpConfig.buttons.block.some(btn => isPressed(btn));

    // Evasive Dash: Configured dash buttons
    const dash = gpConfig.buttons.dash.some(btn => isEdgeTrigger(btn));

    // Parry: Configured parry buttons
    const parry = gpConfig.buttons.parry.some(btn => isEdgeTrigger(btn));

    // Attack Resolution
    let attack = false;
    let attackType: AttackType = 'light';

    if (gpConfig.buttons.heavyAttack.some(btn => isEdgeTrigger(btn))) {
      attack = true;
      attackType = 'heavy';
    } else if (gpConfig.buttons.thrust.some(btn => isEdgeTrigger(btn))) {
      attack = true;
      attackType = 'thrust';
    } else if (gpConfig.buttons.lightAttack.some(btn => isEdgeTrigger(btn))) {
      attack = true;
      if (dash) {
        attackType = 'dash';
      } else if (moveY > 0) {
        attackType = 'sweep';
      } else {
        attackType = 'light';
      }
    }

    // Update previous states for next frame's edge detection
    for (let i = 0; i < gp.buttons.length; i++) {
      prev[i] = isPressed(i);
    }

    return {
      sequence: this.sequence,
      timestamp: Date.now(),
      moveX,
      moveY,
      jump,
      attack,
      attackType,
      block,
      parry,
      dash,
    };
  }

  public vibrateGamepad(
    gamepadIndex: number,
    durationMs: number = CONTROLLER_DEFAULTS.gamepad.vibration.defaultDurationMs,
    weakMagnitude: number = CONTROLLER_DEFAULTS.gamepad.vibration.weakMagnitude,
    strongMagnitude: number = CONTROLLER_DEFAULTS.gamepad.vibration.strongMagnitude
  ): void {
    if (typeof navigator === 'undefined' || !navigator.getGamepads) {
      return;
    }
    const raw = navigator.getGamepads();
    const gp = raw[gamepadIndex];
    if (!gp) return;

    // Check for standard Gamepad Haptics (vibrationActuator)
    const actuator = (
      gp as unknown as {
        vibrationActuator?: { playEffect: (type: string, params: object) => Promise<string> };
      }
    ).vibrationActuator;
    if (actuator && typeof actuator.playEffect === 'function') {
      try {
        actuator
          .playEffect('dual-rumble', {
            startDelay: 0,
            duration: durationMs,
            weakMagnitude,
            strongMagnitude,
          })
          .catch(() => {
            // Gracefully ignore unhandled vibration rejections
          });
      } catch {
        // Ignore haptic errors on unsupported hardware
      }
    }
  }
}
