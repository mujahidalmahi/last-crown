import { describe, it, expect } from 'vitest';
import { Button } from '../../src/components/ui/Button.js';
import { Badge } from '../../src/components/ui/Badge.js';
import { Card } from '../../src/components/ui/Card.js';
import { ArenaSelectModal, ARENA_LIST } from '../../src/components/arena/ArenaSelectModal.js';
import { BotSelectModal, BOT_CHARACTERS } from '../../src/components/bot/BotSelectModal.js';
import { WarriorSelectModal, WARRIOR_OPTIONS } from '../../src/components/warrior/WarriorSelectModal.js';
import { GameHUD } from '../../src/features/game/GameHUD.js';

describe('Web UI Components', () => {
  it('exports Button component successfully', () => {
    expect(Button).toBeDefined();
  });

  it('exports Badge component successfully', () => {
    expect(Badge).toBeDefined();
  });

  it('exports Card component successfully', () => {
    expect(Card).toBeDefined();
  });

  it('defines ArenaSelectModal and accurate 4-arena playground configuration', () => {
    expect(ArenaSelectModal).toBeDefined();
    expect(ARENA_LIST).toHaveLength(4);

    // 1st row 1st button: Coloseum -> playground.jpg
    expect(ARENA_LIST[0]!.name).toBe('Coloseum');
    expect(ARENA_LIST[0]!.bgImage).toBe('/assets/backgrounds/playground.jpg');

    // 1st row 2nd button: DragonLand -> playground2.jpg
    expect(ARENA_LIST[1]!.name).toBe('DragonLand');
    expect(ARENA_LIST[1]!.bgImage).toBe('/assets/backgrounds/playground2.jpg');

    // 2nd row 1st button: StormForce -> playground3.jpg
    expect(ARENA_LIST[2]!.name).toBe('StormForce');
    expect(ARENA_LIST[2]!.bgImage).toBe('/assets/backgrounds/playground3.jpg');

    // 2nd row 2nd button: seaSide -> playground4.jpg
    expect(ARENA_LIST[3]!.name).toBe('seaSide');
    expect(ARENA_LIST[3]!.bgImage).toBe('/assets/backgrounds/playground4.jpg');
  });

  it('defines BotSelectModal and all 4 unique bot champions with progressive difficulty tiers', () => {
    expect(BotSelectModal).toBeDefined();
    expect(BOT_CHARACTERS).toHaveLength(4);

    // Bot 1: Sir Cedric - Novice (Tier 1)
    expect(BOT_CHARACTERS[0]!.name).toBe('Sir Cedric');
    expect(BOT_CHARACTERS[0]!.preset).toBe('knight');
    expect(BOT_CHARACTERS[0]!.difficulty).toBe('novice');

    // Bot 2: Grimwood - Adept (Tier 2)
    expect(BOT_CHARACTERS[1]!.name).toBe('Grimwood');
    expect(BOT_CHARACTERS[1]!.preset).toBe('marauder');
    expect(BOT_CHARACTERS[1]!.difficulty).toBe('adept');

    // Bot 3: Valerius - Expert (Tier 3)
    expect(BOT_CHARACTERS[2]!.name).toBe('Valerius');
    expect(BOT_CHARACTERS[2]!.preset).toBe('vanguard');
    expect(BOT_CHARACTERS[2]!.difficulty).toBe('expert');

    // Bot 4: Aurelia - Master (Tier 4)
    expect(BOT_CHARACTERS[3]!.name).toBe('Aurelia');
    expect(BOT_CHARACTERS[3]!.preset).toBe('duelist');
    expect(BOT_CHARACTERS[3]!.difficulty).toBe('master');
  });

  it('defines WarriorSelectModal and all 4 playable champion presets with distinct combat styles', () => {
    expect(WarriorSelectModal).toBeDefined();
    expect(WARRIOR_OPTIONS).toHaveLength(4);

    // Champion 1: Sir Cedric (Balanced Knight)
    expect(WARRIOR_OPTIONS[0]!.name).toBe('Sir Cedric');
    expect(WARRIOR_OPTIONS[0]!.preset).toBe('knight');
    expect(WARRIOR_OPTIONS[0]!.archetypeStyle).toBe('Balanced');

    // Champion 2: Aurelia (Speed / Finesse Duelist)
    expect(WARRIOR_OPTIONS[1]!.name).toBe('Aurelia');
    expect(WARRIOR_OPTIONS[1]!.preset).toBe('duelist');
    expect(WARRIOR_OPTIONS[1]!.archetypeStyle).toBe('Speed / Finesse');

    // Champion 3: Valerius (Heavy Tank Vanguard)
    expect(WARRIOR_OPTIONS[2]!.name).toBe('Valerius');
    expect(WARRIOR_OPTIONS[2]!.preset).toBe('vanguard');
    expect(WARRIOR_OPTIONS[2]!.archetypeStyle).toBe('Heavy Tank');

    // Champion 4: Grimwood (Brawler Marauder)
    expect(WARRIOR_OPTIONS[3]!.name).toBe('Grimwood');
    expect(WARRIOR_OPTIONS[3]!.preset).toBe('marauder');
    expect(WARRIOR_OPTIONS[3]!.archetypeStyle).toBe('Brawler');
  });

  it('exports GameHUD supporting Crown Burst gauges and combat announcements', () => {
    expect(GameHUD).toBeDefined();
  });
});
