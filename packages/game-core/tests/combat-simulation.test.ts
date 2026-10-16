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
    sim.p1.movement.setPosition({ x: 500, y: sim.arena.floorY });
    sim.p1.movement.setFacing('right');
    sim.p2.movement.setPosition({ x: 540, y: sim.arena.floorY });
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
    sim.p1.movement.setPosition({ x: 500, y: sim.arena.floorY });
    sim.p1.movement.setFacing('right');
    sim.p2.movement.setPosition({ x: 540, y: sim.arena.floorY });
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
    sim.p1.movement.setPosition({ x: 500, y: sim.arena.floorY });
    sim.p1.movement.setFacing('right');
    sim.p2.movement.setPosition({ x: 540, y: sim.arena.floorY });
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

  it('triggers guard break and exhaustion stun when incoming hit depletes stamina while blocking', () => {
    sim.p1.movement.setPosition({ x: 500, y: sim.arena.floorY });
    sim.p1.movement.setFacing('right');
    sim.p2.movement.setPosition({ x: 540, y: sim.arena.floorY });
    sim.p2.movement.setFacing('left');

    // Reduce P2 stamina to 5 (heavy attack does 28 * 0.8 = 22.4 stamina damage)
    sim.p2.stamina = 5;

    // P1 heavy strike, P2 blocks
    sim.step(
      {
        sequence: 1,
        timestamp: Date.now(),
        moveX: 0,
        jump: false,
        attack: true,
        attackType: 'heavy',
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

    // Step until active phase hits
    for (let i = 0; i < 24; i++) {
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

    expect(sim.p2.stamina).toBe(0);
    expect(sim.p2.combat.isExhausted).toBe(true);
    expect(sim.p2.stateMachine.state).toBe('hitstun');
  });

  it('handles simultaneous double-KO cleanly without locking the simulation', () => {
    // Both warriors at 5 HP
    sim.p1.health = 5;
    sim.p2.health = 5;

    sim.p1.applyDamage(10);
    sim.p2.applyDamage(10);

    expect(sim.p1.health).toBe(0);
    expect(sim.p2.health).toBe(0);

    // Step simulation
    sim.step(null, null, 0.016);

    // Round should be 'round_over'
    expect(sim.matchState).toBe('round_over');
    expect(sim.p1.roundsWon).toBe(0);
    expect(sim.p2.roundsWon).toBe(0);

    // Advance 2.6 seconds (transition timer is 2.5s)
    for (let i = 0; i < 30; i++) {
      sim.step(null, null, 0.1);
    }

    // Should cleanly start next round with full stats
    expect(sim.matchState).toBe('in_progress');
    expect(sim.roundNumber).toBe(2);
    expect(sim.p1.health).toBe(100);
    expect(sim.p2.health).toBe(100);
  });

  it('resets entire match state cleanly on resetMatch call', () => {
    sim.p1.roundsWon = 1;
    sim.p1.health = 20;
    sim.p2.health = 0;

    sim.resetMatch();

    expect(sim.roundNumber).toBe(1);
    expect(sim.p1.roundsWon).toBe(0);
    expect(sim.p2.roundsWon).toBe(0);
    expect(sim.p1.health).toBe(100);
    expect(sim.p2.health).toBe(100);
    expect(sim.matchState).toBe('in_progress');
    expect(sim.winnerId).toBeNull();
  });

  it('smoothly accelerates when moving and applies skid braking when reversing direction', () => {
    // Start stationary
    expect(sim.p1.movement.velocity.x).toBe(0);

    // Apply right movement for 1 frame (16ms)
    sim.step(
      {
        sequence: 1,
        timestamp: Date.now(),
        moveX: 1,
        jump: false,
        attack: false,
        block: false,
        parry: false,
      },
      null,
      0.016
    );

    // Speed should have accelerated, not instantly jumped to max 220
    expect(sim.p1.movement.velocity.x).toBeGreaterThan(0);
    expect(sim.p1.movement.velocity.x).toBeLessThan(sim.p1.preset.attributes.walkSpeed);

    // Accelerate to full speed
    for (let i = 0; i < 20; i++) {
      sim.step(
        {
          sequence: i + 2,
          timestamp: Date.now(),
          moveX: 1,
          jump: false,
          attack: false,
          block: false,
          parry: false,
        },
        null,
        0.016
      );
    }
    expect(sim.p1.movement.velocity.x).toBe(sim.p1.preset.attributes.walkSpeed);

    // Now pull reverse direction (moveX = -1): should apply skid brake
    sim.step(
      {
        sequence: 30,
        timestamp: Date.now(),
        moveX: -1,
        jump: false,
        attack: false,
        block: false,
        parry: false,
      },
      null,
      0.016
    );
    expect(sim.p1.movement.velocity.x).toBeLessThan(sim.p1.preset.attributes.walkSpeed);
  });

  it('applies variable jump gravity cut when jump is released early', () => {
    // Initiate jump with jump held
    sim.step(
      {
        sequence: 1,
        timestamp: Date.now(),
        moveX: 0,
        jump: true,
        attack: false,
        block: false,
        parry: false,
      },
      null,
      0.016
    );
    expect(sim.p1.movement.isGrounded).toBe(false);
    const initialVy = sim.p1.movement.velocity.y;
    expect(initialVy).toBeLessThan(0); // Ascending

    // Next frame with jump RELEASED: upward velocity should drop faster due to jump cut
    sim.step(
      {
        sequence: 2,
        timestamp: Date.now(),
        moveX: 0,
        jump: false,
        attack: false,
        block: false,
        parry: false,
      },
      null,
      0.016
    );
    expect(sim.p1.movement.velocity.y).toBeGreaterThan(initialVy);
  });

  it('executes tactical combat dash costing stamina and applying velocity impulse', () => {
    const initialStamina = sim.p1.stamina;

    sim.step(
      {
        sequence: 1,
        timestamp: Date.now(),
        moveX: 1,
        jump: false,
        attack: false,
        block: false,
        parry: false,
        dash: true,
      },
      null,
      0.016
    );

    expect(sim.p1.stamina).toBeLessThan(initialStamina);
    expect(sim.p1.movement.velocity.x).toBeGreaterThanOrEqual(350);
  });

  it('triggers decapitation execution on fatal finishing strike', () => {
    // Position warriors adjacent in melee range
    sim.p1.movement.setPosition({ x: 500, y: 560 });
    sim.p1.movement.setFacing('right');
    sim.p2.movement.setPosition({ x: 540, y: 560 });
    sim.p2.movement.setFacing('left');

    // Set defender to 5 HP so next strike is lethal
    sim.p2.health = 5;

    let hitEvent: HitResult | null = null;
    sim.onCombatEvent(result => {
      hitEvent = result;
    });

    // P1 initiates heavy strike
    sim.step(
      {
        sequence: 1,
        timestamp: Date.now(),
        moveX: 0,
        jump: false,
        attack: true,
        attackType: 'heavy',
        block: false,
        parry: false,
      },
      null,
      0.016
    );

    // Advance time until active phase
    for (let i = 0; i < 25; i++) {
      sim.step(null, null, 0.016);
    }

    expect(hitEvent).not.toBeNull();
    if (hitEvent) {
      expect((hitEvent as HitResult).isDecapitation).toBe(true);
      expect(sim.p2.health).toBe(0);
      expect(sim.p2.isDecapitated).toBe(true);
      expect(sim.p2.toSnapshot().isDecapitated).toBe(true);
    }
  });

  it('triggers weapon clash when both warriors attack simultaneously', () => {
    sim.p1.movement.setPosition({ x: 500, y: 560 });
    sim.p1.movement.setFacing('right');
    sim.p2.movement.setPosition({ x: 550, y: 560 });
    sim.p2.movement.setFacing('left');

    let clashEvent: HitResult | null = null;
    sim.onCombatEvent(result => {
      if (result.resolution === 'clash') {
        clashEvent = result;
      }
    });

    // Both initiate light slash at the same tick
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
        attack: true,
        attackType: 'light',
        block: false,
        parry: false,
      },
      0.016
    );

    // Step forward until hitboxes become active (~160ms)
    for (let i = 0; i < 12; i++) {
      sim.step(null, null, 0.016);
    }

    expect(clashEvent).not.toBeNull();
    if (clashEvent) {
      expect((clashEvent as HitResult).resolution).toBe('clash');
      expect((clashEvent as HitResult).isClash).toBe(true);
      expect((clashEvent as HitResult).damage).toBe(0);
      // Both warriors pushed back in opposite directions
      expect(sim.p1.movement.velocity.x).toBeLessThan(0);
      expect(sim.p2.movement.velocity.x).toBeGreaterThan(0);
    }
  });

  it('chains light slash into multi-hit combo string', () => {
    const warrior = sim.p1;
    // Attack 1: Light slash
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
    expect(warrior.combat.currentAttack?.id).toBe('light_slash');

    // Advance to active phase (180ms)
    warrior.update(null, 0.18, sim.arena, sim.physics);
    expect(warrior.combat.attackPhase).toBe('active');

    // Input light attack again during active phase -> chains to slash_combo_2
    warrior.processInput({
      sequence: 2,
      timestamp: Date.now(),
      moveX: 0,
      jump: false,
      attack: true,
      attackType: 'light',
      block: false,
      parry: false,
    });
    expect(warrior.combat.currentAttack?.id).toBe('slash_combo_2');

    // Advance to active phase of combo 2 (140ms)
    warrior.update(null, 0.14, sim.arena, sim.physics);
    expect(warrior.combat.attackPhase).toBe('active');

    // Input light attack again -> chains to spinning_finisher
    warrior.processInput({
      sequence: 3,
      timestamp: Date.now(),
      moveX: 0,
      jump: false,
      attack: true,
      attackType: 'light',
      block: false,
      parry: false,
    });
    expect(warrior.combat.currentAttack?.id).toBe('spinning_finisher');
  });

  it('executes aerial strike (Helm Splitter) when attacking airborne with downward plunge', () => {
    // Put P1 in air
    sim.p1.movement.setPosition({ x: 500, y: 350 });
    sim.p1.movement.setVelocity({ x: 0, y: -100 });
    // Update movement to establish airborne
    sim.p1.update(null, 0.016, sim.arena, sim.physics);
    expect(sim.p1.movement.isGrounded).toBe(false);

    // Request attack while airborne
    sim.p1.processInput({
      sequence: 1,
      timestamp: Date.now(),
      moveX: 0,
      jump: false,
      attack: true,
      attackType: 'light',
      block: false,
      parry: false,
    });

    expect(sim.p1.combat.currentAttack?.id).toBe('aerial_strike');
    // Should have applied strong downward velocity plunge
    expect(sim.p1.movement.velocity.y).toBeGreaterThan(400);
  });

  it('executes dash lunge attack when attacking while dashing', () => {
    // Initiate tactical dash
    sim.p1.processInput({
      sequence: 1,
      timestamp: Date.now(),
      moveX: 1,
      jump: false,
      attack: false,
      block: false,
      parry: false,
      dash: true,
    });
    expect(sim.p1.movement.velocity.x).toBeGreaterThan(350);

    // Attack while at dash velocity
    sim.p1.processInput({
      sequence: 2,
      timestamp: Date.now(),
      moveX: 0,
      jump: false,
      attack: true,
      block: false,
      parry: false,
    });

    expect(sim.p1.combat.currentAttack?.id).toBe('dash_lunge');
  });

  it('bounces warrior off arena boundary with wall bounce physics when propelled at high velocity', () => {
    // Position P1 right next to left wall (leftBoundX is 80) and launch into wall
    sim.p1.movement.setPosition({ x: 82, y: 560 });
    sim.p1.movement.setVelocity({ x: -400, y: 0 });

    sim.step(null, null, 0.016);

    // P1 hit the left wall and bounced back with positive X velocity
    expect(sim.p1.movement.position.x).toBe(sim.arena.leftBoundX);
    expect(sim.p1.movement.velocity.x).toBeGreaterThan(0);
  });

  it('pushes overlapping fighters apart with soft-body separation', () => {
    // Position warriors overlapping on X coordinate
    sim.p1.movement.setPosition({ x: 500, y: 560 });
    sim.p2.movement.setPosition({ x: 505, y: 560 });

    sim.step(null, null, 0.016);

    const distanceAfter = sim.p2.movement.position.x - sim.p1.movement.position.x;
    expect(distanceAfter).toBeGreaterThan(5);
  });

  it('bypasses standing block with low sweep, tripping the defender', () => {
    sim.p1.movement.setPosition({ x: 500, y: sim.arena.floorY });
    sim.p1.movement.setFacing('right');
    sim.p2.movement.setPosition({ x: 540, y: sim.arena.floorY });
    sim.p2.movement.setFacing('left');

    let hitEvent: HitResult | null = null;
    sim.onCombatEvent(result => {
      hitEvent = result;
    });

    // P1 initiates low sweep, P2 attempts to block
    sim.step(
      {
        sequence: 1,
        timestamp: Date.now(),
        moveX: 0,
        jump: false,
        attack: true,
        attackType: 'sweep',
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

    // Advance until sweep active frame lands
    for (let i = 0; i < 15; i++) {
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
    // High block was bypassed! Resolution is 'hit' (trip) instead of 'blocked'
    expect((hitEvent as HitResult).resolution).toBe('hit');
    expect((hitEvent as HitResult).damage).toBe(16);
    expect(sim.p2.stateMachine.state).toBe('hitstun');
  });

  it('allows canceling/feinting an attack during windup with a dash or block', () => {
    // P1 initiates heavy attack
    sim.p1.processInput({
      sequence: 1,
      timestamp: Date.now(),
      moveX: 0,
      jump: false,
      attack: true,
      attackType: 'heavy',
      block: false,
      parry: false,
    });

    expect(sim.p1.combat.attackPhase).toBe('windup');
    expect(sim.p1.stateMachine.state).toBe('attacking');

    // During windup, player triggers dash to feint cancel
    sim.p1.processInput({
      sequence: 2,
      timestamp: Date.now(),
      moveX: 1,
      jump: false,
      attack: false,
      dash: true,
      block: false,
      parry: false,
    });

    // Attack was feinted back to idle or dashing
    expect(sim.p1.combat.attackPhase).toBe('none');
    expect(sim.p1.movement.velocity.x).toBeGreaterThan(0);
  });
});
