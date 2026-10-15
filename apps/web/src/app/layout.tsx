import type { Metadata, Viewport } from 'next';
import React from 'react';
import '../styles/globals.css';
import { Footer } from '../components/layout/Footer';
import { SkipLink } from '../components/accessibility/SkipLink';

export const metadata: Metadata = {
  title: 'LAST CROWN — Only One Shall Reign',
  description:
    'A browser-based, 2D medieval sword-fighting game featuring physics movement, parrying, stamina economics, and authoritative multiplayer.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <SkipLink />
        <main id="main-content" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
