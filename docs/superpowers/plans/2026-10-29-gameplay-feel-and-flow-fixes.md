# Last-Crown Gameplay Feel and Flow Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

This plan resolves the core issues identified in `Review.md` that make _Last-Crown_ feel boring, dull, and unprofessional:

1. **User Flows & Archetype Lockouts**: Add singleplayer warrior character selection so Player 1 can choose between Crown Knight, Exiled Duelist, Northern Jarl, and Iron Marauder. Add archetype selection to multiplayer rooms.
2. **Audio & Sound Design**: Build an adaptive Web Audio BGM synthesizer engine for battle music and menu themes; add announcer vocal fanfares (`ROUND 1`, `DUEL!`, `VICTORY!`), and procedural warrior exertion/hurt vocalizations.
3. **Visual Silhouettes & Weapon Variety**: Overhaul `WarriorRenderer.ts` with custom helmets, armor silhouettes, shields, and weapons for all 4 archetypes (Knight, Duelist, Vanguard, Marauder).
4. **Arena & Environmental Polish**: Fix torch placement (no floating torches in Seaside/StormForce), add biome weather effects (rain in StormForce, embers in Dragonland, mist in Seaside), and integrate arena BGM into `BattleScene.ts`.
5. **Font Optimization**: Eliminate render-blocking `@import` and CLS by using Next.js `next/font/google`.

---

## File Structure & Responsibilities

| File                                                            | Change | Responsibility                                                                                |
| :-------------------------------------------------------------- | :----- | :-------------------------------------------------------------------------------------------- |
| `apps/web/src/components/warrior/WarriorSelectModal.tsx`        | Create | Modal for selecting the player's warrior archetype with stats, lore, and icon preview.        |
| `apps/web/src/components/warrior/WarriorSelectModal.module.css` | Create | Pixel-art retro styling for the warrior select dialog matching existing modals.               |
| `apps/web/src/app/game/page.tsx`                                | Modify | Update singleplayer navigation flow: Arena -> Player Warrior -> Bot Opponent -> Launch.       |
| `apps/web/src/app/play/page.tsx`                                | Modify | Read `player` query parameter and pass `playerPreset` to `PhaserGameContainer`.               |
| `apps/web/src/app/room/page.tsx`                                | Modify | Add warrior archetype picker to multiplayer quick match and private room creation.            |
| `apps/web/src/styles/globals.css`                               | Modify | Remove blocking `@import url(...)` font declaration.                                          |
| `apps/web/src/app/layout.tsx`                                   | Modify | Load `Press_Start_2P` and `VT323` via `next/font/google` for zero-CLS typography.             |
| `apps/web/src/game/audio/SoundManager.ts`                       | Modify | Implement multi-track procedural BGM engine, round announcer cues, and fight vocalizations.   |
| `apps/web/src/features/game/GameHUD.tsx`                        | Modify | Trigger announcer sound cues on round splash; add "Change Fighter" button on victory.         |
| `apps/web/src/game/rendering/WarriorRenderer.ts`                | Modify | Render unique helmets, weapons, shields, and armor per warrior preset.                        |
| `apps/web/src/game/scenes/BattleScene.ts`                       | Modify | Pass preset IDs to renderers, start/stop arena BGM, fix torch coordinates, add biome weather. |

---

## Tasks

### Task 1: Web Performance & Typography (Zero-CLS Fonts)

- [ ] In `apps/web/src/app/layout.tsx`, import `Press_Start_2P` and `VT323` from `next/font/google` with CSS variables `--font-press-start` and `--font-vt323`.
- [ ] In `apps/web/src/styles/globals.css`, remove line 1 `@import url(...)` and bind `--font-pixel` to `var(--font-press-start)`.
- [ ] Verify build and typecheck with `npm run typecheck`.

### Task 2: Singleplayer & Multiplayer Character Selection Flow

- [ ] Create `apps/web/src/components/warrior/WarriorSelectModal.tsx` and `.module.css` exposing all 4 warrior archetypes (`knight`, `duelist`, `vanguard`, `marauder`) with titles, stats, attributes, and lore.
- [ ] Update `apps/web/src/app/game/page.tsx` to insert `WarriorSelectModal` into the singleplayer flow:
      `Select Arena` -> `Select Your Warrior` -> `Select Bot Opponent` -> Route to `/play?arena=...&player=...&bot=...`.
- [ ] Update `apps/web/src/app/play/page.tsx` to read `player` from search params and forward `playerPreset` to `PhaserGameContainer`.
- [ ] Update `apps/web/src/app/room/page.tsx` with a warrior archetype selection bar, passing the chosen archetype to `findQuickMatch`, `createPrivateRoom`, and `joinPrivateRoom`.

### Task 3: Procedural BGM Synthesizer & Audio Immersion

- [ ] In `apps/web/src/game/audio/SoundManager.ts`, implement a procedural Web Audio rhythmic combat BGM engine:
  - Arena-specific musical themes (Colosseum martial drums, Dragonland heavy pulse, StormForce arpeggiated drive, Seaside shanty groove).
  - Methods: `startBattleBgm(arenaId)`, `stopBattleBgm()`, `setBgmVolume(vol)`, `applyPauseFilter(paused)`.
- [ ] In `SoundManager.ts`, add announcer fanfare methods:
  - `playRoundStart(roundNumber)` (dramatic gong & heraldic brass)
  - `playDuelStart()` (metallic sword clash intro)
  - `playVictoryFanfare()` (triumphant brass flourish)
  - `playExertionGrunt()` & `playHurtGrunt()` (procedural warrior vocal cues)
- [ ] In `apps/web/src/features/game/GameHUD.tsx`, call announcer sound methods when `roundSplash` triggers and when match finishes.

### Task 4: Visual Silhouettes & Weapon Differentiation

- [ ] In `apps/web/src/game/rendering/WarriorRenderer.ts`, accept `presetId: string = 'knight'` in constructor and provide `setPreset(presetId)`.
- [ ] Implement distinct visual rendering branches:
  - **`knight`**: Crusader Greathelm, Royal Cross Plate, Heater Shield, Steel Longsword.
  - **`duelist`**: Cavalier Fencing Cap with Feather Plume, Light Leather Doublet, Buckler Shield, Slender Rapier.
  - **`vanguard`**: Viking Spangenhelm with Nasal Guard, Fur Pauldrons & Chainmail, Round Wooden Shield, Heavy War Hammer.
  - **`marauder`**: Spiked Iron Executioner Mask, Asymmetric Spiked Shoulders, Spiked Heavy Shield, Broad Executioner Cleaver.
- [ ] In `apps/web/src/game/scenes/BattleScene.ts`, pass `playerPreset` and `opponentPreset` to `p1Renderer` and `p2Renderer`.

### Task 5: Arena Biome Polish & Lifecycle Integration

- [ ] In `apps/web/src/game/scenes/BattleScene.ts`:
  - Start arena BGM on `create()` and cleanly stop/fade out on `shutdown()`.
  - Conditional torches: only spawn Colosseum torches when `effectiveArenaId === 'coloseum'`.
  - Biome weather: add diagonal rain particle streaks in `stormforce`, rising volcanic embers in `dragonland`, and sea mist in `seaside`.
- [ ] In `apps/web/src/features/game/GameHUD.tsx` Victory card:
  - Add a "Change Fighter / Arena" button redirecting to `/game`.

### Task 6: Verification & Full Monorepo Build Check

- [ ] Run `npm run typecheck` across all workspaces.
- [ ] Run `npm run build:packages` to ensure shared configs build cleanly.
- [ ] Run `npm test` to verify all 113+ automated unit tests pass.
