import React from 'react';
import Link from 'next/link';

export const Header: React.FC = () => {
  return (
    <header
      style={{
        borderBottom: '3px solid #283342',
        backgroundColor: '#090d16',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        padding: '12px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 4px 14px rgba(0, 0, 0, 0.85)',
        fontFamily: "'Press Start 2P', monospace",
      }}
    >
      <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontSize: '1.4rem', filter: 'drop-shadow(0 0 8px #f1c40f)' }}>👑</span>
        <div>
          <span
            style={{
              display: 'block',
              fontSize: 'clamp(0.85rem, 1.4vw, 1.15rem)',
              fontWeight: 900,
              letterSpacing: '0.12em',
              color: '#f1c40f',
              textShadow:
                '-2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000, 0 3px 0 #000',
              textTransform: 'uppercase',
              lineHeight: 1.2,
            }}
          >
            LAST CROWN
          </span>
          <p
            style={{
              fontSize: '0.5rem',
              color: '#94a3b8',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              margin: '3px 0 0 0',
            }}
          >
            Only One Shall Reign
          </p>
        </div>
      </Link>

      <nav
        aria-label="Main Navigation"
        style={{ display: 'flex', gap: '18px', alignItems: 'center', flexWrap: 'wrap' }}
      >
        <Link
          href="/play"
          style={{
            fontSize: '0.62rem',
            color: '#cbd5e1',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            transition: 'color 0.12s ease',
          }}
        >
          Battle AI
        </Link>
        <Link
          href="/local"
          style={{
            fontSize: '0.62rem',
            color: '#cbd5e1',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            transition: 'color 0.12s ease',
          }}
        >
          Local Duel
        </Link>
        <Link
          href="/room"
          style={{
            fontSize: '0.62rem',
            color: '#cbd5e1',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            transition: 'color 0.12s ease',
          }}
        >
          1v1 Room
        </Link>
        <Link
          href="/settings"
          style={{
            fontSize: '0.62rem',
            color: '#cbd5e1',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            transition: 'color 0.12s ease',
          }}
        >
          Settings
        </Link>
      </nav>
    </header>
  );
};
