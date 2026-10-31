import { PlayerInputMessage, AttackType } from '@last-crown/shared';
import { CONTROLLER_DEFAULTS, matchesBinding } from '@last-crown/game-config';
import { GamepadInputAdapter } from './GamepadInputAdapter';
import { PartyControllerBridge } from './PartyControllerBridge';
import { TouchInputBridge } from './TouchInputBridge';

export class DualPlayerInputManager {
  private gamepadAdapter: GamepadInputAdapter;
  private partyBridge: PartyControllerBridge;
  private keysPressed = new Set<string>();

  // P1 keyboard attack buffers
  private p1LightBuffer = false;
  private p1HeavyBuffer = false;
  private p1ThrustBuffer = false;
  private p1ParryBuffer = false;
  private p1DashBuffer = false;

  // P2 keyboard attack buffers
  private p2LightBuffer = false;
  private p2HeavyBuffer = false;
  private p2ThrustBuffer = false;
  private p2ParryBuffer = false;
  private p2DashBuffer = false;

  private onKeyDownHandler: (e: KeyboardEvent) => void;
  private onKeyUpHandler: (e: KeyboardEvent) => void;
  private onBlurHandler: () => void;

  constructor() {
    this.gamepadAdapter = new GamepadInputAdapter();
    this.partyBridge = PartyControllerBridge.getInstance();

    const { p1, p2, preventScrollKeys } = CONTROLLER_DEFAULTS.dualPlayer;

    this.onKeyDownHandler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      ) {
        return;
      }

      if (preventScrollKeys.includes(e.code)) {
        e.preventDefault();
      }
      this.keysPressed.add(e.code);

      // P1 Keyboard Controls
      if (p1.lightAttack.includes(e.code)) this.p1LightBuffer = true;
      if (p1.heavyAttack.includes(e.code)) this.p1HeavyBuffer = true;
      if (p1.thrust.includes(e.code)) this.p1ThrustBuffer = true;
      if (p1.parry.includes(e.code)) this.p1ParryBuffer = true;
      if (p1.dash.includes(e.code)) this.p1DashBuffer = true;

