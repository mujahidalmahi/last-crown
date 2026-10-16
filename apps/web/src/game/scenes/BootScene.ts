import * as Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  public preload(): void {
    this.load.image('playground', '/assets/backgrounds/playground.jpg');
  }

  public create(): void {
    const sceneConfig = this.registry.get('battleSceneConfig');
    this.scene.start('BattleScene', sceneConfig);
  }
}
