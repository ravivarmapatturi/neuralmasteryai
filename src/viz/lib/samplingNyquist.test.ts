import { describe, expect, it } from 'vitest';
import { analyzeSampling, explainNyquistStep } from './samplingNyquist';

describe('samplingNyquist calculation library', () => {
  it('spot-checks 7 kHz at 10 kHz folding to -3 kHz (3 kHz heard) through every sample dot', () => {
    const res = analyzeSampling({ freqKHz: 7, sampleRateKHz: 10, antiAliasFilter: false });
    expect(res.nyquistKHz).toBeCloseTo(5.0);
    expect(res.isAliased).toBe(true);
    expect(res.foldMultiple).toBe(1);
    expect(res.signedDeltaKHz).toBeCloseTo(-3.0);
    expect(res.aliasFreqKHz).toBeCloseTo(3.0);
    expect(res.phaseInverted).toBe(true);
    expect(res.samples).toHaveLength(11);

    // Hand check sample i=1 (t = 0.1 ms): sin(2*pi*7*0.1) = sin(1.4*pi) = -sin(0.4*pi)
    expect(res.samples[1].timeMs).toBeCloseTo(0.1, 9);
    expect(res.samples[1].amplitude).toBeCloseTo(-Math.sin(0.4 * Math.PI), 9);
    // Reconstructed -3 kHz wave at t = 0.1 ms: sin(-0.6*pi) = -sin(0.6*pi) = -sin(0.4*pi)
    for (const pt of res.samples) {
      expect(res.reconstructedAmplitudeAt(pt.timeMs)).toBeCloseTo(pt.amplitude, 8);
    }
  });

  it('captures a 7 kHz tone cleanly at 16 kHz (Nyquist 8 kHz)', () => {
    const res = analyzeSampling({ freqKHz: 7, sampleRateKHz: 16, antiAliasFilter: false });
    expect(res.nyquistKHz).toBeCloseTo(8.0);
    expect(res.isAliased).toBe(false);
    expect(res.reconstructedFreqKHz).toBeCloseTo(7.0);
    expect(explainNyquistStep(res, 3)).toContain('Clean capture');
  });

  it('detects zero-crossing collapse at f = fs/2 and odd multiples like 15 kHz @ 10 kHz', () => {
    const exactBoundary = analyzeSampling({ freqKHz: 5, sampleRateKHz: 10, antiAliasFilter: false });
    expect(exactBoundary.isExactNyquistBoundary).toBe(true);
    expect(exactBoundary.hitsZeroCrossings).toBe(true);
    expect(exactBoundary.reconstructedFreqKHz).toBeNull();
    for (const pt of exactBoundary.samples) {
      expect(pt.amplitude).toBeCloseTo(0, 9);
    }

    const oddMultiple = analyzeSampling({ freqKHz: 15, sampleRateKHz: 10, antiAliasFilter: false });
    expect(oddMultiple.hitsZeroCrossings).toBe(true);
    expect(oddMultiple.reconstructedFreqKHz).toBeNull();
    for (const pt of oddMultiple.samples) {
      expect(pt.amplitude).toBeCloseTo(0, 9);
    }
  });

  it('blocks frequencies above Nyquist when anti-alias pre-filter is ON', () => {
    const res = analyzeSampling({ freqKHz: 7, sampleRateKHz: 10, antiAliasFilter: true });
    expect(res.filteredOut).toBe(true);
    expect(res.reconstructedFreqKHz).toBeNull();
    for (const pt of res.samples) {
      expect(pt.amplitude).toBe(0);
    }
  });
});
