import { z } from 'zod';

export interface PlayerStatistics {
  version: number;
  matchesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  currentStreak: number;
  bestStreak: number;
  totalScore: number;
  singleplayerMatches: number;
  singleplayerWins: number;
  multiplayerMatches: number;
  multiplayerWins: number;
  parriesExecuted: number;
  attacksLanded: number;
  lastUpdated: number;
}

export const PlayerStatisticsSchema = z.object({
  version: z.number().int().default(1),
  matchesPlayed: z.number().int().nonnegative().default(0),
  wins: z.number().int().nonnegative().default(0),
  losses: z.number().int().nonnegative().default(0),
  draws: z.number().int().nonnegative().default(0),
  currentStreak: z.number().int().nonnegative().default(0),
  bestStreak: z.number().int().nonnegative().default(0),
  totalScore: z.number().int().nonnegative().default(0),
  singleplayerMatches: z.number().int().nonnegative().default(0),
  singleplayerWins: z.number().int().nonnegative().default(0),
  multiplayerMatches: z.number().int().nonnegative().default(0),
  multiplayerWins: z.number().int().nonnegative().default(0),
  parriesExecuted: z.number().int().nonnegative().default(0),
  attacksLanded: z.number().int().nonnegative().default(0),
  lastUpdated: z.number().default(0),
});

export const DEFAULT_PLAYER_STATISTICS: PlayerStatistics = {
  version: 1,
  matchesPlayed: 0,
  wins: 0,
  losses: 0,
  draws: 0,
  currentStreak: 0,
  bestStreak: 0,
  totalScore: 0,
  singleplayerMatches: 0,
  singleplayerWins: 0,
  multiplayerMatches: 0,
  multiplayerWins: 0,
  parriesExecuted: 0,
  attacksLanded: 0,
  lastUpdated: 0,
};

export const STORAGE_KEY_STATISTICS = 'last_crown_player_stats_v1';
export const STORAGE_KEY_SETTINGS = 'last_crown_player_settings_v1';

export function calculateWinRate(stats: PlayerStatistics): number {
  if (stats.matchesPlayed <= 0) return 0;
  return Math.round((stats.wins / stats.matchesPlayed) * 100);
}

export function formatWinRate(winRate: number): string {
  return `${winRate}%`;
}

export class StatisticsManager {
  private static instance: StatisticsManager | null = null;
  private memoryStats: PlayerStatistics = { ...DEFAULT_PLAYER_STATISTICS };
  private recordedMatchIds = new Set<string>();

  public static getInstance(): StatisticsManager {
    if (!StatisticsManager.instance) {
      StatisticsManager.instance = new StatisticsManager();
    }
    return StatisticsManager.instance;
  }

  public getStats(): PlayerStatistics {
    if (typeof window === 'undefined') {
      return { ...this.memoryStats };
    }

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY_STATISTICS);
      if (!raw) {
        return { ...this.memoryStats };
      }

      const parsed = JSON.parse(raw);
      const validation = PlayerStatisticsSchema.safeParse(parsed);
      if (validation.success) {
        this.memoryStats = validation.data;
        return { ...this.memoryStats };
      } else {
        // Corrupted or outdated schema: recover safely
        console.warn('[StatisticsManager] Storage schema mismatch, migrating data safely.');
        const fallback = { ...DEFAULT_PLAYER_STATISTICS, ...parsed, version: 1 };
        const recovered = PlayerStatisticsSchema.parse(fallback);
        this.saveStats(recovered);
        return recovered;
      }
    } catch {
      // Inaccessible localStorage (e.g. security sandbox or storage quota)
      return { ...this.memoryStats };
    }
  }

  public recordMatchResult(
    matchId: string,
    result: 'win' | 'loss' | 'draw',
    mode: 'singleplayer' | 'multiplayer',
    scoreGain: number = 0
  ): PlayerStatistics {
    // Prevent duplicate match increments
    if (this.recordedMatchIds.has(matchId)) {
      return this.getStats();
    }
    this.recordedMatchIds.add(matchId);

    const current = this.getStats();
    const updated: PlayerStatistics = {
      ...current,
      matchesPlayed: current.matchesPlayed + 1,
      lastUpdated: Date.now(),
    };

    if (mode === 'singleplayer') {
      updated.singleplayerMatches += 1;
    } else {
      updated.multiplayerMatches += 1;
    }

    if (result === 'win') {
      updated.wins += 1;
      updated.currentStreak += 1;
      if (updated.currentStreak > updated.bestStreak) {
        updated.bestStreak = updated.currentStreak;
      }
      updated.totalScore += Math.max(100, scoreGain || 100);
      if (mode === 'singleplayer') {
        updated.singleplayerWins += 1;
      } else {
        updated.multiplayerWins += 1;
      }
    } else if (result === 'loss') {
      updated.losses += 1;
      updated.currentStreak = 0;
      updated.totalScore += Math.max(10, scoreGain || 10);
    } else {
      // Draw
      updated.draws += 1;
      updated.totalScore += Math.max(50, scoreGain || 50);
    }

    this.saveStats(updated);
    return updated;
  }

  public recordCombatEvent(type: 'parry' | 'hit'): void {
    const current = this.getStats();
    if (type === 'parry') {
      current.parriesExecuted += 1;
    } else if (type === 'hit') {
      current.attacksLanded += 1;
    }
    current.lastUpdated = Date.now();
    this.saveStats(current);
  }

  public resetStats(): PlayerStatistics {
    this.recordedMatchIds.clear();
    const reset = { ...DEFAULT_PLAYER_STATISTICS, lastUpdated: Date.now() };
    this.saveStats(reset);
    return reset;
  }

  private saveStats(stats: PlayerStatistics): void {
    this.memoryStats = { ...stats };
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(STORAGE_KEY_STATISTICS, JSON.stringify(stats));
      } catch {
        // Storage full or restricted
      }
    }
  }
}
