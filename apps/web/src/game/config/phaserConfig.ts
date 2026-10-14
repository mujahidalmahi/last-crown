import * as Phaser from 'phaser';
import { BootScene } from '../scenes/BootScene';
import { BattleScene } from '../scenes/BattleScene';

export function createPhaserConfig(parentElement: HTMLElement): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent: parentElement,
    width: 1280,
    height: 720,
    backgroundColor: '#0a0c10',
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { x: 0, y: 0 },
        debug: false,
      },
    },
    scene: [BootScene, BattleScene],
    render: {
      pixelArt: true,
      antialias: false,
      roundPixels: true,
    },
  };
}
