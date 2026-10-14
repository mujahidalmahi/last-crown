import colyseus from 'colyseus';
import type { Client } from 'colyseus';

const { Room } = colyseus;
import {
  BattleRoomState,
  WarriorNetworkState,
  HitboxNetworkState,
  ClientMessageType,
  ServerMessageType,
  PlayerInputSchema,
  PlayerInputMessage,
  SIMULATION_DELTA_MS,
  HitResult,
  WarriorSnapshot,
} from '@last-crown/shared';
import { GameSimulation } from '@last-crown/game-core';
import { RoomRegistry } from '../matchmaking/RoomRegistry.js';
import { serverEnv } from '../config/env.js';

interface ClientMetadata {
  id: string;
  name: string;
  preset: string;
  isHost: boolean;
  lastInputSequence: number;
  inputMessageCount: number;
  lastInputWindowReset: number;
}

export class BattleRoom extends Room<BattleRoomState> {
  public maxClients = 2;
  private simulation: GameSimulation | null = null;
  private clientMetadata = new Map<string, ClientMetadata>();
  private clientInputs = new Map<string, PlayerInputMessage>();
  private inviteCode: string = '';

  public onCreate(options: {
    isPrivate?: boolean;
    warriorPreset?: string;
    playerName?: string;
  }): void {
    this.setState(new BattleRoomState());

    if (options.isPrivate !== false) {
      this.inviteCode = RoomRegistry.getInstance().registerRoom(this.roomId);
      this.state.inviteCode = this.inviteCode;
    }

    // Fixed timestep authoritative 60Hz tick simulation interval
    this.setSimulationInterval(
      (deltaTime: number) => this.updateSimulation(deltaTime),
      SIMULATION_DELTA_MS
    );

    // Register network message handlers
    this.registerMessageHandlers();
  }

  private registerMessageHandlers(): void {
    // Player Input Handler with validation & rate limiting
    this.onMessage(ClientMessageType.PLAYER_INPUT, (client, rawMessage) => {
      const meta = this.clientMetadata.get(client.sessionId);
      if (!meta) return;

      // Rate limit inputs (max 120 messages / sec per client)
      const now = Date.now();
      if (now - meta.lastInputWindowReset > 1000) {
        meta.inputMessageCount = 0;
        meta.lastInputWindowReset = now;
      }
      meta.inputMessageCount++;
      if (meta.inputMessageCount > 120) {
        // Discard excessive input spam
        return;
      }

      // Runtime schema validation
      const parseResult = PlayerInputSchema.safeParse(rawMessage);
      if (!parseResult.success) {
        client.send(ServerMessageType.ERROR, {
          code: 'MALFORMED_INPUT',
          message: 'Invalid input payload structure',
        });
        return;
      }

      const input = parseResult.data;

      // Drop stale sequence inputs
      if (input.sequence <= meta.lastInputSequence) {
        return;
      }
      meta.lastInputSequence = input.sequence;

      // Store latest validated input
      this.clientInputs.set(client.sessionId, input);
    });

    // Ping / Latency Handler
    this.onMessage(ClientMessageType.PING, (client, message: { timestamp: number }) => {
      client.send(ServerMessageType.PONG, {
        clientTimestamp: message?.timestamp || Date.now(),
        serverTimestamp: Date.now(),
      });
    });

    // Rematch Ready Handler
    this.onMessage(ClientMessageType.READY, () => {
      if (this.state.matchState === 'match_over' && this.simulation) {
        this.simulation.resetMatch();
        this.state.matchState = 'in_progress';
        this.state.winnerId = '';
        this.broadcast(ServerMessageType.MATCH_START, {
          roundNumber: 1,
        });
      }
    });
  }

  public onJoin(client: Client, options: { playerName?: string; warriorPreset?: string }): void {
    const isHost = this.clients.length === 1;
    const name = options?.playerName || `Warrior ${this.clients.length}`;
    const preset = options?.warriorPreset || 'knight';

    const meta: ClientMetadata = {
      id: client.sessionId,
      name,
      preset,
      isHost,
      lastInputSequence: 0,
      inputMessageCount: 0,
      lastInputWindowReset: Date.now(),
    };
    this.clientMetadata.set(client.sessionId, meta);

    const warriorState = new WarriorNetworkState();
    warriorState.id = client.sessionId;
    warriorState.name = name;
    this.state.warriors.set(client.sessionId, warriorState);

    RoomRegistry.getInstance().updatePlayerCount(this.roomId, this.clients.length);

    // Once 2 players join, initialize the authoritative GameSimulation
    if (this.clients.length === 2 && !this.simulation) {
      const clientsList = Array.from(this.clientMetadata.values());
      const p1 = clientsList[0]!;
      const p2 = clientsList[1]!;

      this.simulation = new GameSimulation(
        p1.id,
        p1.name,
        p1.preset,
        p2.id,
        p2.name,
        p2.preset,
        this.state.arenaId
      );

      this.simulation.onCombatEvent((result: HitResult) => {
        this.broadcast(ServerMessageType.COMBAT_EVENT, {
          tick: Date.now(),
          result,
        });
      });

      this.state.matchState = 'in_progress';
      this.broadcast(ServerMessageType.MATCH_START, {
        roundNumber: 1,
        p1Id: p1.id,
        p2Id: p2.id,
      });
    }
  }

