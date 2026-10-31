import { PlayerInputMessage, AttackType } from '@last-crown/shared';
import { CONTROLLER_DEFAULTS, matchesBinding } from '@last-crown/game-config';
import { TouchInputBridge } from './TouchInputBridge';
import { GamepadInputAdapter } from './GamepadInputAdapter';

export class KeyboardInputAdapter {
  private gamepadAdapter = new GamepadInputAdapter();
  private keysPressed = new Set<string>();
  private sequence: number = 0;
  private lightAttackBuffer: boolean = false;
  private heavyAttackBuffer: boolean = false;
  private thrustBuffer: boolean = false;
  private parryBuffer: boolean = false;
  private dashBuffer: boolean = false;
  private lastTapKey: string = '';
  private lastTapTime: number = 0;
  private controlPreset: 'modern' | 'classic' = 'modern';

  private onKeyDownHandler: (e: KeyboardEvent) => void;
  private onKeyUpHandler: (e: KeyboardEvent) => void;
  private onBlurHandler: () => void;
  private onSettingsChangedHandler: () => void;

  constructor() {
    this.controlPreset = this.loadControlPreset();
    const kb = CONTROLLER_DEFAULTS.keyboard;

    this.onKeyDownHandler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      ) {
        return;
      }

      // Prevent scrolling on configured navigation keys
      if (kb.preventScrollKeys.includes(e.code)) {
        e.preventDefault();
      }
      this.keysPressed.add(e.code);

      const now = Date.now();

      // Double-tap direction detection for tactical evasive dash
      if (kb.doubleTapDash.enabled && kb.doubleTapDash.keys.includes(e.code) && !e.repeat) {
        if (this.lastTapKey === e.code && now - this.lastTapTime < kb.doubleTapDash.thresholdMs) {
          this.dashBuffer = true;
        }
        this.lastTapKey = e.code;
        this.lastTapTime = now;
      }

      // Dedicated Dash keys
      if (kb.dash.includes(e.code)) {
        this.dashBuffer = true;
      }

      // Attack & Combat Action Buffer resolution
      if (kb.lightAttack.includes(e.code)) {
        this.lightAttackBuffer = true;
      }

      if (kb.heavyAttack.includes(e.code)) {
        this.heavyAttackBuffer = true;
      }

      if (kb.parry.includes(e.code)) {
        this.parryBuffer = true;
      }

      if (kb.thrust.includes(e.code)) {
        this.thrustBuffer = true;
      }
    };

    this.onKeyUpHandler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      ) {
        return;
      }
      this.keysPressed.delete(e.code);
    };

    this.onBlurHandler = () => {
      this.keysPressed.clear();
      this.lightAttackBuffer = false;
      this.heavyAttackBuffer = false;
      this.thrustBuffer = false;
      this.parryBuffer = false;
      this.dashBuffer = false;
    };

    this.onSettingsChangedHandler = () => {
      this.controlPreset = this.loadControlPreset();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', this.onKeyDownHandler);
      window.addEventListener('keyup', this.onKeyUpHandler);
      window.addEventListener('blur', this.onBlurHandler);
      window.addEventListener('last_crown_settings_changed', this.onSettingsChangedHandler);
    }
  }

  private loadControlPreset(): 'modern' | 'classic' {
    if (typeof window === 'undefined') return 'modern';
    try {
      const raw = window.localStorage.getItem('last_crown_player_settings_v1');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.controlPreset === 'classic') return 'classic';
      }
    } catch {
      // ignore
    }
    return 'modern';
  }

  public pollInput(): PlayerInputMessage {
    this.sequence++;
    const kb = CONTROLLER_DEFAULTS.keyboard;

    const touch = TouchInputBridge.poll();
    const gp = this.gamepadAdapter.pollInput(0);

    let moveX = gp?.moveX || 0;
    if (matchesBinding(this.keysPressed, kb.moveLeft) || touch.moveLeft) {
      moveX -= 1;
    }
    if (matchesBinding(this.keysPressed, kb.moveRight) || touch.moveRight) {
      moveX += 1;
    }

    let moveY = gp?.moveY || 0;
    if (matchesBinding(this.keysPressed, kb.crouch) || touch.moveDown) {
      moveY += 1;
    }
    if (matchesBinding(this.keysPressed, kb.jump) || touch.moveUp) {
      moveY -= 1;
    }

    // Space / W / configured keys are evaluated for jump
    const jump =
      matchesBinding(this.keysPressed, kb.jump) || touch.jump || touch.moveUp || !!gp?.jump;

    // Defence / Block mapping
    const block = matchesBinding(this.keysPressed, kb.block) || touch.block || !!gp?.block;

    const dash = this.dashBuffer || touch.dashTrigger || !!gp?.dash;
    this.dashBuffer = false;

    // Resolve attack and attackType cleanly
    let attack = false;
    let attackType: AttackType = 'light';

    if (gp?.attack) {
      attack = true;
      attackType = gp.attackType || 'light';
    } else if (this.heavyAttackBuffer || touch.heavyAttackTrigger) {
      attack = true;
      attackType = 'heavy';
      this.heavyAttackBuffer = false;
    } else if (this.thrustBuffer || touch.thrustTrigger) {
      attack = true;
      attackType = 'thrust';
      this.thrustBuffer = false;
    } else if (touch.sweepTrigger) {
      attack = true;
      attackType = 'sweep';
    } else if (this.lightAttackBuffer || touch.lightAttackTrigger) {
      attack = true;
      if (dash) {
        attackType = 'dash';
      } else if (matchesBinding(this.keysPressed, kb.crouch) || touch.moveDown) {
        attackType = this.controlPreset === 'modern' ? 'sweep' : 'heavy';
      } else {
        attackType = 'light';
      }
      this.lightAttackBuffer = false;
    }

    const parry = Boolean(this.parryBuffer || touch.parryTrigger || gp?.parry);
    this.parryBuffer = false;

    const isThrow = Boolean(matchesBinding(this.keysPressed, kb.throw) || touch.throwTrigger);
    const isBurst = Boolean(matchesBinding(this.keysPressed, kb.burst) || touch.burstTrigger);

    return {
      sequence: this.sequence,
      timestamp: Date.now(),
      moveX,
      moveY,
      jump,
      attack,
      attackType,
      block,
      parry,
      dash,
      throw: isThrow,
      burst: isBurst,
    };
  }

  public destroy(): void {
    this.gamepadAdapter.destroy();
    if (typeof window !== 'undefined') {
      window.removeEventListener('keydown', this.onKeyDownHandler);
      window.removeEventListener('keyup', this.onKeyUpHandler);
      window.removeEventListener('blur', this.onBlurHandler);
      window.removeEventListener('last_crown_settings_changed', this.onSettingsChangedHandler);
    }
    this.keysPressed.clear();
    TouchInputBridge.reset();
  }
}
