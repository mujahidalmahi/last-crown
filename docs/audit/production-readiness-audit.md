# LAST CROWN — Production Readiness Audit Record

**Date**: 2026-10-14  
**Project**: LAST CROWN ("Only One Shall Reign.")  
**Scope**: Full repository audit across core simulation, multiplayer systems, UI/UX, security, performance, audio, accessibility, tests, and deployment readiness.

---

## 1. Executive Summary

An evidence-based engineering audit was performed across all workspaces (`packages/shared`, `packages/game-config`, `packages/game-core`, `apps/server`, and `apps/web`). While the core architecture presents a solid modular foundation (decoupling the deterministic headless simulation from Phaser presentation and Colyseus networking), several critical functional gaps and runtime defects currently prevent the game from being production-ready.

The primary blockers identified include:

1. **Multiplayer Room Freeze**: Colyseus `BattleRoom` halts simulation updates during `round_over`, permanently preventing transition to subsequent rounds.
2. **Multiplayer UI Disconnect**: The web application's `/room` view lacks game canvas integration and navigates away to offline mode, breaking multiplayer playability.
3. **Double-KO Game Lock**: Simultaneous lethal damage halts round progression without declaring a draw or advancing the round.
4. **Missing Player Statistics Persistence**: Complete absence of `localStorage` statistics tracking, streak management, and dashboard display (Phase 5 requirement).
5. **Infinite Blocking & Missing Exhaustion Penalty**: Fighters can block indefinitely with zero stamina; the 1200ms exhaustion penalty is defined in configuration but unused.
6. **Supernatural Bot AI**: Bot exhibits 0ms frame-perfect parrying on every attack and lacks difficulty tiers.
7. **Audio Oscillator Flooding & Context Leak**: Web Audio synthesizer triggers oscillators on every frame when keys are held down, and `AudioContext` is never disposed on page changes.
8. **Broken Post-Match Flow**: Lack of Rematch, Main Menu, or Stats buttons leaves players stranded upon match completion.
9. **Environment Configuration Defect**: The game server ignores standard cloud `$PORT` environment variables and lacks graceful shutdown hooks.
10. **E2E Smoke Test Regressions**: Playwright tests fail due to semantic HTML header hierarchy conflicts (`<h1>` duplication).

---

## 2. Risk Classification & Prioritized Defect Register

### Critical Defects

| ID     | Component     | Defect & Impact                                                                                                                                                                                    | Evidence                                                                                                                                                                         | Proposed Remedy                                                                                                                                              | Verification Method                                                     |
| :----- | :------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------- |
| **C1** | `apps/server` | **Server stalls permanently in `round_over`**. In multiplayer matches, when round 1 ends, the room freezes and never starts round 2.                                                               | `BattleRoom.ts:203`: `if (this.state.matchState !== 'in_progress') return;` drops all simulation updates during `round_over`, so `_roundTransitionTimerMs` is never decremented. | Allow simulation step to continue when `matchState === 'round_over'`.                                                                                        | Colyseus room integration test verifying round 1 -> round 2 transition. |
| **C2** | `apps/web`    | **Multiplayer Duel Chamber disconnected from game engine**. Host/Guest can create/join a room, but the room page has no game canvas and buttons navigate to `/play` (which disconnects from room). | `apps/web/src/app/room/page.tsx:143-147` renders link to `/play`, leaving room on unmount. `BattleScene.ts` lacks multiplayer state synchronization.                             | Mount `PhaserGameContainer` in multiplayer mode within `RoomPage` upon 2-player connection; wire input dispatching and state sync to active Colyseus `Room`. | Multi-client integration test and browser verification.                 |
| **C3** | `game-core`   | **Simultaneous Double-KO freezes match**. If both fighters hit 0 HP simultaneously with timer > 0, the game never enters round over.                                                               | `GameSimulation.ts:184-200`: `roundWinner` is `null` on double KO; `if (roundWinner !== null \|\| this._roundTimerSec <= 0)` evaluates to false.                                 | Treat double-KO explicitly as a draw round and initiate transition to `round_over`.                                                                          | Vitest unit test in `combat-simulation.test.ts`.                        |

