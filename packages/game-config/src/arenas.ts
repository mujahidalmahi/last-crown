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
  backgroundKey?: string;
  backgroundImage?: string;
}

export const ARENA_CONFIGS: Record<string, ArenaConfig> = {
  coloseum: {
    id: 'coloseum',
    name: 'Coloseum',
    description: 'The ancient stone colosseum under tempestuous skies.',
    width: 1280,
    height: 720,
    floorY: 625,
    leftBoundX: 80,
    rightBoundX: 1200,
    ceilingY: 60,
    spawnPointP1: { x: 360, y: 625 },
    spawnPointP2: { x: 920, y: 625 },
    backgroundKey: 'playground',
    backgroundImage: '/assets/backgrounds/playground.jpg',
  },
  dragonland: {
    id: 'dragonland',
    name: 'DragonLand',
    description: 'The scorched volcanic plateau guarded by ancient dragons.',
    width: 1280,
    height: 720,
    floorY: 625,
    leftBoundX: 80,
    rightBoundX: 1200,
    ceilingY: 60,
    spawnPointP1: { x: 360, y: 625 },
    spawnPointP2: { x: 920, y: 625 },
    backgroundKey: 'playground2',
    backgroundImage: '/assets/backgrounds/playground2.jpg',
  },
  stormforce: {
    id: 'stormforce',
    name: 'StormForce',
    description: 'The electrified mountain fortress in a vortex of gale-force thunder.',
    width: 1280,
    height: 720,
    floorY: 625,
    leftBoundX: 80,
    rightBoundX: 1200,
    ceilingY: 60,
    spawnPointP1: { x: 360, y: 625 },
    spawnPointP2: { x: 920, y: 625 },
    backgroundKey: 'playground3',
    backgroundImage: '/assets/backgrounds/playground3.jpg',
  },
  seaside: {
    id: 'seaside',
    name: 'seaSide',
    description: 'The rocky coastal battlement battered by wild tempest seas.',
    width: 1280,
    height: 720,
    floorY: 625,
    leftBoundX: 80,
    rightBoundX: 1200,
    ceilingY: 60,
    spawnPointP1: { x: 360, y: 625 },
    spawnPointP2: { x: 920, y: 625 },
    backgroundKey: 'playground4',
    backgroundImage: '/assets/backgrounds/playground4.jpg',
  },
  bastion_courtyard: {
    id: 'bastion_courtyard',
    name: 'Coloseum',
    description: 'The ancient stone courtyard of the High King castle under tempestuous skies.',
    width: 1280,
    height: 720,
    floorY: 625,
    leftBoundX: 80,
    rightBoundX: 1200,
    ceilingY: 60,
    spawnPointP1: { x: 360, y: 625 },
    spawnPointP2: { x: 920, y: 625 },
    backgroundKey: 'playground',
    backgroundImage: '/assets/backgrounds/playground.jpg',
  },
  crown_sanctum: {
    id: 'crown_sanctum',
    name: 'Crown Sanctum',
    description: 'A vaulted cathedral throne room bathed in stained-glass light.',
    width: 1280,
    height: 720,
    floorY: 625,
    leftBoundX: 100,
    rightBoundX: 1180,
    ceilingY: 50,
    spawnPointP1: { x: 380, y: 625 },
    spawnPointP2: { x: 900, y: 625 },
    backgroundKey: 'playground',
    backgroundImage: '/assets/backgrounds/playground.jpg',
  },
};

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
