import React from 'react';
import Link from 'next/link';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

export default function NotFound() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '70vh',
        padding: '24px',
        fontFamily: "'Press Start 2P', monospace",
      }}
    >
      <Card style={{ maxWidth: '520px', textAlign: 'center' }}>
        <h2
          style={{
            fontSize: '2.5rem',
            color: 'var(--text-gold)',
            marginBottom: '16px',
            textShadow:
              '-3px -3px 0 #000, 3px -3px 0 #000, -3px 3px 0 #000, 3px 3px 0 #000, 0 4px 0 #000',
          }}
        >
          404
        </h2>
        <h3
          style={{
            fontSize: '0.9rem',
            marginBottom: '16px',
            color: '#e2e8f0',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}
        >
          Chamber Not Found
        </h3>
        <p
          style={{
            color: 'var(--text-secondary)',
            marginBottom: '24px',
            fontSize: '0.62rem',
            lineHeight: 1.8,
            letterSpacing: '0.04em',
          }}
        >
          The castle corridor you seek has collapsed or does not exist in this realm.
        </p>
        <Link href="/">
          <Button variant="primary">Return to Great Hall</Button>
        </Link>
      </Card>
    </div>
  );
}