  public async onLeave(client: Client, consented?: boolean): Promise<void> {
    const warrior = this.state.warriors.get(client.sessionId);
    if (warrior) {
      warrior.isConnected = false;
    }

    if (consented) {
      // User explicitly left
      this.cleanupClient(client.sessionId);
      return;
    }

    // Unintentional disconnect: provide grace period for reconnection
    try {
      await this.allowReconnection(client, serverEnv.SERVER_ROOM_RECONNECT_TIMEOUT_SEC);
      if (warrior) {
        warrior.isConnected = true;
      }
    } catch {
      this.cleanupClient(client.sessionId);
    }
  }

  private cleanupClient(sessionId: string): void {
    this.clientMetadata.delete(sessionId);
    this.clientInputs.delete(sessionId);
    this.state.warriors.delete(sessionId);
    RoomRegistry.getInstance().updatePlayerCount(this.roomId, this.clients.length);

    if (
      this.clientMetadata.size < 2 &&
      (this.state.matchState === 'in_progress' || this.state.matchState === 'round_over')
    ) {
      this.state.matchState = 'match_over';
      const remainingClient = Array.from(this.clientMetadata.keys())[0];
      if (remainingClient) {
        this.state.winnerId = remainingClient;
      }
      this.broadcast(ServerMessageType.MATCH_END, {
        winnerId: this.state.winnerId,
      });
    }
  }

  private updateSimulation(deltaTimeMs: number): void {
    if (
      !this.simulation ||
      (this.state.matchState !== 'in_progress' && this.state.matchState !== 'round_over')
    ) {
      return;
    }

    const deltaSec = deltaTimeMs / 1000;
    const clientIds = Array.from(this.clientMetadata.keys());
    const p1Id = clientIds[0];
    const p2Id = clientIds[1];

    const p1Input = p1Id ? this.clientInputs.get(p1Id) || null : null;
    const p2Input = p2Id ? this.clientInputs.get(p2Id) || null : null;

    const previousState = this.state.matchState;

    // Step authoritative simulation
    this.simulation.step(p1Input, p2Input, deltaSec);

    // Synchronize simulation output with Colyseus state schema
    const snap = this.simulation.getSnapshot();
    this.state.matchState = snap.matchState;
    this.state.roundNumber = snap.roundNumber;
    this.state.timerSeconds = snap.timerSeconds;
    this.state.winnerId = snap.winnerId || '';

    // Broadcast round transitions
    if (snap.matchState === 'round_over' && previousState === 'in_progress') {
      this.broadcast(ServerMessageType.ROUND_END, {
        roundNumber: snap.roundNumber,
        winnerId: snap.winnerId,
      });
    } else if (snap.matchState === 'match_over') {
      this.broadcast(ServerMessageType.MATCH_END, {
        winnerId: snap.winnerId,
      });
    }

    if (p1Id) {
      this.syncWarriorState(p1Id, snap.p1);
    }
    if (p2Id) {
      this.syncWarriorState(p2Id, snap.p2);
    }

    // Sync active hitboxes
    this.state.activeHitboxes.clear();
    for (const hb of snap.activeHitboxes) {
      const hbState = new HitboxNetworkState();
      hbState.id = hb.id;
      hbState.ownerId = hb.ownerId;
      hbState.x = hb.bounds.x;
      hbState.y = hb.bounds.y;
      hbState.width = hb.bounds.width;
      hbState.height = hb.bounds.height;
      hbState.isActive = hb.isActive;
      this.state.activeHitboxes.push(hbState);
    }
  }

  private syncWarriorState(sessionId: string, snap: WarriorSnapshot): void {
    const warrior = this.state.warriors.get(sessionId);
    if (!warrior) return;

    warrior.x = snap.position.x;
    warrior.y = snap.position.y;
    warrior.vx = snap.velocity.x;
    warrior.vy = snap.velocity.y;
    warrior.facing = snap.facing;
    warrior.isGrounded = snap.isGrounded;
    warrior.health = snap.health;
    warrior.maxHealth = snap.maxHealth;
    warrior.stamina = snap.stamina;
    warrior.maxStamina = snap.maxStamina;
    warrior.state = snap.state;
    warrior.attackPhase = snap.attackPhase;
    warrior.currentAttackId = snap.currentAttackId || '';
    warrior.roundsWon = snap.roundsWon;
    warrior.isExhausted = snap.isExhausted;
  }

  public onDispose(): void {
    if (this.inviteCode) {
      RoomRegistry.getInstance().unregisterRoom(this.roomId);
    }
    this.clientMetadata.clear();
    this.clientInputs.clear();
  }
}
