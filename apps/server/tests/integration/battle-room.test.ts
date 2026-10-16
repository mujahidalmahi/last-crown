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
    room.onCreate({ isPrivate: false });
  });

  afterEach(() => {
    room.onDispose();
  });

  it('initializes room state and registers invite code for private rooms', () => {
    const privRoom = new BattleRoom();
    privRoom.roomId = 'test-priv-room';
    privRoom.onCreate({ isPrivate: true });
    expect(privRoom.state.matchState).toBe('waiting');
    expect(privRoom.state.inviteCode).toHaveLength(6);
    expect(RoomRegistry.getInstance().getRoomByCode(privRoom.state.inviteCode)?.roomId).toBe(
      'test-priv-room'
    );
    privRoom.onDispose();
  });

  it('does not start match automatically in private custom rooms until both players approve ready', () => {
    const privRoom = new BattleRoom();
    privRoom.roomId = 'priv-duel-1';
    privRoom.onCreate({ isPrivate: true });

    const c1 = createMockClient('p1');
    const c2 = createMockClient('p2');

    privRoom.clients = [c1];
    privRoom.onJoin(c1, { playerName: 'Player 1' });
    expect(privRoom.state.matchState).toBe('waiting');
    expect(privRoom.state.warriors.get('p1')?.isReady).toBe(false);

    privRoom.clients = [c1, c2];
    privRoom.onJoin(c2, { playerName: 'Player 2' });
    // In private custom room, joining does NOT start the match automatically
    expect(privRoom.state.matchState).toBe('waiting');
    expect(privRoom.state.warriors.get('p2')?.isReady).toBe(false);

    const onMessageHandlers = (
      privRoom as unknown as {
        onMessageHandlers: Record<string, (client: Client, message: unknown) => void>;
      }
    ).onMessageHandlers;
    const readyHandler = onMessageHandlers[ClientMessageType.READY];
    expect(readyHandler).toBeDefined();

    // Player 1 toggles ready
    readyHandler(c1, {});
    expect(privRoom.state.warriors.get('p1')?.isReady).toBe(true);
    // Still waiting because player 2 has not approved
    expect(privRoom.state.matchState).toBe('waiting');

    // Player 1 toggles ready again to cancel
    readyHandler(c1, {});
    expect(privRoom.state.warriors.get('p1')?.isReady).toBe(false);
    expect(privRoom.state.matchState).toBe('waiting');

    // Player 1 readies up
    readyHandler(c1, {});
    expect(privRoom.state.warriors.get('p1')?.isReady).toBe(true);
    expect(privRoom.state.matchState).toBe('waiting');

    // Player 2 readies up -> Both are now ready! Match starts!
    readyHandler(c2, {});
    expect(privRoom.state.warriors.get('p2')?.isReady).toBe(true);
    expect(privRoom.state.matchState).toBe('in_progress');
    expect(privRoom.state.roundNumber).toBe(1);

    privRoom.onDispose();
  });

  it('resets ready approval when a player leaves the private chamber lobby', async () => {
    const privRoom = new BattleRoom();
    privRoom.roomId = 'priv-duel-2';
    privRoom.onCreate({ isPrivate: true });

    const c1 = createMockClient('p1');
    const c2 = createMockClient('p2');

    privRoom.clients = [c1, c2];
    privRoom.onJoin(c1, { playerName: 'Host' });
    privRoom.onJoin(c2, { playerName: 'Guest' });

    const onMessageHandlers = (
      privRoom as unknown as {
        onMessageHandlers: Record<string, (client: Client, message: unknown) => void>;
      }
    ).onMessageHandlers;
    const readyHandler = onMessageHandlers[ClientMessageType.READY];

    readyHandler(c1, {});
    expect(privRoom.state.warriors.get('p1')?.isReady).toBe(true);

    // Guest leaves during lobby wait
    privRoom.clients = [c1];
    await privRoom.onLeave(c2, true);

    // Host ready status must be reset to require fresh approval with any new challenger
    expect(privRoom.state.warriors.get('p1')?.isReady).toBe(false);
    expect(privRoom.state.matchState).toBe('waiting');

    privRoom.onDispose();
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

  it('routes VOICE_SIGNAL strictly to the opponent in the room without broadcasting to self', () => {
    const sent1: Array<{ type: string | number; data: unknown }> = [];
    const sent2: Array<{ type: string | number; data: unknown }> = [];

    const dummyClient1 = {
      sessionId: 'p1-session',
      send: (type: string | number, data: unknown) => sent1.push({ type, data }),
      enqueueRaw: () => {},
      raw: () => {},
      readyState: 1,
    } as unknown as Client;

    const dummyClient2 = {
      sessionId: 'p2-session',
      send: (type: string | number, data: unknown) => sent2.push({ type, data }),
      enqueueRaw: () => {},
      raw: () => {},
      readyState: 1,
    } as unknown as Client;

    room.clients = [dummyClient1, dummyClient2];
    room.onJoin(dummyClient1, { playerName: 'Player 1' });
    room.onJoin(dummyClient2, { playerName: 'Player 2' });

    const onMessageHandlers = (
      room as unknown as {
        onMessageHandlers: Record<string, (client: Client, message: unknown) => void>;
      }
    ).onMessageHandlers;
    const voiceHandler = onMessageHandlers[ClientMessageType.VOICE_SIGNAL];
    expect(voiceHandler).toBeDefined();

    // Client 1 sends an offer
    voiceHandler(dummyClient1, {
      signal: { type: 'offer', data: { sdp: 'fake-offer-sdp' } },
    });

    // Client 1 (sender) should NOT receive it
    expect(sent1.filter(msg => msg.type === ServerMessageType.VOICE_SIGNAL)).toHaveLength(0);

    // Client 2 (opponent) MUST receive it with from = 'p1-session'
    const receivedBy2 = sent2.filter(msg => msg.type === ServerMessageType.VOICE_SIGNAL);
    expect(receivedBy2).toHaveLength(1);
    expect(receivedBy2[0]!.data).toEqual({
      from: 'p1-session',
      signal: { type: 'offer', data: { sdp: 'fake-offer-sdp' } },
    });

    // Client 2 replies with answer
    voiceHandler(dummyClient2, {
      signal: { type: 'answer', data: { sdp: 'fake-answer-sdp' } },
    });

    // Client 1 receives answer from p2-session
    const receivedBy1 = sent1.filter(msg => msg.type === ServerMessageType.VOICE_SIGNAL);
    expect(receivedBy1).toHaveLength(1);
    expect(receivedBy1[0]!.data).toEqual({
      from: 'p2-session',
      signal: { type: 'answer', data: { sdp: 'fake-answer-sdp' } },
    });
  });

  it('isolates VOICE_SIGNAL between simultaneous separate game matches', () => {
    // Room A (Game 1)
    const roomA = new BattleRoom();
    roomA.roomId = 'match-A';
    roomA.onCreate({ isPrivate: true });

    // Room B (Game 2 running simultaneously)
    const roomB = new BattleRoom();
    roomB.roomId = 'match-B';
    roomB.onCreate({ isPrivate: true });

    const roomASentP2: Array<{ type: string | number; data: unknown }> = [];
    const roomBSentP1: Array<{ type: string | number; data: unknown }> = [];
    const roomBSentP2: Array<{ type: string | number; data: unknown }> = [];

    const clientA1 = createMockClient('A1');
    const clientA2 = {
      ...createMockClient('A2'),
      send: (type: string | number, data: unknown) => roomASentP2.push({ type, data }),
    } as unknown as Client;

    const clientB1 = {
      ...createMockClient('B1'),
      send: (type: string | number, data: unknown) => roomBSentP1.push({ type, data }),
    } as unknown as Client;
    const clientB2 = {
      ...createMockClient('B2'),
      send: (type: string | number, data: unknown) => roomBSentP2.push({ type, data }),
    } as unknown as Client;

    roomA.clients = [clientA1, clientA2];
    roomA.onJoin(clientA1, { playerName: 'A1' });
    roomA.onJoin(clientA2, { playerName: 'A2' });

    roomB.clients = [clientB1, clientB2];
    roomB.onJoin(clientB1, { playerName: 'B1' });
    roomB.onJoin(clientB2, { playerName: 'B2' });

    const voiceHandlerA = (
      roomA as unknown as {
        onMessageHandlers: Record<string, (client: Client, message: unknown) => void>;
      }
    ).onMessageHandlers[ClientMessageType.VOICE_SIGNAL];

    // Client A1 in Match A speaks/signals
    voiceHandlerA(clientA1, {
      signal: { type: 'offer', data: { match: 'A' } },
    });

    // Room A opponent receives the signal
    expect(roomASentP2).toHaveLength(1);

    // CRITICAL: Room B players (different game) receive NOTHING!
    expect(roomBSentP1).toHaveLength(0);
    roomA.onDispose();
    roomB.onDispose();
  });

  it('announces voice presence of an existing player to a newly joining opponent', () => {
    const sent2: Array<{ type: string | number; data: unknown }> = [];

    const dummyClient1 = createMockClient('p1-session');
    const dummyClient2 = {
      ...createMockClient('p2-session'),
      send: (type: string | number, data: unknown) => sent2.push({ type, data }),
    } as unknown as Client;

    room.clients = [dummyClient1];
    room.onJoin(dummyClient1, { playerName: 'Player 1' });

    const onMessageHandlers = (
      room as unknown as {
        onMessageHandlers: Record<string, (client: Client, message: unknown) => void>;
      }
    ).onMessageHandlers;
    const voiceHandler = onMessageHandlers[ClientMessageType.VOICE_SIGNAL];

    // Player 1 enables voice while waiting in lobby
    voiceHandler(dummyClient1, {
      signal: { type: 'ready' },
    });

    // Player 2 joins the room afterwards
    room.clients = [dummyClient1, dummyClient2];
    room.onJoin(dummyClient2, { playerName: 'Player 2' });

    // Player 2 should be immediately notified that Player 1 is ready in voice!
    const voicePresenceMsgs = sent2.filter(msg => msg.type === ServerMessageType.VOICE_SIGNAL);
    expect(voicePresenceMsgs).toHaveLength(1);
    expect(voicePresenceMsgs[0]!.data).toEqual({
      from: 'p1-session',
      signal: { type: 'ready' },
    });
  });

  it('handles quickmatch queue and allows instant spawning of authoritative bot opponent', () => {
    const qRoom = new BattleRoom();
    qRoom.roomId = 'quickmatch-room';
    qRoom.onCreate({ isPrivate: false });

    const sent: Array<{ type: string | number; data: unknown }> = [];
    const client1 = {
      ...createMockClient('solo-player'),
      send: (type: string | number, data: unknown) => sent.push({ type, data }),
    } as unknown as Client;

    qRoom.clients = [client1];
    qRoom.onJoin(client1, { playerName: 'Solo Challenger', warriorPreset: 'knight' });

    expect(qRoom.state.matchState).toBe('waiting');
    expect(qRoom.state.isBotMatch).toBe(false);

    // Trigger REQUEST_BOT_OPPONENT message handler
    const onMessageHandlers = (
      qRoom as unknown as {
        onMessageHandlers: Record<string, (client: Client, message: unknown) => void>;
      }
    ).onMessageHandlers;
    const botRequestHandler = onMessageHandlers[ClientMessageType.REQUEST_BOT_OPPONENT];
    expect(botRequestHandler).toBeDefined();

    botRequestHandler(client1, {});

    // State should immediately become in_progress against bot gladiator!
    expect(qRoom.state.matchState).toBe('in_progress');
    expect(qRoom.state.isBotMatch).toBe(true);
    expect(qRoom.state.warriors.size).toBe(2);

    const botWarrior = qRoom.state.warriors.get('bot_champion');
    expect(botWarrior).toBeDefined();
    expect(botWarrior?.isBot).toBe(true);

    // Step simulation and verify bot moves and generates authoritative inputs
    const internals = qRoom as unknown as BattleRoomInternals;
    for (let i = 0; i < 20; i++) {
      internals.updateSimulation(SIMULATION_DELTA_MS);
    }

    expect(botWarrior!.x).toBeGreaterThan(0);
    qRoom.onDispose();
  });

  it('handles explicit in-game match forfeit via FORFEIT_MATCH message', () => {
    const dummyClient1 = createMockClient('session-1');
    const dummyClient2 = createMockClient('session-2');

    room.clients = [dummyClient1, dummyClient2];
    room.onJoin(dummyClient1, { playerName: 'Player 1' });
    room.onJoin(dummyClient2, { playerName: 'Player 2' });

    expect(room.state.matchState).toBe('in_progress');

    const onMessageHandlers = (
      room as unknown as {
        onMessageHandlers: Record<string, (client: Client, message: unknown) => void>;
      }
    ).onMessageHandlers;
    const forfeitHandler = onMessageHandlers[ClientMessageType.FORFEIT_MATCH];
    expect(forfeitHandler).toBeDefined();

    // Player 2 surrenders
    forfeitHandler(dummyClient2, {});

    expect(room.state.matchState).toBe('match_over');
    expect(room.state.winnerId).toBe('session-1');
    expect(room.state.endReason).toBe('opponent_forfeit');
  });

  it('handles unintentional mid-match disconnect with grace countdown and forfeit on timeout', async () => {
    const dummyClient1 = createMockClient('session-1');
    const dummyClient2 = createMockClient('session-2');

    room.clients = [dummyClient1, dummyClient2];
    room.onJoin(dummyClient1, { playerName: 'Player 1' });
    room.onJoin(dummyClient2, { playerName: 'Player 2' });

    // Mock allowReconnection that rejects (simulating reconnection failure/timeout)
    room.allowReconnection = () => Promise.reject(new Error('Reconnection timeout'));

    // Player 2 drops connection (consented = false)
    await room.onLeave(dummyClient2, false);

    expect(room.state.matchState).toBe('match_over');
    expect(room.state.winnerId).toBe('session-1');
    expect(room.state.endReason).toBe('opponent_disconnect_timeout');
  });

  it('handles immediate rematch against authoritative AI gladiator without waiting', () => {
    const qRoom = new BattleRoom();
    qRoom.roomId = 'bot-rematch-room';
    qRoom.onCreate({ isPrivate: false });

    const client1 = createMockClient('solo-player');
    qRoom.clients = [client1];
    qRoom.onJoin(client1, { playerName: 'Solo Challenger' });
    qRoom.spawnBotOpponent();

    expect(qRoom.state.matchState).toBe('in_progress');

    // End match
    qRoom.state.matchState = 'match_over';
    qRoom.state.winnerId = 'solo-player';

    const onMessageHandlers = (
      qRoom as unknown as {
        onMessageHandlers: Record<string, (client: Client, message: unknown) => void>;
      }
    ).onMessageHandlers;
    const readyHandler = onMessageHandlers[ClientMessageType.READY];

    // Player signals ready for rematch against bot
    readyHandler(client1, {});

    expect(qRoom.state.matchState).toBe('in_progress');
    expect(qRoom.state.winnerId).toBe('');
    expect(qRoom.state.endReason).toBe('normal');
    qRoom.onDispose();
  });
});
