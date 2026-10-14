import { PlayerInputMessage } from '@last-crown/shared';

export class KeyboardInputAdapter {
  private keysPressed = new Set<string>();
  private sequence: number = 0;
  private attackBuffer: boolean = false;
  private parryBuffer: boolean = false;
  private onKeyDownHandler: (e: KeyboardEvent) => void;
  private onKeyUpHandler: (e: KeyboardEvent) => void;

  constructor() {
    this.onKeyDownHandler = (e: KeyboardEvent) => {
      // Prevent scrolling on Space and Arrow keys
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }
      this.keysPressed.add(e.code);

      if (e.code === 'KeyJ' || e.code === 'Space') {
        this.attackBuffer = true;
      }
      if (e.code === 'KeyL' || e.code === 'AltLeft' || e.code === 'AltRight') {
        this.parryBuffer = true;
      }
    };

    this.onKeyUpHandler = (e: KeyboardEvent) => {
      this.keysPressed.delete(e.code);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', this.onKeyDownHandler);
      window.addEventListener('keyup', this.onKeyUpHandler);
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

    const parry = this.parryBuffer;
    this.parryBuffer = false;

    return {
      sequence: this.sequence,
      timestamp: Date.now(),
      moveX,
      jump,
      attack,
      attackType: this.keysPressed.has('KeyS') ? 'heavy' : 'light',
      block,
      parry,
    };
  }

  public destroy(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('keydown', this.onKeyDownHandler);
      window.removeEventListener('keyup', this.onKeyUpHandler);
    }
    this.keysPressed.clear();
  }
}
