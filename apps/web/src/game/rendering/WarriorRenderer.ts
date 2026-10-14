import * as Phaser from 'phaser';
import { WarriorSnapshot } from '@last-crown/shared';

export class WarriorRenderer {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private bodyGraphics: Phaser.GameObjects.Graphics;
  private weaponGraphics: Phaser.GameObjects.Graphics;
  private auraGraphics: Phaser.GameObjects.Graphics;
  private nameText: Phaser.GameObjects.Text;
  private isPlayer: boolean;

  constructor(scene: Phaser.Scene, isPlayer: boolean) {
    this.scene = scene;
    this.isPlayer = isPlayer;

    this.container = this.scene.add.container(0, 0);

    // Floor shadow
    const shadow = this.scene.add.ellipse(0, 0, 48, 14, 0x000000, 0.4);
    this.container.add(shadow);

    this.auraGraphics = this.scene.add.graphics();
    this.container.add(this.auraGraphics);

    this.bodyGraphics = this.scene.add.graphics();
    this.container.add(this.bodyGraphics);

    this.weaponGraphics = this.scene.add.graphics();
    this.container.add(this.weaponGraphics);

    this.nameText = this.scene.add.text(0, -95, '', {
      fontSize: '12px',
      color: isPlayer ? '#f1c40f' : '#e74c3c',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
    });
    this.nameText.setOrigin(0.5);
    this.container.add(this.nameText);
  }

  public render(snapshot: WarriorSnapshot): void {
    this.container.setPosition(snapshot.position.x, snapshot.position.y);
    this.nameText.setText(snapshot.name);

    const facingSign = snapshot.facing === 'right' ? 1 : -1;
    this.container.setScale(facingSign, 1);

    // Draw aura (parry gold or hitstun red)
    this.auraGraphics.clear();
    if (snapshot.parryWindowRemainingMs > 0) {
      this.auraGraphics.lineStyle(3, 0xffd700, 0.8);
      this.auraGraphics.strokeCircle(0, -42, 38);
    } else if (snapshot.hitstunRemainingMs > 0) {
      this.auraGraphics.lineStyle(2, 0xff3838, 0.7);
      this.auraGraphics.strokeCircle(0, -42, 34);
    }

    // Draw warrior body
    this.bodyGraphics.clear();

    const armorColor = this.isPlayer ? 0x4a69bd : 0xeb2f06;
    const steelColor = 0xdcdde1;
    const goldTrim = 0xf6b93b;

    // Legs / Greaves
    this.bodyGraphics.fillStyle(0x2f3640, 1);
    this.bodyGraphics.fillRect(-14, -28, 10, 28);
    this.bodyGraphics.fillRect(4, -28, 10, 28);

    // Torso / Breastplate
    this.bodyGraphics.fillStyle(armorColor, 1);
    this.bodyGraphics.fillRoundedRect(-18, -64, 36, 38, 4);
    this.bodyGraphics.lineStyle(2, goldTrim, 0.8);
    this.bodyGraphics.strokeRoundedRect(-18, -64, 36, 38, 4);

    // Helmet / Greathelm
    this.bodyGraphics.fillStyle(steelColor, 1);
    this.bodyGraphics.fillRoundedRect(-14, -84, 28, 22, 3);
    // Visor slit
    this.bodyGraphics.fillStyle(0x192a56, 1);
    this.bodyGraphics.fillRect(-6, -75, 16, 4);

    // Shield (if blocking or holding)
    if (snapshot.state === 'blocking') {
      this.bodyGraphics.fillStyle(goldTrim, 1);
      this.bodyGraphics.fillRoundedRect(8, -68, 14, 42, 4);
      this.bodyGraphics.fillStyle(armorColor, 1);
      this.bodyGraphics.fillRect(10, -64, 10, 34);
    }

    // Weapon rendering & animation based on combat phase
    this.weaponGraphics.clear();
    this.weaponGraphics.lineStyle(4, steelColor, 1);

    let swordAngle = 0.3; // resting angle in radians
    let swordBaseX = 10;
    let swordBaseY = -48;
    const swordLength = 46;

    if (snapshot.attackPhase === 'windup') {
      swordAngle = -1.2; // pulled back high
      swordBaseX = -12;
      swordBaseY = -56;
    } else if (snapshot.attackPhase === 'active') {
      swordAngle = 1.35; // swung forward
      swordBaseX = 18;
      swordBaseY = -38;
      // Draw slash trail
      this.weaponGraphics.lineStyle(6, 0xffffff, 0.6);
      this.weaponGraphics.lineBetween(
        swordBaseX,
        swordBaseY - 20,
        swordBaseX + Math.cos(swordAngle) * swordLength,
        swordBaseY + Math.sin(swordAngle) * swordLength
      );
    } else if (snapshot.attackPhase === 'recovery') {
      swordAngle = 0.8;
      swordBaseX = 14;
      swordBaseY = -42;
    }

    // Sword blade
    this.weaponGraphics.lineStyle(4, steelColor, 1);
    const swordTipX = swordBaseX + Math.cos(swordAngle) * swordLength;
    const swordTipY = swordBaseY + Math.sin(swordAngle) * swordLength;
    this.weaponGraphics.lineBetween(swordBaseX, swordBaseY, swordTipX, swordTipY);

    // Sword crossguard & pommel
    this.weaponGraphics.fillStyle(goldTrim, 1);
    this.weaponGraphics.fillCircle(swordBaseX, swordBaseY, 4);
  }

  public destroy(): void {
    this.container.destroy();
  }
}
