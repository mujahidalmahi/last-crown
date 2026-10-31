/**
 * Last-Crown — Mega Master System Defaults & Central Configuration Hub
 *
 * This central configuration hub governs the entire game monorepo:
 * 1.  Controllers & Profiles (Keyboard, 2-Player Split, Gamepads, Virtual Touch)
 * 2.  Visual Color Themes & Palettes (P1, P2 / AI, Weapon Steels, Combat VFX)
 * 3.  Movement & Kinematic Physics (Accelerations, Friction, Gravity, Wall-bounces)
 * 4.  Combat Balance & Frame Windows (Parries, Stuns, Stamina, Bursts, DI)
 * 5.  Attacks & Frame Data (Damage, Windup, Active, Recovery, Hitboxes for all 9 attacks)
 * 6.  Warrior Class Presets (Knight, Duelist, Vanguard, Marauder stats & hurtboxes)
 * 7.  Arenas & Coordinates (Dimensions, floor heights, spawn points, boundary limits)
 * 8.  Bot AI & Difficulty Tunings (Novice, Adept, Expert, Master behaviors)
 * 9.  Camera & Cinematic VFX (Zoom levels, Shake intensities, Hit-stop freeze frames)
 * 10. Match Rules & HUD (Rounds to win, Timers, Sudden death, Warning thresholds)
 * 11. Audio & Sound Synthesis (Master volumes, Waveform frequencies)
 * 12. Gameplay Presets (Standard, Tournament, Casual, Turbo, Lethal Ironman)
 * 13. Dynamic Configuration API (Live mutation, JSON export/import, localStorage sync)
 */

import { Vector2, AttackDefinition, WarriorAttributes } from '@last-crown/shared';

// ============================================================================
// 1. CONTROLLERS & INPUT CONFIGURATION
// ============================================================================

export interface KeyboardBindings {
  moveLeft: readonly string[];
  moveRight: readonly string[];
  jump: readonly string[];
  crouch: readonly string[];
  dash: readonly string[];
  lightAttack: readonly string[];
  heavyAttack: readonly string[];
  thrust: readonly string[];
  parry: readonly string[];
  block: readonly string[];
  throw: readonly string[];
  burst: readonly string[];
}

export interface TouchControlsConfig {
  joystickRadius: number;
  joystickDeadzone: number;
  buttonSize: number;
  hapticsEnabled: boolean;
  opacity: number;
}

export interface ControllerDefaultsConfig {
  keyboard: KeyboardBindings & {
    preventScrollKeys: readonly string[];
    doubleTapDash: {
      enabled: boolean;
      thresholdMs: number;
      keys: readonly string[];
    };
  };
  dualPlayer: {
    preventScrollKeys: readonly string[];
    p1: KeyboardBindings;
    p2: KeyboardBindings;
  };
  gamepad: {
    deadzone: number;
    stickThresholds: {
      moveX: number;
      moveYDown: number;
      moveYUp: number;
    };
    buttons: {
      jump: readonly number[];
      block: readonly number[];
      dash: readonly number[];
      parry: readonly number[];
      lightAttack: readonly number[];
      heavyAttack: readonly number[];
      thrust: readonly number[];
      throw: readonly number[];
      burst: readonly number[];
      dpadUp: number;
      dpadDown: number;
      dpadLeft: number;
      dpadRight: number;
    };
    vibration: {
      defaultDurationMs: number;
      hitDurationMs: number;
      parryDurationMs: number;
      clashDurationMs: number;
      weakMagnitude: number;
      strongMagnitude: number;
    };
  };
  touch: TouchControlsConfig;
}

