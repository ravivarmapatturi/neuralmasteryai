// Pure nearest-neighbor search math: real 2D navigable proximity graph search
// paired with the large-scale (up to 50M vectors) recall vs. latency model.

export type AnnIndexKind = 'hnsw' | 'ivf';

export interface GraphNode2D {
  id: number;
  x: number;
  y: number;
  neighbors: number[];
}

export interface AnnTraceStep {
  step: number;
  ef: number;
  recallPct: number;
  annLatencyMs: number;
  exactLatencyMs: number;
  speedup: number;
  visitedIds: number[];
  annTopKIds: number[];
  exactTopKIds: number[];
  demoHits: number;
  demoRecallPct: number;
  explain: string;
}

export interface AnnCurvePoint {
  ef: number;
  recallPct: number;
  annLatencyMs: number;
}

export interface AnnAnalysis {
  ef: number;
  datasetMillions: number;
  indexKind: AnnIndexKind;
  query: readonly [number, number];
  topK: number;
  nodes: GraphNode2D[];
  exactTopKIds: number[];
  annTopKIds: number[];
  visitedIds: number[];
  demoHits: number;
  demoRecallPct: number;
  recallPct: number;
  annLatencyMs: number;
  exactLatencyMs: number;
  speedup: number;
  exactWinsAtScale: boolean;
  curve: AnnCurvePoint[];
  trace: AnnTraceStep[];
}

export const ANN_TRACE_EFS = [8, 25, 60, 120, 220] as const;

export const ANN_DATASET_PRESETS = [
  { id: '10k', label: '10k (tiny)', millions: 0.01 },
  { id: '1m', label: '1M vectors', millions: 1 },
  { id: '10m', label: '10M vectors', millions: 10 },
  { id: '50m', label: '50M vectors', millions: 50 },
] as const;

function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deterministic 32-point 2D vector field connected as a small navigable proximity graph. */
export function buildNavigableGraph(count = 32): GraphNode2D[] {
  const rand = mulberry32(17);
  const raw: { id: number; x: number; y: number }[] = [];
  // Four semantic clusters + scattered bridges so greedy search can hit local pockets at tiny ef
  const centers: [number, number][] = [
    [-1.1, -0.9],
    [-0.9, 1.0],
    [0.9, -0.8],
    [1.0, 0.9],
  ];
  for (let i = 0; i < count; i++) {
    const [cx, cy] = centers[i % centers.length];
    const x = Number((cx + (rand() - 0.5) * 1.15).toFixed(3));
    const y = Number((cy + (rand() - 0.5) * 1.15).toFixed(3));
    raw.push({ id: i, x, y });
  }
  return raw.map((node) => {
    const sorted = raw
      .filter((o) => o.id !== node.id)
      .map((o) => ({ id: o.id, d: Math.hypot(o.x - node.x, o.y - node.y) }))
      .sort((a, b) => a.d - b.d);
    // 3 close local edges + 1 longer highway jump for HNSW-like navigation
    const local = sorted.slice(0, 3).map((s) => s.id);
    const highway = sorted[Math.min(sorted.length - 1, 9)]?.id;
    const neighbors = Array.from(new Set(highway !== undefined ? [...local, highway] : local));
    return { ...node, neighbors };
  });
}

export const DEMO_VECTOR_GRAPH: GraphNode2D[] = buildNavigableGraph(32);

export function dist2(a: readonly [number, number], b: readonly [number, number]): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

/** Exact brute-force scan over every node in the 2D graph. */
export function exactSearchGraph(
  nodes: readonly GraphNode2D[],
  query: readonly [number, number],
  topK = 3,
): number[] {
  return nodes
    .map((n) => ({ id: n.id, d: dist2([n.x, n.y], query) }))
    .sort((a, b) => (a.d === b.d ? a.id - b.id : a.d - b.d))
    .slice(0, topK)
    .map((x) => x.id);
}

/** Real bounded greedy beam search on the proximity graph, capped by maxVisited evaluations. */
export function beamSearchGraph(
  nodes: readonly GraphNode2D[],
  query: readonly [number, number],
  maxVisited: number,
  topK = 3,
): { visitedIds: number[]; topKIds: number[] } {
  const cap = Math.max(1, Math.min(nodes.length, Math.round(maxVisited)));
  const entryId = 0; // fixed top-layer entry point (bottom-left)
  const visitedSet = new Set<number>([entryId]);
  const visitedOrder: number[] = [entryId];

  const distOf = (id: number) => dist2([nodes[id].x, nodes[id].y], query);
  const frontier: { id: number; d: number }[] = [{ id: entryId, d: distOf(entryId) }];
  const expanded = new Set<number>();

  while (visitedOrder.length < cap) {
    // Pick closest unexpanded candidate in frontier
    frontier.sort((a, b) => a.d - b.d);
    const next = frontier.find((c) => !expanded.has(c.id));
    if (!next) break;
    expanded.add(next.id);

    for (const nbId of nodes[next.id].neighbors) {
      if (visitedOrder.length >= cap) break;
      if (!visitedSet.has(nbId)) {
        visitedSet.add(nbId);
        visitedOrder.push(nbId);
        frontier.push({ id: nbId, d: distOf(nbId) });
      }
    }
  }

  const topKIds = visitedOrder
    .map((id) => ({ id, d: distOf(id) }))
    .sort((a, b) => (a.d === b.d ? a.id - b.id : a.d - b.d))
    .slice(0, topK)
    .map((x) => x.id);

  return { visitedIds: visitedOrder, topKIds };
}

