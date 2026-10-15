export const BALANCE_CONFIG = {
  combat: {
    parryWindowMs: 150, // Active parry vulnerability window
    parryCounterStunMs: 650, // How long attacker is staggered on parry
    blockDamageReduction: 0.75, // 75% damage absorbed when blocking
    blockStaminaCostPerDamage: 0.8, // Stamina drain per incoming damage point
    blockChipDamageMultiplier: 0.25, // 25% bleed-through damage on block
    staminaDepletedExhaustionMs: 1200, // Exhaustion penalty if stamina hits 0
    staminaRegenDelayMs: 600, // Delay after action before stamina starts recovering
    dashSpeed: 420, // Tactical dodge slide impulse (px / sec)
    dashStaminaCost: 18, // Stamina consumed on combat dash
  },
  movement: {
    groundAcceleration: 1800, // Horizontal acceleration on ground (px / sec^2)
    skidDeceleration: 3400, // Deceleration when reversing direction abruptly (skid brake)
    airAcceleration: 900, // Aerial directional control acceleration (px / sec^2)
    frictionX: 0.82, // Deceleration factor on ground when idle
    airFrictionX: 0.94, // Air drag factor
    gravity: 1800, // Vertical gravitational acceleration (pixels / sec^2)
    maxFallSpeed: 950,
    jumpReleaseGravityScale: 2.2, // Extra gravity applied when jump is released early (variable jump)
  },
  rules: {
    roundsToWin: 2,
    roundDurationSeconds: 99,
    countdownSeconds: 3,
  },
} as const;
