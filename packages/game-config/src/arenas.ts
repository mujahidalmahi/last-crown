import { ArenaConfig, ARENA_DEFAULTS } from './defaults.js';

export type { ArenaConfig };
export const ARENA_CONFIGS: Record<string, ArenaConfig> = ARENA_DEFAULTS;

export function getArenaConfig(id: string): ArenaConfig {
  if (!id) return ARENA_CONFIGS.coloseum!;
  const normalizedId = id.toLowerCase().replace(/[-_\s]/g, '');
  if (
    normalizedId === 'coloseum' ||
    normalizedId === 'colosseum' ||
    normalizedId === 'bastioncourtyard'
  ) {
    return ARENA_CONFIGS.coloseum!;
  }
  if (normalizedId === 'dragonland') {
    return ARENA_CONFIGS.dragonland!;
  }
  if (normalizedId === 'stormforce') {
    return ARENA_CONFIGS.stormforce!;
  }
  if (normalizedId === 'seaside') {
    return ARENA_CONFIGS.seaside!;
  }
  return ARENA_CONFIGS[id] || ARENA_CONFIGS.coloseum!;
}
