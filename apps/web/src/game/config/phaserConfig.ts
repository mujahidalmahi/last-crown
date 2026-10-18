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
      mode: Phaser.Scale.ENVELOP,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { x: 0, y: 0 },
        debug: false,
      },
    },
    fps: {
      min: 30,
      target: 144,
      forceSetTimeOut: false,
      deltaHistory: 10,
      smoothStep: true,
    },
    scene: [BootScene, BattleScene],
    render: {
      pixelArt: true,
      antialias: false,
      antialiasGL: false,
      roundPixels: true,
      powerPreference: 'high-performance',
      desynchronized: true,
      batchSize: 4096,
      clearBeforeRender: true,
    },
  };
}
