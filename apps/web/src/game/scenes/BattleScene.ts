import * as Phaser from 'phaser';
import { Room } from 'colyseus.js';
import {
  HitResult,
  BattleRoomState,
  WarriorNetworkState,
  WarriorSnapshot,
  ClientMessageType,
  ServerMessageType,
  Direction,
  WarriorActionState,
  AttackPhase,
  MatchState,
} from '@last-crown/shared';
import { GameSimulation, WarriorBotAI, GameSimulationSnapshot } from '@last-crown/game-core';
import { WarriorRenderer } from '../rendering/WarriorRenderer';
import { CombatEffects } from '../effects/CombatEffects';
import { SoundManager } from '../audio/SoundManager';
import { KeyboardInputAdapter } from '../input/KeyboardInputAdapter';

export interface BattleSceneConfig {
  mode: 'singleplayer' | 'multiplayer';
  playerPreset?: string;
  opponentPreset?: string;
  arenaId?: string;
  colyseusRoom?: Room<BattleRoomState>;
  onSnapshot?: (snapshot: GameSimulationSnapshot) => void;
  onCombatEvent?: (result: HitResult) => void;
}

export class BattleScene extends Phaser.Scene {
  private config: BattleSceneConfig = { mode: 'singleplayer' };
  private simulation: GameSimulation | null = null;
  private botAI: WarriorBotAI | null = null;

  private p1Renderer: WarriorRenderer | null = null;
  private p2Renderer: WarriorRenderer | null = null;
  private effects: CombatEffects | null = null;
  private soundManager: SoundManager | null = null;
  private inputAdapter: KeyboardInputAdapter | null = null;

  private arenaGraphics: Phaser.GameObjects.Graphics | null = null;
  private torchGlowLeft: Phaser.GameObjects.Arc | null = null;
  private torchGlowRight: Phaser.GameObjects.Arc | null = null;
  private emberParticles: Phaser.GameObjects.Graphics | null = null;
  private embers: { x: number; y: number; vx: number; vy: number; alpha: number; size: number }[] =
    [];

  // Hit-stop impact pause timer (milliseconds)
  private hitStopRemainingMs: number = 0;

  // Sound edge detection to prevent oscillator spam
  private wasP1Attacking: boolean = false;
  private wasP2Attacking: boolean = false;
  private wasP1Exhausted: boolean = false;
  private wasP2Exhausted: boolean = false;

  private lastRemoteSnapshot: GameSimulationSnapshot | null = null;

  constructor() {
    super({ key: 'BattleScene' });
  }

  public init(data: BattleSceneConfig): void {
    if (data && data.mode) {
      this.config = { ...this.config, ...data };
    }
  }

