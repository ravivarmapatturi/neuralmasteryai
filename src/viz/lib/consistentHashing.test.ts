import { describe, expect, it } from 'vitest';
import { analyzeConsistentHashing, parseKeyList } from './consistentHashing';

describe('consistentHashing calculation', () => {
  it('matches the lesson worked example: A=20, B=50, C=80, adding D=35 moves only key 30 (B->D)', () => {
    const res = analyzeConsistentHashing({
      membership: 'after',
      dPosition: 35,
      vnodes: 1,
      keys: [10, 30, 45, 60, 90],
    });

    expect(res.ownerGroupsBefore).toEqual({
      A: [10, 90],
      B: [30, 45],
      C: [60],
    });
    expect(res.ownerGroupsAfter).toEqual({
      A: [10, 90],
      B: [45],
      C: [60],
      D: [30],
    });
    expect(res.movedRingCount).toBe(1);
    expect(res.movedRingPct).toBeCloseTo(20, 4);
    expect(res.assignments.find((a) => a.key === 90)?.wrapsAroundZero).toBe(true);
    // Naive key % N (3 -> 4): 10(B->C), 30(A->C), 45(A->B), 60(A->A), 90(A->C) = 4/5 = 80%
    expect(res.movedModuloCount).toBe(4);
    expect(res.movedModuloPct).toBeCloseTo(80, 4);
  });

  it('places D at 70 and steals (50, 70] from C, moving key 60 from C to D', () => {
    const res = analyzeConsistentHashing({
      membership: 'after',
      dPosition: 70,
      vnodes: 1,
      keys: [10, 30, 45, 60, 90],
    });
    const moved = res.assignments.filter((a) => a.movedRing);
    expect(moved).toHaveLength(1);
    expect(moved[0].key).toBe(60);
    expect(moved[0].beforeOwner).toBe('C');
    expect(moved[0].afterOwner).toBe('D');
  });

  it('parses custom key lists cleanly into unique 0..99 positions', () => {
    expect(parseKeyList('12, 99, 105, 12, foo')).toEqual([12, 99, 5]);
    expect(parseKeyList('')).toEqual([10, 30, 45, 60, 90]);
  });
});
