import * as Phaser from 'phaser';
import { WarriorSnapshot } from '@last-crown/shared';

export class WarriorRenderer {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private shadowGraphics: Phaser.GameObjects.Graphics;
  private capeGraphics: Phaser.GameObjects.Graphics;
  private bodyGraphics: Phaser.GameObjects.Graphics;
  private weaponGraphics: Phaser.GameObjects.Graphics;
  private auraGraphics: Phaser.GameObjects.Graphics;
  private nameText: Phaser.GameObjects.Text;
  private isPlayer: boolean;
  private floorY: number;

  // Animation clocks
  private animTimer: number = 0;
  private capePoints: { x: number; y: number }[] = [];

  constructor(scene: Phaser.Scene, isPlayer: boolean, floorY: number = 625) {
    this.scene = scene;
    this.isPlayer = isPlayer;
    this.floorY = floorY;

    this.container = this.scene.add.container(0, 0);

    // Floor dynamic ambient shadow
    this.shadowGraphics = this.scene.add.graphics();
    this.container.add(this.shadowGraphics);

    // Flowing royal cape behind character
    this.capeGraphics = this.scene.add.graphics();
    this.container.add(this.capeGraphics);

    // Parry / hit stun aura
    this.auraGraphics = this.scene.add.graphics();
    this.container.add(this.auraGraphics);

    // Articulated warrior body
    this.bodyGraphics = this.scene.add.graphics();
    this.container.add(this.bodyGraphics);

    // Weapon & swing arcs
    this.weaponGraphics = this.scene.add.graphics();
    this.container.add(this.weaponGraphics);

    // Floating heraldic name banner (kept outside the flipped body container so text never mirrors/reverses)
    this.nameText = this.scene.add.text(0, -108, '', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '13px',
      color: isPlayer ? '#f1c40f' : '#e74c3c',
      fontStyle: '800',
      stroke: '#05070a',
      strokeThickness: 3,
      shadow: { offsetX: 0, offsetY: 2, color: '#000000', blur: 4, fill: true, stroke: true },
    });
    this.nameText.setOrigin(0.5);
    this.nameText.setDepth(10);

