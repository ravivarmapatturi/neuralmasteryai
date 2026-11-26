export type TraversalMode = 'graph' | 'tree';
export type GraphAlgo = 'bfs' | 'dfs';
export type GraphPresetId = 'diamond' | 'branching' | 'islands';

export interface GraphPreset {
  id: GraphPresetId;
  label: string;
  text: string;
  defaultStart: string;
  defaultTarget: string;
}

export const DEFAULT_GRAPH_TEXT = 'A: B, C\nB: A, D\nC: A, D\nD: B, C, E\nE: D';

export const GRAPH_PRESETS: readonly GraphPreset[] = [
  {
    id: 'diamond',
    label: 'Diamond + tail',
    text: DEFAULT_GRAPH_TEXT,
    defaultStart: 'A',
    defaultTarget: 'C',
  },
  {
    id: 'branching',
    label: 'Branching network',
    text: 'A: B, C\nB: A, D, E\nC: A, F\nD: B\nE: B\nF: C',
    defaultStart: 'A',
    defaultTarget: 'F',
  },
  {
    id: 'islands',
    label: 'Two separate islands',
    text: 'A: B, C\nB: A, C\nC: A, B\nD: E\nE: D',
    defaultStart: 'A',
    defaultTarget: 'D',
  },
] as const;

export interface ParsedGraph {
  adj: Record<string, string[]>;
  order: string[];
  edges: [string, string][];
}

export function parseGraph(text: string, maxNodes = 10): ParsedGraph {
  const adj: Record<string, string[]> = {};
  const order: string[] = [];
  const seen = new Set<string>();

  const ensure = (id: string) => {
    if (!seen.has(id) && order.length < maxNodes) {
      seen.add(id);
      order.push(id);
      adj[id] = adj[id] || [];
    }
  };

  text.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    const colonIdx = trimmed.indexOf(':');
    if (colonIdx === -1) {
      const solo = trimmed.slice(0, 6).trim();
      if (solo) ensure(solo);
      return;
    }
    const node = trimmed.slice(0, colonIdx).trim().slice(0, 6);
    if (!node) return;
    ensure(node);
    if (!seen.has(node)) return;
    const rawNeighbors = trimmed
      .slice(colonIdx + 1)
      .split(',')
      .map((s) => s.trim().slice(0, 6))
      .filter(Boolean);
    const validNeighbors: string[] = [];
    for (const nb of rawNeighbors) {
      ensure(nb);
      if (seen.has(nb) && !validNeighbors.includes(nb)) {
        validNeighbors.push(nb);
      }
    }
    adj[node] = validNeighbors;
  });

  const edgeSet = new Set<string>();
  const edges: [string, string][] = [];
  for (const node of order) {
    for (const nb of adj[node] || []) {
      const key = [node, nb].sort().join('|');
      if (!edgeSet.has(key)) {
        edgeSet.add(key);
        edges.push([node, nb]);
      }
    }
  }

  return { adj, order, edges };
}

export interface GraphStep {
  stepIndex: number;
  action: 'visit' | 'skip-duplicate';
  current: string;
  frontier: string[];
  duplicateIndices: number[];
  visitedOrder: string[];
  distances: Record<string, number>;
  parents: Record<string, string | null>;
  justAdded: string[];
  explanation: string;
}

function findDuplicateIndices(items: readonly string[]): number[] {
  const seen = new Set<string>();
  const dups: number[] = [];
  // For DFS stack displayed bottom -> top, the rightmost copy pops first,
  // so earlier copies below it are the buried duplicates.
  for (let i = items.length - 1; i >= 0; i -= 1) {
    if (seen.has(items[i])) dups.push(i);
    else seen.add(items[i]);
  }
  return dups;
}

/**
 * Exact breadth-first search trace.
 * Marks neighbors visited when enqueued so the queue never contains duplicates
 * and every visited node gets its true shortest hop distance from `start`.
 */
