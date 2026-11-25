import { describe, expect, it } from 'vitest';
import { analyzeNeuralOperator } from './neuralOperator';
import { SPATIAL_GRID, diffuse, initialCondition } from './aiforscience';

describe('neuralOperator physics & spectrum', () => {
  it('matches aiforscience.ts closed-form Gaussian convolution exactly on default 40-pt grid', () => {
    const res = analyzeNeuralOperator({
      kind: 'double-bump',
      time: 2.0,
      diffusivity: 0.3,
      gridCount: 40,
    });
    const expectedInit = initialCondition('double-bump');
    const expectedDiff = diffuse(expectedInit, 2.0, 0.3);

    expect(res.sigma).toBeCloseTo(Math.sqrt(2 * 0.3 * 2.0), 6);
    expect(res.points).toHaveLength(SPATIAL_GRID.length);
    for (let i = 0; i < res.points.length; i++) {
      expect(res.points[i].u0).toBeCloseTo(expectedInit[i], 8);
      expect(res.points[i].ut).toBeCloseTo(expectedDiff[i], 8);
    }
  });

  it('rounds square pulse corners immediately at small t=0.2 and damps high Fourier modes', () => {
    const t0 = analyzeNeuralOperator({ kind: 'square', time: 0, diffusivity: 0.3, gridCount: 40 });
    const tEarly = analyzeNeuralOperator({ kind: 'square', time: 0.2, diffusivity: 0.3, gridCount: 40 });

    expect(t0.highFreqRetainedPct).toBeCloseTo(100, 1);
    // High frequencies (k >= 3) drop substantially even by t=0.2
    expect(tEarly.highFreqRetainedPct).toBeLessThan(70);
    // And peak flattens monotonically at late time
    const tLate = analyzeNeuralOperator({ kind: 'square', time: 4.0, diffusivity: 0.3, gridCount: 40 });
    expect(tLate.evolvedPeak).toBeLessThan(tEarly.evolvedPeak);
  });

  it('exhibits discretization invariance across grid counts nx=20 vs nx=80', () => {
    const coarse = analyzeNeuralOperator({ kind: 'single-bump', time: 1.5, diffusivity: 0.3, gridCount: 20 });
    const fine = analyzeNeuralOperator({ kind: 'single-bump', time: 1.5, diffusivity: 0.3, gridCount: 80 });
    // Center height (at x ≈ 0) stays closely invariant across resolutions
    expect(Math.abs(coarse.evolvedPeak - fine.evolvedPeak)).toBeLessThan(0.03);
  });
});
