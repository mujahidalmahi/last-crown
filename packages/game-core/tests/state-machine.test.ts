import { describe, it, expect, beforeEach } from 'vitest';
import { WarriorStateMachine } from '../src/state-machine/WarriorStateMachine.js';

describe('WarriorStateMachine', () => {
  let sm: WarriorStateMachine;

  beforeEach(() => {
    sm = new WarriorStateMachine();
  });

  it('initializes in idle state', () => {
    expect(sm.state).toBe('idle');
    expect(sm.timeInStateMs).toBe(0);
  });

  it('allows transition from idle to running and attacking', () => {
    expect(sm.transitionTo('running')).toBe(true);
    expect(sm.state).toBe('running');

    expect(sm.transitionTo('attacking')).toBe(true);
    expect(sm.state).toBe('attacking');
  });

  it('prevents transitioning from attacking directly to blocking', () => {
    sm.transitionTo('attacking');
    expect(sm.transitionTo('blocking')).toBe(false);
    expect(sm.state).toBe('attacking');
  });

  it('allows hitstun to interrupt attacking or running', () => {
    sm.transitionTo('attacking');
    expect(sm.transitionTo('hitstun')).toBe(true);
    expect(sm.state).toBe('hitstun');
  });

  it('prevents any state transition once dead', () => {
    sm.forceState('dead');
    expect(sm.transitionTo('idle')).toBe(false);
    expect(sm.transitionTo('running')).toBe(false);
    expect(sm.transitionTo('hitstun')).toBe(false);
    expect(sm.state).toBe('dead');
  });
});
