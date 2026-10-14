import { Schema, type } from '@colyseus/schema';

export class WarriorNetworkState extends Schema {
  @type('string') id: string = '';
  @type('string') name: string = '';
  @type('number') x: number = 0;
  @type('number') y: number = 0;
  @type('number') vx: number = 0;
  @type('number') vy: number = 0;
  @type('string') facing: string = 'right';
  @type('boolean') isGrounded: boolean = true;
  @type('number') health: number = 100;
  @type('number') maxHealth: number = 100;
  @type('number') stamina: number = 100;
  @type('number') maxStamina: number = 100;
  @type('string') state: string = 'idle';
  @type('string') attackPhase: string = 'none';
  @type('string') currentAttackId: string = '';
  @type('number') roundsWon: number = 0;
  @type('boolean') isConnected: boolean = true;
  @type('boolean') isExhausted: boolean = false;
}
