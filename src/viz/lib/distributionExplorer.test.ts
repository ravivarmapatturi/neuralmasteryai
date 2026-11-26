import { describe, expect, it } from 'vitest';
import { analyzeDistribution, normalCdf } from './distributionExplorer';

describe('distributionExplorer pure calculations', () => {
  it('hand-checks Bernoulli(p=0.7) and Binomial(n=10 vs n=20 at p=0.5)', () => {
    const bern = analyzeDistribution({ family: 'bernoulli', p: 0.7, probeStep: 1 });
    expect(bern.bars.map((b) => Number(b.prob.toFixed(2)))).toEqual([0.3, 0.7]);
    expect(bern.mean).toBeCloseTo(0.7, 6);
    expect(bern.variance).toBeCloseTo(0.21, 6);

    const bin10 = analyzeDistribution({ family: 'binomial', n: 10, p: 0.5, probeStep: 2 });
    const bin20 = analyzeDistribution({ family: 'binomial', n: 20, p: 0.5, probeStep: 2 });
    expect(bin10.mean).toBeCloseTo(5.0, 6);
    expect(bin10.variance).toBeCloseTo(2.5, 6);
    // C(10, 5) * 0.5^10 = 252 / 1024 = 0.24609375
    expect(bin10.bars[5].prob).toBeCloseTo(252 / 1024, 6);
    expect(bin10.totalMass).toBeCloseTo(1.0, 6);

    // Doubling n from 10 to 20 doubles mean (5 -> 10) and doubles variance (2.5 -> 5.0)
    expect(bin20.mean).toBeCloseTo(10.0, 6);
    expect(bin20.variance).toBeCloseTo(5.0, 6);
  });

  it('hand-checks Gaussian(mu=0, sigma=1) peak density, 68% +/-1 sigma band, and Categorical softmax', () => {
    const gauss = analyzeDistribution({ family: 'gaussian', mu: 0, sigma: 1, probeStep: 2 });
    expect(gauss.mean).toBe(0);
    expect(gauss.variance).toBe(1);
    expect(gauss.probeValue).toBe(0);
    expect(gauss.probeProbOrDensity).toBeCloseTo(1 / Math.sqrt(2 * Math.PI), 5);
    expect(gauss.probeCdf).toBeCloseTo(0.5, 4);
    expect(normalCdf(1, 0, 1) - normalCdf(-1, 0, 1)).toBeCloseTo(0.6827, 3);

    const catT1 = analyzeDistribution({ family: 'categorical', temperature: 1.0, probeStep: 0 });
    expect(catT1.bars[0].label).toBe('the');
    expect(catT1.bars[0].prob).toBeCloseTo(0.35, 2);
    expect(catT1.bars.reduce((s, b) => s + b.prob, 0)).toBeCloseTo(1.0, 6);

    const catSharp = analyzeDistribution({ family: 'categorical', temperature: 0.3, probeStep: 0 });
    expect(catSharp.bars[0].prob).toBeGreaterThan(catT1.bars[0].prob);
    expect(catSharp.entropyBits).toBeLessThan(catT1.entropyBits);
  });
});
