import { describe, it, expect } from 'vitest';
import {
  WARRIOR_PRESETS,
  ATTACK_DEFINITIONS,
  ARENA_CONFIGS,
  getWarriorPreset,
  getAttackDefinition,
  getArenaConfig,
  BALANCE_CONFIG,
  GAME_DEFAULTS,
  CONTROLLER_DEFAULTS,
  COLOR_DEFAULTS,
  PHYSICS_DEFAULTS,
  ATTACK_DEFAULTS,
  WARRIOR_CLASS_DEFAULTS,
  ARENA_DEFAULTS,
  AI_DEFAULTS,
  CAMERA_AND_VFX_DEFAULTS,
  applyGamePreset,
  applyControllerProfile,
  applyColorTheme,
  updateGameDefaults,
  resetGameDefaults,
  exportGameDefaultsJSON,
  importGameDefaultsJSON,
  matchesBinding,
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

  describe('GAME_DEFAULTS (Master Configuration)', () => {
    it('exports all major subsystems in the master GAME_DEFAULTS object', () => {
      expect(GAME_DEFAULTS.controllers).toBeDefined();
      expect(GAME_DEFAULTS.colors).toBeDefined();
      expect(GAME_DEFAULTS.physics).toBeDefined();
      expect(GAME_DEFAULTS.combat).toBeDefined();
      expect(GAME_DEFAULTS.rules).toBeDefined();
      expect(GAME_DEFAULTS.display).toBeDefined();
      expect(GAME_DEFAULTS.audio).toBeDefined();
    });

    it('defines valid keyboard and dual-player controller bindings', () => {
      const kb = CONTROLLER_DEFAULTS.keyboard;
      expect(kb.moveLeft).toContain('KeyA');
      expect(kb.moveRight).toContain('KeyD');
      expect(kb.jump).toContain('Space');
      expect(kb.lightAttack).toContain('KeyJ');
      expect(kb.parry).toContain('KeyL');

      const dual = CONTROLLER_DEFAULTS.dualPlayer;
      expect(dual.p1.moveLeft).toContain('KeyA');
      expect(dual.p2.moveLeft).toContain('ArrowLeft');
      expect(dual.p2.lightAttack).toContain('Numpad1');
    });

    it('defines color defaults for P1, P2, and combat materials', () => {
      expect(COLOR_DEFAULTS.p1.nameTag).toBe('#f1c40f');
      expect(COLOR_DEFAULTS.p2.nameTag).toBe('#e74c3c');
      expect(COLOR_DEFAULTS.materials.steelHighlight).toBeDefined();
      expect(COLOR_DEFAULTS.effects.parryRing).toBeDefined();
    });

    it('matches key bindings accurately using matchesBinding helper', () => {
      const activeKeys = new Set(['KeyA', 'KeyJ']);
      expect(matchesBinding(activeKeys, ['KeyA', 'KeyD'])).toBe(true);
      expect(matchesBinding(activeKeys, ['KeyW', 'KeyS'])).toBe(false);
      expect(matchesBinding(activeKeys, ['KeyJ'])).toBe(true);
    });

    it('connects physics defaults into BALANCE_CONFIG movement', () => {
      expect(BALANCE_CONFIG.movement.groundAcceleration).toBe(PHYSICS_DEFAULTS.groundAcceleration);
      expect(BALANCE_CONFIG.movement.gravity).toBe(PHYSICS_DEFAULTS.gravity);
      expect(BALANCE_CONFIG.movement.maxFallSpeed).toBe(PHYSICS_DEFAULTS.maxFallSpeed);
    });

    it('exports attack defaults, warrior defaults, arena defaults, and AI profiles', () => {
      expect(ATTACK_DEFAULTS.light_slash.damage).toBe(14);
      expect(WARRIOR_CLASS_DEFAULTS.knight.attributes.maxHealth).toBe(100);
      expect(ARENA_DEFAULTS.coloseum.floorY).toBe(625);
      expect(AI_DEFAULTS.master.parryChance).toBe(0.85);
      expect(CAMERA_AND_VFX_DEFAULTS.hitStop.decapitation).toBe(180);
    });

    it('supports applying game presets (e.g. tournament, casual, turbo)', () => {
      applyGamePreset('tournament');
      expect(GAME_DEFAULTS.combat.parryWindowMs).toBe(110);
      expect(GAME_DEFAULTS.rules.roundsToWin).toBe(3);

      applyGamePreset('casual');
      expect(GAME_DEFAULTS.combat.parryWindowMs).toBe(210);

      // Clean up back to standard
      applyGamePreset('standard');
      expect(GAME_DEFAULTS.combat.parryWindowMs).toBe(150);
      expect(GAME_DEFAULTS.rules.roundsToWin).toBe(2);
    });

    it('supports quick-swapping controller profiles and color themes', () => {
      applyControllerProfile('arrow_classic');
      expect(GAME_DEFAULTS.controllers.keyboard.moveLeft).toEqual(['ArrowLeft']);

      applyColorTheme('synthwave_neon');
      expect(GAME_DEFAULTS.colors.p1.capeBase).toBe(0x00cec9);

      // Reset
      resetGameDefaults();
      expect(GAME_DEFAULTS.controllers.keyboard.moveLeft).toContain('KeyA');
      expect(GAME_DEFAULTS.colors.p1.capeBase).toBe(0x224488);
    });

    it('supports runtime partial mutation and JSON export / import', () => {
      updateGameDefaults({
        combat: { dashSpeed: 999 } as any,
      });
      expect(GAME_DEFAULTS.combat.dashSpeed).toBe(999);

      const json = exportGameDefaultsJSON();
      expect(typeof json).toBe('string');
      expect(json).toContain('"dashSpeed": 999');

      resetGameDefaults();
      expect(GAME_DEFAULTS.combat.dashSpeed).toBe(420);

      // Re-import from JSON
      const ok = importGameDefaultsJSON(json);
      expect(ok).toBe(true);
      expect(GAME_DEFAULTS.combat.dashSpeed).toBe(999);

      resetGameDefaults();
      expect(GAME_DEFAULTS.combat.dashSpeed).toBe(420);
    });
  });
});
