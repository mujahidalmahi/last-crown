# Network Protocol Specification

This document defines the wire protocol, message structures, validation rules, and signaling interfaces used for multiplayer synchronization in **LAST CROWN**.

---

## 1. Network Architecture & Transport

LAST CROWN utilizes two primary communication channels:

1. **WebSocket State Channel** (Colyseus 0.15): Binary schema delta synchronization for real-time game simulation at 60 Hz.
2. **WebRTC Peer-to-Peer Data & Media Channel**: Direct audio streaming between opposing players with Colyseus acting strictly as the signaling relay.
3. **HTTP REST Endpoints**: Matchmaking verification, invite code generation, and Cloudflare TURN credential retrieval.

---

## 2. HTTP REST Endpoints

### `POST /api/rooms/create`

Generates a new private match room and reserves an invite code.

- **Request Body**:
  ```json
  {
    "isPrivate": true,
    "warriorPreset": "knight",
    "playerName": "SirGalahad",
    "arenaId": "coloseum"
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "roomId": "a1b2c3d4",
    "inviteCode": "AX79"
  }
  ```

### `POST /api/rooms/verify`

Verifies whether a 4-character invite code matches an active, unjoined room.

- **Request Body**:
  ```json
  { "inviteCode": "AX79" }
  ```
- **Response `200 OK`**:
  ```json
  {
    "valid": true,
    "roomId": "a1b2c3d4"
  }
  ```
- **Rate Limit**: 10 requests / minute per client IP.

### `GET /api/ice-servers`

Fetches temporary Cloudflare TURN/STUN credentials for WebRTC peer connections.

- **Response `200 OK`**:
  ```json
  {
    "iceServers": [
      { "urls": "stun:stun.cloudflare.com:3478" },
      {
        "urls": "turn:turn.cloudflare.com:3478?transport=udp",
        "username": "...",
        "credential": "..."
      }
    ]
  }
  ```
- **Cache Policy**: Credentials cached in memory for 12 hours with deduplicated concurrent requests.

---

## 3. Client-to-Server Messages (`ClientMessageType`)

All client messages are validated via runtime Zod schemas. Invalid payloads are dropped with rate limiting counters incremented.

### `PLAYER_INPUT` (`"player_input"`)

Sent by the game client up to 240 times per second with local input intent.

```typescript
interface PlayerInputClientMessage {
  sequenceNumber: number; // Monotonically increasing client frame sequence
  input: {
    moveX: number; // -1 (Left), 0 (Neutral), 1 (Right)
    moveY?: number; // -1 (Down), 0, 1 (Up)
    jump: boolean; // Jump requested
    dash: boolean; // Tactical evasive footwork requested
    attack: boolean; // Attack button pressed
    attackType?: 'light' | 'heavy' | 'thrust' | 'sweep' | 'aerial' | 'dash';
    block: boolean; // Guard / block button held
    parry: boolean; // Frame-perfect parry button pressed
  };
}
```

### `VOICE_SIGNAL` (`"voice_signal"`)

Relayed via the Colyseus room strictly to the opponent in the same match.

```typescript
interface VoiceSignalClientMessage {
  signal: {
    type: 'ready' | 'offer' | 'answer' | 'candidate' | 'ice_servers';
    data?: any;
  };
}
```

### `REQUEST_REMATCH` (`"request_rematch"`)

Requests a rematch upon match conclusion. Both players must agree to restart.

### `SELECT_ARENA` (`"select_arena"`)

Sent by the room host to select an arena backdrop (`coloseum`, `dragonland`, `stormforce`, `seaside`).

---

## 4. Server-to-Client Messages (`ServerMessageType`)

### `BATTLE_START` (`"battle_start"`)

Broadcast when both warriors have joined and the countdown sequence concludes.

### `ROUND_END` (`"round_end"`)

Broadcast when a player's health reaches 0 or round timer expires.

```typescript
interface RoundEndPayload {
  winnerId: string;
  roundNumber: number;
  isDecapitation: boolean;
  score: { player1: number; player2: number };
}
```

### `MATCH_END` (`"match_end"`)

Broadcast when a warrior wins 2 out of 3 rounds.

```typescript
interface MatchEndPayload {
  victorId: string;
  finalScore: { player1: number; player2: number };
}
```

---

## 5. Authoritative Room State Schema (`BattleRoomState`)

The state schema is serialized using Colyseus binary schema deltas at 60 Hz:

```typescript
class BattleRoomState extends Schema {
  @type('string') roomId: string;
  @type('string') inviteCode: string;
  @type('string') arenaId: string;
  @type('string') phase: 'waiting' | 'countdown' | 'in_progress' | 'round_end' | 'match_end';
  @type('number') roundTimerSec: number;
  @type('number') currentRound: number;
  @type({ map: WarriorNetworkState }) warriors = new MapSchema<WarriorNetworkState>();
}

class WarriorNetworkState extends Schema {
  @type('string') id: string;
  @type('string') sessionId: string;
  @type('string') presetId: string;
  @type('string') name: string;
  @type('number') x: number;
  @type('number') y: number;
  @type('number') velocityX: number;
  @type('number') velocityY: number;
  @type('string') facing: 'left' | 'right';
  @type('number') health: number;
  @type('number') maxHealth: number;
  @type('number') stamina: number;
  @type('number') maxStamina: number;
  @type('string') state: WarriorState;
  @type('string') attackPhase: 'none' | 'windup' | 'active' | 'recovery';
  @type('string') currentAttackId: string;
  @type('number') roundsWon: number;
  @type('boolean') isExhausted: boolean;
  @type('boolean') isDecapitated: boolean;
  @type('number') comboCount: number;
}
```

---

## 6. Companion Smartphone Controller Protocol

When a player scans the match QR code with a smartphone, a secondary Colyseus room (`PartyControllerRoom`) connects the mobile web interface as a dedicated gamepad:

- **Channel**: `PartyControllerRoom`
- **Host Message (`VIBRATE_CONTROLLER`)**: Host sends vibration triggers upon taking damage or parrying (`navigator.vibrate([100, 50, 100])`).
- **Phone Message (`CONTROLLER_INPUT`)**: Transmits directional joystick vectors and action button taps directly into the host's player input stream.
