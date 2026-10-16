import * as Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  public preload(): void {
    // Generate loading indicator or pre-warm assets
  }

  public create(): void {
    const sceneConfig = this.registry.get('battleSceneConfig');
    this.scene.start('BattleScene', sceneConfig);
  }
}
