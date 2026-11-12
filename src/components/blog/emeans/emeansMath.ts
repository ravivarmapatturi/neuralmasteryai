export type Vec = [number, number];

/**
 * Share of the current centroid that comes from each of the last `batches` batches (oldest first)
 * when every batch brings the same number of points: batch at age a keeps α(1 − α)^a.
 * Normalised over those batches so the bars add up to 100%.
 */
export function batchWeights(batches: number, alpha: number): number[] {
  const raw = Array.from({ length: batches }, (_, i) => alpha * (1 - alpha) ** (batches - 1 - i));
  const total = raw.reduce((a, b) => a + b, 0);
  return raw.map((w) => w / total);
}

/** One e-means update (paper eq. 2 and 4) for a single cluster. */
export function emaStep(S: Vec, N: number, points: Vec[], alpha: number) {
  const gamma = 1 - alpha;
  const s: Vec = points.reduce<Vec>((acc, p) => [acc[0] + p[0], acc[1] + p[1]], [0, 0]);
  const nextS: Vec = [gamma * S[0] + alpha * s[0], gamma * S[1] + alpha * s[1]];
  const nextN = gamma * N + alpha * points.length;
  return { S: nextS, N: nextN, c: [nextS[0] / nextN, nextS[1] / nextN] as Vec };
}

/** Paper eq. 5: α(t) = α₀ (ε + (1 − ε) · ½ (1 + cos(πt / M))), ε = 0.1. */
export function cosineStep(t: number, M: number, alpha0: number, epsilon = 0.1): number {
  return alpha0 * (epsilon + (1 - epsilon) * 0.5 * (1 + Math.cos((Math.PI * t) / M)));
}

/**
 * Dead-cluster revival on one donor cluster: two copies of the donor centroid,
 * nudged by c ⊙ [1 ± δ, 1 ∓ δ] (paper eq. 8), then a few nearest-centroid passes over the donor's points.
 */
export function reviveSplit(points: Vec[], delta: number, passes: number) {
  const mean = (ps: Vec[]): Vec => [ps.reduce((a, p) => a + p[0], 0) / ps.length, ps.reduce((a, p) => a + p[1], 0) / ps.length];
  const donor = mean(points);
  const children: [Vec, Vec] = [
    [donor[0] * (1 + delta), donor[1] * (1 - delta)],
    [donor[0] * (1 - delta), donor[1] * (1 + delta)],
  ];
  let settled: [Vec, Vec] = [children[0], children[1]];
  for (let k = 0; k < passes; k++) {
    const groups: [Vec[], Vec[]] = [[], []];
    for (const p of points) {
      const d0 = (p[0] - settled[0][0]) ** 2 + (p[1] - settled[0][1]) ** 2;
      const d1 = (p[0] - settled[1][0]) ** 2 + (p[1] - settled[1][1]) ** 2;
      groups[d0 <= d1 ? 0 : 1].push(p);
    }
    settled = [groups[0].length ? mean(groups[0]) : settled[0], groups[1].length ? mean(groups[1]) : settled[1]];
  }
  return { donor, children, settled };
}
