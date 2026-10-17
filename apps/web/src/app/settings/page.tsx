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
import { requestBrowserFullscreen, isBrowserFullscreen } from '../../utils/fullscreen';
import styles from './settings.module.css';

const STORAGE_KEY_SETTINGS = 'last_crown_player_settings_v1';

export default function SettingsPage() {
  const [volume, setVolume] = useState<number>(80);
  const [sfxMuted, setSfxMuted] = useState<boolean>(false);
  const [highContrast, setHighContrast] = useState<boolean>(false);
  const [reducedMotion, setReducedMotion] = useState<boolean>(false);
  const [botDifficulty, setBotDifficulty] = useState<'novice' | 'adept' | 'master'>('adept');
  const [controlPreset, setControlPreset] = useState<'modern' | 'classic'>('modern');

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
        if (['novice', 'adept', 'master'].includes(parsed.botDifficulty)) {
          setBotDifficulty(parsed.botDifficulty);
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
      botDifficulty: 'novice' | 'adept' | 'master';
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
          botDifficulty,
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

  const handleDifficultyChange = (diff: 'novice' | 'adept' | 'master') => {
    setBotDifficulty(diff);
    persistSettings({ botDifficulty: diff });
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
        <Link href="/" className={styles.mainHallBtn}>
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

          {/* COMPARTMENT 2: Bot AI Sparring Partner */}
          <section className={styles.boxBotAI} aria-label="Bot AI Sparring Partner options">
            <div className={styles.diffGroup}>
              {(['novice', 'adept', 'master'] as const).map(diff => {
                const isActive = botDifficulty === diff;
                return (
                  <button
                    key={diff}
                    type="button"
                    onClick={() => handleDifficultyChange(diff)}
                    className={`${styles.diffToggleBtn} ${isActive ? styles.diffToggleActive : ''}`}
                  >
                    {diff}
                  </button>
                );
              })}
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

          {/* COMPARTMENT 5: Combat Keybindings */}
          <section className={styles.boxKeybindings} aria-label="Combat Keybindings list">
            <div className={styles.keyRow}>
              <span className={styles.keyAction}>Move</span>
              <div>
                <span className={`${styles.keyTag} ${styles.tagOrange}`}>A</span>
                <span className={`${styles.keyTag} ${styles.tagOrange}`}>D</span>
              </div>
            </div>
            <div className={styles.keyRow}>
              <span className={styles.keyAction}>Jump</span>
              <span className={`${styles.keyTag} ${styles.tagYellow}`}>SPACE / W</span>
            </div>
            <div className={styles.keyRow}>
              <span className={styles.keyAction}>Dash</span>
              <span className={`${styles.keyTag} ${styles.tagOrange}`}>C / E</span>
            </div>
            <div className={styles.keyRow}>
              <span className={styles.keyAction}>Slash</span>
              <span className={`${styles.keyTag} ${styles.tagOrange}`}>J</span>
            </div>
            <div className={styles.keyRow}>
              <span className={styles.keyAction}>Low Sweep</span>
              <span className={`${styles.keyTag} ${styles.tagOrange}`}>S + J</span>
            </div>
            <div className={styles.keyRow}>
              <span className={styles.keyAction}>Heavy/Exec</span>
              <span className={`${styles.keyTag} ${styles.tagRed}`}>
                {controlPreset === 'modern' ? 'K' : 'S+J'}
              </span>
            </div>
            <div className={styles.keyRow}>
              <span className={styles.keyAction}>Thrust</span>
              <span className={`${styles.keyTag} ${styles.tagPurple}`}>
                {controlPreset === 'modern' ? 'L / U' : 'U / I'}
              </span>
            </div>
            <div className={styles.keyRow}>
              <span className={styles.keyAction}>Feint</span>
              <span className={`${styles.keyTag} ${styles.tagBlue}`}>WINDUP+DASH</span>
            </div>
            <div className={styles.keyRow}>
              <span className={styles.keyAction}>Guard</span>
              <span className={`${styles.keyTag} ${styles.tagBlue}`}>
                {controlPreset === 'modern' ? 'SHIFT / I' : 'K'}
              </span>
            </div>
            <div className={styles.keyRow}>
              <span className={styles.keyAction}>Parry/Riposte</span>
              <span className={`${styles.keyTag} ${styles.tagYellow}`}>
                {controlPreset === 'modern' ? 'ALT / O' : 'L'}
              </span>
            </div>
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
