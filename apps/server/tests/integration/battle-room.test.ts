import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { BattleRoom } from '../../src/rooms/BattleRoom.js';
import { RoomRegistry } from '../../src/matchmaking/RoomRegistry.js';
import { SIMULATION_DELTA_MS, ClientMessageType, ServerMessageType } from '@last-crown/shared';
import { getArenaConfig } from '@last-crown/game-config';
import { Client } from 'colyseus';

describe('BattleRoom Lifecycle and Simulation', () => {
  let room: BattleRoom;

  interface BattleRoomInternals {
    simulation: { p2: { health: number } };
    updateSimulation: (dt: number) => void;
  }

  const createMockClient = (sessionId: string): Client =>
    ({
      sessionId,
      send: () => {},
      enqueueRaw: () => {},
      raw: () => {},
      readyState: 1,
    }) as unknown as Client;

  beforeEach(() => {
    RoomRegistry.getInstance().clear();
    room = new BattleRoom();
    room.roomId = 'test-room-1';
    room.onCreate({ isPrivate: true });
  });

  afterEach(() => {
    room.onDispose();
  });

  it('initializes room state and registers invite code', () => {
    expect(room.state.matchState).toBe('waiting');
    expect(room.state.inviteCode).toHaveLength(6);
    expect(RoomRegistry.getInstance().getRoomByCode(room.state.inviteCode)?.roomId).toBe(
      'test-room-1'
    );
  });

  it('initializes authoritative simulation when 2 players join and steps through round transitions', () => {
    const dummyClient1 = createMockClient('session-1');
    const dummyClient2 = createMockClient('session-2');

    room.clients = [dummyClient1];
    room.onJoin(dummyClient1, { playerName: 'Player 1', warriorPreset: 'knight' });
    expect(room.state.matchState).toBe('waiting');
    expect(room.state.warriors.size).toBe(1);

    room.clients = [dummyClient1, dummyClient2];
    room.onJoin(dummyClient2, { playerName: 'Player 2', warriorPreset: 'duelist' });
    expect(room.state.matchState).toBe('in_progress');
    expect(room.state.warriors.size).toBe(2);
    expect(room.state.roundNumber).toBe(1);

    const internals = room as unknown as BattleRoomInternals;

    // Inflict lethal damage on player 2 to trigger round over
    internals.simulation.p2.health = 0;

    // Tick simulation to process lethal damage and enter round_over
    internals.updateSimulation(SIMULATION_DELTA_MS);
    expect(room.state.matchState).toBe('round_over');

    // CRITICAL VERIFICATION: Simulation must continue stepping during round_over
    // until the 2500ms transition timer expires and round 2 starts!
    for (let i = 0; i < 35; i++) {
      internals.updateSimulation(100);
    }

    expect(room.state.matchState).toBe('in_progress');
    expect(room.state.roundNumber).toBe(2);
    expect(room.state.warriors.get('session-1')?.roundsWon).toBe(1);
    expect(room.state.warriors.get('session-2')?.roundsWon).toBe(0);
  });

  it('handles intentional client departure and awards win to remaining opponent', async () => {
    const dummyClient1 = createMockClient('session-1');
    const dummyClient2 = createMockClient('session-2');

    room.clients = [dummyClient1];
    room.onJoin(dummyClient1, { playerName: 'Player 1' });

    room.clients = [dummyClient1, dummyClient2];
    room.onJoin(dummyClient2, { playerName: 'Player 2' });

    // Player 2 leaves with consented = true
    await room.onLeave(dummyClient2, true);

    expect(room.state.matchState).toBe('match_over');
    expect(room.state.winnerId).toBe('session-1');
  });

  it('initializes warrior spawn coordinates and facing on join from arena configuration', () => {
    const dummyClient1 = createMockClient('session-1');
    const dummyClient2 = createMockClient('session-2');
    const arena = getArenaConfig(room.state.arenaId);

    room.clients = [dummyClient1];
    room.onJoin(dummyClient1, { playerName: 'Player 1' });
    const w1 = room.state.warriors.get('session-1');
    expect(w1?.x).toBe(arena.spawnPointP1.x);
    expect(w1?.y).toBe(arena.spawnPointP1.y);
    expect(w1?.facing).toBe('right');

    room.clients = [dummyClient1, dummyClient2];
    room.onJoin(dummyClient2, { playerName: 'Player 2' });
    const w2 = room.state.warriors.get('session-2');
    expect(w2?.x).toBe(arena.spawnPointP2.x);
    expect(w2?.y).toBe(arena.spawnPointP2.y);
    expect(w2?.facing).toBe('left');
  });

  it('processes player movement input containing BigInt timestamp and updates simulation', () => {
    const sent1: Array<{ type: string | number; data: unknown }> = [];
    const dummyClient1 = {
      sessionId: 'session-1',
      send: (type: string | number, data: unknown) => sent1.push({ type, data }),
      enqueueRaw: () => {},
      raw: () => {},
      readyState: 1,
    } as unknown as Client;

    const dummyClient2 = createMockClient('session-2');

    room.clients = [dummyClient1];
    room.onJoin(dummyClient1, { playerName: 'Player 1' });
    room.clients = [dummyClient1, dummyClient2];
    room.onJoin(dummyClient2, { playerName: 'Player 2' });

    const initialX = room.state.warriors.get('session-1')!.x;

    // Send input with BigInt timestamp as received from Colyseus msgpack
    const rawInput = {
      sequence: 1n,
      timestamp: 1792123896033n,
      moveX: 1n,
      jump: false,
      attack: false,
      block: false,
      parry: false,
    };

    // Trigger registered PLAYER_INPUT handler
    const onMessageHandlers = (
      room as unknown as {
        onMessageHandlers: Record<string, (client: Client, message: unknown) => void>;
      }
    ).onMessageHandlers;
    const inputHandler = onMessageHandlers[ClientMessageType.PLAYER_INPUT];
    expect(inputHandler).toBeDefined();

    inputHandler(dummyClient1, rawInput);

    // Ensure no MALFORMED_INPUT error was sent
    expect(
      sent1.filter(msg => (msg.data as { code?: string })?.code === 'MALFORMED_INPUT')
    ).toHaveLength(0);

    // Step simulation
    const internals = room as unknown as BattleRoomInternals;
    for (let i = 0; i < 15; i++) {
      internals.updateSimulation(SIMULATION_DELTA_MS);
    }

    const updatedX = room.state.warriors.get('session-1')!.x;
    expect(updatedX).toBeGreaterThan(initialX);
  });

  it('coerces BigInt timestamp in PING message handler', () => {
    const sent: Array<{ type: string | number; data: unknown }> = [];
    const dummyClient = {
      sessionId: 'session-1',
      send: (type: string | number, data: unknown) => sent.push({ type, data }),
      enqueueRaw: () => {},
      raw: () => {},
      readyState: 1,
    } as unknown as Client;

    const onMessageHandlers = (
      room as unknown as {
        onMessageHandlers: Record<string, (client: Client, message: unknown) => void>;
      }
    ).onMessageHandlers;
    const pingHandler = onMessageHandlers[ClientMessageType.PING];
    expect(pingHandler).toBeDefined();

    const bigIntTimestamp = 1792123896033n;
    pingHandler(dummyClient, { timestamp: bigIntTimestamp });

    expect(sent).toHaveLength(1);
    expect(sent[0]!.type).toBe(ServerMessageType.PONG);
    const pongData = sent[0]!.data as { clientTimestamp: unknown; serverTimestamp: unknown };
    expect(typeof pongData.clientTimestamp).toBe('number');
    expect(pongData.clientTimestamp).toBe(1792123896033);
  });
});
