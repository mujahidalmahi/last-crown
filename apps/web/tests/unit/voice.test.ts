import { describe, it, expect } from 'vitest';
import { VoiceControls } from '../../src/features/voice/VoiceControls.js';
import { useVoiceChat, VOICE_ICE_SERVERS } from '../../src/features/voice/useVoiceChat.js';

describe('Voice Chat Feature', () => {
  it('exports VoiceControls component successfully', () => {
    expect(VoiceControls).toBeDefined();
    expect(typeof VoiceControls).toBe('function');
  });

  it('exports useVoiceChat hook successfully', () => {
    expect(useVoiceChat).toBeDefined();
    expect(typeof useVoiceChat).toBe('function');
  });

  it('configures redundant STUN and free TURN relays for NAT and firewall bypass', () => {
    expect(VOICE_ICE_SERVERS.iceServers).toBeDefined();
    const urls = VOICE_ICE_SERVERS.iceServers!
      .map(s => (typeof s.urls === 'string' ? s.urls : s.urls[0] || ''))
      .filter(Boolean);
    
    // Validates Google & Cloudflare STUN
    expect(urls.some(u => u.includes('stun.l.google.com'))).toBe(true);
    expect(urls.some(u => u.includes('stun.cloudflare.com'))).toBe(true);

    // Validates free public TURN relays for symmetric NAT traversal
    expect(urls.some(u => u.includes('turn:openrelay.metered.ca'))).toBe(true);
  });
});
