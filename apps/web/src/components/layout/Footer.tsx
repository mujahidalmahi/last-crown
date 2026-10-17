import React from 'react';
import Link from 'next/link';

export const Footer: React.FC = () => {
  return (
    <footer
      style={{
        borderTop: '3px solid #283342',
        padding: '16px 24px',
        textAlign: 'center',
        fontSize: '0.52rem',
        color: '#64748b',
        marginTop: 'auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '10px',
        backgroundColor: '#070a10',
        zIndex: 5,
        fontFamily: "'Press Start 2P', monospace",
        lineHeight: 1.7,
      }}
    >
      <nav
        aria-label="Game quick links"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Link
          href="/"
          style={{
            color: '#94a3b8',
            textDecoration: 'none',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            transition: 'color 0.12s',
          }}
        >
          Home
        </Link>
        <span aria-hidden="true" style={{ color: '#334155' }}>
          •
        </span>
        <Link
          href="/play"
          style={{
            color: '#94a3b8',
            textDecoration: 'none',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            transition: 'color 0.12s',
          }}
        >
          Play vs AI
        </Link>
        <span aria-hidden="true" style={{ color: '#334155' }}>
          •
        </span>
        <Link
          href="/local"
          style={{
            color: '#94a3b8',
            textDecoration: 'none',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            transition: 'color 0.12s',
          }}
        >
          Local 2-Player (Controllers)
        </Link>
        <span aria-hidden="true" style={{ color: '#334155' }}>
          •
        </span>
        <Link
          href="/room"
          style={{
            color: '#94a3b8',
            textDecoration: 'none',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            transition: 'color 0.12s',
          }}
        >
          1v1 Private Room
        </Link>
        <span aria-hidden="true" style={{ color: '#334155' }}>
          •
        </span>
        <Link
          href="/settings"
          style={{
            color: '#94a3b8',
            textDecoration: 'none',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            transition: 'color 0.12s',
          }}
        >
          Controls &amp; Settings
        </Link>
      </nav>
      <p style={{ margin: 0, fontSize: '0.48rem', color: '#475569' }}>
        © 2026 <strong style={{ color: '#f1c40f' }}>LAST CROWN</strong> — Free Retro Pixel-Art
        Browser Fighting Game.
      </p>
    </footer>
  );
};