export const CONTROLLER_DEFAULTS: ControllerDefaultsConfig = {
  keyboard: {
    moveLeft: ['KeyA', 'ArrowLeft'],
    moveRight: ['KeyD', 'ArrowRight'],
    jump: ['Space', 'KeyW', 'ArrowUp'],
    crouch: ['KeyS', 'ArrowDown'],
    dash: ['KeyE', 'KeyC'],
    lightAttack: ['KeyJ', 'KeyZ'],
    heavyAttack: ['KeyK', 'KeyX'],
    thrust: ['KeyU', 'KeyI'],
    parry: ['KeyL', 'KeyO', 'KeyF', 'AltLeft', 'AltRight'],
    block: ['ShiftLeft', 'ShiftRight', 'KeyI'],
    throw: ['KeyG'],
    burst: ['KeyB'],
    preventScrollKeys: ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Slash'],
    doubleTapDash: {
      enabled: true,
      thresholdMs: 250,
      keys: ['KeyA', 'KeyD', 'ArrowLeft', 'ArrowRight'],
    },
  },
  dualPlayer: {
    preventScrollKeys: ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Slash'],
    p1: {
      moveLeft: ['KeyA'],
      moveRight: ['KeyD'],
      jump: ['KeyW', 'Space'],
      crouch: ['KeyS'],
      dash: ['KeyE', 'KeyC'],
      lightAttack: ['KeyJ', 'KeyZ'],
      heavyAttack: ['KeyK', 'KeyX'],
      thrust: ['KeyU'],
      parry: ['KeyL', 'KeyO', 'KeyF', 'AltLeft', 'AltRight'],
      block: ['ShiftLeft', 'ShiftRight', 'KeyI'],
      throw: ['KeyG'],
      burst: ['KeyB'],
    },
    p2: {
      moveLeft: ['ArrowLeft'],
      moveRight: ['ArrowRight'],
      jump: ['ArrowUp', 'Numpad0'],
      crouch: ['ArrowDown'],
      dash: ['Numpad4', 'Enter'],
      lightAttack: ['Numpad1', 'Period'],
      heavyAttack: ['Numpad2', 'Slash'],
      thrust: ['Numpad3', 'Quote'],
      parry: ['Numpad5', 'Semicolon'],
      block: ['Numpad0', 'ShiftRight', 'ControlRight'],
      throw: ['Numpad7'],
      burst: ['Numpad9'],
    },
  },
  gamepad: {
    deadzone: 0.25,
    stickThresholds: {
      moveX: 0.28,
      moveYDown: 0.4,
      moveYUp: -0.4,
    },
    buttons: {
      jump: [0, 12], // A / Cross, D-Pad Up
      block: [4, 6], // L1/LB, L2/LT
      dash: [7, 10], // R2/RT, Left Stick Click (L3)
      parry: [5], // R1/RB
      lightAttack: [2], // X / Square
      heavyAttack: [3], // Y / Triangle
      thrust: [1], // B / Circle
      throw: [8], // Select / Back
      burst: [9], // Start / Options
      dpadUp: 12,
      dpadDown: 13,
      dpadLeft: 14,
      dpadRight: 15,
    },
    vibration: {
      defaultDurationMs: 100,
      hitDurationMs: 120,
      parryDurationMs: 160,
      clashDurationMs: 140,
      weakMagnitude: 0.5,
      strongMagnitude: 0.5,
    },
  },
  touch: {
    joystickRadius: 60,
    joystickDeadzone: 10,
    buttonSize: 58,
    hapticsEnabled: true,
    opacity: 0.85,
  },
};

/** Pre-packaged keyboard controller profiles */
export const KEYBOARD_PROFILES: Record<string, Partial<KeyboardBindings>> = {
  wasd_standard: {
    moveLeft: ['KeyA', 'ArrowLeft'],
    moveRight: ['KeyD', 'ArrowRight'],
    jump: ['Space', 'KeyW', 'ArrowUp'],
    crouch: ['KeyS', 'ArrowDown'],
    lightAttack: ['KeyJ', 'KeyZ'],
    heavyAttack: ['KeyK', 'KeyX'],
    thrust: ['KeyU', 'KeyI'],
    parry: ['KeyL', 'KeyO'],
    block: ['ShiftLeft', 'ShiftRight'],
  },
  arrow_classic: {
    moveLeft: ['ArrowLeft'],
    moveRight: ['ArrowRight'],
    jump: ['ArrowUp'],
    crouch: ['ArrowDown'],
    lightAttack: ['KeyZ'],
    heavyAttack: ['KeyX'],
    thrust: ['KeyC'],
    parry: ['Space'],
    block: ['ShiftLeft', 'ShiftRight'],
  },
  esdf_tactical: {
    moveLeft: ['KeyS'],
    moveRight: ['KeyF'],
    jump: ['KeyE', 'Space'],
    crouch: ['KeyD'],
    lightAttack: ['KeyJ'],
    heavyAttack: ['KeyK'],
    thrust: ['KeyI'],
    parry: ['KeyL'],
    block: ['KeyA'],
  },
};

// ============================================================================
// 2. COLOR PALETTES & VISUAL THEMES
// ============================================================================

export interface WarriorColorScheme {
  nameTag: string;
  nameTagStroke: string;
  capeBase: number;
  capeTrim: number;
  armorPrimary: number;
  armorSecondary: number;
  glow: number;
  plume: number;
  aura: number;
}

export interface ColorDefaultsConfig {
  p1: WarriorColorScheme;
  p2: WarriorColorScheme;
  materials: {
    steelHighlight: number;
    steelDark: number;
    goldTrim: number;
    shadow: number;
    shadowGraphics: number;
    swordBladeOutline: number;
    swordBladeDark: number;
    swordBladeFuller: number;
    swordBladeLight: number;
    swordBladeHighlight: number;
    hitFlash: number;
  };
  effects: {
    parryRing: number;
    parrySpark: number;
    burstShockwave: number;
    burstCross: number;
    clashFlash: number;
    clashRays: number;
    bloodNormal: number;
    bloodCritical: number;
    bloodDecalDark: number;
    bloodDecalPool: number;
    slashNormal: number;
    slashCritical: number;
    dashLungeTrail: number;
  };
}

