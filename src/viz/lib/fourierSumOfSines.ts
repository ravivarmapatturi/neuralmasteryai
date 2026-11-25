// Pure Fourier series synthesis math for Square, Sawtooth, and Triangle waves.

export type WaveformShape = 'square' | 'sawtooth' | 'triangle';

export interface HarmonicTerm {
  k: number;
  freqHz: number;
  signedWeight: number;
  amplitude: number;
  included: boolean;
}

export interface FourierWaveSample {
  timeMs: number;
  target: number;
  reconstructed: number;
  newestTerm: number;
  inspectedTerm: number;
}

export interface FourierAnalysis {
  shape: WaveformShape;
  maxHarmonic: number;
  baseFreqHz: number;
  inspectedK: number;
  activeHarmonicCount: number;
  newestK: number;
  newestWeight: number;
  harmonics: HarmonicTerm[];
  samples: FourierWaveSample[];
  rmsError: number;
  peakHeight: number;
  gibbsOvershootPct: number;
  explain: string;
}

export const FOURIER_MAX_WINDOW_MS = 10; // 10 ms window = 1 full cycle at 100 Hz
export const FOURIER_TRACE_STEPS = [1, 3, 5, 9, 15, 25] as const;

export const WAVEFORM_META: Record<
  WaveformShape,
  { label: string; shortDesc: string; formulaHint: string }
> = {
  square: {
    label: 'Square wave (sharp jumps)',
    shortDesc: 'Only odd harmonics 1, 3, 5… with weights 4/(πk). Always keeps a ~9% Gibbs ripple at sharp jumps.',
    formulaHint: '4 / (π · k)',
  },
  sawtooth: {
    label: 'Sawtooth wave (ramp + drop)',
    shortDesc: 'Every integer harmonic 1, 2, 3… with weights 2/(πk) builds the sloped ramp and cliff.',
    formulaHint: '2 / (π · k)',
  },
  triangle: {
    label: 'Triangle wave (sharp corners)',
    shortDesc: 'Only odd harmonics with alternating signs and tiny 1/k² weights — converges smoothly with zero overshoot.',
    formulaHint: '8 · (−1)^((k−1)/2) / (π² · k²)',
  },
};

/** Exact Fourier coefficient b_k for sin(2π k f0 t) for the selected wave shape. */
export function harmonicWeight(shape: WaveformShape, k: number): number {
  if (k < 1 || !Number.isInteger(k)) return 0;
  if (shape === 'square') {
    return k % 2 === 1 ? 4 / (Math.PI * k) : 0;
  }
  if (shape === 'sawtooth') {
    return 2 / (Math.PI * k);
  }
  // Triangle wave: odd harmonics with alternating sign and 1/k^2 decay.
  if (k % 2 === 0) return 0;
  const sign = ((k - 1) / 2) % 2 === 0 ? 1 : -1;
  return (sign * 8) / (Math.PI * Math.PI * k * k);
}

/** Ideal target waveform value at normalized phase u in [0, 1) (period = 1). */
export function targetWaveformAt(shape: WaveformShape, phaseCycles: number): number {
  const u = ((phaseCycles % 1) + 1) % 1;
  if (shape === 'square') {
    if (u === 0 || Math.abs(u - 0.5) < 1e-9) return 0;
    return u < 0.5 ? 1 : -1;
  }
  if (shape === 'sawtooth') {
    if (u === 0) return 0;
    return 1 - 2 * u;
  }
  // Triangle wave matched to odd-sine phase: 0 -> +1 (u=0.25) -> 0 (u=0.5) -> -1 (u=0.75) -> 0
  if (u <= 0.25) return 4 * u;
  if (u <= 0.75) return 2 - 4 * u;
  return 4 * u - 4;
}

