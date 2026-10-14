import { describe, it, expect, beforeEach } from 'vitest';
import {
  StatisticsManager,
  PlayerStatisticsSchema,
  calculateWinRate,
} from '../src/domain/statistics.js';

describe('Player Statistics and Data Integrity', () => {
  let statsManager: StatisticsManager;

  beforeEach(() => {
    statsManager = StatisticsManager.getInstance();
    statsManager.resetStats();
  });

  it('initializes with valid default statistics', () => {
    const stats = statsManager.getStats();
    expect(stats.matchesPlayed).toBe(0);
    expect(stats.wins).toBe(0);
    expect(stats.losses).toBe(0);
    expect(stats.draws).toBe(0);
    expect(stats.currentStreak).toBe(0);
    expect(stats.bestStreak).toBe(0);
    expect(PlayerStatisticsSchema.safeParse(stats).success).toBe(true);
  });

  it('records wins, updates win streak, best streak, and score', () => {
    statsManager.recordMatchResult('match-1', 'win', 'singleplayer', 150);
    let stats = statsManager.getStats();
    expect(stats.matchesPlayed).toBe(1);
    expect(stats.wins).toBe(1);
    expect(stats.singleplayerWins).toBe(1);
    expect(stats.currentStreak).toBe(1);
    expect(stats.bestStreak).toBe(1);
    expect(stats.totalScore).toBe(150);

    // Second consecutive win
    statsManager.recordMatchResult('match-2', 'win', 'singleplayer', 150);
    stats = statsManager.getStats();
    expect(stats.matchesPlayed).toBe(2);
    expect(stats.wins).toBe(2);
    expect(stats.currentStreak).toBe(2);
    expect(stats.bestStreak).toBe(2);
    expect(stats.totalScore).toBe(300);

    // Third match: loss resets current streak but retains best streak
    statsManager.recordMatchResult('match-3', 'loss', 'singleplayer', 10);
    stats = statsManager.getStats();
    expect(stats.matchesPlayed).toBe(3);
    expect(stats.losses).toBe(1);
    expect(stats.currentStreak).toBe(0);
    expect(stats.bestStreak).toBe(2);
  });

  it('calculates win rate correctly across matches', () => {
    statsManager.recordMatchResult('m1', 'win', 'singleplayer');
    statsManager.recordMatchResult('m2', 'win', 'singleplayer');
    statsManager.recordMatchResult('m3', 'loss', 'singleplayer');
    statsManager.recordMatchResult('m4', 'loss', 'singleplayer');

    const stats = statsManager.getStats();
    expect(calculateWinRate(stats)).toBe(50);
  });

  it('prevents duplicate increments on retransmitted match IDs', () => {
    statsManager.recordMatchResult('match-duplicate', 'win', 'multiplayer', 100);
    statsManager.recordMatchResult('match-duplicate', 'win', 'multiplayer', 100);
    statsManager.recordMatchResult('match-duplicate', 'win', 'multiplayer', 100);

    const stats = statsManager.getStats();
    expect(stats.matchesPlayed).toBe(1);
    expect(stats.wins).toBe(1);
    expect(stats.multiplayerMatches).toBe(1);
    expect(stats.multiplayerWins).toBe(1);
    expect(stats.totalScore).toBe(100);
  });

  it('records parry and hit combat events', () => {
    statsManager.recordCombatEvent('parry');
    statsManager.recordCombatEvent('parry');
    statsManager.recordCombatEvent('hit');

    const stats = statsManager.getStats();
    expect(stats.parriesExecuted).toBe(2);
    expect(stats.attacksLanded).toBe(1);
  });

  it('resets statistics only on intentional call', () => {
    statsManager.recordMatchResult('m-a', 'win', 'singleplayer');
    expect(statsManager.getStats().matchesPlayed).toBe(1);

    const resetStats = statsManager.resetStats();
    expect(resetStats.matchesPlayed).toBe(0);
    expect(resetStats.wins).toBe(0);
    expect(resetStats.currentStreak).toBe(0);
  });
});
