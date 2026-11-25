import { describe, expect, it } from 'vitest';
import { analyzeBayesUpdate } from './bayesUpdate';

describe('bayesUpdate pure calculations', () => {
  it('computes exact natural frequencies and posterior for the classic 1% base-rate paradox', () => {
    const res = analyzeBayesUpdate({
      prior: 0.01,
      tpr: 0.95,
      fpr: 0.05,
      population: 1000,
      outcome: 'positive',
    });

    expect(res.sickCount).toBeCloseTo(10, 6);
    expect(res.healthyCount).toBeCloseTo(990, 6);
    expect(res.conditionMatchCount).toBeCloseTo(9.5, 6);
    expect(res.healthyMatchCount).toBeCloseTo(49.5, 6);
    expect(res.totalMatchCount).toBeCloseTo(59.0, 6);
    expect(res.evidenceProb).toBeCloseTo(0.059, 6);
    // Hand-checked: 9.5 / 59.0 = 0.161016949...
    expect(res.posterior1).toBeCloseTo(9.5 / 59, 6);
    // Second independent positive test: (0.95 * 0.161016949) / (0.95 * 0.161016949 + 0.05 * 0.83898305)
    expect(res.posterior2).toBeCloseTo(0.784781, 4);
  });

  it('shows false-positive reduction lifting posterior above 65% and higher prior above 82%', () => {
    const lowFp = analyzeBayesUpdate({
      prior: 0.01,
      tpr: 0.95,
      fpr: 0.005,
      population: 1000,
      outcome: 'positive',
    });
    // 9.5 / (9.5 + 4.95) = 9.5 / 14.45 = 0.657439...
    expect(lowFp.posterior1).toBeCloseTo(9.5 / 14.45, 6);
    expect(lowFp.posterior1).toBeGreaterThan(0.65);

    const common = analyzeBayesUpdate({
      prior: 0.2,
      tpr: 0.95,
      fpr: 0.05,
      population: 1000,
      outcome: 'positive',
    });
    // 190 / (190 + 40) = 190 / 230 = 0.826087...
    expect(common.posterior1).toBeCloseTo(190 / 230, 6);
    expect(common.posterior1).toBeGreaterThan(0.82);
  });

  it('computes exact negative-test update using false-negative and true-negative rates', () => {
    const res = analyzeBayesUpdate({
      prior: 0.01,
      tpr: 0.95,
      fpr: 0.05,
      population: 1000,
      outcome: 'negative',
    });
    // FN = 10 * 0.05 = 0.5, TN = 990 * 0.95 = 940.5, total(-) = 941.0
    expect(res.conditionMatchCount).toBeCloseTo(0.5, 6);
    expect(res.healthyMatchCount).toBeCloseTo(940.5, 6);
    expect(res.totalMatchCount).toBeCloseTo(941.0, 6);
    expect(res.posterior1).toBeCloseTo(0.5 / 941, 6);
  });
});
