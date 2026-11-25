// Pure math and 2nd-order biased random walk simulation for node2vec (Grover & Leskovec, KDD 2016).
// Reuses the 6-node cluster {0,1,2,3} + bridge chain {3-4-5} graph so local vs. exploratory walks are clear.

export interface WalkGraphNode {
  id: number;
  x: number;
  y: number;
  role: 'cluster' | 'bridge' | 'chain';
  label: string;
}

export const WALK_NODES: readonly WalkGraphNode[] = [
  { id: 0, x: 70, y: 65, role: 'cluster', label: '0' },
  { id: 1, x: 70, y: 205, role: 'cluster', label: '1' },
  { id: 2, x: 185, y: 135, role: 'cluster', label: '2' },
  { id: 3, x: 280, y: 135, role: 'bridge', label: '3 (bridge)' },
  { id: 4, x: 355, y: 92, role: 'chain', label: '4' },
  { id: 5, x: 420, y: 58, role: 'chain', label: '5' },
];

export const WALK_EDGES: readonly [number, number][] = [
  [0, 1],
  [0, 2],
  [1, 2],
  [1, 3],
  [2, 3],
  [3, 4],
  [4, 5],
];

export function buildWalkAdjacency(edges: readonly [number, number][], n: number): number[][] {
  const adj: number[][] = Array.from({ length: n }, () => []);
  for (const [a, b] of edges) {
    adj[a].push(b);
    adj[b].push(a);
  }
  return adj.map((list) => list.slice().sort((u, v) => u - v));
}

export const WALK_ADJ = buildWalkAdjacency(WALK_EDGES, WALK_NODES.length);

