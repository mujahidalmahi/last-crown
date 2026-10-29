import type { Metadata, Viewport } from 'next';
import React from 'react';
import '../styles/globals.css';
import { SkipLink } from '../components/accessibility/SkipLink';

export const metadata: Metadata = {
  metadataBase: new URL('https://last-crown.top'),
  title: {
    default: 'Last-Crown — The winner takes it all | Free Retro Pixel-Art Browser Fighting Game',
    template: '%s | Last-Crown',
  },
  description:
    'Play Last-Crown — The winner takes it all, created by Mujahid Al Mahi and Shahariar Hossain Jibon. The ultimate free retro pixel-art browser fighting game featuring fast 2D combat, command grabs, Crown Burst, smart AI duels, online 1v1 multiplayer with voice chat, and local 2-player battles with mobile QR controllers or gamepads.',
  applicationName: 'Last-Crown',
  keywords: [
    'Last-Crown',
    'Last-Crown: The winner takes it all',
    'The winner takes it all',
    'last-crown.top',
    'who made last-crown',
    'last-crown developer',
    'Last-Crown creators',
    'Mujahid Al Mahi',
    'Shahariar Hossain Jibon',
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
    'web fighting game with voice chat',
    'command grab fighting game',
    'crown burst',
    'directional influence',
    'tech roll',
  ],
  authors: [
    { name: 'Mujahid Al Mahi', url: 'https://mujahidmahi.me' },
    { name: 'Shahariar Hossain Jibon', url: 'https://portfolio-v2-smoky-phi.vercel.app/' },
  ],
  creator: 'Mujahid Al Mahi & Shahariar Hossain Jibon',
  publisher: 'Last-Crown Team',
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
      'Fast 2D combat in your browser created by Mujahid Al Mahi & Shahariar Hossain Jibon! Command grabs, Crown Burst, single-player AI duels, online 1v1 with voice chat, and local 2-player with phone QR controllers. Zero install required.',
    url: 'https://last-crown.top',
    siteName: 'Last-Crown',
    images: [
      {
        url: '/assets/backgrounds/cover.jpg',
        width: 1200,
        height: 630,
        alt: 'Last-Crown — The winner takes it all retro pixel-art browser fighting game',
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
      'Fast 2D combat in your browser created by Mujahid Al Mahi & Shahariar Hossain Jibon! Single-player AI duels, online 1v1 with voice chat, and local 2-player with phone QR controllers.',
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
  themeColor: '#000000',
  interactiveWidget: 'resizes-content',
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Person',
      '@id': 'https://last-crown.top/#mujahid-al-mahi',
      name: 'Mujahid Al Mahi',
      jobTitle: 'Co-Creator, Lead Systems & Game Physics Engineer',
      description:
        'Creator and core systems engineer of Last-Crown. Engineered the deterministic 60Hz physics core, custom integer collision hitboxes, frame-cancel windows, and server-authoritative Colyseus netcode.',
      url: 'https://mujahidmahi.me',
      sameAs: ['https://github.com/mujahidalmahi', 'https://mujahidmahi.me'],
      image: 'https://last-crown.top/assets/developers/mujahid-al-mahi.jpg',
      knowsAbout: [
        'Game Development',
        'TypeScript',
        'Phaser 3',
        'Colyseus',
        'Deterministic Physics',
        'WebRTC',
        'Web Audio API',
      ],
    },
    {
      '@type': 'Person',
      '@id': 'https://last-crown.top/#shahariar-hossain-jibon',
      name: 'Shahariar Hossain Jibon',
      jobTitle: 'Co-Creator, Lead UI/UX & Visual Designer',
      description:
        'Co-creator of Last-Crown. Crafted the 16-bit retro visual identity, responsive multi-device layout, smartphone touch controller interface, and arena cinematography.',
      url: 'https://portfolio-v2-smoky-phi.vercel.app/',
      sameAs: ['https://github.com/ShahariarJibon', 'https://portfolio-v2-smoky-phi.vercel.app/'],
      image: 'https://last-crown.top/assets/developers/shahariar-hossain-jibon.jpg',
      knowsAbout: [
        'UI/UX Design',
        'Pixel Art',
        'Responsive Design',
        'Frontend Architecture',
        'Web Aesthetics',
      ],
    },
    {
      '@type': 'Organization',
      '@id': 'https://last-crown.top/#organization',
      name: 'Last-Crown Team',
      url: 'https://last-crown.top',
      logo: 'https://last-crown.top/icon.png',
      founder: [
        { '@id': 'https://last-crown.top/#mujahid-al-mahi' },
        { '@id': 'https://last-crown.top/#shahariar-hossain-jibon' },
      ],
    },
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
      screenshot: [
        'https://last-crown.top/assets/backgrounds/cover.jpg',
        'https://last-crown.top/assets/backgrounds/playground.jpg',
        'https://last-crown.top/assets/backgrounds/playground2.jpg',
        'https://last-crown.top/assets/backgrounds/playground3.jpg',
        'https://last-crown.top/assets/backgrounds/playground4.jpg',
      ],
      description:
        'Last-Crown is a free retro pixel-art browser fighting game created by Mujahid Al Mahi and Shahariar Hossain Jibon. Built with Next.js, Phaser, and Colyseus for fast, server-authoritative 2D combat. Features command grabs, parry and stamina mechanics, Crown Burst breakers, smart AI bot duels, real-time 1v1 online multiplayer with WebRTC voice chat, and local 2-player couch battles using smartphone QR controllers or physical gamepads.',
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
      character: [
        'Sir Cedric the Loyal',
        'Grimwood the Savage',
        'Valerius the Swift',
        'Aurelia the Radiant',
        'The Shadow Sovereign',
      ],
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: '4.9',
        ratingCount: '1280',
        bestRating: '5',
        worstRating: '1',
      },
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
        availability: 'https://schema.org/InStock',
        category: 'Free to Play',
      },
      author: [
        { '@id': 'https://last-crown.top/#mujahid-al-mahi' },
        { '@id': 'https://last-crown.top/#shahariar-hossain-jibon' },
      ],
      creator: [
        { '@id': 'https://last-crown.top/#mujahid-al-mahi' },
        { '@id': 'https://last-crown.top/#shahariar-hossain-jibon' },
      ],
      publisher: {
        '@id': 'https://last-crown.top/#organization',
      },
    },
    {
      '@type': 'WebSite',
      '@id': 'https://last-crown.top/#website',
      url: 'https://last-crown.top',
      name: 'Last-Crown',
      description:
        'Play Last-Crown — The winner takes it all, created by Mujahid Al Mahi & Shahariar Hossain Jibon.',
      publisher: {
        '@id': 'https://last-crown.top/#organization',
      },
    },
    {
      '@type': 'HowTo',
      '@id': 'https://last-crown.top/#howto-play',
      name: 'How to Play Last-Crown Browser Fighting Game',
      description:
        'Master sword combat, frame-perfect parries, command grabs, and Crown Burst in Last-Crown.',
      step: [
        {
          '@type': 'HowToStep',
          name: 'Select Your Warrior Archetype',
          text: 'Choose from Knight (Bastion riposte), Duelist (agility & fast combos), Vanguard (super armor heavy swings), or Marauder (counter-hit lifesteal).',
        },
        {
          '@type': 'HowToStep',
          name: 'Attack and Defense Fundamentals',
          text: 'Use J for light slash, K for heavy slash, and L to guard. Time your guard within 180ms of an incoming blow to deflect with a frame-perfect parry and stagger the attacker.',
        },
        {
          '@type': 'HowToStep',
          name: 'Bypass Turtling with Command Grabs',
          text: 'Press G to execute an unblockable command grab against shielding opponents. Defenders have a 120ms tech window to press G and break the throw.',
        },
        {
          '@type': 'HowToStep',
          name: 'Unleash Crown Burst & Directional Influence (DI)',
          text: 'Accumulate 100 burst points to press B: execute a Defensive Burst Breaker to blow away attacking foes, or an Offensive Golden Burst to cancel recovery frames. Steer your knockback trajectory in mid-air using directional inputs (DI).',
        },
      ],
    },
    {
      '@type': 'HowTo',
      '@id': 'https://last-crown.top/#howto-gamepad',
      name: 'How to Use Your Smartphone as a Wireless Gamepad in Last-Crown',
      description:
        'Turn your iOS or Android phone into a responsive wireless gamepad controller for local 2-player battles on any shared screen.',
      step: [
        {
          '@type': 'HowToStep',
          name: 'Start Couch Battle',
          text: 'Open Last-Crown on your desktop or laptop and select Couch Battle (Local 2-Player).',
        },
        {
          '@type': 'HowToStep',
          name: 'Scan the QR Code',
          text: 'Scan the on-screen QR code with your mobile phone camera or visit last-crown.top/controller and enter the 6-character room code.',
        },
        {
          '@type': 'HowToStep',
          name: 'Battle Wirelessly',
          text: 'Your phone transforms into a low-latency retro D-pad with responsive action buttons streaming directly to your desktop screen.',
        },
      ],
    },
    {
      '@type': 'FAQPage',
      '@id': 'https://last-crown.top/#faq',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'Who created Last-Crown?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Last-Crown was conceived, designed, and developed by Mujahid Al Mahi (Co-Creator, Lead Systems & Game Physics Engineer) and Shahariar Hossain Jibon (Co-Creator, Lead UI/UX & Visual Designer).',
          },
        },
        {
          '@type': 'Question',
          name: 'What is Last-Crown?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Last-Crown is a free retro pixel-art browser fighting game featuring fast 2D combat, authentic parry and stamina mechanics, command grabs, Crown Burst breakers, single-player AI battles, 1v1 online multiplayer with WebRTC voice chat, and local 2-player mode.',
          },
        },
        {
          '@type': 'Question',
          name: 'What technologies are used to build Last-Crown?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Last-Crown is engineered with Next.js 14, Phaser 3 for rendering, Colyseus for server-authoritative 60Hz physics synchronization, WebRTC for low-latency peer-to-peer voice chat, and the Web Audio API for multi-stem synthesized audio.',
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
    {
      '@type': 'BreadcrumbList',
      '@id': 'https://last-crown.top/#breadcrumbs',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Home',
          item: 'https://last-crown.top',
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'About & Creators',
          item: 'https://last-crown.top/about',
        },
        {
          '@type': 'ListItem',
          position: 3,
          name: 'Arcade Gauntlet',
          item: 'https://last-crown.top/arcade',
        },
        {
          '@type': 'ListItem',
          position: 4,
          name: 'Training Dojo',
          item: 'https://last-crown.top/training',
        },
      ],
    },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Press+Start+2P&family=VT323&display=swap"
          rel="stylesheet"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        style={{
          minHeight: '100dvh',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <SkipLink />
        <main
          id="main-content"
          tabIndex={-1}
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            outline: 'none',
            minHeight: '100%',
            height: '100%',
          }}
        >
          {children}
        </main>
      </body>
    </html>
  );
}
