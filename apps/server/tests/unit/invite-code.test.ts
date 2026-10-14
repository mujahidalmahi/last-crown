import { describe, it, expect } from 'vitest';
import { InviteCodeGenerator } from '../../src/security/InviteCodeGenerator.js';
import { INVITE_CODE_CHARSET, INVITE_CODE_LENGTH } from '@last-crown/shared';

describe('InviteCodeGenerator', () => {
  it('generates random codes of specified length', () => {
    const code = InviteCodeGenerator.generate();
    expect(code).toHaveLength(INVITE_CODE_LENGTH);
  });

  it('only utilizes characters from the unambiguous charset', () => {
    for (let i = 0; i < 50; i++) {
      const code = InviteCodeGenerator.generate();
      for (const char of code) {
        expect(INVITE_CODE_CHARSET).toContain(char);
      }
    }
  });

  it('generates unique codes across successive calls', () => {
    const codes = new Set<string>();
    for (let i = 0; i < 100; i++) {
      codes.add(InviteCodeGenerator.generate());
    }
    // High probability of zero collisions across 100 6-char samples
    expect(codes.size).toBe(100);
  });
});
