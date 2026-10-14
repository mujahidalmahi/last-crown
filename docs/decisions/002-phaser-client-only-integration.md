# ADR 002: Client-Only Phaser 3 Integration in Next.js App Router

## Context

Phaser 3 depends fundamentally on browser global objects (`window`, `document`, HTMLCanvasElement, WebGLContext). In Next.js App Router, components are evaluated server-side by default, which throws fatal `ReferenceError: window is not defined` if Phaser is directly imported.

## Decision

1. Dynamic client-only import via `next/dynamic` with `{ ssr: false }`.
2. Lifecycle management via `GameBootstrap` inside `useEffect` attaching to a standard `div` ref.
3. Decouple React state from the Phaser 60 FPS update loop. The game loop communicates with React via an event callback (`onSnapshot`) to update HUD overlays, keeping React render cycles separate from Phaser frame rendering.
4. Pin Phaser at version `3.88.2` (Phaser 3 series) to avoid breaking API changes in major version upgrades.

## Consequences

- **Positive**: Zero SSR errors; robust mounting/unmounting in React 18 Strict Mode; clean separation between UI DOM and Game Canvas.
- **Negative**: Phaser assets cannot be pre-rendered in HTML; visual canvas appears once the browser hydration completes.
