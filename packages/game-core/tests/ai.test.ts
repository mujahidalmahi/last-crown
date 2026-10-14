import { describe, it, expect, beforeEach } from 'vitest';
import { WarriorBotAI } from '../src/ai/WarriorBotAI.js';
import { WarriorSnapshot } from '@last-crown/shared';

describe('WarriorBotAI', () => {
  let ai: WarriorBotAI;

  const createDummySnapshot = (
    x: number,
    overrides: Partial<WarriorSnapshot> = {}
  ): WarriorSnapshot => ({
    id: 'bot',
    name: 'Bot',
    position: { x, y: 560 },
    velocity: { x: 0, y: 0 },
    facing: 'left',
    isGrounded: true,
    health: 100,
    maxHealth: 100,
    stamina: 100,
    maxStamina: 100,
    state: 'idle',
    attackPhase: 'none',
    currentAttackId: null,
    parryWindowRemainingMs: 0,
    hitstunRemainingMs: 0,
    hurtbox: { x: x - 20, y: 500, width: 40, height: 60 },
    roundsWon: 0,
    ...overrides,
  });

  beforeEach(() => {
    ai = new WarriorBotAI();
  });

  it('generates parry input reactively when opponent is winding up in close range', () => {
    const bot = createDummySnapshot(500);
    const player = createDummySnapshot(560, {
      attackPhase: 'windup',
      facing: 'left',
    });

    const input = ai.update(bot, player, 16);
    expect(input.parry).toBe(true);
  });

  it('advances toward opponent when distance is far', () => {
    const bot = createDummySnapshot(300);
    const player = createDummySnapshot(800); // 500px away

    const input = ai.update(bot, player, 16);
    expect(input.moveX).toBe(1); // Moves right toward player
  });
});
