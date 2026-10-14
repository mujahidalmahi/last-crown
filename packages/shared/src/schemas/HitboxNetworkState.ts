import { Schema, type } from '@colyseus/schema';

export class HitboxNetworkState extends Schema {
  @type('string') id: string = '';
  @type('string') ownerId: string = '';
  @type('number') x: number = 0;
  @type('number') y: number = 0;
  @type('number') width: number = 0;
  @type('number') height: number = 0;
  @type('boolean') isActive: boolean = false;
}
