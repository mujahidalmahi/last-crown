import { AttackDefinition } from '@last-crown/shared';

export const ATTACK_DEFINITIONS: Record<string, AttackDefinition> = {
  light_slash: {
    id: 'light_slash',
    name: 'Light Slash',
    type: 'light',
    damage: 14,
    staminaCost: 15,
    windupMs: 160,
    activeMs: 120,
    recoveryMs: 220,
    hitboxWidth: 64,
    hitboxHeight: 48,
    hitboxOffsetX: 38,
    hitboxOffsetY: -24,
    knockback: { x: 180, y: -80 },
    hitstunMs: 320,
  },
  heavy_strike: {
    id: 'heavy_strike',
    name: 'Heavy Strike',
    type: 'heavy',
    damage: 28,
    staminaCost: 30,
    windupMs: 340,
    activeMs: 160,
    recoveryMs: 400,
    hitboxWidth: 78,
    hitboxHeight: 64,
    hitboxOffsetX: 42,
    hitboxOffsetY: -20,
    knockback: { x: 340, y: -160 },
    hitstunMs: 520,
  },
  thrust: {
    id: 'thrust',
    name: 'Forward Thrust',
    type: 'thrust',
    damage: 18,
    staminaCost: 20,
    windupMs: 220,
    activeMs: 100,
    recoveryMs: 280,
    hitboxWidth: 92,
    hitboxHeight: 28,
    hitboxOffsetX: 52,
    hitboxOffsetY: -12,
    knockback: { x: 260, y: -40 },
    hitstunMs: 400,
  },
};

export function getAttackDefinition(id: string): AttackDefinition {
  return ATTACK_DEFINITIONS[id] || ATTACK_DEFINITIONS.light_slash!;
}
