'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';

// Dynamic client-only import with ssr: false ensures Phaser never evaluates in Node SSR
const PhaserGameContainer = dynamic(
  () => import('../../features/game/PhaserGameContainer').then(mod => mod.PhaserGameContainer),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: '#050810',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
          zIndex: 9999,
        }}
      >
        <img
          src="/icon.png"
          alt="Last-Crown Logo"
          width={64}
          height={64}
          style={{ imageRendering: 'pixelated', filter: 'drop-shadow(0 0 12px #f1c40f)' }}
        />
        <p
          style={{
            color: 'var(--text-gold)',
            fontWeight: 800,
            fontSize: '1.2rem',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
          }}
        >
          FORGING THE ARENA...
        </p>
      </div>
    ),
  }
);

function PlayContent() {
  const searchParams = useSearchParams();
  const arena = searchParams.get('arena') || 'coloseum';
  return <PhaserGameContainer mode="singleplayer" arenaId={arena} />;
}

export default function PlayPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            position: 'fixed',
            inset: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: '#050810',
          }}
        />
      }
    >
      <PlayContent />
    </Suspense>
  );
}
