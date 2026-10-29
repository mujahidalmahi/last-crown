import { Direction, Vector2, AABB } from './types.js';
import { AttackPhase } from './combat.js';

export type WarriorActionState =
  | 'idle'
  | 'running'
  | 'jumping'
  | 'falling'
  | 'attacking'
  | 'blocking'
  | 'parrying'
  | 'hitstun'
  | 'knocked_down'
  | 'dead';

export interface WarriorAttributes {
  maxHealth: number;
  maxStamina: number;
  staminaRegenRate: number;
  walkSpeed: number;
  jumpVelocity: number;
  weight: number;
}

export interface WarriorSnapshot {
  id: string;
  name: string;
  position: Vector2;
  velocity: Vector2;
  facing: Direction;
  isGrounded: boolean;
  health: number;
  maxHealth: number;
  stamina: number;
  maxStamina: number;
  state: WarriorActionState;
  attackPhase: AttackPhase;
  currentAttackId: string | null;
  parryWindowRemainingMs: number;
  hitstunRemainingMs: number;
  hurtbox: AABB;
  roundsWon: number;
  isExhausted: boolean;
  isDecapitated?: boolean;
  comboCount?: number;
  burstMeter: number;
  isBurstActive?: boolean;
  isGrabbed?: boolean;
  grabBreakWindowMs?: number;
}
