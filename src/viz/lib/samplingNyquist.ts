export type NyquistPresetId = 'aliased-7-at-10' | 'clean-7-at-16' | 'nyquist-boundary' | 'cd-audio';

export interface NyquistPreset {
  id: NyquistPresetId;
  label: string;
  freqKHz: number;
  sampleRateKHz: number;
  antiAliasFilter: boolean;
}

export const NYQUIST_PRESETS: readonly NyquistPreset[] = [
  {
    id: 'aliased-7-at-10',
    label: '7 kHz @ 10 kHz (Fake 3 kHz)',
    freqKHz: 7.0,
    sampleRateKHz: 10.0,
    antiAliasFilter: false,
  },
  {
    id: 'clean-7-at-16',
    label: '7 kHz @ 16 kHz (Clean speech)',
    freqKHz: 7.0,
    sampleRateKHz: 16.0,
    antiAliasFilter: false,
  },
  {
    id: 'nyquist-boundary',
    label: '5 kHz @ 10 kHz (Hits every zero)',
    freqKHz: 5.0,
    sampleRateKHz: 10.0,
    antiAliasFilter: false,
  },
  {
    id: 'cd-audio',
    label: '18 kHz @ 44.1 kHz (CD music)',
    freqKHz: 18.0,
    sampleRateKHz: 44.1,
    antiAliasFilter: false,
  },
];

export const WINDOW_MS = 1.0;

export const NYQUIST_STEPS = [
  { id: 0, label: '1. Real sound wave' },
  { id: 1, label: '2. Half snapshots' },
  { id: 2, label: '3. All snapshots' },
  { id: 3, label: '4. What computer hears' },
] as const;

export interface SamplePoint {
  index: number;
  timeMs: number;
  amplitude: number;
}

export interface NyquistAnalysis {
  freqKHz: number;
  sampleRateKHz: number;
  antiAliasFilter: boolean;
  nyquistKHz: number;
  sampleIntervalMs: number;
  foldMultiple: number;
  signedDeltaKHz: number;
  aliasFreqKHz: number;
  phaseInverted: boolean;
  isAliased: boolean;
  isExactNyquistBoundary: boolean;
  hitsZeroCrossings: boolean;
  filteredOut: boolean;
  reconstructedFreqKHz: number | null;
  samples: SamplePoint[];
  trueAmplitudeAt: (timeMs: number) => number;
  reconstructedAmplitudeAt: (timeMs: number) => number;
}

/**
 * Computes exact Nyquist limit, signed frequency fold Δf = f - round(f / fs)*fs,
 * and discrete sample points across a 1.0 ms window (where f in kHz equals cycles per ms).
 * Because sin(2π (k·fs + Δf) n/fs) = sin(2π Δf t_n), negative Δf yields a phase-flipped
 * sinusoid at |Δf| that still passes through every sample dot.
 */
