import { AABB, Vector2 } from './types.js';

export type AttackPhase = 'none' | 'windup' | 'active' | 'recovery';

export type AttackType =
  'light' | 'heavy' | 'thrust' | 'aerial' | 'dash' | 'combo' | 'sweep' | 'throw';

export interface AttackDefinition {
  id: string;
  name: string;
  type: AttackType;
  damage: number;
  staminaCost: number;
  windupMs: number;
  activeMs: number;
  recoveryMs: number;
  hitboxWidth: number;
  hitboxHeight: number;
  hitboxOffsetX: number;
  hitboxOffsetY: number;
  knockback: Vector2;
  hitstunMs: number;
}

export type HitResolutionType =
  'hit' | 'blocked' | 'parried' | 'clash' | 'miss' | 'thrown' | 'tech_break';

export interface HitResult {
  resolution: HitResolutionType;
  attackerId: string;
  defenderId: string;
  damage: number;
  blockedDamage: number;
  staminaDamage: number;
  knockback: Vector2;
  hitstunMs: number;
  isCritical: boolean;
  isDecapitation?: boolean;
  comboCount?: number;
  isClash?: boolean;
  isWallBounce?: boolean;
  isRiposte?: boolean;
  isGuardCrush?: boolean;
  isCounterHit?: boolean;
  isThrow?: boolean;
  isThrowTech?: boolean;
  isBurstBreaker?: boolean;
  hasSuperArmor?: boolean;
  attackId?: string;
  attackType?: AttackType;
}

export interface HitboxInstance {
  id: string;
  ownerId: string;
  attackId: string;
  bounds: AABB;
  isActive: boolean;
}

export interface HurtboxInstance {
  ownerId: string;
  bounds: AABB;
}
