import { describe, it, expect } from 'vitest';
import { Button } from '../../src/components/ui/Button.js';
import { Badge } from '../../src/components/ui/Badge.js';
import { Card } from '../../src/components/ui/Card.js';
import { ArenaSelectModal, ARENA_LIST } from '../../src/components/arena/ArenaSelectModal.js';

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
});
