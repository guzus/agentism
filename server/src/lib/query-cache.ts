export interface QueryCacheEntry<T> {
  value: T;
  expiresAt: number;
}

const queryCache = new Map<string, QueryCacheEntry<unknown>>();
const inFlight = new Map<string, Promise<unknown>>();

function isFresh(entry: QueryCacheEntry<unknown>): boolean {
  return entry.expiresAt > Date.now();
}

export async function withQueryCache<T>(
  key: string,
  ttlMs: number,
  loader: () => Promise<T>
): Promise<T> {
  const cached = queryCache.get(key);
  if (cached && isFresh(cached)) {
    return cached.value as T;
  }

  const running = inFlight.get(key);
  if (running) {
    return running as Promise<T>;
  }

  const loading = (async () => {
    const value = await loader();
    queryCache.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    });
    return value;
  })().finally(() => {
    inFlight.delete(key);
  });

  inFlight.set(key, loading);
  return loading as Promise<T>;
}
