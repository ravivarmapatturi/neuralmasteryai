import { describe, expect, it } from 'vitest';
import { linearAlphaBars, cosineAlphaBars, diffuse, snrDb, correlation, seededNoise, makeSignal, firstStepBelow } from './diffusionForward';

describe('diffusion forward process', () => {
  it('linear schedule matches the hand product of (1 - beta)', () => {
    const bars = linearAlphaBars(3, 0.1, 0.3);
    // betas 0.1, 0.2, 0.3 -> 0.9, 0.72, 0.504
    expect(bars[0]).toBeCloseTo(0.9, 10);
    expect(bars[1]).toBeCloseTo(0.72, 10);
    expect(bars[2]).toBeCloseTo(0.504, 10);
  });

  it('both schedules decrease from near 1 to near 0', () => {
    for (const bars of [linearAlphaBars(1000), cosineAlphaBars(1000)]) {
      expect(bars[0]).toBeGreaterThan(0.99);
      expect(bars[999]).toBeLessThan(0.01);
      for (let i = 1; i < bars.length; i++) expect(bars[i]).toBeLessThanOrEqual(bars[i - 1] + 1e-12);
    }
  });

  it('cosine keeps more signal than linear halfway through', () => {
    expect(cosineAlphaBars(1000)[499]).toBeGreaterThan(linearAlphaBars(1000)[499]);
  });

  it('diffuse applies sqrt(ab) x0 + sqrt(1-ab) eps', () => {
    const x = diffuse([1, -1], [0.5, 2], 0.64);
    expect(x[0]).toBeCloseTo(0.8 * 1 + 0.6 * 0.5, 10);
    expect(x[1]).toBeCloseTo(-0.8 + 0.6 * 2, 10);
  });

  it('snr is 0 dB when signal and noise variances are equal', () => {
    expect(snrDb(0.5)).toBeCloseTo(0, 10);
    expect(snrDb(10 / 11)).toBeCloseTo(10, 10);
  });

  it('correlation is 1 for identical and near 0 when fully noised', () => {
    const x0 = makeSignal('bump', 64);
    expect(correlation(x0, x0)).toBeCloseTo(1, 10);
    const eps = seededNoise(64, 3);
    expect(Math.abs(correlation(x0, diffuse(x0, eps, 0)))).toBeLessThan(0.4);
  });

  it('seeded noise is reproducible and roughly standard normal', () => {
    const a = seededNoise(4000, 11);
    expect(a).toEqual(seededNoise(4000, 11));
    const mean = a.reduce((s, v) => s + v, 0) / a.length;
    const variance = a.reduce((s, v) => s + (v - mean) ** 2, 0) / a.length;
    expect(Math.abs(mean)).toBeLessThan(0.06);
    expect(variance).toBeGreaterThan(0.9);
    expect(variance).toBeLessThan(1.1);
  });

  it('finds the first step below a threshold', () => {
    expect(firstStepBelow([0.9, 0.6, 0.4], 0.5)).toBe(3);
    expect(firstStepBelow([0.9], 0.5)).toBeNull();
  });
});
