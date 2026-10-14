import React from 'react';
import Link from 'next/link';

export const Header: React.FC = () => {
  return (
    <header
      style={{
        borderBottom: '1px solid var(--border-subtle)',
        backgroundColor: 'rgba(18, 22, 31, 0.95)',
        backdropFilter: 'blur(8px)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        padding: '12px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '1.4rem' }}>👑</span>
        <div>
          <span
            style={{
              display: 'block',
              fontSize: '1.25rem',
              fontWeight: 900,
              letterSpacing: '0.15em',
              background: 'linear-gradient(180deg, #f1c40f 0%, #d4af37 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              textTransform: 'uppercase',
              lineHeight: 1,
            }}
          >
            LAST CROWN
          </span>
          <p
            style={{
              fontSize: '0.65rem',
              color: 'var(--text-muted)',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
            }}
          >
            Only One Shall Reign
          </p>
        </div>
      </Link>

      <nav
        aria-label="Main Navigation"
        style={{ display: 'flex', gap: '20px', alignItems: 'center' }}
      >
        <Link
          href="/play"
          style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)' }}
        >
          Battle AI
        </Link>
        <Link
          href="/room"
          style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)' }}
        >
          Private Rooms
        </Link>
        <Link
          href="/settings"
          style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)' }}
        >
          Settings
        </Link>
      </nav>
    </header>
  );
};
