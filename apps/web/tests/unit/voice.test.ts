import { describe, it, expect } from 'vitest';
import { VoiceControls } from '../../src/features/voice/VoiceControls.js';
import { useVoiceChat } from '../../src/features/voice/useVoiceChat.js';

describe('Voice Chat Feature', () => {
  it('exports VoiceControls component successfully', () => {
    expect(VoiceControls).toBeDefined();
    expect(typeof VoiceControls).toBe('function');
  });

  it('exports useVoiceChat hook successfully', () => {
    expect(useVoiceChat).toBeDefined();
    expect(typeof useVoiceChat).toBe('function');
  });
});
