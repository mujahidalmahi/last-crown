import { describe, it, expect, beforeEach } from 'vitest';
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

    adapter.destroy();
  });
});
