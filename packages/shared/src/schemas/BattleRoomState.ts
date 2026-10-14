import { Schema, type, MapSchema, ArraySchema } from '@colyseus/schema';
import { WarriorNetworkState } from './WarriorNetworkState.js';
import { HitboxNetworkState } from './HitboxNetworkState.js';

export class BattleRoomState extends Schema {
  @type('string') matchState: string = 'waiting';
  @type('number') roundNumber: number = 1;
  @type('number') timerSeconds: number = 99;
  @type('string') inviteCode: string = '';
  @type('string') arenaId: string = 'bastion_courtyard';
  @type('string') winnerId: string = '';

  @type({ map: WarriorNetworkState })
  warriors = new MapSchema<WarriorNetworkState>();

  @type([HitboxNetworkState])
  activeHitboxes = new ArraySchema<HitboxNetworkState>();
}
