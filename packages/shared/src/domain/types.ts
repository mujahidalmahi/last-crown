export type Direction = 'left' | 'right';

export interface Vector2 {
  x: number;
  y: number;
}

export interface AABB {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type MatchState = 'waiting' | 'countdown' | 'in_progress' | 'round_over' | 'match_over';

export interface RoundResult {
  winnerId: string | null;
  reason: 'ko' | 'timeout' | 'disconnect';
}
