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
});
