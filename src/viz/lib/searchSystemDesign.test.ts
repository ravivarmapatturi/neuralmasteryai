import { describe, expect, it } from 'vitest';
import {
  calculateBudgetSummary,
  calculateCapacitySizing,
  DEGRADATION_LADDER,
  PRODUCTION_FUNNEL_BUDGETS,
} from './searchSystemDesign';

describe('searchSystemDesign', () => {
  describe('calculateBudgetSummary', () => {
    it('verifies that stages sum to the 100ms SLA budget', () => {
      // 5 + 25 + 10 + 40 + 10 + 10 = 100 ms
      const summary = calculateBudgetSummary(PRODUCTION_FUNNEL_BUDGETS, 100);

      expect(summary.totalBudgetP99).toBe(100);
      expect(summary.totalTypicalP99).toBeLessThanOrEqual(100);
      expect(summary.isWithinSla).toBe(true);
      expect(summary.marginMs).toBeGreaterThanOrEqual(0);
    });

    it('flags SLA violation when stages exceed SLA', () => {
      const summary = calculateBudgetSummary(PRODUCTION_FUNNEL_BUDGETS, 50);
      expect(summary.isWithinSla).toBe(false);
      expect(summary.marginMs).toBeLessThan(0);
    });
  });

  describe('DEGRADATION_LADDER', () => {
    it('has 4 monotonically decreasing latency degradation levels', () => {
      expect(DEGRADATION_LADDER).toHaveLength(4);

      for (let i = 0; i < DEGRADATION_LADDER.length - 1; i++) {
        const current = DEGRADATION_LADDER[i];
        const next = DEGRADATION_LADDER[i + 1];
        expect(next.expectedP99Ms).toBeLessThan(current.expectedP99Ms);
        expect(next.ndcgQualityEstimate).toBeLessThan(current.ndcgQualityEstimate);
      }
    });
  });

  describe('calculateCapacitySizing', () => {
    it('calculates realistic core and node counts for peak 5000 QPS', () => {
      // 5000 QPS * 0.085s / 0.65 = 425 / 0.65 = ~653.8 -> 654 cores
      // 654 cores / 16 cores per node = ~40.875 -> 41 nodes
      const sizing = calculateCapacitySizing(5000, 85, 0.65, 16);

      expect(sizing.requiredCores).toBe(654);
      expect(sizing.recommendedNodes).toBe(41);
      expect(sizing.catalogMemoryGb).toBeGreaterThan(50);
    });
  });
});
