'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';

export default function SettingsPage() {
  const [volume, setVolume] = useState(80);
  const [sfxMuted, setSfxMuted] = useState(false);
  const [highContrast, setHighContrast] = useState(false);

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '48px 24px', width: '100%' }}>
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
        <Badge variant="steel">Preferences</Badge>
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
        Configure procedural audio synthesis, display preferences, and review combat keybindings.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
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
                  onChange={e => setVolume(Number(e.target.value))}
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
                onChange={e => setSfxMuted(e.target.checked)}
                style={{ width: '20px', height: '20px', accentColor: 'var(--accent-gold)' }}
              />
            </div>
          </div>
        </Card>

        {/* Display & Accessibility */}
        <Card
          header={<h2 style={{ fontSize: '1.2rem', color: '#3498db' }}>Display & Accessibility</h2>}
        >
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
              onChange={e => setHighContrast(e.target.checked)}
              style={{ width: '20px', height: '20px', accentColor: 'var(--accent-gold)' }}
            />
          </div>
        </Card>

        {/* Controls Table */}
        <Card header={<h2 style={{ fontSize: '1.2rem', color: '#2ecc71' }}>Keyboard Mappings</h2>}>
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
                <td style={{ padding: '10px 0' }}>Heavy Strike</td>
                <td style={{ padding: '10px 0', color: '#e74c3c', fontWeight: 600 }}>S + J</td>
                <td style={{ padding: '10px 0', color: 'var(--text-secondary)' }}>Down + Space</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <td style={{ padding: '10px 0' }}>Block (75% Absorption)</td>
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
