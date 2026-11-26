export interface PageRankNode {
  id: string;
  label: string;
  outDegree: number;
  inDegree: number;
}

export interface PageRankEdge {
  from: string;
  to: string;
}

export interface PageRankGraph {
  nodes: string[]; // e.g. ['A', 'B', 'C', 'D']
  edges: PageRankEdge[];
}

/**
 * Standard 4-node worked example graph:
 * A -> B, A -> C
 * B -> C
 * C -> A
 * D -> C (D has in-degree 0)
 */
export const WORKED_PAGERANK_GRAPH: PageRankGraph = {
  nodes: ['A', 'B', 'C', 'D'],
  edges: [
    { from: 'A', to: 'B' },
    { from: 'A', to: 'C' },
    { from: 'B', to: 'C' },
    { from: 'C', to: 'A' },
    { from: 'D', to: 'C' },
  ],
};

export interface PageRankPreset {
  id: string;
  label: string;
  edges: readonly PageRankEdge[];
}

export const PAGERANK_GRAPH_PRESETS: readonly PageRankPreset[] = [
  {
    id: 'worked',
    label: 'Worked 4-page web (D unlinked)',
    edges: WORKED_PAGERANK_GRAPH.edges,
  },
  {
    id: 'link-c-to-d',
    label: 'Add link C → D (rescues D)',
    edges: [...WORKED_PAGERANK_GRAPH.edges, { from: 'C', to: 'D' }],
  },
  {
    id: 'dangling-c',
    label: 'Dangling C (remove C → A)',
    edges: WORKED_PAGERANK_GRAPH.edges.filter((e) => !(e.from === 'C' && e.to === 'A')),
  },
];

export function getOutDegrees(graph: PageRankGraph): Record<string, number> {
  const outDeg: Record<string, number> = {};
  for (const n of graph.nodes) outDeg[n] = 0;
  for (const e of graph.edges) {
    outDeg[e.from] = (outDeg[e.from] || 0) + 1;
  }
  return outDeg;
}

export function getInNeighbors(graph: PageRankGraph): Record<string, string[]> {
  const inNeigh: Record<string, string[]> = {};
  for (const n of graph.nodes) inNeigh[n] = [];
  for (const e of graph.edges) {
    if (!inNeigh[e.to]) inNeigh[e.to] = [];
    inNeigh[e.to].push(e.from);
  }
  return inNeigh;
}

/**
 * Single power iteration step:
 * PR_{t+1}(u) = (1 - d)/N + d * sum_{v in In(u)} (PR_t(v) / L(v)) + (d/N) * sum_{dangling} PR_t(dangling)
 */
export function powerIterationStep(
  currentP: Record<string, number>,
  graph: PageRankGraph,
  d: number = 0.85,
): Record<string, number> {
  const N = graph.nodes.length;
  const outDegrees = getOutDegrees(graph);
  const inNeighbors = getInNeighbors(graph);
  const nextP: Record<string, number> = {};

  // Check for dangling nodes (out-degree 0)
  let danglingSum = 0;
  for (const node of graph.nodes) {
    if (outDegrees[node] === 0) {
      danglingSum += currentP[node] || 0;
    }
  }

  const baseTeleport = (1 - d) / N + (d * danglingSum) / N;

  for (const u of graph.nodes) {
    let linkMass = 0;
    const inNodes = inNeighbors[u] || [];
    for (const v of inNodes) {
      const L_v = outDegrees[v];
      if (L_v > 0) {
        linkMass += (currentP[v] || 0) / L_v;
      }
    }
    nextP[u] = baseTeleport + d * linkMass;
  }

  return nextP;
}

/**
 * Run PageRank power iteration until convergence or max iterations.
 */
export function runPageRank(
  graph: PageRankGraph,
  d: number = 0.85,
  maxIterations: number = 30,
  tolerance: number = 1e-6,
): { history: Record<string, number>[]; converged: Record<string, number> } {
  const N = graph.nodes.length;
  let p: Record<string, number> = {};
  for (const n of graph.nodes) p[n] = 1 / N;

  const history: Record<string, number>[] = [{ ...p }];

  for (let step = 0; step < maxIterations; step++) {
    const nextP = powerIterationStep(p, graph, d);
    history.push({ ...nextP });

    let maxDiff = 0;
    for (const n of graph.nodes) {
      const diff = Math.abs(nextP[n] - p[n]);
      if (diff > maxDiff) maxDiff = diff;
    }
    p = nextP;
    if (maxDiff < tolerance) break;
  }

  return { history, converged: p };
}

