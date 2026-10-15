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

    // Horizontal movement handling with realistic acceleration & skid braking
    if (moveInputX !== 0) {
      const targetVx = moveInputX * walkSpeed;
      if (grounded) {
        // If moving fast and reversing direction, apply high skid deceleration
        const isReversing = (vx > 30 && moveInputX < 0) || (vx < -30 && moveInputX > 0);
        const rate = isReversing
          ? BALANCE_CONFIG.movement.skidDeceleration
          : BALANCE_CONFIG.movement.groundAcceleration;
        if (vx < targetVx) {
          vx = Math.min(targetVx, vx + rate * deltaSec);
        } else if (vx > targetVx) {
          vx = Math.max(targetVx, vx - rate * deltaSec);
        }
      } else {
        // Aerial directional control
        const airRate = BALANCE_CONFIG.movement.airAcceleration;
        if (vx < targetVx) {
          vx = Math.min(targetVx, vx + airRate * deltaSec);
        } else if (vx > targetVx) {
          vx = Math.max(targetVx, vx - airRate * deltaSec);
        }
      }
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

    // Gravity calculation & variable jump cut (short-hop on quick release)
    if (!grounded) {
      let currentGravity = BALANCE_CONFIG.movement.gravity;
      if (vy < -50 && !jumpRequested) {
        currentGravity *= BALANCE_CONFIG.movement.jumpReleaseGravityScale;
      }
      vy += currentGravity * deltaSec;
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