### High Defects

| ID     | Component      | Defect & Impact                                                                                                                                             | Evidence                                                                                            | Proposed Remedy                                                                                                                                         | Verification Method                                           |
| :----- | :------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------ | :------------------------------------------------------------ |
| **H1** | `shared`/`web` | **Statistics system completely missing**. No tracking of matches played, wins, losses, win streak, best streak, or score; zero browser persistence.         | Zero occurrences of `localStorage` in entire repository; no statistics manager or HUD/home display. | Implement `StatisticsManager` in `@last-crown/shared` with Zod schema, corrupted data recovery, duplicate match protection, and UI display in HUD/Home. | Unit tests in `shared` + integration tests for stats updates. |
| **H2** | `game-core`    | **Infinite blocking & missing stamina exhaustion**. Holding block with 0 stamina still blocks 75% damage; `staminaDepletedExhaustionMs` (1200ms) is unused. | `CombatController.ts:137` checks `isBlockingInput` without verifying `stamina > 0`.                 | Enforce guard break when blocking with 0 stamina or depleted by incoming strike; apply exhaustion penalty.                                              | Vitest unit test in `combat-simulation.test.ts`.              |
| **H3** | `game-core`    | **Supernatural 0ms Bot reaction time & no difficulty scaling**. Bot parries 100% of attacks in range with 0ms delay; no novice/adept/master settings.       | `WarriorBotAI.ts:25` returns `parry: true` unconditionally when player starts windup in range.      | Add Bot difficulty profiles ('novice', 'adept', 'master') with reaction latency, read probabilities, and configurable difficulty.                       | Unit tests in `ai.test.ts`.                                   |

### Medium Defects

| ID     | Component     | Defect & Impact                                                                                                                                                    | Evidence                                                                                                              | Proposed Remedy                                                                                                   | Verification Method                         |
| :----- | :------------ | :----------------------------------------------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------- | :------------------------------------------ |
| **M1** | `apps/web`    | **Audio oscillator flooding & leaked AudioContext**. Holding attack key spawns oscillators every frame causing severe audio distortion; AudioContext never closes. | `BattleScene.ts:128` triggers `playSwordSwing` every tick `p1Input.attack` is true; `SoundManager.ts` lacks disposal. | Trigger sword swing once per initiated attack; add `destroy()` method to `SoundManager` called on scene shutdown. | Lifecycle inspection and unit verification. |
| **M2** | `apps/web`    | **Thrust attack keybinding & ArrowDown missing**. Players cannot execute Forward Thrust; Down Arrow does not trigger heavy strike.                                 | `KeyboardInputAdapter.ts:67` only toggles between light and heavy via `KeyS`.                                         | Add Forward Thrust (W/Forward+Attack or KeyU) and ArrowDown to `KeyboardInputAdapter`. Update controls table.     | Unit test for input adapter.                |
| **M3** | `apps/web`    | **Missing Rematch and Post-Match controls**. Players cannot restart match or return to main menu from HUD after victory/defeat.                                    | `GameHUD.tsx:198-226` displays static text banner without interactive controls.                                       | Add Rematch, Return to Menu, and Stats reset buttons in HUD with proper simulation and Phaser reset.              | Playwright and unit test verification.      |
| **M4** | `apps/server` | **Port binding ignores hosting provider `$PORT` & lacks graceful shutdown**. Standard cloud platforms (Render, Railway, Heroku) inject `$PORT`.                    | `apps/server/src/config/env.ts:8` only checks `SERVER_PORT`; `index.ts` has no SIGTERM handler.                       | Support `process.env.PORT` fallback in env config and register SIGTERM/SIGINT listeners.                          | Manual and unit check.                      |
| **M5** | `apps/web`    | **Playwright E2E smoke tests fail on duplicate `<h1>`**. Strict locator mode fails because `Header.tsx` brand title and page titles both use `<h1>`.               | `smoke.spec.ts` failure: strict mode violation with 2 `<h1>` elements.                                                | Refactor Header brand title to semantic `div`/`span`.                                                             | `npm run test:e2e` passes.                  |