/** Standard half-up 4-decimal formatting so 0.14375 -> "0.1438" matching mathematical rounding. */
export function formatPrScore(value: number): string {
  return (value + 1e-12).toFixed(4);
}

export interface NodeContribution {
  from: string;
  prevScore: number;
  outDegree: number;
  share: number;
}

export interface PageRankStepAnalysis {
  stepLabel: string;
  isConverged: boolean;
  damping: number;
  baseTeleport: number;
  danglingShare: number;
  totalBaseFloor: number;
  scores: Record<string, number>;
  prevScores: Record<string, number>;
  totalMass: number;
  focusNode: string;
  focusContributions: NodeContribution[];
  topNode: string;
  lowestNode: string;
  explain: string;
}

export function analyzePageRankStep({
  graph,
  damping,
  stepSlot,
  focusNode = 'C',
}: {
  graph: PageRankGraph;
  damping: number;
  stepSlot: number; // 0..4 => Iteration 0..4, 5 => Converged steady-state
  focusNode?: string;
}): PageRankStepAnalysis {
  const cleanD = Math.max(0, Math.min(1, Number.isFinite(damping) ? damping : 0.85));
  const cleanGraph: PageRankGraph = {
    nodes: graph.nodes,
    edges: graph.edges,
  };
  const { history, converged } = runPageRank(cleanGraph, cleanD, 60, 1e-6);
  const isConverged = stepSlot >= 5;
  const iterIdx = Math.min(Math.max(0, stepSlot), history.length - 1);
  const scores = isConverged ? converged : history[iterIdx];
  const prevScores = isConverged
    ? history[Math.max(0, history.length - 2)]
    : iterIdx === 0
      ? history[0]
      : history[iterIdx - 1];

  const outDeg = getOutDegrees(cleanGraph);
  const inNeigh = getInNeighbors(cleanGraph);
  const N = cleanGraph.nodes.length;
  const baseTeleport = (1 - cleanD) / N;

  let danglingMassPrev = 0;
  for (const n of cleanGraph.nodes) {
    if (outDeg[n] === 0) danglingMassPrev += prevScores[n] || 0;
  }
  const danglingShare = (cleanD * danglingMassPrev) / N;
  const totalBaseFloor = baseTeleport + danglingShare;

  const focus = cleanGraph.nodes.includes(focusNode) ? focusNode : cleanGraph.nodes[0];
  const focusContributions: NodeContribution[] = (inNeigh[focus] || []).map((from) => {
    const prev = prevScores[from] || 0;
    const deg = outDeg[from] || 1;
    return {
      from,
      prevScore: prev,
      outDegree: deg,
      share: prev / deg,
    };
  });

  const sorted = [...cleanGraph.nodes].sort((a, b) => (scores[b] || 0) - (scores[a] || 0));
  const topNode = sorted[0];
  const lowestNode = sorted[sorted.length - 1];
  const totalMass = cleanGraph.nodes.reduce((sum, n) => sum + (scores[n] || 0), 0);

  let explain = '';
  if (!isConverged && iterIdx === 0) {
    explain = `Step 0 (Start): Every page begins with equal trust ${formatPrScore(1 / N)}. No links have been followed yet.`;
  } else if (isConverged) {
    explain =
      cleanD === 1
        ? `Steady state with d = 1.00 (no random jump): Page ${lowestNode} drops to ${formatPrScore(scores[lowestNode])} because no links ever bring the surfer back there; Page ${topNode} leads at ${formatPrScore(scores[topNode])}.`
        : `Converged steady state (d = ${cleanD.toFixed(2)}): Page ${topNode} leads at ${formatPrScore(scores[topNode])}, while Page ${lowestNode} sits at ${formatPrScore(scores[lowestNode])} (protected by the ${formatPrScore(totalBaseFloor)} random-jump floor).`;
  } else {
    const incomingText =
      focusContributions.length > 0
        ? `receives ${focusContributions.length} incoming link share(s) from ${focusContributions.map((c) => c.from).join(', ')}`
        : 'has 0 incoming links, so it keeps only the random-jump floor';
    explain = `Step ${iterIdx} (d = ${cleanD.toFixed(2)}): Trust flows along arrows. Page ${focus} ${incomingText} and updates to ${formatPrScore(scores[focus])}; Page ${topNode} currently leads at ${formatPrScore(scores[topNode])}.`;
  }

  return {
    stepLabel: isConverged ? 'Converged' : `Step ${iterIdx}`,
    isConverged,
    damping: cleanD,
    baseTeleport,
    danglingShare,
    totalBaseFloor,
    scores,
    prevScores,
    totalMass,
    focusNode: focus,
    focusContributions,
    topNode,
    lowestNode,
    explain,
  };
}
