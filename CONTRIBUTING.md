# Contributing to LAST CROWN

Thank you for your interest in contributing to **LAST CROWN**! We welcome community contributions, bug reports, performance enhancements, and gameplay proposals.

To keep the codebase reliable, deterministic, and scalable, we maintain enterprise-grade software engineering standards. Please review this guide before submitting pull requests.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Monorepo Architecture & Package Boundaries](#monorepo-architecture--package-boundaries)
- [Development Environment Setup](#development-environment-setup)
- [Branching Model & Git Conventions](#branching-model--git-conventions)
- [Coding Standards & TypeScript Guidelines](#coding-standards--typescript-guidelines)
- [Simulation & Determinism Mandates](#simulation--determinism-mandates)
- [Testing Requirements](#testing-requirements)
- [Pull Request Process](#pull-request-process)
- [Release & Versioning](#release--versioning)

---

## Code of Conduct

All contributors and maintainers are expected to adhere to our [Code of Conduct](CODE_OF_CONDUCT.md). Please report any violations to [conduct@last-crown.top](mailto:conduct@last-crown.top).

---

## Monorepo Architecture & Package Boundaries

LAST CROWN is organized as an npm workspaces monorepo:

```text
last-crown/
├── apps/
│   ├── web/          # Next.js 14 App Router (UI, Navigation, Sound & Phaser Canvas)
│   └── server/       # Colyseus 0.15 Authoritative WebSocket Server
└── packages/
    ├── shared/       # Protocol schemas, DTOs, network message definitions, Zod validators
    ├── game-config/  # Balance values, attack timings, warrior presets, arena bounds
    └── game-core/    # Headless deterministic simulation engine & AI state machines
```

### Strict Boundary Rules:

1. **`@last-crown/game-core` must remain 100% headless**:
   - Never import React, Next.js, Phaser, DOM elements, or Colyseus into `game-core`.
   - Simulation state must update purely through numeric deltas and pure data objects.
2. **`@last-crown/shared` must remain agnostic**:
   - Shared holds type definitions, Zod schemas, and Colyseus schema classes.
   - It must never contain business logic, physics calculations, or client rendering code.
3. **`apps/web` must never leak secrets**:
   - Only expose client-safe variables via the `NEXT_PUBLIC_` prefix.
   - SSR is disabled for Phaser scenes; all game instances must mount strictly on the client.
4. **`apps/server` owns authoritative resolution**:
   - The server validates all player actions against `GameSimulation`.
   - Never accept unvalidated client coordinates, health deductions, or round win reports.

---

## Development Environment Setup

### Prerequisites

- **Node.js**: `>=20.0.0` (LTS recommended, verified on Node 20 & 22)
- **npm**: `>=10.0.0`
- **Git**: `>=2.40.0`

### Installation Steps

1. **Fork and clone** the repository:

   ```bash
   git clone https://github.com/<your-username>/last-crown.git
   cd last-crown
   ```

2. **Install all workspace dependencies**:

   ```bash
   npm install
   ```

3. **Initialize local environment**:

   ```bash
   cp .env.example .env
   ```

4. **Verify baseline build and test suite**:

   ```bash
   npm run build:packages
   npm run typecheck
   npm run test
   ```

5. **Start local development servers**:
   ```bash
   npm run dev
   ```
   - Web application: [http://localhost:3000](http://localhost:3000)
   - Colyseus server: [http://localhost:2567](http://localhost:2567) (WebSocket: `ws://localhost:2567`)

---

## Branching Model & Git Conventions

We follow a structured Git feature branch workflow:

### Branch Naming Convention

```text
<type>/<short-description>
```

- `feat/voice-spatial-audio` (New features)
- `fix/parry-recovery-state` (Bug fixes)
- `perf/hitbox-quadtree` (Performance optimizations)
- `docs/frame-data-tables` (Documentation updates)
- `test/multi-room-load` (Test suite additions)
- `refactor/audio-buffer-pool` (Code refactoring without behavioral changes)

### Conventional Commits

Commit messages must follow the [Conventional Commits v1.0.0](https://www.conventionalcommits.org/) specification:

```text
<type>(<scope>): <short description>

[optional body]

[optional footer(s)]
```

**Valid types**: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`.  
**Valid scopes**: `core`, `config`, `shared`, `server`, `web`, `netcode`, `audio`, `mobile`, `ui`.

_Example:_

```text
feat(core): implement frame-perfect attack feinting into parry

- Transition active windup into parry stance on defensive input
- Deduct standard feint stamina penalty
- Add unit tests covering rapid feint-to-block transitions
```

---

## Coding Standards & TypeScript Guidelines

1. **Strict Type Safety**:
   - `noImplicitAny`, `strictNullChecks`, and `noUnusedLocals` are strictly enforced.
   - Avoid `as any` type assertions. Use explicit interfaces or type narrowing.
2. **Linting & Code Formatting**:
   - ESLint and Prettier run automatically via npm scripts.
   - Always run `npm run lint` and `npm run format:check` before committing.
3. **No Dead Code**:
   - Remove unused imports, console debug logs, and commented-out experimental code.
4. **Retro Visual Integrity**:
   - All UI additions must adhere to the 8-bit / 16-bit arcade design pattern: `'Press Start 2P'` font, 4px beveled pixel borders, and authentic CRT styling.

---

## Simulation & Determinism Mandates

The combat engine runs on a fixed **60Hz timestep (`16.666ms`)**. When writing combat or physics logic:

1. **No System Clocks in Simulation**:
   - Never call `Date.now()`, `performance.now()`, or `setTimeout` inside `@last-crown/game-core`.
   - Always accumulate time using the passed `deltaMs` parameter.
2. **Deterministic Sequence Counters**:
   - Entity IDs and attack hitbox IDs must use monotonic counter integers, never pseudo-random generators or timestamp seeds.
3. **Directional Accuracy**:
   - Spatial checks (e.g. cross-ups, backstabs, wall collisions) must compare exact relative coordinates (`defender.x - attacker.x`), not raw facing orientation flags.

---

## Testing Requirements

Every bug fix or new feature **must include automated tests**:

| Test Suite             | Location                           | Command                |
| :--------------------- | :--------------------------------- | :--------------------- |
| **Unit & Integration** | `packages/*/tests`, `apps/*/tests` | `npm run test`         |
| **Type Verification**  | All workspaces                     | `npm run typecheck`    |
| **End-to-End Smoke**   | `apps/web/tests/e2e`               | `npm run test:e2e`     |
| **Code Formatting**    | Monorepo root                      | `npm run format:check` |

### Pull Request Acceptance Criteria

- [ ] All 103+ unit and integration tests pass without failure or timeout.
- [ ] TypeScript compiles cleanly across all packages (`npm run typecheck` returns exit code 0).
- [ ] ESLint reports 0 errors and 0 warnings (`npm run lint`).
- [ ] Code follows Prettier formatting (`npm run format:check`).
- [ ] Web application builds cleanly with zero static generation errors (`npm run build:apps`).

---

## Pull Request Process

1. **Create an issue first** for non-trivial changes, feature additions, or balance changes.
2. **Keep pull requests focused**: Avoid combining unrelated refactors or formatting changes with bug fixes.
3. **Fill out the PR Template**: Detail the motivation, implementation decisions, before/after behavior, and test evidence.
4. **CI Checks**: Ensure all GitHub Actions CI checks turn green.
5. **Code Review**: At least one maintainer approval is required for merge. Merges are squashed and rebased against `main`.

---

## Release & Versioning

LAST CROWN follows [Semantic Versioning 2.0.0](https://semver.org/):

- **MAJOR (`x.0.0`)**: Breaking network protocol changes or major architecture shifts.
- **MINOR (`0.x.0`)**: New warriors, game modes, arenas, or non-breaking API additions.
- **PATCH (`0.0.x`)**: Bug fixes, balance adjustments, performance tuning, and documentation improvements.

Thank you for helping forge **LAST CROWN** into an exceptional competitive experience!
