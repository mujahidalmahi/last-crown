# Threat Model & Security Mitigations

## 1. Asset & Damage Tampering

- **Threat**: A client modifies their JavaScript code to claim 999 damage, invulnerability, or automatic hit registration.
- **Mitigation**: The browser client sends only movement and intent keys (`PlayerInputMessage`). The server runs `GameSimulation`, calculates bounding box intersections, checks stamina, applies damage, and synchronizes the authoritative health state.

## 2. Invite Code Enumeration & Room Hijacking

- **Threat**: Malicious actors attempt to brute-force 6-character room codes to join active private rooms or disrupt ongoing matches.
- **Mitigation**:
  - Unambiguous 32-character alphabet gives over 1 billion combinations ($32^6 = 1,073,741,824$).
  - Sliding-window rate limiter restricts verification attempts to 10 requests per minute per IP.
  - Strict room capacity of 2 blocks third-party intrusion once both players connect.

## 3. Network Flooding & Malformed Payloads

- **Threat**: Spammed inputs or oversized payloads intended to freeze the Node event loop.
- **Mitigation**:
  - Runtime validation using Zod ensures incoming payloads adhere to strict primitive bounds.
  - In-room message throttling drops inputs exceeding 120 messages/sec per client.
  - Sequence tracking drops out-of-order or duplicate inputs.
