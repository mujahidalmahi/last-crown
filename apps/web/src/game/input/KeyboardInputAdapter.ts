import { PlayerInputMessage, AttackType } from '@last-crown/shared';

export class KeyboardInputAdapter {
  private keysPressed = new Set<string>();
  private sequence: number = 0;
  private attackBuffer: boolean = false;
  private thrustTriggered: boolean = false;
  private parryBuffer: boolean = false;
  private dashBuffer: boolean = false;
  private lastTapKey: string = '';
  private lastTapTime: number = 0;
  private onKeyDownHandler: (e: KeyboardEvent) => void;
  private onKeyUpHandler: (e: KeyboardEvent) => void;
  private onBlurHandler: () => void;

  constructor() {
    this.onKeyDownHandler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      ) {
        return;
      }

      // Prevent scrolling on Space, Slash and Arrow keys
      if (
        ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Slash'].includes(
          e.code
        )
      ) {
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

      // Dedicated Dash key (KeyC or KeyE)
      if (e.code === 'KeyC' || e.code === 'KeyE') {
        this.dashBuffer = true;
      }

      if (e.code === 'KeyJ' || e.code === 'Space') {
        this.attackBuffer = true;
      }
      if (e.code === 'KeyU' || e.code === 'KeyI') {
        this.attackBuffer = true;
        this.thrustTriggered = true;
      }
      if (e.code === 'KeyL' || e.code === 'AltLeft' || e.code === 'AltRight') {
        this.parryBuffer = true;
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
      this.attackBuffer = false;
      this.thrustTriggered = false;
      this.parryBuffer = false;
      this.dashBuffer = false;
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', this.onKeyDownHandler);
      window.addEventListener('keyup', this.onKeyUpHandler);
      window.addEventListener('blur', this.onBlurHandler);
    }
  }

  public pollInput(): PlayerInputMessage {
    this.sequence++;

    let moveX = 0;
    if (this.keysPressed.has('KeyA') || this.keysPressed.has('ArrowLeft')) {
      moveX -= 1;
    }
    if (this.keysPressed.has('KeyD') || this.keysPressed.has('ArrowRight')) {
      moveX += 1;
    }

    const jump = this.keysPressed.has('KeyW') || this.keysPressed.has('ArrowUp');

    const block =
      this.keysPressed.has('KeyK') ||
      this.keysPressed.has('ShiftLeft') ||
      this.keysPressed.has('ShiftRight');

    const attack = this.attackBuffer;
    this.attackBuffer = false;

    const dash = this.dashBuffer;
    this.dashBuffer = false;

    let attackType: AttackType = 'light';
    if (dash && attack) {
      attackType = 'dash';
    } else if (
      this.thrustTriggered ||
      this.keysPressed.has('KeyU') ||
      this.keysPressed.has('KeyI')
    ) {
      attackType = 'thrust';
    } else if (this.keysPressed.has('KeyS') || this.keysPressed.has('ArrowDown')) {
      attackType = 'heavy';
    }
    this.thrustTriggered = false;

    const parry = this.parryBuffer;
    this.parryBuffer = false;

    return {
      sequence: this.sequence,
      timestamp: Date.now(),
      moveX,
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
    }
    this.keysPressed.clear();
  }
}
