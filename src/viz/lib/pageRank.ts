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
  d: number = 0.85
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
  tolerance: number = 1e-6
): { history: Record<string, number>[]; converged: Record<string, number> } {
  const N = graph.nodes.length;
  let p: Record<string, number> = {};
  for (const n of graph.nodes) p[n] = 1 / N;

  const history: Record<string, number>[] = [{ ...p }];

  for (let step = 0; step < maxIterations; step++) {
    const nextP = powerIterationStep(p, graph, d);
    history.push({ ...nextP });

    // Check convergence
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
