# ADR 001: Monorepo Structure and Tooling

## Context

LAST CROWN requires sharing domain types, network protocols, balance constants, and deterministic combat simulation logic between a Next.js browser client and an authoritative Node.js multiplayer server.

## Decision

We adopt standard `npm workspaces` with three shared packages (`@last-crown/shared`, `@last-crown/game-config`, `@last-crown/game-core`) and two applications (`@last-crown/web`, `@last-crown/server`).

- TypeScript strict mode enforced via `tsconfig.base.json`.
- ESLint flat configuration (`eslint.config.mjs`) with `typescript-eslint`.
- Vitest for unified multi-workspace testing via `vitest.workspace.ts`.
- Playwright for browser smoke testing.

## Consequences

- **Positive**: Zero external tooling overhead (no Lerna, Nx, or Turborepo installation requirements); native npm commands work out-of-the-box.
- **Negative**: Packages must be built before downstream apps compile when running external bundlers that do not support monorepo transpilation.
