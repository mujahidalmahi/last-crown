import { describe, it, expect, beforeEach, vi } from 'vitest';
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
    isExhausted: false,
    ...overrides,
  });

  beforeEach(() => {
    ai = new WarriorBotAI('adept');
  });

  it('does not parry immediately in the first frame due to human-like reaction latency', () => {
    const bot = createDummySnapshot(500);
    const player = createDummySnapshot(560, {
      attackPhase: 'windup',
      facing: 'left',
    });

    // Frame 1: 16ms into windup
    const input1 = ai.update(bot, player, 16);
    expect(input1.parry).toBe(false);
  });

  it('triggers reactive parry after reaction delay elapses when read is successful', () => {
    ai.setDifficulty('master'); // 90ms reaction delay
    vi.spyOn(Math, 'random').mockReturnValue(0.1); // guarantees parry read success

    const bot = createDummySnapshot(500);
    const player = createDummySnapshot(560, {
      attackPhase: 'windup',
      facing: 'left',
    });

    // Advance 80ms: reaction delay not elapsed yet
    ai.update(bot, player, 80);

    // Advance another 20ms (total 100ms > 90ms): reaction delay elapsed
    const finalInput = ai.update(bot, player, 20);
    expect(finalInput.parry).toBe(true);

    vi.restoreAllMocks();
  });

  it('advances toward opponent when distance is far', () => {
    const bot = createDummySnapshot(300);
    const player = createDummySnapshot(800); // 500px away

    const input = ai.update(bot, player, 16);
    expect(input.moveX).toBe(1); // Moves right toward player
  });

  it('retreats when stamina is critically low or exhausted', () => {
    const bot = createDummySnapshot(500, { stamina: 10, isExhausted: true });
    const player = createDummySnapshot(560); // In close range

    // Force decision update
    ai.update(bot, player, 500);
    const input = ai.update(bot, player, 16);
    // Should retreat away from player (move left = -1)
    expect(input.moveX).toBe(-1);
  });

  it('master difficulty punishes exhausted player with heavy attack in close range', () => {
    ai.setDifficulty('master');
    const bot = createDummySnapshot(500, { stamina: 100 });
    const player = createDummySnapshot(550, { isExhausted: true });

    // Step to trigger decision
    ai.update(bot, player, 500);
    const input = ai.update(bot, player, 16);
    expect(input.attack).toBe(true);
    expect(input.attackType).toBe('heavy');
  });

  it('configures novice, adept, and master difficulty settings properly', () => {
    ai.setDifficulty('novice');
    expect(ai.difficulty).toBe('novice');

    ai.setDifficulty('adept');
    expect(ai.difficulty).toBe('adept');

    ai.setDifficulty('master');
    expect(ai.difficulty).toBe('master');
  });
});
