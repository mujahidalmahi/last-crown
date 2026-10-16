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
  VoiceSignalClientMessage,
} from '@last-crown/shared';
import { GameSimulation } from '@last-crown/game-core';
import { getArenaConfig } from '@last-crown/game-config';
import { RoomRegistry } from '../matchmaking/RoomRegistry.js';
import { serverEnv } from '../config/env.js';
import { IceServerService } from '../services/IceServerService.js';

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
  private p1SessionId: string | null = null;
  private p2SessionId: string | null = null;
  private clientMetadata = new Map<string, ClientMetadata>();
  private clientInputs = new Map<string, PlayerInputMessage>();
  private rematchReadyClients = new Set<string>();
  private voiceClients = new Set<string>();
  private inviteCode: string = '';
  private creationTimeoutTimer: NodeJS.Timeout | null = null;
  private matchOverTimeoutTimer: NodeJS.Timeout | null = null;
  private tickErrorCount = 0;

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

    // Auto-dispose abandoned unjoined rooms to prevent memory leaks across multiple matches
    this.creationTimeoutTimer = setTimeout(() => {
      if (this.clients.length === 0) {
        this.disconnect();
      }
    }, serverEnv.SERVER_ROOM_EMPTY_TIMEOUT_SEC * 1000);

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

      // Rate limit inputs (ceiling of 240 messages / sec per client to safely support high-refresh monitors)
      const now = Date.now();
      if (now - meta.lastInputWindowReset > 1000) {
        meta.inputMessageCount = 0;
        meta.lastInputWindowReset = now;
      }
      meta.inputMessageCount++;
      if (meta.inputMessageCount > 240) {
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
    this.onMessage(ClientMessageType.PING, (client, message: { timestamp: number | bigint }) => {
      const clientTimestamp =
        typeof message?.timestamp === 'bigint'
          ? Number(message.timestamp)
          : Number(message?.timestamp || Date.now());
      client.send(ServerMessageType.PONG, {
        clientTimestamp,
        serverTimestamp: Date.now(),
      });
    });

    // Voice Signaling Relay: routes WebRTC offer/answer/candidates strictly to opponent in THIS room
    this.onMessage(
      ClientMessageType.VOICE_SIGNAL,
      (client, rawMessage: VoiceSignalClientMessage) => {
        if (!rawMessage || !rawMessage.signal) return;
        const { signal } = rawMessage;

        if (signal.type === 'ready') {
          this.voiceClients.add(client.sessionId);
          // Push active ICE / TURN servers directly to client over Colyseus WebSocket
          client.send(ServerMessageType.VOICE_SIGNAL, {
            from: 'server',
            signal: {
              type: 'ice_servers',
              data: { iceServers: IceServerService.getDefaultIceServers() },
            },
          });
        } else if (signal.type === 'leave') {
          this.voiceClients.delete(client.sessionId);
        }

        const opponent = this.clients.find(c => c.sessionId !== client.sessionId);
        if (opponent) {
          opponent.send(ServerMessageType.VOICE_SIGNAL, {
            from: client.sessionId,
            signal,
          });

          // If opponent was already in voice when this client sent ready, immediately inform client
          if (signal.type === 'ready' && this.voiceClients.has(opponent.sessionId)) {
            client.send(ServerMessageType.VOICE_SIGNAL, {
              from: opponent.sessionId,
              signal: { type: 'ready' },
            });
          }
        }
      }
    );

    // Rematch Ready Handler
    this.onMessage(ClientMessageType.READY, client => {
      if (this.state.matchState === 'match_over' && this.simulation) {
        this.rematchReadyClients.add(client.sessionId);
        // Start rematch when all connected clients in the room signal ready
        if (this.rematchReadyClients.size >= this.clients.length) {
          this.rematchReadyClients.clear();
          if (this.matchOverTimeoutTimer) {
            clearTimeout(this.matchOverTimeoutTimer);
            this.matchOverTimeoutTimer = null;
          }
          for (const meta of this.clientMetadata.values()) {
            meta.lastInputSequence = 0;
            meta.inputMessageCount = 0;
          }
          this.clientInputs.clear();
          this.simulation.resetMatch();
          this.state.matchState = 'in_progress';
          this.state.winnerId = '';
          this.broadcast(ServerMessageType.MATCH_START, {
            roundNumber: 1,
          });
        }
      }
    });
  }

  public onJoin(client: Client, options: { playerName?: string; warriorPreset?: string }): void {
    if (this.creationTimeoutTimer) {
      clearTimeout(this.creationTimeoutTimer);
      this.creationTimeoutTimer = null;
    }

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

    const arenaConfig = getArenaConfig(this.state.arenaId);
    const spawnPoint = isHost ? arenaConfig.spawnPointP1 : arenaConfig.spawnPointP2;

    const warriorState = new WarriorNetworkState();
    warriorState.id = client.sessionId;
    warriorState.name = name;
    warriorState.x = spawnPoint.x;
    warriorState.y = spawnPoint.y;
    warriorState.facing = isHost ? 'right' : 'left';
    this.state.warriors.set(client.sessionId, warriorState);

    RoomRegistry.getInstance().updatePlayerCount(this.roomId, this.clients.length);

    // If an opponent in this chamber is already in voice chat, inform the joining player
    for (const voiceSessionId of this.voiceClients) {
      if (voiceSessionId !== client.sessionId) {
        client.send(ServerMessageType.VOICE_SIGNAL, {
          from: voiceSessionId,
          signal: { type: 'ready' },
        });
      }
    }

    // Once 2 players join, initialize the authoritative GameSimulation
    if (this.clients.length === 2 && !this.simulation && this.clientMetadata.size >= 2) {
      const clientsList = Array.from(this.clientMetadata.values());
      const p1 = clientsList[0]!;
      const p2 = clientsList[1]!;

      this.p1SessionId = p1.id;
      this.p2SessionId = p2.id;

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
      const meta = this.clientMetadata.get(client.sessionId);
      if (meta) {
        meta.lastInputSequence = 0;
        meta.inputMessageCount = 0;
      }
      this.clientInputs.delete(client.sessionId);
    } catch {
      this.cleanupClient(client.sessionId);
    }
  }

  private cleanupClient(sessionId: string): void {
    this.clientMetadata.delete(sessionId);
    this.clientInputs.delete(sessionId);
    this.rematchReadyClients.delete(sessionId);
    this.voiceClients.delete(sessionId);
    this.state.warriors.delete(sessionId);
    RoomRegistry.getInstance().updatePlayerCount(this.roomId, this.clientMetadata.size);

    if (sessionId === this.p1SessionId) {
      this.p1SessionId = null;
    }
    if (sessionId === this.p2SessionId) {
      this.p2SessionId = null;
    }

    // Notify opponent in THIS room that the player has disconnected from voice
    const opponent = this.clients.find(c => c.sessionId !== sessionId);
    if (opponent) {
      opponent.send(ServerMessageType.VOICE_SIGNAL, {
        from: sessionId,
        signal: { type: 'leave' },
      });
    }

    // Auto-dispose room immediately if all clients have left
    if (this.clientMetadata.size === 0) {
      this.disconnect();
      return;
    }

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

      // Start match-over inactivity cleanup timer
      if (!this.matchOverTimeoutTimer) {
        this.matchOverTimeoutTimer = setTimeout(() => {
          this.disconnect();
        }, serverEnv.SERVER_ROOM_MATCH_OVER_TIMEOUT_SEC * 1000);
      }
    }
  }

  private updateSimulation(deltaTimeMs: number): void {
    if (
      !this.simulation ||
      (this.state.matchState !== 'in_progress' && this.state.matchState !== 'round_over')
    ) {
      return;
    }

    try {
      const deltaSec = deltaTimeMs / 1000;
      const p1Id = this.p1SessionId;
      const p2Id = this.p2SessionId;

      const p1Input = p1Id ? this.clientInputs.get(p1Id) || null : null;
      const p2Input = p2Id ? this.clientInputs.get(p2Id) || null : null;

      const previousState = this.state.matchState;

      // Step authoritative simulation
      this.simulation.step(p1Input, p2Input, deltaSec);

      // Clear one-shot action impulses so they aren't repeatedly processed on subsequent ticks
      if (p1Input) {
        p1Input.attack = false;
        p1Input.dash = false;
        p1Input.parry = false;
      }
      if (p2Input) {
        p2Input.attack = false;
        p2Input.dash = false;
        p2Input.parry = false;
      }

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

        // Set idle timeout for completed match
        if (!this.matchOverTimeoutTimer) {
          this.matchOverTimeoutTimer = setTimeout(() => {
            this.disconnect();
          }, serverEnv.SERVER_ROOM_MATCH_OVER_TIMEOUT_SEC * 1000);
        }
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
    } catch (err) {
      this.tickErrorCount++;
      console.error(
        `[BattleRoom ${this.roomId}] Simulation tick error (${this.tickErrorCount}):`,
        err
      );
      if (this.tickErrorCount >= 10) {
        this.broadcast(ServerMessageType.ERROR, {
          code: 'SIMULATION_FATAL',
          message: 'Authoritative simulation encountered a fatal exception. Room terminating.',
        });
        this.disconnect();
      }
    }
  }

  private syncWarriorState(sessionId: string, snap: WarriorSnapshot): void {
    const warrior = this.state.warriors.get(sessionId);
    if (!warrior) return;

    if (Number.isFinite(snap.position.x)) warrior.x = snap.position.x;
    if (Number.isFinite(snap.position.y)) warrior.y = snap.position.y;
    if (Number.isFinite(snap.velocity.x)) warrior.vx = snap.velocity.x;
    if (Number.isFinite(snap.velocity.y)) warrior.vy = snap.velocity.y;
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
    warrior.isDecapitated = snap.isDecapitated || false;
    warrior.comboCount = snap.comboCount || 0;
  }

  public onDispose(): void {
    if (this.creationTimeoutTimer) {
      clearTimeout(this.creationTimeoutTimer);
      this.creationTimeoutTimer = null;
    }
    if (this.matchOverTimeoutTimer) {
      clearTimeout(this.matchOverTimeoutTimer);
      this.matchOverTimeoutTimer = null;
    }
    if (this.inviteCode) {
      RoomRegistry.getInstance().unregisterRoom(this.roomId);
    }
    this.p1SessionId = null;
    this.p2SessionId = null;
    this.rematchReadyClients.clear();
    this.voiceClients.clear();
    this.clientMetadata.clear();
    this.clientInputs.clear();
  }
}
