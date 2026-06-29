import { createHash } from 'crypto';
import { getRedis } from './redis.js';

/** Build a namespaced Redis key: portiq:{feature}:{...parts} */
export function cacheKey(feature: string, ...parts: string[]): string {
  return `portiq:${feature}:${parts.join(':')}`;
}

export function stableHash(input: unknown): string {
  return createHash('sha256').update(JSON.stringify(input)).digest('hex');
}

/**
 * Shared Redis cache helper — replaces all in-memory Map caches.
 * State moved from process memory → Redis for horizontal scaling.
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  const raw = await getRedis().get(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function cacheSet<T>(key: string, value: T, ttlMs: number): Promise<void> {
  const ttlSec = Math.max(1, Math.ceil(ttlMs / 1000));
  await getRedis().set(key, JSON.stringify(value), 'EX', ttlSec);
}

/** Batch-read; returns null for missing keys (same order as input). */
export async function cacheMget<T>(keys: string[]): Promise<(T | null)[]> {
  if (keys.length === 0) return [];
  const raw = await getRedis().mget(...keys);
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
  const pipeline = getRedis().pipeline();
  for (const { key, value, ttlMs } of entries) {
    const ttlSec = Math.max(1, Math.ceil(ttlMs / 1000));
    pipeline.set(key, JSON.stringify(value), 'EX', ttlSec);
  }
  await pipeline.exec();
}

export async function cacheDelete(keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  await getRedis().del(...keys);
}
