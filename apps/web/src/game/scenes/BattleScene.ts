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
import { getArenaConfig, getWarriorPreset } from '@last-crown/game-config';
import { WarriorRenderer } from '../rendering/WarriorRenderer';
import { CombatEffects } from '../effects/CombatEffects';
import { SoundManager } from '../audio/SoundManager';
import { KeyboardInputAdapter } from '../input/KeyboardInputAdapter';
import { DualPlayerInputManager } from '../input/DualPlayerInputManager';
import { PartyControllerBridge } from '../input/PartyControllerBridge';

export interface BattleSceneConfig {
  mode: 'singleplayer' | 'multiplayer' | 'local_multiplayer';
  playerPreset?: string;
  opponentPreset?: string;
  botDifficulty?: 'novice' | 'adept' | 'expert' | 'master';
  botName?: string;
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
  private dualInputManager: DualPlayerInputManager | null = null;

  private arenaGraphics: Phaser.GameObjects.Graphics | null = null;
  private arenaBgImage: Phaser.GameObjects.Image | null = null;
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
  private wasP2Dashing: boolean = false;
  private wasP1FastFalling: boolean = false;
  private heartbeatTimerMs: number = 0;
  private lastInputSendTime: number = 0;

  // Round lifecycle tracking for effects cleanup
  private currentRoundNumber: number = 1;
  private previousMatchState: MatchState = 'in_progress';

  private lastRemoteSnapshot: GameSimulationSnapshot | null = null;
  private isPaused: boolean = false;

  // Sub-frame smooth position interpolation for 144Hz buttery movement
  private p1RenderX: number = 360;
  private p1RenderY: number = 625;
  private p2RenderX: number = 920;
  private p2RenderY: number = 625;
  private hasInitializedRenderPos: boolean = false;
  private colyseusUnsubscribers: (() => void)[] = [];

  public setPaused(paused: boolean): void {
    this.isPaused = paused;
    this.soundManager?.applyPauseFilter(paused);
  }

  public getIsPaused(): boolean {
    return this.isPaused;
  }

  constructor() {
    super({ key: 'BattleScene' });
  }

