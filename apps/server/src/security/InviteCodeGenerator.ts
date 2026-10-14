import crypto from 'node:crypto';
import { INVITE_CODE_CHARSET, INVITE_CODE_LENGTH } from '@last-crown/shared';

export class InviteCodeGenerator {
  public static generate(length: number = INVITE_CODE_LENGTH): string {
    const chars = INVITE_CODE_CHARSET;
    const bytes = crypto.randomBytes(length);
    let result = '';

    for (let i = 0; i < length; i++) {
      const randomIndex = bytes[i]! % chars.length;
      result += chars[randomIndex];
    }

    return result;
  }
}