    // Initialize cape trailing points
    for (let i = 0; i < 5; i++) {
      this.capePoints.push({ x: -16 - i * 4, y: -65 + i * 14 });
    }
  }

  public render(snapshot: WarriorSnapshot, deltaSec: number = 0.016): void {
    // Delta-time normalized animation clock (ensures smooth consistent cape sway, breathing,
    // and aura pulses at 60Hz, 120Hz, 144Hz, and 240Hz)
    this.animTimer += Math.max(0.001, Math.min(deltaSec, 0.1)) * 3.125;
    this.container.setPosition(snapshot.position.x, snapshot.position.y);
    this.nameText.setPosition(snapshot.position.x, snapshot.position.y - 108);
    this.nameText.setText(snapshot.name);

    const facingSign = snapshot.facing === 'right' ? 1 : -1;
    this.container.setScale(facingSign, 1);

    // 1. Shadow Rendering (scales with ground distance)
    this.shadowGraphics.clear();
    const groundDist = Math.max(0, this.floorY - snapshot.position.y);
    const shadowScale = Math.max(0.4, 1 - groundDist / 200);
    const shadowAlpha = Math.max(0.2, 0.5 - groundDist / 300);
    this.shadowGraphics.fillStyle(0x000000, shadowAlpha);
    this.shadowGraphics.fillEllipse(0, 0, 56 * shadowScale, 14 * shadowScale);

    const isDecapitated = !!snapshot.isDecapitated;

    // 2. Aura Rendering (Gold Parry window, Red Hitstun, Pulsing Blue Exhaustion)
    this.auraGraphics.clear();
    if (!isDecapitated) {
      if (snapshot.parryWindowRemainingMs > 0) {
        // Golden divine parry barrier
        const pulse = Math.sin(this.animTimer * 8) * 3;
        this.auraGraphics.lineStyle(3, 0xffd700, 0.9);
        this.auraGraphics.strokeCircle(0, -48, 42 + pulse);
        this.auraGraphics.fillStyle(0xffd700, 0.15);
        this.auraGraphics.fillCircle(0, -48, 42 + pulse);
      } else if (snapshot.hitstunRemainingMs > 0) {
        // Crimson impact shock
        this.auraGraphics.lineStyle(3, 0xff3838, 0.85);
        this.auraGraphics.strokeCircle(0, -48, 38);
      } else if (snapshot.isExhausted) {
        // Posture broken exhaustion haze
        const alpha = 0.3 + Math.sin(this.animTimer * 5) * 0.2;
        this.auraGraphics.lineStyle(2, 0xe74c3c, alpha);
        this.auraGraphics.strokeCircle(0, -48, 36);
      }
    }

    // 3. Flowing Royal Cape Simulation
    this.capeGraphics.clear();
    const capeBaseColor = this.isPlayer ? 0x224488 : 0x881122;
    const capeTrimColor = this.isPlayer ? 0x3366cc : 0xaa2233;

    if (isDecapitated) {
      // Cape draped limply behind collapsed kneeling warrior
      this.capeGraphics.fillStyle(capeBaseColor, 0.9);
      this.capeGraphics.lineStyle(2, capeTrimColor, 0.9);
      this.capeGraphics.beginPath();
      this.capeGraphics.moveTo(-10, -40);
      this.capeGraphics.lineTo(-26, -20);
      this.capeGraphics.lineTo(-30, -4);
      this.capeGraphics.lineTo(-12, -2);
      this.capeGraphics.lineTo(-6, -22);
      this.capeGraphics.closePath();
      this.capeGraphics.fillPath();
      this.capeGraphics.strokePath();
    } else {
      // Simulate wind / velocity sway
      const wind = Math.sin(this.animTimer * 3) * 6 - snapshot.velocity.x * 0.04;
      this.capeGraphics.fillStyle(capeBaseColor, 0.95);
      this.capeGraphics.lineStyle(2, capeTrimColor, 1);
      this.capeGraphics.beginPath();
      this.capeGraphics.moveTo(-12, -70);
      this.capeGraphics.lineTo(-24 + wind * 0.6, -48);
      this.capeGraphics.lineTo(-28 + wind * 1.2, -26);
      this.capeGraphics.lineTo(-24 + wind * 1.5, -8);
      this.capeGraphics.lineTo(-8, -12);
      this.capeGraphics.closePath();
      this.capeGraphics.fillPath();
      this.capeGraphics.strokePath();
    }

    // 4. Character Body & Armor Shading
    this.bodyGraphics.clear();

    const isFlashing = snapshot.hitstunRemainingMs > 120;
    const armorPrimary = isFlashing ? 0xffffff : this.isPlayer ? 0x2c4a8a : 0x9b1b1b;
    const armorSecondary = isFlashing ? 0xffffff : this.isPlayer ? 0x1e3360 : 0x6e1010;
    const steelHighlight = isFlashing ? 0xffffff : 0xecf0f1;
    const steelDark = isFlashing ? 0xdddddd : 0x7f8c8d;
    const goldTrim = isFlashing ? 0xffffff : 0xf1c40f;
    const shadowColor = 0x181e28;

    const breathBob = Math.sin(this.animTimer * 2) * 1.5;
    const torsoY = isDecapitated ? -42 : -68 + breathBob;

    if (isDecapitated) {
      // --- COLLAPSED KNEELING BODY & LEGS ---
      // Kneeling legs folded on stone
      this.bodyGraphics.fillStyle(shadowColor, 1);
      this.bodyGraphics.fillRoundedRect(-18, -16, 26, 16, 3);
      this.bodyGraphics.fillStyle(steelDark, 1);
      this.bodyGraphics.fillRoundedRect(-16, -14, 22, 14, 2);

      this.bodyGraphics.fillStyle(shadowColor, 1);
      this.bodyGraphics.fillRoundedRect(-2, -16, 22, 16, 3);
      this.bodyGraphics.fillStyle(steelHighlight, 1);
      this.bodyGraphics.fillRoundedRect(0, -14, 18, 14, 2);

      // Slumped Torso
      this.bodyGraphics.fillStyle(armorSecondary, 1);
      this.bodyGraphics.fillRoundedRect(-18, torsoY + 22, 36, 12, 3);
      this.bodyGraphics.lineStyle(1.5, goldTrim, 0.9);
      this.bodyGraphics.strokeRoundedRect(-18, torsoY + 22, 36, 12, 3);

      this.bodyGraphics.fillStyle(armorPrimary, 1);
      this.bodyGraphics.fillRoundedRect(-19, torsoY, 38, 26, 4);
      this.bodyGraphics.lineStyle(2, goldTrim, 1);
      this.bodyGraphics.strokeRoundedRect(-19, torsoY, 38, 26, 4);

      // Pauldrons drooping forward
      this.bodyGraphics.fillStyle(steelHighlight, 1);
      this.bodyGraphics.fillRoundedRect(-22, torsoY + 2, 12, 14, 4);
      this.bodyGraphics.fillRoundedRect(10, torsoY + 2, 12, 14, 4);

      // --- VISCERAL SEVERED NECK STUMP ---
      const stumpY = torsoY - 2;
      // Ragged severed flesh contour
      this.bodyGraphics.fillStyle(0x5a0000, 1);
      this.bodyGraphics.fillEllipse(0, stumpY, 20, 9);

      // Raw arterial inner muscle ring
      this.bodyGraphics.fillStyle(0x8a0303, 1);
      this.bodyGraphics.fillEllipse(0, stumpY, 14, 6);

      // Severed cervical spine bone core
      this.bodyGraphics.fillStyle(0xf0eee4, 1);
      this.bodyGraphics.fillCircle(0, stumpY, 3);
      this.bodyGraphics.fillStyle(0x3a0000, 1);
      this.bodyGraphics.fillCircle(0, stumpY, 1.2); // Spinal canal

      // Severed carotid artery spurts / drips
      const spurtPulse = Math.sin(this.animTimer * 12);
      this.bodyGraphics.fillStyle(0xaa0000, 0.95);
      this.bodyGraphics.fillCircle(-4, stumpY - 1 + spurtPulse, 2.5);
      this.bodyGraphics.fillCircle(4, stumpY - 2 - spurtPulse, 2.2);

      // Drips rolling down breastplate
      this.bodyGraphics.fillStyle(0x700000, 0.9);
      this.bodyGraphics.fillRect(-6, torsoY + 4, 2.5, 8);
      this.bodyGraphics.fillRect(2, torsoY + 4, 3, 12);
    } else {
      // Subtle breathing / step oscillation
      const isMoving = Math.abs(snapshot.velocity.x) > 15 && snapshot.isGrounded;
      const walkCycle = isMoving ? Math.sin(this.animTimer * 10) : 0;

      // --- LEGS & GREAVES ---
      const leftLegAngle = walkCycle * 8;
      const rightLegAngle = -walkCycle * 8;

      // Left Greave (Back leg)
      this.bodyGraphics.fillStyle(shadowColor, 1);
      this.bodyGraphics.fillRect(-15 + leftLegAngle * 0.4, -30, 11, 30);
      this.bodyGraphics.fillStyle(steelDark, 1);
      this.bodyGraphics.fillRoundedRect(-14 + leftLegAngle * 0.4, -28, 9, 28, 2);

      // Right Greave (Front leg)
      this.bodyGraphics.fillStyle(shadowColor, 1);
      this.bodyGraphics.fillRect(2 + rightLegAngle * 0.4, -30, 11, 30);
      this.bodyGraphics.fillStyle(steelHighlight, 1);
      this.bodyGraphics.fillRoundedRect(3 + rightLegAngle * 0.4, -28, 9, 28, 2);

      // Sabatons (Iron armored boots)
      this.bodyGraphics.fillStyle(shadowColor, 1);
      this.bodyGraphics.fillRoundedRect(-14 + leftLegAngle * 0.4, -4, 14, 6, 2);
      this.bodyGraphics.fillRoundedRect(3 + rightLegAngle * 0.4, -4, 15, 6, 2);

      // --- TORSO & BREASTPLATE ---
      // Armored Faulds / Tassets (waist guards)
      this.bodyGraphics.fillStyle(armorSecondary, 1);
      this.bodyGraphics.fillRoundedRect(-18, torsoY + 28, 36, 12, 3);
      this.bodyGraphics.lineStyle(1.5, goldTrim, 0.9);
      this.bodyGraphics.strokeRoundedRect(-18, torsoY + 28, 36, 12, 3);

      // Curat / Breastplate (chiseled royal steel plate)
      this.bodyGraphics.fillStyle(armorPrimary, 1);
      this.bodyGraphics.fillRoundedRect(-20, torsoY, 40, 32, 5);
      this.bodyGraphics.lineStyle(2, goldTrim, 1);
      this.bodyGraphics.strokeRoundedRect(-20, torsoY, 40, 32, 5);

      // Breastplate Royal Crest (golden cross heraldry)
      this.bodyGraphics.fillStyle(goldTrim, 1);
      this.bodyGraphics.fillRect(-2, torsoY + 6, 4, 18);
      this.bodyGraphics.fillRect(-8, torsoY + 11, 16, 4);

      // Pauldrons (Flanged shoulder armor plates)
      this.bodyGraphics.fillStyle(steelHighlight, 1);
      this.bodyGraphics.fillRoundedRect(-24, torsoY - 2, 12, 16, 4); // Rear pauldron
      this.bodyGraphics.fillRoundedRect(12, torsoY - 2, 14, 18, 4); // Front pauldron
      this.bodyGraphics.lineStyle(1.5, goldTrim, 1);
      this.bodyGraphics.strokeRoundedRect(12, torsoY - 2, 14, 18, 4);

      // --- GREATHELM (KNIGHT HELMET) ---
      const helmY = torsoY - 22;

      // Helm Dome
      this.bodyGraphics.fillStyle(steelHighlight, 1);
      this.bodyGraphics.fillRoundedRect(-15, helmY, 30, 24, 4);
      this.bodyGraphics.lineStyle(1.5, goldTrim, 0.8);
      this.bodyGraphics.strokeRoundedRect(-15, helmY, 30, 24, 4);

      // T-Slit Visor (Gothic crusader cross visor)
      this.bodyGraphics.fillStyle(0x0c1017, 1);
      this.bodyGraphics.fillRect(-4, helmY + 9, 18, 4); // Horizontal ocular slit
      this.bodyGraphics.fillRect(3, helmY + 7, 4, 13); // Vertical ventilation slit

      // Visor ocular glow
      const glowColor = this.isPlayer ? 0x38ef7d : 0xe74c3c;
      this.bodyGraphics.fillStyle(glowColor, 0.9);
      this.bodyGraphics.fillRect(-1, helmY + 10, 5, 2);

      // Royal Plume / Feathers atop helmet
      const plumeColor = this.isPlayer ? 0xf1c40f : 0xe74c3c;
      this.bodyGraphics.fillStyle(plumeColor, 1);
      const plumeSway = Math.sin(this.animTimer * 4) * 3 - snapshot.velocity.x * 0.02;
      this.bodyGraphics.fillTriangle(-4, helmY, 4, helmY, -8 + plumeSway, helmY - 14);

      // --- HEATER SHIELD (in blocking stance) ---
      if (snapshot.state === 'blocking') {
        const shieldX = 14;
        const shieldY = torsoY + 2;
        // Shield wood/steel base
        this.bodyGraphics.fillStyle(armorPrimary, 1);
        this.bodyGraphics.beginPath();
        this.bodyGraphics.moveTo(shieldX - 8, shieldY - 20);
        this.bodyGraphics.lineTo(shieldX + 16, shieldY - 20);
        this.bodyGraphics.lineTo(shieldX + 16, shieldY + 8);
        this.bodyGraphics.lineTo(shieldX + 4, shieldY + 24);
        this.bodyGraphics.lineTo(shieldX - 8, shieldY + 8);
        this.bodyGraphics.closePath();
        this.bodyGraphics.fillPath();

        // Shield gold rim & boss
        this.bodyGraphics.lineStyle(2.5, goldTrim, 1);
        this.bodyGraphics.strokePath();

        // Golden shield boss center rivet
        this.bodyGraphics.fillStyle(goldTrim, 1);
        this.bodyGraphics.fillCircle(shieldX + 4, shieldY + 2, 5);
      }
    }

    // 5. WEAPON RENDERING & DYNAMIC SWORD ARCS
    this.weaponGraphics.clear();

    if (isDecapitated) {
      // Fallen weapon dropped flat on the flagstone floor
      const droppedX = 16;
      const droppedY = -3;
      this.weaponGraphics.lineStyle(4, steelHighlight, 1);
      this.weaponGraphics.lineBetween(droppedX, droppedY, droppedX + 46, droppedY + 2);
      this.weaponGraphics.lineStyle(2.5, goldTrim, 1);
      this.weaponGraphics.lineBetween(droppedX, droppedY - 6, droppedX, droppedY + 6);
      this.weaponGraphics.fillStyle(goldTrim, 1);
      this.weaponGraphics.fillCircle(droppedX - 3, droppedY, 3);
      return;
    }

    const attackId = snapshot.currentAttackId || '';
    const isHeavy = attackId.includes('heavy');
    const isThrust = attackId.includes('thrust');
    const isCombo2 = attackId.includes('slash_combo_2');
    const isFinisher = attackId.includes('spinning_finisher');
    const isAerial = attackId.includes('aerial');
    const isDashLunge = attackId.includes('dash_lunge');

    let swordAngle = 0.35;
    let swordBaseX = 12;
    let swordBaseY = torsoY + 12;
    const swordBladeLength = isHeavy || isFinisher ? 56 : isAerial ? 52 : 48;

    if (snapshot.attackPhase === 'windup') {
      if (isThrust || isDashLunge) {
        swordAngle = 0.05;
        swordBaseX = -18;
        swordBaseY = torsoY + 8;
      } else if (isCombo2) {
        swordAngle = 1.6;
        swordBaseX = 14;
        swordBaseY = torsoY + 22;
      } else if (isFinisher) {
        swordAngle = -2.2;
        swordBaseX = -16;
        swordBaseY = torsoY - 4;
      } else if (isAerial) {
        swordAngle = -1.55;
        swordBaseX = 8;
        swordBaseY = torsoY - 24;
      } else {
        swordAngle = isHeavy ? -1.5 : -1.35;
        swordBaseX = -14;
        swordBaseY = torsoY - 8;
      }
    } else if (snapshot.attackPhase === 'active') {
      if (isThrust || isDashLunge) {
        swordAngle = 0.0;
        swordBaseX = isDashLunge ? 32 : 26;
        swordBaseY = torsoY + 8;

        // Aerodynamic Pierce Streak
        this.weaponGraphics.lineStyle(isDashLunge ? 7 : 5, 0xffffff, 0.9);
        this.weaponGraphics.lineBetween(
          swordBaseX - 35,
          swordBaseY,
          swordBaseX + swordBladeLength + 16,
          swordBaseY
        );
        this.weaponGraphics.lineStyle(2.5, isDashLunge ? 0x00cec9 : goldTrim, 0.7);
        this.weaponGraphics.strokeCircle(swordBaseX + swordBladeLength, swordBaseY, 10);
      } else if (isCombo2) {
        // Rising Upward Slash Arc
        swordAngle = -0.85;
        swordBaseX = 18;
        swordBaseY = torsoY + 4;

        const arcCenter = { x: swordBaseX, y: swordBaseY };
        this.weaponGraphics.lineStyle(8, 0x00cec9, 0.75);
        this.weaponGraphics.beginPath();
        this.weaponGraphics.arc(arcCenter.x, arcCenter.y, swordBladeLength, 1.6, -0.85, true);
        this.weaponGraphics.strokePath();

        this.weaponGraphics.lineStyle(3, 0xffffff, 0.95);
        this.weaponGraphics.beginPath();
        this.weaponGraphics.arc(arcCenter.x, arcCenter.y, swordBladeLength, 1.4, -0.85, true);
        this.weaponGraphics.strokePath();
      } else if (isFinisher) {
        // Full 360-Degree Whirling Spin
        swordAngle = 1.35;
        swordBaseX = 16;
        swordBaseY = torsoY + 14;

        const arcCenter = { x: 0, y: torsoY + 10 };
        this.weaponGraphics.lineStyle(10, 0xf1c40f, 0.85);
        this.weaponGraphics.strokeCircle(arcCenter.x, arcCenter.y, swordBladeLength + 4);
        this.weaponGraphics.lineStyle(3.5, 0xffffff, 0.95);
        this.weaponGraphics.strokeCircle(arcCenter.x, arcCenter.y, swordBladeLength);
      } else if (isAerial) {
        // Downward Vertical Plunge
        swordAngle = 1.57; // Straight down
        swordBaseX = 14;
        swordBaseY = torsoY + 18;

        // Vertical Speed Trail Lines
        this.weaponGraphics.lineStyle(6, 0xfffa65, 0.85);
        this.weaponGraphics.lineBetween(
          swordBaseX,
          swordBaseY - 40,
          swordBaseX,
          swordBaseY + swordBladeLength + 10
        );
        this.weaponGraphics.lineStyle(2, 0xffffff, 1);
        this.weaponGraphics.lineBetween(
          swordBaseX - 6,
          swordBaseY - 20,
          swordBaseX - 6,
          swordBaseY + swordBladeLength
        );
        this.weaponGraphics.lineBetween(
          swordBaseX + 6,
          swordBaseY - 20,
          swordBaseX + 6,
          swordBaseY + swordBladeLength
        );
      } else {
        swordAngle = 1.45;
        swordBaseX = 18;
        swordBaseY = torsoY + 16;

        // Dynamic Curved Slash Arc Trail
        const arcCenter = { x: swordBaseX - 10, y: swordBaseY - 10 };
        const arcColor = isHeavy ? 0xe74c3c : 0xffffff;
        this.weaponGraphics.lineStyle(isHeavy ? 10 : 7, arcColor, 0.7);
        this.weaponGraphics.beginPath();
        this.weaponGraphics.arc(arcCenter.x, arcCenter.y, swordBladeLength, -0.6, 1.45, false);
        this.weaponGraphics.strokePath();

        // Inner glowing core
        this.weaponGraphics.lineStyle(3, 0xffffff, 0.95);
        this.weaponGraphics.beginPath();
        this.weaponGraphics.arc(arcCenter.x, arcCenter.y, swordBladeLength, -0.4, 1.45, false);
        this.weaponGraphics.strokePath();
      }
    } else if (snapshot.attackPhase === 'recovery') {
      swordAngle = isCombo2 ? -0.4 : isFinisher ? 0.6 : isAerial ? 1.4 : 0.9;
      swordBaseX = 16;
      swordBaseY = torsoY + 14;
    }

    // Blade Drawing
    const swordTipX = swordBaseX + Math.cos(swordAngle) * swordBladeLength;
    const swordTipY = swordBaseY + Math.sin(swordAngle) * swordBladeLength;

    // Glowing Fuller / Edge
    this.weaponGraphics.lineStyle(isHeavy ? 5 : 4, steelHighlight, 1);
    this.weaponGraphics.lineBetween(swordBaseX, swordBaseY, swordTipX, swordTipY);

    // Crossguard
    const guardNormal = swordAngle + Math.PI / 2;
    const guardHalfLen = 9;
    this.weaponGraphics.lineStyle(3, goldTrim, 1);
    this.weaponGraphics.lineBetween(
      swordBaseX - Math.cos(guardNormal) * guardHalfLen,
      swordBaseY - Math.sin(guardNormal) * guardHalfLen,
      swordBaseX + Math.cos(guardNormal) * guardHalfLen,
      swordBaseY + Math.sin(guardNormal) * guardHalfLen
    );

    // Golden Pommel
    this.weaponGraphics.fillStyle(goldTrim, 1);
    this.weaponGraphics.fillCircle(
      swordBaseX - Math.cos(swordAngle) * 6,
      swordBaseY - Math.sin(swordAngle) * 6,
      3.5
    );
  }

  public destroy(): void {
    if (this.nameText && this.nameText.scene) {
      this.nameText.destroy();
    }
    if (this.container && this.container.scene) {
      this.container.destroy();
    }
  }
}