export const COLOR_DEFAULTS: ColorDefaultsConfig = {
  p1: {
    nameTag: '#f1c40f',
    nameTagStroke: '#05070a',
    capeBase: 0x224488,
    capeTrim: 0x3366cc,
    armorPrimary: 0x2c4a8a,
    armorSecondary: 0x1e3360,
    glow: 0x38ef7d,
    plume: 0xf1c40f,
    aura: 0xffd700,
  },
  p2: {
    nameTag: '#e74c3c',
    nameTagStroke: '#05070a',
    capeBase: 0x881122,
    capeTrim: 0xaa2233,
    armorPrimary: 0x9b1b1b,
    armorSecondary: 0x6e1010,
    glow: 0xe74c3c,
    plume: 0xe74c3c,
    aura: 0xff3838,
  },
  materials: {
    steelHighlight: 0xecf0f1,
    steelDark: 0x7f8c8d,
    goldTrim: 0xf1c40f,
    shadow: 0x181e28,
    shadowGraphics: 0x000000,
    swordBladeOutline: 0x161a22,
    swordBladeDark: 0x3d4450,
    swordBladeFuller: 0x222730,
    swordBladeLight: 0x94a3b8,
    swordBladeHighlight: 0xcbd5e1,
    hitFlash: 0xffffff,
  },
  effects: {
    parryRing: 0x74b9ff,
    parrySpark: 0xffeaa7,
    burstShockwave: 0xffd700,
    burstCross: 0xffffff,
    clashFlash: 0xffffff,
    clashRays: 0xffeaa7,
    bloodNormal: 0xe17055,
    bloodCritical: 0xd63031,
    bloodDecalDark: 0x5a0000,
    bloodDecalPool: 0x3a0000,
    slashNormal: 0xff7675,
    slashCritical: 0xff3838,
    dashLungeTrail: 0x00cec9,
  },
};

/** Pre-packaged alternative visual themes */
export const COLOR_THEMES: Record<
  string,
  { p1: Partial<WarriorColorScheme>; p2: Partial<WarriorColorScheme> }
> = {
  royal_vs_crimson: {
    p1: { capeBase: 0x224488, armorPrimary: 0x2c4a8a, nameTag: '#f1c40f' },
    p2: { capeBase: 0x881122, armorPrimary: 0x9b1b1b, nameTag: '#e74c3c' },
  },
  emerald_vs_obsidian: {
    p1: { capeBase: 0x1e6f42, armorPrimary: 0x145a32, plume: 0x2ecc71, nameTag: '#2ecc71' },
    p2: { capeBase: 0x2c3e50, armorPrimary: 0x17202a, plume: 0x95a5a6, nameTag: '#bdc3c7' },
  },
  synthwave_neon: {
    p1: {
      capeBase: 0x00cec9,
      armorPrimary: 0x0984e3,
      glow: 0x00cec9,
      plume: 0x00cec9,
      nameTag: '#00cec9',
    },
    p2: {
      capeBase: 0xe84393,
      armorPrimary: 0x6c5ce7,
      glow: 0xfd79a8,
      plume: 0xe84393,
      nameTag: '#fd79a8',
    },
  },
  monochrome_ink: {
    p1: {
      capeBase: 0xdfe6e9,
      armorPrimary: 0xb2bec3,
      glow: 0xffffff,
      plume: 0xffffff,
      nameTag: '#ffffff',
    },
    p2: {
      capeBase: 0x2d3436,
      armorPrimary: 0x1e272e,
      glow: 0x636e72,
      plume: 0x2d3436,
      nameTag: '#d2dae2',
    },
  },
};

// ============================================================================
// 3. MOVEMENT & KINEMATIC PHYSICS CONFIGURATION
// ============================================================================

export interface PhysicsDefaultsConfig {
  groundAcceleration: number;
  skidDeceleration: number;
  airAcceleration: number;
  frictionX: number;
  airFrictionX: number;
  gravity: number;
  maxFallSpeed: number;
  jumpReleaseGravityScale: number;
  fastFallSpeedMultiplier: number;
  wallBounceVelocityThreshold: number;
  wallBounceRestitution: number;
  fighterSeparationDistance: number;
  fighterPushSpeed: number;
  aerialStrikeDownwardSpeed: number;
}

