import { Vector2 } from '@last-crown/shared';

export interface ArenaConfig {
  id: string;
  name: string;
  description: string;
  width: number;
  height: number;
  floorY: number;
  leftBoundX: number;
  rightBoundX: number;
  ceilingY: number;
  spawnPointP1: Vector2;
  spawnPointP2: Vector2;
}

export const ARENA_CONFIGS: Record<string, ArenaConfig> = {
  bastion_courtyard: {
    id: 'bastion_courtyard',
    name: 'Bastion Courtyard',
    description: 'The ancient stone courtyard of the High King castle under tempestuous skies.',
    width: 1280,
    height: 720,
    floorY: 560,
    leftBoundX: 80,
    rightBoundX: 1200,
    ceilingY: 60,
    spawnPointP1: { x: 360, y: 560 },
    spawnPointP2: { x: 920, y: 560 },
  },
  crown_sanctum: {
    id: 'crown_sanctum',
    name: 'Crown Sanctum',
    description: 'A vaulted cathedral throne room bathed in stained-glass light.',
    width: 1280,
    height: 720,
    floorY: 560,
    leftBoundX: 100,
    rightBoundX: 1180,
    ceilingY: 50,
    spawnPointP1: { x: 380, y: 560 },
    spawnPointP2: { x: 900, y: 560 },
  },
};

export function getArenaConfig(id: string): ArenaConfig {
  return ARENA_CONFIGS[id] || ARENA_CONFIGS.bastion_courtyard!;
}
