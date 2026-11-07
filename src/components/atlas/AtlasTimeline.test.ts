import { describe, expect, it } from 'vitest';
import { atlasEntries, atlasLinks } from './AtlasTimeline';

describe('Atlas timeline data', () => {
  it('holds every entry with a usable year', () => {
    expect(atlasEntries).toHaveLength(112);
    expect(atlasEntries.every((e) => e.year >= 1950 && e.year <= 2025)).toBe(true);
  });
  it('only links real entries, and never backwards in time', () => {
    const years = new Map(atlasEntries.map((e) => [e.key, e.year]));
    for (const [a, b] of atlasLinks) {
      expect(years.has(a), a).toBe(true);
      expect(years.has(b), b).toBe(true);
      expect(years.get(a)!, `${a} > ${b}`).toBeLessThanOrEqual(years.get(b)!);
    }
  });
});

describe('Atlas timeline zoom', () => {
  it('maps every range onto the full width', async () => {
    const { ATLAS_RANGES, scale } = await import('./AtlasTimeline');
    for (const r of ATLAS_RANGES) {
      expect(scale(r.from, r.from)).toBe(0);
      for (const e of atlasEntries.filter((x) => x.year >= r.from)) {
        const s = scale(e.year, r.from);
        expect(s).toBeGreaterThanOrEqual(0);
        expect(s).toBeLessThan(1);
      }
    }
  });
});
