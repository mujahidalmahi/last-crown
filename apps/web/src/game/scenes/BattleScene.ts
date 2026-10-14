import * as Phaser from 'phaser';
import { HitResult } from '@last-crown/shared';
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
  private hitboxDebugGraphics: Phaser.GameObjects.Graphics | null = null;

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

    // Render medieval castle arena backdrop
    this.drawArena(width, height);

    this.hitboxDebugGraphics = this.add.graphics();

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

      this.botAI = new WarriorBotAI();

      this.simulation.onCombatEvent((result: HitResult) => {
        this.handleCombatEvent(result);
        if (this.config.onCombatEvent) {
          this.config.onCombatEvent(result);
        }
      });
    }

    // Clean up on scene destroy
    this.events.on(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanUp());
  }

  private drawArena(width: number, height: number): void {
    this.arenaGraphics = this.add.graphics();

    // Night sky gradient
    this.arenaGraphics.fillGradientStyle(0x070b12, 0x070b12, 0x161c28, 0x161c28, 1);
    this.arenaGraphics.fillRect(0, 0, width, height);

    // Distant castle ramparts / battlements
    this.arenaGraphics.fillStyle(0x1a2130, 1);
    this.arenaGraphics.fillRect(40, 240, width - 80, 320);

    // Stone battlements crenellations
    for (let x = 60; x < width - 80; x += 60) {
      this.arenaGraphics.fillRect(x, 210, 36, 30);
    }

    // Stone floor
    const floorY = 560;
    this.arenaGraphics.fillStyle(0x273142, 1);
    this.arenaGraphics.fillRect(0, floorY, width, height - floorY);

    // Gold floor border trim
    this.arenaGraphics.fillStyle(0xd4af37, 0.7);
    this.arenaGraphics.fillRect(0, floorY, width, 4);

    // Stone flags
    this.arenaGraphics.lineStyle(1, 0x1a2130, 0.4);
    for (let x = 0; x < width; x += 80) {
      this.arenaGraphics.lineBetween(x, floorY, x, height);
    }

    // Ambient torch lighting glow
    this.add.circle(180, 320, 120, 0xf39c12, 0.15);
    this.add.circle(width - 180, 320, 120, 0xf39c12, 0.15);
  }

  public update(_time: number, delta: number): void {
    const deltaSec = delta / 1000;

    if (this.config.mode === 'singleplayer' && this.simulation && this.botAI && this.inputAdapter) {
      // Poll human keyboard input
      const p1Input = this.inputAdapter.pollInput();

      // Trigger sword swing sound if attack started
      if (p1Input.attack && this.soundManager) {
        this.soundManager.playSwordSwing();
      }

      // Compute Bot AI input
      const p1Snap = this.simulation.p1.toSnapshot();
      const p2Snap = this.simulation.p2.toSnapshot();
      const p2Input = this.botAI.update(p2Snap, p1Snap, delta);

      if (p2Input.attack && this.soundManager) {
        this.soundManager.playSwordSwing();
      }

      // Step local simulation
      this.simulation.step(p1Input, p2Input, deltaSec);

      // Render updated warrior states
      const snap = this.simulation.getSnapshot();
      if (this.p1Renderer) this.p1Renderer.render(snap.p1);
      if (this.p2Renderer) this.p2Renderer.render(snap.p2);

      // Emit to React HUD
      if (this.config.onSnapshot) {
        this.config.onSnapshot(snap);
      }
    }
  }

  public syncRemoteSnapshot(snapshot: GameSimulationSnapshot): void {
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

  public handleCombatEvent(result: HitResult): void {
    if (!this.effects || !this.soundManager) return;

    // Determine impact coordinates
    const impactX =
      result.resolution === 'parried'
        ? this.simulation?.p2.movement.position.x || 500
        : this.simulation?.p2.movement.position.x || 500;
    const impactY = 500;

    if (result.resolution === 'parried') {
      this.effects.triggerParryFlash({ x: impactX, y: impactY });
      this.soundManager.playParryChime();
    } else if (result.resolution === 'blocked') {
      this.effects.triggerBlockSparks({ x: impactX, y: impactY });
      this.soundManager.playBlockClang();
    } else if (result.resolution === 'hit') {
      this.effects.triggerHitImpact({ x: impactX, y: impactY }, result.isCritical);
      this.soundManager.playHitFlesh();
    }
  }

  private cleanUp(): void {
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
    if (this.hitboxDebugGraphics) {
      this.hitboxDebugGraphics.destroy();
      this.hitboxDebugGraphics = null;
    }
    if (this.arenaGraphics) {
      this.arenaGraphics.destroy();
      this.arenaGraphics = null;
    }
  }
}
