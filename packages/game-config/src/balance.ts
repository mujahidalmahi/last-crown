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
    clashRecoilImpulse: 240, // Horizontal pushback impulse on weapon clash (px / sec)
    clashRecoilStunMs: 220, // Brief recoil stagger on weapon clash
    comboChainWindowMs: 140, // Buffer window to chain into next combo attack
    counterHitDamageMultiplier: 1.25, // 25% damage bonus on Counter-Hit
    counterHitStunBonusMs: 100, // Extra frame advantage on Counter-Hit
    whiffRecoveryPenaltyMs: 70, // Extra recovery on missed attack (footsies / whiff punish)
    blockAttackerPushbackImpulse: 130, // Recoil pushback on attacker when attacking a blocking defender
    // Command Throw & Tech Break
    throwRange: 50, // Point-blank throw range in px
    throwDamage: 22, // Throw damage
    throwTechWindowMs: 140, // Window for defender to tech-break a grab
    throwStaminaCost: 20, // Stamina cost to initiate throw
    // Directional Influence (DI) & Tech Rolls
    directionalInfluenceFactor: 90, // Velocity shift applied per axis by DI input
    techRollInvulnerabilityMs: 250, // Invulnerability frames on recovery tech roll
    techRollSpeed: 380, // Roll velocity (px / sec)
    // Crown Burst
    burstMaxMeter: 100, // Maximum burst meter points
    burstMeterPerDamageTaken: 0.5, // 1 point per 2 HP lost
    burstMeterOnParry: 15, // Bonus points awarded on successful parry
    burstShockwaveRadius: 180, // Golden burst combo-breaker pushback radius
    burstShockwaveImpulse: 460, // Pushback velocity applied to opponent on burst
    burstStateDurationMs: 6000, // 6s Golden Burst duration
    burstSpeedMultiplier: 1.18, // 18% speed boost in Golden Burst
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
    fastFallSpeedMultiplier: 1.85, // Accelerated downward gravity on intentional fast-fall (Down key in air)
    wallBounceVelocityThreshold: 140, // Minimum horizontal speed to trigger a wall bounce
    wallBounceRestitution: 0.4, // Velocity bounce ratio when crashing into arena boundary
    fighterSeparationDistance: 44, // Minimum horizontal distance between fighters to prevent overlap
    fighterPushSpeed: 140, // Speed at which fighters push apart when overlapping
    aerialStrikeDownwardSpeed: 620, // Downward dive velocity for Helm Splitter
  },
  rules: {
    roundsToWin: 2,
    roundDurationSeconds: 99,
    countdownSeconds: 3,
    suddenDeathHealthPercent: 35, // Sudden death tiebreaker starting health
  },
} as const;
