export class SoundManager {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private volume: number = 0.5;

  private boundSettingsListener: (() => void) | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private decapitationTimeout: NodeJS.Timeout | null = null;

  constructor() {
    this.loadSettings();
    if (typeof window !== 'undefined') {
      this.boundSettingsListener = () => this.loadSettings();
      window.addEventListener('storage', this.boundSettingsListener);
      window.addEventListener('last_crown_settings_changed', this.boundSettingsListener);

      const unlock = () => {
        this.unlockAudio();
        window.removeEventListener('pointerdown', unlock);
        window.removeEventListener('keydown', unlock);
      };
      window.addEventListener('pointerdown', unlock, { once: true });
      window.addEventListener('keydown', unlock, { once: true });
    }
  }

  public unlockAudio(): void {
    const ctx = this.initContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    try {
      const buffer = ctx.createBuffer(1, 1, 22050);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start(0);
    } catch {}
  }

  private getNoiseBuffer(ctx: AudioContext): AudioBuffer {
    if (!this.noiseBuffer || this.noiseBuffer.sampleRate !== ctx.sampleRate) {
      const size = Math.floor(ctx.sampleRate * 2);
      this.noiseBuffer = ctx.createBuffer(1, size, ctx.sampleRate);
      const data = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < size; i++) {
        data[i] = Math.random() * 2 - 1;
      }
    }
    return this.noiseBuffer;
  }

  public loadSettings(): void {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem('last_crown_player_settings_v1');
      if (raw) {
        const settings = JSON.parse(raw);
        if (typeof settings.volume === 'number') {
          this.volume = Math.max(0, Math.min(1, settings.volume / 100));
        }
        if (typeof settings.sfxMuted === 'boolean') {
          this.isMuted = settings.sfxMuted;
        }
      }
    } catch {
      // Inaccessible storage fallback
    }
  }

  private initContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
  }

  public setVolume(vol: number): void {
    this.volume = Math.max(0, Math.min(1, vol));
  }

  public playSwordSwing(): void {
    if (this.isMuted || this.volume <= 0) return;
    const ctx = this.initContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(380, now);
      osc.frequency.exponentialRampToValueAtTime(120, now + 0.14);

      gain.gain.setValueAtTime(0.3 * this.volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.15);
    } catch {
      // Audio context error handling
    }
  }

  public playBlockClang(): void {
    if (this.isMuted || this.volume <= 0) return;
    const ctx = this.initContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      [840, 1260].forEach(freq => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(0.4 * this.volume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.2);
      });
    } catch {
      // Audio error handling
    }
  }

  public playParryChime(): void {
    if (this.isMuted || this.volume <= 0) return;
    const ctx = this.initContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      [1400, 1800, 2400].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.02);

        gain.gain.setValueAtTime(0.5 * this.volume, now + idx * 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.02);
        osc.stop(now + 0.5);
      });
    } catch {
      // Audio error handling
    }
  }

  public playHitFlesh(): void {
    if (this.isMuted || this.volume <= 0) return;
    const ctx = this.initContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.2);

      gain.gain.setValueAtTime(0.4 * this.volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.22);
    } catch {
      // Audio error handling
    }
  }

  public playExhaustionBreak(): void {
    if (this.isMuted || this.volume <= 0) return;
    const ctx = this.initContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      [220, 165].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now + idx * 0.05);

        gain.gain.setValueAtTime(0.45 * this.volume, now + idx * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.05);
        osc.stop(now + 0.45);
      });
    } catch {
      // Audio error handling
    }
  }

  public playDecapitationSlash(): void {
    if (this.isMuted || this.volume <= 0) return;
    const ctx = this.initContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;

      // 1. Heavy visceral bone cleave (deep punch)
      const subOsc = ctx.createOscillator();
      const subGain = ctx.createGain();
      subOsc.type = 'sawtooth';
      subOsc.frequency.setValueAtTime(110, now);
      subOsc.frequency.exponentialRampToValueAtTime(25, now + 0.35);

      subGain.gain.setValueAtTime(0.6 * this.volume, now);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      subOsc.connect(subGain);
      subGain.connect(ctx.destination);
      subOsc.start(now);
      subOsc.stop(now + 0.36);

      // 2. High-speed steel blade slice
      const sliceOsc = ctx.createOscillator();
      const sliceGain = ctx.createGain();
      sliceOsc.type = 'triangle';
      sliceOsc.frequency.setValueAtTime(750, now);
      sliceOsc.frequency.exponentialRampToValueAtTime(180, now + 0.22);

      sliceGain.gain.setValueAtTime(0.4 * this.volume, now);
      sliceGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      sliceOsc.connect(sliceGain);
      sliceGain.connect(ctx.destination);
      sliceOsc.start(now);
      sliceOsc.stop(now + 0.23);

      // 3. Wet arterial severing gush
      this.decapitationTimeout = setTimeout(() => this.playBloodGush(), 80);
    } catch {
      // Audio error handling
    }
  }

  public playRiposteCrit(): void {
    if (this.isMuted || this.volume <= 0) return;
    const ctx = this.initContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      // 1. Violent sub-bass boom
      const boomOsc = ctx.createOscillator();
      const boomGain = ctx.createGain();
      boomOsc.type = 'sawtooth';
      boomOsc.frequency.setValueAtTime(120, now);
      boomOsc.frequency.exponentialRampToValueAtTime(30, now + 0.3);

      boomGain.gain.setValueAtTime(0.6 * this.volume, now);
      boomGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

      boomOsc.connect(boomGain);
      boomGain.connect(ctx.destination);
      boomOsc.start(now);
      boomOsc.stop(now + 0.31);

      // 2. High puncture slice
      const stabOsc = ctx.createOscillator();
      const stabGain = ctx.createGain();
      stabOsc.type = 'triangle';
      stabOsc.frequency.setValueAtTime(880, now);
      stabOsc.frequency.exponentialRampToValueAtTime(220, now + 0.15);

      stabGain.gain.setValueAtTime(0.5 * this.volume, now);
      stabGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      stabOsc.connect(stabGain);
      stabGain.connect(ctx.destination);
      stabOsc.start(now);
      stabOsc.stop(now + 0.16);
    } catch {
      // Audio error handling
    }
  }

  public playLowSweep(): void {
    if (this.isMuted || this.volume <= 0) return;
    const ctx = this.initContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(260, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.18);

      gain.gain.setValueAtTime(0.4 * this.volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.19);
    } catch {
      // Audio error handling
    }
  }

  public playBloodGush(): void {
    if (this.isMuted || this.volume <= 0) return;
    const ctx = this.initContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      [160, 120, 90].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now + idx * 0.04);
        osc.frequency.linearRampToValueAtTime(freq * 0.7, now + idx * 0.04 + 0.15);

        gain.gain.setValueAtTime(0.3 * this.volume, now + idx * 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.04 + 0.2);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.04);
        osc.stop(now + idx * 0.04 + 0.21);
      });
    } catch {
      // Audio error handling
    }
  }

  public playHeadThud(): void {
    if (this.isMuted || this.volume <= 0) return;
    const ctx = this.initContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      // Dull metal armor helmet bounce on flagstones
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(280, now);
      osc.frequency.exponentialRampToValueAtTime(70, now + 0.12);

      gain.gain.setValueAtTime(0.4 * this.volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.13);
    } catch {
      // Audio error handling
    }
  }

  public playDashWhoosh(): void {
    if (this.isMuted || this.volume <= 0) return;
    const ctx = this.initContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(360, now + 0.06);
      osc.frequency.exponentialRampToValueAtTime(120, now + 0.12);

      gain.gain.setValueAtTime(0.25 * this.volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.13);
    } catch {
      // Audio error handling
    }
  }

  public playSwordClash(): void {
    if (this.isMuted || this.volume <= 0) return;
    const ctx = this.initContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      // High-frequency dual metal harmonic clash
      [980, 1420, 1850].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.005);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.85, now + 0.28);

        gain.gain.setValueAtTime(0.45 * this.volume, now + idx * 0.005);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.005);
        osc.stop(now + 0.34);
      });
    } catch {
      // Audio error handling
    }
  }

  public playWallBounce(): void {
    if (this.isMuted || this.volume <= 0) return;
    const ctx = this.initContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      // Low heavy masonry impact thud
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(45, now + 0.2);

      gain.gain.setValueAtTime(0.5 * this.volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.22);
    } catch {
      // Audio error handling
    }
  }

  public playGroundSlam(): void {
    if (this.isMuted || this.volume <= 0) return;
    const ctx = this.initContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      // Deep sub-bass floor slam
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(30, now + 0.28);

      gain.gain.setValueAtTime(0.55 * this.volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.3);
    } catch {
      // Audio error handling
    }
  }

  public playComboWhack(comboCount: number): void {
    if (this.isMuted || this.volume <= 0) return;
    const ctx = this.initContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const baseFreq = 160 + Math.min(8, comboCount) * 25;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.4, now + 0.16);

      gain.gain.setValueAtTime(0.4 * this.volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.18);
    } catch {
      // Audio error handling
    }
  }

  public playCounterHit(): void {
    if (this.isMuted || this.volume <= 0) return;
    const ctx = this.initContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      // High-impact punchy counter-hit sound (crunchy square + sub kick)
      const subOsc = ctx.createOscillator();
      const subGain = ctx.createGain();
      subOsc.type = 'triangle';
      subOsc.frequency.setValueAtTime(260, now);
      subOsc.frequency.exponentialRampToValueAtTime(45, now + 0.22);
      subGain.gain.setValueAtTime(0.6 * this.volume, now);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      subOsc.connect(subGain);
      subGain.connect(ctx.destination);
      subOsc.start(now);
      subOsc.stop(now + 0.24);

      // Crunchy harmonic crack
      const crackOsc = ctx.createOscillator();
      const crackGain = ctx.createGain();
      crackOsc.type = 'sawtooth';
      crackOsc.frequency.setValueAtTime(780, now);
      crackOsc.frequency.exponentialRampToValueAtTime(140, now + 0.16);
      crackGain.gain.setValueAtTime(0.45 * this.volume, now);
      crackGain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
      crackOsc.connect(crackGain);
      crackGain.connect(ctx.destination);
      crackOsc.start(now);
      crackOsc.stop(now + 0.18);
    } catch {
      // Audio error handling
    }
  }

  public playFastFallWhoosh(): void {
    if (this.isMuted || this.volume <= 0) return;
    const ctx = this.initContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(420, now);
      osc.frequency.exponentialRampToValueAtTime(110, now + 0.18);
      gain.gain.setValueAtTime(0.35 * this.volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.2);
    } catch {
      // Audio error handling
    }
  }

  public playHeartbeatPulse(): void {
    if (this.isMuted || this.volume <= 0) return;
    const ctx = this.initContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      // Double lub-dub thump
      [0, 0.14].forEach((delay, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        const startFreq = idx === 0 ? 88 : 72;
        osc.frequency.setValueAtTime(startFreq, now + delay);
        osc.frequency.exponentialRampToValueAtTime(32, now + delay + 0.12);
        gain.gain.setValueAtTime(0.4 * this.volume, now + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.12);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + delay);
        osc.stop(now + delay + 0.14);
      });
    } catch {
      // Audio error handling
    }
  }

  public playCrowdCheer(intensity: 'small' | 'roar' = 'small'): void {
    if (this.isMuted || this.volume <= 0) return;
    const ctx = this.initContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const duration = intensity === 'roar' ? 1.6 : 0.8;
      const noise = ctx.createBufferSource();
      noise.buffer = this.getNoiseBuffer(ctx);

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(intensity === 'roar' ? 720 : 540, now);
      filter.Q.setValueAtTime(1.8, now);

      const gain = ctx.createGain();
      const peakVol = (intensity === 'roar' ? 0.35 : 0.18) * this.volume;
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(peakVol, now + 0.18);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      noise.onended = () => {
        try {
          noise.disconnect();
          filter.disconnect();
          gain.disconnect();
        } catch {}
      };

      noise.start(now);
      noise.stop(now + duration);
    } catch {
      // Audio error handling
    }
  }

  public playSuddenDeathGong(): void {
    if (this.isMuted || this.volume <= 0) return;
    const ctx = this.initContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      // Resonant deep brass gong
      [110, 165, 275, 410].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq, now);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.96, now + 2.5);

        const oscGain = (0.35 / (idx + 1)) * this.volume;
        gain.gain.setValueAtTime(oscGain, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.5);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 2.6);
      });
    } catch {
      // Audio error handling
    }
  }

  public destroy(): void {
    if (this.decapitationTimeout) {
      clearTimeout(this.decapitationTimeout);
      this.decapitationTimeout = null;
    }
    if (typeof window !== 'undefined' && this.boundSettingsListener) {
      window.removeEventListener('storage', this.boundSettingsListener);
      window.removeEventListener('last_crown_settings_changed', this.boundSettingsListener);
      this.boundSettingsListener = null;
    }
    if (this.ctx) {
      this.ctx.close().catch(() => {});
      this.ctx = null;
    }
  }
}
