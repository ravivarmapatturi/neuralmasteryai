export interface Point2D {
  x: number;
  y: number;
}

export function distanceSquared(a: Point2D, b: Point2D): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

export function computeLoss(points: Point2D[], centroids: Point2D[]): number {
  if (points.length === 0 || centroids.length === 0) return 0;
  let total = 0;
  for (const p of points) {
    let best = Infinity;
    for (const c of centroids) {
      const d = distanceSquared(p, c);
      if (d < best) best = d;
    }
    total += best;
  }
  return total / points.length;
}

export function assignPoint(p: Point2D, centroids: Point2D[]): number {
  let bestIdx = 0;
  let bestDist = Infinity;
  for (let i = 0; i < centroids.length; i++) {
    const d = distanceSquared(p, centroids[i]);
    if (d < bestDist) {
      bestDist = d;
      bestIdx = i;
    }
  }
  return bestIdx;
}

export function lloydStep(
  points: Point2D[],
  centroids: Point2D[]
): {
  centroids: Point2D[];
  assignments: number[];
  loss: number;
} {
  const k = centroids.length;
  const sums: Point2D[] = Array.from({ length: k }, () => ({ x: 0, y: 0 }));
  const counts = new Array<number>(k).fill(0);
  const assignments: number[] = new Array<number>(points.length);

  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    const c = assignPoint(p, centroids);
    assignments[i] = c;
    sums[c].x += p.x;
    sums[c].y += p.y;
    counts[c] += 1;
  }

  const nextCentroids: Point2D[] = centroids.map((c, idx) => {
    if (counts[idx] === 0) return { ...c };
    return {
      x: sums[idx].x / counts[idx],
      y: sums[idx].y / counts[idx],
    };
  });

  const loss = computeLoss(points, nextCentroids);
  return { centroids: nextCentroids, assignments, loss };
}

export function cosineAlpha(step: number, totalSteps: number, alpha0 = 0.5): number {
  if (totalSteps <= 1) return alpha0;
  const progress = Math.min(Math.max(step / (totalSteps - 1), 0), 1);
  const minAlpha = 0.1 * alpha0;
  return minAlpha + 0.5 * (alpha0 - minAlpha) * (1 + Math.cos(Math.PI * progress));
}

export function eMeansStep(
  batch: Point2D[],
  allPoints: Point2D[],
  currentCentroids: Point2D[],
  runningSums: Point2D[],
  runningCounts: number[],
  alpha: number
): {
  centroids: Point2D[];
  runningSums: Point2D[];
  runningCounts: number[];
  batchAssignments: number[];
  loss: number;
} {
  const k = currentCentroids.length;
  const batchSums: Point2D[] = Array.from({ length: k }, () => ({ x: 0, y: 0 }));
  const batchCounts = new Array<number>(k).fill(0);
  const batchAssignments: number[] = new Array<number>(batch.length);

  for (let i = 0; i < batch.length; i++) {
    const p = batch[i];
    const c = assignPoint(p, currentCentroids);
    batchAssignments[i] = c;
    batchSums[c].x += p.x;
    batchSums[c].y += p.y;
    batchCounts[c] += 1;
  }

  const nextSums: Point2D[] = [];
  const nextCounts: number[] = [];
  const nextCentroids: Point2D[] = [];

  for (let j = 0; j < k; j++) {
    // EMA update: S_j <- (1 - alpha) * S_j + alpha * s_j
    //             N_j <- (1 - alpha) * N_j + alpha * n_j
    const Sj = {
      x: (1 - alpha) * runningSums[j].x + alpha * batchSums[j].x,
      y: (1 - alpha) * runningSums[j].y + alpha * batchSums[j].y,
    };
    const Nj = (1 - alpha) * runningCounts[j] + alpha * batchCounts[j];

    nextSums.push(Sj);
    nextCounts.push(Nj);

    if (Nj > 1e-7) {
      nextCentroids.push({
        x: Sj.x / Nj,
        y: Sj.y / Nj,
      });
    } else {
      nextCentroids.push({ ...currentCentroids[j] });
    }
  }

  const loss = computeLoss(allPoints, nextCentroids);
  return {
    centroids: nextCentroids,
    runningSums: nextSums,
    runningCounts: nextCounts,
    batchAssignments,
    loss,
  };
}

export const TOY_CLUSTER_POINTS: Point2D[] = [
  // Cluster 1 around (22, 28)
  { x: 14, y: 22 }, { x: 20, y: 34 }, { x: 28, y: 24 }, { x: 26, y: 36 },
  { x: 16, y: 32 }, { x: 22, y: 20 }, { x: 30, y: 30 }, { x: 18, y: 26 },
  // Cluster 2 around (78, 28)
  { x: 70, y: 22 }, { x: 76, y: 34 }, { x: 84, y: 24 }, { x: 82, y: 36 },
  { x: 72, y: 32 }, { x: 78, y: 20 }, { x: 86, y: 30 }, { x: 74, y: 26 },
  // Cluster 3 around (50, 78)
  { x: 44, y: 72 }, { x: 52, y: 84 }, { x: 56, y: 74 }, { x: 48, y: 86 },
  { x: 42, y: 78 }, { x: 50, y: 70 }, { x: 58, y: 80 }, { x: 46, y: 76 },
];

export const INITIAL_CENTROIDS: Point2D[] = [
  { x: 32, y: 42 },
  { x: 68, y: 42 },
  { x: 50, y: 56 },
];