/** Computes exact partial Fourier sum S_N(t), per-harmonic spectrum, RMS error, and Gibbs overshoot. */
export function analyzeFourierSynthesis({
  shape = 'square',
  maxHarmonic = 9,
  baseFreqHz = 100,
  inspectedK,
  sampleCount = 300,
}: {
  shape?: WaveformShape;
  maxHarmonic?: number;
  baseFreqHz?: number;
  inspectedK?: number;
  sampleCount?: number;
} = {}): FourierAnalysis {
  const clampedMaxK = Math.max(1, Math.min(49, Math.round(maxHarmonic)));
  const clampedFreqHz = Math.max(50, Math.min(400, Math.round(baseFreqHz)));
  const displayMaxK = Math.max(25, clampedMaxK);

  const harmonics: HarmonicTerm[] = [];
  for (let k = 1; k <= displayMaxK; k++) {
    if (shape !== 'sawtooth' && k % 2 === 0) continue;
    const signedWeight = harmonicWeight(shape, k);
    harmonics.push({
      k,
      freqHz: k * clampedFreqHz,
      signedWeight,
      amplitude: Math.abs(signedWeight),
      included: k <= clampedMaxK,
    });
  }

  const includedTerms = harmonics.filter((h) => h.included);
  const newestTermMeta = includedTerms[includedTerms.length - 1] ?? harmonics[0];
  const activeInspect =
    harmonics.find((h) => h.k === inspectedK) ?? newestTermMeta;

  const samples: FourierWaveSample[] = [];
  let sumSqErr = 0;
  let peakHeight = 0;

  for (let i = 0; i < sampleCount; i++) {
    const timeMs = (i / (sampleCount - 1)) * FOURIER_MAX_WINDOW_MS;
    const phaseCycles = (timeMs / 1000) * clampedFreqHz;
    const target = targetWaveformAt(shape, phaseCycles);

    let reconstructed = 0;
    for (const term of includedTerms) {
      reconstructed += term.signedWeight * Math.sin(2 * Math.PI * term.k * phaseCycles);
    }
    const newestTerm =
      newestTermMeta.signedWeight *
      Math.sin(2 * Math.PI * newestTermMeta.k * phaseCycles);
    const inspectedTerm =
      activeInspect.signedWeight *
      Math.sin(2 * Math.PI * activeInspect.k * phaseCycles);

    const err = reconstructed - target;
    sumSqErr += err * err;
    if (Math.abs(reconstructed) > peakHeight) {
      peakHeight = Math.abs(reconstructed);
    }

    samples.push({
      timeMs,
      target,
      reconstructed,
      newestTerm,
      inspectedTerm,
    });
  }

  const rmsError = Math.sqrt(sumSqErr / Math.max(1, sampleCount));
  // Peak overshoot above the ideal +1/-1 height, as % of the jump height (2.0 for square/sawtooth)
  const rawOvershoot = Math.max(0, peakHeight - 1);
  const gibbsOvershootPct = shape === 'triangle' ? 0 : (rawOvershoot / 2) * 100;

  let explain = '';
  if (includedTerms.length === 1) {
    explain = `With just k = 1 (${clampedFreqHz} Hz), we only have one pure sine wave of height ${newestTermMeta.amplitude.toFixed(3)} — rough round hills, no sharp corners yet.`;
  } else if (shape === 'triangle') {
    explain = `Added ${includedTerms.length} odd sine waves up to k = ${newestTermMeta.k}. Because weights shrink fast as 1/k², RMS error drops to ${rmsError.toFixed(3)} with zero edge overshoot.`;
  } else {
    explain = `Stacked ${includedTerms.length} sine waves up to k = ${newestTermMeta.k} (${newestTermMeta.freqHz} Hz, weight ${newestTermMeta.amplitude.toFixed(3)}). RMS error is ${rmsError.toFixed(3)}, while the jump horn peaks at ${peakHeight.toFixed(2)} (${gibbsOvershootPct.toFixed(1)}% Gibbs overshoot).`;
  }

  return {
    shape,
    maxHarmonic: clampedMaxK,
    baseFreqHz: clampedFreqHz,
    inspectedK: activeInspect.k,
    activeHarmonicCount: includedTerms.length,
    newestK: newestTermMeta.k,
    newestWeight: newestTermMeta.signedWeight,
    harmonics,
    samples,
    rmsError,
    peakHeight,
    gibbsOvershootPct,
    explain,
  };
}
