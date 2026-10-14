export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

interface RateLimitRecord {
  timestamps: number[];
}

export class InMemoryRateLimiter {
  private records = new Map<string, RateLimitRecord>();
  private readonly config: RateLimitConfig;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(config: RateLimitConfig) {
    this.config = config;
    // Periodic sweep to prune stale entries and avoid memory leaks
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

  public isAllowed(key: string): { allowed: boolean; remaining: number; resetMs: number } {
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    let record = this.records.get(key);
    if (!record) {
      record = { timestamps: [] };
      this.records.set(key, record);
    }

    // Filter out timestamps outside current sliding window
    record.timestamps = record.timestamps.filter(t => t > windowStart);

    if (record.timestamps.length >= this.config.maxRequests) {
      const oldest = record.timestamps[0] || now;
      const resetMs = oldest + this.config.windowMs - now;
      return { allowed: false, remaining: 0, resetMs: Math.max(0, resetMs) };
    }

    record.timestamps.push(now);
    return {
      allowed: true,
      remaining: this.config.maxRequests - record.timestamps.length,
      resetMs: this.config.windowMs,
    };
  }

  public reset(key: string): void {
    this.records.delete(key);
  }

  private cleanup(): void {
    const now = Date.now();
    const windowStart = now - this.config.windowMs;
    for (const [key, record] of this.records.entries()) {
      record.timestamps = record.timestamps.filter(t => t > windowStart);
      if (record.timestamps.length === 0) {
        this.records.delete(key);
      }
    }
  }

  public destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.records.clear();
  }
}
