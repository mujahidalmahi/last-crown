import * as Phaser from 'phaser';
import { Vector2, Direction } from '@last-crown/shared';
import { COLOR_DEFAULTS } from '@last-crown/game-config';

interface SeveredHeadPhysics {
  container: Phaser.GameObjects.Container;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angularVelocity: number;
  rotation: number;
  bounces: number;
  settled: boolean;
  bloodDripTimer: number;
  isPlayer: boolean;
  onBounceCallback?: () => void;
}

interface BloodParticle {
  graphics: Phaser.GameObjects.Graphics;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  life: number;
  maxLife: number;
}

interface BloodPool {
  graphics: Phaser.GameObjects.Graphics;
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  growRate: number;
}

interface ArterialSpurt {
  x: number;
  y: number;
  remainingMs: number;
  pulseTimerMs: number;
  dir: number;
}

export class CombatEffects {
  private scene: Phaser.Scene;
  private severedHeads: SeveredHeadPhysics[] = [];
  private bloodParticles: BloodParticle[] = [];
  private bloodPools: BloodPool[] = [];
  private arterialSpurts: ArterialSpurt[] = [];
  private floorDecalsGraphics: Phaser.GameObjects.Graphics | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.floorDecalsGraphics = this.scene.add.graphics();
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
    ring.lineStyle(3, COLOR_DEFAULTS.effects.parryRing, 0.9);
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
        Math.random() > 0.3 ? COLOR_DEFAULTS.effects.parrySpark : COLOR_DEFAULTS.effects.parryRing
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
    goldRing.lineStyle(4, COLOR_DEFAULTS.effects.burstShockwave, 1);
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
      rays.lineStyle(3, COLOR_DEFAULTS.effects.clashRays, 0.85);
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
   * Massive steel clash cross-burst, radiating shockwaves, sparks & screen rattle
   */
  public triggerClashSparks(pos: Vector2): void {
    // 1. Cross-blade X flash lines
    const cross = this.scene.add.graphics();
    cross.lineStyle(6, 0xffffff, 1);
    cross.lineBetween(pos.x - 45, pos.y - 45, pos.x + 45, pos.y + 45);
    cross.lineBetween(pos.x - 45, pos.y + 45, pos.x + 45, pos.y - 45);
    cross.lineStyle(10, 0xf1c40f, 0.7);
    cross.lineBetween(pos.x - 45, pos.y - 45, pos.x + 45, pos.y + 45);
    cross.lineBetween(pos.x - 45, pos.y + 45, pos.x + 45, pos.y - 45);

    this.scene.tweens.add({
      targets: cross,
      scaleX: 1.8,
      scaleY: 1.8,
      alpha: 0,
      duration: 260,
      ease: 'Quad.easeOut',
      onComplete: () => cross.destroy(),
    });

    // 2. Dual expanding concentric clash shockwave rings
    const ring1 = this.scene.add.graphics();
    ring1.lineStyle(5, 0xffd700, 1);
    ring1.strokeCircle(pos.x, pos.y, 20);

    this.scene.tweens.add({
      targets: ring1,
      scaleX: 4.8,
      scaleY: 4.8,
      alpha: 0,
      duration: 350,
      ease: 'Cubic.easeOut',
      onComplete: () => ring1.destroy(),
    });

    const ring2 = this.scene.add.graphics();
    ring2.lineStyle(3, 0xffffff, 0.9);
    ring2.strokeCircle(pos.x, pos.y, 12);

    this.scene.tweens.add({
      targets: ring2,
      scaleX: 6.0,
      scaleY: 6.0,
      alpha: 0,
      duration: 420,
      ease: 'Quad.easeOut',
      onComplete: () => ring2.destroy(),
    });

    // 3. Dense 360-degree spark spray
    for (let i = 0; i < 24; i++) {
      const spark = this.scene.add.rectangle(
        pos.x,
        pos.y,
        Math.random() * 5 + 3,
        Math.random() * 3 + 1.5,
        Math.random() > 0.4 ? 0xfffa65 : 0xffffff
      );
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 220 + 80;
      const destX = pos.x + Math.cos(angle) * (speed * 0.3);
      const destY = pos.y + Math.sin(angle) * (speed * 0.3);

      this.scene.tweens.add({
        targets: spark,
        x: destX,
        y: destY,
        angle: Math.random() * 360,
        alpha: 0,
        scale: 0.2,
        duration: Math.random() * 240 + 120,
        ease: 'Quad.easeOut',
        onComplete: () => spark.destroy(),
      });
    }

    this.showFloatingText(pos, '⚔️ CLASH!', '#f1c40f', '26px', true);
    this.scene.cameras.main.shake(200, 0.016);
  }

