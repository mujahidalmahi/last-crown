'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Client, Room } from 'colyseus.js';
import { BattleRoomState, ClientMessageType, ServerMessageType } from '@last-crown/shared';

export interface MultiplayerState {
  isConnected: boolean;
  isConnecting: boolean;
  roomId: string | null;
  inviteCode: string | null;
  error: string | null;
  roomState: BattleRoomState | null;
  latencyMs: number;
  room: Room<BattleRoomState> | null;
  queueStatus?: { secondsInQueue: number; secondsUntilBot: number } | null;
  opponentNotice?: {
    type: 'disconnected' | 'reconnected' | 'left' | 'forfeited';
    message: string;
    gracePeriodSec?: number;
  } | null;
}

export function useMultiplayerRoom() {
  const [state, setState] = useState<MultiplayerState>({
    isConnected: false,
    isConnecting: false,
    roomId: null,
    inviteCode: null,
    error: null,
    roomState: null,
    latencyMs: 0,
    room: null,
    queueStatus: null,
    opponentNotice: null,
  });

  const clientRef = useRef<Client | null>(null);
  const roomRef = useRef<Room<BattleRoomState> | null>(null);
  const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const getClient = useCallback((): Client => {
    if (!clientRef.current) {
      if (process.env.NEXT_PUBLIC_SERVER_WS_URL) {
        clientRef.current = new Client(process.env.NEXT_PUBLIC_SERVER_WS_URL);
      } else if (typeof window !== 'undefined') {
        const isLocal =
          window.location.hostname === 'localhost' ||
          window.location.hostname === '127.0.0.1' ||
          window.location.hostname === '0.0.0.0';
        if (isLocal) {
          clientRef.current = new Client(`ws://${window.location.hostname}:2567`);
        } else {
          const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
          clientRef.current = new Client(`${wsProtocol}//${window.location.host}`);
        }
      } else {
        clientRef.current = new Client('ws://localhost:2567');
      }
    }
    return clientRef.current;
  }, []);

  const getServerHttpUrl = (): string => {
    // 1. Explicit override via env variable
    if (process.env.NEXT_PUBLIC_SERVER_HTTP_URL) {
      return process.env.NEXT_PUBLIC_SERVER_HTTP_URL;
    }
    if (typeof window === 'undefined') {
      return process.env.SERVER_URL || 'http://localhost:2567';
    }

    // 2. Same-origin deployment URL (Next.js App Router API route proxies to backend Colyseus service)
    return window.location.origin;
  };

  const setupRoomListeners = useCallback((room: Room<BattleRoomState>) => {
    room.onStateChange(newState => {
      setState(prev => ({ ...prev, roomState: newState }));
    });

    room.onError((code, message) => {
      setState(prev => ({ ...prev, error: `Room error [${code}]: ${message}` }));
    });

    room.onLeave(() => {
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = null;
      }
      setState(prev => ({ ...prev, isConnected: false, roomId: null, room: null, latencyMs: 0 }));
    });

    // PONG ping/latency measurement
    room.onMessage(ServerMessageType.PONG, (data: { clientTimestamp?: number }) => {
      if (data && data.clientTimestamp) {
        const rtt = Math.max(1, Date.now() - data.clientTimestamp);
        setState(prev => ({ ...prev, latencyMs: rtt }));
      }
    });

    // Match Queue Status (countdown until AI gladiator steps forward)
    room.onMessage(
      ServerMessageType.MATCH_QUEUE_STATUS,
      (data: { secondsInQueue: number; secondsUntilBot: number }) => {
        setState(prev => ({ ...prev, queueStatus: data }));
      }
    );

    // Opponent Disconnected during match
    room.onMessage(
      ServerMessageType.PLAYER_DISCONNECTED,
      (data: { sessionId: string; gracePeriodSec: number }) => {
        setState(prev => ({
          ...prev,
          opponentNotice: {
            type: 'disconnected',
            message: `Opponent disconnected. Awaiting reconnection (${data.gracePeriodSec}s)...`,
            gracePeriodSec: data.gracePeriodSec,
          },
        }));
      }
    );

    // Opponent Reconnected
    room.onMessage(ServerMessageType.PLAYER_RECONNECTED, () => {
      setState(prev => ({
        ...prev,
        opponentNotice: {
          type: 'reconnected',
          message: 'Opponent reconnected! Resuming combat!',
        },
      }));
      setTimeout(() => {
        setState(prev => ({ ...prev, opponentNotice: null }));
      }, 3000);
    });

    // Opponent Left or Forfeited
    room.onMessage(
      ServerMessageType.OPPONENT_LEFT,
      (data: { sessionId: string; reason: string; message: string }) => {
        setState(prev => ({
          ...prev,
          opponentNotice: {
            type: data.reason === 'forfeit' ? 'forfeited' : 'left',
            message: data.message,
          },
        }));
      }
    );

    // Periodic ping loop
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
    }
    room.send(ClientMessageType.PING, { timestamp: Date.now() });
    pingIntervalRef.current = setInterval(() => {
      if (roomRef.current && roomRef.current.sessionId) {
        roomRef.current.send(ClientMessageType.PING, { timestamp: Date.now() });
      }
    }, 2000);
  }, []);

  const createPrivateRoom = useCallback(
    async (playerName: string = 'Host Warrior', warriorPreset: string = 'knight') => {
      setState(prev => ({ ...prev, isConnecting: true, error: null }));
      try {
        const httpUrl = getServerHttpUrl();
        const targetUrl = new URL('/api/rooms/create', httpUrl).toString();
        const res = await fetch(targetUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isPrivate: true, playerName, warriorPreset }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          const fallbackMsg =
            res.status === 404
              ? 'Multiplayer room endpoint not found (HTTP 404). Ensure game server is running.'
              : `Server error creating room (HTTP ${res.status})`;
          throw new Error(errData.error || fallbackMsg);
        }

        const data = await res.json();
        const client = getClient();
        const room = await client.joinById<BattleRoomState>(data.roomId, {
          playerName,
          warriorPreset,
        });

        roomRef.current = room;
        setupRoomListeners(room);

        setState({
          isConnected: true,
          isConnecting: false,
          roomId: room.id,
          inviteCode: data.inviteCode,
          error: null,
          roomState: room.state,
          latencyMs: 0,
          room,
        });

        return { roomId: room.id, inviteCode: data.inviteCode };
      } catch (err: unknown) {
        let message = 'Multiplayer server is currently unavailable.';
        if (err instanceof Error) {
          if (
            err.message.includes('Failed to fetch') ||
            err.message.includes('NetworkError') ||
            err.message.includes('Failed to load') ||
            err.message.includes('ECONNREFUSED')
          ) {
            message =
              'Cannot reach game server. Make sure the server is running on port 2567 (npm run dev).';
          } else {
            message = err.message;
          }
        }
        setState(prev => ({
          ...prev,
          isConnecting: false,
          error: message,
          room: null,
        }));
        return null;
      }
    },
    [getClient, setupRoomListeners]
  );

  const joinPrivateRoom = useCallback(
    async (
      inviteCode: string,
      playerName: string = 'Guest Warrior',
      warriorPreset: string = 'knight'
    ) => {
      setState(prev => ({ ...prev, isConnecting: true, error: null }));
      try {
        const httpUrl = getServerHttpUrl();
        const targetUrl = new URL('/api/rooms/verify', httpUrl).toString();
        const verifyRes = await fetch(targetUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ inviteCode, playerName, warriorPreset }),
        });

        if (!verifyRes.ok) {
          const errData = await verifyRes.json().catch(() => ({}));
          const fallbackMsg =
            verifyRes.status === 404
              ? 'Room not found or invite code expired'
              : `Unable to verify chamber (HTTP ${verifyRes.status})`;
          throw new Error(errData.error || fallbackMsg);
        }

        const { roomId } = await verifyRes.json();
        const client = getClient();
        const room = await client.joinById<BattleRoomState>(roomId, {
          playerName,
          warriorPreset,
        });

        roomRef.current = room;
        setupRoomListeners(room);

        setState({
          isConnected: true,
          isConnecting: false,
          roomId: room.id,
          inviteCode: inviteCode.toUpperCase(),
          error: null,
          roomState: room.state,
          latencyMs: 0,
          room,
        });

        return { roomId: room.id };
      } catch (err: unknown) {
        let message = 'Unable to join room. Verify the code and server status.';
        if (err instanceof Error) {
          if (
            err.message.includes('Failed to fetch') ||
            err.message.includes('NetworkError') ||
            err.message.includes('Failed to load') ||
            err.message.includes('ECONNREFUSED')
          ) {
            message =
              'Cannot reach game server. Make sure the server is running on port 2567 (npm run dev).';
          } else {
            message = err.message;
          }
        }
        setState(prev => ({
          ...prev,
          isConnecting: false,
          error: message,
          room: null,
        }));
        return null;
      }
    },
    [getClient, setupRoomListeners]
  );

  const requestBotOpponent = useCallback(() => {
    if (roomRef.current) {
      roomRef.current.send(ClientMessageType.REQUEST_BOT_OPPONENT, {});
    }
  }, []);

  const toggleReady = useCallback(() => {
    if (roomRef.current) {
      roomRef.current.send(ClientMessageType.READY, {});
    }
  }, []);

  const forfeitMatch = useCallback(() => {
    if (roomRef.current) {
      roomRef.current.send(ClientMessageType.FORFEIT_MATCH, {});
    }
  }, []);

  const leaveRoom = useCallback(() => {
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
    if (roomRef.current) {
      roomRef.current.leave();
      roomRef.current = null;
    }
    setState(prev => ({
      ...prev,
      isConnected: false,
      roomId: null,
      inviteCode: null,
      roomState: null,
      latencyMs: 0,
      room: null,
      queueStatus: null,
      opponentNotice: null,
    }));
  }, []);

  useEffect(() => {
    return () => {
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = null;
      }
      if (roomRef.current) {
        roomRef.current.leave();
        roomRef.current = null;
      }
    };
  }, []);

  const findQuickMatch = useCallback(
    async (playerName: string = 'Crown Challenger', warriorPreset: string = 'knight') => {
      setState(prev => ({
        ...prev,
        isConnecting: true,
        error: null,
        queueStatus: null,
        opponentNotice: null,
      }));
      try {
        const client = getClient();
        const room = await client.joinOrCreate<BattleRoomState>('battle', {
          isPrivate: false,
          playerName,
          warriorPreset,
        });

        roomRef.current = room;
        setupRoomListeners(room);

        setState({
          isConnected: true,
          isConnecting: false,
          roomId: room.id,
          inviteCode: null,
          error: null,
          roomState: room.state,
          latencyMs: 0,
          room,
          queueStatus: null,
          opponentNotice: null,
        });

        return { roomId: room.id };
      } catch (err: unknown) {
        let message = 'Unable to find an open match.';
        if (err instanceof Error) {
          message = err.message;
        }
        setState(prev => ({
          ...prev,
          isConnecting: false,
          error: message,
          room: null,
        }));
        return null;
      }
    },
    [getClient, setupRoomListeners]
  );

  return {
    ...state,
    createPrivateRoom,
    joinPrivateRoom,
    findQuickMatch,
    leaveRoom,
    requestBotOpponent,
    forfeitMatch,
    toggleReady,
  };
}
