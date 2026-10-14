import * as Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  public preload(): void {
    // Generate loading indicator or pre-warm assets
  }

  public create(): void {
    this.scene.start('BattleScene');
  }
}