      // P2 Keyboard Controls
      if (p2.lightAttack.includes(e.code)) this.p2LightBuffer = true;
      if (p2.heavyAttack.includes(e.code)) this.p2HeavyBuffer = true;
      if (p2.thrust.includes(e.code)) this.p2ThrustBuffer = true;
      if (p2.parry.includes(e.code)) this.p2ParryBuffer = true;
      if (p2.dash.includes(e.code)) this.p2DashBuffer = true;
    };

    this.onKeyUpHandler = (e: KeyboardEvent) => {
      this.keysPressed.delete(e.code);
    };

    this.onBlurHandler = () => {
      this.keysPressed.clear();
      this.resetBuffers();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', this.onKeyDownHandler);
      window.addEventListener('keyup', this.onKeyUpHandler);
      window.addEventListener('blur', this.onBlurHandler);
    }
  }

  private resetBuffers(): void {
    this.p1LightBuffer = false;
    this.p1HeavyBuffer = false;
    this.p1ThrustBuffer = false;
    this.p1ParryBuffer = false;
    this.p1DashBuffer = false;

    this.p2LightBuffer = false;
    this.p2HeavyBuffer = false;
    this.p2ThrustBuffer = false;
    this.p2ParryBuffer = false;
    this.p2DashBuffer = false;
  }

  public pollP1(): PlayerInputMessage {
    // 1. Check Gamepad 0 (Physical Controller 1)
    const gp1 = this.gamepadAdapter.pollInput(0);

    // 2. Check Virtual Phone Controller 1
    const phone1 = this.partyBridge.pollP1Input();

    // 3. Check Touch Screen (if host device is a tablet/phone)
    const touch = TouchInputBridge.poll();

    // 4. Resolve P1 Keyboard
    const { p1 } = CONTROLLER_DEFAULTS.dualPlayer;
    let kbMoveX = 0;
    if (matchesBinding(this.keysPressed, p1.moveLeft)) kbMoveX -= 1;
    if (matchesBinding(this.keysPressed, p1.moveRight)) kbMoveX += 1;

    let kbMoveY = 0;
    if (matchesBinding(this.keysPressed, p1.crouch)) kbMoveY += 1;
    if (matchesBinding(this.keysPressed, p1.jump)) kbMoveY -= 1;

    const kbJump = matchesBinding(this.keysPressed, p1.jump);
    const kbBlock = matchesBinding(this.keysPressed, p1.block);
    const kbDash = this.p1DashBuffer;
    this.p1DashBuffer = false;
    const kbParry = this.p1ParryBuffer;
    this.p1ParryBuffer = false;

    let kbAttack = false;
    let kbAttackType: AttackType = 'light';
    if (this.p1HeavyBuffer) {
      kbAttack = true;
      kbAttackType = 'heavy';
      this.p1HeavyBuffer = false;
    } else if (this.p1ThrustBuffer) {
      kbAttack = true;
      kbAttackType = 'thrust';
      this.p1ThrustBuffer = false;
    } else if (this.p1LightBuffer) {
      kbAttack = true;
      if (kbDash) {
        kbAttackType = 'dash';
      } else if (kbMoveY > 0) {
        kbAttackType = 'sweep';
      } else {
        kbAttackType = 'light';
      }
      this.p1LightBuffer = false;
    }

    // Merge sources (Gamepad 0 > Phone 1 > Touch > Keyboard)
    const moveX =
      gp1?.moveX || phone1?.moveX || (touch.moveLeft ? -1 : touch.moveRight ? 1 : 0) || kbMoveX;
    const moveY =
      gp1?.moveY || phone1?.moveY || (touch.moveDown ? 1 : touch.moveUp ? -1 : 0) || kbMoveY;
    const jump = !!(gp1?.jump || phone1?.jump || touch.jump || kbJump);
    const block = !!(gp1?.block || phone1?.block || touch.block || kbBlock);
    const dash = !!(gp1?.dash || phone1?.dash || touch.dashTrigger || kbDash);
    const parry = Boolean(gp1?.parry || phone1?.parry || touch.parryTrigger || kbParry);

    let attack = false;
    let attackType: AttackType = 'light';

    if (gp1?.attack) {
      attack = true;
      attackType = gp1.attackType || 'light';
    } else if (phone1?.attack) {
      attack = true;
      attackType = phone1.attackType || 'light';
    } else if (touch.lightAttackTrigger || touch.heavyAttackTrigger || touch.thrustTrigger) {
      attack = true;
      if (touch.heavyAttackTrigger) attackType = 'heavy';
      else if (touch.thrustTrigger) attackType = 'thrust';
      else attackType = touch.moveDown ? 'sweep' : 'light';
    } else if (kbAttack) {
      attack = true;
      attackType = kbAttackType;
    }

    return {
      sequence: 0,
      timestamp: Date.now(),
      moveX,
      moveY,
      jump,
      attack,
      attackType,
      block,
      parry,
      dash,
    };
  }

  public pollP2(): PlayerInputMessage {
    // 1. Check Gamepad 1 (Physical Controller 2)
    const gp2 = this.gamepadAdapter.pollInput(1);

    // 2. Check Virtual Phone Controller 2
    const phone2 = this.partyBridge.pollP2Input();

    // 3. Resolve P2 Keyboard
    const { p2 } = CONTROLLER_DEFAULTS.dualPlayer;
    let kbMoveX = 0;
    if (matchesBinding(this.keysPressed, p2.moveLeft)) kbMoveX -= 1;
    if (matchesBinding(this.keysPressed, p2.moveRight)) kbMoveX += 1;

    let kbMoveY = 0;
    if (matchesBinding(this.keysPressed, p2.crouch)) kbMoveY += 1;
    if (matchesBinding(this.keysPressed, p2.jump)) kbMoveY -= 1;

    const kbJump = matchesBinding(this.keysPressed, p2.jump);
    const kbBlock = matchesBinding(this.keysPressed, p2.block);
    const kbDash = this.p2DashBuffer;
    this.p2DashBuffer = false;
    const kbParry = this.p2ParryBuffer;
    this.p2ParryBuffer = false;

    let kbAttack = false;
    let kbAttackType: AttackType = 'light';
    if (this.p2HeavyBuffer) {
      kbAttack = true;
      kbAttackType = 'heavy';
      this.p2HeavyBuffer = false;
    } else if (this.p2ThrustBuffer) {
      kbAttack = true;
      kbAttackType = 'thrust';
      this.p2ThrustBuffer = false;
    } else if (this.p2LightBuffer) {
      kbAttack = true;
      if (kbDash) {
        kbAttackType = 'dash';
      } else if (kbMoveY > 0) {
        kbAttackType = 'sweep';
      } else {
        kbAttackType = 'light';
      }
      this.p2LightBuffer = false;
    }

    // Merge sources (Gamepad 1 > Phone 2 > Keyboard P2)
    const moveX = gp2?.moveX || phone2?.moveX || kbMoveX;
    const moveY = gp2?.moveY || phone2?.moveY || kbMoveY;
    const jump = !!(gp2?.jump || phone2?.jump || kbJump);
    const block = !!(gp2?.block || phone2?.block || kbBlock);
    const dash = !!(gp2?.dash || phone2?.dash || kbDash);
    const parry = Boolean(gp2?.parry || phone2?.parry || kbParry);

    let attack = false;
    let attackType: AttackType = 'light';

    if (gp2?.attack) {
      attack = true;
      attackType = gp2.attackType || 'light';
    } else if (phone2?.attack) {
      attack = true;
      attackType = phone2.attackType || 'light';
    } else if (kbAttack) {
      attack = true;
      attackType = kbAttackType;
    }

    return {
      sequence: 0,
      timestamp: Date.now(),
      moveX,
      moveY,
      jump,
      attack,
      attackType,
      block,
      parry,
      dash,
    };
  }

  public vibrateGamepad(gamepadIndex: number, durationMs: number = 100): void {
    this.gamepadAdapter.vibrateGamepad(gamepadIndex, durationMs);
  }

  public hasGamepad(gamepadIndex: number): boolean {
    return this.gamepadAdapter.hasGamepad(gamepadIndex);
  }

  public getConnectedGamepads() {
    return this.gamepadAdapter.getConnectedGamepads();
  }

  public destroy(): void {
    this.gamepadAdapter.destroy();
    if (typeof window !== 'undefined') {
      window.removeEventListener('keydown', this.onKeyDownHandler);
      window.removeEventListener('keyup', this.onKeyUpHandler);
      window.removeEventListener('blur', this.onBlurHandler);
    }
    this.keysPressed.clear();
    this.resetBuffers();
  }
}
