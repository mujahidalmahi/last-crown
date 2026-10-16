import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { BattleRoom } from '../../src/rooms/BattleRoom.js';
import { RoomRegistry } from '../../src/matchmaking/RoomRegistry.js';
import { SIMULATION_DELTA_MS, ClientMessageType } from '@last-crown/shared';
import { getArenaConfig } from '@last-crown/game-config';
import { Client } from 'colyseus';

describe('Multi-Match Concurrency and Fault Isolation', () => {
  interface BattleRoomInternals {
    simulation: {
      p1: { health: number; movement: { position: { x: number } } };
      p2: { health: number; movement: { position: { x: number } } };
      step: (p1Input: unknown, p2Input: unknown, dt: number) => void;
    };
    updateSimulation: (dt: number) => void;
    onMessageHandlers: Record<string, (client: Client, message: unknown) => void>;
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
  });

  it('runs multiple concurrent matches simultaneously with complete state and input isolation', () => {
    // 1. Initialize Room 1 (Private Duel)
    const room1 = new BattleRoom();
    room1.roomId = 'match-alpha';
    room1.onCreate({ isPrivate: true });

    // 2. Initialize Room 2 (Private Duel)
    const room2 = new BattleRoom();
    room2.roomId = 'match-beta';
    room2.onCreate({ isPrivate: true });

    // 3. Initialize Room 3 (Public Quick Match)
    const room3 = new BattleRoom();
    room3.roomId = 'match-gamma';
    room3.onCreate({ isPrivate: false });

    // Verify registration and invite codes
    expect(room1.state.inviteCode).toBeDefined();
    expect(room2.state.inviteCode).toBeDefined();
    expect(room3.state.inviteCode).toBe(''); // Public room has no invite code
    expect(room1.state.inviteCode).not.toBe(room2.state.inviteCode);

    // Join players into Room 1
    const r1p1 = createMockClient('r1-p1');
    const r1p2 = createMockClient('r1-p2');
    room1.clients = [r1p1];
    room1.onJoin(r1p1, { playerName: 'Alice' });
    room1.clients = [r1p1, r1p2];
    room1.onJoin(r1p2, { playerName: 'Bob' });
    expect(room1.state.matchState).toBe('in_progress');

    // Join players into Room 2
    const r2p1 = createMockClient('r2-p1');
    const r2p2 = createMockClient('r2-p2');
    room2.clients = [r2p1];
    room2.onJoin(r2p1, { playerName: 'Charlie' });
    room2.clients = [r2p1, r2p2];
    room2.onJoin(r2p2, { playerName: 'Dave' });
    expect(room2.state.matchState).toBe('in_progress');

    // Join players into Room 3
    const r3p1 = createMockClient('r3-p1');
    const r3p2 = createMockClient('r3-p2');
    room3.clients = [r3p1];
    room3.onJoin(r3p1, { playerName: 'Eve' });
    room3.clients = [r3p1, r3p2];
    room3.onJoin(r3p2, { playerName: 'Frank' });
    expect(room3.state.matchState).toBe('in_progress');

    const arena = getArenaConfig(room1.state.arenaId);
    const r1_internal = room1 as unknown as BattleRoomInternals;
    const r2_internal = room2 as unknown as BattleRoomInternals;
    const r3_internal = room3 as unknown as BattleRoomInternals;

    // Send movement input ONLY to Player 1 in Room 1
    const p1InputHandler = r1_internal.onMessageHandlers[ClientMessageType.PLAYER_INPUT];
    p1InputHandler(r1p1, {
      sequence: 1n,
      timestamp: Date.now(),
      moveX: 1n, // Move right
      jump: false,
      attack: false,
      block: false,
      parry: false,
    });

    // Step simulation across all 3 rooms
    for (let i = 0; i < 20; i++) {
      r1_internal.updateSimulation(SIMULATION_DELTA_MS);
      r2_internal.updateSimulation(SIMULATION_DELTA_MS);
      r3_internal.updateSimulation(SIMULATION_DELTA_MS);
    }

    // Room 1 Player 1 must have moved right
    const r1p1Pos = room1.state.warriors.get('r1-p1')?.x ?? 0;
    expect(r1p1Pos).toBeGreaterThan(arena.spawnPointP1.x);

    // Room 2 and Room 3 warriors must be completely untouched and remain at initial spawn points
    expect(room2.state.warriors.get('r2-p1')?.x).toBe(arena.spawnPointP1.x);
    expect(room2.state.warriors.get('r2-p2')?.x).toBe(arena.spawnPointP2.x);
    expect(room3.state.warriors.get('r3-p1')?.x).toBe(arena.spawnPointP1.x);
    expect(room3.state.warriors.get('r3-p2')?.x).toBe(arena.spawnPointP2.x);

    // Inflict lethal damage ONLY in Room 2
    r2_internal.simulation.p2.health = 0;
    r2_internal.updateSimulation(SIMULATION_DELTA_MS);

    // Room 2 must transition to round_over
    expect(room2.state.matchState).toBe('round_over');

    // Room 1 and Room 3 must remain strictly in_progress without interruption
    expect(room1.state.matchState).toBe('in_progress');
    expect(room3.state.matchState).toBe('in_progress');

    // Clean up all rooms
    room1.onDispose();
    room2.onDispose();
    room3.onDispose();
  });

  it('isolates simulation exceptions so a failure in one room cannot disrupt others', () => {
    const healthyRoom = new BattleRoom();
    healthyRoom.roomId = 'healthy-room';
    healthyRoom.onCreate({ isPrivate: true });

    const failingRoom = new BattleRoom();
    failingRoom.roomId = 'failing-room';
    failingRoom.onCreate({ isPrivate: true });

    const c1 = createMockClient('c1');
    const c2 = createMockClient('c2');
    healthyRoom.clients = [c1];
    healthyRoom.onJoin(c1, { playerName: 'P1' });
    healthyRoom.clients = [c1, c2];
    healthyRoom.onJoin(c2, { playerName: 'P2' });

    const f1 = createMockClient('f1');
    const f2 = createMockClient('f2');
    failingRoom.clients = [f1];
    failingRoom.onJoin(f1, { playerName: 'FP1' });
    failingRoom.clients = [f1, f2];
    failingRoom.onJoin(f2, { playerName: 'FP2' });

    const healthyInternal = healthyRoom as unknown as BattleRoomInternals;
    const failingInternal = failingRoom as unknown as BattleRoomInternals;

    // Simulate an unexpected runtime exception in failing room's simulation
    failingInternal.simulation.step = () => {
      throw new Error('Simulated physics crash');
    };

    // Both rooms tick
    expect(() => {
      failingInternal.updateSimulation(SIMULATION_DELTA_MS);
      healthyInternal.updateSimulation(SIMULATION_DELTA_MS);
    }).not.toThrow();

    // Healthy room continues advancing normally
    expect(healthyRoom.state.matchState).toBe('in_progress');

    healthyRoom.onDispose();
    failingRoom.onDispose();
  });
});
