import { describe, expect, it } from 'vitest';
import {
  analyzeFourierSynthesis,
  harmonicWeight,
  targetWaveformAt,
} from './fourierSumOfSines';

describe('fourierSumOfSines', () => {
  it('computes exact hand-checked harmonic weights for square, sawtooth, and triangle waves', () => {
    // Square: 4 / (pi * k) for odd k, 0 for even k
    expect(harmonicWeight('square', 1)).toBeCloseTo(4 / Math.PI, 6);
    expect(harmonicWeight('square', 2)).toBe(0);
    expect(harmonicWeight('square', 3)).toBeCloseTo(4 / (3 * Math.PI), 6);

    // Sawtooth: 2 / (pi * k) for all integer k >= 1
    expect(harmonicWeight('sawtooth', 1)).toBeCloseTo(2 / Math.PI, 6);
    expect(harmonicWeight('sawtooth', 2)).toBeCloseTo(1 / Math.PI, 6);

    // Triangle: alternating 8 * (-1)^((k-1)/2) / (pi^2 * k^2)
    expect(harmonicWeight('triangle', 1)).toBeCloseTo(8 / (Math.PI * Math.PI), 6);
    expect(harmonicWeight('triangle', 3)).toBeCloseTo(-8 / (9 * Math.PI * Math.PI), 6);
    expect(harmonicWeight('triangle', 2)).toBe(0);
  });

  it('evaluates exact partial sum at t = 2.5 ms (quarter cycle at 100 Hz)', () => {
    const res = analyzeFourierSynthesis({
      shape: 'square',
      maxHarmonic: 3,
      baseFreqHz: 100,
      sampleCount: 401,
    });
    // index 100 -> timeMs = 2.5 ms -> phaseCycles = 0.25
    const q = res.samples[100];
    expect(q.timeMs).toBeCloseTo(2.5, 6);
    expect(q.target).toBe(1);
    // 4/pi * (sin(pi/2) + (1/3)*sin(3*pi/2)) = 4/pi * (1 - 1/3) = 8 / (3*pi)
    expect(q.reconstructed).toBeCloseTo(8 / (3 * Math.PI), 5);
  });

  it('reduces RMS error as more harmonics are added while preserving Gibbs overshoot on square waves', () => {
    const k1 = analyzeFourierSynthesis({ shape: 'square', maxHarmonic: 1, sampleCount: 400 });
    const k9 = analyzeFourierSynthesis({ shape: 'square', maxHarmonic: 9, sampleCount: 400 });
    const k25 = analyzeFourierSynthesis({ shape: 'square', maxHarmonic: 25, sampleCount: 400 });

    expect(k9.rmsError).toBeLessThan(k1.rmsError);
    expect(k25.rmsError).toBeLessThan(k9.rmsError);
    // Square wave partial sums overshoot 1.0 toward ~1.179 (~9% of the jump of 2)
    expect(k25.peakHeight).toBeGreaterThan(1.14);
    expect(k25.gibbsOvershootPct).toBeGreaterThan(7);
  });

  it('triangle wave converges with zero Gibbs overshoot and exact endpoints', () => {
    expect(targetWaveformAt('triangle', 0)).toBe(0);
    expect(targetWaveformAt('triangle', 0.25)).toBe(1);
    expect(targetWaveformAt('triangle', 0.75)).toBe(-1);

    const tri = analyzeFourierSynthesis({ shape: 'triangle', maxHarmonic: 15, sampleCount: 400 });
    expect(tri.gibbsOvershootPct).toBe(0);
    expect(tri.rmsError).toBeLessThan(0.03);
  });
});
