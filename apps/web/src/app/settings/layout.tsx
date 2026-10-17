import type { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: 'Game Settings & Controls Guide',
  description:
    'Customize audio volume, sound effects, CRT retro shaders, and view the full combat move list and keybindings for Last Crown.',
  alternates: {
    canonical: '/settings',
  },
  openGraph: {
    title: 'Game Settings & Controls Guide | Last Crown',
    description: 'Customize audio, CRT retro shaders, and view keybindings for Last Crown.',
    url: 'https://last-crown.top/settings',
  },
};

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
