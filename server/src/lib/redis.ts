import type { ConnectionOptions } from 'bullmq';
import { Redis, RedisOptions } from 'ioredis';

/**
 * Centralized Redis client — shared by cache, OpenRouter rate limiting, and BullMQ.
 * Supports REDIS_URL or Upstash REST env vars (auto-builds rediss:// URL).
 */
let redis: Redis | null = null;

/** Build rediss:// URL from Upstash REST credentials (ioredis / BullMQ use TCP, not REST). */
export function resolveRedisUrl(): string {
  if (process.env.REDIS_URL && !process.env.REDIS_URL.includes('localhost')) {
    return process.env.REDIS_URL;
  }

  const restUrl = process.env.UPSTASH_REDIS_REST_URL;
  const restToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (restUrl && restToken) {
    const host = new URL(restUrl).hostname;
    return `rediss://default:${encodeURIComponent(restToken)}@${host}:6379`;
  }

  if (process.env.REDIS_URL) {
    return process.env.REDIS_URL;
  }

  throw new Error(
    'Redis required: set REDIS_URL or UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN',
  );
}

function parseRedisUrl(url: string): RedisOptions {
  const parsed = new URL(url);
  const useTls = url.startsWith('rediss://') || parsed.hostname.includes('upstash.io');

  return {
    host: parsed.hostname,
    port: Number(parsed.port || 6379),
    password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
    username: parsed.username ? decodeURIComponent(parsed.username) : undefined,
    maxRetriesPerRequest: null,
    tls: useTls ? {} : undefined,
  };
}

export function getRedis(): Redis {
  if (!redis) {
    redis = new Redis(parseRedisUrl(resolveRedisUrl()));
  }
  return redis;
}

/** BullMQ connection options — separate from ioredis instance to avoid version mismatch. */
export function getBullmqConnection(): ConnectionOptions {
  return {
    ...parseRedisUrl(resolveRedisUrl()),
    maxRetriesPerRequest: null,
  };
}

export async function connectRedis(): Promise<void> {
  await getRedis().ping();
}

export async function disconnectRedis(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
  }
}
