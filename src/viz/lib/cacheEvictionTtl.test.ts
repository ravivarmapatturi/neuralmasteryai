import { describe, expect, it } from 'vitest';
import { parseCacheRequests, simulateCache } from './cacheEvictionTtl';

describe('cache eviction and TTL', () => {
  it('parses comma or space separated keys', () => {
    expect(parseCacheRequests('A, B  A')).toEqual(['A', 'B', 'A']);
  });

  it('evicts the least recently used key', () => {
    const trace = simulateCache({
      requests: ['A', 'B', 'A', 'C', 'A'], capacity: 2, policy: 'lru', ttlSeconds: 10, secondsPerRequest: 1,
    });
    expect(trace[3].evictedKey).toBe('B');
    expect(trace.at(-1)?.hits).toBe(2);
    expect(trace.at(-1)?.hitRate).toBeCloseTo(0.4);
  });

  it('expires a key when current time reaches its fixed TTL', () => {
    const trace = simulateCache({
      requests: ['A', 'A', 'A'], capacity: 2, policy: 'ttl', ttlSeconds: 2, secondsPerRequest: 1,
    });
    expect(trace[1].hit).toBe(true);
    expect(trace[2].expiredKeys).toEqual(['A']);
    expect(trace[2].hit).toBe(false);
  });

  it('uses recency to break equal-frequency LFU ties', () => {
    const trace = simulateCache({
      requests: ['A', 'B', 'C'], capacity: 2, policy: 'lfu', ttlSeconds: 10, secondsPerRequest: 1,
    });
    expect(trace[2].evictedKey).toBe('A');
  });
});
