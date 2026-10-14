# Contributing to LAST CROWN

Thank you for contributing to LAST CROWN! To maintain architectural purity, follow these conventions:

## Code Conventions

1. **Strict TypeScript**: Never use `any` unless explicitly documenting why a boundary cast is necessary. Enable strict null checks.
2. **Boundary Isolation**:
   - Packages in `packages/game-core` must **never** import DOM, React, Phaser, or Colyseus APIs.
   - Client code in `apps/web` must **never** import server-only modules or secrets.
   - All network input payloads must be parsed through runtime Zod schemas.
3. **Determinism**: Simulation state updates in `GameSimulation` must use delta time or fixed timesteps and remain deterministic across platforms.
4. **Testing**: Write unit tests for all state machine transitions, combat math, and network protocol changes.

## Development Workflow

1. Fork or branch from `develop`.
2. Install dependencies: `npm install`.
3. Verify typechecking and tests pass locally:
   ```bash
   npm run typecheck
   npm run test
   npm run lint
   npm run format:check
   ```
4. Commit using conventional commit format: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`.
