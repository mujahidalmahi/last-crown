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
import { GameSimulation, WarriorBotAI } from '@last-crown/game-core';
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
  private quickmatchBotTimer: NodeJS.Timeout | null = null;
  private quickmatchQueueInterval: NodeJS.Timeout | null = null;
  private reconnectGraceInterval: NodeJS.Timeout | null = null;
  private secondsInQueue = 0;
  private isPrivateMatch = true;
  private isBotMatch = false;
  private serverBotAI: WarriorBotAI | null = null;
  private tickErrorCount = 0;

  public onCreate(options: {
    isPrivate?: boolean;
    warriorPreset?: string;
    playerName?: string;
    arenaId?: string;
  }): void {
    this.setState(new BattleRoomState());

    if (options.arenaId) {
      this.state.arenaId = options.arenaId;
    }

    this.isPrivateMatch = options.isPrivate !== false;
    if (this.isPrivateMatch) {
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
      async (client, rawMessage: VoiceSignalClientMessage) => {
        if (!rawMessage || !rawMessage.signal) return;
        const { signal } = rawMessage;
        if (signal.type === 'ice_servers') {
          const iceServers = await IceServerService.getIceServers();
          client.send(ServerMessageType.VOICE_SIGNAL, {
            from: 'server',
            signal: {
              type: 'ice_servers',
              data: { iceServers },
            },
          });
          return;
        }

        if (signal.type === 'ready') {
          this.voiceClients.add(client.sessionId);
          // Push active ICE / TURN servers directly to client over Colyseus WebSocket
          const iceServers = await IceServerService.getIceServers();
          client.send(ServerMessageType.VOICE_SIGNAL, {
            from: 'server',
            signal: {
              type: 'ice_servers',
              data: { iceServers },
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

    // Immediate Bot Opponent Request (for skipping wait or testing)
    this.onMessage(ClientMessageType.REQUEST_BOT_OPPONENT, () => {
      if (this.state.matchState === 'waiting' && this.clients.length === 1 && !this.simulation) {
        this.clearQuickmatchTimers();
        this.spawnBotOpponent();
      }
    });

    // In-game Match Forfeit / Surrender Request
    this.onMessage(ClientMessageType.FORFEIT_MATCH, client => {
      if (this.state.matchState === 'in_progress' || this.state.matchState === 'round_over') {
        this.handleForfeit(client.sessionId);
      }
    });

    // Ready Approval (Lobby) & Rematch Ready (Post-Match) Handler
    this.onMessage(ClientMessageType.READY, client => {
      // Case A: Pre-match lobby ready approval in private custom rooms
      if (this.state.matchState === 'waiting') {
        const warrior = this.state.warriors.get(client.sessionId);
        if (warrior) {
          warrior.isReady = !warrior.isReady;
        }

        // Start match once 2 players are present and both have approved readiness
        if (this.clients.length === 2 && this.areAllWarriorsReady()) {
          this.startMatch();
        }
        return;
      }

      // Case B: Post-match rematch approval
      if (this.state.matchState === 'match_over' && this.simulation) {
        if (this.isBotMatch) {
          // Instant rematch against authoritative bot!
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
          this.serverBotAI?.reset();
          this.state.matchState = 'in_progress';
          this.state.winnerId = '';
          this.state.endReason = 'normal';
          this.broadcast(ServerMessageType.MATCH_START, {
            roundNumber: 1,
            isBot: true,
          });
          return;
        }

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
          this.state.endReason = 'normal';
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
    warriorState.isBot = false;
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

    // If this is a public quickmatch and only 1 player is connected, start bot matchmaking timer
    if (!this.isPrivateMatch && this.clients.length === 1) {
      this.startQuickmatchBotTimer();
    } else if (this.clients.length >= 2) {
      // 2nd human player joined! Cancel pending bot matchmaking
      this.clearQuickmatchTimers();
    }

    // Once 2 players join, initialize match if public quickmatch, or wait for ready approvals if private
    if (this.clients.length === 2 && !this.simulation && this.clientMetadata.size >= 2) {
      this.clearQuickmatchTimers();
      if (!this.isPrivateMatch) {
        this.startMatch();
      }
      // In private custom rooms, keep in 'waiting' state until both warriors approve readiness!
    }
  }

  private areAllWarriorsReady(): boolean {
    if (this.state.warriors.size < 2) return false;
    let allReady = true;
    this.state.warriors.forEach(warrior => {
      if (!warrior.isReady) {
        allReady = false;
      }
    });
    return allReady;
  }

  private startMatch(): void {
    if (this.simulation || this.clientMetadata.size < 2) return;

    this.clearQuickmatchTimers();
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

    this.simulation.onRoundStart((roundNumber: number) => {
      this.broadcast(ServerMessageType.ROUND_START, {
        roundNumber,
        isSuddenDeath: this.simulation?.isSuddenDeath ?? false,
      });
    });

    this.state.matchState = 'in_progress';
    this.state.endReason = 'normal';
    this.broadcast(ServerMessageType.MATCH_START, {
      roundNumber: 1,
      p1Id: p1.id,
      p2Id: p2.id,
    });
  }

  private startQuickmatchBotTimer(): void {
    this.clearQuickmatchTimers();
    this.secondsInQueue = 0;
    const botTimeoutSec = serverEnv.SERVER_QUICKMATCH_BOT_TIMEOUT_SEC;

    // Send initial queue status
    this.broadcast(ServerMessageType.MATCH_QUEUE_STATUS, {
      secondsInQueue: 0,
      secondsUntilBot: botTimeoutSec,
    });

    this.quickmatchQueueInterval = setInterval(() => {
      this.secondsInQueue++;
      const secondsUntilBot = Math.max(0, botTimeoutSec - this.secondsInQueue);
      this.broadcast(ServerMessageType.MATCH_QUEUE_STATUS, {
        secondsInQueue: this.secondsInQueue,
        secondsUntilBot,
      });
    }, 1000);

    this.quickmatchBotTimer = setTimeout(() => {
      this.clearQuickmatchTimers();
      if (this.clients.length === 1 && !this.simulation) {
        this.spawnBotOpponent();
      }
    }, botTimeoutSec * 1000);
  }

  private clearQuickmatchTimers(): void {
    if (this.quickmatchBotTimer) {
      clearTimeout(this.quickmatchBotTimer);
      this.quickmatchBotTimer = null;
    }
    if (this.quickmatchQueueInterval) {
      clearInterval(this.quickmatchQueueInterval);
      this.quickmatchQueueInterval = null;
    }
  }

  public spawnBotOpponent(): void {
    if (this.simulation || this.clients.length === 0) return;

    this.clearQuickmatchTimers();
    this.isBotMatch = true;
    this.state.isBotMatch = true;

    // Lock room from Colyseus matchmaking so no other player interrupts active bot match
    if (this.presence) {
      try {
        this.lock().catch(() => {});
      } catch {
        // Ignored if lock fails or already locked
      }
    }

    const humanMeta = Array.from(this.clientMetadata.values())[0];
    if (!humanMeta) return;

    const botProfiles: {
      name: string;
      preset: string;
      difficulty: 'novice' | 'adept' | 'master';
    }[] = [
      { name: 'Sir Roderick the Unyielding (AI)', preset: 'knight', difficulty: 'adept' },
      { name: 'Valeria the Crimson Shadow (AI)', preset: 'duelist', difficulty: 'master' },
      { name: 'Gorgoroth the Skullcrusher (AI)', preset: 'marauder', difficulty: 'master' },
      { name: 'Alden the Ironclad (AI)', preset: 'knight', difficulty: 'adept' },
      { name: 'Sylvia the Swift (AI)', preset: 'duelist', difficulty: 'adept' },
      { name: 'Brutus the Berserker (AI)', preset: 'marauder', difficulty: 'novice' },
    ];
    const profile = (botProfiles[Math.floor(Math.random() * botProfiles.length)] ||
      botProfiles[0])!;
    const botPreset = profile.preset;
    const botName = profile.name;

    const botSessionId = 'bot_champion';
    const botMeta: ClientMetadata = {
      id: botSessionId,
      name: botName,
      preset: botPreset,
      isHost: false,
      lastInputSequence: 0,
      inputMessageCount: 0,
      lastInputWindowReset: Date.now(),
    };
    this.clientMetadata.set(botSessionId, botMeta);

    const arenaConfig = getArenaConfig(this.state.arenaId);
    const botWarriorState = new WarriorNetworkState();
    botWarriorState.id = botSessionId;
    botWarriorState.name = botName;
    botWarriorState.x = arenaConfig.spawnPointP2.x;
    botWarriorState.y = arenaConfig.spawnPointP2.y;
    botWarriorState.facing = 'left';
    botWarriorState.isBot = true;
    this.state.warriors.set(botSessionId, botWarriorState);

    this.p1SessionId = humanMeta.id;
    this.p2SessionId = botSessionId;
    this.serverBotAI = new WarriorBotAI(profile.difficulty);

    this.simulation = new GameSimulation(
      humanMeta.id,
      humanMeta.name,
      humanMeta.preset,
      botSessionId,
      botName,
      botPreset,
      this.state.arenaId
    );

    this.simulation.onCombatEvent((result: HitResult) => {
      this.broadcast(ServerMessageType.COMBAT_EVENT, {
        tick: Date.now(),
        result,
      });
    });

    this.simulation.onRoundStart((roundNumber: number) => {
      this.broadcast(ServerMessageType.ROUND_START, {
        roundNumber,
        isSuddenDeath: this.simulation?.isSuddenDeath ?? false,
      });
    });

    this.state.matchState = 'in_progress';
    this.state.endReason = 'normal';
    this.broadcast(ServerMessageType.MATCH_START, {
      roundNumber: 1,
      p1Id: humanMeta.id,
      p2Id: botSessionId,
      isBot: true,
      botName,
    });
  }

  public async onLeave(client: Client, consented?: boolean): Promise<void> {
    const warrior = this.state.warriors.get(client.sessionId);
    if (warrior) {
      warrior.isConnected = false;
    }

    // If human playing against a bot leaves:
    if (this.isBotMatch) {
      this.cleanupClient(client.sessionId);
      this.disconnect();
      return;
    }

    if (consented) {
      // User explicitly left: surrender / forfeit
      this.handleForfeit(client.sessionId);
      return;
    }

    // Unintentional disconnect: provide grace period for reconnection
    await this.handleUnintentionalDisconnect(client);
  }

  public handleForfeit(sessionId: string): void {
    const isHost = this.clientMetadata.get(sessionId)?.isHost ?? false;

    // Case 1: In-Game Forfeit / Surrender
    if (this.state.matchState === 'in_progress' || this.state.matchState === 'round_over') {
      const remainingClient = this.clients.find(c => c.sessionId !== sessionId);
      const remainingId =
        remainingClient?.sessionId ||
        Array.from(this.clientMetadata.keys()).find(
          id => id !== sessionId && id !== 'bot_champion'
        ) ||
        '';

      this.state.matchState = 'match_over';
      this.state.winnerId = remainingId;
      this.state.endReason = 'opponent_forfeit';

      this.broadcast(ServerMessageType.OPPONENT_LEFT, {
        sessionId,
        reason: 'forfeit',
        message: 'Opponent forfeited and fled the arena. Victory awarded!',
      });

      this.broadcast(ServerMessageType.MATCH_END, {
        winnerId: remainingId,
        reason: 'opponent_forfeit',
        message: 'Opponent fled the arena! Victory by Forfeit!',
      });

      this.cleanupClient(sessionId);

      if (!this.matchOverTimeoutTimer) {
        this.matchOverTimeoutTimer = setTimeout(() => {
          this.disconnect();
        }, serverEnv.SERVER_ROOM_MATCH_OVER_TIMEOUT_SEC * 1000);
      }
      return;
    }

    // Case 2: Post-Match Rematch Departure
    if (this.state.matchState === 'match_over') {
      this.rematchReadyClients.delete(sessionId);
      const remainingClient = this.clients.find(c => c.sessionId !== sessionId);
      if (remainingClient) {
        remainingClient.send(ServerMessageType.OPPONENT_LEFT, {
          sessionId,
          reason: 'rematch_declined',
          message: 'Opponent departed the hall.',
        });
      }
      this.cleanupClient(sessionId);
      return;
    }

    // Case 3: Waiting Chamber Lobby Departure
    if (this.state.matchState === 'waiting') {
      // Reset ready approvals for any remaining warriors so new matchups require fresh confirmation
      this.state.warriors.forEach(w => {
        w.isReady = false;
      });

      if (isHost && this.isPrivateMatch) {
        const opponent = this.clients.find(c => c.sessionId !== sessionId);
        if (opponent) {
          opponent.send(ServerMessageType.OPPONENT_LEFT, {
            sessionId,
            reason: 'host_left',
            message: 'Host closed the chamber.',
          });
        }
        this.cleanupClient(sessionId);
        this.disconnect();
      } else {
        const opponent = this.clients.find(c => c.sessionId !== sessionId);
        if (opponent) {
          opponent.send(ServerMessageType.OPPONENT_LEFT, {
            sessionId,
            reason: 'guest_left',
            message: 'Challenger departed the chamber.',
          });
        }
        this.cleanupClient(sessionId);
        if (!this.isPrivateMatch && this.clients.length === 1) {
          this.startQuickmatchBotTimer();
        }
      }
    }
  }

  private disconnectedSessionId: string | null = null;

  public async handleUnintentionalDisconnect(client: Client): Promise<void> {
    const warrior = this.state.warriors.get(client.sessionId);

    // If disconnected while waiting in lobby, treat as normal departure
    if (this.state.matchState === 'waiting') {
      this.handleForfeit(client.sessionId);
      return;
    }

    const graceTimeoutSec = serverEnv.SERVER_ROOM_RECONNECT_TIMEOUT_SEC;
    this.disconnectedSessionId = client.sessionId;
    this.state.isOpponentDisconnected = true;
    this.state.disconnectGraceRemainingSec = graceTimeoutSec;

    this.broadcast(ServerMessageType.PLAYER_DISCONNECTED, {
      sessionId: client.sessionId,
      gracePeriodSec: graceTimeoutSec,
    });

    if (this.reconnectGraceInterval) {
      clearInterval(this.reconnectGraceInterval);
    }
    this.reconnectGraceInterval = setInterval(() => {
      if (this.state.disconnectGraceRemainingSec > 0) {
        this.state.disconnectGraceRemainingSec--;
      }
    }, 1000);

    try {
      await this.allowReconnection(client, graceTimeoutSec);

      // Reconnection successful!
      if (this.reconnectGraceInterval) {
        clearInterval(this.reconnectGraceInterval);
        this.reconnectGraceInterval = null;
      }
      this.disconnectedSessionId = null;
      if (warrior) {
        warrior.isConnected = true;
      }
      this.state.isOpponentDisconnected = false;
      this.state.disconnectGraceRemainingSec = 0;

      const meta = this.clientMetadata.get(client.sessionId);
      if (meta) {
        meta.lastInputSequence = 0;
        meta.inputMessageCount = 0;
      }
      this.clientInputs.delete(client.sessionId);

      this.broadcast(ServerMessageType.PLAYER_RECONNECTED, {
        sessionId: client.sessionId,
      });
    } catch {
      // Grace period expired without reconnection!
      if (this.reconnectGraceInterval) {
        clearInterval(this.reconnectGraceInterval);
        this.reconnectGraceInterval = null;
      }
      this.disconnectedSessionId = null;
      this.state.isOpponentDisconnected = false;
      this.state.disconnectGraceRemainingSec = 0;

      const remainingClient = this.clients.find(c => c.sessionId !== client.sessionId);
      const remainingId =
        remainingClient?.sessionId ||
        Array.from(this.clientMetadata.keys()).find(id => id !== client.sessionId) ||
        '';

      if (this.state.matchState === 'in_progress' || this.state.matchState === 'round_over') {
        this.state.matchState = 'match_over';
        this.state.winnerId = remainingId;
        this.state.endReason = 'opponent_disconnect_timeout';

        this.broadcast(ServerMessageType.OPPONENT_LEFT, {
          sessionId: client.sessionId,
          reason: 'disconnect_timeout',
          message: 'Opponent connection timed out. Victory awarded!',
        });

        this.broadcast(ServerMessageType.MATCH_END, {
          winnerId: remainingId,
          reason: 'opponent_disconnect_timeout',
          message: 'Opponent connection timed out. Victory awarded!',
        });

        if (!this.matchOverTimeoutTimer) {
          this.matchOverTimeoutTimer = setTimeout(() => {
            this.disconnect();
          }, serverEnv.SERVER_ROOM_MATCH_OVER_TIMEOUT_SEC * 1000);
        }
      }

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

    // Auto-dispose room immediately if all human clients have left
    const humanClientsCount = Array.from(this.clientMetadata.keys()).filter(
      id => id !== 'bot_champion'
    ).length;

    if (humanClientsCount === 0) {
      this.disconnect();
      return;
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

      let p1Input = p1Id ? this.clientInputs.get(p1Id) || null : null;
      let p2Input = p2Id ? this.clientInputs.get(p2Id) || null : null;

      // Authoritative Bot input generation if P2 is an AI gladiator
      if (this.isBotMatch && this.serverBotAI && p2Id === 'bot_champion') {
        const snap = this.simulation.getSnapshot();
        p2Input = this.serverBotAI.update(snap.p2, snap.p1, deltaTimeMs);
      } else if (this.state.isOpponentDisconnected) {
        // Enforce neutral defending stance for disconnected player during grace countdown
        if (this.disconnectedSessionId === p1Id) {
          p1Input = {
            sequence: 0,
            timestamp: Date.now(),
            moveX: 0,
            jump: false,
            attack: false,
            block: true,
            parry: false,
          };
        } else if (this.disconnectedSessionId === p2Id) {
          p2Input = {
            sequence: 0,
            timestamp: Date.now(),
            moveX: 0,
            jump: false,
            attack: false,
            block: true,
            parry: false,
          };
        }
      }

      const previousState = this.state.matchState;

      // Step authoritative simulation
      this.simulation.step(p1Input, p2Input, deltaSec);

      // Clear one-shot action impulses so they aren't repeatedly processed on subsequent ticks
      if (p1Input) {
        p1Input.attack = false;
        p1Input.dash = false;
        p1Input.parry = false;
        p1Input.jump = false;
      }
      if (p2Input) {
        p2Input.attack = false;
        p2Input.dash = false;
        p2Input.parry = false;
        p2Input.jump = false;
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

  public onUncaughtException(err: Error, methodName: string): void {
    console.error(`[BattleRoom ${this.roomId}] Uncaught exception in ${methodName}:`, err);
  }

  public onDispose(): void {
    if (this.simulation) {
      this.simulation = null;
    }
    this.clearQuickmatchTimers();
    if (this.reconnectGraceInterval) {
      clearInterval(this.reconnectGraceInterval);
      this.reconnectGraceInterval = null;
    }
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
    this.serverBotAI = null;
    this.rematchReadyClients.clear();
    this.voiceClients.clear();
    this.clientMetadata.clear();
    this.clientInputs.clear();
  }
}