export const PHYSICS_DEFAULTS: PhysicsDefaultsConfig = {
  groundAcceleration: 1800, // Horizontal acceleration on ground (px / sec^2)
  skidDeceleration: 3400, // Deceleration when reversing direction abruptly (skid brake)
  airAcceleration: 900, // Aerial directional control acceleration (px / sec^2)
  frictionX: 0.82, // Deceleration factor on ground when idle
  airFrictionX: 0.94, // Air drag factor
  gravity: 1800, // Vertical gravitational acceleration (pixels / sec^2)
  maxFallSpeed: 950, // Terminal falling velocity (px / sec)
  jumpReleaseGravityScale: 2.2, // Extra gravity applied when jump key is released early
  fastFallSpeedMultiplier: 1.85, // Accelerated downward gravity on intentional fast-fall
  wallBounceVelocityThreshold: 140, // Minimum horizontal speed to trigger a wall bounce
  wallBounceRestitution: 0.4, // Velocity bounce ratio when crashing into arena boundary
  fighterSeparationDistance: 44, // Minimum horizontal distance between fighters to prevent overlap
  fighterPushSpeed: 140, // Speed at which overlapping fighters push apart
  aerialStrikeDownwardSpeed: 620, // Downward dive velocity for Helm Splitter
};

// ============================================================================
// 4. COMBAT BALANCE & FRAME DATA TIMINGS
// ============================================================================

export interface CombatDefaultsConfig {
  parryWindowMs: number;
  parryCounterStunMs: number;
  blockDamageReduction: number;
  blockStaminaCostPerDamage: number;
  blockChipDamageMultiplier: number;
  staminaDepletedExhaustionMs: number;
  staminaRegenDelayMs: number;
  dashSpeed: number;
  dashStaminaCost: number;
  clashRecoilImpulse: number;
  clashRecoilStunMs: number;
  comboChainWindowMs: number;
  counterHitDamageMultiplier: number;
  counterHitStunBonusMs: number;
  whiffRecoveryPenaltyMs: number;
  blockAttackerPushbackImpulse: number;
  // Command Throw & Tech Break
  throwRange: number;
  throwDamage: number;
  throwTechWindowMs: number;
  throwStaminaCost: number;
  // Directional Influence (DI) & Tech Rolls
  directionalInfluenceFactor: number;
  techRollInvulnerabilityMs: number;
  techRollSpeed: number;
  // Crown Burst
  burstMaxMeter: number;
  burstMeterPerDamageTaken: number;
  burstMeterOnParry: number;
  burstShockwaveRadius: number;
  burstShockwaveImpulse: number;
  burstStateDurationMs: number;
  burstSpeedMultiplier: number;
}

export const COMBAT_DEFAULTS: CombatDefaultsConfig = {
  parryWindowMs: 150, // Active parry vulnerability window
  parryCounterStunMs: 650, // Stagger duration on successful parry
  blockDamageReduction: 0.75, // 75% damage absorbed when blocking
  blockStaminaCostPerDamage: 0.8, // Stamina drain per incoming damage point
  blockChipDamageMultiplier: 0.25, // 25% bleed-through damage on block
  staminaDepletedExhaustionMs: 1200, // Exhaustion penalty if stamina hits 0
  staminaRegenDelayMs: 600, // Delay after action before stamina starts recovering
  dashSpeed: 420, // Tactical dodge slide impulse (px / sec)
  dashStaminaCost: 18, // Stamina consumed on combat dash
  clashRecoilImpulse: 60, // Horizontal pushback impulse on weapon clash (px / sec)
  clashRecoilStunMs: 220, // Brief recoil stagger on weapon clash
  comboChainWindowMs: 140, // Buffer window to chain into next combo attack
  counterHitDamageMultiplier: 1.25, // 25% damage bonus on Counter-Hit
  counterHitStunBonusMs: 100, // Extra frame advantage on Counter-Hit
  whiffRecoveryPenaltyMs: 70, // Extra recovery on missed attack
  blockAttackerPushbackImpulse: 40, // Recoil pushback on attacker when attacking a blocking defender
  throwRange: 50, // Point-blank throw range in px
  throwDamage: 22, // Throw damage
  throwTechWindowMs: 140, // Window for defender to tech-break a grab
  throwStaminaCost: 20, // Stamina cost to initiate throw
  directionalInfluenceFactor: 0.1, // Velocity shift applied per axis by DI input
  techRollInvulnerabilityMs: 250, // Invulnerability frames on recovery tech roll
  techRollSpeed: 380, // Roll velocity (px / sec)
  burstMaxMeter: 100, // Maximum burst meter points
  burstMeterPerDamageTaken: 0.5, // 1 point per 2 HP lost
  burstMeterOnParry: 15, // Bonus points awarded on successful parry
  burstShockwaveRadius: 180, // Golden burst combo-breaker pushback radius
  burstShockwaveImpulse: 200, // Pushback velocity applied to opponent on burst
  burstStateDurationMs: 6000, // 6s Golden Burst duration
  burstSpeedMultiplier: 1.18, // 18% speed boost in Golden Burst
};

