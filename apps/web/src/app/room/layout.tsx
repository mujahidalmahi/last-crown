import type { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: 'Private 1v1 Room — Online Multiplayer & Voice Chat',
  description:
    'Host or join private 6-character room codes in Last-Crown for real-time 1v1 online sword combat with built-in low-latency WebRTC voice chat and anti-cheat netcode.',
  alternates: {
    canonical: '/room',
  },
  openGraph: {
    title: 'Private 1v1 Room — Online Multiplayer & Voice Chat | Last-Crown',
    description:
      'Challenge your friends online with private rooms and real-time voice chat in Last-Crown.',
    url: 'https://last-crown.top/room',
  },
};

export default function RoomLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
