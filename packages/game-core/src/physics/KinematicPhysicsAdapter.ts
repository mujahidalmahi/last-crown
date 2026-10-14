import { Vector2 } from '@last-crown/shared';
import { ArenaConfig, BALANCE_CONFIG } from '@last-crown/game-config';
import { IPhysicsAdapter, PhysicsSimulationResult } from './IPhysicsAdapter.js';

export class KinematicPhysicsAdapter implements IPhysicsAdapter {
  public updateMovement(
    position: Vector2,
    velocity: Vector2,
    isGrounded: boolean,
    moveInputX: number,
    jumpRequested: boolean,
    walkSpeed: number,
    jumpVelocity: number,
    deltaSec: number,
    arena: ArenaConfig
  ): PhysicsSimulationResult {
    let vx = velocity.x;
    let vy = velocity.y;
    let grounded = isGrounded;

    // Horizontal movement handling
    if (moveInputX !== 0) {
      vx = moveInputX * walkSpeed;
    } else {
      const friction = grounded
        ? BALANCE_CONFIG.movement.frictionX
        : BALANCE_CONFIG.movement.airFrictionX;
      vx *= Math.pow(friction, deltaSec * 60);
      if (Math.abs(vx) < 5) {
        vx = 0;
      }
    }

    // Jump handling
    if (jumpRequested && grounded) {
      vy = jumpVelocity;
      grounded = false;
    }

    // Gravity calculation
    if (!grounded) {
      vy += BALANCE_CONFIG.movement.gravity * deltaSec;
      if (vy > BALANCE_CONFIG.movement.maxFallSpeed) {
        vy = BALANCE_CONFIG.movement.maxFallSpeed;
      }
    }

    // Integrate position
    let newX = position.x + vx * deltaSec;
    let newY = position.y + vy * deltaSec;

    // Floor collision
    if (newY >= arena.floorY) {
      newY = arena.floorY;
      vy = 0;
      grounded = true;
    } else {
      grounded = false;
    }

    // Ceiling collision
    if (newY < arena.ceilingY) {
      newY = arena.ceilingY;
      if (vy < 0) vy = 0;
    }

    // Left and right arena boundary clamps
    if (newX < arena.leftBoundX) {
      newX = arena.leftBoundX;
      if (vx < 0) vx = 0;
    } else if (newX > arena.rightBoundX) {
      newX = arena.rightBoundX;
      if (vx > 0) vx = 0;
    }

    return {
      position: { x: newX, y: newY },
      velocity: { x: vx, y: vy },
      isGrounded: grounded,
    };
  }

  public applyImpulse(currentVelocity: Vector2, impulse: Vector2): Vector2 {
    return {
      x: currentVelocity.x + impulse.x,
      y: currentVelocity.y + impulse.y,
    };
  }
}
