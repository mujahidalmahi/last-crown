import React from 'react';
import Link from 'next/link';

export const Footer: React.FC = () => {
  return (
    <footer
      style={{
        borderTop: '1px solid var(--border-subtle)',
        padding: '18px 24px',
        textAlign: 'center',
        fontSize: '0.82rem',
        color: 'var(--text-muted)',
        marginTop: 'auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '10px',
        backgroundColor: 'rgba(5, 8, 16, 0.95)',
        zIndex: 5,
      }}
    >
      <nav
        aria-label="Game quick links"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '16px',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Link
          href="/"
          style={{
            color: 'var(--text-secondary)',
            textDecoration: 'none',
            transition: 'color 0.2s',
          }}
        >
          Home
        </Link>
        <span aria-hidden="true" style={{ opacity: 0.4 }}>
          •
        </span>
        <Link
          href="/play"
          style={{
            color: 'var(--text-secondary)',
            textDecoration: 'none',
            transition: 'color 0.2s',
          }}
        >
          Play vs AI
        </Link>
        <span aria-hidden="true" style={{ opacity: 0.4 }}>
          •
        </span>
        <Link
          href="/local"
          style={{
            color: 'var(--text-secondary)',
            textDecoration: 'none',
            transition: 'color 0.2s',
          }}
        >
          Local 2-Player (Controllers)
        </Link>
        <span aria-hidden="true" style={{ opacity: 0.4 }}>
          •
        </span>
        <Link
          href="/room"
          style={{
            color: 'var(--text-secondary)',
            textDecoration: 'none',
            transition: 'color 0.2s',
          }}
        >
          Private 1v1 Room
        </Link>
        <span aria-hidden="true" style={{ opacity: 0.4 }}>
          •
        </span>
        <Link
          href="/settings"
          style={{
            color: 'var(--text-secondary)',
            textDecoration: 'none',
            transition: 'color 0.2s',
          }}
        >
          Controls &amp; Settings
        </Link>
      </nav>
      <p style={{ margin: 0, fontSize: '0.78rem' }}>
        © 2026 <strong>LAST CROWN</strong> — Free Retro Pixel-Art Browser Fighting Game. Powered by
        Next.js, Phaser 3 &amp; Colyseus.
      </p>
    </footer>
  );
};
