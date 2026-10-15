import * as Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  public preload(): void {
    this.load.image('playground', '/assets/backgrounds/playground.jpg');
  }

  public create(): void {
    this.scene.start('BattleScene');
  }
}
