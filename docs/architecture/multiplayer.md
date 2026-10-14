# Authoritative Multiplayer Architecture

## Private Two-Player Room Flow

```mermaid
sequenceDiagram
    participant Host as Host Browser
    participant Server as Colyseus Server
    participant Guest as Guest Browser

    Host->>Server: POST /api/rooms/create { isPrivate: true }
    Server->>Server: Generate cryptographically random 6-character code
    Server->>Server: Register code in RoomRegistry
    Server-->>Host: Return { roomId, inviteCode: "7K2M9X" }
    Host->>Server: Connect WebSocket to roomId

    Guest->>Server: POST /api/rooms/verify { inviteCode: "7K2M9X" }
    Server->>Server: Check rate limiter & room capacity
    Server-->>Guest: Return { valid: true, roomId }
    Guest->>Server: Connect WebSocket to roomId

    Note over Server: 2 Players Connected — Start Authoritative Match
    Server->>Host: ServerMessageType.MATCH_START
    Server->>Guest: ServerMessageType.MATCH_START

    loop 60 Hz Simulation Tick
        Host->>Server: Send PLAYER_INPUT (sequence N)
        Guest->>Server: Send PLAYER_INPUT (sequence M)
        Server->>Server: Validate Input & Step GameSimulation
        Server-->>Host: Synchronize State Schema (30Hz)
        Server-->>Guest: Synchronize State Schema (30Hz)
    end
```

## Security Safeguards

- **Strict Room Capacity**: Capped at exactly 2 clients (`maxClients = 2`). Third clients attempting to connect are rejected.
- **Input Sanitization**: Client messages are validated against `PlayerInputSchema` (Zod). Out-of-range floats, invalid directions, or negative sequences are rejected.
- **Rate Limiting**:
  - Room verification endpoint is rate-limited per IP (10 requests per minute) to defeat brute-force enumeration of 6-character invite codes.
  - In-game WebSocket messages are capped at 120 messages per second per client to prevent spam or CPU exhaustion.
- **Reconnection Handling**: Unintentional disconnects receive a 10-second grace period via `allowReconnection(client, 10)`.
