type Entry = { value: string; expiresAt: number };

const store = new Map<string, Entry>();

function prune(key: string): void {
  const entry = store.get(key);
  if (entry && entry.expiresAt <= Date.now()) {
    store.delete(key);
  }
}

export function memoryGet(key: string): string | null {
  prune(key);
  return store.get(key)?.value ?? null;
}

export function memorySet(key: string, value: string, ttlMs: number): void {
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
}

export function memoryMget(keys: string[]): (string | null)[] {
  return keys.map(key => memoryGet(key));
}

export function memoryMset(entries: { key: string; value: string; ttlMs: number }[]): void {
  for (const entry of entries) {
    memorySet(entry.key, entry.value, entry.ttlMs);
  }
}

export function memoryDelete(keys: string[]): void {
  for (const key of keys) {
    store.delete(key);
  }
}

const rateLimits = new Map<string, { count: number; expiresAt: number }>();

export function memoryRateLimit(key: string, limit: number, windowSec: number): void {
  const now = Date.now();
  const entry = rateLimits.get(key);
  if (!entry || entry.expiresAt <= now) {
    rateLimits.set(key, { count: 1, expiresAt: now + windowSec * 1000 });
    return;
  }
  entry.count += 1;
  if (entry.count > limit) {
    const err = new Error('Rate limit exceeded') as Error & { status: number };
    err.status = 429;
    throw err;
  }
}
