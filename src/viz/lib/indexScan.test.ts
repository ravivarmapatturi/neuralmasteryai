import { describe, expect, it } from 'vitest';
import { buildToySearchSteps, computeIndexScanComparison } from './indexScan';

describe('indexScan computation', () => {
  it('computes hand-checked O(n) vs O(log2 n) comparisons for 16 and 1,000,000 rows', () => {
    const small = computeIndexScanComparison(16, 0);
    expect(small.scanChecks).toBe(16);
    expect(small.btreeChecks).toBe(4);
    expect(small.speedup).toBe(4);

    const million = computeIndexScanComparison(1_000_000, 0);
    expect(million.scanChecks).toBe(1_000_000);
    expect(million.btreeChecks).toBe(20);
    expect(million.speedup).toBe(50_000);
    expect(million.pages).toBe(10_000);
    expect(million.treeDepth).toBe(3);
    expect(million.seqIoCost).toBe(10_000);
    expect(million.indexIoCost).toBeCloseTo(7, 10);
    expect(million.plannerChoice).toBe('index');
  });

  it('switches the query planner back to sequential scan on tiny tables and unselective 40% filters', () => {
    const tiny = computeIndexScanComparison(10, 0);
    expect(tiny.pages).toBe(1);
    expect(tiny.seqIoCost).toBe(1);
    expect(tiny.indexIoCost).toBe(5);
    expect(tiny.plannerChoice).toBe('seq-scan');

    const unselective = computeIndexScanComparison(1_000_000, 40);
    expect(unselective.matchingRows).toBe(400_000);
    expect(unselective.indexIoCost).toBeGreaterThan(unselective.seqIoCost);
    expect(unselective.plannerChoice).toBe('seq-scan');
  });

  it('builds a 4-step toy search trace landing on the exact branch and leaf for any target ID', () => {
    const steps = buildToySearchSteps(14);
    expect(steps).toHaveLength(4);
    expect(steps[1].activeBranchIdx).toBe(3); // 13-16 branch
    expect(steps[3].btreeHops).toBe(3);
    expect(steps[3].foundLeafId).toBe(14);
    expect(steps[3].scanVisitedCount).toBe(14);
  });
});