// ============================================================================
// 5. ATTACKS & COMBAT FRAME DATA
// ============================================================================

export const ATTACK_DEFAULTS: Record<string, AttackDefinition> = {
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
    knockback: { x: 35, y: 0 },
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
    knockback: { x: 65, y: 0 },
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
    knockback: { x: 50, y: 0 },
    hitstunMs: 400,
  },
  slash_combo_2: {
    id: 'slash_combo_2',
    name: 'Rising Slash',
    type: 'combo',
    damage: 16,
    staminaCost: 12,
    windupMs: 130,
    activeMs: 110,
    recoveryMs: 200,
    hitboxWidth: 68,
    hitboxHeight: 56,
    hitboxOffsetX: 40,
    hitboxOffsetY: -28,
    knockback: { x: 40, y: 0 },
    hitstunMs: 340,
  },
  spinning_finisher: {
    id: 'spinning_finisher',
    name: 'Spinning Finisher',
    type: 'combo',
    damage: 24,
    staminaCost: 22,
    windupMs: 180,
    activeMs: 150,
    recoveryMs: 260,
    hitboxWidth: 84,
    hitboxHeight: 60,
    hitboxOffsetX: 36,
    hitboxOffsetY: -22,
    knockback: { x: 75, y: 0 },
    hitstunMs: 480,
  },
  aerial_strike: {
    id: 'aerial_strike',
    name: 'Helm Splitter',
    type: 'aerial',
    damage: 24,
    staminaCost: 25,
    windupMs: 140,
    activeMs: 160,
    recoveryMs: 230,
    hitboxWidth: 72,
    hitboxHeight: 70,
    hitboxOffsetX: 32,
    hitboxOffsetY: -10,
    knockback: { x: 50, y: 0 },
    hitstunMs: 460,
  },
  dash_lunge: {
    id: 'dash_lunge',
    name: 'Evasive Lunge',
    type: 'dash',
    damage: 19,
    staminaCost: 20,
    windupMs: 120,
    activeMs: 100,
    recoveryMs: 240,
    hitboxWidth: 90,
    hitboxHeight: 36,
    hitboxOffsetX: 48,
    hitboxOffsetY: -14,
    knockback: { x: 55, y: 0 },
    hitstunMs: 380,
  },
  low_sweep: {
    id: 'low_sweep',
    name: 'Low Leg Sweep',
    type: 'sweep',
    damage: 16,
    staminaCost: 18,
    windupMs: 180,
    activeMs: 110,
    recoveryMs: 260,
    hitboxWidth: 84,
    hitboxHeight: 28,
    hitboxOffsetX: 44,
    hitboxOffsetY: 24,
    knockback: { x: 45, y: 0 },
    hitstunMs: 460,
  },
  command_throw: {
    id: 'command_throw',
    name: 'Command Throw',
    type: 'throw',
    damage: 22,
    staminaCost: 20,
    windupMs: 120,
    activeMs: 80,
    recoveryMs: 260,
    hitboxWidth: 48,
    hitboxHeight: 64,
    hitboxOffsetX: 30,
    hitboxOffsetY: -20,
    knockback: { x: -65, y: 0 },
    hitstunMs: 480,
  },
};

// ============================================================================
// 6. WARRIOR CLASS ATTRIBUTES & PRESETS
// ============================================================================

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

