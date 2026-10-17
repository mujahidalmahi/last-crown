import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Last Crown — Retro Pixel-Art Fighting Game',
    short_name: 'Last Crown',
    description:
      'Fast-paced retro pixel-art browser fighting game featuring 1v1 online multiplayer, smart AI duels, and local 2-player with smartphone QR controllers.',
    start_url: '/',
    display: 'standalone',
    orientation: 'any',
    background_color: '#050810',
    theme_color: '#f1c40f',
    categories: ['games', 'entertainment', 'action'],
    icons: [
      {
        src: '/favicon/android-chrome-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/favicon/android-chrome-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/icon.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/favicon/apple-touch-icon.png',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
  };
}