export function computeBfsSteps(adj: Record<string, string[]>, start: string): GraphStep[] {
  if (!start || !adj[start]) return [];
  const visited = new Set<string>([start]);
  const queue: string[] = [start];
  const visitedOrder: string[] = [];
  const distances: Record<string, number> = { [start]: 0 };
  const parents: Record<string, string | null> = { [start]: null };
  const steps: GraphStep[] = [];

  while (queue.length > 0) {
    const node = queue.shift() as string;
    visitedOrder.push(node);
    const justAdded: string[] = [];
    for (const neighbor of adj[node] || []) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        distances[neighbor] = distances[node] + 1;
        parents[neighbor] = node;
        queue.push(neighbor);
        justAdded.push(neighbor);
      }
    }
    const addedDesc =
      justAdded.length > 0
        ? `Added unvisited neighbors (${justAdded.join(', ')}) at ${distances[node] + 1} hop${distances[node] + 1 === 1 ? '' : 's'} to the back of Q.`
        : 'All neighbors were already marked visited, so nothing joins Q.';
    steps.push({
      stepIndex: steps.length,
      action: 'visit',
      current: node,
      frontier: [...queue],
      duplicateIndices: [],
      visitedOrder: [...visitedOrder],
      distances: { ...distances },
      parents: { ...parents },
      justAdded,
      explanation: `Popped ${node} from the front of queue Q (d = ${distances[node]}). ${addedDesc}`,
    });
  }

  return steps;
}

/**
 * Exact depth-first search trace using an explicit stack with lazy visited check on pop.
 * Pushes unvisited neighbors in reverse order so the first listed neighbor sits on top.
 * Because visited is checked on pop, the same node can appear twice in the stack and
 * gets skipped cleanly when its duplicate copy is popped later.
 */
export function computeDfsSteps(adj: Record<string, string[]>, start: string): GraphStep[] {
  if (!start || !adj[start]) return [];
  const visited = new Set<string>();
  const stack: { id: string; parent: string | null; depth: number }[] = [
    { id: start, parent: null, depth: 0 },
  ];
  const visitedOrder: string[] = [];
  const distances: Record<string, number> = {};
  const parents: Record<string, string | null> = {};
  const steps: GraphStep[] = [];

  while (stack.length > 0) {
    const item = stack.pop() as { id: string; parent: string | null; depth: number };
    const node = item.id;
    if (visited.has(node)) {
      const frontierIds = stack.map((entry) => entry.id);
      steps.push({
        stepIndex: steps.length,
        action: 'skip-duplicate',
        current: node,
        frontier: frontierIds,
        duplicateIndices: findDuplicateIndices(frontierIds),
        visitedOrder: [...visitedOrder],
        distances: { ...distances },
        parents: { ...parents },
        justAdded: [],
        explanation: `Popped duplicate ${node} from top of stack S — ${node} was already visited earlier, so DFS skips it without revisiting.`,
      });
      continue;
    }

    visited.add(node);
    visitedOrder.push(node);
    parents[node] = item.parent;
    distances[node] = item.depth;

    const neighbors = adj[node] || [];
    const justAdded: string[] = [];
    for (let i = neighbors.length - 1; i >= 0; i -= 1) {
      const nb = neighbors[i];
      if (!visited.has(nb)) {
        stack.push({ id: nb, parent: node, depth: item.depth + 1 });
        justAdded.unshift(nb);
      }
    }

    const frontierIds = stack.map((entry) => entry.id);
    const duplicateIndices = findDuplicateIndices(frontierIds);
    const addedDesc =
      justAdded.length > 0
        ? `Pushed ${justAdded.join(', ')} onto top of stack S${duplicateIndices.length > 0 ? ' (leaving a duplicate copy in S)' : ''}.`
        : 'No unvisited neighbors left here, so DFS will backtrack from S.';

    steps.push({
      stepIndex: steps.length,
      action: 'visit',
      current: node,
      frontier: frontierIds,
      duplicateIndices,
      visitedOrder: [...visitedOrder],
      distances: { ...distances },
      parents: { ...parents },
      justAdded,
      explanation: `Popped ${node} from top of stack S (path depth ${item.depth}). ${addedDesc}`,
    });
  }

  return steps;
}

