import { memoryRateLimit } from './memoryCache.js';
import { getRedis, isRedisConfigured } from './redis.js';

/**
 * Fixed-window rate limiter — Redis when configured, otherwise in-process memory.
 */
export async function consumeGlobalRateLimit(
  keyPrefix: string,
  limit: number,
  windowSec: number,
): Promise<void> {
  const windowId = Math.floor(Date.now() / (windowSec * 1000));
  const key = `${keyPrefix}:${windowId}`;

  if (!isRedisConfigured()) {
    memoryRateLimit(key, limit, windowSec);
    return;
  }

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
