import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { BattleRoom } from '../../src/rooms/BattleRoom.js';
import { RoomRegistry } from '../../src/matchmaking/RoomRegistry.js';
import { SIMULATION_DELTA_MS } from '@last-crown/shared';
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
});
