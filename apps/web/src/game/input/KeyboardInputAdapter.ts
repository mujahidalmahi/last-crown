import { PlayerInputMessage, AttackType } from '@last-crown/shared';
import { TouchInputBridge } from './TouchInputBridge';

export class KeyboardInputAdapter {
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

    this.onKeyDownHandler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      ) {
        return;
      }

      // Prevent scrolling on Space, Slash, and Arrow keys
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Slash'].includes(e.code)) {
        e.preventDefault();
      }
      this.keysPressed.add(e.code);

      const now = Date.now();

      // Double-tap direction detection for tactical evasive dash
      if (['KeyA', 'KeyD', 'ArrowLeft', 'ArrowRight'].includes(e.code) && !e.repeat) {
        if (this.lastTapKey === e.code && now - this.lastTapTime < 250) {
          this.dashBuffer = true;
        }
        this.lastTapKey = e.code;
        this.lastTapTime = now;
      }

      // Dedicated Dash keys: KeyE or KeyC
      if (e.code === 'KeyE' || e.code === 'KeyC') {
        this.dashBuffer = true;
      }

      // Attack Buffer resolution based on active layout preset
      if (e.code === 'KeyJ' || e.code === 'KeyZ') {
        this.lightAttackBuffer = true;
      }

      if (this.controlPreset === 'modern') {
        // Modern Preset: K = Direct Heavy Attack, L = Direct Thrust
        if (e.code === 'KeyK' || e.code === 'KeyX') {
          this.heavyAttackBuffer = true;
        }
        if (e.code === 'KeyL' || e.code === 'KeyU') {
          this.thrustBuffer = true;
        }
        if (
          e.code === 'KeyO' ||
          e.code === 'KeyF' ||
          e.code === 'AltLeft' ||
          e.code === 'AltRight'
        ) {
          this.parryBuffer = true;
        }
      } else {
        // Classic Preset: K = Block, L = Parry, U/I = Thrust, S+J = Heavy
        if (e.code === 'KeyU' || e.code === 'KeyI') {
          this.thrustBuffer = true;
        }
        if (e.code === 'KeyL' || e.code === 'AltLeft' || e.code === 'AltRight') {
          this.parryBuffer = true;
        }
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

    const touch = TouchInputBridge.poll();

    let moveX = 0;
    if (this.keysPressed.has('KeyA') || this.keysPressed.has('ArrowLeft') || touch.moveLeft) {
      moveX -= 1;
    }
    if (this.keysPressed.has('KeyD') || this.keysPressed.has('ArrowRight') || touch.moveRight) {
      moveX += 1;
    }

    let moveY = 0;
    if (this.keysPressed.has('KeyS') || this.keysPressed.has('ArrowDown') || touch.moveDown) {
      moveY += 1;
    }
    if (this.keysPressed.has('KeyW') || this.keysPressed.has('ArrowUp') || touch.moveUp) {
      moveY -= 1;
    }

    // Space is the universal jump standard across all modern PC games!
    // W and ArrowUp are also preserved for player flexibility
    const jump =
      this.keysPressed.has('Space') ||
      this.keysPressed.has('KeyW') ||
      this.keysPressed.has('ArrowUp') ||
      touch.jump ||
      touch.moveUp;

    // Block mapping:
    // Modern: Shift (left/right) or KeyI (home row defense)
    // Classic: KeyK or Shift
    const block =
      this.controlPreset === 'modern'
        ? this.keysPressed.has('KeyI') ||
          this.keysPressed.has('ShiftLeft') ||
          this.keysPressed.has('ShiftRight') ||
          touch.block
        : this.keysPressed.has('KeyK') ||
          this.keysPressed.has('ShiftLeft') ||
          this.keysPressed.has('ShiftRight') ||
          touch.block;

    const dash = this.dashBuffer || touch.dashTrigger;
    this.dashBuffer = false;

    // Resolve attack and attackType cleanly
    let attack = false;
    let attackType: AttackType = 'light';

    if (this.heavyAttackBuffer || touch.heavyAttackTrigger) {
      attack = true;
      attackType = 'heavy';
      this.heavyAttackBuffer = false;
    } else if (this.thrustBuffer || touch.thrustTrigger) {
      attack = true;
      attackType = 'thrust';
      this.thrustBuffer = false;
    } else if (this.lightAttackBuffer || touch.lightAttackTrigger) {
      attack = true;
      if (dash) {
        attackType = 'dash';
      } else if (this.keysPressed.has('KeyS') || this.keysPressed.has('ArrowDown') || touch.moveDown) {
        attackType = this.controlPreset === 'modern' ? 'sweep' : 'heavy';
      } else {
        attackType = 'light';
      }
      this.lightAttackBuffer = false;
    }

    const parry = this.parryBuffer || touch.parryTrigger;
    this.parryBuffer = false;

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
    };
  }

  public destroy(): void {
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
