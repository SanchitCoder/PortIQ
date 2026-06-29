import { getRedis } from './redis.js';

/**
 * Redis-backed fixed-window rate limiter — shared across all web + worker instances.
 * Replaces per-process counters and BullMQ RateLimiterRedis (removed in BullMQ v5).
 */
export async function consumeGlobalRateLimit(
  keyPrefix: string,
  limit: number,
  windowSec: number,
): Promise<void> {
  const windowId = Math.floor(Date.now() / (windowSec * 1000));
  const key = `${keyPrefix}:${windowId}`;
  const redis = getRedis();
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, windowSec);
  }
  if (count > limit) {
    const err = new Error('Rate limit exceeded') as Error & { status: number };
    err.status = 429;
    throw err;
  }
}
