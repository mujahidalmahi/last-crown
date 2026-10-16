import colyseus from 'colyseus';
import type { Client } from 'colyseus';

const { Room } = colyseus;
import {
  PartyMessageType,
  PartySlotState,
  PlayerInputMessage,
  VibrateControllerMessage,
} from '@last-crown/shared';

interface PartyJoinOptions {
  isHost?: boolean;
  partyCode?: string;
  preferredSlot?: 'p1' | 'p2';
  playerName?: string;
  warriorPreset?: string;
}

export class PartyControllerRoom extends Room {
  public maxClients = 8;
  private hostClient: Client | null = null;
  private p1Client: Client | null = null;
  private p2Client: Client | null = null;
  private p1Name = 'Player 1';
  private p2Name = 'Player 2';
  private p1Preset = 'knight';
  private p2Preset = 'marauder';
  private partyCode = '';

  public onCreate(options: PartyJoinOptions): void {
    this.partyCode = options.partyCode || this.roomId.slice(0, 4).toUpperCase();
    this.setMetadata({ partyCode: this.partyCode });

    this.onMessage(
      PartyMessageType.CLAIM_SLOT,
      (client: Client, data: { slot: 'p1' | 'p2'; playerName?: string }) => {
        this.handleClaimSlot(client, data.slot, data.playerName);
      }
    );

    this.onMessage(
      PartyMessageType.SET_WARRIOR_PRESET,
      (client: Client, data: { preset: string }) => {
        if (client === this.p1Client) {
          this.p1Preset = data.preset;
        } else if (client === this.p2Client) {
          this.p2Preset = data.preset;
        }
        this.broadcastPartyState();
      }
    );

    this.onMessage(
      PartyMessageType.CONTROLLER_INPUT,
      (client: Client, data: { input: PlayerInputMessage }) => {
        if (!this.hostClient || !data || !data.input) return;

        const slot = client === this.p1Client ? 'p1' : client === this.p2Client ? 'p2' : null;
        if (!slot) return;

        this.hostClient.send(PartyMessageType.CONTROLLER_INPUT, {
          slot,
          input: data.input,
        });
      }
    );

    this.onMessage(
      PartyMessageType.VIBRATE_CONTROLLER,
      (_client: Client, data: VibrateControllerMessage) => {
        // Forward haptic rumble events from host to the phone controllers
        if (data.slot === 'p1' || data.slot === 'all') {
          this.p1Client?.send(PartyMessageType.VIBRATE_CONTROLLER, data);
        }
        if (data.slot === 'p2' || data.slot === 'all') {
          this.p2Client?.send(PartyMessageType.VIBRATE_CONTROLLER, data);
        }
      }
    );

    this.onMessage(PartyMessageType.START_MATCH, (client: Client) => {
      // Allow host or ready controller to signal match start
      this.broadcast(PartyMessageType.START_MATCH, {
        startedBy: client.sessionId,
        p1Preset: this.p1Preset,
        p2Preset: this.p2Preset,
      });
    });
  }

  public onJoin(client: Client, options: PartyJoinOptions): void {
    if (options?.isHost) {
      this.hostClient = client;
    } else {
      // Assign slot to phone controller
      if (options?.preferredSlot === 'p1' && !this.p1Client) {
        this.p1Client = client;
        if (options.playerName) this.p1Name = options.playerName;
        if (options.warriorPreset) this.p1Preset = options.warriorPreset;
      } else if (options?.preferredSlot === 'p2' && !this.p2Client) {
        this.p2Client = client;
        if (options.playerName) this.p2Name = options.playerName;
        if (options.warriorPreset) this.p2Preset = options.warriorPreset;
      } else if (!this.p1Client) {
        this.p1Client = client;
        if (options?.playerName) this.p1Name = options.playerName;
        if (options?.warriorPreset) this.p1Preset = options.warriorPreset;
      } else if (!this.p2Client) {
        this.p2Client = client;
        if (options?.playerName) this.p2Name = options.playerName;
        if (options?.warriorPreset) this.p2Preset = options.warriorPreset;
      }
    }

    this.broadcastPartyState();
  }

  private handleClaimSlot(client: Client, targetSlot: 'p1' | 'p2', playerName?: string): void {
    if (targetSlot === 'p1') {
      if (this.p1Client && this.p1Client !== client) {
        return; // Slot already occupied
      }
      if (this.p2Client === client) {
        this.p2Client = null;
      }
      this.p1Client = client;
      if (playerName) this.p1Name = playerName;
    } else if (targetSlot === 'p2') {
      if (this.p2Client && this.p2Client !== client) {
        return; // Slot already occupied
      }
      if (this.p1Client === client) {
        this.p1Client = null;
      }
      this.p2Client = client;
      if (playerName) this.p2Name = playerName;
    }

    this.broadcastPartyState();
  }

  private broadcastPartyState(): void {
    const baseState: PartySlotState = {
      p1Connected: !!this.p1Client,
      p2Connected: !!this.p2Client,
      p1Name: this.p1Name,
      p2Name: this.p2Name,
      p1Preset: this.p1Preset,
      p2Preset: this.p2Preset,
      hostConnected: !!this.hostClient,
    };

    // Send personalized state to each client indicating their assigned slot
    for (const client of this.clients) {
      const assignedSlot =
        client === this.p1Client ? 'p1' : client === this.p2Client ? 'p2' : 'spectator';
      client.send(PartyMessageType.PARTY_STATE, {
        ...baseState,
        assignedSlot,
      });
    }
  }

  public onLeave(client: Client): void {
    if (client === this.hostClient) {
      this.hostClient = null;
    }
    if (client === this.p1Client) {
      this.p1Client = null;
    }
    if (client === this.p2Client) {
      this.p2Client = null;
    }
    this.broadcastPartyState();
  }

  public onDispose(): void {
    this.hostClient = null;
    this.p1Client = null;
    this.p2Client = null;
  }
}
