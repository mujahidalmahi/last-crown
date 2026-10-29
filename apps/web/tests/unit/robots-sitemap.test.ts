import { describe, it, expect } from 'vitest';
import robots from '../../src/app/robots';
import sitemap from '../../src/app/sitemap';

describe('Robots Directives & Sitemap Route Indexing', () => {
  it('configures robots.ts with allowances for Googlebot, GPTBot, PerplexityBot, and ClaudeBot', () => {
    const robotsConfig = robots();
    expect(robotsConfig.sitemap).toBe('https://last-crown.top/sitemap.xml');
    expect(robotsConfig.host).toBe('https://last-crown.top');

    const rules = Array.isArray(robotsConfig.rules) ? robotsConfig.rules : [robotsConfig.rules];
    const userAgents = rules.flatMap(r => (Array.isArray(r.userAgent) ? r.userAgent : [r.userAgent]));

    // Verify search engines and AI crawlers
    expect(userAgents).toContain('*');
    expect(userAgents).toContain('Googlebot');
    expect(userAgents).toContain('GPTBot');
    expect(userAgents).toContain('PerplexityBot');
    expect(userAgents).toContain('ClaudeBot');
  });

  it('configures sitemap.ts with all active game routes including /about, /arcade, and /training', () => {
    const sitemapEntries = sitemap();
    const urls = sitemapEntries.map(entry => entry.url);

    expect(urls).toContain('https://last-crown.top');
    expect(urls).toContain('https://last-crown.top/about');
    expect(urls).toContain('https://last-crown.top/arcade');
    expect(urls).toContain('https://last-crown.top/training');
    expect(urls).toContain('https://last-crown.top/play');
    expect(urls).toContain('https://last-crown.top/local');
    expect(urls).toContain('https://last-crown.top/room');
    expect(urls).toContain('https://last-crown.top/settings');
  });
});
