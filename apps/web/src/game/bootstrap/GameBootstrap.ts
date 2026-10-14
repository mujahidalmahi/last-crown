import * as Phaser from 'phaser';
import { createPhaserConfig } from '../config/phaserConfig';
import { BattleSceneConfig } from '../scenes/BattleScene';

export class GameBootstrap {
  private game: Phaser.Game | null = null;

  public initialize(parentElement: HTMLElement, sceneConfig: BattleSceneConfig): Phaser.Game {
    if (this.game) {
      this.destroy();
    }

    const config = createPhaserConfig(parentElement);
    this.game = new Phaser.Game(config);

    // Pass runtime scene configuration when BattleScene starts
    this.game.events.once('ready', () => {
      const battleScene = this.game?.scene.getScene('BattleScene');
      if (battleScene) {
        battleScene.scene.restart(sceneConfig);
      }
    });

    return this.game;
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