export function reconstructPath(
  parents: Record<string, string | null>,
  start: string,
  target: string,
): string[] | null {
  if (!start || !target || parents[target] === undefined) return null;
  const path: string[] = [];
  let cursor: string | null | undefined = target;
  const guard = new Set<string>();
  while (cursor) {
    if (guard.has(cursor)) return null;
    guard.add(cursor);
    path.unshift(cursor);
    if (cursor === start) return path;
    cursor = parents[cursor];
  }
  return null;
}

// --- Tree LCA -----------------------------------------------------------

export interface TreeNodeSpec {
  id: string;
  x: number;
  y: number;
  left?: string;
  right?: string;
}

export const TREE_NODES: Record<string, TreeNodeSpec> = {
  '1': { id: '1', x: 206, y: 56, left: '2', right: '3' },
  '2': { id: '2', x: 126, y: 128, left: '4', right: '5' },
  '3': { id: '3', x: 286, y: 128, right: '6' },
  '4': { id: '4', x: 76, y: 212 },
  '5': { id: '5', x: 176, y: 212 },
  '6': { id: '6', x: 332, y: 212, left: '7' },
  '7': { id: '7', x: 282, y: 292 },
};

export const TREE_NODE_IDS = ['1', '2', '3', '4', '5', '6', '7'] as const;

export const TREE_PAIR_PRESETS: readonly { label: string; p: string; q: string }[] = [
  { label: 'Siblings (4, 5)', p: '4', q: '5' },
  { label: 'Across root (4, 3)', p: '4', q: '3' },
  { label: 'Ancestor & child (6, 7)', p: '6', q: '7' },
] as const;

export interface LcaStep {
  stepIndex: number;
  activePath: string[];
  node: string;
  phase: 'match' | 'visit' | 'combine';
  leftReturn?: string | null;
  rightReturn?: string | null;
  result: string | null;
  resolved: Record<string, string | null>;
  detail: string;
}

export function buildLcaSteps(pId: string, qId: string): { steps: LcaStep[]; finalResult: string | null } {
  const steps: LcaStep[] = [];
  const resolved: Record<string, string | null> = {};

  function visit(nodeId: string | undefined, path: string[]): string | null {
    if (nodeId === undefined) return null;
    const curPath = [...path, nodeId];
    if (nodeId === pId || nodeId === qId) {
      resolved[nodeId] = nodeId;
      steps.push({
        stepIndex: steps.length,
        activePath: curPath,
        node: nodeId,
        phase: 'match',
        result: nodeId,
        resolved: { ...resolved },
        detail: `Node ${nodeId} matches target ${nodeId === pId ? 'p' : 'q'} — returns ${nodeId} up immediately without searching its children.`,
      });
      return nodeId;
    }

    steps.push({
      stepIndex: steps.length,
      activePath: curPath,
      node: nodeId,
      phase: 'visit',
      result: null,
      resolved: { ...resolved },
      detail: `Visiting node ${nodeId} (not ${pId} or ${qId}) — search left child, then right child.`,
    });

    const node = TREE_NODES[nodeId];
    const left = visit(node.left, curPath);
    const right = visit(node.right, curPath);
    let result: string | null;
    let detail: string;
    if (left && right) {
      result = nodeId;
      detail = `Both sides of node ${nodeId} found a target (left → ${left}, right → ${right}), so ${nodeId} is the lowest common ancestor!`;
    } else {
      result = left || right;
      detail = result
        ? `Only one side of node ${nodeId} found a target (left → ${left ?? 'null'}, right → ${right ?? 'null'}), so it passes ${result} upward.`
        : `Neither child of node ${nodeId} held ${pId} or ${qId}, so it returns null.`;
    }
    resolved[nodeId] = result;
    steps.push({
      stepIndex: steps.length,
      activePath: curPath,
      node: nodeId,
      phase: 'combine',
      leftReturn: left,
      rightReturn: right,
      result,
      resolved: { ...resolved },
      detail,
    });
    return result;
  }

  const finalResult = visit('1', []);
  return { steps, finalResult };
}
