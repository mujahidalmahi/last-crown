# Mega Upgrade: World-Class Fighting Game Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

This implementation plan delivers the complete mega-upgrade defined in `advices.md` to elevate *Last-Crown* into a world-class retro browser fighter with zero money investment:
1. **Combat Depth**: Universal breakable Command Grabs & Throws (`throw`/`grab`), Directional Influence (DI), Knockdown Tech Rolls, Crown Burst / Roman Cancel Gauge (100 pts), and Archetype Signature Passives (Knight Bastion Riposte, Duelist Windblade Flurry, Vanguard Super Armor, Marauder Blood Siphon).
2. **Audio & Game Feel**: Multi-stem adaptive BGM (dynamic low-HP tension stem), 3-layer transient impact stacking (click, mid crunch, sub-bass punch), and tournament announcer cues.
3. **Ergonomics & HUD**: Crown Burst bar in `GameHUD`, expanded controls in `KeyboardInputAdapter` (`G` for grab, `B` for burst) and `MobileGameControls`, and combat notifications.
4. **Game Modes**: 5-stage Arcade Gauntlet campaign (`/arcade`) with the "Shadow Sovereign" boss, and Competitive Training Dojo (`/training`) with frame data and hitbox visualizers.
5. **Replays & Virality**: Deterministic 5KB match replay recording and shareable URL hash generator.

---

## File Structure & Responsibilities

| File | Change | Responsibility |
| :--- | :--- | :--- |
| `packages/shared/src/types/input.ts` | Modify | Add `throw` and `burst` boolean flags to `PlayerInputMessage`. |
| `packages/shared/src/types/warrior.ts` | Modify | Add `burstMeter` (0–100), `isBurstActive`, `isGrabbed`, `grabBreakWindowMs` to warrior states. |
| `packages/shared/src/types/combat.ts` | Modify | Add `throw` attack type and `isThrowTech` / `isBurstBreak` to `HitResult`. |
| `packages/shared/src/constants/balance.ts` | Modify | Define throw range, damage, tech window, DI strength, and burst meter gain rates. |
| `packages/game-config/src/attacks.ts` | Modify | Add `command_throw` attack definition with frame data. |
| `packages/game-core/src/combat/CombatController.ts` | Modify | Handle command grab detection, throw tech breaking, burst execution, and super armor. |
| `packages/game-core/src/simulation/WarriorEntity.ts` | Modify | Process `throw` and `burst` inputs, calculate Directional Influence (DI) and Tech Rolls. |
| `packages/game-core/src/simulation/GameSimulation.ts` | Modify | Synchronize burst meter accumulation and burst shockwaves across simulation ticks. |
| `packages/game-core/tests/combat-simulation.test.ts` | Modify | Add unit tests for throw, throw tech, burst breaker, and directional influence. |
| `apps/web/src/game/audio/SoundManager.ts` | Modify | Add 3-layer transient impact stacking, burst shockwave sound, throw clash, and tension stems. |
| `apps/web/src/game/input/KeyboardInputAdapter.ts` | Modify | Map `KeyG` / `KeyF` to grab/throw, `KeyB` to burst, track DI inputs. |
| `apps/web/src/features/game/MobileGameControls.tsx` | Modify | Add dedicated Grab and Burst touch buttons with responsive spacing. |
| `apps/web/src/features/game/GameHUD.tsx` | Modify | Render the golden Crown Burst gauge and announcer banners. |
| `apps/web/src/app/arcade/page.tsx` | Create | 5-stage singleplayer Arcade Gauntlet ladder ending with "The Shadow Sovereign". |
| `apps/web/src/app/training/page.tsx` | Create | Competitive Training Dojo with dummy AI, frame data overlay, and hitbox display. |
| `apps/web/src/app/game/page.tsx` | Modify | Add "ARCADE GAUNTLET" and "TRAINING DOJO" buttons to the main menu screen. |

---

## Tasks

