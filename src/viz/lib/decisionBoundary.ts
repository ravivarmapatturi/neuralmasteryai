// Real, from-scratch implementations of KNN, a Gini-impurity decision tree,
// and Lloyd's-algorithm k-means, over 2D points the reader clicks to place.
// No ML library.

function mulberry32(seed: number) {
  let a = seed;
  return function rand() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface LabeledPoint {
  x: number;
  y: number;
  label: number;
}

export interface NeighborVote {
  point: LabeledPoint;
  distance: number;
  rank: number;
  votes: Record<number, number>;
  predictedLabel: number;
}

// --- K-Nearest Neighbors ---
export function knnPredict(points: LabeledPoint[], k: number, x: number, y: number): number | null {
  if (points.length === 0) return null;
  const dists = points
    .map((p) => ({ p, d: (p.x - x) ** 2 + (p.y - y) ** 2 }))
    .sort((a, b) => a.d - b.d)
    .slice(0, Math.min(k, points.length));
  const counts: Record<number, number> = {};
  dists.forEach(({ p }) => {
    counts[p.label] = (counts[p.label] || 0) + 1;
  });
  return Number(Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]);
}

export function knnTrace(points: LabeledPoint[], k: number, x: number, y: number): NeighborVote[] {
  const nearest = points
    .map((point) => ({ point, distance: Math.hypot(point.x - x, point.y - y) }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, Math.max(0, Math.min(k, points.length)));
  const votes: Record<number, number> = {};
  return nearest.map(({ point, distance }, index) => {
    votes[point.label] = (votes[point.label] ?? 0) + 1;
    const predictedLabel = Number(
      Object.entries(votes).sort((a, b) => Number(b[1]) - Number(a[1]) || Number(a[0]) - Number(b[0]))[0][0],
    );
    return { point, distance, rank: index + 1, votes: { ...votes }, predictedLabel };
  });
}

// --- Decision Tree (axis-aligned, Gini impurity, greedy) ---
export function gini(labels: number[]): number {
  if (labels.length === 0) return 0;
  const counts: Record<number, number> = {};
  labels.forEach((l) => {
    counts[l] = (counts[l] || 0) + 1;
  });
  const n = labels.length;
  let impurity = 1;
  for (const l in counts) {
    const p = counts[l] / n;
    impurity -= p * p;
  }
  return impurity;
}

interface Split {
  axis: 'x' | 'y';
  threshold: number;
  impurity: number;
  left: LabeledPoint[];
  right: LabeledPoint[];
}

function bestSplit(points: LabeledPoint[]): Split | null {
  let best: Split | null = null;
  for (const axis of ['x', 'y'] as const) {
    const vals = [...new Set(points.map((p) => p[axis]))].sort((a, b) => a - b);
    for (let i = 0; i < vals.length - 1; i++) {
      const threshold = (vals[i] + vals[i + 1]) / 2;
      const left = points.filter((p) => p[axis] <= threshold);
      const right = points.filter((p) => p[axis] > threshold);
      if (!left.length || !right.length) continue;
      const impurity =
        (left.length * gini(left.map((p) => p.label)) + right.length * gini(right.map((p) => p.label))) /
        points.length;
      if (!best || impurity < best.impurity) best = { axis, threshold, impurity, left, right };
    }
  }
  return best;
}

function majorityLabel(points: LabeledPoint[]): number {
  const counts: Record<number, number> = {};
  points.forEach((p) => {
    counts[p.label] = (counts[p.label] || 0) + 1;
  });
  return Number(Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]);
}

export interface TreeLeaf {
  leaf: true;
  label: number;
}
export interface TreeNode {
  leaf: false;
  axis: 'x' | 'y';
  threshold: number;
  left: TreeShape;
  right: TreeShape;
}
export type TreeShape = TreeLeaf | TreeNode;

export function buildTree(points: LabeledPoint[], maxDepth: number, depth = 0): TreeShape {
  if (points.length === 0) return { leaf: true, label: 0 };
  const uniqueLabels = new Set(points.map((p) => p.label));
  if (uniqueLabels.size <= 1 || depth >= maxDepth || points.length < 2) {
    return { leaf: true, label: majorityLabel(points) };
  }
  const split = bestSplit(points);
  if (!split) return { leaf: true, label: majorityLabel(points) };
  return {
    leaf: false,
    axis: split.axis,
    threshold: split.threshold,
    left: buildTree(split.left, maxDepth, depth + 1),
    right: buildTree(split.right, maxDepth, depth + 1),
  };
}

