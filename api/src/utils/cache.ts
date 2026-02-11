// Simple in-memory cache implementation
// In production with multiple instances, use Redis

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry<any>>();

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of cache.entries()) {
    if (entry.expiresAt < now) {
      cache.delete(key);
    }
  }
}, 5 * 60 * 1000);

export async function cacheGet<T>(key: string): Promise<T | null> {
  const entry = cache.get(key);
  if (!entry) return null;
  
  if (entry.expiresAt < Date.now()) {
    cache.delete(key);
    return null;
  }
  
  return entry.value;
}

export async function cacheSet<T>(key: string, value: T, ttlSeconds: number = 3600): Promise<void> {
  cache.set(key, {
    value,
    expiresAt: Date.now() + (ttlSeconds * 1000),
  });
}

export async function cacheDelete(key: string): Promise<void> {
  cache.delete(key);
}

export async function cacheClear(): Promise<void> {
  cache.clear();
}

// Helper for cache-aside pattern
export async function cached<T>(
  key: string,
  fn: () => Promise<T>,
  ttlSeconds: number = 3600
): Promise<T> {
  const cached = await cacheGet<T>(key);
  if (cached !== null) {
    return cached;
  }
  
  const value = await fn();
  await cacheSet(key, value, ttlSeconds);
  return value;
}
