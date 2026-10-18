import type { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: 'Battle AI Warrior — Single Player Duel',
  description:
    'Test your combat reflexes in 1v1 single-player duels against intelligent AI bots in Last-Crown. Master parrying, heavy strikes, and stamina economics across retro pixel-art arenas.',
  alternates: {
    canonical: '/play',
  },
  openGraph: {
    title: 'Battle AI Warrior — Single Player Duel | Last-Crown',
    description: 'Fight intelligent AI bots in retro 2D combat. Free to play in your browser.',
    url: 'https://last-crown.top/play',
  },
};

import { ForcedLandscapeView } from '../../components/layout/ForcedLandscapeView';

export default function PlayLayout({ children }: { children: React.ReactNode }) {
  return <ForcedLandscapeView>{children}</ForcedLandscapeView>;
}