### Task 1: Core Combat Protocol & Data Models
- [x] Add `throw` and `burst` input triggers to `PlayerInputMessage` in `packages/shared/src/types/input.ts`.
- [x] Add `burstMeter: number`, `isBurstActive: boolean`, `isGrabbed: boolean`, `grabBreakWindowMs: number` to `WarriorSnapshot` in `packages/shared/src/types/warrior.ts`.
- [x] Add `throw` to `AttackType` in `packages/shared/src/types/combat.ts`.
- [x] Define `command_throw` in `packages/game-config/src/attacks.ts` (Damage: 22, Range: 45px, Windup: 120ms, Active: 80ms, Recovery: 280ms).
- [x] Configure balance parameters for Throw, DI, and Burst in `packages/shared/src/constants/balance.ts`.
- [x] Build shared packages with `npm run build:packages`.

### Task 2: Combat Engine Implementation (Throws, DI, Burst & Passives)
- [x] In `packages/game-core/src/combat/CombatController.ts`, implement:
  - Command Grab execution: bypasses blocking; starts 120ms tech window.
  - Throw Tech Break: if defender inputs `throw` during tech window, negate throw and shove fighters apart.
  - Crown Burst activation: resets hitstun, launches golden shockwave repelling opponent.
  - Vanguard Super Armor: absorbs light attack during heavy windup without hitstun.
  - Marauder Blood Siphon: recovers 6 HP on clean counter-hit.
  - Knight Bastion Riposte: restores 20 SP on successful parry.
- [x] In `packages/game-core/src/simulation/WarriorEntity.ts`:
  - Calculate Directional Influence (DI) adjusting knockback velocity based on movement input.
  - Calculate Knockdown Tech Roll on floor collision when Dash is tapped.
  - Accumulate burst meter when taking damage (+1 per 2 HP lost) and on clean parry (+15 pts).
- [x] Write unit tests in `packages/game-core/tests/combat-simulation.test.ts` verifying throw execution, throw tech break, burst break, and DI math.

### Task 3: In-Engine Sensory Audio & Transient Stacking
- [x] In `apps/web/src/game/audio/SoundManager.ts`:
  - Implement 3-layer transient impact stacking (high click + mid body crunch + sub-bass punch).
  - Add `playCommandThrow()` and `playTechBreak()` sound methods.
  - Add `playCrownBurst()` explosive golden shockwave sound.
  - Add dynamic tension music stem (speed up tempo / double-time hi-hats when player HP < 30%).

### Task 4: Input Adapters & Controls Integration
- [x] In `apps/web/src/game/input/KeyboardInputAdapter.ts`:
  - Map `KeyG` / `KeyF` to `throw`.
  - Map `KeyB` / `KeyV` to `burst`.
  - Transmit directional influence vectors during hitstun.
- [x] In `apps/web/src/features/game/MobileGameControls.tsx`:
  - Add dedicated Grab (`🤼`) and Burst (`💥`) touch action buttons.
  - Add touch DI input support.

### Task 5: HUD Crown Burst Gauge & Announcements
- [x] In `apps/web/src/features/game/GameHUD.tsx`:
  - Add animated golden Crown Burst gauge bar under stamina.
  - Add pulsing "BURST READY" glow when at 100%.
  - Trigger "BURST!", "TECH BREAK!", "THROW!" announcement overlays.
  - Add Replay URL generator button on the victory card.

### Task 6: New Game Modes (Arcade Gauntlet & Training Dojo)
- [x] Create `apps/web/src/app/arcade/page.tsx` for 5-stage singleplayer campaign ladder:
  - Stage 1: Sir Cedric (Colosseum)
  - Stage 2: Grimwood (Dragonland)
  - Stage 3: Valerius (StormForce)
  - Stage 4: Aurelia (Seaside)
  - Stage 5: "The Shadow Sovereign" (Final Boss with boosted stats & dual blades)
  - Score counter, speedrun timer, and victory screen.
- [x] Create `apps/web/src/app/training/page.tsx` with:
  - Real-time Frame Data HUD (Windup, Active, Recovery, Frame Advantage).
  - Dummy AI behavior selector (Stand, Block All, Jump, Attack).
  - Hitbox visualizer toggle.
- [x] Update `apps/web/src/app/game/page.tsx` with "ARCADE GAUNTLET" and "TRAINING DOJO" buttons.

### Task 7: Full Monorepo Build & Automated Verification
- [x] Build all packages with `npm run build:packages`.
- [x] Run full monorepo typecheck with `npm run typecheck`.
- [x] Run full test suite with `npm test`.
