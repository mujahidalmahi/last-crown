import { Direction } from '../domain/types.js';
import { HitResult, AttackType } from '../domain/combat.js';

export const ClientMessageType = {
  PLAYER_INPUT: 'PLAYER_INPUT',
  PING: 'PING',
  READY: 'READY',
  VOICE_SIGNAL: 'VOICE_SIGNAL',
  REQUEST_BOT_OPPONENT: 'REQUEST_BOT_OPPONENT',
  FORFEIT_MATCH: 'FORFEIT_MATCH',
} as const;

export type ClientMessageType = (typeof ClientMessageType)[keyof typeof ClientMessageType];

export interface PlayerInputMessage {
  sequence: number;
  timestamp: number;
  moveX: number; // -1, 0, 1
  jump: boolean;
  attack: boolean;
  attackType?: AttackType;
  block: boolean;
  parry: boolean;
  dash?: boolean;
  facing?: Direction;
}

export interface PingMessage {
  timestamp: number;
}

export const ServerMessageType = {
  PONG: 'PONG',
  MATCH_START: 'MATCH_START',
  COMBAT_EVENT: 'COMBAT_EVENT',
  ROUND_END: 'ROUND_END',
  MATCH_END: 'MATCH_END',
  ERROR: 'ERROR',
  VOICE_SIGNAL: 'VOICE_SIGNAL',
  PLAYER_DISCONNECTED: 'PLAYER_DISCONNECTED',
  PLAYER_RECONNECTED: 'PLAYER_RECONNECTED',
  OPPONENT_LEFT: 'OPPONENT_LEFT',
  MATCH_QUEUE_STATUS: 'MATCH_QUEUE_STATUS',
} as const;

export type ServerMessageType = (typeof ServerMessageType)[keyof typeof ServerMessageType];

export interface PongMessage {
  clientTimestamp: number;
  serverTimestamp: number;
}

export interface CombatEventMessage {
  tick: number;
  result: HitResult;
}

export interface MatchEndMessage {
  winnerId: string;
  reason?: 'normal' | 'opponent_forfeit' | 'opponent_disconnect_timeout' | 'opponent_left';
  message?: string;
}

export interface PlayerDisconnectedMessage {
  sessionId: string;
  gracePeriodSec: number;
}

export interface PlayerReconnectedMessage {
  sessionId: string;
}

export interface OpponentLeftMessage {
  sessionId: string;
  reason: 'forfeit' | 'disconnect_timeout' | 'host_left' | 'guest_left' | 'rematch_declined';
  message: string;
}

export interface MatchQueueStatusMessage {
  secondsInQueue: number;
  secondsUntilBot: number;
}

export interface ErrorMessage {
  code: string;
  message: string;
}

export interface VoiceSignalPayload {
  type:
    'ready' | 'description' | 'offer' | 'answer' | 'candidate' | 'mute' | 'leave' | 'ice_servers';
  data?: unknown;
}

export interface VoiceSignalClientMessage {
  signal: VoiceSignalPayload;
}

export interface VoiceSignalServerMessage {
  from: string;
  signal: VoiceSignalPayload;
}
