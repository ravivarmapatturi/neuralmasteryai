// Shared math for the Bandits diagram: real epsilon-greedy, UCB1, and
// Thompson Sampling simulations run against the same fixed 3-arm
// Bernoulli bandit, tracking real cumulative regret pull by pull -- not
// illustrative curves, an actual run of each algorithm's real update rule.

function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Three arms, true (unknown to the algorithms) reward probabilities.
export const TRUE_PROBS = [0.3, 0.5, 0.7];
export const OPTIMAL_PROB = Math.max(...TRUE_PROBS);
export const N_ARMS = TRUE_PROBS.length;

export type BanditStrategy = 'epsilonGreedy' | 'ucb1' | 'thompson';

export interface RegretTrace {
  epsilonGreedy: number[];
  ucb1: number[];
  thompson: number[];
}

export interface ArmTelemetry {
  armIndex: number;
  trueProb: number;
  pulls: number;
  wins: number;
  meanEstimate: number;
  ucbBonus: number;
  ucbScore: number;
  alpha: number;
  beta: number;
}

export interface StrategySnapshot {
  regret: number;
  bestArmSharePct: number;
  arms: ArmTelemetry[];
}

export interface BanditSimulation {
  pulls: number;
  seed: number;
  epsilon: number;
  ucbScale: number;
  trueProbs: [number, number, number];
  optimalProb: number;
  optimalArmIndex: number;
  trace: RegretTrace;
  snapshotsAt: (horizon: number) => {
    horizon: number;
    epsilonGreedy: StrategySnapshot;
    ucb1: StrategySnapshot;
    thompson: StrategySnapshot;
    ucbAheadOfEps: boolean;
    explain: string;
  };
}

export const BANDIT_PRESETS: readonly {
  id: string;
  label: string;
  probs: readonly [number, number, number];
}[] = [
  { id: 'clear', label: 'Clear winner (0.3 / 0.5 / 0.7)', probs: [0.3, 0.5, 0.7] },
  { id: 'neartie', label: 'Near-tie arms (0.30 / 0.54 / 0.55)', probs: [0.3, 0.54, 0.55] },
  { id: 'close', label: 'Close race (0.45 / 0.50 / 0.55)', probs: [0.45, 0.5, 0.55] },
];

export const BANDIT_CHECKPOINTS = [150, 400, 900, 1800, 3200, 4500] as const;

function pullArmFrom(rand: () => number, probs: readonly number[], arm: number): number {
  return rand() < probs[arm] ? 1 : 0;
}

/** Runs all three strategies for `pulls` rounds against the same seeded
 * reward stream (each strategy gets its own independent draw stream, same
 * seed, so differences in regret come from the algorithm, not lucky
 * draws) and returns cumulative regret after every pull. */
export function simulateBandits(pulls: number, seed: number, epsilon = 0.1): RegretTrace {
  const sim = simulateBanditComparison({
    pulls,
    seed,
    epsilon,
    ucbScale: 1,
    trueProbs: [TRUE_PROBS[0], TRUE_PROBS[1], TRUE_PROBS[2]],
  });
  return sim.trace;
}

