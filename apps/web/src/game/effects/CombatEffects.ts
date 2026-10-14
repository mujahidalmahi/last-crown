import * as Phaser from 'phaser';
import { Vector2 } from '@last-crown/shared';

export class CombatEffects {
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Floating combat text that arcs upward with arcade-fighting impact
   */
  public showFloatingText(
    pos: Vector2,
    text: string,
    color: string = '#f1c40f',
    fontSize: string = '18px',
    isCritical: boolean = false
  ): void {
    const offsetX = (Math.random() - 0.5) * 20;
    const offsetY = -40 + (Math.random() - 0.5) * 10;

    const label = this.scene.add.text(pos.x + offsetX, pos.y + offsetY, text, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: isCritical ? '24px' : fontSize,
      fontStyle: '900',
      color: color,
      stroke: '#000000',
      strokeThickness: isCritical ? 5 : 3,
      shadow: {
        offsetX: 0,
        offsetY: 2,
        color: '#000000',
        blur: 4,
        stroke: true,
        fill: true,
      },
    });
    label.setOrigin(0.5);
    label.setScale(isCritical ? 0.6 : 0.8);

    // Bounce pop-in and float upward
    this.scene.tweens.add({
      targets: label,
      scale: isCritical ? 1.4 : 1.1,
      y: pos.y + offsetY - (isCritical ? 50 : 35),
      x: pos.x + offsetX + (Math.random() - 0.5) * 30,
      alpha: { from: 1, to: 0 },
      duration: isCritical ? 850 : 650,
      ease: 'Back.easeOut',
      onComplete: () => label.destroy(),
    });
  }

  /**
   * High-energy metallic block sparks and deflection ring
   */
  public triggerBlockSparks(pos: Vector2): void {
    // 1. Deflection shockwave ring
    const ring = this.scene.add.graphics();
    ring.lineStyle(3, 0x74b9ff, 0.9);
    ring.strokeCircle(pos.x, pos.y, 14);

    this.scene.tweens.add({
      targets: ring,
      scaleX: 2.5,
      scaleY: 2.5,
      alpha: 0,
      duration: 200,
      ease: 'Cubic.easeOut',
      onComplete: () => ring.destroy(),
    });

    // 2. Flying spark particles
    for (let i = 0; i < 14; i++) {
      const spark = this.scene.add.rectangle(
        pos.x,
        pos.y,
        Math.random() * 4 + 2,
        Math.random() * 2 + 1,
        Math.random() > 0.3 ? 0xffeaa7 : 0x74b9ff
      );
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 140 + 60;
      const destX = pos.x + Math.cos(angle) * (speed * 0.25);
      const destY = pos.y + Math.sin(angle) * (speed * 0.25);

      this.scene.tweens.add({
        targets: spark,
        x: destX,
        y: destY,
        alpha: 0,
        scaleX: 0.2,
        scaleY: 0.2,
        duration: Math.random() * 150 + 100,
        ease: 'Quad.easeOut',
        onComplete: () => spark.destroy(),
      });
    }

    this.showFloatingText(pos, 'BLOCKED', '#74b9ff', '14px');
    this.scene.cameras.main.shake(70, 0.004);
  }

  /**
   * Dual golden runic parry shockwave, radiant light rays, and camera punch
   */
  public triggerParryFlash(pos: Vector2): void {
    // 1. Blinding golden core flash
    const coreFlash = this.scene.add.circle(pos.x, pos.y, 25, 0xffffff, 1);
    this.scene.tweens.add({
      targets: coreFlash,
      scaleX: 2.8,
      scaleY: 2.8,
      alpha: 0,
      duration: 240,
      ease: 'Expo.easeOut',
      onComplete: () => coreFlash.destroy(),
    });

    // 2. Expanding golden runic outer shockwave ring
    const goldRing = this.scene.add.graphics();
    goldRing.lineStyle(4, 0xffd700, 1);
    goldRing.strokeCircle(pos.x, pos.y, 18);

    this.scene.tweens.add({
      targets: goldRing,
      scaleX: 4.5,
      scaleY: 4.5,
      alpha: 0,
      duration: 380,
      ease: 'Cubic.easeOut',
      onComplete: () => goldRing.destroy(),
    });

    // 3. Radiant light rays explosion
    const rays = this.scene.add.graphics();
    const rayCount = 10;
    for (let i = 0; i < rayCount; i++) {
      const angle = (Math.PI * 2 * i) / rayCount;
      const rayLen = 50 + Math.random() * 30;
      rays.lineStyle(3, 0xffeaa7, 0.85);
      rays.lineBetween(
        pos.x + Math.cos(angle) * 10,
        pos.y + Math.sin(angle) * 10,
        pos.x + Math.cos(angle) * rayLen,
        pos.y + Math.sin(angle) * rayLen
      );
    }

    this.scene.tweens.add({
      targets: rays,
      alpha: 0,
      scaleX: 1.6,
      scaleY: 1.6,
      duration: 280,
      ease: 'Quad.easeOut',
      onComplete: () => rays.destroy(),
    });

    this.showFloatingText(pos, '👑 PARRIED!', '#ffd700', '22px', true);
    this.scene.cameras.main.shake(180, 0.012);
  }

  /**
   * Dynamic slash slice line, blood/impact particles, and camera impact
   */
  public triggerHitImpact(pos: Vector2, isCritical: boolean, damageAmount?: number): void {
    const slashColor = isCritical ? 0xff3838 : 0xff7675;

    // 1. Slash line cut decal across the defender
    const slash = this.scene.add.graphics();
    const slashAngle = -0.4 + (Math.random() - 0.5) * 0.4;
    const slashLen = isCritical ? 70 : 45;
    slash.lineStyle(isCritical ? 5 : 3, 0xffffff, 1);
    slash.lineBetween(
      pos.x - Math.cos(slashAngle) * (slashLen / 2),
      pos.y - Math.sin(slashAngle) * (slashLen / 2),
      pos.x + Math.cos(slashAngle) * (slashLen / 2),
      pos.y + Math.sin(slashAngle) * (slashLen / 2)
    );

    this.scene.tweens.add({
      targets: slash,
      alpha: 0,
      scaleX: 1.4,
      scaleY: 1.4,
      duration: 180,
      ease: 'Quad.easeOut',
      onComplete: () => slash.destroy(),
    });

    // 2. Impact burst circle
    const burst = this.scene.add.circle(pos.x, pos.y, isCritical ? 34 : 20, slashColor, 0.85);
    this.scene.tweens.add({
      targets: burst,
      scaleX: 2.2,
      scaleY: 2.2,
      alpha: 0,
      duration: 220,
      ease: 'Cubic.easeOut',
      onComplete: () => burst.destroy(),
    });

    // 3. Blood / impact droplet splatter
    const dropletCount = isCritical ? 16 : 10;
    for (let i = 0; i < dropletCount; i++) {
      const drop = this.scene.add.circle(
        pos.x,
        pos.y,
        Math.random() * 3 + 1.5,
        isCritical ? 0xd63031 : 0xe17055,
        0.9
      );
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * (isCritical ? 65 : 40) + 15;
      const targetX = pos.x + Math.cos(angle) * dist;
      const targetY = pos.y + Math.sin(angle) * dist + 15; // slight gravity pull

      this.scene.tweens.add({
        targets: drop,
        x: targetX,
        y: targetY,
        alpha: 0,
        scale: 0.3,
        duration: Math.random() * 220 + 160,
        ease: 'Quad.easeOut',
        onComplete: () => drop.destroy(),
      });
    }

    // 4. Floating Damage Text
    if (damageAmount !== undefined && damageAmount > 0) {
      const text = isCritical ? `-${damageAmount} CRIT!` : `-${damageAmount}`;
      this.showFloatingText(
        pos,
        text,
        isCritical ? '#ff3838' : '#fab1a0',
        isCritical ? '22px' : '17px',
        isCritical
      );
    }

    this.scene.cameras.main.shake(isCritical ? 180 : 90, isCritical ? 0.014 : 0.007);
  }

  /**
   * Guard break shatter: glass/crystal posture break shards exploding outwards
   */
  public triggerGuardBreak(pos: Vector2): void {
    // 1. Full-screen subtle amber flash
    const flash = this.scene.add.rectangle(
      this.scene.scale.width / 2,
      this.scene.scale.height / 2,
      this.scene.scale.width,
      this.scene.scale.height,
      0xe74c3c,
      0.25
    );
    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 220,
      onComplete: () => flash.destroy(),
    });

    // 2. Shattering posture shards
    for (let i = 0; i < 20; i++) {
      const shard = this.scene.add.triangle(
        pos.x,
        pos.y,
        0,
        0,
        Math.random() * 10 + 4,
        Math.random() * 12 + 6,
        Math.random() * 8 + 2,
        Math.random() * 10 + 4,
        0xf39c12
      );
      const angle = (Math.PI * 2 * i) / 20 + Math.random() * 0.3;
      const speed = Math.random() * 120 + 80;

      this.scene.tweens.add({
        targets: shard,
        x: pos.x + Math.cos(angle) * speed,
        y: pos.y + Math.sin(angle) * speed,
        angle: Math.random() * 360,
        alpha: 0,
        scale: 0.2,
        duration: 380,
        ease: 'Quad.easeOut',
        onComplete: () => shard.destroy(),
      });
    }

    this.showFloatingText(pos, '⚠️ GUARD BROKEN!', '#e74c3c', '24px', true);
    this.scene.cameras.main.shake(220, 0.016);
  }
}
