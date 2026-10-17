# Last-Crown — Technical Documentation Hub

Welcome to the comprehensive technical documentation for **Last-Crown** (_"The winner takes it all"_), a browser-based, competitive 2D medieval sword-fighting game.

This documentation hub covers the architectural foundations, deterministic combat simulation, network protocol, game balance, security models, testing strategies, and production deployment runbooks.

---

## Documentation Navigation

```text
docs/
├── architecture/          # High-level architecture, game loop, and multiplayer sync
│   ├── overview.md        # System components, monorepo boundaries & data flow
│   ├── game-loop.md       # 60Hz deterministic tick simulation & state propagation
│   ├── multiplayer.md     # Colyseus room lifecycle, state schemas, WebRTC voice
│   └── protocol-specification.md # Complete WebSocket & signaling wire protocol
├── game-design/           # Combat design, fighter mechanics, and balance
│   ├── combat-system.md   # Hitboxes, parry windows, stamina exhaustion, combos
│   └── frame-data.md      # Frame data table for all 5 warriors & 8 attack types
├── mobile/                # Mobile UX & hardware integrations
│   └── mobile-architecture.md # Touch controls, landscape lock, companion phone controller
├── security/              # Security and threat modeling
│   └── threat-model.md    # Zero-trust state validation, anti-cheat, rate limiting
├── testing/               # QA & automated verification
│   └── strategy.md        # Unit, integration, E2E, determinism, and regression testing
├── deployment/            # Production operations & hosting
│   ├── free-tier.md       # Free-tier deployment (Vercel + Render + Cloudflare TURN)
│   └── production-operations.md # Docker, container orchestration, Nginx/Caddy WSS, monitoring
├── decisions/             # Architecture Decision Records (ADRs)
│   ├── 001-monorepo-structure-and-tooling.md
│   ├── 002-phaser-client-only-integration.md
│   ├── 003-server-authoritative-combat-colyseus.md
│   ├── 004-physics-adapter-arcade-vs-rigid-body.md
│   └── 005-private-rooms-and-invite-codes.md
└── audit/                 # Verification & qualification reports
    ├── production-readiness-audit.md
    └── production-qualification-report.md
```

---

## Quick Links by Role

- **Game Engine & Combat Developers**: Read [Architecture Overview](architecture/overview.md), [Game Loop](architecture/game-loop.md), and [Frame Data](game-design/frame-data.md).
- **Backend & Netcode Engineers**: Read [Multiplayer Synchronization](architecture/multiplayer.md), [Protocol Specification](architecture/protocol-specification.md), and [Threat Model](security/threat-model.md).
- **Frontend & UI/UX Engineers**: Read [Mobile Architecture](mobile/mobile-architecture.md), [Public Assets](../../apps/web/public/README.md), and [Free-Tier Deployment](deployment/free-tier.md).
- **DevOps & Site Reliability Engineers**: Read [Production Operations](deployment/production-operations.md) and [Free-Tier Deployment](deployment/free-tier.md).
- **QA & Test Automation Engineers**: Read [Testing Strategy](testing/strategy.md).

---

## Architecture Principles

1. **Deterministic Core**: Combat logic lives in `@last-crown/game-core` without DOM, React, or WebSocket dependencies, enabling exact client-side offline play and server-authoritative room simulation.
2. **Zero-Client-Trust**: The server executes the identical simulation code and validates every player action before broadcasting state to clients.
3. **Responsive Input**: Low input latency with input buffering, frame-perfect parrying, tactical feinting, and multi-touch mobile controls.
4. **Resilient Netcode**: Fault isolation per match room, monotonic hitbox sequencing, rate-limited WebSockets, and TURN-assisted WebRTC voice chat.
