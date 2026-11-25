import { describe, expect, it } from 'vitest';
import { analyzeLasso } from './lassoExplorer';
import { generateData, lassoSolve, mse } from './lasso';

describe('lassoExplorer pure calculations', () => {
  it('matches lasso.ts exact coordinate-descent solution and KKT fee check', () => {
    const rows = generateData(40, 0.9, 1.5, 5);
    const expected = lassoSolve(rows, 2.5);
    const res = analyzeLasso({ correlation: 0.9, noise: 1.5, seed: 5, lambda: 2.5 });

    const expectedWeights = expected.w.map((v) => (v === 0 ? 0 : v));
    expect(res.currentWeights).toEqual(expectedWeights);
    expect(res.currentMse).toBeCloseTo(mse(rows, expected.b, expected.w), 12);

    // At lambda = 2.5, n = 40 -> scaledFee = (2.5 * 40) / 2 = 50
    expect(res.scaledFee).toBe(50);

    // Both x3 (noise) and x4 (weak cue) drop to exact 0 by lambda=2.5 on seed=5, corr=0.9
    expect(res.features[2].weight).toBe(0);
    expect(res.features[2].dropped).toBe(true);
    expect(res.features[3].weight).toBe(0);
    expect(res.features[3].dropped).toBe(true);
    expect(res.zeroedCount).toBe(2);

    // Hand-checked KKT certificate: dropped features satisfy |rho| <= scaledFee;
    // kept features satisfy |rho| - scaledFee == z * |w|.
    for (const f of res.features) {
      if (f.dropped) {
        expect(f.absRho).toBeLessThanOrEqual(res.scaledFee + 1e-6);
      } else {
        expect((f.absRho - res.scaledFee) / f.z).toBeCloseTo(Math.abs(f.weight), 4);
      }
    }
  });

  it('drops x3 (noise) early at lambda = 0.25', () => {
    const res = analyzeLasso({ correlation: 0.9, noise: 1.5, seed: 5, lambda: 0.25 });
    expect(res.features[2].weight).toBe(0);
    expect(res.features[2].dropped).toBe(true);
    expect(res.features[0].weight).toBeGreaterThan(1.5);
  });
});