function mulberry32(seed: number) {
  let state = seed | 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface NeighborTransition {
  neighbor: number;
  distanceFromPrev: 0 | 1 | 2 | null;
  weight: number;
  probability: number;
  ruleText: string;
}

/** Exact node2vec 2nd-order unnormalized transition bias alpha_pq(t, x) and normalized probabilities. */
export function computeStepTransition(
  adj: readonly (readonly number[])[],
  prev: number | null,
  curr: number,
  p: number,
  q: number,
): NeighborTransition[] {
  const safeP = Math.max(0.1, p);
  const safeQ = Math.max(0.1, q);
  const neighbors = adj[curr] ?? [];
  const raw = neighbors.map((neighbor) => {
    if (prev === null) {
      return {
        neighbor,
        distanceFromPrev: null as null,
        weight: 1,
        ruleText: 'first hop (1)',
      };
    }
    if (neighbor === prev) {
      return {
        neighbor,
        distanceFromPrev: 0 as const,
        weight: 1 / safeP,
        ruleText: 'd=0 backtrack (1/p)',
      };
    }
    if (adj[prev]?.includes(neighbor)) {
      return {
        neighbor,
        distanceFromPrev: 1 as const,
        weight: 1,
        ruleText: 'd=1 shared (1)',
      };
    }
    return {
      neighbor,
      distanceFromPrev: 2 as const,
      weight: 1 / safeQ,
      ruleText: 'd=2 outward (1/q)',
    };
  });

  const total = raw.reduce((s, item) => s + item.weight, 0) || 1;
  return raw.map((item) => ({
    ...item,
    probability: item.weight / total,
  }));
}

export interface WalkTraceFrame {
  step: number;
  prev: number | null;
  curr: number;
  chosenNext: number | null;
  walkSoFar: number[];
  transitions: NeighborTransition[];
  clusterVisits: number;
  chainVisits: number;
  explain: string;
}

export interface WalkSimulationResult {
  start: number;
  length: number;
  p: number;
  q: number;
  seed: number;
  walk: number[];
  frames: WalkTraceFrame[];
  visitCounts: number[];
  clusterShare: number;
  chainShare: number;
  avgClusterShareMulti: number;
  avgChainShareMulti: number;
}

function sampleWalkOnce(
  adj: readonly (readonly number[])[],
  start: number,
  length: number,
  p: number,
  q: number,
  rand: () => number,
): { walk: number[]; transitionsPerStep: NeighborTransition[][] } {
  const walk = [start];
  const transitionsPerStep: NeighborTransition[][] = [];
  let prev: number | null = null;
  let curr = start;

  for (let i = 0; i < length; i++) {
    const transitions = computeStepTransition(adj, prev, curr, p, q);
    transitionsPerStep.push(transitions);
    if (transitions.length === 0) break;

    let r = rand();
    let chosen = transitions[transitions.length - 1].neighbor;
    for (const tr of transitions) {
      r -= tr.probability;
      if (r <= 1e-12) {
        chosen = tr.neighbor;
        break;
      }
    }
    prev = curr;
    curr = chosen;
    walk.push(curr);
  }
  return { walk, transitionsPerStep };
}

/** Generate a step-by-step trace of one biased walk plus multi-walk summary shares. */
export function simulateRandomWalkEmbedding({
  start = 1,
  length = 7,
  p = 1.0,
  q = 2.0,
  seed = 42,
}: {
  start?: number;
  length?: number;
  p?: number;
  q?: number;
  seed?: number;
} = {}): WalkSimulationResult {
  const safeStart = Math.max(0, Math.min(WALK_NODES.length - 1, Math.round(start)));
  const safeLen = Math.max(3, Math.min(12, Math.round(length)));
  const safeP = Math.max(0.2, Math.min(4.0, Number(p.toFixed(2))));
  const safeQ = Math.max(0.2, Math.min(4.0, Number(q.toFixed(2))));
  const safeSeed = Math.max(1, Math.min(999, Math.round(seed)));

  const rand = mulberry32(safeSeed);
  const { walk, transitionsPerStep } = sampleWalkOnce(WALK_ADJ, safeStart, safeLen, safeP, safeQ, rand);

  const frames: WalkTraceFrame[] = [];
  for (let s = 0; s < walk.length; s++) {
    const curr = walk[s];
    const prev = s === 0 ? null : walk[s - 1];
    const chosenNext = s < walk.length - 1 ? walk[s + 1] : null;
    const transitions =
      s < transitionsPerStep.length
        ? transitionsPerStep[s]
        : computeStepTransition(WALK_ADJ, prev, curr, safeP, safeQ);

    const walkSoFar = walk.slice(0, s + 1);
    const clusterVisits = walkSoFar.filter((n) => n <= 3).length;
    const chainVisits = walkSoFar.filter((n) => n >= 4).length;

    let explain = '';
    if (s === 0) {
      explain = `Start at node ${curr}. No previous node yet, so every neighbor starts with equal weight 1.`;
    } else {
      const prevTransitions = transitionsPerStep[s - 1];
      const taken = prevTransitions.find((tr) => tr.neighbor === curr);
      const pct = taken ? Math.round(taken.probability * 100) : 0;
      const distDesc =
        taken?.distanceFromPrev === 0
          ? `backtracked to previous node (weight 1/p = ${(1 / safeP).toFixed(2)})`
          : taken?.distanceFromPrev === 1
            ? `stayed at a shared neighbor (weight 1.00)`
            : taken?.distanceFromPrev === 2
              ? `stepped outward away from prev node (weight 1/q = ${(1 / safeQ).toFixed(2)})`
              : `took first hop (weight 1.00)`;
      explain = `Hop ${s}: moved ${prev} → ${curr} (${pct}% odds; ${distDesc}). From ${curr}, next-step weights depend on distance from ${prev}.`;
    }

    frames.push({
      step: s,
      prev,
      curr,
      chosenNext,
      walkSoFar,
      transitions,
      clusterVisits,
      chainVisits,
      explain,
    });
  }

  const visitCounts = Array(WALK_NODES.length).fill(0);
  for (const n of walk) visitCounts[n] += 1;
  const clusterShare = walk.filter((n) => n <= 3).length / walk.length;
  const chainShare = walk.filter((n) => n >= 4).length / walk.length;

  // Average over 25 walks to verify steady community vs. bridge exploration behavior
  const multiRand = mulberry32(safeSeed + 100);
  let totalMultiNodes = 0;
  let totalMultiCluster = 0;
  let totalMultiChain = 0;
  for (let w = 0; w < 25; w++) {
    const res = sampleWalkOnce(WALK_ADJ, safeStart, safeLen, safeP, safeQ, multiRand).walk;
    totalMultiNodes += res.length;
    totalMultiCluster += res.filter((n) => n <= 3).length;
    totalMultiChain += res.filter((n) => n >= 4).length;
  }

  return {
    start: safeStart,
    length: safeLen,
    p: safeP,
    q: safeQ,
    seed: safeSeed,
    walk,
    frames,
    visitCounts,
    clusterShare,
    chainShare,
    avgClusterShareMulti: totalMultiCluster / Math.max(1, totalMultiNodes),
    avgChainShareMulti: totalMultiChain / Math.max(1, totalMultiNodes),
  };
}
