import { describe, expect, it } from 'vitest';
import {
  buildLcaSteps,
  computeBfsSteps,
  computeDfsSteps,
  DEFAULT_GRAPH_TEXT,
  parseGraph,
  reconstructPath,
} from './graphTreeTraversal';

describe('graphTreeTraversal pure computation', () => {
  it('parses the default diamond graph into nodes and unique undirected edges', () => {
    const parsed = parseGraph(DEFAULT_GRAPH_TEXT);
    expect(parsed.order).toEqual(['A', 'B', 'C', 'D', 'E']);
    expect(parsed.adj.A).toEqual(['B', 'C']);
    expect(parsed.adj.D).toEqual(['B', 'C', 'E']);
    expect(parsed.edges).toEqual([
      ['A', 'B'],
      ['A', 'C'],
      ['B', 'D'],
      ['C', 'D'],
      ['D', 'E'],
    ]);
  });

  it('computes level-order BFS with exact hop distances and zero queue duplicates', () => {
    const { adj } = parseGraph(DEFAULT_GRAPH_TEXT);
    const steps = computeBfsSteps(adj, 'A');
    expect(steps.map((s) => s.current)).toEqual(['A', 'B', 'C', 'D', 'E']);
    expect(steps[0].frontier).toEqual(['B', 'C']);
    expect(steps[1].frontier).toEqual(['C', 'D']);
    const last = steps[steps.length - 1];
    expect(last.distances).toEqual({ A: 0, B: 1, C: 1, D: 2, E: 3 });
    expect(reconstructPath(last.parents, 'A', 'C')).toEqual(['A', 'C']);
    expect(reconstructPath(last.parents, 'A', 'E')).toEqual(['A', 'B', 'D', 'E']);
  });

  it('computes lazy-pop DFS showing duplicate C in the stack and skipping it on pop', () => {
    const { adj } = parseGraph(DEFAULT_GRAPH_TEXT);
    const steps = computeDfsSteps(adj, 'A');
    // Step 2 visits D and pushes E, then C -> stack is ['C', 'E', 'C']
    expect(steps[2].current).toBe('D');
    expect(steps[2].frontier).toEqual(['C', 'E', 'C']);
    expect(steps[2].duplicateIndices).toEqual([0]);

    // DFS reaches C via A -> B -> D -> C (3 hops instead of BFS's 1 hop)
    const last = steps[steps.length - 1];
    expect(last.action).toBe('skip-duplicate');
    expect(last.current).toBe('C');
    expect(last.frontier).toEqual([]);
    expect(last.visitedOrder).toEqual(['A', 'B', 'D', 'C', 'E']);
    expect(last.distances.C).toBe(3);
    expect(reconstructPath(last.parents, 'A', 'C')).toEqual(['A', 'B', 'D', 'C']);
  });

  it('returns null path when target is on a disconnected island', () => {
    const { adj } = parseGraph('A: B\nB: A\nD: E\nE: D');
    const steps = computeBfsSteps(adj, 'A');
    const last = steps[steps.length - 1];
    expect(last.visitedOrder).toEqual(['A', 'B']);
    expect(reconstructPath(last.parents, 'A', 'D')).toBeNull();
  });

  it('traces Tree LCA for siblings (4, 5) continuing through right subtree before root confirms 2', () => {
    const { steps, finalResult } = buildLcaSteps('4', '5');
    expect(finalResult).toBe('2');
    expect(steps[2]).toMatchObject({ node: '4', phase: 'match', result: '4' });
    expect(steps[3]).toMatchObject({ node: '5', phase: 'match', result: '5' });
    expect(steps[4]).toMatchObject({ node: '2', phase: 'combine', leftReturn: '4', rightReturn: '5', result: '2' });
    // Continues exploring subtree 3 before root 1 returns 2
    expect(steps[5]).toMatchObject({ node: '3', phase: 'visit' });
    expect(steps[steps.length - 1]).toMatchObject({ node: '1', phase: 'combine', leftReturn: '2', rightReturn: null, result: '2' });
  });

  it('traces Tree LCA for ancestor and child (6, 7) without ever visiting node 7', () => {
    const { steps, finalResult } = buildLcaSteps('6', '7');
    expect(finalResult).toBe('6');
    expect(steps.some((s) => s.node === '7')).toBe(false);
    expect(steps.some((s) => s.node === '6' && s.phase === 'match')).toBe(true);
  });
});