export const WARRIOR_CLASS_DEFAULTS: Record<string, WarriorClassPreset> = {
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

// ============================================================================
// 7. ARENAS & PLAYGROUND COORDINATES
// ============================================================================

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

export const ARENA_DEFAULTS: Record<string, ArenaConfig> = {
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

// ============================================================================
// 8. BOT AI & DIFFICULTY TUNINGS
// ============================================================================

export interface BotDifficultyConfig {
  decisionIntervalMinMs: number;
  decisionIntervalMaxMs: number;
  reactionDelayMs: number;
  parryChance: number;
  attackChance: number;
  heavyAttackChance: number;
  thrustAttackChance: number;
  sweepAttackChance: number;
  jumpChance: number;
  dashChance: number;
  feintChance: number;
  blockChance: number;
  retreatStaminaThreshold: number;
}

export type BotDifficultyLevel = 'novice' | 'adept' | 'expert' | 'master';

export const AI_DEFAULTS: Record<BotDifficultyLevel, BotDifficultyConfig> = {
  novice: {
    decisionIntervalMinMs: 160,
    decisionIntervalMaxMs: 280,
    reactionDelayMs: 220,
    parryChance: 0.2,
    attackChance: 0.45,
    heavyAttackChance: 0.15,
    thrustAttackChance: 0.15,
    sweepAttackChance: 0.15,
    jumpChance: 0.15,
    dashChance: 0.12,
    feintChance: 0.0,
    blockChance: 0.35,
    retreatStaminaThreshold: 25,
  },
  adept: {
    decisionIntervalMinMs: 90,
    decisionIntervalMaxMs: 160,
    reactionDelayMs: 130,
    parryChance: 0.55,
    attackChance: 0.65,
    heavyAttackChance: 0.26,
    thrustAttackChance: 0.24,
    sweepAttackChance: 0.24,
    jumpChance: 0.3,
    dashChance: 0.3,
    feintChance: 0.18,
    blockChance: 0.55,
    retreatStaminaThreshold: 20,
  },
  expert: {
    decisionIntervalMinMs: 60,
    decisionIntervalMaxMs: 120,
    reactionDelayMs: 105,
    parryChance: 0.72,
    attackChance: 0.72,
    heavyAttackChance: 0.28,
    thrustAttackChance: 0.26,
    sweepAttackChance: 0.26,
    jumpChance: 0.4,
    dashChance: 0.4,
    feintChance: 0.28,
    blockChance: 0.6,
    retreatStaminaThreshold: 18,
  },
  master: {
    decisionIntervalMinMs: 40,
    decisionIntervalMaxMs: 90,
    reactionDelayMs: 90,
    parryChance: 0.85,
    attackChance: 0.8,
    heavyAttackChance: 0.3,
    thrustAttackChance: 0.28,
    sweepAttackChance: 0.28,
    jumpChance: 0.48,
    dashChance: 0.45,
    feintChance: 0.35,
    blockChance: 0.7,
    retreatStaminaThreshold: 15,
  },
};

// ============================================================================
// 9. CAMERA, CINEMATICS & HIT-STOP VFX CONFIGURATION
// ============================================================================

export interface CameraAndVFXDefaultsConfig {
  camera: {
    zoom: {
      closeQuarters: number;
      wide: number;
      closeThreshold: number;
      wideThreshold: number;
      lerpSpeed: number;
    };
    shake: {
      clash: { duration: number; intensity: number };
      parry: { duration: number; intensity: number };
      guardCrush: { duration: number; intensity: number };
      heavyHit: { duration: number; intensity: number };
      fatalDecap: { duration: number; intensity: number };
      suddenDeath: { duration: number; intensity: number };
    };
  };
  hitStop: {
    clash: number;
    burst: number;
    techBreak: number;
    throw: number;
    block: number;
    decapitation: number;
    riposte: number;
    sweepTrip: number;
    counterHit: number;
    criticalHit: number;
    normalHit: number;
  };
  particles: {
    bloodMaxDecals: number;
    bloodSpurtParticles: number;
    sparkParticles: number;
  };
}

export const CAMERA_AND_VFX_DEFAULTS: CameraAndVFXDefaultsConfig = {
  camera: {
    zoom: {
      closeQuarters: 1.05,
      wide: 0.96,
      closeThreshold: 260,
      wideThreshold: 520,
      lerpSpeed: 4.5,
    },
    shake: {
      clash: { duration: 150, intensity: 0.008 },
      parry: { duration: 180, intensity: 0.012 },
      guardCrush: { duration: 160, intensity: 0.015 },
      heavyHit: { duration: 150, intensity: 0.014 },
      fatalDecap: { duration: 260, intensity: 0.022 },
      suddenDeath: { duration: 220, intensity: 0.016 },
    },
  },
  hitStop: {
    clash: 120, // Dramatic double-freeze on sword clash
    burst: 60,
    techBreak: 100,
    throw: 70,
    block: 30, // Subtle block hit-stop
    decapitation: 180, // Heavy fatal freeze
    riposte: 120,
    sweepTrip: 90,
    counterHit: 100,
    criticalHit: 85,
    normalHit: 50,
  },
  particles: {
    bloodMaxDecals: 60,
    bloodSpurtParticles: 16,
    sparkParticles: 14,
  },
};

// ============================================================================
// 10. MATCH RULES & HUD CONFIGURATION
// ============================================================================

export interface RulesAndHUDDefaultsConfig {
  roundsToWin: number;
  roundDurationSeconds: number;
  countdownSeconds: number;
  suddenDeathHealthPercent: number;
  hud: {
    lowHealthThresholdPercent: number;
    lowStaminaThresholdPercent: number;
    showControlsOverlay: boolean;
  };
}

export const RULES_AND_HUD_DEFAULTS: RulesAndHUDDefaultsConfig = {
  roundsToWin: 2,
  roundDurationSeconds: 99,
  countdownSeconds: 3,
  suddenDeathHealthPercent: 35, // Sudden death tiebreaker starting health
  hud: {
    lowHealthThresholdPercent: 25,
    lowStaminaThresholdPercent: 20,
    showControlsOverlay: true,
  },
};

// ============================================================================
// 11. DISPLAY & AUDIO
// ============================================================================

export interface DisplayDefaultsConfig {
  canvasWidth: number;
  canvasHeight: number;
  targetFps: number;
  fixedTimeStepSec: number;
  defaultFloorY: number;
  defaultLeftBoundX: number;
  defaultRightBoundX: number;
  defaultCeilingY: number;
}

export const DISPLAY_DEFAULTS: DisplayDefaultsConfig = {
  canvasWidth: 1280,
  canvasHeight: 720,
  targetFps: 60,
  fixedTimeStepSec: 1 / 60,
  defaultFloorY: 625,
  defaultLeftBoundX: 80,
  defaultRightBoundX: 1200,
  defaultCeilingY: 60,
};

export interface AudioDefaultsConfig {
  defaultMasterVolume: number;
  defaultMuted: boolean;
  baseSwordWhooshFreq: number;
  baseMetalClangFreqs: readonly number[];
  baseParryChimeFreqs: readonly number[];
  baseFleshCutFreq: number;
  baseDecapitationFreq: number;
}

export const AUDIO_DEFAULTS: AudioDefaultsConfig = {
  defaultMasterVolume: 0.5,
  defaultMuted: false,
  baseSwordWhooshFreq: 380,
  baseMetalClangFreqs: [840, 1260],
  baseParryChimeFreqs: [1400, 1800, 2400],
  baseFleshCutFreq: 180,
  baseDecapitationFreq: 140,
};

// ============================================================================
// 12. MASTER CONFIGURATION ROOT & GAMEPLAY PRESETS
// ============================================================================

export interface GameDefaults {
  controllers: ControllerDefaultsConfig;
  colors: ColorDefaultsConfig;
  physics: PhysicsDefaultsConfig;
  combat: CombatDefaultsConfig;
  attacks: Record<string, AttackDefinition>;
  warriors: Record<string, WarriorClassPreset>;
  arenas: Record<string, ArenaConfig>;
  ai: Record<BotDifficultyLevel, BotDifficultyConfig>;
  vfx: CameraAndVFXDefaultsConfig;
  rules: RulesAndHUDDefaultsConfig;
  display: DisplayDefaultsConfig;
  audio: AudioDefaultsConfig;
}

/**
 * Single source of truth containing all game constants.
 */
export const GAME_DEFAULTS: GameDefaults = {
  controllers: CONTROLLER_DEFAULTS,
  colors: COLOR_DEFAULTS,
  physics: PHYSICS_DEFAULTS,
  combat: COMBAT_DEFAULTS,
  attacks: ATTACK_DEFAULTS,
  warriors: WARRIOR_CLASS_DEFAULTS,
  arenas: ARENA_DEFAULTS,
  ai: AI_DEFAULTS,
  vfx: CAMERA_AND_VFX_DEFAULTS,
  rules: RULES_AND_HUD_DEFAULTS,
  display: DISPLAY_DEFAULTS,
  audio: AUDIO_DEFAULTS,
};

/** Complete game-wide gameplay presets */
export const GAMEPLAY_PRESETS: Record<string, (base: GameDefaults) => void> = {
  standard: () => {
    resetGameDefaults();
  },
  tournament: cfg => {
    cfg.combat.parryWindowMs = 110; // Tighter parry timing
    cfg.combat.blockChipDamageMultiplier = 0.35; // Higher chip bleed
    cfg.combat.counterHitDamageMultiplier = 1.35;
    cfg.rules.roundsToWin = 3;
    cfg.physics.fastFallSpeedMultiplier = 2.0;
  },
  casual: cfg => {
    cfg.combat.parryWindowMs = 210; // Forgiving parry window
    cfg.combat.blockDamageReduction = 0.85; // 85% damage absorbed
    cfg.combat.dashStaminaCost = 10;
    cfg.combat.staminaDepletedExhaustionMs = 600;
  },
  turbo: cfg => {
    cfg.physics.groundAcceleration = 2400;
    cfg.combat.dashSpeed = 550;
    cfg.combat.burstSpeedMultiplier = 1.35;
    for (const key of Object.keys(cfg.attacks)) {
      const atk = cfg.attacks[key];
      if (atk) {
        atk.windupMs = Math.round(atk.windupMs * 0.8);
        atk.recoveryMs = Math.round(atk.recoveryMs * 0.8);
      }
    }
  },
  lethal_ironman: cfg => {
    cfg.rules.roundsToWin = 1;
    cfg.combat.counterHitDamageMultiplier = 2.0;
    for (const key of Object.keys(cfg.attacks)) {
      const atk = cfg.attacks[key];
      if (atk) {
        atk.damage = Math.round(atk.damage * 1.8);
      }
    }
  },
};

// ============================================================================
// 13. DYNAMIC CONFIGURATION & PERSISTENCE API
// ============================================================================

/** Helper to deep clone configuration objects */
export function cloneDefaults<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/** Original pristine factory snapshot */
const ORIGINAL_FACTORY_SNAPSHOT = cloneDefaults(GAME_DEFAULTS);

/**
 * Deep merge partial updates into the live GAME_DEFAULTS.
 */
export function updateGameDefaults(overrides: Partial<GameDefaults>): GameDefaults {
  const deepMerge = (target: any, source: any) => {
    for (const key of Object.keys(source)) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        if (!target[key]) target[key] = {};
        deepMerge(target[key], source[key]);
      } else {
        target[key] = source[key];
      }
    }
  };

  deepMerge(GAME_DEFAULTS, overrides);
  return GAME_DEFAULTS;
}

