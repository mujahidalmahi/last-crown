import type { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: 'Wireless Phone Gamepad Controller',
  description:
    'Use your smartphone as an ultra-responsive wireless touchscreen gamepad controller to play Last Crown local 2-player battles on PC or Mac.',
  alternates: {
    canonical: '/controller',
  },
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    title: 'Wireless Phone Gamepad Controller | Last Crown',
    description:
      'Ultra-responsive touchscreen controller for Last Crown local 2-player couch co-op.',
    url: 'https://last-crown.top/controller',
  },
};

export default function ControllerLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