  /**
   * Wall impact shockwave and stone fragment spray when bounced off the boundary
   */
  public triggerWallBounceImpact(pos: Vector2, isLeftWall: boolean): void {
    const dir = isLeftWall ? 1 : -1;

    // 1. Vertical impact fracture ring on the boundary
    const impactGfx = this.scene.add.graphics();
    impactGfx.lineStyle(4, 0xecf0f1, 0.9);
    impactGfx.strokeEllipse(pos.x, pos.y - 30, 16, 55);

    this.scene.tweens.add({
      targets: impactGfx,
      scaleX: 2.2,
      scaleY: 1.6,
      alpha: 0,
      duration: 250,
      ease: 'Quad.easeOut',
      onComplete: () => impactGfx.destroy(),
    });

    // 2. Flying masonry stone fragments into the arena
    for (let i = 0; i < 14; i++) {
      const stone = this.scene.add.rectangle(
        pos.x,
        pos.y - 30 + (Math.random() - 0.5) * 40,
        Math.random() * 5 + 3,
        Math.random() * 5 + 3,
        0x7f8c8d
      );
      const angle = (dir > 0 ? 0 : Math.PI) + (Math.random() - 0.5) * 1.4;
      const speed = Math.random() * 180 + 70;

      this.scene.tweens.add({
        targets: stone,
        x: pos.x + Math.cos(angle) * speed,
        y: pos.y - 20 + Math.sin(angle) * speed + 30,
        angle: Math.random() * 360,
        alpha: 0,
        duration: 360,
        ease: 'Cubic.easeOut',
        onComplete: () => stone.destroy(),
      });
    }

    this.showFloatingText(pos, '💥 WALL BOUNCE!', '#e74c3c', '20px', true);
    this.scene.cameras.main.shake(160, 0.012);
  }

  /**
   * Vibrant fiery counter-hit burst with shockwave, ember spray & screen crunch
   */
  public triggerCounterHit(pos: Vector2): void {
    // 1. Radiant orange-gold shockwave ring
    const ring = this.scene.add.graphics();
    ring.lineStyle(4, 0xff793f, 1);
    ring.strokeCircle(pos.x, pos.y, 22);

    this.scene.tweens.add({
      targets: ring,
      scaleX: 3.8,
      scaleY: 3.8,
      alpha: 0,
      duration: 280,
      ease: 'Cubic.easeOut',
      onComplete: () => ring.destroy(),
    });

    // 2. High-speed fiery spark bursts
    for (let i = 0; i < 18; i++) {
      const spark = this.scene.add.rectangle(
        pos.x,
        pos.y,
        Math.random() * 5 + 3,
        Math.random() * 3 + 2,
        Math.random() > 0.4 ? 0xff793f : 0xfffa65
      );
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 200 + 90;
      const destX = pos.x + Math.cos(angle) * (speed * 0.28);
      const destY = pos.y + Math.sin(angle) * (speed * 0.28);

      this.scene.tweens.add({
        targets: spark,
        x: destX,
        y: destY,
        angle: Math.random() * 360,
        alpha: 0,
        scale: 0.15,
        duration: Math.random() * 220 + 120,
        ease: 'Quad.easeOut',
        onComplete: () => spark.destroy(),
      });
    }

    this.showFloatingText(pos, '⚡ COUNTER!', '#ff793f', '24px', true);
    this.scene.cameras.main.shake(140, 0.01);
  }

  /**
   * Ground slam dust wave and floor impact ripple for Helm Splitter
   */
  public triggerGroundSlam(pos: Vector2): void {
    const floorY = 560;

    // 1. Dual expanding ground dust waves left and right
    const wave = this.scene.add.graphics();
    wave.fillStyle(0xdfe6e9, 0.6);
    wave.fillEllipse(pos.x, floorY, 40, 12);

    this.scene.tweens.add({
      targets: wave,
      scaleX: 3.5,
      alpha: 0,
      duration: 320,
      ease: 'Quad.easeOut',
      onComplete: () => wave.destroy(),
    });

    // 2. Stone shockwave ring
    const ring = this.scene.add.graphics();
    ring.lineStyle(3, 0xf1c40f, 0.9);
    ring.strokeEllipse(pos.x, floorY, 28, 10);

    this.scene.tweens.add({
      targets: ring,
      scaleX: 3.8,
      scaleY: 3.8,
      alpha: 0,
      duration: 380,
      ease: 'Cubic.easeOut',
      onComplete: () => ring.destroy(),
    });

    this.scene.cameras.main.shake(200, 0.014);
  }