/** Calculated scaling model for large-scale vector search (illustrative production constants). */
export function exactScanLatencyMs(datasetMillions: number): number {
  // 85 ms per million vectors -> 850 ms at 10M vectors (matches Vector Databases lesson)
  return Number((85 * Math.max(0.001, datasetMillions)).toFixed(2));
}

export function annRecallPct(ef: number, indexKind: AnnIndexKind): number {
  const clamped = Math.max(1, ef);
  const scale = indexKind === 'hnsw' ? 35 : 52;
  return 100 * (1 - Math.exp(-clamped / scale));
}

export function annSearchLatencyMs(
  datasetMillions: number,
  ef: number,
  indexKind: AnnIndexKind,
): number {
  const totalVecs = Math.max(1000, datasetMillions * 1_000_000);
  const clampedEf = Math.max(1, ef);
  if (indexKind === 'hnsw') {
    // Logarithmic graph routing O(log2 N) + linear candidate check cost per ef step
    return 0.12 * Math.log2(totalVecs) + 0.55 * clampedEf;
  }
  // IVF probes buckets whose size grows linearly with N/nlist
  return 1.2 + 0.14 * datasetMillions * clampedEf;
}

export function analyzeAnnTradeoff({
  ef = 60,
  datasetMillions = 10,
  indexKind = 'hnsw',
  query = [0.95, 0.85] as const,
  topK = 3,
}: {
  ef?: number;
  datasetMillions?: number;
  indexKind?: AnnIndexKind;
  query?: readonly [number, number];
  topK?: number;
} = {}): AnnAnalysis {
  const clampedEf = Math.max(1, Math.min(300, Math.round(ef)));
  const clampedMillions = Math.max(0.005, Math.min(50, datasetMillions));
  const nodes = DEMO_VECTOR_GRAPH;
  const exactTopKIds = exactSearchGraph(nodes, query, topK);

  const evaluateAt = (targetEf: number): AnnTraceStep & { step: number } => {
    const budgetVisits = Math.max(3, Math.min(nodes.length, Math.round(2 + (targetEf / 220) * (nodes.length - 4))));
    const search = beamSearchGraph(nodes, query, budgetVisits, topK);
    const exactSet = new Set(exactTopKIds);
    const demoHits = search.topKIds.filter((id) => exactSet.has(id)).length;
    const demoRecallPct = (demoHits / topK) * 100;
    const recallPct = annRecallPct(targetEf, indexKind);
    const annLatencyMs = annSearchLatencyMs(clampedMillions, targetEf, indexKind);
    const exactLatencyMs = exactScanLatencyMs(clampedMillions);
    const speedup = annLatencyMs > 0 ? exactLatencyMs / annLatencyMs : 1;

    let explain = '';
    if (exactLatencyMs <= annLatencyMs + 0.5) {
      explain = `At ${Math.round(clampedMillions * 1_000_000).toLocaleString('en-US')} vectors, exact brute-force takes only ${exactLatencyMs.toFixed(1)} ms — faster than graph overhead with 100% recall.`;
    } else if (recallPct < 80) {
      explain = `At ef = ${targetEf}, ${indexKind.toUpperCase()} is super fast (${annLatencyMs.toFixed(1)} ms, ${speedup.toFixed(0)}× faster than exact), but stops early and misses neighbors (~${recallPct.toFixed(0)}% recall).`;
    } else {
      explain = `At ef = ${targetEf}, ${indexKind.toUpperCase()} reaches ~${recallPct.toFixed(1)}% recall in ${annLatencyMs.toFixed(1)} ms — still ${speedup.toFixed(1)}× faster than the ${exactLatencyMs.toFixed(0)} ms exact scan.`;
    }

    return {
      step: targetEf,
      ef: targetEf,
      recallPct,
      annLatencyMs,
      exactLatencyMs,
      speedup,
      visitedIds: search.visitedIds,
      annTopKIds: search.topKIds,
      exactTopKIds,
      demoHits,
      demoRecallPct,
      explain,
    };
  };

  const current = evaluateAt(clampedEf);
  const curve: AnnCurvePoint[] = [];
  for (let i = 0; i < 50; i++) {
    const e = 1 + (i / 49) * 300;
    curve.push({
      ef: e,
      recallPct: annRecallPct(e, indexKind),
      annLatencyMs: annSearchLatencyMs(clampedMillions, e, indexKind),
    });
  }

  const trace = ANN_TRACE_EFS.map((e, idx) => ({
    ...evaluateAt(e),
    step: idx,
  }));

  return {
    ef: clampedEf,
    datasetMillions: clampedMillions,
    indexKind,
    query,
    topK,
    nodes,
    exactTopKIds,
    annTopKIds: current.annTopKIds,
    visitedIds: current.visitedIds,
    demoHits: current.demoHits,
    demoRecallPct: current.demoRecallPct,
    recallPct: current.recallPct,
    annLatencyMs: current.annLatencyMs,
    exactLatencyMs: current.exactLatencyMs,
    speedup: current.speedup,
    exactWinsAtScale: current.exactLatencyMs <= current.annLatencyMs + 0.5,
    curve,
    trace,
  };
}
