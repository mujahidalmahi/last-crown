'use client';

import React, { useEffect } from 'react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Unhandled application error:', error);
  }, [error]);

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
      <Card style={{ maxWidth: '560px', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '14px' }}>
          <img
            src="/icon.png"
            alt="Last-Crown Logo"
            width={48}
            height={48}
            style={{ imageRendering: 'pixelated', filter: 'drop-shadow(0 0 10px #ef4444)' }}
          />
        </div>
        <h2
          style={{
            color: '#ef4444',
            fontSize: '1.05rem',
            marginBottom: '16px',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            textShadow:
              '-2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000, 0 3px 0 #000',
          }}
        >
          Combat Anomaly Detected
        </h2>
        <p
          style={{
            color: 'var(--text-secondary)',
            marginBottom: '20px',
            fontSize: '0.62rem',
            lineHeight: 1.8,
            letterSpacing: '0.04em',
          }}
        >
          An unexpected error occurred while executing the simulation:
          <br />
          <code
            style={{
              display: 'inline-block',
              marginTop: '10px',
              padding: '6px 12px',
              backgroundColor: '#070a10',
              border: '2px solid #ef4444',
              borderRadius: '3px',
              fontSize: '0.55rem',
              color: '#fca5a5',
              wordBreak: 'break-word',
            }}
          >
            {error.message || 'Unknown error'}
          </code>
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Button variant="primary" onClick={() => reset()}>
            Retry Match
          </Button>
          <Button variant="outline" onClick={() => (window.location.href = '/')}>
            Return to Hall
          </Button>
        </div>
      </Card>
    </div>
  );
}
