import * as Phaser from 'phaser';
import { Vector2 } from '@last-crown/shared';

export class CombatEffects {
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  public triggerBlockSparks(pos: Vector2): void {
    const sparks = this.scene.add.graphics();
    sparks.fillStyle(0xffeaa7, 1);

    // Draw 8 radial spark lines
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8 + Math.random() * 0.4;
      const dist = 14 + Math.random() * 12;
      const ex = pos.x + Math.cos(angle) * dist;
      const ey = pos.y + Math.sin(angle) * dist;
      sparks.lineStyle(2, 0xffd32a, 1);
      sparks.lineBetween(pos.x, pos.y, ex, ey);
    }

    this.scene.tweens.add({
      targets: sparks,
      alpha: 0,
      scaleX: 1.5,
      scaleY: 1.5,
      duration: 180,
      onComplete: () => sparks.destroy(),
    });

    this.scene.cameras.main.shake(80, 0.004);
  }

  public triggerParryFlash(pos: Vector2): void {
    const flash = this.scene.add.circle(pos.x, pos.y, 42, 0xffd700, 0.85);

    this.scene.tweens.add({
      targets: flash,
      scaleX: 2.2,
      scaleY: 2.2,
      alpha: 0,
      duration: 260,
      ease: 'Cubic.easeOut',
      onComplete: () => flash.destroy(),
    });

    this.scene.cameras.main.shake(140, 0.008);
  }

  public triggerHitImpact(pos: Vector2, isCritical: boolean): void {
    const color = isCritical ? 0xff3838 : 0xff5252;
    const impact = this.scene.add.circle(pos.x, pos.y, isCritical ? 28 : 18, color, 0.9);

    this.scene.tweens.add({
      targets: impact,
      scaleX: 1.8,
      scaleY: 1.8,
      alpha: 0,
      duration: 160,
      onComplete: () => impact.destroy(),
    });

    this.scene.cameras.main.shake(isCritical ? 160 : 100, isCritical ? 0.012 : 0.006);
  }
}
