# LAST CROWN

> **"Only One Shall Reign."**

A browser-based, 2D medieval sword-fighting game featuring physics-driven movement, responsive sword combat, blocking, parrying, stamina management, and server-authoritative multiplayer.

---

## Architecture Overview

LAST CROWN is structured as a TypeScript monorepo using npm workspaces:

```text
last-crown/
├── apps/
│   ├── web/          # Next.js 14 App Router + Client-Only Phaser 3 Game Engine
│   └── server/       # Authoritative Colyseus Multiplayer WebSocket Server
├── packages/
│   ├── shared/       # Domain types, network protocol, Zod schemas, Colyseus state
│   ├── game-config/  # Balance constants, warrior presets, attack definitions, arenas
│   └── game-core/    # Headless deterministic simulation engine, combat & AI logic
├── docs/             # Architecture, decisions (ADRs), deployment, security guides
└── .github/          # Free-tier CI workflow (Lint, Typecheck, Test, Build)
```

### Key Architectural Boundaries

1. **Next.js App Router** owns web navigation, accessibility, responsive UI, and forms.
2. **Phaser 3** runs client-only (SSR disabled) to handle rendering, camera effects, audio synthesis, and local input polling.
3. **`@last-crown/game-core`** owns deterministic combat rules, hitbox resolution, parry timing, and state machines. It is 100% headless and has zero dependencies on React, Next.js, browser DOM, or Colyseus.
4. **`@last-crown/server`** runs authoritative Colyseus rooms at 60 Hz. The server executes `GameSimulation`, validates client input messages, and rejects invalid combat states.
5. **Single-player combat against AI** runs completely offline in the browser without requiring the multiplayer backend or external databases.

---

## Prerequisites

- **Node.js**: `v20.x` or `v22.x` (LTS recommended)
- **npm**: `v10.x` or `v11.x`

---

## Quickstart

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` or set app-level variables:

```bash
cp .env.example .env
```

Default local development ports:

- **Frontend Web App**: `http://localhost:3000`
- **Multiplayer Server**: `http://localhost:2567` (WebSocket: `ws://localhost:2567`)

### 3. Start Development Servers

Run both the Next.js frontend and Colyseus game server concurrently:

```bash
npm run dev
```

Or run them individually in separate terminals:

```bash
# Terminal 1: Web application
npm run dev:web

# Terminal 2: Multiplayer server
npm run dev:server
```

---

## Monorepo Commands

| Command                | Description                                               |
| :--------------------- | :-------------------------------------------------------- |
| `npm run dev`          | Runs web frontend and multiplayer server concurrently     |
| `npm run dev:web`      | Starts Next.js development server on port 3000            |
| `npm run dev:server`   | Starts Colyseus development server on port 2567           |
| `npm run build`        | Builds shared packages, server, and web application       |
| `npm run typecheck`    | Runs strict TypeScript compiler check across all packages |
| `npm run lint`         | Lints entire monorepo with ESLint                         |
| `npm run test`         | Executes unit and integration tests with Vitest           |
| `npm run test:e2e`     | Runs Playwright browser smoke tests                       |
| `npm run format:check` | Checks formatting across code and markdown with Prettier  |
| `npm run format:write` | Formats all code and markdown files with Prettier         |

---

## Combat Controls

| Action                | Primary Key | Alternative Key |
| :-------------------- | :---------- | :-------------- |
| **Move Left / Right** | `A` / `D`   | `←` / `→`       |
| **Jump**              | `W`         | `↑`             |
| **Light Slash**       | `J`         | `Space`         |
| **Heavy Strike**      | `S` + `J`   | `↓` + `Space`   |
| **Block**             | `K` (Hold)  | `Shift` (Hold)  |
| **Parry**             | `L` (Tap)   | `Alt` (Tap)     |

---

## Documentation

Detailed technical documentation is available in `docs/`:

- [System Architecture](docs/architecture/overview.md)
- [Game Update Loop](docs/architecture/game-loop.md)
- [Multiplayer Synchronization](docs/architecture/multiplayer.md)
- [Threat Model & Security](docs/security/threat-model.md)
- [Testing Strategy](docs/testing/strategy.md)
- [Free-Tier Deployment](docs/deployment/free-tier.md)
- [Architecture Decision Records (ADRs)](docs/decisions/)
