import * as Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  public preload(): void {
    this.load.image('playground', '/assets/backgrounds/playground.jpg');
    this.load.image('playground2', '/assets/backgrounds/playground2.jpg');
    this.load.image('playground3', '/assets/backgrounds/playground3.jpg');
    this.load.image('playground4', '/assets/backgrounds/playground4.jpg');
  }

  public create(): void {
    const sceneConfig = this.registry.get('battleSceneConfig');
    this.scene.start('BattleScene', sceneConfig);
  }
}
