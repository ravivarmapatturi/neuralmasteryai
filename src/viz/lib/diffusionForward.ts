/**
 * DDPM forward (noising) process, closed form:
 *   x_t = sqrt(alphaBar_t) * x_0 + sqrt(1 - alphaBar_t) * eps,   eps ~ N(0, I)
 * with two real noise schedules: the original linear beta schedule
 * (Ho et al. 2020) and the cosine schedule (Nichol & Dhariwal 2021).
 */

export type ScheduleKind = 'linear' | 'cosine';
export type SignalKind = 'bump' | 'step' | 'two-peaks';

/** alphaBar_t for t = 1..T under a linear beta ramp from beta1 to betaT. */
export function linearAlphaBars(T: number, beta1 = 1e-4, betaT = 0.02): number[] {
  const out: number[] = [];
  let cum = 1;
  for (let t = 1; t <= T; t++) {
    const beta = T === 1 ? beta1 : beta1 + ((betaT - beta1) * (t - 1)) / (T - 1);
    cum *= 1 - beta;
    out.push(cum);
  }
  return out;
}

/** alphaBar_t for t = 1..T under the cosine schedule, f(t) = cos^2(((t/T)+s)/(1+s) * pi/2). */
export function cosineAlphaBars(T: number, s = 0.008): number[] {
  const f = (t: number) => Math.cos((((t / T) + s) / (1 + s)) * (Math.PI / 2)) ** 2;
  const f0 = f(0);
  const out: number[] = [];
  for (let t = 1; t <= T; t++) out.push(Math.max(0, Math.min(1, f(t) / f0)));
  return out;
}

export function alphaBars(kind: ScheduleKind, T: number, betaT = 0.02): number[] {
  return kind === 'linear' ? linearAlphaBars(T, 1e-4, betaT) : cosineAlphaBars(T);
}

/** A structured 1-D "image" so the loss of structure is visible. Values roughly in [-1, 1]. */
export function makeSignal(kind: SignalKind, n: number): number[] {
  return Array.from({ length: n }, (_, i) => {
    const u = i / (n - 1);
    if (kind === 'step') return u < 0.5 ? -0.9 : 0.9;
    if (kind === 'two-peaks') return Math.exp(-((u - 0.25) ** 2) / 0.006) + Math.exp(-((u - 0.75) ** 2) / 0.006) - 0.5;
    return 2 * Math.sin(u * Math.PI) - 1;
  });
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Seeded standard-normal noise (Box-Muller), so a seed always gives the same eps. */
export function seededNoise(n: number, seed: number): number[] {
  const rand = mulberry32(seed);
  return Array.from({ length: n }, () => {
    const u1 = Math.max(rand(), 1e-12);
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * rand());
  });
}

export function diffuse(x0: number[], eps: number[], alphaBar: number): number[] {
  const a = Math.sqrt(alphaBar);
  const b = Math.sqrt(1 - alphaBar);
  return x0.map((v, i) => a * v + b * eps[i]);
}

/** Signal-to-noise ratio of x_t in decibels: 10 log10(alphaBar / (1 - alphaBar)). */
export function snrDb(alphaBar: number): number {
  if (alphaBar >= 1) return Infinity;
  if (alphaBar <= 0) return -Infinity;
  return 10 * Math.log10(alphaBar / (1 - alphaBar));
}

/** Pearson correlation; how much x_t still "looks like" x_0. */
export function correlation(a: number[], b: number[]): number {
  const n = a.length;
  const ma = a.reduce((s, v) => s + v, 0) / n;
  const mb = b.reduce((s, v) => s + v, 0) / n;
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < n; i++) {
    num += (a[i] - ma) * (b[i] - mb);
    da += (a[i] - ma) ** 2;
    db += (b[i] - mb) ** 2;
  }
  return da === 0 || db === 0 ? 0 : num / Math.sqrt(da * db);
}

/** First t (1-based) at which alphaBar drops below a threshold, or null. */
export function firstStepBelow(bars: number[], threshold: number): number | null {
  const i = bars.findIndex((v) => v < threshold);
  return i < 0 ? null : i + 1;
}
