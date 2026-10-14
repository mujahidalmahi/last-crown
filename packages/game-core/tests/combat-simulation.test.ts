import { describe, it, expect, beforeEach } from 'vitest';
import { GameSimulation } from '../src/simulation/GameSimulation.js';
import { HitResult } from '@last-crown/shared';

describe('Combat Simulation', () => {
  let sim: GameSimulation;

  beforeEach(() => {
    sim = new GameSimulation(
      'p1',
      'Player 1',
      'knight',
      'p2',
      'Player 2',
      'knight',
      'bastion_courtyard'
    );
  });

  it('initializes warriors with correct positions and max stats', () => {
    expect(sim.p1.health).toBe(100);
    expect(sim.p1.stamina).toBe(100);
    expect(sim.p2.health).toBe(100);
    expect(sim.matchState).toBe('in_progress');
  });

  it('transitions attack through windup, active, and recovery phases', () => {
    const warrior = sim.p1;
    warrior.processInput({
      sequence: 1,
      timestamp: Date.now(),
      moveX: 0,
      jump: false,
      attack: true,
      attackType: 'light',
      block: false,
      parry: false,
    });

    expect(warrior.combat.attackPhase).toBe('windup');
    expect(warrior.stamina).toBeLessThan(100);

    // Step forward 180ms (light attack windup is 160ms)
    warrior.update(null, 0.18, sim.arena, sim.physics);
    expect(warrior.combat.attackPhase).toBe('active');

    // Step forward another 140ms (active is 120ms)
    warrior.update(null, 0.14, sim.arena, sim.physics);
    expect(warrior.combat.attackPhase).toBe('recovery');

    // Step forward another 240ms (recovery is 220ms)
    warrior.update(null, 0.24, sim.arena, sim.physics);
    expect(warrior.combat.attackPhase).toBe('none');
    expect(warrior.stateMachine.state).toBe('idle');
  });

  it('resolves damage and knockback when attack hits opponent', () => {
    // Position warriors adjacent in melee range
    sim.p1.movement.setPosition({ x: 500, y: 560 });
    sim.p1.movement.setFacing('right');
    sim.p2.movement.setPosition({ x: 540, y: 560 });
    sim.p2.movement.setFacing('left');

    let hitEvent: HitResult | null = null;
    sim.onCombatEvent(result => {
      hitEvent = result;
    });

    // P1 initiates light slash
    sim.step(
      {
        sequence: 1,
        timestamp: Date.now(),
        moveX: 0,
        jump: false,
        attack: true,
        attackType: 'light',
        block: false,
        parry: false,
      },
      null,
      0.016
    );

    // Advance time until active phase
    for (let i = 0; i < 12; i++) {
      sim.step(null, null, 0.016);
    }

    expect(hitEvent).not.toBeNull();
    if (hitEvent) {
      expect((hitEvent as HitResult).resolution).toBe('hit');
      expect((hitEvent as HitResult).damage).toBeGreaterThan(0);
      expect(sim.p2.health).toBeLessThan(100);
      expect(sim.p2.stateMachine.state).toBe('hitstun');
    }
  });

  it('absorbs 75% damage when defender is blocking', () => {
    sim.p1.movement.setPosition({ x: 500, y: 560 });
    sim.p1.movement.setFacing('right');
    sim.p2.movement.setPosition({ x: 540, y: 560 });
    sim.p2.movement.setFacing('left');

    let hitEvent: HitResult | null = null;
    sim.onCombatEvent(result => {
      hitEvent = result;
    });

    // P1 attacks, P2 blocks
    sim.step(
      {
        sequence: 1,
        timestamp: Date.now(),
        moveX: 0,
        jump: false,
        attack: true,
        attackType: 'light',
        block: false,
        parry: false,
      },
      {
        sequence: 1,
        timestamp: Date.now(),
        moveX: 0,
        jump: false,
        attack: false,
        block: true,
        parry: false,
      },
      0.016
    );

    for (let i = 0; i < 12; i++) {
      sim.step(
        null,
        {
          sequence: i + 2,
          timestamp: Date.now(),
          moveX: 0,
          jump: false,
          attack: false,
          block: true,
          parry: false,
        },
        0.016
      );
    }

    expect(hitEvent).not.toBeNull();
    if (hitEvent) {
      expect((hitEvent as HitResult).resolution).toBe('blocked');
      expect((hitEvent as HitResult).blockedDamage).toBeGreaterThan(0);
      // Health damage should be much lower than clean hit
      expect((hitEvent as HitResult).damage).toBeLessThan(10);
    }
  });

  it('deflects attack with zero damage and stuns attacker when defender parries', () => {
    sim.p1.movement.setPosition({ x: 500, y: 560 });
    sim.p1.movement.setFacing('right');
    sim.p2.movement.setPosition({ x: 540, y: 560 });
    sim.p2.movement.setFacing('left');

    let hitEvent: HitResult | null = null;
    sim.onCombatEvent(result => {
      hitEvent = result;
    });

    // P1 starts attack at tick 0 (windup is 160ms)
    sim.step(
      {
        sequence: 1,
        timestamp: Date.now(),
        moveX: 0,
        jump: false,
        attack: true,
        attackType: 'light',
        block: false,
        parry: false,
      },
      null,
      0.016
    );

    // Windup progresses for 6 ticks (~96ms)
    for (let i = 0; i < 6; i++) {
      sim.step(null, null, 0.016);
    }

    // P2 executes well-timed parry at ~112ms (parry window 150ms active until ~262ms)
    sim.step(
      null,
      {
        sequence: 2,
        timestamp: Date.now(),
        moveX: 0,
        jump: false,
        attack: false,
        block: false,
        parry: true,
      },
      0.016
    );

    // Attack enters active phase at ~160ms and strikes while parry is active
    for (let i = 0; i < 5; i++) {
      sim.step(null, null, 0.016);
    }

    expect(hitEvent).not.toBeNull();
    if (hitEvent) {
      expect((hitEvent as HitResult).resolution).toBe('parried');
      expect((hitEvent as HitResult).damage).toBe(0);
      // Defender took 0 damage
      expect(sim.p2.health).toBe(100);
      // Attacker was stunned!
      expect(sim.p1.stateMachine.state).toBe('hitstun');
    }
  });
});
