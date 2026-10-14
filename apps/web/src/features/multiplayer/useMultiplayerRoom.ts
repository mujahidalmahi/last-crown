'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Client, Room } from 'colyseus.js';
import { BattleRoomState } from '@last-crown/shared';

export interface MultiplayerState {
  isConnected: boolean;
  isConnecting: boolean;
  roomId: string | null;
  inviteCode: string | null;
  error: string | null;
  roomState: BattleRoomState | null;
  latencyMs: number;
  room: Room<BattleRoomState> | null;
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
  });

  const clientRef = useRef<Client | null>(null);
  const roomRef = useRef<Room<BattleRoomState> | null>(null);

  const getClient = useCallback((): Client => {
    if (!clientRef.current) {
      const serverWsUrl = process.env.NEXT_PUBLIC_SERVER_WS_URL || 'ws://localhost:2567';
      clientRef.current = new Client(serverWsUrl);
    }
    return clientRef.current;
  }, []);

  const getServerHttpUrl = (): string => {
    return process.env.NEXT_PUBLIC_SERVER_HTTP_URL || 'http://localhost:2567';
  };

  const createPrivateRoom = useCallback(
    async (playerName: string = 'Host Warrior', warriorPreset: string = 'knight') => {
      setState(prev => ({ ...prev, isConnecting: true, error: null }));
      try {
        const httpUrl = getServerHttpUrl();
        const res = await fetch(`${httpUrl}/api/rooms/create`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isPrivate: true, playerName, warriorPreset }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'Failed to create private room');
        }

        const data = await res.json();
        const client = getClient();
        const room = await client.joinById<BattleRoomState>(data.roomId, {
          playerName,
          warriorPreset,
        });

        roomRef.current = room;

        room.onStateChange(newState => {
          setState(prev => ({ ...prev, roomState: newState }));
        });

        room.onError((code, message) => {
          setState(prev => ({ ...prev, error: `Room error [${code}]: ${message}` }));
        });

        room.onLeave(() => {
          setState(prev => ({ ...prev, isConnected: false, roomId: null, room: null }));
        });

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
        const message =
          err instanceof Error ? err.message : 'Multiplayer server is currently unavailable.';
        setState(prev => ({
          ...prev,
          isConnecting: false,
          error: message,
          room: null,
        }));
        return null;
      }
    },
    [getClient]
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
        const verifyRes = await fetch(`${httpUrl}/api/rooms/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ inviteCode, playerName, warriorPreset }),
        });

        if (!verifyRes.ok) {
          const errData = await verifyRes.json().catch(() => ({}));
          throw new Error(errData.error || 'Invalid or expired invite code');
        }

        const { roomId } = await verifyRes.json();
        const client = getClient();
        const room = await client.joinById<BattleRoomState>(roomId, {
          playerName,
          warriorPreset,
        });

        roomRef.current = room;

        room.onStateChange(newState => {
          setState(prev => ({ ...prev, roomState: newState }));
        });

        room.onError((code, message) => {
          setState(prev => ({ ...prev, error: `Room error [${code}]: ${message}` }));
        });

        room.onLeave(() => {
          setState(prev => ({ ...prev, isConnected: false, roomId: null, room: null }));
        });

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
        const message =
          err instanceof Error
            ? err.message
            : 'Unable to join room. Verify the code and server status.';
        setState(prev => ({
          ...prev,
          isConnecting: false,
          error: message,
          room: null,
        }));
        return null;
      }
    },
    [getClient]
  );

  const leaveRoom = useCallback(() => {
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
      room: null,
    }));
  }, []);

  useEffect(() => {
    return () => {
      if (roomRef.current) {
        roomRef.current.leave();
        roomRef.current = null;
      }
    };
  }, []);

  return {
    ...state,
    createPrivateRoom,
    joinPrivateRoom,
    leaveRoom,
  };
}
