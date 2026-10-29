export class SoundManager {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private volume: number = 0.5;

  private boundSettingsListener: (() => void) | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private decapitationTimeout: NodeJS.Timeout | null = null;
  // Procedural BGM Synthesizer engine state
  private bgmGain: GainNode | null = null;
  private bgmFilter: BiquadFilterNode | null = null;
  private bgmIntervalId: ReturnType<typeof setInterval> | null = null;
  private bgmStep: number = 0;
  private isBgmPlaying: boolean = false;
  private isLowHpTension: boolean = false;
  private currentArenaId: string = 'coloseum';


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

  public playHitFlesh(isHeavy: boolean = false): void {
    if (this.isMuted || this.volume <= 0) return;
    const ctx = this.initContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const vol = this.volume * (isHeavy ? 1.25 : 1.0);

      // Layer 1: High transient snap (attack punch definition)
      const snapNoise = ctx.createBufferSource();
      snapNoise.buffer = this.getNoiseBuffer(ctx);
      const snapFilter = ctx.createBiquadFilter();
      snapFilter.type = 'bandpass';
      snapFilter.frequency.setValueAtTime(3200, now);
      snapFilter.Q.setValueAtTime(3.0, now);
      const snapGain = ctx.createGain();
      snapGain.gain.setValueAtTime(0.45 * vol, now);
      snapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);
      snapNoise.connect(snapFilter);
      snapFilter.connect(snapGain);
      snapGain.connect(ctx.destination);
      snapNoise.start(now);
      snapNoise.stop(now + 0.04);

      // Layer 2: Mid-range body crunch (flesh cleave harmonics)
      const midOsc = ctx.createOscillator();
      const midGain = ctx.createGain();
      midOsc.type = 'sawtooth';
      midOsc.frequency.setValueAtTime(isHeavy ? 260 : 180, now);
      midOsc.frequency.exponentialRampToValueAtTime(55, now + (isHeavy ? 0.22 : 0.15));
      midGain.gain.setValueAtTime(0.5 * vol, now);
      midGain.gain.exponentialRampToValueAtTime(0.001, now + (isHeavy ? 0.22 : 0.15));
      midOsc.connect(midGain);
      midGain.connect(ctx.destination);
      midOsc.start(now);
      midOsc.stop(now + (isHeavy ? 0.24 : 0.16));

      // Layer 3: Sub-bass chest punch (physical mass)
      const subOsc = ctx.createOscillator();
      const subGain = ctx.createGain();
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(isHeavy ? 110 : 85, now);
      subOsc.frequency.exponentialRampToValueAtTime(32, now + (isHeavy ? 0.28 : 0.18));
      subGain.gain.setValueAtTime((isHeavy ? 0.6 : 0.45) * vol, now);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + (isHeavy ? 0.28 : 0.18));
      subOsc.connect(subGain);
      subGain.connect(ctx.destination);
      subOsc.start(now);
      subOsc.stop(now + (isHeavy ? 0.3 : 0.2));
    } catch {
      // Audio error handling
    }
  }

  public playCommandThrow(): void {
    if (this.isMuted || this.volume <= 0) return;
    const ctx = this.initContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      // 1. Grapple whoosh & sweep
      const whooshOsc = ctx.createOscillator();
      const whooshGain = ctx.createGain();
      whooshOsc.type = 'triangle';
      whooshOsc.frequency.setValueAtTime(360, now);
      whooshOsc.frequency.exponentialRampToValueAtTime(80, now + 0.14);
      whooshGain.gain.setValueAtTime(0.4 * this.volume, now);
      whooshGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
      whooshOsc.connect(whooshGain);
      whooshGain.connect(ctx.destination);
      whooshOsc.start(now);
      whooshOsc.stop(now + 0.15);

      // 2. Heavy ground impact slam
      const slamTime = now + 0.12;
      const slamOsc = ctx.createOscillator();
      const slamGain = ctx.createGain();
      slamOsc.type = 'sine';
      slamOsc.frequency.setValueAtTime(140, slamTime);
      slamOsc.frequency.exponentialRampToValueAtTime(28, slamTime + 0.26);
      slamGain.gain.setValueAtTime(0.65 * this.volume, slamTime);
      slamGain.gain.exponentialRampToValueAtTime(0.001, slamTime + 0.26);
      slamOsc.connect(slamGain);
      slamGain.connect(ctx.destination);
      slamOsc.start(slamTime);
      slamOsc.stop(slamTime + 0.28);
    } catch {}
  }

  public playTechBreak(): void {
    if (this.isMuted || this.volume <= 0) return;
    const ctx = this.initContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      // High metallic deflection clash
      [1550, 2180].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.01);
        gain.gain.setValueAtTime(0.45 * this.volume, now + idx * 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.01);
        osc.stop(now + 0.25);
      });

      // Deflection shockwave puff
      const noise = ctx.createBufferSource();
      noise.buffer = this.getNoiseBuffer(ctx);
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1800, now);
      filter.Q.setValueAtTime(2.0, now);
      const nGain = ctx.createGain();
      nGain.gain.setValueAtTime(0.4 * this.volume, now);
      nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      noise.connect(filter);
      filter.connect(nGain);
      nGain.connect(ctx.destination);
      noise.start(now);
      noise.stop(now + 0.16);
    } catch {}
  }

  public playCrownBurst(): void {
    if (this.isMuted || this.volume <= 0) return;
    const ctx = this.initContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      // 1. Resonant golden chime triad (ascending fanfare)
      [587.33, 880, 1174.66, 1760].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.02);
        gain.gain.setValueAtTime(0.4 * this.volume, now + idx * 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.02);
        osc.stop(now + 0.65);
      });

      // 2. Massive explosive sub-bass shockwave
      const subOsc = ctx.createOscillator();
      const subGain = ctx.createGain();
      subOsc.type = 'sawtooth';
      subOsc.frequency.setValueAtTime(180, now);
      subOsc.frequency.exponentialRampToValueAtTime(24, now + 0.45);
      subGain.gain.setValueAtTime(0.7 * this.volume, now);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      subOsc.connect(subGain);
      subGain.connect(ctx.destination);
      subOsc.start(now);
      subOsc.stop(now + 0.48);
    } catch {}
  }

  public setTensionMode(active: boolean): void {
    this.isLowHpTension = active;
    if (this.bgmFilter && this.ctx) {
      try {
        const targetFreq = active ? 4500 : 3400;
        this.bgmFilter.frequency.setTargetAtTime(targetFreq, this.ctx.currentTime, 0.1);
      } catch {}
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


  // --- PROCEDURAL DYNAMIC BGM SYNTHESIZER ---

  public startBattleBgm(arenaId: string = 'coloseum'): void {
    if (this.isMuted || this.volume <= 0) return;
    const ctx = this.initContext();
    if (!ctx) return;

    if (this.isBgmPlaying && this.currentArenaId === arenaId) return;
    this.stopBattleBgm();

    this.currentArenaId = arenaId;
    this.isBgmPlaying = true;
    this.bgmStep = 0;

    this.bgmGain = ctx.createGain();
    this.bgmGain.gain.setValueAtTime(0.0001, ctx.currentTime);
    this.bgmGain.gain.linearRampToValueAtTime(0.32 * this.volume, ctx.currentTime + 1.2);

    this.bgmFilter = ctx.createBiquadFilter();
    this.bgmFilter.type = 'lowpass';
    this.bgmFilter.frequency.setValueAtTime(3400, ctx.currentTime);

    this.bgmFilter.connect(this.bgmGain);
    this.bgmGain.connect(ctx.destination);

    const tempoBpm = arenaId === 'dragonland' ? 134 : arenaId === 'stormforce' ? 142 : arenaId === 'seaside' ? 122 : 128;
    const stepIntervalMs = Math.round((60000 / tempoBpm) / 4);

    const defaultScale = [55, 55, 65.4, 73.4, 55, 82.4, 73.4, 65.4];
    const bassScales: Record<string, number[]> = {
      coloseum: defaultScale,
      dragonland: [41.2, 41.2, 49, 55, 41.2, 61.7, 55, 49],
      stormforce: [61.7, 61.7, 73.4, 82.4, 61.7, 92.5, 82.4, 73.4],
      seaside: [49, 49, 58.3, 65.4, 49, 73.4, 65.4, 58.3],
    };
    const scale: number[] = bassScales[arenaId] || defaultScale;

    this.bgmIntervalId = setInterval(() => {
      if (!this.isBgmPlaying || !this.ctx || this.ctx.state === 'suspended') return;
      const t = this.ctx.currentTime;
      const step = this.bgmStep % 16;
      this.bgmStep++;

      try {
        // 1. Kick Drum (Steps 0, 4, 8, 12)
        if (step === 0 || step === 4 || step === 8 || step === 12 || (arenaId === 'dragonland' && step === 14)) {
          const kickOsc = this.ctx.createOscillator();
          const kickGain = this.ctx.createGain();
          kickOsc.type = 'sine';
          kickOsc.frequency.setValueAtTime(140, t);
          kickOsc.frequency.exponentialRampToValueAtTime(38, t + 0.08);

          kickGain.gain.setValueAtTime(0.7, t);
          kickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

          kickOsc.connect(kickGain);
          kickGain.connect(this.bgmFilter!);
          kickOsc.start(t);
          kickOsc.stop(t + 0.13);
        }

        // 2. Snare / Clang (Steps 4, 12)
        if (step === 4 || step === 12) {
          const noiseBuffer = this.getNoiseBuffer(this.ctx);
          const noiseSrc = this.ctx.createBufferSource();
          noiseSrc.buffer = noiseBuffer;
          const snareFilter = this.ctx.createBiquadFilter();
          snareFilter.type = 'bandpass';
          snareFilter.frequency.setValueAtTime(1200, t);
          snareFilter.Q.setValueAtTime(1.5, t);

          const snareGain = this.ctx.createGain();
          snareGain.gain.setValueAtTime(0.35, t);
          snareGain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

          noiseSrc.connect(snareFilter);
          snareFilter.connect(snareGain);
          snareGain.connect(this.bgmFilter!);
          noiseSrc.start(t);
          noiseSrc.stop(t + 0.16);
        }

        // 3. Hi-hat (every offbeat; double-time when in low-HP tension)
        if (this.isLowHpTension || (step % 2 === 0 && (step % 4 !== 0 || arenaId === 'stormforce'))) {
          const noiseBuffer = this.getNoiseBuffer(this.ctx);
          const hatSrc = this.ctx.createBufferSource();
          hatSrc.buffer = noiseBuffer;
          const hatFilter = this.ctx.createBiquadFilter();
          hatFilter.type = 'highpass';
          hatFilter.frequency.setValueAtTime(this.isLowHpTension ? 8500 : 7000, t);

          const hatGain = this.ctx.createGain();
          hatGain.gain.setValueAtTime(this.isLowHpTension ? 0.22 : 0.18, t);
          hatGain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

          hatSrc.connect(hatFilter);
          hatFilter.connect(hatGain);
          hatGain.connect(this.bgmFilter!);
          hatSrc.start(t);
          hatSrc.stop(t + 0.05);
        }

        // 4. Bassline (Arpeggiated Sawtooth Synth)
        const noteIdx = Math.floor(step / 2) % scale.length;
        const rootFreq = scale[noteIdx] ?? 55;
        const bassFreq = rootFreq * (step % 4 === 2 ? 1.5 : 1);
        const bassOsc = this.ctx.createOscillator();
        const bassGain = this.ctx.createGain();
        bassOsc.type = 'sawtooth';
        bassOsc.frequency.setValueAtTime(bassFreq, t);

        bassGain.gain.setValueAtTime(0.28, t);
        bassGain.gain.exponentialRampToValueAtTime(0.01, t + (stepIntervalMs / 1000) * 0.9);

        bassOsc.connect(bassGain);
        bassGain.connect(this.bgmFilter!);
        bassOsc.start(t);
        bassOsc.stop(t + stepIntervalMs / 1000);

        // 5. Heroic Harmonic Chords (on bar roots step 0 and 8)
        if (step === 0 || step === 8) {
          const chordFreqs = [rootFreq * 2, rootFreq * 2.4, rootFreq * 3];
          chordFreqs.forEach((freq, idx) => {
            const chordOsc = this.ctx!.createOscillator();
            const chordGain = this.ctx!.createGain();
            chordOsc.type = 'triangle';
            chordOsc.frequency.setValueAtTime(freq, t);

            chordGain.gain.setValueAtTime(0.12 / (idx + 1), t);
            chordGain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

            chordOsc.connect(chordGain);
            chordGain.connect(this.bgmFilter!);
            chordOsc.start(t);
            chordOsc.stop(t + 0.5);
          });
        }
      } catch {}
    }, stepIntervalMs);
  }

  public stopBattleBgm(): void {
    if (this.bgmIntervalId) {
      clearInterval(this.bgmIntervalId);
      this.bgmIntervalId = null;
    }
    if (this.bgmGain && this.ctx) {
      try {
        this.bgmGain.gain.setValueAtTime(this.bgmGain.gain.value, this.ctx.currentTime);
        this.bgmGain.gain.linearRampToValueAtTime(0.0001, this.ctx.currentTime + 0.3);
      } catch {}
    }
    this.isBgmPlaying = false;
  }

  public applyPauseFilter(paused: boolean): void {
    if (!this.bgmFilter || !this.ctx) return;
    try {
      const targetFreq = paused ? 380 : 3400;
      this.bgmFilter.frequency.setTargetAtTime(targetFreq, this.ctx.currentTime, 0.08);
    } catch {}
  }

  // --- MATCH ANNOUNCER & COMBAT FANFARES ---

  public playRoundStart(_roundNumber: number): void {
    if (this.isMuted || this.volume <= 0) return;
    const ctx = this.initContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const root = 130.81; // C3
      const chord = [root, root * 1.25, root * 1.5, root * 2];
      chord.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now);

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, now);
        filter.frequency.exponentialRampToValueAtTime(2200, now + 0.15);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime((0.28 / (idx + 1)) * this.volume, now + 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.1);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 1.2);
      });
    } catch {}
  }

  public playDuelStart(): void {
    if (this.isMuted || this.volume <= 0) return;
    const ctx = this.initContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      // Dual brass warhorn strike
      [98, 147].forEach(freq => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.12, now + 0.35);

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(500, now);
        filter.frequency.exponentialRampToValueAtTime(1800, now + 0.2);

        gain.gain.setValueAtTime(0.38 * this.volume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.6);
      });
    } catch {}
  }

  public playVictoryFanfare(): void {
    if (this.isMuted || this.volume <= 0) return;
    const ctx = this.initContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      // Royal Fanfare Triad (C4, E4, G4, C5)
      const notes = [261.63, 329.63, 392.0, 523.25];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        const start = now + idx * 0.12;
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(0.35 * this.volume, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + (idx === 3 ? 1.4 : 0.4));

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + (idx === 3 ? 1.5 : 0.45));
      });
    } catch {}
  }

  public playDefeatTone(): void {
    if (this.isMuted || this.volume <= 0) return;
    const ctx = this.initContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      // Sorrowful descending minor chords
      const notes = [220, 196, 174.61, 146.83];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        const start = now + idx * 0.22;
        osc.frequency.setValueAtTime(freq, start);

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(600, start);

        gain.gain.setValueAtTime(0.25 * this.volume, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.6);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.65);
      });
    } catch {}
  }

  // --- FIGHTER VOCALIZATIONS ---

  public playExertionGrunt(): void {
    if (this.isMuted || this.volume <= 0) return;
    const ctx = this.initContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(90, now + 0.12);

      gain.gain.setValueAtTime(0.28 * this.volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.13);
    } catch {}
  }

  public playHurtGrunt(): void {
    if (this.isMuted || this.volume <= 0) return;
    const ctx = this.initContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(240, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.16);

      gain.gain.setValueAtTime(0.35 * this.volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.18);
    } catch {}
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
