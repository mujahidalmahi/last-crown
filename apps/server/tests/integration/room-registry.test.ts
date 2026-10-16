import { describe, it, expect, beforeEach } from 'vitest';
import { RoomRegistry } from '../../src/matchmaking/RoomRegistry.js';

describe('RoomRegistry', () => {
  let registry: RoomRegistry;

  beforeEach(() => {
    registry = RoomRegistry.getInstance();
    registry.clear();
  });

  it('registers a room and assigns an invite code', () => {
    const code = registry.registerRoom('room-123');
    expect(code).toBeDefined();
    expect(code.length).toBe(6);

    const match = registry.getRoomByCode(code);
    expect(match).toBeDefined();
    expect(match?.roomId).toBe('room-123');
    expect(match?.playerCount).toBe(1);
  });

  it('resolves invite codes case-insensitively', () => {
    const code = registry.registerRoom('room-abc');
    expect(registry.getRoomByCode(code.toLowerCase())?.roomId).toBe('room-abc');
    expect(registry.getRoomByCode(code.toUpperCase())?.roomId).toBe('room-abc');
  });

  it('updates player counts and unregisters rooms accurately', () => {
    const code = registry.registerRoom('room-xyz');
    registry.updatePlayerCount('room-xyz', 2);
    expect(registry.getRoomByCode(code)?.playerCount).toBe(2);

    registry.unregisterRoom('room-xyz');
    expect(registry.getRoomByCode(code)).toBeUndefined();
  });

  it('accurately calculates active room and total player counts across multiple matches', () => {
    registry.registerRoom('room-1');
    registry.registerRoom('room-2');
    registry.registerRoom('room-3');

    registry.updatePlayerCount('room-1', 2);
    registry.updatePlayerCount('room-2', 2);
    registry.updatePlayerCount('room-3', 1);

    expect(registry.getActiveRoomCount()).toBe(3);
    expect(registry.getTotalPlayerCount()).toBe(5);

    registry.unregisterRoom('room-2');
    expect(registry.getActiveRoomCount()).toBe(2);
    expect(registry.getTotalPlayerCount()).toBe(3);
  });

  it('prunes stale rooms older than threshold', () => {
    registry.registerRoom('fresh-room');
    const staleCode = registry.registerRoom('stale-room');

    const reg = registry.getRoomByCode(staleCode);
    if (reg) {
      reg.createdAt = Date.now() - 7200000; // 2 hours ago
    }

    const pruned = registry.pruneStaleRooms(3600000); // 1 hour threshold
    expect(pruned).toBe(1);
    expect(registry.getRoomByCode(staleCode)).toBeUndefined();
    expect(registry.getActiveRoomCount()).toBe(1);
  });
});
