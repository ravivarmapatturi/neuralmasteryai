import { describe, expect, it } from 'vitest';
import { analyzeColdStart, evaluateAtK } from './coldStart';

describe('coldStart pure calculations', () => {
  it('gives zero collaborative weight at k=0 while content fallback works immediately', () => {
    const res = analyzeColdStart({
      entity: 'new-user',
      interactions: 0,
      richness: 'basic',
      exploreRate: 0,
      focus: 'hybrid',
    });

    expect(res.collabWeight).toBe(0);
    expect(res.contentWeight).toBe(1);
    // Hand check: popularity = 0.42, content = 0.42 + 0.65 * 0.28 = 0.602, collab = 0.12
    expect(res.current.popularity).toBeCloseTo(0.42, 6);
    expect(res.current.content).toBeCloseTo(0.602, 6);
    expect(res.current.collab).toBeCloseTo(0.12, 6);
    expect(res.current.hybrid).toBeCloseTo(0.602, 6);
    expect(res.rankedItems[0].id).toBe('topic-match');
  });

  it('reaches exact 50/50 shrinkage weight when effectiveK equals priorCountK0=8', () => {
    const pt = evaluateAtK(8, 'rich', 0);
    expect(pt.collabWeight).toBeCloseTo(0.5, 6);
    // collab = 0.12 + 0.78 * 0.5 = 0.51
    expect(pt.collab).toBeCloseTo(0.51, 6);
    // rich content = 0.42 + 1.0 * 0.28 = 0.70
    expect(pt.content).toBeCloseTo(0.7, 6);
  });

  it('crosses over and promotes collaborative niche pick when interactions reach k=35', () => {
    const res = analyzeColdStart({
      entity: 'new-user',
      interactions: 35,
      richness: 'basic',
      exploreRate: 0.1,
      focus: 'hybrid',
    });

    // effectiveK = 35 * 1.2 = 42, weight = 42 / 50 = 0.84
    expect(res.effectiveK).toBeCloseTo(42, 6);
    expect(res.collabWeight).toBeCloseTo(0.84, 6);
    expect(res.current.collab).toBeGreaterThan(res.current.content);
    expect(res.current.hybrid).toBeGreaterThan(res.current.collab);
    expect(res.rankedItems[0].id).toBe('niche-gem');
  });
});
