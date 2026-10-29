import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TouchInputBridge } from '../../src/game/input/TouchInputBridge';
import { KeyboardInputAdapter } from '../../src/game/input/KeyboardInputAdapter';

describe('Mobile Touch Controls and Input Bridge', () => {
  beforeEach(() => {
    TouchInputBridge.reset();
  });

  it('updates directional states for movement and jump', () => {
    TouchInputBridge.setDirection({ left: true });
    let polled = TouchInputBridge.poll();
    expect(polled.moveLeft).toBe(true);
    expect(polled.moveRight).toBe(false);

    TouchInputBridge.setDirection({ left: false, right: true });
    polled = TouchInputBridge.poll();
    expect(polled.moveLeft).toBe(false);
    expect(polled.moveRight).toBe(true);

    TouchInputBridge.setDirection({ up: true });
    polled = TouchInputBridge.poll();
    expect(polled.moveUp).toBe(true);
    expect(polled.jump).toBe(true);

    TouchInputBridge.setDirection({ up: false });
    polled = TouchInputBridge.poll();
    expect(polled.moveUp).toBe(false);
    expect(polled.jump).toBe(false);

    TouchInputBridge.setDirection({ down: true });
    polled = TouchInputBridge.poll();
    expect(polled.moveDown).toBe(true);
  });

  it('handles holdable guard/block state correctly', () => {
    TouchInputBridge.setBlock(true);
    expect(TouchInputBridge.poll().block).toBe(true);
    // Continuous states persist across polls until explicitly released
    expect(TouchInputBridge.poll().block).toBe(true);

    TouchInputBridge.setBlock(false);
    expect(TouchInputBridge.poll().block).toBe(false);
  });

  it('buffers one-shot tactical actions and clears them on poll', () => {
    TouchInputBridge.triggerLightAttack();
    let polled = TouchInputBridge.poll();
    expect(polled.lightAttackTrigger).toBe(true);

    // After poll, the trigger is consumed
    polled = TouchInputBridge.poll();
    expect(polled.lightAttackTrigger).toBe(false);

    TouchInputBridge.triggerHeavyAttack();
    expect(TouchInputBridge.poll().heavyAttackTrigger).toBe(true);
    expect(TouchInputBridge.poll().heavyAttackTrigger).toBe(false);

    TouchInputBridge.triggerThrust();
    expect(TouchInputBridge.poll().thrustTrigger).toBe(true);
    expect(TouchInputBridge.poll().thrustTrigger).toBe(false);

    TouchInputBridge.triggerParry();
    expect(TouchInputBridge.poll().parryTrigger).toBe(true);
    expect(TouchInputBridge.poll().parryTrigger).toBe(false);

    TouchInputBridge.triggerDash();
    expect(TouchInputBridge.poll().dashTrigger).toBe(true);
    expect(TouchInputBridge.poll().dashTrigger).toBe(false);

    TouchInputBridge.triggerThrow();
    expect(TouchInputBridge.poll().throwTrigger).toBe(true);
    expect(TouchInputBridge.poll().throwTrigger).toBe(false);

    TouchInputBridge.triggerBurst();
    expect(TouchInputBridge.poll().burstTrigger).toBe(true);
    expect(TouchInputBridge.poll().burstTrigger).toBe(false);
  });

  it('integrates touch inputs into KeyboardInputAdapter pollInput seamlessly', () => {
    const adapter = new KeyboardInputAdapter();

    // 1. Test touch movement left
    TouchInputBridge.setDirection({ left: true });
    let input = adapter.pollInput();
    expect(input.moveX).toBe(-1);
    expect(input.moveY).toBe(0);

    // 2. Test touch jump
    TouchInputBridge.setDirection({ left: false });
    TouchInputBridge.setJump(true);
    input = adapter.pollInput();
    expect(input.jump).toBe(true);
    expect(input.moveY).toBe(-1);

    // 3. Test touch light attack
    TouchInputBridge.setJump(false);
    TouchInputBridge.triggerLightAttack();
    input = adapter.pollInput();
    expect(input.attack).toBe(true);
    expect(input.attackType).toBe('light');

    // 4. Test touch low sweep (crouch + light attack)
    TouchInputBridge.setDirection({ down: true });
    TouchInputBridge.triggerLightAttack();
    input = adapter.pollInput();
    expect(input.attack).toBe(true);
    expect(input.attackType).toBe('sweep');

    // 5. Test touch heavy attack
    TouchInputBridge.setDirection({ down: false });
    TouchInputBridge.triggerHeavyAttack();
    input = adapter.pollInput();
    expect(input.attack).toBe(true);
    expect(input.attackType).toBe('heavy');

    // 6. Test touch forward thrust
    TouchInputBridge.triggerThrust();
    input = adapter.pollInput();
    expect(input.attack).toBe(true);
    expect(input.attackType).toBe('thrust');

    // 7. Test touch parry & riposte
    TouchInputBridge.triggerParry();
    input = adapter.pollInput();
    expect(input.parry).toBe(true);

    // 8. Test touch tactical dash
    TouchInputBridge.triggerDash();
    input = adapter.pollInput();
    expect(input.dash).toBe(true);

    // 9. Test touch block
    TouchInputBridge.setBlock(true);
    input = adapter.pollInput();
    expect(input.block).toBe(true);

    // 10. Test touch throw
    TouchInputBridge.setBlock(false);
    TouchInputBridge.triggerThrow();
    input = adapter.pollInput();
    expect(input.throw).toBe(true);

    // 11. Test touch burst
    TouchInputBridge.triggerBurst();
    input = adapter.pollInput();
    expect(input.burst).toBe(true);

    adapter.destroy();
  });

  it('maps desktop keyboard controls accurately: A=left, D=right, W/Space=jump, K=heavy, J=light, Shift=defence, L=parry', () => {
    type KeyHandler = (e: { code: string; preventDefault?: () => void }) => void;
    const listeners: Record<string, KeyHandler> = {};
    vi.stubGlobal('window', {
      addEventListener: vi.fn((event: string, cb: KeyHandler) => {
        listeners[event] = cb;
      }),
      removeEventListener: vi.fn(),
      localStorage: { getItem: vi.fn(), setItem: vi.fn() },
    });

    const adapter = new KeyboardInputAdapter();

    const pressKey = (code: string) => {
      listeners['keydown']?.({ code, preventDefault: vi.fn() });
    };
    const releaseKey = (code: string) => {
      listeners['keyup']?.({ code, preventDefault: vi.fn() });
    };

    // 1. A = Move Left
    pressKey('KeyA');
    let input = adapter.pollInput();
    expect(input.moveX).toBe(-1);
    releaseKey('KeyA');

    // 2. D = Move Right
    pressKey('KeyD');
    input = adapter.pollInput();
    expect(input.moveX).toBe(1);
    releaseKey('KeyD');

    // 3. W = Jump
    pressKey('KeyW');
    input = adapter.pollInput();
    expect(input.jump).toBe(true);
    releaseKey('KeyW');

    // Space = Jump
    pressKey('Space');
    input = adapter.pollInput();
    expect(input.jump).toBe(true);
    releaseKey('Space');

    // 4. J = Light attack
    pressKey('KeyJ');
    input = adapter.pollInput();
    expect(input.attack).toBe(true);
    expect(input.attackType).toBe('light');

    // 5. K = Heavy attack
    pressKey('KeyK');
    input = adapter.pollInput();
    expect(input.attack).toBe(true);
    expect(input.attackType).toBe('heavy');

    // 6. Shift = Defence (ShiftLeft & ShiftRight)
    pressKey('ShiftLeft');
    input = adapter.pollInput();
    expect(input.block).toBe(true);
    releaseKey('ShiftLeft');

    pressKey('ShiftRight');
    input = adapter.pollInput();
    expect(input.block).toBe(true);
    releaseKey('ShiftRight');

    // 7. L = Parry ("perry")
    pressKey('KeyL');
    input = adapter.pollInput();
    expect(input.parry).toBe(true);

    adapter.destroy();
    vi.unstubAllGlobals();
  });

  it('controls continuous auto-jumping via setAutoJump and poll', () => {
    // Initially autoJump is false
    expect(TouchInputBridge.isAutoJump()).toBe(false);
    expect(TouchInputBridge.poll().jump).toBe(false);

    // Turn autoJump ON
    TouchInputBridge.setAutoJump(true);
    expect(TouchInputBridge.isAutoJump()).toBe(true);

    // Continuous jump persists across multiple polls (does not reset like one-shot actions)
    expect(TouchInputBridge.poll().jump).toBe(true);
    expect(TouchInputBridge.poll().jump).toBe(true);
    expect(TouchInputBridge.poll().moveUp).toBe(true);

    // Integrates with KeyboardInputAdapter
    const adapter = new KeyboardInputAdapter();
    expect(adapter.pollInput().jump).toBe(true);
    expect(adapter.pollInput().jump).toBe(true);

    // Turn autoJump OFF
    TouchInputBridge.setAutoJump(false);
    expect(TouchInputBridge.isAutoJump()).toBe(false);
    expect(TouchInputBridge.poll().jump).toBe(false);
    expect(adapter.pollInput().jump).toBe(false);

    // When OFF, manual jump still functions as expected
    TouchInputBridge.setJump(true);
    expect(TouchInputBridge.poll().jump).toBe(true);
    expect(adapter.pollInput().jump).toBe(true);

    TouchInputBridge.setJump(false);
    expect(TouchInputBridge.poll().jump).toBe(false);
    expect(adapter.pollInput().jump).toBe(false);

    // Reset clears autoJump state
    TouchInputBridge.setAutoJump(true);
    expect(TouchInputBridge.isAutoJump()).toBe(true);
    TouchInputBridge.reset();
    expect(TouchInputBridge.isAutoJump()).toBe(false);
    expect(TouchInputBridge.poll().jump).toBe(false);

    adapter.destroy();
  });
});
