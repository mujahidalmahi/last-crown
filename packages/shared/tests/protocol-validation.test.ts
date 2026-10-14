import { describe, it, expect } from 'vitest';
import { InviteCodeSchema, PlayerInputSchema, INVITE_CODE_LENGTH } from '../src/index.js';

describe('Protocol Validation', () => {
  describe('InviteCodeSchema', () => {
    it('accepts valid 6-character alphanumeric uppercase code', () => {
      const validCode = 'ABC234';
      expect(validCode).toHaveLength(INVITE_CODE_LENGTH);
      const result = InviteCodeSchema.safeParse(validCode);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('ABC234');
      }
    });

    it('trims and converts lowercase input to uppercase', () => {
      const input = '  abc234  ';
      const result = InviteCodeSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('ABC234');
      }
    });

    it('rejects codes with invalid lengths', () => {
      expect(InviteCodeSchema.safeParse('ABC').success).toBe(false);
      expect(InviteCodeSchema.safeParse('ABC2345').success).toBe(false);
    });

    it('rejects ambiguous characters like 0, O, 1, I', () => {
      expect(InviteCodeSchema.safeParse('AB0123').success).toBe(false);
      expect(InviteCodeSchema.safeParse('ABCDEO').success).toBe(false);
      expect(InviteCodeSchema.safeParse('ABCD12').success).toBe(false);
      expect(InviteCodeSchema.safeParse('ABCDEL').success).toBe(false);
    });
  });

  describe('PlayerInputSchema', () => {
    it('accepts a valid input snapshot', () => {
      const validSnapshot = {
        sequence: 14,
        timestamp: Date.now(),
        moveX: 1,
        jump: false,
        attack: true,
        attackType: 'light',
        block: false,
        parry: false,
        facing: 'right',
      };
      const result = PlayerInputSchema.safeParse(validSnapshot);
      expect(result.success).toBe(true);
    });

    it('rejects negative sequence numbers', () => {
      const invalidSnapshot = {
        sequence: -1,
        timestamp: Date.now(),
        moveX: 0,
        jump: false,
        attack: false,
        block: false,
        parry: false,
      };
      const result = PlayerInputSchema.safeParse(invalidSnapshot);
      expect(result.success).toBe(false);
    });

    it('rejects out of bounds movement inputs', () => {
      const invalidSnapshot = {
        sequence: 1,
        timestamp: Date.now(),
        moveX: 5.5, // Exceeds max 1
        jump: false,
        attack: false,
        block: false,
        parry: false,
      };
      const result = PlayerInputSchema.safeParse(invalidSnapshot);
      expect(result.success).toBe(false);
    });
  });
});
