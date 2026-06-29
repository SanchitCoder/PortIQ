import { createHash } from 'crypto';
import {
  memoryDelete,
  memoryGet,
  memoryMget,
  memoryMset,
  memorySet,
} from './memoryCache.js';
import { getRedis, isRedisConfigured } from './redis.js';

/** Build a namespaced Redis key: portiq:{feature}:{...parts} */
export function cacheKey(feature: string, ...parts: string[]): string {
  return `portiq:${feature}:${parts.join(':')}`;
}

export function stableHash(input: unknown): string {
  return createHash('sha256').update(JSON.stringify(input)).digest('hex');
}

/**
 * Shared cache helper — Redis when configured, otherwise in-process memory.
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  const raw = isRedisConfigured()
    ? await getRedis().get(key)
    : memoryGet(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function cacheSet<T>(key: string, value: T, ttlMs: number): Promise<void> {
  const serialized = JSON.stringify(value);
  if (isRedisConfigured()) {
    const ttlSec = Math.max(1, Math.ceil(ttlMs / 1000));
    await getRedis().set(key, serialized, 'EX', ttlSec);
    return;
  }
  memorySet(key, serialized, ttlMs);
}

/** Batch-read; returns null for missing keys (same order as input). */
export async function cacheMget<T>(keys: string[]): Promise<(T | null)[]> {
  if (keys.length === 0) return [];
  const raw = isRedisConfigured()
    ? await getRedis().mget(...keys)
    : memoryMget(keys);
  return raw.map(entry => {
    if (!entry) return null;
    try {
      return JSON.parse(entry) as T;
    } catch {
      return null;
    }
  });
}

export async function cacheMset(
  entries: { key: string; value: unknown; ttlMs: number }[],
): Promise<void> {
  if (entries.length === 0) return;
  if (isRedisConfigured()) {
    const pipeline = getRedis().pipeline();
    for (const { key, value, ttlMs } of entries) {
      const ttlSec = Math.max(1, Math.ceil(ttlMs / 1000));
      pipeline.set(key, JSON.stringify(value), 'EX', ttlSec);
    }
    await pipeline.exec();
    return;
  }
  memoryMset(
    entries.map(({ key, value, ttlMs }) => ({
      key,
      value: JSON.stringify(value),
      ttlMs,
    })),
  );
}

export async function cacheDelete(keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  if (isRedisConfigured()) {
    await getRedis().del(...keys);
    return;
  }
  memoryDelete(keys);
}
