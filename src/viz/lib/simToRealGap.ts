import { domainRandomizedOptimalGain, relativeError, simOnlyGain } from './domainApplications';

export interface SimToRealPoint {
  friction: number;
  simOnlyError: number;
  randomizedError: number;
}

export interface SimToRealState {
  simFriction: number;
  randLow: number;
  randHigh: number;
  realFriction: number;
  wSimOnly: number;
  wRandomized: number;
  simDelivered: number;
  randDelivered: number;
  errSimOnly: number;
  errRandomized: number;
  inRange: boolean;
  winner: 'sim-only' | 'randomized' | 'tie';
  curve: SimToRealPoint[];
}

export interface SimToRealPlaybackStep {
  title: string;
  realFriction: number;
  explain: string;
}

export const SIM_TO_REAL_PLAYBACK_STEPS: readonly SimToRealPlaybackStep[] = [
  {
    title: 'Exact simulator match (f = 1.00)',
    realFriction: 1.0,
    explain: 'Reality happens to match the single simulator (f = 1.00). Sim-only gets 0.0% error, while domain randomization hedges with small nonzero error.',
  },
  {
    title: 'Stickier real floor (f = 1.35, inside band)',
    realFriction: 1.35,
    explain: 'Inside the [0.80, 1.40] randomization band, the hedged controller keeps error much lower than the overfit sim-only controller.',
  },
  {
    title: 'Slicker floor near edge (f = 0.80)',
    realFriction: 0.8,
    explain: 'At f = 0.80, sim-only under-pushes by 20% while domain randomization still trims error across the covered range.',
  },
  {
    title: 'Unmodeled ice outside band (f = 0.55)',
    realFriction: 0.55,
    explain: 'Real friction 0.55 falls outside [0.80, 1.40]: even domain randomization loses badly when reality leaves the training bracket.',
  },
];

export const SIM_TO_REAL_DOMAIN_MIN = 0.5;
export const SIM_TO_REAL_DOMAIN_MAX = 1.8;

/**
 * Compute exact linear controller gains and real-world tracking error |w * f - 1|
 * for both a single-simulator policy and a uniform domain-randomized policy.
 */
export function computeSimToRealState({
  simFriction = 1.0,
  randLow = 0.8,
  randHigh = 1.4,
  realFriction = 1.35,
}: {
  simFriction?: number;
  randLow?: number;
  randHigh?: number;
  realFriction?: number;
}): SimToRealState {
  const safeSim = Math.max(0.55, Math.min(1.6, Number.isFinite(simFriction) ? simFriction : 1.0));
  const rawLow = Math.max(0.5, Math.min(1.7, Number.isFinite(randLow) ? randLow : 0.8));
  const rawHigh = Math.max(0.5, Math.min(1.75, Number.isFinite(randHigh) ? randHigh : 1.4));
  const low = Math.min(rawLow, rawHigh);
  const high = Math.max(rawLow, rawHigh, low + 0.02);
  const real = Math.max(SIM_TO_REAL_DOMAIN_MIN, Math.min(SIM_TO_REAL_DOMAIN_MAX, Number.isFinite(realFriction) ? realFriction : 1.35));

  const wSimOnly = simOnlyGain(safeSim);
  const wRandomized = domainRandomizedOptimalGain(low, high);
  const simDelivered = wSimOnly * real;
  const randDelivered = wRandomized * real;
  const errSimOnly = relativeError(wSimOnly, real);
  const errRandomized = relativeError(wRandomized, real);
  const inRange = real >= low && real <= high;

  const diff = errSimOnly - errRandomized;
  const winner: 'sim-only' | 'randomized' | 'tie' =
    Math.abs(diff) < 1e-4 ? 'tie' : diff > 0 ? 'randomized' : 'sim-only';

  const steps = 65;
  const curve: SimToRealPoint[] = Array.from({ length: steps + 1 }, (_, i) => {
    const friction = SIM_TO_REAL_DOMAIN_MIN + (i / steps) * (SIM_TO_REAL_DOMAIN_MAX - SIM_TO_REAL_DOMAIN_MIN);
    return {
      friction,
      simOnlyError: relativeError(wSimOnly, friction),
      randomizedError: relativeError(wRandomized, friction),
    };
  });

  return {
    simFriction: safeSim,
    randLow: low,
    randHigh: high,
    realFriction: real,
    wSimOnly,
    wRandomized,
    simDelivered,
    randDelivered,
    errSimOnly,
    errRandomized,
    inRange,
    winner,
    curve,
  };
}
