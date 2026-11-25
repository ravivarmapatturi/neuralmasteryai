import { describe, expect, it } from 'vitest';
import {
  SHAPLEY_PRESETS,
  computeShapleyAnalysis,
  explainShapleyStep,
} from './shapleyCoalitions';

describe('shapleyCoalitions calculation library', () => {
  it('spot-checks all 6 permutations by hand for the Classical Interpretability loan game', () => {
    const def = SHAPLEY_PRESETS.find((p) => p.id === 'loan-default')!;
    const analysis = computeShapleyAnalysis(def.params);

    expect(analysis.baseline).toBe(50);
    expect(analysis.coalitionValues.I).toBe(70);
    expect(analysis.coalitionValues.A).toBe(55);
    expect(analysis.coalitionValues.C).toBe(60);
    expect(analysis.coalitionValues.AI).toBe(78);
    expect(analysis.coalitionValues.CI).toBe(85);
    expect(analysis.coalitionValues.AC).toBe(65);
    expect(analysis.fullPrediction).toBe(90);

    // Hand check Income's 6 marginals:
    // I->A->C: 70-50=20, I->C->A: 70-50=20, A->I->C: 78-55=23,
    // A->C->I: 90-65=25, C->I->A: 85-60=25, C->A->I: 90-65=25; sum = 138, 138/6 = 23.0
    expect(analysis.orderings.map((o) => o.deltas.I)).toEqual([20, 20, 23, 25, 25, 25]);
    // Credit marginals: 12, 15, 12, 10, 10, 10 => sum = 69, 69/6 = 11.5
    expect(analysis.orderings.map((o) => o.deltas.C)).toEqual([12, 15, 12, 10, 10, 10]);
    // Age marginals: 8, 5, 5, 5, 5, 5 => sum = 33, 33/6 = 5.5
    expect(analysis.orderings.map((o) => o.deltas.A)).toEqual([8, 5, 5, 5, 5, 5]);

    expect(analysis.shapleyValues.I).toBeCloseTo(23.0);
    expect(analysis.shapleyValues.C).toBeCloseTo(11.5);
    expect(analysis.shapleyValues.A).toBeCloseTo(5.5);
    expect(analysis.efficiencySum).toBeCloseTo(90.0);
    expect(analysis.efficiencyResidual).toBeCloseTo(0);
  });

  it('gives a zero-marginal dummy feature strictly 0.0 Shapley attribution', () => {
    const dummy = SHAPLEY_PRESETS.find((p) => p.id === 'dummy-age')!;
    const analysis = computeShapleyAnalysis(dummy.params);
    expect(analysis.shapleyValues.A).toBe(0);
    expect(analysis.efficiencyResidual).toBeCloseTo(0);
  });

  it('splits interaction surplus symmetrically between cooperating features', () => {
    const synergy = SHAPLEY_PRESETS.find((p) => p.id === 'pure-synergy')!;
    const analysis = computeShapleyAnalysis(synergy.params);
    expect(analysis.shapleyValues.I).toBeCloseTo(20);
    expect(analysis.shapleyValues.C).toBeCloseTo(20);
    expect(analysis.shapleyValues.A).toBeCloseTo(10);
    expect(analysis.efficiencySum).toBeCloseTo(90);
    expect(explainShapleyStep(analysis, 0, 'I')).toContain('income');
  });
});
