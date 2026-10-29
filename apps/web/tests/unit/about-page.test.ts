import { describe, it, expect } from 'vitest';
import { metadata } from '../../src/app/about/page';
import fs from 'fs';
import path from 'path';

describe('Dedicated /about Page (Server-Rendered SSR)', () => {
  it('exports dedicated SEO metadata targeting creator and game queries', () => {
    expect(metadata.title).toBeDefined();
    expect(String(metadata.title)).toContain('About the Creators & Game');
    expect(metadata.description).toContain('Mujahid Al Mahi');
    expect(metadata.description).toContain('Shahariar Hossain Jibon');
  });

  it('renders rich semantic developer bios and tech architecture', () => {
    const pagePath = path.resolve(__dirname, '../../src/app/about/page.tsx');
    const rawContent = fs.readFileSync(pagePath, 'utf-8');
    const pageContent = rawContent.replace(/\s+/g, ' ');

    // Mujahid Al Mahi profile details
    expect(pageContent).toContain('Mujahid Al Mahi');
    expect(pageContent).toContain('Core Game Physics, Controls');
    expect(pageContent).toContain('https://github.com/mujahidalmahi');
    expect(pageContent).toContain('https://mujahidmahi.me');

    // Shahariar Hossain Jibon profile details
    expect(pageContent).toContain('Shahariar Hossain Jibon');
    expect(pageContent).toContain('UI/UX, Responsiveness');
    expect(pageContent).toContain('https://github.com/ShahariarJibon');

    // Game Lore and Arenas
    expect(pageContent).toContain('Bastion Courtyard');
    expect(pageContent).toContain('Shadow Sovereign');

    // Tech stack
    expect(pageContent).toContain('Deterministic 60Hz');
    expect(pageContent).toContain('Colyseus');
    expect(pageContent).toContain('WebRTC');
  });
});
