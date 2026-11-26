export type CachePolicy = 'lru' | 'lfu' | 'ttl';

export interface CacheSimulationConfig {
  requests: string[];
  capacity: number;
  policy: CachePolicy;
  ttlSeconds: number;
  secondsPerRequest: number;
}

export interface CacheEntrySnapshot {
  key: string;
  insertedAt: number;
  lastUsedAt: number;
  frequency: number;
  expiresAt: number;
}

export interface CacheTraceStep {
  index: number;
  timeSeconds: number;
  request: string;
  hit: boolean;
  evictedKey?: string;
  expiredKeys: string[];
  entries: CacheEntrySnapshot[];
  hits: number;
  misses: number;
  hitRate: number;
}

interface MutableEntry extends CacheEntrySnapshot {}

export function parseCacheRequests(text: string): string[] {
  return text
    .split(/[\s,]+/)
    .map((key) => key.trim())
    .filter(Boolean)
    .slice(0, 16);
}

function victim(entries: MutableEntry[], policy: CachePolicy): MutableEntry {
  return [...entries].sort((left, right) => {
    if (policy === 'lfu' && left.frequency !== right.frequency) return left.frequency - right.frequency;
    if (policy === 'ttl' && left.expiresAt !== right.expiresAt) return left.expiresAt - right.expiresAt;
    return left.lastUsedAt - right.lastUsedAt || left.insertedAt - right.insertedAt || left.key.localeCompare(right.key);
  })[0];
}

/** Runs LRU, LFU, or fixed write-time TTL against the exact request sequence. */
export function simulateCache(input: CacheSimulationConfig): CacheTraceStep[] {
  const capacity = Math.max(1, Math.round(input.capacity));
  const ttlSeconds = Math.max(1, input.ttlSeconds);
  const secondsPerRequest = Math.max(0, input.secondsPerRequest);
  const entries: MutableEntry[] = [];
  const trace: CacheTraceStep[] = [];
  let hits = 0;
  let misses = 0;

  input.requests.forEach((request, index) => {
    const timeSeconds = index * secondsPerRequest;
    const expiredKeys: string[] = [];
    if (input.policy === 'ttl') {
      for (let cursor = entries.length - 1; cursor >= 0; cursor -= 1) {
        if (entries[cursor].expiresAt <= timeSeconds) {
          expiredKeys.unshift(entries[cursor].key);
          entries.splice(cursor, 1);
        }
      }
    }

    const found = entries.find((entry) => entry.key === request);
    let evictedKey: string | undefined;
    if (found) {
      hits += 1;
      found.lastUsedAt = timeSeconds;
      found.frequency += 1;
    } else {
      misses += 1;
      if (entries.length >= capacity) {
        const removed = victim(entries, input.policy);
        evictedKey = removed.key;
        entries.splice(entries.indexOf(removed), 1);
      }
      entries.push({
        key: request,
        insertedAt: timeSeconds,
        lastUsedAt: timeSeconds,
        frequency: 1,
        expiresAt: timeSeconds + ttlSeconds,
      });
    }

    const ordered = [...entries].sort((left, right) => left.lastUsedAt - right.lastUsedAt || left.key.localeCompare(right.key));
    trace.push({
      index,
      timeSeconds,
      request,
      hit: Boolean(found),
      evictedKey,
      expiredKeys,
      entries: ordered.map((entry) => ({ ...entry })),
      hits,
      misses,
      hitRate: hits / (hits + misses),
    });
  });

  return trace;
}