/**
 * Reset all game settings back to the initial pristine state.
 */
export function resetGameDefaults(): GameDefaults {
  const fresh = cloneDefaults(ORIGINAL_FACTORY_SNAPSHOT);
  Object.assign(GAME_DEFAULTS, fresh);
  return GAME_DEFAULTS;
}

/**
 * Apply one of the built-in comprehensive gameplay presets.
 */
export function applyGamePreset(presetName: keyof typeof GAMEPLAY_PRESETS): GameDefaults {
  const modifier = GAMEPLAY_PRESETS[presetName];
  if (modifier) {
    resetGameDefaults();
    modifier(GAME_DEFAULTS);
  }
  return GAME_DEFAULTS;
}

/**
 * Apply a pre-configured controller profile.
 */
export function applyControllerProfile(profileName: keyof typeof KEYBOARD_PROFILES): void {
  const profile = KEYBOARD_PROFILES[profileName];
  if (profile) {
    Object.assign(GAME_DEFAULTS.controllers.keyboard, profile);
  }
}

/**
 * Apply a pre-configured color theme.
 */
export function applyColorTheme(themeName: keyof typeof COLOR_THEMES): void {
  const theme = COLOR_THEMES[themeName];
  if (theme) {
    if (theme.p1) Object.assign(GAME_DEFAULTS.colors.p1, theme.p1);
    if (theme.p2) Object.assign(GAME_DEFAULTS.colors.p2, theme.p2);
  }
}

