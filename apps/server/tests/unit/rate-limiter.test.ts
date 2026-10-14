import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { InMemoryRateLimiter } from '../../src/security/RateLimiter.js';

describe('InMemoryRateLimiter', () => {
  let limiter: InMemoryRateLimiter;

  beforeEach(() => {
    limiter = new InMemoryRateLimiter({
      maxRequests: 3,
      windowMs: 1000,
    });
  });

  afterEach(() => {
    limiter.destroy();
  });

  it('allows requests within the limit', () => {
    expect(limiter.isAllowed('user-1').allowed).toBe(true);
    expect(limiter.isAllowed('user-1').allowed).toBe(true);
    expect(limiter.isAllowed('user-1').allowed).toBe(true);
  });

  it('rejects requests exceeding the maximum threshold', () => {
    limiter.isAllowed('user-1');
    limiter.isAllowed('user-1');
    limiter.isAllowed('user-1');

    const blocked = limiter.isAllowed('user-1');
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.resetMs).toBeGreaterThan(0);
  });

  it('tracks keys independently', () => {
    limiter.isAllowed('user-1');
    limiter.isAllowed('user-1');
    limiter.isAllowed('user-1');

    expect(limiter.isAllowed('user-1').allowed).toBe(false);
    expect(limiter.isAllowed('user-2').allowed).toBe(true);
  });
});
