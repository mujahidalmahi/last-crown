'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';

// Dynamic client-only import with ssr: false ensures Phaser never evaluates in Node SSR
const PhaserGameContainer = dynamic(
  () => import('../../features/game/PhaserGameContainer').then(mod => mod.PhaserGameContainer),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          width: '100%',
          maxWidth: '1280px',
          aspectRatio: '16 / 9',
          margin: '0 auto',
          backgroundColor: '#070b12',
          borderRadius: '8px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          border: '1px solid var(--border-gold)',
        }}
      >
        <span style={{ fontSize: '2rem' }}>⚔️</span>
        <p style={{ color: 'var(--text-gold)', fontWeight: 700, letterSpacing: '0.1em' }}>
          FORGING THE ARENA...
        </p>
      </div>
    ),
  }
);

export default function PlayPage() {
  return (
    <div style={{ maxWidth: '1320px', margin: '0 auto', padding: '24px 16px', width: '100%' }}>
      {/* Top Controls Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link href="/">
            <Button variant="secondary" size="sm">
              ← Main Hall
            </Button>
          </Link>
          <Badge variant="green">Single-Player (Offline Mode)</Badge>
        </div>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Bastion Courtyard (60 FPS Simulation)
        </span>
      </div>

      {/* Phaser Canvas Container */}
      <PhaserGameContainer mode="singleplayer" />

      {/* Keyboard Controls Bar */}
      <section
        aria-label="Combat Controls Reference"
        style={{
          marginTop: '20px',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '6px',
          padding: '16px 24px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '16px',
          fontSize: '0.9rem',
        }}
      >
        <div>
          <strong style={{ color: 'var(--text-gold)' }}>A / D / Arrows:</strong>
          <p style={{ color: 'var(--text-secondary)' }}>Move Left / Right</p>
        </div>
        <div>
          <strong style={{ color: 'var(--text-gold)' }}>W / Up Arrow:</strong>
          <p style={{ color: 'var(--text-secondary)' }}>Jump</p>
        </div>
        <div>
          <strong style={{ color: '#f39c12' }}>J / Space:</strong>
          <p style={{ color: 'var(--text-secondary)' }}>Light Slash (Fast)</p>
        </div>
        <div>
          <strong style={{ color: '#e74c3c' }}>S + J:</strong>
          <p style={{ color: 'var(--text-secondary)' }}>Heavy Strike (High Stun)</p>
        </div>
        <div>
          <strong style={{ color: '#9b59b6' }}>U / I:</strong>
          <p style={{ color: 'var(--text-secondary)' }}>Forward Thrust (Reach)</p>
        </div>
        <div>
          <strong style={{ color: '#3498db' }}>K / Shift:</strong>
          <p style={{ color: 'var(--text-secondary)' }}>Block (Absorbs 75%)</p>
        </div>
        <div>
          <strong style={{ color: '#f1c40f' }}>L / Alt:</strong>
          <p style={{ color: 'var(--text-secondary)' }}>Parry (150ms Counter-Stun)</p>
        </div>
      </section>
    </div>
  );
}
