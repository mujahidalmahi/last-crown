import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GamepadInputAdapter } from '../../src/game/input/GamepadInputAdapter';
import { DualPlayerInputManager } from '../../src/game/input/DualPlayerInputManager';
import { PartyControllerBridge } from '../../src/game/input/PartyControllerBridge';

describe('Dual Controller & Gamepad System', () => {
  let mockGamepads: (Gamepad | null)[] = [];

  beforeEach(() => {
    mockGamepads = [];
    vi.stubGlobal('navigator', {
      getGamepads: () => mockGamepads,
      vibrate: vi.fn(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  interface MutableButton {
    pressed: boolean;
    touched: boolean;
    value: number;
  }

  const createMockGamepad = (index: number, id: string): Gamepad => {
    const buttons: MutableButton[] = Array.from({ length: 16 }, () => ({
      pressed: false,
      touched: false,
      value: 0,
    }));

    return {
      id,
      index,
      connected: true,
      timestamp: Date.now(),
      mapping: 'standard',
      axes: [0, 0, 0, 0],
      buttons,
      vibrationActuator: {
        playEffect: vi.fn().mockResolvedValue('complete'),
      },
    } as unknown as Gamepad;
  };

  const setButton = (gp: Gamepad, btnIndex: number, pressed: boolean) => {
    const btn = gp.buttons[btnIndex] as MutableButton | undefined;
    if (btn) {
      btn.pressed = pressed;
      btn.value = pressed ? 1.0 : 0.0;
    }
  };

  describe('GamepadInputAdapter', () => {
    it('detects connected physical gamepads', () => {
      const adapter = new GamepadInputAdapter();
      expect(adapter.getConnectedGamepads()).toEqual([]);
      expect(adapter.hasGamepad(0)).toBe(false);

      mockGamepads[0] = createMockGamepad(0, 'Xbox Wireless Controller');
      expect(adapter.getConnectedGamepads().length).toBe(1);
      expect(adapter.hasGamepad(0)).toBe(true);
      expect(adapter.hasGamepad(1)).toBe(false);

      mockGamepads[1] = createMockGamepad(1, 'DualShock 4 Wireless Controller');
      expect(adapter.getConnectedGamepads().length).toBe(2);
      expect(adapter.hasGamepad(1)).toBe(true);
    });

    it('maps stick axes with deadzone filtering', () => {
      const adapter = new GamepadInputAdapter();
      const gp = createMockGamepad(0, 'Xbox Controller');
      mockGamepads[0] = gp;

      // Small noise inside deadzone (0.15) should be ignored
      (gp.axes as number[])[0] = 0.15;
      (gp.axes as number[])[1] = -0.15;
      let input = adapter.pollInput(0);
      expect(input?.moveX).toBe(0);
      expect(input?.moveY).toBe(0);

      // Deflection beyond deadzone (-0.75 X, +0.6 Y)
      (gp.axes as number[])[0] = -0.75;
      (gp.axes as number[])[1] = 0.6;
      input = adapter.pollInput(0);
      expect(input?.moveX).toBe(-1);
      expect(input?.moveY).toBe(1);
    });

    it('maps diamond action buttons to correct attack types with edge detection', () => {
      const adapter = new GamepadInputAdapter();
      const gp = createMockGamepad(0, 'Xbox Controller');
      mockGamepads[0] = gp;

      // Button 2 (Square/X) -> Light Attack
      setButton(gp, 2, true);
      let input = adapter.pollInput(0);
      expect(input?.attack).toBe(true);
      expect(input?.attackType).toBe('light');

      // Frame 2: Still holding Button 2 should not re-trigger attack
      input = adapter.pollInput(0);
      expect(input?.attack).toBe(false);

      // Release button 2 and press Button 3 (Triangle/Y) -> Heavy Attack
      setButton(gp, 2, false);
      adapter.pollInput(0); // clear edge
      setButton(gp, 3, true);
      input = adapter.pollInput(0);
      expect(input?.attack).toBe(true);
      expect(input?.attackType).toBe('heavy');
    });

    it('maps crouch + Light Attack to sweep', () => {
      const adapter = new GamepadInputAdapter();
      const gp = createMockGamepad(0, 'Xbox Controller');
      mockGamepads[0] = gp;

      // D-Pad Down (Button 13) + Button 2 (Light)
      setButton(gp, 13, true);
      setButton(gp, 2, true);
      const input = adapter.pollInput(0);
      expect(input?.moveY).toBe(1);
      expect(input?.attack).toBe(true);
      expect(input?.attackType).toBe('sweep');
    });

    it('maps bumpers to holdable block and dash', () => {
      const adapter = new GamepadInputAdapter();
      const gp = createMockGamepad(0, 'Xbox Controller');
      mockGamepads[0] = gp;

      // Button 4 (L1/LB) -> Block
      setButton(gp, 4, true);
      let input = adapter.pollInput(0);
      expect(input?.block).toBe(true);

      // Block remains held across multiple frames
      input = adapter.pollInput(0);
      expect(input?.block).toBe(true);

      // Button 7 (R2/RT) -> Dash
      setButton(gp, 7, true);
      input = adapter.pollInput(0);
      expect(input?.dash).toBe(true);
    });
  });

  describe('DualPlayerInputManager', () => {
    it('isolates P1 and P2 inputs across Gamepad 0 and Gamepad 1', () => {
      const manager = new DualPlayerInputManager();
      const gp0 = createMockGamepad(0, 'Gamepad P1');
      const gp1 = createMockGamepad(1, 'Gamepad P2');
      mockGamepads[0] = gp0;
      mockGamepads[1] = gp1;

      // P1 moves Left, P2 moves Right
      setButton(gp0, 14, true); // D-pad Left
      setButton(gp1, 15, true); // D-pad Right

      // P1 Light Attack, P2 Heavy Attack
      setButton(gp0, 2, true);
      setButton(gp1, 3, true);

      const p1Input = manager.pollP1();
      const p2Input = manager.pollP2();

      expect(p1Input.moveX).toBe(-1);
      expect(p1Input.attack).toBe(true);
      expect(p1Input.attackType).toBe('light');

      expect(p2Input.moveX).toBe(1);
      expect(p2Input.attack).toBe(true);
      expect(p2Input.attackType).toBe('heavy');

      manager.destroy();
    });
  });

  describe('PartyControllerBridge', () => {
    it('manages singleton instance and buffers phone input', () => {
      const bridge = PartyControllerBridge.getInstance();
      expect(bridge).toBeDefined();

      // Poll when no input received returns null
      expect(bridge.pollP1Input()).toBeNull();
      expect(bridge.pollP2Input()).toBeNull();
    });

    it('buffers and merges phone controller inputs into DualPlayerInputManager', () => {
      const bridge = PartyControllerBridge.getInstance();
      const manager = new DualPlayerInputManager();

      // Simulate incoming controller input for P1 (e.g. from mobile phone gamepad)
      (bridge as unknown as { p1CurrentInput: unknown }).p1CurrentInput = {
        sequence: 1,
        timestamp: Date.now(),
        moveX: 1,
        moveY: 0,
        jump: true,
        attack: true,
        attackType: 'thrust',
        block: true,
        parry: true,
        dash: true,
      };
      (bridge as unknown as { p1AttackBuffer: unknown }).p1AttackBuffer = {
        attack: true,
        attackType: 'thrust',
      };
      (bridge as unknown as { p1DashBuffer: boolean }).p1DashBuffer = true;

      const p1Input = manager.pollP1();
      expect(p1Input.moveX).toBe(1);
      expect(p1Input.jump).toBe(true);
      expect(p1Input.attack).toBe(true);
      expect(p1Input.attackType).toBe('thrust');
      expect(p1Input.block).toBe(true);
      expect(p1Input.parry).toBe(true);
      expect(p1Input.dash).toBe(true);

      // Clean up bridge buffer
      (bridge as unknown as { p1CurrentInput: unknown }).p1CurrentInput = null;
      manager.destroy();
    });
  });
});
