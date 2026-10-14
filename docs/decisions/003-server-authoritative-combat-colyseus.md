# ADR 003: Server-Authoritative Combat and Colyseus

## Context

Multiplayer fighting games are highly vulnerable to client cheating (e.g., speed hacks, fake hits, forced damage, health spoofing). Furthermore, peer-to-peer WebRTC architectures introduce NAT traversal issues, STUN/TURN server costs, and desynchronization bugs.

## Decision

We select **Colyseus** with WebSocket transport for authoritative multiplayer:

1. The server runs the authoritative simulation (`GameSimulation`) at 60 Hz.
2. Clients only transmit inputs (`PlayerInputMessage`), not positions or damage.
3. Colyseus automatically delta-compresses and synchronizes state schema (`BattleRoomState`) at 30 Hz.
4. Client inputs are validated at runtime with Zod schemas.

## Consequences

- **Positive**: Complete cheat immunity regarding damage and hit detection; private room matchmaking is simple and reliable.
- **Negative**: Network latency impacts input response; requires client-side interpolation and prediction techniques in future milestones.