  public create(): void {
    const { width, height } = this.scale;

    this.soundManager = new SoundManager();
    this.effects = new CombatEffects(this);
    this.inputAdapter = new KeyboardInputAdapter();

    // Render medieval castle arena backdrop with full gothic atmosphere
    this.drawArena(width, height);

    // Initialize atmospheric floating dust/ember particles
    this.emberParticles = this.add.graphics();
    this.embers = [];
    for (let i = 0; i < 40; i++) {
      this.embers.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 20 + 5,
        vy: -Math.random() * 25 - 10,
        alpha: Math.random() * 0.7 + 0.2,
        size: Math.random() * 2.5 + 1,
      });
    }

    // Instantiate warrior renderers
    this.p1Renderer = new WarriorRenderer(this, true);
    this.p2Renderer = new WarriorRenderer(this, false);

    // If in singleplayer mode, initialize local offline GameSimulation + AI
    if (this.config.mode === 'singleplayer') {
      this.simulation = new GameSimulation(
        'p1',
        'Crown Champion',
        this.config.playerPreset || 'knight',
        'p2',
        'Iron Marauder',
        this.config.opponentPreset || 'knight',
        this.config.arenaId || 'bastion_courtyard'
      );

      // Load bot difficulty from settings if present
      let botDifficulty: 'novice' | 'adept' | 'master' = 'adept';
      try {
        if (typeof window !== 'undefined') {
          const raw = window.localStorage.getItem('last_crown_player_settings_v1');
          if (raw) {
            const parsed = JSON.parse(raw);
            if (['novice', 'adept', 'master'].includes(parsed.botDifficulty)) {
              botDifficulty = parsed.botDifficulty;
            }
          }
        }
      } catch {
        // Fallback to default adept
      }
      this.botAI = new WarriorBotAI(botDifficulty);

      this.simulation.onCombatEvent((result: HitResult) => {
        this.handleCombatEvent(result);
        if (this.config.onCombatEvent) {
          this.config.onCombatEvent(result);
        }
      });
    } else if (this.config.mode === 'multiplayer' && this.config.colyseusRoom) {
      const room = this.config.colyseusRoom;

      room.onMessage(ServerMessageType.COMBAT_EVENT, (data: { result?: HitResult } | HitResult) => {
        const result: HitResult =
          'result' in data && data.result ? data.result : (data as HitResult);
        this.handleCombatEvent(result);
        if (this.config.onCombatEvent) {
          this.config.onCombatEvent(result);
        }
      });

      room.onStateChange((state: BattleRoomState) => {
        this.syncRoomState(state);
      });
    }

    // Clean up on scene destroy
    this.events.on(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanUp());
  }

  private drawArena(width: number, height: number): void {
    this.arenaGraphics = this.add.graphics();

    // 1. Deep Midnight Twilight Sky Gradient
    this.arenaGraphics.fillGradientStyle(0x050810, 0x050810, 0x141a29, 0x141a29, 1);
    this.arenaGraphics.fillRect(0, 0, width, height);

    // 2. Starry Sky (scattered stars)
    this.arenaGraphics.fillStyle(0xffffff, 0.6);
    const starSeeds: [number, number][] = [
      [80, 50],
      [140, 80],
      [220, 35],
      [310, 65],
      [450, 40],
      [580, 75],
      [720, 45],
      [860, 60],
      [980, 35],
      [1120, 80],
      [1200, 40],
    ];
    for (const [sx, sy] of starSeeds) {
      this.arenaGraphics.fillRect(sx, sy, 2, 2);
    }

    // 3. Gothic Full Moon with luminous radial bloom
    const moonX = width - 240;
    const moonY = 120;
    this.arenaGraphics.fillStyle(0xfff9e6, 0.04);
    this.arenaGraphics.fillCircle(moonX, moonY, 140);
    this.arenaGraphics.fillStyle(0xfff9e6, 0.08);
    this.arenaGraphics.fillCircle(moonX, moonY, 90);
    this.arenaGraphics.fillStyle(0xfff9e6, 0.18);
    this.arenaGraphics.fillCircle(moonX, moonY, 52);
    this.arenaGraphics.fillStyle(0xfffdf2, 0.95);
    this.arenaGraphics.fillCircle(moonX, moonY, 34);

    // Moon craters
    this.arenaGraphics.fillStyle(0xd5dbdb, 0.35);
    this.arenaGraphics.fillCircle(moonX - 8, moonY - 6, 7);
    this.arenaGraphics.fillCircle(moonX + 10, moonY + 8, 9);
    this.arenaGraphics.fillCircle(moonX - 12, moonY + 10, 5);

    // 4. Distant Mountain Silhouettes
    this.arenaGraphics.fillStyle(0x0e1320, 1);
    this.arenaGraphics.beginPath();
    this.arenaGraphics.moveTo(0, 320);
    this.arenaGraphics.lineTo(160, 210);
    this.arenaGraphics.lineTo(340, 290);
    this.arenaGraphics.lineTo(520, 180);
    this.arenaGraphics.lineTo(760, 280);
    this.arenaGraphics.lineTo(960, 195);
    this.arenaGraphics.lineTo(1140, 260);
    this.arenaGraphics.lineTo(width, 220);
    this.arenaGraphics.lineTo(width, height);
    this.arenaGraphics.lineTo(0, height);
    this.arenaGraphics.closePath();
    this.arenaGraphics.fillPath();

    // 5. Majestic Castle Fortress Ramparts
    this.arenaGraphics.fillStyle(0x181f2c, 1);
    this.arenaGraphics.fillRect(60, 240, width - 120, 320);

    // Castle Cathedral Spires (Left & Right towers)
    this.arenaGraphics.fillStyle(0x131a26, 1);
    // Left Tower
    this.arenaGraphics.fillRect(40, 160, 110, 400);
    this.arenaGraphics.fillTriangle(40, 160, 150, 160, 95, 70); // Spire peak
    // Right Tower
    this.arenaGraphics.fillRect(width - 150, 160, 110, 400);
    this.arenaGraphics.fillTriangle(width - 150, 160, width - 40, 160, width - 95, 70);

    // Stone Crenellations / Battlements
    this.arenaGraphics.fillStyle(0x181f2c, 1);
    for (let x = 70; x < width - 70; x += 55) {
      this.arenaGraphics.fillRect(x, 215, 34, 28);
    }

    // Glowing Lancet Stained-Glass Windows
    const windowColor = 0xf39c12;
    const windowPositions = [
      95,
      width / 2 - 280,
      width / 2 - 100,
      width / 2 + 100,
      width / 2 + 280,
      width - 95,
    ];
    for (const wx of windowPositions) {
      this.arenaGraphics.fillStyle(windowColor, 0.7);
      this.arenaGraphics.fillRoundedRect(wx - 8, 290, 16, 42, 6);
      this.arenaGraphics.fillStyle(0xffffff, 0.4);
      this.arenaGraphics.fillRect(wx - 6, 292, 4, 38);
    }

    // 6. Courtyard Stone Flag Floor
    const floorY = 560;
    this.arenaGraphics.fillStyle(0x1f2735, 1);
    this.arenaGraphics.fillRect(0, floorY, width, height - floorY);

    // Weathered flagstone tile joints
    this.arenaGraphics.lineStyle(1.5, 0x121720, 0.7);
    for (let x = 0; x < width; x += 75) {
      this.arenaGraphics.lineBetween(x, floorY, x, height);
    }
    for (let y = floorY + 30; y < height; y += 35) {
      this.arenaGraphics.lineBetween(0, y, width, y);
    }

    // Gilded Floor Border
    this.arenaGraphics.fillStyle(0xd4af37, 0.85);
    this.arenaGraphics.fillRect(0, floorY, width, 5);

    // 7. Iron Torch Wall Sconces with flickering glow
    const torchY = 330;
    // Left Sconce
    this.arenaGraphics.fillStyle(0x0b0e14, 1);
    this.arenaGraphics.fillRect(176, torchY, 8, 28);
    this.arenaGraphics.fillCircle(180, torchY, 8);
    // Right Sconce
    this.arenaGraphics.fillRect(width - 184, torchY, 8, 28);
    this.arenaGraphics.fillCircle(width - 180, torchY, 8);

    // Torch ambient glow circles
    this.torchGlowLeft = this.add.circle(180, torchY - 6, 140, 0xf39c12, 0.16);
    this.torchGlowRight = this.add.circle(width - 180, torchY - 6, 140, 0xf39c12, 0.16);

    // 8. Soft Radial Screen Vignette
    const vignette = this.add.graphics();
    vignette.lineStyle(60, 0x000000, 0.4);
    vignette.strokeRect(0, 0, width, height);
  }

  public update(_time: number, delta: number): void {
    // 1. Process Hit-Stop (fighting game impact freeze)
    if (this.hitStopRemainingMs > 0) {
      this.hitStopRemainingMs -= delta;
      return;
    }

    const deltaSec = delta / 1000;

    // 2. Animate Torch Flickering Glow
    if (this.torchGlowLeft && this.torchGlowRight) {
      const flicker = 0.14 + Math.sin(_time * 0.015) * 0.03 + Math.cos(_time * 0.027) * 0.02;
      this.torchGlowLeft.setAlpha(flicker);
      this.torchGlowRight.setAlpha(flicker);
    }

    // 3. Animate Ambient Castle Embers & Dust Motes
    if (this.emberParticles) {
      this.emberParticles.clear();
      const { width, height } = this.scale;

      for (const ember of this.embers) {
        ember.x += ember.vx * deltaSec;
        ember.y += ember.vy * deltaSec;

        // Wrap particles
        if (ember.y < 0) ember.y = height;
        if (ember.x > width) ember.x = 0;
        if (ember.x < 0) ember.x = width;

        this.emberParticles.fillStyle(0xffa502, ember.alpha * 0.8);
        this.emberParticles.fillCircle(ember.x, ember.y, ember.size);
      }
    }

    // 4. Update Game Simulation
    if (this.config.mode === 'singleplayer' && this.simulation && this.botAI && this.inputAdapter) {
      // Poll human keyboard input
      const p1Input = this.inputAdapter.pollInput();

      // Trigger sword swing sound only on attack initiation edge
      if (p1Input.attack && !this.wasP1Attacking && this.soundManager) {
        this.soundManager.playSwordSwing();
      }
      this.wasP1Attacking = !!p1Input.attack;

      // Compute Bot AI input
      const p1Snap = this.simulation.p1.toSnapshot();
      const p2Snap = this.simulation.p2.toSnapshot();
      const p2Input = this.botAI.update(p2Snap, p1Snap, delta);

      if (p2Input.attack && !this.wasP2Attacking && this.soundManager) {
        this.soundManager.playSwordSwing();
      }
      this.wasP2Attacking = !!p2Input.attack;

      // Step local simulation
      this.simulation.step(p1Input, p2Input, deltaSec);

      // Render updated warrior states
      const snap = this.simulation.getSnapshot();
      if (this.p1Renderer) this.p1Renderer.render(snap.p1);
      if (this.p2Renderer) this.p2Renderer.render(snap.p2);

      // Edge detection for guard break exhaustion sounds & shatter fx
      if (snap.p1.isExhausted && !this.wasP1Exhausted) {
        if (this.soundManager) this.soundManager.playExhaustionBreak();
        if (this.effects) this.effects.triggerGuardBreak(snap.p1.position);
      }
      this.wasP1Exhausted = snap.p1.isExhausted;

      if (snap.p2.isExhausted && !this.wasP2Exhausted) {
        if (this.soundManager) this.soundManager.playExhaustionBreak();
        if (this.effects) this.effects.triggerGuardBreak(snap.p2.position);
      }
      this.wasP2Exhausted = snap.p2.isExhausted;

      // Emit to React HUD
      if (this.config.onSnapshot) {
        this.config.onSnapshot(snap);
      }
    } else if (
      this.config.mode === 'multiplayer' &&
      this.config.colyseusRoom &&
      this.inputAdapter
    ) {
      // Poll human keyboard input and send to multiplayer room
      const localInput = this.inputAdapter.pollInput();

      if (localInput.attack && !this.wasP1Attacking && this.soundManager) {
        this.soundManager.playSwordSwing();
      }
      this.wasP1Attacking = !!localInput.attack;

      this.config.colyseusRoom.send(ClientMessageType.PLAYER_INPUT, localInput);
    }
  }

  private networkStateToSnapshot(nw: WarriorNetworkState): WarriorSnapshot {
    return {
      id: nw.id,
      name: nw.name,
      position: { x: nw.x, y: nw.y },
      velocity: { x: nw.vx, y: nw.vy },
      facing: (nw.facing === 'left' ? 'left' : 'right') as Direction,
      isGrounded: nw.isGrounded,
      health: nw.health,
      maxHealth: nw.maxHealth,
      stamina: nw.stamina,
      maxStamina: nw.maxStamina,
      state: (nw.state as WarriorActionState) || 'idle',
      attackPhase: (nw.attackPhase as AttackPhase) || 'none',
      currentAttackId: nw.currentAttackId || null,
      parryWindowRemainingMs: nw.state === 'parried' ? 200 : 0,
      hitstunRemainingMs: nw.state === 'hit' ? 200 : 0,
      hurtbox: { x: nw.x - 20, y: nw.y - 70, width: 40, height: 70 },
      roundsWon: nw.roundsWon,
      isExhausted: nw.isExhausted || false,
    };
  }

  private syncRoomState(state: BattleRoomState): void {
    if (!state.warriors || state.warriors.size === 0) return;

    const warriorsList: WarriorNetworkState[] = [];
    state.warriors.forEach(w => warriorsList.push(w));

    if (warriorsList.length < 2) return;

    // Identify local player vs opponent based on sessionId if available
    const mySessionId = this.config.colyseusRoom?.sessionId;
    let p1Nw = warriorsList[0];
    let p2Nw = warriorsList[1];

    if (mySessionId && p2Nw && p2Nw.id === mySessionId) {
      p1Nw = warriorsList[1];
      p2Nw = warriorsList[0];
    }

    if (!p1Nw || !p2Nw) return;

    const p1Snap = this.networkStateToSnapshot(p1Nw);
    const p2Snap = this.networkStateToSnapshot(p2Nw);

    if (this.p1Renderer) this.p1Renderer.render(p1Snap);
    if (this.p2Renderer) this.p2Renderer.render(p2Snap);

    // Exhaustion edge chime & FX
    if (p1Snap.isExhausted && !this.wasP1Exhausted) {
      if (this.soundManager) this.soundManager.playExhaustionBreak();
      if (this.effects) this.effects.triggerGuardBreak(p1Snap.position);
    }
    this.wasP1Exhausted = p1Snap.isExhausted;

    if (p2Snap.isExhausted && !this.wasP2Exhausted) {
      if (this.soundManager) this.soundManager.playExhaustionBreak();
      if (this.effects) this.effects.triggerGuardBreak(p2Snap.position);
    }
    this.wasP2Exhausted = p2Snap.isExhausted;

    const snapshot: GameSimulationSnapshot = {
      p1: p1Snap,
      p2: p2Snap,
      roundNumber: state.roundNumber,
      timerSeconds: state.timerSeconds,
      matchState: (state.matchState as MatchState) || 'in_progress',
      winnerId: state.winnerId || null,
      activeHitboxes: [],
    };

    this.lastRemoteSnapshot = snapshot;

    if (this.config.onSnapshot) {
      this.config.onSnapshot(snapshot);
    }
  }

  public syncRemoteSnapshot(snapshot: GameSimulationSnapshot): void {
    this.lastRemoteSnapshot = snapshot;
    if (this.p1Renderer && snapshot.p1) {
      this.p1Renderer.render(snapshot.p1);
    }
    if (this.p2Renderer && snapshot.p2) {
      this.p2Renderer.render(snapshot.p2);
    }
    if (this.config.onSnapshot) {
      this.config.onSnapshot(snapshot);
    }
  }

  public rematch(): void {
    if (this.config.mode === 'singleplayer' && this.simulation) {
      this.simulation.resetMatch();
      this.wasP1Exhausted = false;
      this.wasP2Exhausted = false;
    } else if (this.config.mode === 'multiplayer' && this.config.colyseusRoom) {
      this.config.colyseusRoom.send(ClientMessageType.READY, { ready: true });
    }
  }

  public handleCombatEvent(result: HitResult): void {
    if (!this.effects || !this.soundManager) return;

    // Determine impact coordinates at the defender's actual position
    let impactX = 500;
    let impactY = 500;

    if (this.simulation) {
      const defender = result.defenderId === 'p1' ? this.simulation.p1 : this.simulation.p2;
      impactX = defender.movement.position.x;
      impactY = defender.movement.position.y;
    } else if (this.lastRemoteSnapshot) {
      const defender =
        result.defenderId === this.lastRemoteSnapshot.p1.id
          ? this.lastRemoteSnapshot.p1
          : this.lastRemoteSnapshot.p2;
      impactX = defender.position.x;
      impactY = defender.position.y;
    }

    if (result.resolution === 'parried') {
      this.effects.triggerParryFlash({ x: impactX, y: impactY });
      this.soundManager.playParryChime();
      this.hitStopRemainingMs = 70; // 70ms cinematic hit-stop
    } else if (result.resolution === 'blocked') {
      this.effects.triggerBlockSparks({ x: impactX, y: impactY });
      this.soundManager.playBlockClang();
      this.hitStopRemainingMs = 30; // 30ms block hit-stop
    } else if (result.resolution === 'hit') {
      this.effects.triggerHitImpact({ x: impactX, y: impactY }, result.isCritical, result.damage);
      this.soundManager.playHitFlesh();
      this.hitStopRemainingMs = result.isCritical ? 80 : 45; // Satisfying impact weight
    }
  }

  private cleanUp(): void {
    if (this.soundManager) {
      this.soundManager.destroy();
      this.soundManager = null;
    }
    if (this.inputAdapter) {
      this.inputAdapter.destroy();
      this.inputAdapter = null;
    }
    if (this.p1Renderer) {
      this.p1Renderer.destroy();
      this.p1Renderer = null;
    }
    if (this.p2Renderer) {
      this.p2Renderer.destroy();
      this.p2Renderer = null;
    }
    if (this.emberParticles) {
      this.emberParticles.destroy();
      this.emberParticles = null;
    }
    if (this.arenaGraphics) {
      this.arenaGraphics.destroy();
      this.arenaGraphics = null;
    }
  }
}
