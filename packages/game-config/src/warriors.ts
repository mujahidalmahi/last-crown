import { WarriorClassPreset, WARRIOR_CLASS_DEFAULTS } from './defaults.js';

export type { WarriorClassPreset };
export const WARRIOR_PRESETS: Record<string, WarriorClassPreset> = WARRIOR_CLASS_DEFAULTS;

export function getWarriorPreset(id: string): WarriorClassPreset {
  return WARRIOR_PRESETS[id] || WARRIOR_PRESETS.knight!;
}
