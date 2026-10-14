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
        minHeight: '60vh',
        padding: '24px',
      }}
    >
      <Card style={{ maxWidth: '520px', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--accent-crimson)', fontSize: '1.75rem', marginBottom: '12px' }}>
          Combat Anomaly Detected
        </h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
          An unexpected error occurred while executing the simulation:
          <br />
          <code style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            {error.message || 'Unknown error'}
          </code>
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
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