/** Parameterized 3-arm Bernoulli bandit simulation with per-pull regret curves and snapshot arm telemetry. */
export function simulateBanditComparison({
  pulls = 5000,
  seed = 42,
  epsilon = 0.1,
  ucbScale = 1.0,
  trueProbs = [0.3, 0.5, 0.7],
}: {
  pulls?: number;
  seed?: number;
  epsilon?: number;
  ucbScale?: number;
  trueProbs?: readonly [number, number, number];
} = {}): BanditSimulation {
  const nPulls = Math.max(20, Math.min(5000, Math.round(pulls)));
  const clampedEps = Math.max(0, Math.min(0.4, epsilon));
  const clampedUcb = Math.max(0.2, Math.min(2.5, ucbScale));
  const probs: [number, number, number] = [
    Math.max(0.05, Math.min(0.95, trueProbs[0])),
    Math.max(0.05, Math.min(0.95, trueProbs[1])),
    Math.max(0.05, Math.min(0.95, trueProbs[2])),
  ];
  const optimalProb = Math.max(...probs);
  const optimalArmIndex = probs.indexOf(optimalProb);

  // Run each strategy recording checkpoints every 50 pulls (and final) for fast slider scrubbing
  const epsRes = runEpsilonGreedy(nPulls, seed, clampedEps, probs, optimalProb);
  const ucbRes = runUcb1(nPulls, seed, clampedUcb, probs, optimalProb);
  const thomRes = runThompson(nPulls, seed, probs, optimalProb);

  const trace: RegretTrace = {
    epsilonGreedy: epsRes.regret,
    ucb1: ucbRes.regret,
    thompson: thomRes.regret,
  };

  const snapshotsAt = (horizonRaw: number) => {
    const horizon = Math.max(1, Math.min(nPulls, Math.round(horizonRaw)));
    const epsilonGreedy = buildSnapshot(epsRes, horizon, optimalArmIndex, probs, clampedUcb);
    const ucb1 = buildSnapshot(ucbRes, horizon, optimalArmIndex, probs, clampedUcb);
    const thompson = buildSnapshot(thomRes, horizon, optimalArmIndex, probs, clampedUcb);
    const ucbAheadOfEps = ucb1.regret < epsilonGreedy.regret;

    let explain = '';
    if (clampedEps === 0) {
      explain = `With ε = 0.00, ε-greedy never explores after the first pull and can lock onto a weak arm (${epsilonGreedy.regret.toFixed(1)} regret), while Thompson Sampling sits at ${thompson.regret.toFixed(1)}.`;
    } else if (!ucbAheadOfEps) {
      explain = `After ${horizon} pulls, UCB1 (${ucb1.regret.toFixed(1)} regret) still trails ε-greedy (${epsilonGreedy.regret.toFixed(1)}) because its √(2 ln t / N) bonus pays upfront to test uncertain arms. Thompson Sampling leads at ${thompson.regret.toFixed(1)}.`;
    } else {
      explain = `Crossover achieved! After ${horizon} pulls, UCB1's flattening curve (${ucb1.regret.toFixed(1)}) beats ε-greedy's straight-line climb (${epsilonGreedy.regret.toFixed(1)}). Thompson Sampling leads at ${thompson.regret.toFixed(1)}.`;
    }

    return {
      horizon,
      epsilonGreedy,
      ucb1,
      thompson,
      ucbAheadOfEps,
      explain,
    };
  };

  return {
    pulls: nPulls,
    seed,
    epsilon: clampedEps,
    ucbScale: clampedUcb,
    trueProbs: probs,
    optimalProb,
    optimalArmIndex,
    trace,
    snapshotsAt,
  };
}

interface RawRunRecord {
  regret: number[];
  countsAt: number[][];
  winsAt: number[][];
  checkpointStep: number;
}

const CHECK_INTERVAL = 25;

function buildSnapshot(
  run: RawRunRecord,
  horizon: number,
  optimalArmIndex: number,
  probs: readonly [number, number, number],
  ucbScale: number,
): StrategySnapshot {
  const idx = Math.min(
    run.countsAt.length - 1,
    Math.max(0, Math.round(horizon / CHECK_INTERVAL)),
  );
  const counts = run.countsAt[idx];
  const wins = run.winsAt[idx];
  const totalPulls = counts.reduce((a, b) => a + b, 0) || 1;

  const arms: ArmTelemetry[] = probs.map((trueProb, armIndex) => {
    const pulls = counts[armIndex];
    const w = wins[armIndex];
    const meanEstimate = pulls > 0 ? w / pulls : 0;
    const ucbBonus = pulls > 0 ? ucbScale * Math.sqrt((2 * Math.log(horizon + 1)) / pulls) : 1;
    return {
      armIndex,
      trueProb,
      pulls,
      wins: w,
      meanEstimate,
      ucbBonus,
      ucbScore: meanEstimate + ucbBonus,
      alpha: w + 1,
      beta: pulls - w + 1,
    };
  });

  return {
    regret: run.regret[horizon - 1],
    bestArmSharePct: (counts[optimalArmIndex] / totalPulls) * 100,
    arms,
  };
}

