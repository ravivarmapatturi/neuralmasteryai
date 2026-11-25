import { describe, expect, it } from 'vitest';
import {
  analyzeErrorBudget,
  buildSimulationHours,
  explainErrorBudgetStep,
  simulateBudgetAtHour,
} from './errorBudget';

describe('errorBudget calculation library', () => {
  it('spot-checks exact 20x burn, 36.0h exhaustion, and 18h midpoint counts by hand', () => {
    const res = analyzeErrorBudget({
      sloPercent: 99.9,
      observedErrorPercent: 2.0,
      windowDays: 30,
      rps: 1000,
    });
    expect(res.allowedBadPercent).toBe(0.1);
    expect(res.burnRate).toBe(20);
    expect(res.oneHourBudgetPercent).toBeCloseTo(20 / 720 * 100, 6);
    expect(res.exhaustionHours).toBe(36);
    expect(res.timeBudgetMinutes).toBeCloseTo(43.2, 6);
    expect(res.allowedBadRequests).toBe(2_592_000);
    expect(res.failedRequestsPerHour).toBe(72_000);
    expect(res.alertLevel).toBe('fast-burn-page');

    // Halfway to exhaustion (18h): exactly 50% spent and 1,296,000 failed requests
    const half = simulateBudgetAtHour(res, 18);
    expect(half.budgetConsumedPercent).toBeCloseTo(50, 6);
    expect(half.budgetRemainingPercent).toBeCloseTo(50, 6);
    expect(half.failedRequestsSoFar).toBe(1_296_000);
  });

  it('handles zero failures cleanly with infinite exhaustion time and no consumption', () => {
    const res = analyzeErrorBudget({
      sloPercent: 99.9,
      observedErrorPercent: 0,
      windowDays: 30,
      rps: 1000,
    });
    expect(res.burnRate).toBe(0);
    expect(res.exhaustionHours).toBe(Infinity);
    expect(res.alertLevel).toBe('none');

    const pt = simulateBudgetAtHour(res, 12);
    expect(pt.budgetConsumedPercent).toBe(0);
    expect(pt.budgetRemainingPercent).toBe(100);
    expect(explainErrorBudgetStep(res, pt)).toContain('zero error budget is spent');
  });

  it('scales request counts linearly with RPS and shrinks budgets by 10x at 99.99%', () => {
    const s999 = analyzeErrorBudget({ sloPercent: 99.9, observedErrorPercent: 1.0, windowDays: 30, rps: 1000 });
    const s9999 = analyzeErrorBudget({ sloPercent: 99.99, observedErrorPercent: 1.0, windowDays: 30, rps: 1000 });
    expect(s9999.burnRate).toBeCloseTo(s999.burnRate * 10, 4);
    expect(s9999.exhaustionHours).toBeCloseTo(s999.exhaustionHours / 10, 4);

    const hours = buildSimulationHours(s999);
    expect(hours[0]).toBe(0);
    expect(hours).toContain(1);
  });
});
