'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  StatisticsManager,
  PlayerStatistics,
  DEFAULT_PLAYER_STATISTICS,
  calculateWinRate,
  formatWinRate,
} from '@last-crown/shared';
import { CONTROLLER_DEFAULTS, formatKeyCode } from '@last-crown/game-config';
import { requestBrowserFullscreen, isBrowserFullscreen } from '../../utils/fullscreen';
import styles from './settings.module.css';

const STORAGE_KEY_SETTINGS = 'last_crown_player_settings_v1';

export default function SettingsPage() {
  const [volume, setVolume] = useState<number>(80);
  const [sfxMuted, setSfxMuted] = useState<boolean>(false);
  const [highContrast, setHighContrast] = useState<boolean>(false);
  const [reducedMotion, setReducedMotion] = useState<boolean>(false);
  const [controlPreset, setControlPreset] = useState<'modern' | 'classic'>('modern');
  const [controlView, setControlView] = useState<'touch' | 'desktop'>('desktop');

  const [stats, setStats] = useState<PlayerStatistics>(DEFAULT_PLAYER_STATISTICS);
  const [confirmReset, setConfirmReset] = useState<boolean>(false);

  // Load persisted settings & statistics on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      if (!isBrowserFullscreen()) {
        requestBrowserFullscreen();
      }
    } catch {
      // Handled gracefully
    }

    try {
      const hasTouch =
        (navigator.maxTouchPoints > 0 &&
          window.matchMedia &&
          window.matchMedia('(pointer: coarse)').matches) ||
        ('ontouchstart' in window &&
          window.matchMedia &&
          window.matchMedia('(hover: none)').matches) ||
        (window.innerWidth <= 1024 && 'ontouchstart' in window);
      if (hasTouch) {
        setControlView('touch');
      }
    } catch {
      // Handled gracefully
    }

    try {
      const rawSettings = window.localStorage.getItem(STORAGE_KEY_SETTINGS);
      if (rawSettings) {
        const parsed = JSON.parse(rawSettings);
        if (typeof parsed.volume === 'number') setVolume(parsed.volume);
        if (typeof parsed.sfxMuted === 'boolean') setSfxMuted(parsed.sfxMuted);
        if (typeof parsed.highContrast === 'boolean') {
          setHighContrast(parsed.highContrast);
          document.body.classList.toggle('high-contrast', parsed.highContrast);
        }
        if (typeof parsed.reducedMotion === 'boolean') {
          setReducedMotion(parsed.reducedMotion);
          document.body.classList.toggle('reduced-motion', parsed.reducedMotion);
        }
        if (['modern', 'classic'].includes(parsed.controlPreset)) {
          setControlPreset(parsed.controlPreset);
        }
      }
    } catch {
      // Fallback
    }

    try {
      const currentStats = StatisticsManager.getInstance().getStats();
      setStats(currentStats);
    } catch {
      // Fallback
    }
  }, []);

  const persistSettings = (
    updates: Partial<{
      volume: number;
      sfxMuted: boolean;
      highContrast: boolean;
      reducedMotion: boolean;
      botDifficulty: 'novice' | 'adept' | 'expert' | 'master';
      controlPreset: 'modern' | 'classic';
    }>
  ) => {
    try {
      if (typeof window !== 'undefined') {
        const raw = window.localStorage.getItem(STORAGE_KEY_SETTINGS);
        const current = raw ? JSON.parse(raw) : {};
        const merged = {
          volume,
          sfxMuted,
          highContrast,
          reducedMotion,
          controlPreset,
          ...current,
          ...updates,
        };
        window.localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(merged));
        window.dispatchEvent(new Event('last_crown_settings_changed'));
      }
    } catch {
      // Fallback
    }
  };

  const handleVolumeChange = (newVal: number) => {
    setVolume(newVal);
    persistSettings({ volume: newVal });
  };

  const handleMuteToggle = (muted: boolean) => {
    setSfxMuted(muted);
    persistSettings({ sfxMuted: muted });
  };

  const handleContrastToggle = (checked: boolean) => {
    setHighContrast(checked);
    if (typeof document !== 'undefined') {
      document.body.classList.toggle('high-contrast', checked);
    }
    persistSettings({ highContrast: checked });
  };

  const handleMotionToggle = (checked: boolean) => {
    setReducedMotion(checked);
    if (typeof document !== 'undefined') {
      document.body.classList.toggle('reduced-motion', checked);
    }
    persistSettings({ reducedMotion: checked });
  };

  const handlePresetChange = (preset: 'modern' | 'classic') => {
    setControlPreset(preset);
    persistSettings({ controlPreset: preset });
  };

  const handleResetStats = () => {
    try {
      const resetData = StatisticsManager.getInstance().resetStats();
      setStats(resetData);
      setConfirmReset(false);
    } catch {
      // ignore
    }
  };

  const winRate = calculateWinRate(stats);

  return (
    <div className={styles.viewport}>
      {/* Subtle CRT Scanline Filter */}
      <div className={styles.scanlineOverlay} aria-hidden="true" />

      {/* Top Floating Bar: MAIN HALL on left, PREFERENCES on right */}
      <header className={styles.topNav} aria-label="Settings navigation">
        <Link href="/game" className={styles.mainHallBtn}>
          <span>←</span> MAIN HALL
        </Link>
        <div className={styles.prefBadge}>PREFERENCES &amp; RECORDS</div>
      </header>

      {/* Center 16:9 Stage containing the requested Stone Card */}
      <main className={styles.stageWrapper} role="main" aria-label="Settings and Controls">
        <div className={styles.stoneCard}>
          {/* COMPARTMENT 1: Lifetime Combat Record */}
          <section className={styles.boxCombatRecord} aria-label="Lifetime Combat Record stats">
            <div className={styles.statsRow}>
              <div className={styles.miniStat}>
                <span className={styles.miniStatLabel}>MATCH</span>
                <span className={`${styles.miniStatValue} ${styles.valMatches}`}>
                  {stats.matchesPlayed}
                </span>
              </div>
              <div className={styles.miniStat}>
                <span className={styles.miniStatLabel}>WIN</span>
                <span className={`${styles.miniStatValue} ${styles.valWins}`}>{stats.wins}</span>
              </div>
              <div className={styles.miniStat}>
                <span className={styles.miniStatLabel}>LOSS</span>
                <span className={`${styles.miniStatValue} ${styles.valLosses}`}>
                  {stats.losses}
                </span>
              </div>
              <div className={styles.miniStat}>
                <span className={styles.miniStatLabel}>WIN%</span>
                <span className={`${styles.miniStatValue} ${styles.valRate}`}>
                  {formatWinRate(winRate)}
                </span>
              </div>
              <div className={styles.miniStat}>
                <span className={styles.miniStatLabel}>STREAK</span>
                <span className={`${styles.miniStatValue} ${styles.valStreak}`}>
                  {stats.bestStreak}🔥
                </span>
              </div>
            </div>

            <div className={styles.resetRow}>
              {confirmReset ? (
                <div className={styles.resetConfirmRow}>
                  <button
                    type="button"
                    onClick={handleResetStats}
                    className={styles.resetConfirmBtn}
                  >
                    CONFIRM?
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmReset(false)}
                    className={styles.resetCancelBtn}
                  >
                    NO
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmReset(true)}
                  className={styles.miniResetBtn}
                  title="Reset career combat record"
                >
                  RESET
                </button>
              )}
            </div>
          </section>

          {/* COMPARTMENT 3: Sound & Acoustics */}
          <section className={styles.boxSound} aria-label="Sound & Acoustics options">
            <div>
              <div className={styles.itemLabel}>MASTER VOLUME</div>
              <div className={styles.sliderRow}>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={volume}
                  onChange={e => handleVolumeChange(Number(e.target.value))}
                  className={styles.pixelSlider}
                  aria-label="Master volume"
                />
                <span className={styles.sliderValText}>{volume}%</span>
              </div>
            </div>

            <div
              className={styles.checkboxRow}
              onClick={() => handleMuteToggle(!sfxMuted)}
              role="checkbox"
              aria-checked={sfxMuted}
              tabIndex={0}
              onKeyDown={e => {
                if (e.key === ' ' || e.key === 'Enter') {
                  e.preventDefault();
                  handleMuteToggle(!sfxMuted);
                }
              }}
            >
              <div className={`${styles.pixelBox} ${sfxMuted ? styles.pixelBoxChecked : ''}`}>
                {sfxMuted && <span className={styles.pixelCheckTick}>■</span>}
              </div>
              <span className={styles.itemLabel} style={{ margin: 0 }}>
                MUTE COMBAT AUDIO
              </span>
            </div>
          </section>

          {/* COMPARTMENT 4: Display & Accessibility */}
          <section className={styles.boxDisplay} aria-label="Display & Accessibility options">
            <div
              className={styles.checkboxRow}
              onClick={() => handleContrastToggle(!highContrast)}
              role="checkbox"
              aria-checked={highContrast}
              tabIndex={0}
              onKeyDown={e => {
                if (e.key === ' ' || e.key === 'Enter') {
                  e.preventDefault();
                  handleContrastToggle(!highContrast);
                }
              }}
            >
              <div className={`${styles.pixelBox} ${highContrast ? styles.pixelBoxChecked : ''}`}>
                {highContrast && <span className={styles.pixelCheckTick}>■</span>}
              </div>
              <span className={styles.itemLabel} style={{ margin: 0 }}>
                HIGH CONTRAST
              </span>
            </div>

            <div
              className={styles.checkboxRow}
              onClick={() => handleMotionToggle(!reducedMotion)}
              role="checkbox"
              aria-checked={reducedMotion}
              tabIndex={0}
              onKeyDown={e => {
                if (e.key === ' ' || e.key === 'Enter') {
                  e.preventDefault();
                  handleMotionToggle(!reducedMotion);
                }
              }}
            >
              <div className={`${styles.pixelBox} ${reducedMotion ? styles.pixelBoxChecked : ''}`}>
                {reducedMotion && <span className={styles.pixelCheckTick}>■</span>}
              </div>
              <span className={styles.itemLabel} style={{ margin: 0 }}>
                REDUCED MOTION
              </span>
            </div>

            <div
              className={styles.checkboxRow}
              onClick={() => handlePresetChange(controlPreset === 'modern' ? 'classic' : 'modern')}
              role="button"
              tabIndex={0}
              title="Toggle between Modern Fighting (Space Jump, dedicated execution strikes) and Classic Arcade"
              onKeyDown={e => {
                if (e.key === ' ' || e.key === 'Enter') {
                  e.preventDefault();
                  handlePresetChange(controlPreset === 'modern' ? 'classic' : 'modern');
                }
              }}
            >
              <div
                className={`${styles.pixelBox} ${
                  controlPreset === 'modern' ? styles.pixelBoxChecked : ''
                }`}
              >
                {controlPreset === 'modern' && <span className={styles.pixelCheckTick}>■</span>}
              </div>
              <span className={styles.itemLabel} style={{ margin: 0 }}>
                {controlPreset === 'modern' ? 'MODERN CONTROLS' : 'CLASSIC CONTROLS'}
              </span>
            </div>
          </section>

          {/* COMPARTMENT 5: Combat Controls & Keybindings */}
          <section
            className={styles.boxKeybindings}
            aria-label="Combat Controls and Keybindings list"
          >
            <div className={styles.controlSwitcherRow}>
              <button
                type="button"
                onClick={() => setControlView('touch')}
                className={`${styles.switcherBtn} ${controlView === 'touch' ? styles.switcherBtnActive : ''}`}
                title="View mobile touch controls"
              >
                📱 TOUCH
              </button>
              <button
                type="button"
                onClick={() => setControlView('desktop')}
                className={`${styles.switcherBtn} ${controlView === 'desktop' ? styles.switcherBtnActive : ''}`}
                title="View desktop keyboard keybindings"
              >
                ⌨️ KEYS
              </button>
            </div>

            {controlView === 'touch' ? (
              <>
                <div className={styles.keyRow}>
                  <span className={styles.keyAction}>Move</span>
                  <div>
                    <span className={`${styles.keyTag} ${styles.tagOrange}`}>◀</span>
                    <span className={`${styles.keyTag} ${styles.tagOrange}`}>▶</span>
                  </div>
                </div>
                <div className={styles.keyRow}>
                  <span className={styles.keyAction}>Jump</span>
                  <span className={`${styles.keyTag} ${styles.tagGreen}`}>↑ JUMP</span>
                </div>
                <div className={styles.keyRow}>
                  <span className={styles.keyAction}>Auto Jump</span>
                  <span className={`${styles.keyTag} ${styles.tagYellow}`}>⚡ AUTO</span>
                </div>
                <div className={styles.keyRow}>
                  <span className={styles.keyAction}>Dash</span>
                  <span className={`${styles.keyTag} ${styles.tagBlue}`}>» DASH</span>
                </div>
                <div className={styles.keyRow}>
                  <span className={styles.keyAction}>Slash</span>
                  <span className={`${styles.keyTag} ${styles.tagOrange}`}>† LIGHT</span>
                </div>
                <div className={styles.keyRow}>
                  <span className={styles.keyAction}>Heavy</span>
                  <span className={`${styles.keyTag} ${styles.tagRed}`}>★ HEAVY</span>
                </div>
                <div className={styles.keyRow}>
                  <span className={styles.keyAction}>Defence</span>
                  <span className={`${styles.keyTag} ${styles.tagBlue}`}>▣ BLOCK</span>
                </div>
                <div className={styles.keyRow}>
                  <span className={styles.keyAction}>Parry</span>
                  <span className={`${styles.keyTag} ${styles.tagPurple}`}>◈ PARRY</span>
                </div>
                <div className={styles.keyRow}>
                  <span className={styles.keyAction}>Pause</span>
                  <span className={`${styles.keyTag} ${styles.tagYellow}`}>⏸ PAUSE</span>
                </div>
              </>
            ) : (
              <>
                <div className={styles.keyRow}>
                  <span className={styles.keyAction}>Move</span>
                  <div>
                    {CONTROLLER_DEFAULTS.keyboard.moveLeft.slice(0, 1).map(k => (
                      <span key={k} className={`${styles.keyTag} ${styles.tagOrange}`}>
                        {formatKeyCode(k)}
                      </span>
                    ))}
                    {CONTROLLER_DEFAULTS.keyboard.moveRight.slice(0, 1).map(k => (
                      <span key={k} className={`${styles.keyTag} ${styles.tagOrange}`}>
                        {formatKeyCode(k)}
                      </span>
                    ))}
                  </div>
                </div>
                <div className={styles.keyRow}>
                  <span className={styles.keyAction}>Jump</span>
                  <span className={`${styles.keyTag} ${styles.tagYellow}`}>
                    {CONTROLLER_DEFAULTS.keyboard.jump.slice(0, 2).map(formatKeyCode).join(' / ')}
                  </span>
                </div>
                <div className={styles.keyRow}>
                  <span className={styles.keyAction}>Dash</span>
                  <span className={`${styles.keyTag} ${styles.tagOrange}`}>
                    {CONTROLLER_DEFAULTS.keyboard.dash.map(formatKeyCode).join(' / ')}
                  </span>
                </div>
                <div className={styles.keyRow}>
                  <span className={styles.keyAction}>Slash</span>
                  <span className={`${styles.keyTag} ${styles.tagOrange}`}>
                    {CONTROLLER_DEFAULTS.keyboard.lightAttack
                      .slice(0, 1)
                      .map(formatKeyCode)
                      .join(' / ')}
                  </span>
                </div>
                <div className={styles.keyRow}>
                  <span className={styles.keyAction}>Low Sweep</span>
                  <span className={`${styles.keyTag} ${styles.tagOrange}`}>
                    {formatKeyCode(CONTROLLER_DEFAULTS.keyboard.crouch[0] || 'KeyS')} +{' '}
                    {formatKeyCode(CONTROLLER_DEFAULTS.keyboard.lightAttack[0] || 'KeyJ')}
                  </span>
                </div>
                <div className={styles.keyRow}>
                  <span className={styles.keyAction}>Heavy</span>
                  <span className={`${styles.keyTag} ${styles.tagRed}`}>
                    {CONTROLLER_DEFAULTS.keyboard.heavyAttack
                      .slice(0, 1)
                      .map(formatKeyCode)
                      .join(' / ')}
                  </span>
                </div>
                <div className={styles.keyRow}>
                  <span className={styles.keyAction}>Thrust</span>
                  <span className={`${styles.keyTag} ${styles.tagPurple}`}>
                    {CONTROLLER_DEFAULTS.keyboard.thrust.slice(0, 1).map(formatKeyCode).join(' / ')}
                  </span>
                </div>
                <div className={styles.keyRow}>
                  <span className={styles.keyAction}>Feint</span>
                  <span className={`${styles.keyTag} ${styles.tagBlue}`}>WINDUP+DASH</span>
                </div>
                <div className={styles.keyRow}>
                  <span className={styles.keyAction}>Defence</span>
                  <span className={`${styles.keyTag} ${styles.tagBlue}`}>
                    {CONTROLLER_DEFAULTS.keyboard.block.slice(0, 1).map(formatKeyCode).join(' / ')}
                  </span>
                </div>
                <div className={styles.keyRow}>
                  <span className={styles.keyAction}>Parry</span>
                  <span className={`${styles.keyTag} ${styles.tagYellow}`}>
                    {CONTROLLER_DEFAULTS.keyboard.parry.slice(0, 1).map(formatKeyCode).join(' / ')}
                  </span>
                </div>
                <div className={styles.keyRow}>
                  <span className={styles.keyAction}>Pause</span>
                  <span className={`${styles.keyTag} ${styles.tagYellow}`}>P</span>
                </div>
              </>
            )}
          </section>
        </div>
      </main>

      {/* Tiny Footer */}
      <footer className={styles.footerText}>
        LAST-CROWN v1.0.0 • 2D RETRO DUEL SIMULATION • © 2026 LAST-CROWN
      </footer>
    </div>
  );
}
