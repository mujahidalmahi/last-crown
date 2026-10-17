import type { Metadata, Viewport } from 'next';
import React from 'react';
import '../styles/globals.css';
import { Footer } from '../components/layout/Footer';
import { SkipLink } from '../components/accessibility/SkipLink';

export const metadata: Metadata = {
  metadataBase: new URL('https://last-crown.top'),
  title: {
    default: 'Last-Crown — The winner takes it all | Free Retro Pixel-Art Browser Fighting Game',
    template: '%s | Last-Crown',
  },
  description:
    'Play Last-Crown — The winner takes it all, the ultimate free retro pixel-art browser fighting game. Experience fast 2D combat, smart AI bot duels, online 1v1 multiplayer with voice chat, and local 2-player battles with mobile QR controllers or gamepads.',
  applicationName: 'Last-Crown',
  keywords: [
    'Last-Crown',
    'Last-Crown: The winner takes it all',
    'The winner takes it all',
    'last-crown.top',
    'browser fighting game',
    'pixel art fighting game',
    'retro fighting game online',
    'free fighting game in browser',
    '2D sword fighting game',
    'multiplayer browser fighting game',
    'local 2 player fighting game',
    'phone controller browser game',
    'online 1v1 fighting game',
    'medieval combat game',
    'colyseus fighting game',
    'phaser fighting game',
    'arcade fighting game',
  ],
  authors: [{ name: 'Last-Crown Team', url: 'https://last-crown.top' }],
  creator: 'Last-Crown',
  publisher: 'Last-Crown',
  category: 'game',
  classification: 'Video Game / Web Fighting Game',
  alternates: {
    canonical: '/',
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon.png', type: 'image/png', sizes: '512x512' },
      { url: '/favicon/favicon-32x32.png', type: 'image/png', sizes: '32x32' },
      { url: '/favicon/favicon-16x16.png', type: 'image/png', sizes: '16x16' },
    ],
    apple: [{ url: '/apple-icon.png', sizes: '180x180' }],
  },
  manifest: '/manifest.webmanifest',
  openGraph: {
    title: 'Last-Crown — The winner takes it all',
    description:
      'Fast 2D combat in your browser! Single-player AI duels, online 1v1 with voice chat, and local 2-player with phone QR controllers. No download required.',
    url: 'https://last-crown.top',
    siteName: 'Last-Crown',
    images: [
      {
        url: '/assets/backgrounds/cover.jpg',
        width: 1200,
        height: 630,
        alt: 'Last-Crown — The winner takes it all',
        type: 'image/jpeg',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Last-Crown — The winner takes it all',
    description:
      'Fast 2D combat in your browser! Single-player AI duels, online 1v1 with voice chat, and local 2-player with phone QR controllers.',
    images: ['/assets/backgrounds/cover.jpg'],
    creator: '@LastCrownGame',
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#07090e',
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': ['VideoGame', 'WebApplication'],
      '@id': 'https://last-crown.top/#game',
      name: 'Last-Crown',
      alternateName: [
        'Last-Crown',
        'Last-Crown: The winner takes it all',
        'The winner takes it all',
        'Last Crown',
      ],
      url: 'https://last-crown.top',
      image: 'https://last-crown.top/assets/backgrounds/cover.jpg',
      screenshot: 'https://last-crown.top/assets/backgrounds/cover.jpg',
      description:
        'Last-Crown is a retro pixel-art browser fighting game built with Next.js, Phaser, and Colyseus for fast, server-authoritative 2D combat. Features smart AI bot duels, real-time 1v1 online multiplayer with WebRTC voice chat, and local 2-player couch battles using smartphone QR controllers or physical gamepads.',
      genre: [
        'Fighting game',
        'Action game',
        'Retro arcade',
        'Pixel art',
        '2D Combat',
        'Sword fighting',
      ],
      gamePlatform: ['Web Browser', 'PC', 'Mac', 'Linux', 'Android', 'iOS'],
      applicationCategory: 'GameApplication',
      operatingSystem: 'Any modern browser with WebGL',
      inLanguage: 'en',
      playMode: ['SinglePlayer', 'MultiPlayer', 'CoOp'],
      numberOfPlayers: {
        '@type': 'QuantitativeValue',
        minValue: 1,
        maxValue: 2,
      },
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
        availability: 'https://schema.org/InStock',
        category: 'Free to Play',
      },
      author: {
        '@type': 'Organization',
        name: 'Last-Crown Team',
        url: 'https://last-crown.top',
      },
      publisher: {
        '@type': 'Organization',
        name: 'Last-Crown',
        url: 'https://last-crown.top',
      },
    },
    {
      '@type': 'WebSite',
      '@id': 'https://last-crown.top/#website',
      url: 'https://last-crown.top',
      name: 'Last-Crown',
      description: 'Play Last-Crown — The winner takes it all.',
      publisher: {
        '@id': 'https://last-crown.top/#game',
      },
    },
    {
      '@type': 'FAQPage',
      '@id': 'https://last-crown.top/#faq',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'What is Last-Crown?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Last-Crown is a free retro pixel-art browser fighting game featuring fast 2D combat, authentic parry and stamina mechanics, single-player AI battles, 1v1 online multiplayer with WebRTC voice chat, and local 2-player mode.',
          },
        },
        {
          '@type': 'Question',
          name: 'How do I play local 2-player on one device in Last-Crown?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'In Local 2-Player mode, Last-Crown displays a QR code and party code. Both players can scan the QR code with their mobile phones to turn their phones into wireless touch controllers, or plug in USB/Bluetooth gamepads to battle together on the same screen.',
          },
        },
        {
          '@type': 'Question',
          name: 'Is Last-Crown free to play?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes, Last-Crown is 100% free to play directly in modern web browsers (Chrome, Firefox, Safari, Edge) on PC, Mac, Linux, tablets, and mobile devices without downloading or installing any files.',
          },
        },
        {
          '@type': 'Question',
          name: 'Does Last-Crown have online multiplayer and voice chat?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes! Last-Crown features real-time server-authoritative 1v1 multiplayer with private 6-character room codes and built-in low-latency WebRTC voice chat with TURN relay fallback.',
          },
        },
      ],
    },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <SkipLink />
        <main
          id="main-content"
          tabIndex={-1}
          style={{ flex: 1, display: 'flex', flexDirection: 'column', outline: 'none' }}
        >
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