export function analyzeSampling(params: {
  freqKHz: number;
  sampleRateKHz: number;
  antiAliasFilter: boolean;
}): NyquistAnalysis {
  const freqKHz = Math.max(0.5, Math.min(25, params.freqKHz));
  const sampleRateKHz = Math.max(2, Math.min(48, params.sampleRateKHz));
  const antiAliasFilter = params.antiAliasFilter;

  const nyquistKHz = sampleRateKHz / 2;
  const sampleIntervalMs = 1 / sampleRateKHz;
  const foldMultiple = Math.round(freqKHz / sampleRateKHz);
  const signedDeltaKHz = freqKHz - foldMultiple * sampleRateKHz;
  const aliasFreqKHz = Math.abs(signedDeltaKHz);
  const phaseInverted = signedDeltaKHz < -1e-9;
  const isExactNyquistBoundary = Math.abs(freqKHz - nyquistKHz) < 1e-6;
  const isAliased = freqKHz > nyquistKHz + 1e-6;
  const hitsZeroCrossings =
    isExactNyquistBoundary ||
    (isAliased && (aliasFreqKHz < 1e-6 || Math.abs(aliasFreqKHz - nyquistKHz) < 1e-6));
  const filteredOut = antiAliasFilter && isAliased;

  const trueAmplitudeAt = (timeMs: number) => Math.sin(2 * Math.PI * freqKHz * timeMs);

  const count = Math.max(2, Math.floor(WINDOW_MS * sampleRateKHz) + 1);
  const samples: SamplePoint[] = [];
  for (let i = 0; i < count; i++) {
    const timeMs = i * sampleIntervalMs;
    if (timeMs > WINDOW_MS + 1e-9) break;
    const amplitude = filteredOut ? 0 : trueAmplitudeAt(timeMs);
    samples.push({
      index: i,
      timeMs,
      amplitude: Math.abs(amplitude) < 1e-12 ? 0 : amplitude,
    });
  }

  const reconstructedAmplitudeAt = (timeMs: number) => {
    if (filteredOut || hitsZeroCrossings) return 0;
    if (isAliased) return Math.sin(2 * Math.PI * signedDeltaKHz * timeMs);
    return trueAmplitudeAt(timeMs);
  };

  const reconstructedFreqKHz = filteredOut || hitsZeroCrossings
    ? null
    : isAliased
      ? aliasFreqKHz
      : freqKHz;

  return {
    freqKHz,
    sampleRateKHz,
    antiAliasFilter,
    nyquistKHz,
    sampleIntervalMs,
    foldMultiple,
    signedDeltaKHz,
    aliasFreqKHz,
    phaseInverted,
    isAliased,
    isExactNyquistBoundary,
    hitsZeroCrossings,
    filteredOut,
    reconstructedFreqKHz,
    samples,
    trueAmplitudeAt,
    reconstructedAmplitudeAt,
  };
}

export function explainNyquistStep(analysis: NyquistAnalysis, step: number): string {
  const {
    freqKHz,
    sampleRateKHz,
    nyquistKHz,
    sampleIntervalMs,
    aliasFreqKHz,
    isAliased,
    isExactNyquistBoundary,
    hitsZeroCrossings,
    filteredOut,
    samples,
  } = analysis;

  if (step === 0) {
    return filteredOut
      ? `The ${freqKHz.toFixed(1)} kHz tone is above the ${nyquistKHz.toFixed(1)} kHz limit, so the pre-filter blocks it before any snapshots are taken.`
      : `A real ${freqKHz.toFixed(1)} kHz sound wave hits the microphone (${freqKHz.toFixed(1)} full up-and-down cycles in 1.0 ms).`;
  }
  if (step === 1) {
    const halfCount = Math.ceil(samples.length / 2);
    return `The recorder measures wave height every Δt = ${sampleIntervalMs.toFixed(3)} ms (${sampleRateKHz.toFixed(1)}k snapshots/s; ${halfCount} of ${samples.length} dots captured so far).`;
  }
  if (step === 2) {
    return `All ${samples.length} green snapshot dots are saved. Once saved, the computer only has these dots — not the blue curve between them.`;
  }
  if (filteredOut) {
    return `Pre-filter ON: blocking ${freqKHz.toFixed(1)} kHz before sampling flattens the signal to 0 so no fake ${aliasFreqKHz.toFixed(1)} kHz pitch can sneak in.`;
  }
  if (hitsZeroCrossings) {
    return isExactNyquistBoundary
      ? `Exact Nyquist boundary (${freqKHz.toFixed(1)} = ${sampleRateKHz.toFixed(1)}/2): every dot lands at height 0.00! You must sample strictly faster than 2×f.`
      : `Every snapshot lands right on a zero crossing (0.00), so the dots collapse to a flat 0-height line at ${aliasFreqKHz.toFixed(1)} kHz.`;
  }
  if (isAliased) {
    return `Aliasing! Because ${freqKHz.toFixed(1)} kHz > Nyquist (${nyquistKHz.toFixed(1)} kHz), those exact dots also fit a slower ${aliasFreqKHz.toFixed(1)} kHz wave — the computer hears the fake lower pitch.`;
  }
  return `Clean capture! Because ${freqKHz.toFixed(1)} kHz < Nyquist (${nyquistKHz.toFixed(1)} kHz), only the real ${freqKHz.toFixed(1)} kHz wave fits all ${samples.length} dots.`;
}