  /**
   * Skid and dash dust puffs behind feet
   */
  public triggerDashDust(pos: Vector2, facing: Direction): void {
    const dir = facing === 'right' ? -1 : 1;
    const footY = 556;

    for (let i = 0; i < 6; i++) {
      const puff = this.scene.add.circle(
        pos.x + dir * (12 + Math.random() * 16),
        footY - Math.random() * 8,
        Math.random() * 4 + 2,
        0x95a5a6,
        0.5
      );

      this.scene.tweens.add({
        targets: puff,
        x: puff.x + dir * (Math.random() * 25 + 10),
        y: puff.y - Math.random() * 12,
        scale: 1.8,
        alpha: 0,
        duration: 300 + Math.random() * 150,
        ease: 'Quad.easeOut',
        onComplete: () => puff.destroy(),
      });
    }
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

  /**
   * Mortal riposte puncture: violent blood explosion, crimson flash and brutal screen shock
   */
  public triggerRiposteImpact(pos: Vector2, damageAmount: number): void {
    // 1. Violent cross-cleave flash
    const cross = this.scene.add.graphics();
    cross.lineStyle(6, 0xff0000, 1);
    cross.lineBetween(pos.x - 50, pos.y - 35, pos.x + 50, pos.y + 35);
    cross.lineStyle(8, 0xffffff, 0.9);
    cross.lineBetween(pos.x - 40, pos.y + 35, pos.x + 40, pos.y - 35);

    this.scene.tweens.add({
      targets: cross,
      scaleX: 1.8,
      scaleY: 1.8,
      alpha: 0,
      duration: 220,
      ease: 'Quad.easeOut',
      onComplete: () => cross.destroy(),
    });

    // 2. High-volume arterial spray
    for (let i = 0; i < 22; i++) {
      const angle = (Math.PI * 2 * i) / 22 + (Math.random() - 0.5) * 0.4;
      const speed = Math.random() * 220 + 100;
      this.spawnBloodParticle(
        pos.x,
        pos.y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        Math.random() * 3 + 2
      );
    }

    this.showFloatingText(pos, `💀 MORTAL RIPOSTE! -${damageAmount}`, '#ff0033', '26px', true);
    this.scene.cameras.main.shake(220, 0.02);
  }

  /**
   * Low leg sweep dust arc and ground sparks
   */
  public triggerLowSweepTrip(pos: Vector2): void {
    const sweepArc = this.scene.add.graphics();
    sweepArc.lineStyle(5, 0xf39c12, 0.9);
    sweepArc.strokeEllipse(pos.x, pos.y + 20, 60, 16);

    this.scene.tweens.add({
      targets: sweepArc,
      scaleX: 2.2,
      scaleY: 1.8,
      alpha: 0,
      duration: 260,
      ease: 'Quad.easeOut',
      onComplete: () => sweepArc.destroy(),
    });

    this.showFloatingText(
      { x: pos.x, y: pos.y + 10 },
      '⚡ LOW SWEEP TRIP!',
      '#f39c12',
      '20px',
      true
    );
    this.scene.cameras.main.shake(140, 0.01);
  }

  /**
   * Fatal execution: decapitate opponent, send severed head tumbling, spurt arterial blood, and pool continuously on stone floor
   */
  public triggerDecapitation(
    victimPos: Vector2,
    attackerFacing: Direction,
    isVictimPlayer: boolean,
    onHeadBounce?: () => void
  ): void {
    const dir = attackerFacing === 'right' ? 1 : -1;
    const neckY = victimPos.y - 70;

    // 1. Visceral neck-cleaving slash beam (broad red & white cleave flash)
    const cleave = this.scene.add.graphics();
    cleave.lineStyle(8, 0xffffff, 1);
    const startX = victimPos.x - dir * 55;
    const endX = victimPos.x + dir * 65;
    cleave.lineBetween(startX, neckY + 12, endX, neckY - 12);
    cleave.lineStyle(14, 0xad0505, 0.7);
    cleave.lineBetween(startX, neckY + 12, endX, neckY - 12);

    this.scene.tweens.add({
      targets: cleave,
      alpha: 0,
      scaleY: 2,
      duration: 250,
      ease: 'Quad.easeOut',
      onComplete: () => cleave.destroy(),
    });

    // 2. High-speed initial blood burst fan in the direction of the cut
    for (let i = 0; i < 28; i++) {
      const angle = -0.5 * Math.PI + (Math.random() - 0.5) * 1.2 + dir * 0.3;
      const speed = Math.random() * 260 + 140;
      this.spawnBloodParticle(
        victimPos.x,
        neckY,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        Math.random() * 3.5 + 2
      );
    }

    // 3. Severed Head Container & Procedural Knight Helmet
    const headContainer = this.scene.add.container(victimPos.x, neckY);
    const headGfx = this.scene.add.graphics();
    headContainer.add(headGfx);

    const steelHighlight = 0xecf0f1;
    const goldTrim = 0xf1c40f;
    const plumeColor = isVictimPlayer ? 0xf1c40f : 0xe74c3c;

    // Dome of severed helmet
    headGfx.fillStyle(steelHighlight, 1);
    headGfx.fillRoundedRect(-15, -12, 30, 24, 4);
    headGfx.lineStyle(1.5, goldTrim, 0.8);
    headGfx.strokeRoundedRect(-15, -12, 30, 24, 4);

    // T-Slit Visor
    headGfx.fillStyle(0x0c1017, 1);
    headGfx.fillRect(-4, -3, 18, 4);
    headGfx.fillRect(3, -5, 4, 13);

    // Visor dark eye slit
    headGfx.fillStyle(isVictimPlayer ? 0x27ae60 : 0xc0392b, 0.85);
    headGfx.fillRect(-1, -2, 5, 2);

    // Helmet plume
    headGfx.fillStyle(plumeColor, 1);
    headGfx.fillTriangle(-4, -12, 4, -12, -8, -26);

    // Severed ragged neck base at the bottom of the helmet
    headGfx.fillStyle(0x5a0000, 1);
    headGfx.fillEllipse(0, 12, 18, 7);
    headGfx.fillStyle(0x8a0303, 1);
    headGfx.fillEllipse(0, 12, 12, 4);
    headGfx.fillStyle(0xf0eee4, 1);
    headGfx.fillCircle(0, 12, 2.5); // Vertebra bone cross section

    // Register severed head physics
    this.severedHeads.push({
      container: headContainer,
      x: victimPos.x,
      y: neckY,
      vx: dir * (200 + Math.random() * 70),
      vy: -320 - Math.random() * 60,
      angularVelocity: dir * (11 + Math.random() * 5),
      rotation: 0,
      bounces: 0,
      settled: false,
      bloodDripTimer: 0,
      isPlayer: isVictimPlayer,
      onBounceCallback: onHeadBounce,
    });

    // 4. Register Arterial Spurt at the neck stump
    this.arterialSpurts.push({
      x: victimPos.x,
      y: victimPos.y - 42,
      remainingMs: 3800,
      pulseTimerMs: 0,
      dir,
    });

    // 5. Register expanding blood pool on the floor beneath the kneeling neck stump
    const floorY = 560;
    const poolGfx = this.scene.add.graphics();
    this.bloodPools.push({
      graphics: poolGfx,
      x: victimPos.x,
      y: floorY,
      radius: 4,
      maxRadius: 54,
      growRate: 11, // Grows smoothly over ~5 seconds
    });

    // 6. Impact banner & camera shake
    this.showFloatingText(
      { x: victimPos.x, y: neckY - 20 },
      '👑 FATAL EXECUTION - DECAPITATED!',
      '#ff3838',
      '26px',
      true
    );
    this.scene.cameras.main.shake(280, 0.022);
  }

  public update(deltaSec: number): void {
    const deltaMs = deltaSec * 1000;
    const floorY = 560;

    // 1. Update Arterial Blood Geysers
    for (let i = this.arterialSpurts.length - 1; i >= 0; i--) {
      const spurt = this.arterialSpurts[i];
      if (!spurt) continue;
      spurt.remainingMs -= deltaMs;
      spurt.pulseTimerMs -= deltaMs;

      // Pumping arterial pulse every 140ms
      if (spurt.pulseTimerMs <= 0 && spurt.remainingMs > 400) {
        spurt.pulseTimerMs = 140;
        // Spurt pressure decays as time runs out
        const pressure = Math.max(0.35, spurt.remainingMs / 3800);
        const dropletCount = Math.floor(6 + Math.random() * 6);
        for (let d = 0; d < dropletCount; d++) {
          const arcAngle = -0.5 * Math.PI + (Math.random() - 0.5) * 0.7 + spurt.dir * 0.25;
          const arcSpeed = (Math.random() * 180 + 120) * pressure;
          this.spawnBloodParticle(
            spurt.x + (Math.random() - 0.5) * 8,
            spurt.y,
            Math.cos(arcAngle) * arcSpeed,
            Math.sin(arcAngle) * arcSpeed,
            Math.random() * 2.8 + 1.5
          );
        }
      }

      // Continuous dripping trickling down to the pool
      if (Math.random() < 0.35) {
        this.spawnBloodParticle(
          spurt.x + (Math.random() - 0.5) * 6,
          spurt.y + 10,
          (Math.random() - 0.5) * 15,
          Math.random() * 60 + 30,
          Math.random() * 2.2 + 1.2
        );
      }

      if (spurt.remainingMs <= 0) {
        this.arterialSpurts.splice(i, 1);
      }
    }

    // 2. Update Severed Head Physics
    for (const head of this.severedHeads) {
      if (!head.settled) {
        // Apply gravity
        head.vy += 1300 * deltaSec;
        head.x += head.vx * deltaSec;
        head.y += head.vy * deltaSec;
        head.rotation += head.angularVelocity * deltaSec;

        // Drip trailing blood droplets while airborne
        head.bloodDripTimer += deltaMs;
        if (head.bloodDripTimer > 45) {
          head.bloodDripTimer = 0;
          this.spawnBloodParticle(
            head.x,
            head.y + 8,
            head.vx * 0.3 + (Math.random() - 0.5) * 20,
            head.vy * 0.3 + Math.random() * 40,
            Math.random() * 2.5 + 1.2
          );
        }

        // Floor collision (floorY = 560, head radius ~12px => contact at 554)
        if (head.y >= 554) {
          head.y = 554;
          if (head.vy > 0) {
            head.vy = -head.vy * 0.42;
            head.vx *= 0.68;
            head.angularVelocity *= 0.62;
            head.bounces++;

            if (head.onBounceCallback && Math.abs(head.vy) > 30) {
              head.onBounceCallback();
            }

            // Splatter decal on ground contact
            this.addFloorBloodSplatter(head.x, floorY, Math.random() * 6 + 4);

            // Spawn secondary pool under the head on first ground contact
            if (head.bounces === 1) {
              const headPoolGfx = this.scene.add.graphics();
              this.bloodPools.push({
                graphics: headPoolGfx,
                x: head.x,
                y: floorY,
                radius: 3,
                maxRadius: 30,
                growRate: 7,
              });
            }

            if (Math.abs(head.vy) < 35 && Math.abs(head.vx) < 25) {
              head.settled = true;
              head.vy = 0;
              head.vx = 0;
              head.angularVelocity = 0;
              head.y = 554;
            }
          }
        }

        head.container.setPosition(head.x, head.y);
        head.container.setRotation(head.rotation);
      } else {
        // When settled, occasionally ooze a blood drop into its pool
        if (Math.random() < 0.08) {
          this.addFloorBloodSplatter(
            head.x + (Math.random() - 0.5) * 12,
            floorY,
            Math.random() * 3 + 2
          );
        }
      }
    }

    // 3. Update In-Flight Blood Droplets & Splatters
    for (let i = this.bloodParticles.length - 1; i >= 0; i--) {
      const p = this.bloodParticles[i];
      if (!p) continue;
      p.life += deltaMs;
      p.vy += 1400 * deltaSec; // Gravity
      p.x += p.vx * deltaSec;
      p.y += p.vy * deltaSec;

      p.graphics.clear();

      // Splatter onto floor
      if (p.y >= floorY) {
        this.addFloorBloodSplatter(p.x, floorY, p.size * 1.5);
        p.graphics.destroy();
        this.bloodParticles.splice(i, 1);
        continue;
      }

      if (p.life >= p.maxLife) {
        p.graphics.destroy();
        this.bloodParticles.splice(i, 1);
        continue;
      }

      // Draw elongated droplet along velocity vector
      const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      p.graphics.fillStyle(0x9a0303, p.alpha);
      p.graphics.fillCircle(p.x, p.y, p.size);
      if (speed > 80) {
        p.graphics.lineStyle(p.size * 1.4, 0x720000, p.alpha * 0.7);
        p.graphics.lineBetween(
          p.x,
          p.y,
          p.x - (p.vx / speed) * p.size * 2.5,
          p.y - (p.vy / speed) * p.size * 2.5
        );
      }
    }

    // 4. Update Expanding Blood Pools on Stone Floor
    for (const pool of this.bloodPools) {
      if (pool.radius < pool.maxRadius) {
        pool.radius = Math.min(pool.maxRadius, pool.radius + pool.growRate * deltaSec);
        pool.graphics.clear();

        const r = pool.radius;
        // Deep dark congealed blood base
        pool.graphics.fillStyle(0x320000, 0.95);
        pool.graphics.fillEllipse(pool.x, pool.y, r * 2.2, r * 0.65);

        // Fresh glossy crimson layer
        pool.graphics.fillStyle(0x7c0404, 0.9);
        pool.graphics.fillEllipse(pool.x, pool.y, r * 1.8, r * 0.52);

        // Glistening wet center
        pool.graphics.fillStyle(0xaa0e0e, 0.8);
        pool.graphics.fillEllipse(pool.x, pool.y - 1, r * 1.2, r * 0.35);

        // Wet specular shine reflections
        pool.graphics.fillStyle(0xff4d4d, 0.45);
        pool.graphics.fillEllipse(pool.x - r * 0.3, pool.y - 2, r * 0.4, r * 0.12);
      }
    }
  }

  private addFloorBloodSplatter(x: number, y: number, size: number): void {
    if (!this.floorDecalsGraphics) {
      this.floorDecalsGraphics = this.scene.add.graphics();
    }
    // Draw semi-permanent splatter decal on stone tiles
    this.floorDecalsGraphics.fillStyle(0x5a0000, 0.88);
    this.floorDecalsGraphics.fillEllipse(x, y, size * 2.2, size * 0.7);
    this.floorDecalsGraphics.fillStyle(0x8a0202, 0.75);
    this.floorDecalsGraphics.fillEllipse(x, y, size * 1.4, size * 0.45);

    // Occasional tiny satellite splatter droplet
    if (Math.random() < 0.5) {
      const offsetX = (Math.random() - 0.5) * size * 3;
      this.floorDecalsGraphics.fillStyle(0x5a0000, 0.8);
      this.floorDecalsGraphics.fillCircle(x + offsetX, y, size * 0.35);
    }
  }

  private spawnBloodParticle(x: number, y: number, vx: number, vy: number, size: number): void {
    const gfx = this.scene.add.graphics();
    this.bloodParticles.push({
      graphics: gfx,
      x,
      y,
      vx,
      vy,
      size,
      alpha: 0.95,
      life: 0,
      maxLife: 1400,
    });
  }

  /**
   * Resets all per-round severed heads, blood pools, arterial spurts,
   * in-flight blood particles, and floor splatter decals so the new round begins in a clean arena.
   */
  public resetRound(): void {
    for (const head of this.severedHeads) {
      if (head.container && head.container.scene) {
        head.container.destroy();
      }
    }
    this.severedHeads = [];

    for (const p of this.bloodParticles) {
      if (p.graphics && p.graphics.scene) {
        p.graphics.destroy();
      }
    }
    this.bloodParticles = [];

    for (const pool of this.bloodPools) {
      if (pool.graphics && pool.graphics.scene) {
        pool.graphics.destroy();
      }
    }
    this.bloodPools = [];

    this.arterialSpurts = [];

    if (this.floorDecalsGraphics && this.floorDecalsGraphics.scene) {
      this.floorDecalsGraphics.clear();
    }
  }

  public destroy(): void {
    this.resetRound();
    if (this.floorDecalsGraphics) {
      if (this.floorDecalsGraphics.scene) {
        this.floorDecalsGraphics.destroy();
      }
      this.floorDecalsGraphics = null;
    }
  }
}
