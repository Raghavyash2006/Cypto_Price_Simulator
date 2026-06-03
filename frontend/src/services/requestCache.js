const cache = new Map();
const inFlight = new Map();

function now() {
  return Date.now();
}

function readEntry(key) {
  const entry = cache.get(key);
  if (!entry) return null;

  if (entry.expiresAt <= now()) {
    cache.delete(key);
    return null;
  }

  return entry;
}

export async function cachedGet(key, fetcher, { ttl = 30000, staleTtl = ttl * 3 } = {}) {
  const cached = readEntry(key);
  if (cached && cached.staleAt > now()) {
    return cached.value;
  }

  if (cached && cached.staleAt <= now() && cached.expiresAt > now()) {
    if (!inFlight.has(key)) {
      const refresh = Promise.resolve()
        .then(fetcher)
        .then((value) => {
          cache.set(key, { value, staleAt: now() + ttl, expiresAt: now() + staleTtl });
          return value;
        })
        .catch(() => cached.value)
        .finally(() => {
          inFlight.delete(key);
        });

      inFlight.set(key, refresh);
    }

    return cached.value;
  }

  if (inFlight.has(key)) {
    return inFlight.get(key);
  }

  const promise = Promise.resolve()
    .then(fetcher)
    .then((value) => {
      cache.set(key, { value, staleAt: now() + ttl, expiresAt: now() + staleTtl });
      return value;
    })
    .finally(() => {
      inFlight.delete(key);
    });

  inFlight.set(key, promise);
  return promise;
}

export function invalidateCache(prefix = '') {
  for (const key of cache.keys()) {
    if (!prefix || key.startsWith(prefix)) {
      cache.delete(key);
    }
  }
}