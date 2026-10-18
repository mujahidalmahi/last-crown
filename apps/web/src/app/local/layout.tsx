import type { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: 'Local 2-Player Duel — Phone QR Controllers & Gamepads',
  description:
    'Play Last-Crown 2-player couch multiplayer on one screen! Scan the QR code with any smartphone to use it as a wireless game controller, or connect physical gamepads.',
  alternates: {
    canonical: '/local',
  },
  openGraph: {
    title: 'Local 2-Player Duel — Phone QR Controllers & Gamepads | Last-Crown',
    description:
      'Turn your smartphone into a game controller via QR code and battle your friends on one screen in Last-Crown!',
    url: 'https://last-crown.top/local',
  },
};

import { ForcedLandscapeView } from '../../components/layout/ForcedLandscapeView';

export default function LocalLayout({ children }: { children: React.ReactNode }) {
  return <ForcedLandscapeView>{children}</ForcedLandscapeView>;
}
