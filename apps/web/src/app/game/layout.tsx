import type { Metadata } from 'next';
import React from 'react';
import { ForcedLandscapeView } from '../../components/layout/ForcedLandscapeView';

export const metadata: Metadata = {
  title: 'Arena Match — Online Multiplayer Duel',
  description:
    'Experience high-stakes 2D retro sword duels in Last-Crown. Battle opponents in real time with authoritative netcode and voice chat.',
  alternates: {
    canonical: '/game',
  },
  openGraph: {
    title: 'Arena Match — Online Multiplayer Duel | Last-Crown',
    description: 'Real-time online sword duels in Last-Crown. Free to play in your browser.',
    url: 'https://last-crown.top/game',
  },
};

export default function GameLayout({ children }: { children: React.ReactNode }) {
  return <ForcedLandscapeView>{children}</ForcedLandscapeView>;
}
