import { Direction } from '../domain/types.js';
import { HitResult } from '../domain/combat.js';

export const ClientMessageType = {
  PLAYER_INPUT: 'PLAYER_INPUT',
  PING: 'PING',
  READY: 'READY',
} as const;

export type ClientMessageType = (typeof ClientMessageType)[keyof typeof ClientMessageType];

export interface PlayerInputMessage {
  sequence: number;
  timestamp: number;
  moveX: number; // -1, 0, 1
  jump: boolean;
  attack: boolean;
  attackType?: 'light' | 'heavy' | 'thrust';
  block: boolean;
  parry: boolean;
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

export interface ErrorMessage {
  code: string;
  message: string;
}
