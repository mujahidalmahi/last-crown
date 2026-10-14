import React from 'react';
import Link from 'next/link';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';

export default function HomePage() {
  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '48px 24px', width: '100%' }}>
      {/* Hero Section */}
      <section
        style={{
          textAlign: 'center',
          marginBottom: '56px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px',
        }}
      >
        <Badge variant="gold">Production Architecture Foundation</Badge>
        <h1
          style={{
            fontSize: 'clamp(2.5rem, 6vw, 4.5rem)',
            fontWeight: 900,
            letterSpacing: '0.12em',
            background: 'linear-gradient(180deg, #fce072 0%, #d4af37 50%, #996515 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            textTransform: 'uppercase',
            lineHeight: 1.1,
          }}
        >
          LAST CROWN
        </h1>
        <p
          style={{
            fontSize: '1.25rem',
            color: 'var(--text-secondary)',
            letterSpacing: '0.25em',
            textTransform: 'uppercase',
            fontWeight: 500,
          }}
        >
          Only One Shall Reign.
        </p>
        <p
          style={{
            maxWidth: '640px',
            color: 'var(--text-muted)',
            fontSize: '1rem',
            lineHeight: 1.6,
          }}
        >
          A browser-first, 2D medieval sword-fighting game featuring deterministic combat
          simulation, tight parry windows, stamina management, and authoritative multiplayer
          netcode.
        </p>

        <div
          style={{
            display: 'flex',
            gap: '16px',
            flexWrap: 'wrap',
            justifyContent: 'center',
            marginTop: '16px',
          }}
        >
          <Link href="/play">
            <Button variant="primary" size="lg">
              ⚔️ Battle AI Warrior (Offline)
            </Button>
          </Link>
          <Link href="/room">
            <Button variant="outline" size="lg">
              🏰 Private 2-Player Room
            </Button>
          </Link>
          <Link href="/settings">
            <Button variant="secondary" size="lg">
              ⚙️ Controls & Settings
            </Button>
          </Link>
        </div>
      </section>

      {/* Core Architectural Highlights */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '24px',
        }}
      >
        <Card
          header={
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.4rem' }}>🛡️</span>
              <h2 style={{ fontSize: '1.1rem', color: '#f1c40f' }}>Precision Tactical Combat</h2>
            </div>
          }
        >
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.6 }}>
            Deterministic attack phases: <strong>Wind-up</strong>, <strong>Active frames</strong>,
            and <strong>Recovery</strong>. Execute split-second parries within the 150ms window to
            stagger attackers with zero posture damage.
          </p>
        </Card>

        <Card
          header={
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.4rem' }}>⚡</span>
              <h2 style={{ fontSize: '1.1rem', color: '#3498db' }}>Authoritative Netcode</h2>
            </div>
          }
        >
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.6 }}>
            Powered by Colyseus WebSocket rooms with server-authoritative collision verification.
            Zero client trust for hit detection, damage, health, or match results.
          </p>
        </Card>

        <Card
          header={
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.4rem' }}>🎮</span>
              <h2 style={{ fontSize: '1.1rem', color: '#2ecc71' }}>Client-Only Phaser 3</h2>
            </div>
          }
        >
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.6 }}>
            Clean boundary between Next.js App Router and Phaser 3 canvas. Procedural retro-pixel
            art, custom Web Audio synthesis, and 100% offline-playable single-player mode.
          </p>
        </Card>
      </section>
    </div>
  );
}
