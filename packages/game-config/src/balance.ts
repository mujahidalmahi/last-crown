import { GAME_DEFAULTS } from './defaults.js';

export const BALANCE_CONFIG = {
  combat: GAME_DEFAULTS.combat,
  movement: GAME_DEFAULTS.physics,
  rules: GAME_DEFAULTS.rules,
} as const;
