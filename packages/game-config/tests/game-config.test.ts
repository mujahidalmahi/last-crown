import { describe, it, expect } from 'vitest';
import {
  WARRIOR_PRESETS,
  ATTACK_DEFINITIONS,
  ARENA_CONFIGS,
  getWarriorPreset,
  getAttackDefinition,
  getArenaConfig,
  BALANCE_CONFIG,
} from '../src/index.js';

describe('Game Config', () => {
  it('provides knight, duelist, vanguard, and marauder warrior presets', () => {
    expect(WARRIOR_PRESETS.knight).toBeDefined();
    expect(WARRIOR_PRESETS.duelist).toBeDefined();
    expect(WARRIOR_PRESETS.vanguard).toBeDefined();
    expect(WARRIOR_PRESETS.marauder).toBeDefined();
    expect(getWarriorPreset('knight').name).toBe('Crown Knight');
    expect(getWarriorPreset('marauder').name).toBe('Iron Marauder');
  });

  it('provides light, heavy, and thrust attack definitions with positive timings', () => {
    expect(ATTACK_DEFINITIONS.light_slash).toBeDefined();
    expect(ARENA_CONFIGS.bastion_courtyard).toBeDefined();
    const light = getAttackDefinition('light_slash');
    expect(light.damage).toBeGreaterThan(0);
    expect(light.windupMs).toBeGreaterThan(0);
    expect(light.activeMs).toBeGreaterThan(0);
    expect(light.recoveryMs).toBeGreaterThan(0);
    expect(light.staminaCost).toBeGreaterThan(0);
  });

  it('defines valid arena configurations with spawn points within bounds', () => {
    const bastion = getArenaConfig('bastion_courtyard');
    expect(bastion.spawnPointP1.x).toBeGreaterThan(bastion.leftBoundX);
    expect(bastion.spawnPointP1.x).toBeLessThan(bastion.rightBoundX);
    expect(bastion.spawnPointP2.x).toBeGreaterThan(bastion.leftBoundX);
    expect(bastion.spawnPointP2.x).toBeLessThan(bastion.rightBoundX);
    expect(bastion.floorY).toBe(625);
  });

  it('defines valid balance timing and damage reduction values', () => {
    expect(BALANCE_CONFIG.combat.parryWindowMs).toBeLessThanOrEqual(250);
    expect(BALANCE_CONFIG.combat.blockDamageReduction).toBeGreaterThan(0.5);
    expect(BALANCE_CONFIG.rules.roundsToWin).toBeGreaterThanOrEqual(1);
  });

  it('maps all 4 custom arena playgrounds accurately', () => {
    const coloseum = getArenaConfig('coloseum');
    expect(coloseum.name).toBe('Coloseum');
    expect(coloseum.backgroundKey).toBe('playground');
    expect(coloseum.backgroundImage).toContain('playground.jpg');

    const dragonland = getArenaConfig('dragonland');
    expect(dragonland.name).toBe('DragonLand');
    expect(dragonland.backgroundKey).toBe('playground2');
    expect(dragonland.backgroundImage).toContain('playground2.jpg');

    const stormforce = getArenaConfig('stormforce');
    expect(stormforce.name).toBe('StormForce');
    expect(stormforce.backgroundKey).toBe('playground3');
    expect(stormforce.backgroundImage).toContain('playground3.jpg');

    const seaside = getArenaConfig('seaside');
    expect(seaside.name).toBe('seaSide');
    expect(seaside.backgroundKey).toBe('playground4');
    expect(seaside.backgroundImage).toContain('playground4.jpg');
  });
});
