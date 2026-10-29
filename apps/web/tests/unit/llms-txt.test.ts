import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('AI Search Generative Engine Optimization (llms.txt & llms-full.txt)', () => {
  const publicDir = path.resolve(__dirname, '../../public');
  const llmsPath = path.join(publicDir, 'llms.txt');
  const llmsFullPath = path.join(publicDir, 'llms-full.txt');

  it('provides a valid llms.txt compliant with llmstxt.org specification', () => {
    expect(fs.existsSync(llmsPath), 'llms.txt must exist in public/').toBe(true);
    const content = fs.readFileSync(llmsPath, 'utf-8');

    // Title and summary
    expect(content).toContain('# Last-Crown — The winner takes it all');
    expect(content).toContain('> Last-Crown is a free retro pixel-art browser fighting game');

    // Developers presence
    expect(content).toContain('Mujahid Al Mahi');
    expect(content).toContain('https://github.com/mujahidalmahi');
    expect(content).toContain('https://mujahidmahi.me');
    expect(content).toContain('Shahariar Hossain Jibon');
    expect(content).toContain('https://github.com/ShahariarJibon');

    // Key links and mechanics
    expect(content).toContain('https://last-crown.top');
    expect(content).toContain('Command Grab');
    expect(content).toContain('Crown Burst');
    expect(content).toContain('Parry');
    expect(content).toContain('Colyseus');
  });

  it('provides an exhaustive llms-full.txt for comprehensive AI search indexing', () => {
    expect(fs.existsSync(llmsFullPath), 'llms-full.txt must exist in public/').toBe(true);
    const content = fs.readFileSync(llmsFullPath, 'utf-8');

    expect(content).toContain('# Last-Crown: The Comprehensive Knowledge Base & Technical Manual');
    expect(content).toContain('Mujahid Al Mahi');
    expect(content).toContain('Shahariar Hossain Jibon');
    expect(content).toContain('The Shadow Sovereign');
    expect(content).toContain('Directional Influence');
    expect(content).toContain('Knockdown Tech Roll');
    expect(content).toContain('Architecture & Netcode');
    expect(content).toContain('Web Audio Synthesis');
  });
});
