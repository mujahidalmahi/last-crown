import * as Phaser from 'phaser';
import {
  GAME_DEFAULTS,
  applyGamePreset,
  applyColorTheme,
  applyControllerProfile,
  updateGameDefaults,
  resetGameDefaults,
  exportGameDefaultsJSON,
} from '@last-crown/game-config';
import { createPhaserConfig } from '../config/phaserConfig';
import { BattleScene, BattleSceneConfig } from '../scenes/BattleScene';

// Expose runtime config helpers on window in browser dev environments
if (typeof window !== 'undefined') {
  const win = window as any;
  win.GAME_DEFAULTS = GAME_DEFAULTS;
  win.applyGamePreset = applyGamePreset;
  win.applyColorTheme = applyColorTheme;
  win.applyControllerProfile = applyControllerProfile;
  win.updateGameDefaults = updateGameDefaults;
  win.resetGameDefaults = resetGameDefaults;
  win.exportGameDefaultsJSON = exportGameDefaultsJSON;
}

export class GameBootstrap {
  private game: Phaser.Game | null = null;

  public initialize(parentElement: HTMLElement, sceneConfig: BattleSceneConfig): Phaser.Game {
    if (this.game) {
      this.destroy();
    }

    const config = createPhaserConfig(parentElement);
    this.game = new Phaser.Game({
      ...config,
      callbacks: {
        preBoot: (game: Phaser.Game) => {
          game.registry.set('battleSceneConfig', sceneConfig);
        },
      },
    });

    // Pass runtime scene configuration when BattleScene starts
    this.game.events.once('ready', () => {
      this.game?.scale.refresh();
      const battleScene = this.game?.scene.getScene('BattleScene') as BattleScene | undefined;
      if (battleScene) {
        battleScene.scene.restart(sceneConfig);
      }
    });

    return this.game;
  }

  public refreshScale(): void {
    if (this.game) {
      this.game.scale.refresh();
    }
  }

  public getBattleScene(): BattleScene | null {
    if (!this.game) return null;
    return (this.game.scene.getScene('BattleScene') as BattleScene) || null;
  }

  public rematch(): void {
    const battleScene = this.getBattleScene();
    if (battleScene) {
      battleScene.rematch();
    }
  }

  public setPaused(paused: boolean): void {
    const battleScene = this.getBattleScene();
    if (battleScene) {
      battleScene.setPaused(paused);
    }
  }

  public isPaused(): boolean {
    const battleScene = this.getBattleScene();
    return battleScene ? battleScene.getIsPaused() : false;
  }

  public getGame(): Phaser.Game | null {
    return this.game;
  }

  public destroy(): void {
    if (this.game) {
      this.game.destroy(true, false);
      this.game = null;
    }
  }
}
