# ADR 005: Private Rooms, Invite Codes, and Anti-Enumeration

## Context

Players need a friction-free way to invite friends into private duels without requiring database registrations, user logins, or sharing long, confusing room IDs. However, short invite codes can be vulnerable to brute-force enumeration.

## Decision

1. Short 6-character alphanumeric codes generated using `crypto.randomBytes`.
2. Omit ambiguous characters (`0`, `O`, `1`, `I`, `L`) to avoid player transcription errors.
3. Keep code-to-room mappings in an in-memory `RoomRegistry` on the server.
4. Enforce sliding-window rate limiting on the `/api/rooms/verify` endpoint (10 requests/min per IP).
5. Enforce strict two-player capacity (`maxClients = 2`).

## Consequences

- **Positive**: Zero authentication friction; easy to communicate via voice or chat; secure against brute-force guessing.
- **Negative**: Active rooms and invite codes do not survive server restarts in this initial release (persistent Redis/database storage planned for future release).
