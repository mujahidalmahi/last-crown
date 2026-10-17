# Frame Data & Combat Archetypes

All timings in **LAST CROWN** are based on a fixed **60Hz simulation rate** ($1\text{ frame} \approx 16.66\text{ms}$).

---

## 1. Attack Move Frame Data

| Attack ID           | Move Name             | Type     | Startup (Frames / ms) | Active (Frames / ms) | Recovery (Frames / ms) | Total Duration | Damage | Stamina Cost | On Hit Stun | Knockback $(X, Y)$ |
| :------------------ | :-------------------- | :------- | :-------------------- | :------------------- | :--------------------- | :------------- | :----- | :----------- | :---------- | :----------------- |
| `light_slash`       | **Light Slash**       | Slash    | 10f (160ms)           | 7f (120ms)           | 13f (220ms)            | 30f (500ms)    | 14     | 15           | 19f (320ms) | $+180, -80$        |
| `slash_combo_2`     | **Rising Slash**      | Combo    | 8f (130ms)            | 7f (110ms)           | 12f (200ms)            | 27f (440ms)    | 16     | 12           | 20f (340ms) | $+210, -100$       |
| `spinning_finisher` | **Spinning Finisher** | Combo    | 11f (180ms)           | 9f (150ms)           | 16f (260ms)            | 36f (590ms)    | 24     | 22           | 29f (480ms) | $+360, -130$       |
| `heavy_strike`      | **Heavy Strike**      | Overhead | 20f (340ms)           | 10f (160ms)          | 24f (400ms)            | 54f (900ms)    | 28     | 30           | 31f (520ms) | $+340, -160$       |
| `thrust`            | **Forward Thrust**    | Thrust   | 13f (220ms)           | 6f (100ms)           | 17f (280ms)            | 36f (600ms)    | 18     | 20           | 24f (400ms) | $+260, -40$        |
| `dash_lunge`        | **Evasive Lunge**     | Dash     | 7f (120ms)            | 6f (100ms)           | 14f (240ms)            | 27f (460ms)    | 19     | 20           | 23f (380ms) | $+300, -60$        |
| `aerial_strike`     | **Helm Splitter**     | Aerial   | 8f (140ms)            | 10f (160ms)          | 14f (230ms)            | 32f (530ms)    | 24     | 25           | 28f (460ms) | $+240, +150$       |
| `low_sweep`         | **Low Leg Sweep**     | Sweep    | 11f (180ms)           | 7f (110ms)           | 16f (260ms)            | 34f (550ms)    | 16     | 18           | 28f (460ms) | $+230, -80$        |

---

## 2. Defensive Mechanics & Posture Timings

| Mechanic                | Window / Duration               | Stamina Impact                      | Effect & Frame Advantage                                                                                           |
| :---------------------- | :------------------------------ | :---------------------------------- | :----------------------------------------------------------------------------------------------------------------- |
| **Parry Window**        | **180ms** (11 frames)           | Costs 20 stamina                    | Completely negates incoming damage. Staggers attacker for **600ms** (36 frames) with counter-attack vulnerability. |
| **Parry Whiff Penalty** | **450ms** (27 frames)           | Costs 20 stamina                    | Defender locked in recovery; open to punish.                                                                       |
| **Guarding (Block)**    | Continuous hold                 | Absorbs 75% damage; 25% chip damage | Costs incoming damage as stamina. Stun on block: **200ms**. Defender cannot be launched airborne while grounded.   |
| **Guard Break**         | Triggered at 0 stamina on block | Complete depletion                  | Stuns defender for **450ms** (27 frames). Followed by exhaustion state.                                            |
| **Stamina Exhaustion**  | **1200ms** (72 frames)          | 0 stamina                           | Movement speed halved (50%). Cannot attack, dash, jump, block, or parry.                                           |
| **Attack Feint**        | Can cancel during Windup        | Costs 10 stamina                    | Cancels active windup into immediate Dash, Parry, or Guard.                                                        |
| **Tactical Dash**       | 200ms distance traversal        | Costs 15 stamina                    | Rapid grounded repositioning at 550 px/sec.                                                                        |

---

## 3. Warrior Class Archetypes

```mermaid
quadrantChart
    title Warrior Archetype Matrix (Speed vs Survivability)
    x-axis Low Mobility --> High Mobility
    y-axis Low Health / Posture --> High Health / Posture
    quadrant-1 Heavy Bruisers
    quadrant-2 Pure Tanks
    quadrant-3 Glass Cannons
    quadrant-4 Agile Strikers
    Crown Knight: [0.50, 0.50]
    Exiled Fencer (Duelist): [0.85, 0.25]
    Northern Jarl (Vanguard): [0.20, 0.85]
```

### 1. Crown Knight (_The Iron Sovereign_)

- **Health**: 100 HP | **Stamina**: 100 SP
- **Stamina Regen**: 25 SP / sec
- **Movement**: Walk Speed 300 px/s | Jump Velocity -600 px/s | Weight 1.0
- **Hurtbox**: $44 \times 80\text{ px}$
- **Strengths**: Balanced all-rounder; excellent frame traps; reliable guard resilience.

### 2. Exiled Fencer (_The Windblade_)

- **Health**: 85 HP | **Stamina**: 110 SP
- **Stamina Regen**: 35 SP / sec
- **Movement**: Walk Speed 360 px/s | Jump Velocity -640 px/s | Weight 0.85
- **Hurtbox**: $38 \times 78\text{ px}$
- **Strengths**: Exceptional speed; rapid stamina regeneration; deadly thrust range.
- **Weaknesses**: Fragile health pool; guard broken quickly if pressured.

### 3. Northern Jarl (_The Hammer of the Realm_)

- **Health**: 125 HP | **Stamina**: 90 SP
- **Stamina Regen**: 20 SP / sec
- **Movement**: Walk Speed 250 px/s | Jump Velocity -540 px/s | Weight 1.3
- **Hurtbox**: $52 \times 84\text{ px}$
- **Strengths**: Massive health pool; devastating heavy chops; high knockback resistance.
- **Weaknesses**: Slow movement and recovery; sluggish stamina regeneration.