### Low Defects

| ID     | Component   | Defect & Impact                                                                                                                              | Evidence                                                             | Proposed Remedy                                                                                         | Verification Method                       |
| :----- | :---------- | :------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------ | :---------------------------------------- |
| **L1** | `apps/web`  | **Settings page options are not persisted**. Volume, mute, high-contrast toggles do not persist to storage or affect the game canvas/DOM.    | `apps/web/src/app/settings/page.tsx` uses isolated local `useState`. | Bind settings to localStorage, apply to `SoundManager`, and toggle `.high-contrast` on `document.body`. | Component tests.                          |
| **L2** | `game-core` | **Unclamped frame delta after background tab pause**. Returning from inactive tab causes large physics step.                                 | `GameSimulation.step` takes raw `deltaSec`.                          | Clamp `deltaSec` to maximum 0.1s (100ms) to prevent boundary clipping.                                  | Unit test in `combat-simulation.test.ts`. |
| **L3** | `apps/web`  | **Reduced motion preference not respected**. Camera shakes and screen flashes trigger at full strength regardless of accessibility settings. | `CombatEffects.ts` does not check motion preference.                 | Respect `prefers-reduced-motion` and user setting to disable/dampen camera shake and intense flashes.   | Accessibility review.                     |

---

## 3. Remediation Plan & Execution Sequence

1. **Phase 2 & Core Combat**:
   - Fix Double-KO draw handling in `GameSimulation.ts`.
   - Implement stamina exhaustion penalty and guard break in `CombatController.ts` & `WarriorEntity.ts`.
   - Clamp large delta steps in `GameSimulation.ts`.
   - Add Forward Thrust and ArrowDown support in `KeyboardInputAdapter.ts`.
2. **Phase 3 & Bot Qualification**:
   - Refactor `WarriorBotAI.ts` to support 'novice', 'adept', and 'master' difficulty tiers with human-like reaction latency.
   - Wire difficulty selection in settings and singleplayer play page.
3. **Phase 4 & Multiplayer Qualification**:
   - Fix `BattleRoom.ts` simulation loop to allow `round_over` timer transition.
   - Broadcast `ROUND_END` and `MATCH_END` messages.
   - Integrate multiplayer game container into `apps/web/src/app/room/page.tsx` with active Colyseus `Room`.
   - Update `BattleScene.ts` to dispatch inputs to room and synchronize remote state and combat events.
4. **Phase 5 & Statistics**:
   - Create `StatisticsManager` in `@last-crown/shared` with Zod validation, streak tracking, recovery from corrupted data, and reset action.
   - Integrate into `GameHUD`, `HomePage`, and `SettingsPage`.
5. **Phase 6 & Audio/Visual**:
   - Fix audio oscillator spam in `BattleScene.ts` (trigger once per initiated attack).
   - Add `destroy()` / cleanup to `SoundManager.ts`.
   - Correct impact effect coordinates in `BattleScene.handleCombatEvent`.
6. **Phase 7 & UX / Accessibility**:
   - Add Rematch, Return to Menu, and Stats controls in `GameHUD.tsx`.
   - Fix duplicate `<h1>` in `Header.tsx` to restore semantic accessibility and pass Playwright tests.
   - Persist settings (volume, sfx mute, high contrast, bot difficulty, reduced motion) in `SettingsPage`.
   - Add `.high-contrast` CSS variables and `prefers-reduced-motion` support.
7. **Phase 8 & Security**:
   - Harden CORS handler with Express error middleware.
   - Verify rate limiter and invite code verification edge cases.
8. **Phase 9 & Performance**:
   - Throttled / selective HUD update or optimized state dispatch.
   - Clean up event listeners, timers, and Phaser instances on unmount.
9. **Phase 10 & 11: Testing & Build**:
   - Add unit tests for StatisticsManager, Bot difficulty, Guard break, Double-KO, and Room lifecycle.
   - Re-run all Vitest suites and Playwright E2E suites.
   - Re-run typecheck, lint, and production builds.