  public preload(): void {
    if (!this.textures.exists('playground')) {
      this.load.image('playground', '/assets/backgrounds/playground.jpg');
    }
    if (!this.textures.exists('playground2')) {
      this.load.image('playground2', '/assets/backgrounds/playground2.jpg');
    }
    if (!this.textures.exists('playground3')) {
      this.load.image('playground3', '/assets/backgrounds/playground3.jpg');
    }
    if (!this.textures.exists('playground4')) {
      this.load.image('playground4', '/assets/backgrounds/playground4.jpg');
    }
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
    this.dualInputManager = new DualPlayerInputManager();

    // Render playground colosseum arena backdrop
    this.drawArena(width, height);

    // Camera cinematic fade-in from pitch black
    this.cameras.main.fadeIn(700, 5, 8, 16);

    // Determine effective arena ID (multiplayer room state or passed config, default coloseum)
    const effectiveArenaId =
      this.config.colyseusRoom?.state?.arenaId || this.config.arenaId || 'coloseum';

    // Start Procedural Arena Battle BGM
    this.soundManager?.startBattleBgm(effectiveArenaId);

    // Initialize atmospheric biome weather & ember particles tailored to the active arena
    this.emberParticles = this.add.graphics();
    this.embers = [];
    const isStorm = effectiveArenaId === 'stormforce';
    const isDragon = effectiveArenaId === 'dragonland';
    const isSea = effectiveArenaId === 'seaside';
    const particleCount = isStorm ? 65 : isDragon ? 50 : 40;

    for (let i = 0; i < particleCount; i++) {
      this.embers.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: isStorm
          ? -160 - Math.random() * 80
          : isSea
            ? 35 + Math.random() * 45
            : (Math.random() - 0.5) * 20 + 5,
        vy: isStorm
          ? 480 + Math.random() * 220
          : isDragon
            ? -50 - Math.random() * 50
            : isSea
              ? (Math.random() - 0.5) * 16
              : -Math.random() * 25 - 10,
        alpha: Math.random() * 0.7 + 0.25,
        size: isStorm ? 1 : Math.random() * 2.5 + 1,
      });
    }

    // Instantiate warrior renderers with specific archetype presets using arena floor height
    const arenaConfig = getArenaConfig(effectiveArenaId);
    const arenaFloorY = arenaConfig.floorY;
    const p1Preset = this.config.playerPreset || 'knight';
    const p2Preset = this.config.opponentPreset || 'knight';
    this.p1Renderer = new WarriorRenderer(this, true, arenaFloorY, p1Preset);
    this.p2Renderer = new WarriorRenderer(this, false, arenaFloorY, p2Preset);

    // If in singleplayer mode, initialize local offline GameSimulation + AI
    if (this.config.mode === 'singleplayer') {
      const opponentPreset = this.config.opponentPreset || 'knight';
      const botPresetConfig = getWarriorPreset(opponentPreset);
      const opponentName =
        this.config.botName ||
        (botPresetConfig?.name ? `${botPresetConfig.name} (AI)` : 'Iron Marauder (AI)');

      this.simulation = new GameSimulation(
        'p1',
        'Crown Champion',
        this.config.playerPreset || 'knight',
        'p2',
        opponentName,
        opponentPreset,
        effectiveArenaId
      );

      // Load bot difficulty: prioritize explicitly configured difficulty, fallback to saved settings, then 'adept'
      let botDifficulty: 'novice' | 'adept' | 'expert' | 'master' =
        this.config.botDifficulty || 'adept';
      if (!this.config.botDifficulty) {
        try {
          if (typeof window !== 'undefined') {
            const raw = window.localStorage.getItem('last_crown_player_settings_v1');
            if (raw) {
              const parsed = JSON.parse(raw);
              if (['novice', 'adept', 'expert', 'master'].includes(parsed.botDifficulty)) {
                botDifficulty = parsed.botDifficulty;
              }
            }
          }
        } catch {
          // Fallback to default adept
        }
      }
      this.botAI = new WarriorBotAI(botDifficulty);

      this.simulation.onCombatEvent((result: HitResult) => {
        this.handleCombatEvent(result);
        if (this.config.onCombatEvent) {
          this.config.onCombatEvent(result);
        }
      });

      this.simulation.onRoundStart((roundNum: number) => {
        this.currentRoundNumber = roundNum;
        this.hitStopRemainingMs = 0;
        if (this.effects) {
          this.effects.resetRound();
        }
        if (this.simulation?.isSuddenDeath) {
          this.soundManager?.playSuddenDeathGong();
          this.soundManager?.playCrowdCheer('roar');
          this.cameras.main.flash(300, 180, 25, 25);
          this.cameras.main.shake(220, 0.016);
        }
      });

      // Render initial warrior poses immediately so both warriors are ready for fight on frame 1
      const initialSnap = this.simulation.getSnapshot();
      this.currentRoundNumber = initialSnap.roundNumber;
      this.previousMatchState = initialSnap.matchState;
      if (this.p1Renderer) this.p1Renderer.render(initialSnap.p1);
      if (this.p2Renderer) this.p2Renderer.render(initialSnap.p2);
      if (this.config.onSnapshot) {
        this.config.onSnapshot(initialSnap);
      }
    } else if (this.config.mode === 'multiplayer' && this.config.colyseusRoom) {
      const room = this.config.colyseusRoom;

      const unsubCombat = room.onMessage(
        ServerMessageType.COMBAT_EVENT,
        (data: { result?: HitResult } | HitResult) => {
          if (!this.effects) return; // Guard against destroyed scene
          const result: HitResult =
            'result' in data && data.result ? data.result : (data as HitResult);
          this.handleCombatEvent(result);
          if (this.config.onCombatEvent) {
            this.config.onCombatEvent(result);
          }
        }
      );
      if (typeof unsubCombat === 'function') this.colyseusUnsubscribers.push(unsubCombat);

      const unsubRound = room.onMessage(
        ServerMessageType.ROUND_START,
        (data: { roundNumber: number; isSuddenDeath?: boolean }) => {
          if (!this.effects) return;
          this.currentRoundNumber = data.roundNumber;
          this.hitStopRemainingMs = 0;
          this.effects.resetRound();
          if (data.isSuddenDeath) {
            this.soundManager?.playSuddenDeathGong();
            this.soundManager?.playCrowdCheer('roar');
            this.cameras.main.flash(300, 180, 25, 25);
            this.cameras.main.shake(220, 0.016);
          }
        }
      );
      if (typeof unsubRound === 'function') this.colyseusUnsubscribers.push(unsubRound);

      const unsubMatch = room.onMessage(ServerMessageType.MATCH_START, () => {
        if (!this.effects) return;
        this.currentRoundNumber = 1;
        this.previousMatchState = 'in_progress';
        this.hitStopRemainingMs = 0;
        this.effects.resetRound();
      });
      if (typeof unsubMatch === 'function') this.colyseusUnsubscribers.push(unsubMatch);

      const unsubState = room.onStateChange((state: BattleRoomState) => {
        if (!this.p1Renderer || !this.p2Renderer) return;
        this.syncRoomState(state);
      });
      if (typeof unsubState === 'function') this.colyseusUnsubscribers.push(unsubState);

      // Synchronize immediately if room state is already populated
      if (room.state && room.state.warriors && room.state.warriors.size > 0) {
        this.syncRoomState(room.state);
      }
    } else if (this.config.mode === 'local_multiplayer') {
      this.simulation = new GameSimulation(
        'p1',
        'Player 1',
        this.config.playerPreset || 'knight',
        'p2',
        'Player 2',
        this.config.opponentPreset || 'marauder',
        this.config.arenaId || 'bastion_courtyard'
      );
      this.botAI = null;

      this.simulation.onCombatEvent((result: HitResult) => {
        this.handleCombatEvent(result);
        const party = PartyControllerBridge.getInstance();
        if (result.defenderId === 'p1') {
          party.sendVibrate('p1', 'hit');
          this.dualInputManager?.vibrateGamepad(0, 120);
        } else if (result.defenderId === 'p2') {
          party.sendVibrate('p2', 'hit');
          this.dualInputManager?.vibrateGamepad(1, 120);
        }
        if (result.resolution === 'parried' || result.isClash) {
          party.sendVibrate('all', 'parry');
          this.dualInputManager?.vibrateGamepad(0, 160);
          this.dualInputManager?.vibrateGamepad(1, 160);
        }
        if (this.config.onCombatEvent) {
          this.config.onCombatEvent(result);
        }
      });

      this.simulation.onRoundStart((roundNum: number) => {
        this.currentRoundNumber = roundNum;
        this.hitStopRemainingMs = 0;
        if (this.effects) {
          this.effects.resetRound();
        }
        if (this.simulation?.isSuddenDeath) {
          this.soundManager?.playSuddenDeathGong();
          this.soundManager?.playCrowdCheer('roar');
          this.cameras.main.flash(300, 180, 25, 25);
          this.cameras.main.shake(220, 0.016);
        }
      });

      const initialSnap = this.simulation.getSnapshot();
      this.currentRoundNumber = initialSnap.roundNumber;
      this.previousMatchState = initialSnap.matchState;
      if (this.p1Renderer) this.p1Renderer.render(initialSnap.p1);
      if (this.p2Renderer) this.p2Renderer.render(initialSnap.p2);
      if (this.config.onSnapshot) {
        this.config.onSnapshot(initialSnap);
      }
    }

    // Clean up on scene destroy
    this.events.on(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanUp());
  }

  private drawArena(width: number, height: number): void {
    const effectiveArenaId =
      this.config.colyseusRoom?.state?.arenaId || this.config.arenaId || 'coloseum';
    const arenaConfig = getArenaConfig(effectiveArenaId);
    const bgKey = arenaConfig.backgroundKey || 'playground';

    // 1. Render playground arena backdrop from selected playground image
    if (this.textures.exists(bgKey)) {
      this.arenaBgImage = this.add.image(width / 2, height / 2, bgKey);
      this.arenaBgImage.setDisplaySize(width, height);
      this.arenaBgImage.setDepth(-20);
    } else if (this.textures.exists('playground')) {
      this.arenaBgImage = this.add.image(width / 2, height / 2, 'playground');
      this.arenaBgImage.setDisplaySize(width, height);
      this.arenaBgImage.setDepth(-20);
    } else {
      this.arenaGraphics = this.add.graphics();
      this.arenaGraphics.fillGradientStyle(0x050810, 0x050810, 0x141a29, 0x141a29, 1);
      this.arenaGraphics.fillRect(0, 0, width, height);
    }

    // 2. Colosseum pillar torches ambient flickering glow (only rendered for Bastion Courtyard / Colosseum)
    if (effectiveArenaId === 'coloseum') {
      this.torchGlowLeft = this.add.circle(150, 390, 110, 0xffa502, 0.2);
      this.torchGlowRight = this.add.circle(width - 150, 390, 110, 0xffa502, 0.2);
    }

    // 3. Soft Radial Screen Vignette for dramatic colosseum depth
    const vignette = this.add.graphics();
    vignette.lineStyle(40, 0x000000, 0.35);
    vignette.strokeRect(0, 0, width, height);
  }

  public update(_time: number, delta: number): void {
    // 0. Pause guard (for singleplayer offline play)
    if (this.isPaused) {
      return;
    }

    // 1. Process Hit-Stop (fighting game impact freeze)
    if (this.hitStopRemainingMs > 0) {
      this.hitStopRemainingMs -= delta;
      // In multiplayer, keep polling and transmitting player inputs to prevent network stalls
      if (this.config.mode === 'multiplayer' && this.config.colyseusRoom && this.inputAdapter) {
        const input = this.inputAdapter.pollInput();
        this.config.colyseusRoom.send(ClientMessageType.PLAYER_INPUT, input);
      }
      return;
    }

    const deltaSec = delta / 1000;

    // 2. Animate Torch Flickering Glow with organic frequency
    if (this.torchGlowLeft && this.torchGlowRight) {
      const flicker = 0.14 + Math.sin(_time * 0.005) * 0.03 + Math.cos(_time * 0.009) * 0.02;
      this.torchGlowLeft.setAlpha(flicker);
      this.torchGlowRight.setAlpha(flicker);
    }

    // 3. Animate Biome Environmental Particles (Rain in StormForce, Embers in DragonLand, Sea Mist in SeaSide)
    if (this.emberParticles) {
      this.emberParticles.clear();
      const { width, height } = this.scale;
      const effectiveArenaId =
        this.config.colyseusRoom?.state?.arenaId || this.config.arenaId || 'coloseum';
      const isStorm = effectiveArenaId === 'stormforce';
      const isDragon = effectiveArenaId === 'dragonland';
      const isSea = effectiveArenaId === 'seaside';

      // Periodic subtle thunderstorm lightning flash in StormForce
      if (isStorm && Math.random() < 0.0035) {
        this.cameras.main.flash(75, 215, 235, 255);
      }

      for (const ember of this.embers) {
        ember.x += ember.vx * deltaSec;
        ember.y += ember.vy * deltaSec;

        // Wrap particles
        if (ember.y < 0) ember.y = height;
        if (ember.y > height) ember.y = 0;
        if (ember.x > width) ember.x = 0;
        if (ember.x < 0) ember.x = width;

        if (isStorm) {
          // Driving diagonal rain streaks
          this.emberParticles.lineStyle(1.5, 0x81ecec, ember.alpha * 0.7);
          this.emberParticles.lineBetween(ember.x, ember.y, ember.x - 5, ember.y + 14);
        } else if (isDragon) {
          // Fiery volcanic ash & sparks
          const color = Math.random() > 0.5 ? 0xff4757 : 0xffa502;
          this.emberParticles.fillStyle(color, ember.alpha * 0.85);
          this.emberParticles.fillCircle(ember.x, ember.y, ember.size * 1.2);
        } else if (isSea) {
          // Soft sea foam mist
          this.emberParticles.fillStyle(0xe0f2fe, ember.alpha * 0.5);
          this.emberParticles.fillCircle(ember.x, ember.y, ember.size * 1.5);
        } else {
          // Bastion courtyard golden torch motes
          this.emberParticles.fillStyle(0xffa502, ember.alpha * 0.8);
          this.emberParticles.fillCircle(ember.x, ember.y, ember.size);
        }
      }
    }

    // Dynamic Cinematic Camera Tracking & Zoom (Frame-rate independent exponential smoothing)
    let p1X = 360;
    let p2X = 920;
    if (this.simulation) {
      p1X = this.simulation.p1.movement.position.x;
      p2X = this.simulation.p2.movement.position.x;
    } else if (this.lastRemoteSnapshot) {
      p1X = this.p1RenderX;
      p2X = this.p2RenderX;
    }

    const midX = (p1X + p2X) / 2;
    const { width } = this.scale;
    const targetScrollX = Phaser.Math.Clamp(midX - width / 2, -100, 100);
    const cameraScrollFactor = 1 - Math.exp(-6.0 * deltaSec);
    this.cameras.main.scrollX = Phaser.Math.Linear(
      this.cameras.main.scrollX,
      targetScrollX,
      cameraScrollFactor
    );

    const fighterDist = Math.abs(p1X - p2X);
    let targetZoom = 1.0;
    if (fighterDist < 190) {
      targetZoom = 1.05; // Zoom in for intense close quarters
    } else if (fighterDist > 550) {
      targetZoom = 0.96; // Zoom out to keep full spacing in frame
    }
    const cameraZoomFactor = 1 - Math.exp(-4.5 * deltaSec);
    this.cameras.main.zoom = Phaser.Math.Linear(
      this.cameras.main.zoom,
      targetZoom,
      cameraZoomFactor
    );

    // 4. Update Game Simulation
    if (this.config.mode === 'singleplayer' && this.simulation && this.botAI && this.inputAdapter) {
      // Poll human keyboard input
      const p1Input = this.inputAdapter.pollInput();

      // Trigger sword swing sound only on attack initiation edge
      if (p1Input.attack && !this.wasP1Attacking && this.soundManager) {
        this.soundManager.playSwordSwing();
        if (p1Input.attackType === 'heavy' || p1Input.attackType === 'aerial') {
          this.soundManager.playExertionGrunt();
        }
      }
      this.wasP1Attacking = !!p1Input.attack;

      const isFastFall = Boolean(
        p1Input.moveY && p1Input.moveY > 0 && !this.simulation.p1.movement.isGrounded
      );
      if (isFastFall && !this.wasP1FastFalling && this.soundManager) {
        this.soundManager.playFastFallWhoosh();
      }
      this.wasP1FastFalling = isFastFall;

      if (p1Input.dash) {
        if (this.soundManager) this.soundManager.playDashWhoosh();
        if (this.effects)
          this.effects.triggerDashDust(
            this.simulation.p1.movement.position,
            this.simulation.p1.movement.facing
          );
      }

      // Compute Bot AI input
      const p1Snap = this.simulation.p1.toSnapshot();
      const p2Snap = this.simulation.p2.toSnapshot();
      const p2Input = this.botAI.update(p2Snap, p1Snap, delta);

      if (p2Input.attack && !this.wasP2Attacking && this.soundManager) {
        this.soundManager.playSwordSwing();
        if (p2Input.attackType === 'heavy' || p2Input.attackType === 'aerial') {
          this.soundManager.playExertionGrunt();
        }
      }
      this.wasP2Attacking = !!p2Input.attack;

      if (p2Input.dash) {
        if (this.soundManager) this.soundManager.playDashWhoosh();
        if (this.effects)
          this.effects.triggerDashDust(
            this.simulation.p2.movement.position,
            this.simulation.p2.movement.facing
          );
      }

      // Step local simulation
      this.simulation.step(p1Input, p2Input, deltaSec);

      // Render updated warrior states at native refresh rate
      const snap = this.simulation.getSnapshot();
      this.handleRoundTransition(snap);
      if (this.p1Renderer) this.p1Renderer.render(snap.p1, deltaSec);
      if (this.p2Renderer) this.p2Renderer.render(snap.p2, deltaSec);

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
      this.config.mode === 'local_multiplayer' &&
      this.simulation &&
      this.dualInputManager
    ) {
      const p1Input = this.dualInputManager.pollP1();
      const p2Input = this.dualInputManager.pollP2();

      if (p1Input.attack && !this.wasP1Attacking && this.soundManager) {
        this.soundManager.playSwordSwing();
      }
      this.wasP1Attacking = !!p1Input.attack;

      if (p1Input.dash) {
        if (this.soundManager) this.soundManager.playDashWhoosh();
        if (this.effects)
          this.effects.triggerDashDust(
            this.simulation.p1.movement.position,
            this.simulation.p1.movement.facing
          );
      }

      if (p2Input.attack && !this.wasP2Attacking && this.soundManager) {
        this.soundManager.playSwordSwing();
        if (p2Input.attackType === 'heavy' || p2Input.attackType === 'aerial') {
          this.soundManager.playExertionGrunt();
        }
      }
      this.wasP2Attacking = !!p2Input.attack;

      if (p2Input.dash) {
        if (this.soundManager) this.soundManager.playDashWhoosh();
        if (this.effects)
          this.effects.triggerDashDust(
            this.simulation.p2.movement.position,
            this.simulation.p2.movement.facing
          );
      }

      this.simulation.step(p1Input, p2Input, deltaSec);

      const snap = this.simulation.getSnapshot();
      this.handleRoundTransition(snap);
      if (this.p1Renderer) this.p1Renderer.render(snap.p1);
      if (this.p2Renderer) this.p2Renderer.render(snap.p2);

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

      if (this.config.onSnapshot) {
        this.config.onSnapshot(snap);
      }
    } else if (
      this.config.mode === 'multiplayer' &&
      this.config.colyseusRoom &&
      this.inputAdapter
    ) {
      // Poll human keyboard input
      const localInput = this.inputAdapter.pollInput();

      if (localInput.attack && !this.wasP1Attacking && this.soundManager) {
        this.soundManager.playSwordSwing();
      }
      this.wasP1Attacking = !!localInput.attack;

      const isFastFall = Boolean(
        localInput.moveY &&
        localInput.moveY > 0 &&
        this.lastRemoteSnapshot?.p1 &&
        !this.lastRemoteSnapshot.p1.isGrounded
      );
      if (isFastFall && !this.wasP1FastFalling && this.soundManager) {
        this.soundManager.playFastFallWhoosh();
      }
      this.wasP1FastFalling = isFastFall;

      if (localInput.dash) {
        if (this.soundManager) this.soundManager.playDashWhoosh();
        if (this.effects && this.lastRemoteSnapshot) {
          this.effects.triggerDashDust(
            this.lastRemoteSnapshot.p1.position,
            this.lastRemoteSnapshot.p1.facing
          );
        }
      }

      // Transmit immediately on tactical triggers (attack, dash, parry) or at 60Hz tick interval (>= 16ms) for movement
      const now = Date.now();
      const hasActionTrigger = localInput.attack || localInput.dash || localInput.parry;
      if (hasActionTrigger || now - this.lastInputSendTime >= 16) {
        this.lastInputSendTime = now;
        this.config.colyseusRoom.send(ClientMessageType.PLAYER_INPUT, localInput);
      }

      // Render updated warrior states with 144Hz sub-frame exponential interpolation
      if (this.lastRemoteSnapshot) {
        const smoothRate = 1 - Math.exp(-24 * deltaSec);

        if (this.p1Renderer && this.lastRemoteSnapshot.p1) {
          const target = this.lastRemoteSnapshot.p1.position;
          this.p1RenderX = Phaser.Math.Linear(this.p1RenderX, target.x, smoothRate);
          this.p1RenderY = Phaser.Math.Linear(this.p1RenderY, target.y, smoothRate);

          const smoothedP1: WarriorSnapshot = {
            ...this.lastRemoteSnapshot.p1,
            position: { x: this.p1RenderX, y: this.p1RenderY },
          };
          this.p1Renderer.render(smoothedP1, deltaSec);
        }

        if (this.p2Renderer && this.lastRemoteSnapshot.p2) {
          const target = this.lastRemoteSnapshot.p2.position;
          this.p2RenderX = Phaser.Math.Linear(this.p2RenderX, target.x, smoothRate);
          this.p2RenderY = Phaser.Math.Linear(this.p2RenderY, target.y, smoothRate);

          const smoothedP2: WarriorSnapshot = {
            ...this.lastRemoteSnapshot.p2,
            position: { x: this.p2RenderX, y: this.p2RenderY },
          };
          this.p2Renderer.render(smoothedP2, deltaSec);
        }
      }
    }

    // Adrenaline-pumping heartbeat pulse when in mortal danger (HP <= 25%)
    let localHealthRatio = 1;
    if (this.simulation) {
      localHealthRatio = this.simulation.p1.health / this.simulation.p1.maxHealth;
    } else if (this.lastRemoteSnapshot?.p1) {
      localHealthRatio =
        this.lastRemoteSnapshot.p1.health / (this.lastRemoteSnapshot.p1.maxHealth || 100);
    }
    if (localHealthRatio > 0 && localHealthRatio <= 0.3) {
      this.soundManager?.setTensionMode(true);
      this.heartbeatTimerMs -= delta;
      if (this.heartbeatTimerMs <= 0) {
        this.heartbeatTimerMs = 1100;
        this.soundManager?.playHeartbeatPulse();
      }
    } else {
      this.soundManager?.setTensionMode(false);
      this.heartbeatTimerMs = 0;
    }

    // 5. Update Visual Combat Effects (severed heads, arterial blood geysers, expanding pools)
    if (this.effects) {
      this.effects.update(deltaSec);
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
      isDecapitated: nw.isDecapitated || false,
      comboCount: nw.comboCount || 0,
      burstMeter: (nw as unknown as { burstMeter?: number }).burstMeter ?? 0,
      isBurstActive: (nw as unknown as { isBurstActive?: boolean }).isBurstActive ?? false,
      isGrabbed: (nw as unknown as { isGrabbed?: boolean }).isGrabbed ?? false,
      grabBreakWindowMs: (nw as unknown as { grabBreakWindowMs?: number }).grabBreakWindowMs ?? 0,
    };
  }

  private syncRoomState(state: BattleRoomState): void {
    if (!state.warriors || state.warriors.size === 0) return;

    const warriorsList: WarriorNetworkState[] = [];
    state.warriors.forEach(w => warriorsList.push(w));

    if (warriorsList.length < 2) {
      if (this.lastRemoteSnapshot && state.matchState === 'match_over') {
        const snap: GameSimulationSnapshot = {
          ...this.lastRemoteSnapshot,
          matchState: 'match_over',
          roundNumber: state.roundNumber,
          timerSeconds: state.timerSeconds,
          winnerId: state.winnerId || this.lastRemoteSnapshot.p1.id,
        };
        this.lastRemoteSnapshot = snap;
        if (this.config.onSnapshot) {
          this.config.onSnapshot(snap);
        }
      }
      return;
    }

    // Identify local player vs opponent by sessionId
    const mySessionId = this.config.colyseusRoom?.sessionId;
    let p1Nw: WarriorNetworkState | undefined;
    let p2Nw: WarriorNetworkState | undefined;

    if (mySessionId && state.warriors.has(mySessionId)) {
      p1Nw = state.warriors.get(mySessionId);
      state.warriors.forEach((w, key) => {
        if (key !== mySessionId && !p2Nw) {
          p2Nw = w;
        }
      });
    } else {
      p1Nw = warriorsList[0];
      p2Nw = warriorsList[1];
    }

    if (!p1Nw || !p2Nw) return;

    // Synchronize dynamic arena background if host selected a different playground
    if (state.arenaId && this.arenaBgImage) {
      const cfg = getArenaConfig(state.arenaId);
      const targetKey = cfg.backgroundKey || 'playground';
      if (this.textures.exists(targetKey) && this.arenaBgImage.texture.key !== targetKey) {
        this.arenaBgImage.setTexture(targetKey);
      }
    }

    const p1Snap = this.networkStateToSnapshot(p1Nw);
    const p2Snap = this.networkStateToSnapshot(p2Nw);

    if (!this.hasInitializedRenderPos) {
      this.p1RenderX = p1Snap.position.x;
      this.p1RenderY = p1Snap.position.y;
      this.p2RenderX = p2Snap.position.x;
      this.p2RenderY = p2Snap.position.y;
      this.hasInitializedRenderPos = true;
    }

    // Opponent attack sound cue
    const isP2Attacking = p2Snap.attackPhase === 'windup' || p2Snap.attackPhase === 'active';
    if (isP2Attacking && !this.wasP2Attacking && this.soundManager) {
      this.soundManager.playSwordSwing();
    }
    this.wasP2Attacking = isP2Attacking;

    // Opponent dash whoosh & dust
    const isP2Dashing = Math.abs(p2Snap.velocity.x) > 350;
    if (isP2Dashing && !this.wasP2Dashing) {
      if (this.soundManager) this.soundManager.playDashWhoosh();
      if (this.effects) this.effects.triggerDashDust(p2Snap.position, p2Snap.facing);
    }
    this.wasP2Dashing = isP2Dashing;

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

    this.handleRoundTransition(snapshot);
    this.lastRemoteSnapshot = snapshot;

    if (this.config.onSnapshot) {
      this.config.onSnapshot(snapshot);
    }
  }

  public syncRemoteSnapshot(snapshot: GameSimulationSnapshot): void {
    this.handleRoundTransition(snapshot);
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
    this.currentRoundNumber = 1;
    this.previousMatchState = 'in_progress';
    this.hitStopRemainingMs = 0;
    this.hasInitializedRenderPos = false;
    if (this.effects) {
      this.effects.resetRound();
    }

    if (this.config.mode === 'singleplayer' && this.simulation) {
      this.simulation.resetMatch();
      this.wasP1Exhausted = false;
      this.wasP2Exhausted = false;
    } else if (this.config.mode === 'multiplayer' && this.config.colyseusRoom) {
      this.config.colyseusRoom.send(ClientMessageType.READY, { ready: true });
    }
  }

  private handleRoundTransition(snapshot: GameSimulationSnapshot): void {
    const isNewRound =
      (snapshot.roundNumber > 0 && snapshot.roundNumber !== this.currentRoundNumber) ||
      (snapshot.matchState === 'in_progress' &&
        (this.previousMatchState === 'round_over' || this.previousMatchState === 'match_over'));

    if (isNewRound && snapshot.matchState === 'in_progress') {
      this.currentRoundNumber = snapshot.roundNumber;
      this.hitStopRemainingMs = 0;
      if (this.effects) {
        this.effects.resetRound();
      }
      this.soundManager?.playRoundStart(snapshot.roundNumber);
      this.time.delayedCall(850, () => {
        this.soundManager?.playDuelStart();
      });
    }

    if (snapshot.matchState === 'match_over' && this.previousMatchState !== 'match_over') {
      if (snapshot.winnerId === 'p1') {
        this.soundManager?.playVictoryFanfare();
      } else {
        this.soundManager?.playDefeatTone();
      }
    }
    this.previousMatchState = snapshot.matchState;
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

    if (result.isBurstBreaker) {
      this.effects.triggerParryFlash({ x: impactX, y: impactY });
      this.soundManager.playCrownBurst();
      this.hitStopRemainingMs = 90;
      this.cameras.main.flash(180, 255, 215, 0); // Golden burst aura explosion
      this.cameras.main.shake(200, 0.02);
      return;
    }

    if (result.isThrowTech || result.resolution === 'tech_break') {
      this.effects.triggerClashSparks({ x: impactX, y: impactY });
      this.soundManager.playTechBreak();
      this.hitStopRemainingMs = 70;
      this.cameras.main.shake(120, 0.012);
      return;
    }

    if (result.isThrow || result.resolution === 'thrown') {
      this.effects.triggerHitImpact({ x: impactX, y: impactY }, true, result.damage);
      this.soundManager.playCommandThrow();
      this.hitStopRemainingMs = 100;
      this.cameras.main.shake(160, 0.016);
      return;
    }

    if (result.resolution === 'clash' || result.isClash) {
      this.effects.triggerClashSparks({ x: impactX, y: impactY - 20 });
      this.soundManager.playSwordClash();
      this.hitStopRemainingMs = 120; // Dramatic double-freeze on sword clash
      this.cameras.main.zoomTo(1.08, 120, 'Quad.easeOut');
      this.time.delayedCall(220, () => {
        this.cameras.main.zoomTo(1.0, 320, 'Quad.easeIn');
      });
      return;
    }

    if (result.isWallBounce) {
      const isLeft = impactX < 640;
      const wallX = isLeft ? 80 : 1200;
      this.effects.triggerWallBounceImpact({ x: wallX, y: impactY }, isLeft);
      this.soundManager.playWallBounce();
      this.hitStopRemainingMs = 60;
      return;
    }

    if (result.isGuardCrush) {
      this.effects.triggerGuardBreak({ x: impactX, y: impactY });
      this.soundManager.playExhaustionBreak();
      this.hitStopRemainingMs = 100;
      this.cameras.main.shake(160, 0.015);
    }

    if (result.resolution === 'parried') {
      this.effects.triggerParryFlash({ x: impactX, y: impactY });
      this.soundManager.playParryChime();
      this.hitStopRemainingMs = 70; // 70ms cinematic hit-stop
    } else if (result.resolution === 'blocked') {
      this.effects.triggerBlockSparks({ x: impactX, y: impactY });
      this.soundManager.playBlockClang();
      if (!result.isGuardCrush) {
        this.hitStopRemainingMs = 30; // 30ms block hit-stop
      }
    } else if (result.resolution === 'hit') {
      this.soundManager.playHurtGrunt();
      if (result.isDecapitation) {
        let attackerFacing: Direction = 'right';
        let isVictimPlayer = false;

        if (this.simulation) {
          const attacker = result.attackerId === 'p1' ? this.simulation.p1 : this.simulation.p2;
          attackerFacing = attacker.movement.facing;
          isVictimPlayer = result.defenderId === 'p1';
        } else if (this.lastRemoteSnapshot) {
          const attacker =
            result.attackerId === this.lastRemoteSnapshot.p1.id
              ? this.lastRemoteSnapshot.p1
              : this.lastRemoteSnapshot.p2;
          attackerFacing = attacker.facing;
          isVictimPlayer = result.defenderId === this.lastRemoteSnapshot.p1.id;
        }

        this.effects.triggerDecapitation(
          { x: impactX, y: impactY },
          attackerFacing,
          isVictimPlayer,
          () => this.soundManager?.playHeadThud()
        );
        this.soundManager.playDecapitationSlash();
        this.soundManager.playCrowdCheer('roar');
        this.hitStopRemainingMs = 180; // Dramatic mortal decapitation hit-stop freeze

        // Cinematic slow-motion camera zoom punch and crimson flash
        this.cameras.main.flash(200, 200, 25, 25);
        this.cameras.main.shake(260, 0.022);
        this.cameras.main.zoomTo(1.1, 240, 'Quad.easeOut');
        this.time.delayedCall(900, () => {
          this.cameras.main.zoomTo(1.0, 450, 'Quad.easeIn');
        });
      } else if (result.isRiposte) {
        // High-damage counter-puncture against stunned/exhausted rival
        this.effects.triggerRiposteImpact({ x: impactX, y: impactY }, result.damage);
        this.soundManager.playRiposteCrit();
        this.hitStopRemainingMs = 120; // Intense mortal riposte freeze
        this.cameras.main.flash(120, 180, 20, 20);
        this.cameras.main.shake(180, 0.018);
      } else if (result.attackType === 'sweep' || result.attackId === 'low_sweep') {
        // Low sweep trips defender and bypasses high block
        this.effects.triggerLowSweepTrip({ x: impactX, y: impactY });
        this.soundManager.playLowSweep();
        this.effects.triggerHitImpact({ x: impactX, y: impactY }, true, result.damage);
        this.hitStopRemainingMs = 90;
        this.cameras.main.shake(120, 0.012);
      } else if (result.isCounterHit) {
        // High-damage counter-hit interrupt on attacking defender
        this.effects.triggerCounterHit({ x: impactX, y: impactY });
        this.soundManager.playCounterHit();
        this.soundManager.playCrowdCheer('small');
        this.effects.triggerHitImpact({ x: impactX, y: impactY }, true, result.damage);
        this.hitStopRemainingMs = 100; // Heavy counter hit-stop crunch
        this.cameras.main.shake(150, 0.014);
      } else {
        this.effects.triggerHitImpact({ x: impactX, y: impactY }, result.isCritical, result.damage);
        if (result.comboCount && result.comboCount >= 2) {
          this.soundManager.playComboWhack(result.comboCount);
        } else {
          this.soundManager.playHitFlesh();
        }
        this.hitStopRemainingMs = result.isCritical ? 85 : 50; // Satisfying impact weight
      }
    }
  }

  private cleanUp(): void {
    this.colyseusUnsubscribers.forEach(unsub => {
      try {
        unsub();
      } catch {}
    });
    this.colyseusUnsubscribers = [];

    if (this.simulation) {
      this.simulation = null;
    }
    if (this.botAI) {
      this.botAI = null;
    }
    if (this.effects) {
      this.effects.destroy();
      this.effects = null;
    }
    if (this.soundManager) {
      this.soundManager.destroy();
      this.soundManager = null;
    }
    if (this.inputAdapter) {
      this.inputAdapter.destroy();
      this.inputAdapter = null;
    }
    if (this.dualInputManager) {
      this.dualInputManager.destroy();
      this.dualInputManager = null;
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
