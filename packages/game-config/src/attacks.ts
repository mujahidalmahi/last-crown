import { AttackDefinition } from '@last-crown/shared';
import { ATTACK_DEFAULTS } from './defaults.js';

export const ATTACK_DEFINITIONS: Record<string, AttackDefinition> = ATTACK_DEFAULTS;

export function getAttackDefinition(id: string): AttackDefinition {
  return ATTACK_DEFINITIONS[id] || ATTACK_DEFINITIONS.light_slash!;
}
