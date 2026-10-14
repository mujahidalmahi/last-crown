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
        minHeight: '60vh',
        padding: '24px',
      }}
    >
      <Card style={{ maxWidth: '480px', textAlign: 'center' }}>
        <h2 style={{ fontSize: '2.5rem', color: 'var(--text-gold)', marginBottom: '8px' }}>404</h2>
        <h3 style={{ fontSize: '1.25rem', marginBottom: '12px' }}>Chamber Not Found</h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
          The castle corridor you seek has collapsed or does not exist in this realm.
        </p>
        <Link href="/">
          <Button variant="primary">Return to Great Hall</Button>
        </Link>
      </Card>
    </div>
  );
}
