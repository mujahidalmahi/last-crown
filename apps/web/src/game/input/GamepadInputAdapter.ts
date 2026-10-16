import { PlayerInputMessage, AttackType } from '@last-crown/shared';

export interface GamepadInfo {
  index: number;
  id: string;
  connected: boolean;
}

export class GamepadInputAdapter {
  // Previous button press state per gamepad index for edge triggering
  private prevButtonStates: Map<number, boolean[]> = new Map();
  private sequence: number = 0;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('gamepadconnected', e => {
        const gp = (e as GamepadEvent).gamepad;
        console.info(`[Gamepad] Connected at index ${gp.index}: ${gp.id}`);
      });
      window.addEventListener('gamepaddisconnected', e => {
        const gp = (e as GamepadEvent).gamepad;
        console.info(`[Gamepad] Disconnected from index ${gp.index}: ${gp.id}`);
        this.prevButtonStates.delete(gp.index);
      });
    }
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

    // Axes handling with 0.25 deadzone
    const deadzone = 0.25;
    const rawX = gp.axes[0] ?? 0;
    const rawY = gp.axes[1] ?? 0;
    const axisX = Math.abs(rawX) > deadzone ? rawX : 0;
    const axisY = Math.abs(rawY) > deadzone ? rawY : 0;

    // Movement resolution
    let moveX = 0;
    if (axisX < -0.28 || isPressed(14)) {
      moveX -= 1; // Left (Stick Left or D-Pad Left)
    }
    if (axisX > 0.28 || isPressed(15)) {
      moveX += 1; // Right (Stick Right or D-Pad Right)
    }

    let moveY = 0;
    if (axisY > 0.4 || isPressed(13)) {
      moveY += 1; // Down / Crouch / Fast-fall (Stick Down or D-Pad Down)
    }
    if (axisY < -0.4 || isPressed(12)) {
      moveY -= 1; // Up (Stick Up or D-Pad Up)
    }

    // Jump: A/Cross (btn 0), D-Pad Up (btn 12), or Stick Up
    const jump = isPressed(0) || isPressed(12) || axisY < -0.4;

    // Guard / Block: L1/LB (btn 4) or L2/LT (btn 6) - continuous hold
    const block = isPressed(4) || isPressed(6);

    // Evasive Dash: R2/RT (btn 7) or Left Stick Click (btn 10) - single edge
    const dash = isEdgeTrigger(7) || isEdgeTrigger(10);

    // Parry: R1/RB (btn 5)
    const parry = isEdgeTrigger(5);

    // Attack Resolution (Diamond action buttons)
    // Button 2: X (Xbox) / Square (PlayStation) -> Light Slash
    // Button 3: Y (Xbox) / Triangle (PlayStation) -> Heavy Strike
    // Button 1: B (Xbox) / Circle (PlayStation) -> Forward Thrust
    let attack = false;
    let attackType: AttackType = 'light';

    if (isEdgeTrigger(3)) {
      attack = true;
      attackType = 'heavy';
    } else if (isEdgeTrigger(1)) {
      attack = true;
      attackType = 'thrust';
    } else if (isEdgeTrigger(2)) {
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
    durationMs: number = 100,
    weakMagnitude: number = 0.5,
    strongMagnitude: number = 0.5
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
