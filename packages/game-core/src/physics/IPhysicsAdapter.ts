import { Vector2 } from '@last-crown/shared';
import { ArenaConfig } from '@last-crown/game-config';

export interface PhysicsSimulationResult {
  position: Vector2;
  velocity: Vector2;
  isGrounded: boolean;
}

export interface IPhysicsAdapter {
  updateMovement(
    position: Vector2,
    velocity: Vector2,
    isGrounded: boolean,
    moveInputX: number,
    jumpRequested: boolean,
    walkSpeed: number,
    jumpVelocity: number,
    deltaSec: number,
    arena: ArenaConfig
  ): PhysicsSimulationResult;

  applyImpulse(currentVelocity: Vector2, impulse: Vector2): Vector2;
}
