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