/**
 * Export the current active game configuration as formatted JSON.
 */
export function exportGameDefaultsJSON(): string {
  return JSON.stringify(GAME_DEFAULTS, null, 2);
}

/**
 * Import a game configuration from a JSON string.
 */
export function importGameDefaultsJSON(jsonStr: string): boolean {
  try {
    const parsed = JSON.parse(jsonStr);
    if (parsed && typeof parsed === 'object') {
      updateGameDefaults(parsed);
      return true;
    }
  } catch (err) {
    console.error('[Config] Failed to parse imported JSON defaults:', err);
  }
  return false;
}

/**
 * Save active defaults into browser localStorage.
 */
export function saveDefaultsToStorage(storageKey: string = 'last_crown_game_defaults_v1'): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(storageKey, exportGameDefaultsJSON());
    } catch {
      // storage unavailable
    }
  }
}

/**
 * Load saved defaults from browser localStorage.
 */
export function loadDefaultsFromStorage(
  storageKey: string = 'last_crown_game_defaults_v1'
): boolean {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        return importGameDefaultsJSON(raw);
      }
    } catch {
      // ignore
    }
  }
  return false;
}

/**
 * Utility helper to test if an active key set contains any key from a configured bindings array.
 */
export function matchesBinding(activeKeys: Set<string>, bindings: readonly string[]): boolean {
  for (let i = 0; i < bindings.length; i++) {
    const key = bindings[i];
    if (key && activeKeys.has(key)) return true;
  }
  return false;
}

/**
 * Format a keyboard event code into a human-readable display string.
 * Example: 'KeyA' -> 'A', 'Space' -> 'SPACE', 'ShiftLeft' -> 'SHIFT'
 */
export function formatKeyCode(code: string): string {
  if (!code) return '';
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  if (code.startsWith('Numpad')) return 'NUM ' + code.slice(6);
  if (code === 'Space') return 'SPACE';
  if (code.startsWith('Shift')) return 'SHIFT';
  if (code.startsWith('Alt')) return 'ALT';
  if (code.startsWith('Control')) return 'CTRL';
  if (code.startsWith('Arrow')) return code.slice(5).toUpperCase();
  return code.toUpperCase();
}
