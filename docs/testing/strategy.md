# Testing Strategy

## Test Layers

LAST CROWN employs a multi-tiered testing strategy:

1. **Unit Testing (Vitest)**:
   - State machine transitions (`WarriorStateMachine`).
   - AABB bounding box collision math and directional projections.
   - Attack phase timing, stamina costs, and parry window counters.
   - Network schema runtime validation (Zod).
   - Invite code randomness and charset restrictions.
   - Sliding-window rate limiter mechanics.
2. **Integration Testing (Vitest)**:
   - `GameSimulation` complete combat execution: hit detection, 75% block reduction, parry deflection with counter-stun.
   - Matchmaking `RoomRegistry` lifecycle: room registration, lookups, player count updates, and cleanup on disposal.
3. **End-to-End & Smoke Testing (Playwright)**:
   - Navigation across Home, Arena, Private Rooms, and Settings.
   - Verifying the Phaser 3 game container mounts client-side without SSR errors.
   - Graceful handling of unavailable multiplayer servers.

## Running Tests

```bash
# Run all unit and integration tests across workspaces
npm run test

# Run tests in watch mode
npm run test:watch

# Run Playwright E2E smoke tests
npm run test:e2e
```
