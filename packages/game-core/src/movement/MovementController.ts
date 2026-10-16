import { Direction, Vector2 } from '@last-crown/shared';
import { ArenaConfig } from '@last-crown/game-config';
import { IPhysicsAdapter } from '../physics/IPhysicsAdapter.js';

export class MovementController {
  private _position: Vector2;
  private _velocity: Vector2 = { x: 0, y: 0 };
  private _facing: Direction = 'right';
  private _isGrounded: boolean = true;
  private _lastWallBounced: boolean = false;
  private _lastBounceDirection?: 'left' | 'right';

  constructor(initialPosition: Vector2, initialFacing: Direction = 'right') {
    this._position = { ...initialPosition };
    this._facing = initialFacing;
  }

  get position(): Vector2 {
    return this._position;
  }

  get velocity(): Vector2 {
    return this._velocity;
  }

  get facing(): Direction {
    return this._facing;
  }

  get isGrounded(): boolean {
    return this._isGrounded;
  }

  get lastWallBounced(): boolean {
    return this._lastWallBounced;
  }

  get lastBounceDirection(): 'left' | 'right' | undefined {
    return this._lastBounceDirection;
  }

  public clearWallBounce(): void {
    this._lastWallBounced = false;
    this._lastBounceDirection = undefined;
  }

  public setPosition(pos: Vector2): void {
    this._position = { ...pos };
  }

  public setVelocity(vel: Vector2): void {
    this._velocity = { ...vel };
  }

  public setFacing(dir: Direction): void {
    this._facing = dir;
  }

  public applyImpulse(impulse: Vector2, physics: IPhysicsAdapter): void {
    this._velocity = physics.applyImpulse(this._velocity, impulse);
  }

  public update(
    moveInputX: number,
    jumpRequested: boolean,
    canMove: boolean,
    walkSpeed: number,
    jumpVelocity: number,
    deltaSec: number,
    arena: ArenaConfig,
    physics: IPhysicsAdapter,
    moveInputY?: number
  ): void {
    const effectiveMoveX = canMove ? moveInputX : 0;
    const effectiveJump = canMove ? jumpRequested : false;
    const effectiveMoveY = canMove ? moveInputY : 0;

    if (effectiveMoveX > 0) {
      this._facing = 'right';
    } else if (effectiveMoveX < 0) {
      this._facing = 'left';
    }

    const sim = physics.updateMovement(
      this._position,
      this._velocity,
      this._isGrounded,
      effectiveMoveX,
      effectiveJump,
      walkSpeed,
      jumpVelocity,
      deltaSec,
      arena,
      effectiveMoveY
    );

    this._position = sim.position;
    this._velocity = sim.velocity;
    this._isGrounded = sim.isGrounded;
    this._lastWallBounced = !!sim.wallBounced;
    this._lastBounceDirection = sim.bounceDirection;
  }
}
