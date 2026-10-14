# ADR 004: Physics Adapter and Kinematic Controller vs Rigid-Body

## Context

Sword fighting requires responsive, instantaneous character control (sharp stops, predictable jumps, crisp ground bounds, and precise knockback impulses). Full rigid-body physics engines (such as Box2D / Planck.js or Matter.js) often introduce floaty inertia, friction bounce, and non-deterministic floating-point divergence across CPU architectures.

## Decision

1. We design a modular `IPhysicsAdapter` interface separating simulation logic from the physics engine.
2. We implement `KinematicPhysicsAdapter` as the primary physics engine:
   - Controlled acceleration and ground friction.
   - Fixed gravity with terminal fall velocity.
   - Instantaneous knockback impulse integration.
   - Clean arena bounding box clamping.
3. If future features require complex multi-body ragdolls or swinging chain weapons, an implementation wrapping Planck.js can be dropped in without changing `@last-crown/game-core`.

## Consequences

- **Positive**: 100% deterministic, zero external physics C++ bindings or heavy WASM dependencies; crisp, arcade-quality fighting game responsiveness.
- **Negative**: Does not support complex multi-joint ragdoll mechanics or dynamic tumbling physics.
