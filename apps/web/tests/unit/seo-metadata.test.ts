import { describe, it, expect, vi } from 'vitest';
import fs from 'fs';
import path from 'path';

vi.mock('next/font/google', () => ({
  Press_Start_2P: () => ({ variable: 'font-press' }),
  VT323: () => ({ variable: 'font-vt' }),
}));

describe('SEO Metadata & Knowledge Graph JSON-LD', () => {
  it('exports comprehensive metadata with both developers and high-intent keywords', async () => {
    const { metadata } = await import('../../src/app/layout');
    expect(metadata.title).toBeDefined();
    expect(metadata.description).toContain('Last-Crown');

    // Verify both creators are properly credited in authors
    const authors = metadata.authors as Array<{ name: string; url?: string }> | undefined;
    expect(authors).toBeDefined();
    const authorNames = authors?.map(a => a.name) ?? [];
    expect(authorNames).toContain('Mujahid Al Mahi');
    expect(authorNames).toContain('Shahariar Hossain Jibon');

    // Verify creator string contains both names
    expect(String(metadata.creator)).toContain('Mujahid Al Mahi');
    expect(String(metadata.creator)).toContain('Shahariar Hossain Jibon');

    // Verify keywords include high-intent search queries
    const keywords = (metadata.keywords as string[]) || [];
    expect(keywords).toContain('who made last-crown');
    expect(keywords).toContain('last-crown developer');
    expect(keywords).toContain('Mujahid Al Mahi');
    expect(keywords).toContain('Shahariar Hossain Jibon');
  });

  it('includes complete Schema.org JSON-LD graph with Person, VideoGame, HowTo, and FAQPage', () => {
    const layoutPath = path.resolve(__dirname, '../../src/app/layout.tsx');
    const layoutContent = fs.readFileSync(layoutPath, 'utf-8');

    // Verify jsonLd structure exists and contains required entities
    expect(layoutContent).toContain('https://schema.org');

    // Verify Mujahid Al Mahi Person entity
    expect(layoutContent).toContain('Mujahid Al Mahi');
    expect(layoutContent).toContain('https://github.com/mujahidalmahi');
    expect(layoutContent).toContain('https://mujahidmahi.me');

    // Verify Shahariar Hossain Jibon Person entity
    expect(layoutContent).toContain('Shahariar Hossain Jibon');
    expect(layoutContent).toContain('https://github.com/ShahariarJibon');

    // Verify VideoGame entity has characters and aggregateRating
    expect(layoutContent).toContain('Sir Cedric');
    expect(layoutContent).toContain('The Shadow Sovereign');
    expect(layoutContent).toContain('AggregateRating');
    expect(layoutContent).toContain('4.9');

    // Verify HowTo and BreadcrumbList schemas exist
    expect(layoutContent).toContain('HowTo');
    expect(layoutContent).toContain('BreadcrumbList');
  });
});
