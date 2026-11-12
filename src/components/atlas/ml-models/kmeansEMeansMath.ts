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
  // Cluster 1 around (25, 30)
  { x: 22, y: 28 }, { x: 27, y: 32 }, { x: 24, y: 35 }, { x: 29, y: 26 },
  { x: 21, y: 33 }, { x: 26, y: 25 }, { x: 28, y: 34 }, { x: 23, y: 29 },
  // Cluster 2 around (75, 30)
  { x: 72, y: 28 }, { x: 77, y: 33 }, { x: 74, y: 35 }, { x: 79, y: 27 },
  { x: 71, y: 31 }, { x: 76, y: 26 }, { x: 78, y: 34 }, { x: 73, y: 29 },
  // Cluster 3 around (50, 75)
  { x: 48, y: 72 }, { x: 53, y: 76 }, { x: 50, y: 79 }, { x: 54, y: 71 },
  { x: 47, y: 77 }, { x: 52, y: 73 }, { x: 55, y: 78 }, { x: 49, y: 74 },
];

export const INITIAL_CENTROIDS: Point2D[] = [
  { x: 35, y: 40 },
  { x: 65, y: 40 },
  { x: 50, y: 60 },
];
