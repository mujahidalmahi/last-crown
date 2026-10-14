'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import {
  StatisticsManager,
  PlayerStatistics,
  DEFAULT_PLAYER_STATISTICS,
  calculateWinRate,
  formatWinRate,
} from '@last-crown/shared';

const STORAGE_KEY_SETTINGS = 'last_crown_player_settings_v1';

export default function SettingsPage() {
  const [volume, setVolume] = useState(80);
  const [sfxMuted, setSfxMuted] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [botDifficulty, setBotDifficulty] = useState<'novice' | 'adept' | 'master'>('adept');

  const [stats, setStats] = useState<PlayerStatistics>(DEFAULT_PLAYER_STATISTICS);
  const [confirmReset, setConfirmReset] = useState(false);

  // Load persisted settings & stats on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

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
      }
    } catch {
      // localStorage error fallback
    }

    try {
      const currentStats = StatisticsManager.getInstance().getStats();
      setStats(currentStats);
    } catch {
      // ignore
    }
  }, []);

  // Save settings on update
  const persistSettings = (
    updates: Partial<{
      volume: number;
      sfxMuted: boolean;
      highContrast: boolean;
      reducedMotion: boolean;
      botDifficulty: 'novice' | 'adept' | 'master';
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
          ...current,
          ...updates,
        };
        window.localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(merged));
      }
    } catch {
      // ignore
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

  const handleDifficultyChange = (difficulty: 'novice' | 'adept' | 'master') => {
    setBotDifficulty(difficulty);
    persistSettings({ botDifficulty: difficulty });
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
    <div style={{ maxWidth: '840px', margin: '0 auto', padding: '48px 24px', width: '100%' }}>
      <div
        style={{
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Link href="/">
          <Button variant="secondary" size="sm">
            ← Main Hall
          </Button>
        </Link>
        <Badge variant="steel">Preferences & Records</Badge>
      </div>

      <h1
        style={{
          fontSize: '2rem',
          fontWeight: 900,
          color: 'var(--text-gold)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          marginBottom: '8px',
        }}
      >
        Settings & Controls
      </h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>
        Configure procedural audio synthesis, display accessibility, bot AI difficulty, and review
        lifetime combat statistics.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Career Combat Statistics Card */}
        <Card
          header={<h2 style={{ fontSize: '1.2rem', color: '#f1c40f' }}>Lifetime Combat Record</h2>}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: '16px',
              textAlign: 'center',
              marginBottom: '20px',
            }}
          >
            <div
              style={{
                padding: '12px',
                backgroundColor: 'var(--bg-primary)',
                borderRadius: '6px',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div
                style={{
                  fontSize: '0.75rem',
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                }}
              >
                Matches
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--text-primary)' }}>
                {stats.matchesPlayed}
              </div>
            </div>
            <div
              style={{
                padding: '12px',
                backgroundColor: 'var(--bg-primary)',
                borderRadius: '6px',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div
                style={{
                  fontSize: '0.75rem',
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                }}
              >
                Victories
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#2ecc71' }}>
                {stats.wins}
              </div>
            </div>
            <div
              style={{
                padding: '12px',
                backgroundColor: 'var(--bg-primary)',
                borderRadius: '6px',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div
                style={{
                  fontSize: '0.75rem',
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                }}
              >
                Defeats
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#e74c3c' }}>
                {stats.losses}
              </div>
            </div>
            <div
              style={{
                padding: '12px',
                backgroundColor: 'var(--bg-primary)',
                borderRadius: '6px',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div
                style={{
                  fontSize: '0.75rem',
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                }}
              >
                Win Rate
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#f1c40f' }}>
                {formatWinRate(winRate)}
              </div>
            </div>
            <div
              style={{
                padding: '12px',
                backgroundColor: 'var(--bg-primary)',
                borderRadius: '6px',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div
                style={{
                  fontSize: '0.75rem',
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                }}
              >
                Best Streak
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#3498db' }}>
                {stats.bestStreak} 🔥
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
            {confirmReset ? (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: '#e74c3c' }}>
                  Permanently clear career records?
                </span>
                <Button variant="danger" size="sm" onClick={handleResetStats}>
                  Yes, Reset
                </Button>
                <Button variant="secondary" size="sm" onClick={() => setConfirmReset(false)}>
                  Cancel
                </Button>
              </div>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setConfirmReset(true)}>
                🗑️ Reset Combat Statistics
              </Button>
            )}
          </div>
        </Card>

        {/* Bot AI Difficulty */}
        <Card
          header={<h2 style={{ fontSize: '1.2rem', color: '#e67e22' }}>Bot AI Sparring Partner</h2>}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '16px',
            }}
          >
            <div>
              <strong>Bot Combat Difficulty</strong>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Controls opponent reaction latency, parry precision, and tactical retreat behaviors
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              {(['novice', 'adept', 'master'] as const).map(diff => (
                <button
                  key={diff}
                  type="button"
                  onClick={() => handleDifficultyChange(diff)}
                  style={{
                    backgroundColor: botDifficulty === diff ? '#f1c40f' : '#1e272e',
                    color: botDifficulty === diff ? '#070b12' : '#dcdde1',
                    border: '1px solid #485460',
                    borderRadius: '4px',
                    padding: '8px 16px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                  }}
                >
                  {diff}
                </button>
              ))}
            </div>
          </div>
        </Card>

        {/* Audio Settings */}
        <Card header={<h2 style={{ fontSize: '1.2rem', color: '#f1c40f' }}>Sound & Acoustics</h2>}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong>Master Volume</strong>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Controls Web Audio synthesis volume for sword strikes and parries
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={volume}
                  onChange={e => handleVolumeChange(Number(e.target.value))}
                  style={{ accentColor: 'var(--accent-gold)' }}
                />
                <span style={{ minWidth: '40px', fontSize: '0.9rem', color: 'var(--text-gold)' }}>
                  {volume}%
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong>Mute Combat Audio</strong>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Silence all synthesized sounds
                </p>
              </div>
              <input
                type="checkbox"
                checked={sfxMuted}
                onChange={e => handleMuteToggle(e.target.checked)}
                style={{ width: '20px', height: '20px', accentColor: 'var(--accent-gold)' }}
              />
            </div>
          </div>
        </Card>

        {/* Display & Accessibility */}
        <Card
          header={<h2 style={{ fontSize: '1.2rem', color: '#3498db' }}>Display & Accessibility</h2>}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong>High Contrast Mode</strong>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Elevates UI borders and HUD contrast for enhanced visibility
                </p>
              </div>
              <input
                type="checkbox"
                checked={highContrast}
                onChange={e => handleContrastToggle(e.target.checked)}
                style={{ width: '20px', height: '20px', accentColor: 'var(--accent-gold)' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong>Reduced Motion</strong>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Suppresses pulsating screen effects and rapid UI transitions
                </p>
              </div>
              <input
                type="checkbox"
                checked={reducedMotion}
                onChange={e => handleMotionToggle(e.target.checked)}
                style={{ width: '20px', height: '20px', accentColor: 'var(--accent-gold)' }}
              />
            </div>
          </div>
        </Card>

        {/* Controls Table */}
        <Card header={<h2 style={{ fontSize: '1.2rem', color: '#2ecc71' }}>Combat Keybindings</h2>}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left' }}>
                <th style={{ padding: '8px 0', color: 'var(--text-muted)' }}>Action</th>
                <th style={{ padding: '8px 0', color: 'var(--text-muted)' }}>Primary Key</th>
                <th style={{ padding: '8px 0', color: 'var(--text-muted)' }}>Alternative Key</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <td style={{ padding: '10px 0' }}>Move Left / Right</td>
                <td style={{ padding: '10px 0', color: 'var(--text-gold)', fontWeight: 600 }}>
                  A / D
                </td>
                <td style={{ padding: '10px 0', color: 'var(--text-secondary)' }}>
                  Left / Right Arrow
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <td style={{ padding: '10px 0' }}>Jump</td>
                <td style={{ padding: '10px 0', color: 'var(--text-gold)', fontWeight: 600 }}>W</td>
                <td style={{ padding: '10px 0', color: 'var(--text-secondary)' }}>Up Arrow</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <td style={{ padding: '10px 0' }}>Light Slash</td>
                <td style={{ padding: '10px 0', color: '#f39c12', fontWeight: 600 }}>J</td>
                <td style={{ padding: '10px 0', color: 'var(--text-secondary)' }}>Space</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <td style={{ padding: '10px 0' }}>Heavy Strike (Shield Breaker)</td>
                <td style={{ padding: '10px 0', color: '#e74c3c', fontWeight: 600 }}>S + J</td>
                <td style={{ padding: '10px 0', color: 'var(--text-secondary)' }}>
                  Down Arrow + Space
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <td style={{ padding: '10px 0' }}>Forward Thrust</td>
                <td style={{ padding: '10px 0', color: '#9b59b6', fontWeight: 600 }}>U / I</td>
                <td style={{ padding: '10px 0', color: 'var(--text-secondary)' }}>
                  W + J (Air / Forward)
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <td style={{ padding: '10px 0' }}>Guard / Block (75% Absorption)</td>
                <td style={{ padding: '10px 0', color: '#3498db', fontWeight: 600 }}>K</td>
                <td style={{ padding: '10px 0', color: 'var(--text-secondary)' }}>Shift</td>
              </tr>
              <tr>
                <td style={{ padding: '10px 0' }}>Parry (Counter-Stun)</td>
                <td style={{ padding: '10px 0', color: '#f1c40f', fontWeight: 600 }}>L</td>
                <td style={{ padding: '10px 0', color: 'var(--text-secondary)' }}>Alt</td>
              </tr>
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}