function runEpsilonGreedy(
  pulls: number,
  seed: number,
  epsilon: number,
  probs: readonly number[],
  optimalProb: number,
): RawRunRecord {
  const rand = mulberry32(seed);
  const counts = [0, 0, 0];
  const sums = [0, 0, 0];
  const regret: number[] = [];
  const countsAt: number[][] = [[0, 0, 0]];
  const winsAt: number[][] = [[0, 0, 0]];
  let cumRegret = 0;

  for (let t = 0; t < pulls; t++) {
    let arm: number;
    if (rand() < epsilon) {
      arm = Math.floor(rand() * N_ARMS);
    } else {
      arm = argmax(sums.map((s, i) => (counts[i] > 0 ? s / counts[i] : Infinity)));
    }
    const reward = pullArmFrom(rand, probs, arm);
    counts[arm]++;
    sums[arm] += reward;
    cumRegret += optimalProb - probs[arm];
    regret.push(cumRegret);
    if ((t + 1) % CHECK_INTERVAL === 0 || t === pulls - 1) {
      countsAt.push(counts.slice());
      winsAt.push(sums.slice());
    }
  }
  return { regret, countsAt, winsAt, checkpointStep: CHECK_INTERVAL };
}

function runUcb1(
  pulls: number,
  seed: number,
  ucbScale: number,
  probs: readonly number[],
  optimalProb: number,
): RawRunRecord {
  const rand = mulberry32(seed);
  const counts = [0, 0, 0];
  const sums = [0, 0, 0];
  const regret: number[] = [];
  const countsAt: number[][] = [[0, 0, 0]];
  const winsAt: number[][] = [[0, 0, 0]];
  let cumRegret = 0;

  for (let t = 0; t < pulls; t++) {
    let arm: number;
    const unplayed = counts.findIndex((c) => c === 0);
    if (unplayed !== -1) {
      arm = unplayed;
    } else {
      const ucbValues = sums.map(
        (s, i) => s / counts[i] + ucbScale * Math.sqrt((2 * Math.log(t + 1)) / counts[i]),
      );
      arm = argmax(ucbValues);
    }
    const reward = pullArmFrom(rand, probs, arm);
    counts[arm]++;
    sums[arm] += reward;
    cumRegret += optimalProb - probs[arm];
    regret.push(cumRegret);
    if ((t + 1) % CHECK_INTERVAL === 0 || t === pulls - 1) {
      countsAt.push(counts.slice());
      winsAt.push(sums.slice());
    }
  }
  return { regret, countsAt, winsAt, checkpointStep: CHECK_INTERVAL };
}

function runThompson(
  pulls: number,
  seed: number,
  probs: readonly number[],
  optimalProb: number,
): RawRunRecord {
  const rand = mulberry32(seed);
  const alpha = [1, 1, 1];
  const beta = [1, 1, 1];
  const counts = [0, 0, 0];
  const sums = [0, 0, 0];
  const regret: number[] = [];
  const countsAt: number[][] = [[0, 0, 0]];
  const winsAt: number[][] = [[0, 0, 0]];
  let cumRegret = 0;

  for (let t = 0; t < pulls; t++) {
    const samples = alpha.map((a, i) => sampleBeta(rand, a, beta[i]));
    const arm = argmax(samples);
    const reward = pullArmFrom(rand, probs, arm);
    counts[arm]++;
    sums[arm] += reward;
    if (reward === 1) alpha[arm]++;
    else beta[arm]++;
    cumRegret += optimalProb - probs[arm];
    regret.push(cumRegret);
    if ((t + 1) % CHECK_INTERVAL === 0 || t === pulls - 1) {
      countsAt.push(counts.slice());
      winsAt.push(sums.slice());
    }
  }
  return { regret, countsAt, winsAt, checkpointStep: CHECK_INTERVAL };
}

// Beta sampling via two Gamma draws (Marsaglia-Tsang), standard and exact
function sampleGamma(rand: () => number, shape: number): number {
  if (shape < 1) {
    const u = rand();
    return sampleGamma(rand, shape + 1) * Math.pow(u, 1 / shape);
  }
  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);
  for (;;) {
    let x: number;
    let v: number;
    do {
      const u1 = rand();
      const u2 = rand();
      x = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      v = 1 + c * x;
    } while (v <= 0);
    v = v * v * v;
    const u = rand();
    if (u < 1 - 0.0331 * x * x * x * x) return d * v;
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
  }
}

function sampleBeta(rand: () => number, a: number, b: number): number {
  const ga = sampleGamma(rand, a);
  const gb = sampleGamma(rand, b);
  return ga / (ga + gb);
}

function argmax(values: number[]): number {
  let best = 0;
  for (let i = 1; i < values.length; i++) if (values[i] > values[best]) best = i;
  return best;
}