export function treePredict(tree: TreeShape, x: number, y: number): number {
  let node: TreeShape = tree;
  while (node.leaf === false) {
    const val: number = node.axis === 'x' ? x : y;
    node = val <= node.threshold ? node.left : node.right;
  }
  return node.label;
}

export interface TreeDecisionStep {
  axis: 'x' | 'y' | 'leaf';
  threshold: number | null;
  value: number;
  branch: 'left' | 'right' | 'prediction';
  label: number | null;
}

export function treePredictionTrace(tree: TreeShape, x: number, y: number): TreeDecisionStep[] {
  const trace: TreeDecisionStep[] = [];
  let node: TreeShape = tree;
  while (node.leaf === false) {
    const value = node.axis === 'x' ? x : y;
    const branch = value <= node.threshold ? 'left' : 'right';
    trace.push({ axis: node.axis, threshold: node.threshold, value, branch, label: null });
    node = branch === 'left' ? node.left : node.right;
  }
  trace.push({ axis: 'leaf', threshold: null, value: node.label, branch: 'prediction', label: node.label });
  return trace;
}

export function countTreeNodes(tree: TreeShape): number {
  return tree.leaf === true ? 1 : 1 + countTreeNodes(tree.left) + countTreeNodes(tree.right);
}

// --- K-Means (Lloyd's algorithm) ---
export interface Centroid {
  x: number;
  y: number;
}
export interface KMeansResult {
  assignments: number[];
  centroids: Centroid[];
}


export interface KMeansIteration extends KMeansResult {
  iteration: number;
  sse: number;
}

function initialCentroids(points: { x: number; y: number }[], k: number, seed: number): Centroid[] {
  const rand = mulberry32(seed);
  const shuffled = [...points];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, Math.min(k, shuffled.length)).map((point) => ({ x: point.x, y: point.y }));
}

function assign(points: { x: number; y: number }[], centroids: Centroid[]): number[] {
  return points.map((point) => {
    let best = 0;
    let bestDistance = Infinity;
    centroids.forEach((centroid, index) => {
      const distance = (centroid.x - point.x) ** 2 + (centroid.y - point.y) ** 2;
      if (distance < bestDistance) {
        bestDistance = distance;
        best = index;
      }
    });
    return best;
  });
}

export function clusterSse(points: { x: number; y: number }[], assignments: number[], centroids: Centroid[]): number {
  return points.reduce((total, point, index) => {
    const centroid = centroids[assignments[index]];
    return centroid ? total + (centroid.x - point.x) ** 2 + (centroid.y - point.y) ** 2 : total;
  }, 0);
}

export function kmeansTrace(points: { x: number; y: number }[], k: number, iterations = 8, seed = 7): KMeansIteration[] {
  if (points.length === 0 || k <= 0) return [];
  let centroids = initialCentroids(points, k, seed);
  let assignments = assign(points, centroids);
  const trace: KMeansIteration[] = [{ iteration: 0, assignments, centroids, sse: clusterSse(points, assignments, centroids) }];

  for (let iteration = 1; iteration <= iterations; iteration += 1) {
    centroids = centroids.map((centroid, index) => {
      const members = points.filter((_, pointIndex) => assignments[pointIndex] === index);
      if (members.length === 0) return centroid;
      return {
        x: members.reduce((sum, point) => sum + point.x, 0) / members.length,
        y: members.reduce((sum, point) => sum + point.y, 0) / members.length,
      };
    });
    assignments = assign(points, centroids);
    trace.push({ iteration, assignments, centroids, sse: clusterSse(points, assignments, centroids) });
  }
  return trace;
}

export function kmeans(points: { x: number; y: number }[], k: number, iterations = 12, seed = 7): KMeansResult {
  const trace = kmeansTrace(points, k, iterations, seed);
  const last = trace.at(-1);
  return last ? { assignments: last.assignments, centroids: last.centroids } : { assignments: [], centroids: [] };
}
