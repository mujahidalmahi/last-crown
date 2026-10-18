import { WarriorAttributes } from '@last-crown/shared';

export interface WarriorClassPreset {
  id: string;
  name: string;
  title: string;
  description: string;
  attributes: WarriorAttributes;
  hurtbox: {
    width: number;
    height: number;
  };
}

export const WARRIOR_PRESETS: Record<string, WarriorClassPreset> = {
  knight: {
    id: 'knight',
    name: 'Crown Knight',
    title: 'The Iron Sovereign',
    description: 'Disciplined and well-balanced swordsman with solid defense and reliable posture.',
    attributes: {
      maxHealth: 100,
      maxStamina: 100,
      staminaRegenRate: 25,
      walkSpeed: 300,
      jumpVelocity: -600,
      weight: 1.0,
    },
    hurtbox: {
      width: 44,
      height: 80,
    },
  },
  duelist: {
    id: 'duelist',
    name: 'Exiled Fencer',
    title: 'The Windblade',
    description:
      'Swift and deadly thrusting fighter with rapid recovery but lower posture endurance.',
    attributes: {
      maxHealth: 85,
      maxStamina: 110,
      staminaRegenRate: 35,
      walkSpeed: 360,
      jumpVelocity: -640,
      weight: 0.85,
    },
    hurtbox: {
      width: 38,
      height: 78,
    },
  },
  vanguard: {
    id: 'vanguard',
    name: 'Northern Jarl',
    title: 'The Hammer of the Realm',
    description:
      'Heavily armored juggernaut delivering devastating overhead chops with high stagger.',
    attributes: {
      maxHealth: 125,
      maxStamina: 90,
      staminaRegenRate: 20,
      walkSpeed: 250,
      jumpVelocity: -540,
      weight: 1.3,
    },
    hurtbox: {
      width: 52,
      height: 84,
    },
  },
  marauder: {
    id: 'marauder',
    name: 'Iron Marauder',
    title: 'The Blood Cleaver',
    description:
      'Brutal close-quarters berserker with relentless offensive momentum and high-impact swings.',
    attributes: {
      maxHealth: 110,
      maxStamina: 95,
      staminaRegenRate: 22,
      walkSpeed: 285,
      jumpVelocity: -580,
      weight: 1.15,
    },
    hurtbox: {
      width: 48,
      height: 82,
    },
  },
};

export function getWarriorPreset(id: string): WarriorClassPreset {
  return WARRIOR_PRESETS[id] || WARRIOR_PRESETS.knight!;
}
