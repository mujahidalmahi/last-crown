import { Client, Room } from 'colyseus.js';
import {
  PartyMessageType,
  PartySlotState,
  PlayerInputMessage,
  ControllerInputMessage,
  VibrateControllerMessage,
  AttackType,
} from '@last-crown/shared';

export class PartyControllerBridge {
  private static instance: PartyControllerBridge | null = null;
  private client: Client | null = null;
  private room: Room | null = null;
  private stateListeners: Set<(state: PartySlotState) => void> = new Set();
  private matchStartListeners: Set<(data: { p1Preset: string; p2Preset: string }) => void> =
    new Set();

  // Buffered inputs from phone controllers
  private p1CurrentInput: PlayerInputMessage | null = null;
  private p2CurrentInput: PlayerInputMessage | null = null;

  // Single-frame edge triggers for phones
  private p1AttackBuffer: { attack: boolean; attackType: AttackType } | null = null;
  private p1DashBuffer: boolean = false;
  private p2AttackBuffer: { attack: boolean; attackType: AttackType } | null = null;
  private p2DashBuffer: boolean = false;

  private constructor() {}

  public static getInstance(): PartyControllerBridge {
    if (!PartyControllerBridge.instance) {
      PartyControllerBridge.instance = new PartyControllerBridge();
    }
    return PartyControllerBridge.instance;
  }

  public getWsEndpoint(): string {
    if (typeof window === 'undefined') return 'ws://localhost:2567';
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname;
    // In local dev, server runs on 2567
    const port = window.location.port === '3000' ? '2567' : window.location.port || '2567';
    return `${protocol}//${host}:${port}`;
  }

  public async connectHost(partyCode: string): Promise<Room> {
    if (this.room) {
      this.disconnect();
    }

    const endpoint = this.getWsEndpoint();
    this.client = new Client(endpoint);

    this.room = await this.client.joinOrCreate('party', {
      isHost: true,
      partyCode,
    });

    this.setupHostRoomListeners(this.room);
    return this.room;
  }

  public async connectController(
    partyCode: string,
    preferredSlot?: 'p1' | 'p2',
    playerName?: string
  ): Promise<Room> {
    if (this.room) {
      this.disconnect();
    }

    const endpoint = this.getWsEndpoint();
    this.client = new Client(endpoint);

    this.room = await this.client.joinOrCreate('party', {
      isHost: false,
      partyCode,
      preferredSlot,
      playerName,
    });

    this.setupControllerRoomListeners(this.room);
    return this.room;
  }

  private setupHostRoomListeners(room: Room): void {
    room.onMessage(PartyMessageType.PARTY_STATE, (state: PartySlotState) => {
      this.notifyStateListeners(state);
    });

    room.onMessage(PartyMessageType.CONTROLLER_INPUT, (data: ControllerInputMessage) => {
      const { slot, input } = data;
      if (!input) return;

      if (slot === 'p1') {
        this.p1CurrentInput = input;
        if (input.attack) {
          this.p1AttackBuffer = {
            attack: true,
            attackType: input.attackType || 'light',
          };
        }
        if (input.dash) {
          this.p1DashBuffer = true;
        }
      } else if (slot === 'p2') {
        this.p2CurrentInput = input;
        if (input.attack) {
          this.p2AttackBuffer = {
            attack: true,
            attackType: input.attackType || 'light',
          };
        }
        if (input.dash) {
          this.p2DashBuffer = true;
        }
      }
    });

    room.onMessage(PartyMessageType.START_MATCH, (data: { p1Preset: string; p2Preset: string }) => {
      this.matchStartListeners.forEach(listener => listener(data));
    });
  }

  private setupControllerRoomListeners(room: Room): void {
    room.onMessage(PartyMessageType.PARTY_STATE, (state: PartySlotState) => {
      this.notifyStateListeners(state);
    });

    room.onMessage(PartyMessageType.START_MATCH, (data: { p1Preset: string; p2Preset: string }) => {
      this.matchStartListeners.forEach(listener => listener(data));
    });
  }

  public sendControllerInput(input: PlayerInputMessage): void {
    if (!this.room) return;
    this.room.send(PartyMessageType.CONTROLLER_INPUT, { input });
  }

  public sendClaimSlot(slot: 'p1' | 'p2', playerName?: string): void {
    if (!this.room) return;
    this.room.send(PartyMessageType.CLAIM_SLOT, { slot, playerName });
  }

  public sendWarriorPreset(preset: string): void {
    if (!this.room) return;
    this.room.send(PartyMessageType.SET_WARRIOR_PRESET, { preset });
  }

  public sendStartMatch(): void {
    if (!this.room) return;
    this.room.send(PartyMessageType.START_MATCH);
  }

  public sendVibrate(slot: 'p1' | 'p2' | 'all', type: 'hit' | 'parry' | 'win' | 'lose'): void {
    if (!this.room) return;
    const message: VibrateControllerMessage = { slot, type };
    this.room.send(PartyMessageType.VIBRATE_CONTROLLER, message);
  }

  public pollP1Input(): PlayerInputMessage | null {
    if (!this.p1CurrentInput) return null;

    const base = { ...this.p1CurrentInput };
    if (this.p1AttackBuffer) {
      base.attack = true;
      base.attackType = this.p1AttackBuffer.attackType;
      this.p1AttackBuffer = null;
    } else {
      base.attack = false;
    }

    if (this.p1DashBuffer) {
      base.dash = true;
      this.p1DashBuffer = false;
    } else {
      base.dash = false;
    }

    return base;
  }

  public pollP2Input(): PlayerInputMessage | null {
    if (!this.p2CurrentInput) return null;

    const base = { ...this.p2CurrentInput };
    if (this.p2AttackBuffer) {
      base.attack = true;
      base.attackType = this.p2AttackBuffer.attackType;
      this.p2AttackBuffer = null;
    } else {
      base.attack = false;
    }

    if (this.p2DashBuffer) {
      base.dash = true;
      this.p2DashBuffer = false;
    } else {
      base.dash = false;
    }

    return base;
  }

  public onPartyState(listener: (state: PartySlotState) => void): () => void {
    this.stateListeners.add(listener);
    return () => this.stateListeners.delete(listener);
  }

  public onMatchStart(
    listener: (data: { p1Preset: string; p2Preset: string }) => void
  ): () => void {
    this.matchStartListeners.add(listener);
    return () => this.matchStartListeners.delete(listener);
  }

  public onVibrate(callback: (msg: VibrateControllerMessage) => void): () => void {
    if (!this.room) return () => {};
    this.room.onMessage(PartyMessageType.VIBRATE_CONTROLLER, callback);
    return () => {};
  }

  private notifyStateListeners(state: PartySlotState): void {
    for (const listener of this.stateListeners) {
      try {
        listener(state);
      } catch (err) {
        console.error('Error in party state listener:', err);
      }
    }
  }

  public isConnected(): boolean {
    return !!(this.room && this.room.connection && this.room.connection.isOpen);
  }

  public getRoom(): Room | null {
    return this.room;
  }

  public disconnect(): void {
    if (this.room) {
      this.room.leave();
      this.room = null;
    }
    this.client = null;
    this.p1CurrentInput = null;
    this.p2CurrentInput = null;
    this.p1AttackBuffer = null;
    this.p2AttackBuffer = null;
    this.p1DashBuffer = false;
    this.p2DashBuffer = false;
    this.stateListeners.clear();
    this.matchStartListeners.clear();
  }
}
