export type AggregatorKind = 'mean' | 'max' | 'sum' | 'gin';

export type GinPresetId = 'same-average' | 'same-max' | 'self-feature' | 'molecule-degree';

export interface GinPreset {
  id: GinPresetId;
  label: string;
  neighborsAText: string;
  neighborsBText: string;
  centerA: number;
  centerB: number;
  epsilon: number;
}

export const GIN_PRESETS: readonly GinPreset[] = [
  {
    id: 'same-average',
    label: 'Same average (2 vs 4 friends)',
    neighborsAText: '1, 1',
    neighborsBText: '1, 1, 1, 1',
    centerA: 0.5,
    centerB: 0.5,
    epsilon: 0,
  },
  {
    id: 'same-max',
    label: 'Same biggest neighbor (1, 5 vs 1, 5, 5)',
    neighborsAText: '1, 5',
    neighborsBText: '1, 5, 5',
    centerA: 0.5,
    centerB: 0.5,
    epsilon: 0,
  },
  {
    id: 'self-feature',
    label: 'Different center number (ε > 0)',
    neighborsAText: '1, 1',
    neighborsBText: '1, 1',
    centerA: 2.0,
    centerB: 0.5,
    epsilon: 0.5,
  },
  {
    id: 'molecule-degree',
    label: 'Atom bond count (3 vs 6)',
    neighborsAText: '1, 1, 1',
    neighborsBText: '1, 1, 1, 1, 1, 1',
    centerA: 1.0,
    centerB: 1.0,
    epsilon: 0,
  },
];

export interface GinNodeAggregation {
  kind: AggregatorKind;
  neighbors: number[];
  centerValue: number;
  epsilon: number;
  neighborCount: number;
  neighborSum: number;
  neighborMean: number;
  neighborMax: number;
  preActivation: number;
  mlpOutput: number;
  output: number;
}

export interface GinComparisonResult {
  kind: AggregatorKind;
  graphA: GinNodeAggregation;
  graphB: GinNodeAggregation;
  multisetDiffers: boolean;
  centerDiffers: boolean;
  structureDiffers: boolean;
  outputsMatch: boolean;
  isBlindCollision: boolean;
  outputGap: number;
}

export const GIN_STEPS = [
  { id: 0, label: '1. Read dot numbers' },
  { id: 1, label: '2. Pass messages inward' },
  { id: 2, label: '3. Combine into center' },
  { id: 3, label: '4. Compare A vs B' },
] as const;

export function parseNeighborList(raw: string, maxCount = 8): number[] {
  const tokens = raw
    .split(/[,\s]+/)
    .map((part) => part.trim())
    .filter(Boolean);

  const parsed: number[] = [];
  for (const token of tokens) {
    const num = Number(token);
    if (Number.isFinite(num)) {
      const clamped = Math.max(-10, Math.min(20, num));
      parsed.push(Math.round(clamped * 100) / 100);
      if (parsed.length >= maxCount) break;
    }
  }
  return parsed.length > 0 ? parsed : [1, 1];
}

/**
 * Deterministic 2-layer ReLU MLP for the GIN update rule:
 * MLP(z) = 0.8 * ReLU(0.75 * z + 0.5) + 0.6 * ReLU(0.45 * z - 0.3) + 0.1.
 * Positive slopes keep the scalar map one-to-one across non-negative inputs.
 */
export function ginMlp(z: number): number {
  const h1 = Math.max(0, 0.75 * z + 0.5);
  const h2 = Math.max(0, 0.45 * z - 0.3);
  return Math.round((0.8 * h1 + 0.6 * h2 + 0.1) * 1000) / 1000;
}

export function aggregateNode(
  neighbors: readonly number[],
  centerValue: number,
  epsilon: number,
  kind: AggregatorKind,
): GinNodeAggregation {
  const cleanNeighbors = neighbors.length > 0 ? [...neighbors] : [0];
  const neighborCount = cleanNeighbors.length;
  const neighborSum = cleanNeighbors.reduce((acc, v) => acc + v, 0);
  const neighborMean = neighborSum / neighborCount;
  const neighborMax = Math.max(...cleanNeighbors);
  const preActivation = (1 + epsilon) * centerValue + neighborSum;
  const mlpOutput = ginMlp(preActivation);

  let output = neighborSum;
  if (kind === 'mean') output = neighborMean;
  else if (kind === 'max') output = neighborMax;
  else if (kind === 'gin') output = mlpOutput;

  return {
    kind,
    neighbors: cleanNeighbors,
    centerValue,
    epsilon,
    neighborCount,
    neighborSum,
    neighborMean,
    neighborMax,
    preActivation,
    mlpOutput,
    output,
  };
}

export function areMultisetsEqual(a: readonly number[], b: readonly number[]): boolean {
  if (a.length !== b.length) return false;
  const sa = [...a].sort((x, y) => x - y);
  const sb = [...b].sort((x, y) => x - y);
  return sa.every((val, i) => Math.abs(val - sb[i]) < 1e-9);
}

export function compareGraphs(params: {
  neighborsA: readonly number[];
  neighborsB: readonly number[];
  centerA: number;
  centerB: number;
  epsilon: number;
  kind: AggregatorKind;
}): GinComparisonResult {
  const graphA = aggregateNode(params.neighborsA, params.centerA, params.epsilon, params.kind);
  const graphB = aggregateNode(params.neighborsB, params.centerB, params.epsilon, params.kind);
  const multisetDiffers = !areMultisetsEqual(graphA.neighbors, graphB.neighbors);
  const centerDiffers = Math.abs(params.centerA - params.centerB) > 1e-6;
  const structureDiffers = multisetDiffers || centerDiffers;
  const outputGap = Math.abs(graphA.output - graphB.output);
  const outputsMatch = outputGap < 1e-6;
  const isBlindCollision = structureDiffers && outputsMatch;

  return {
    kind: params.kind,
    graphA,
    graphB,
    multisetDiffers,
    centerDiffers,
    structureDiffers,
    outputsMatch,
    isBlindCollision,
    outputGap,
  };
}

export function explainGinStep(result: GinComparisonResult, step: number): string {
  const { graphA, graphB, kind, isBlindCollision, structureDiffers } = result;
  const ruleName =
    kind === 'mean'
      ? 'Mean (average)'
      : kind === 'max'
        ? 'Max (largest)'
        : kind === 'sum'
          ? 'Sum'
          : 'GIN';

  if (step === 0) {
    return `Start with two neighborhoods: Graph A has ${graphA.neighborCount} connected dots [${graphA.neighbors.join(', ')}] around center h_v = ${graphA.centerValue.toFixed(1)}; Graph B has ${graphB.neighborCount} dots [${graphB.neighbors.join(', ')}] around h_v = ${graphB.centerValue.toFixed(1)}.`;
  }
  if (step === 1) {
    return `Each connected neighbor sends its number (h_u) along the line into the center dot (${graphA.neighborCount} incoming numbers in A, ${graphB.neighborCount} in B).`;
  }
  if (step === 2) {
    if (kind === 'mean') {
      return `Mean adds the neighbor numbers and divides by how many there are: A gives ${graphA.neighborSum.toFixed(2)} ÷ ${graphA.neighborCount} = ${graphA.output.toFixed(2)}, and B gives ${graphB.neighborSum.toFixed(2)} ÷ ${graphB.neighborCount} = ${graphB.output.toFixed(2)}.`;
    }
    if (kind === 'max') {
      return `Max keeps only the single largest neighbor value and throws away repeats: A gives ${graphA.output.toFixed(2)} and B gives ${graphB.output.toFixed(2)}.`;
    }
    if (kind === 'sum') {
      return `Sum adds every neighbor number without dividing: A gives ${graphA.output.toFixed(2)} and B gives ${graphB.output.toFixed(2)}, keeping exact counts.`;
    }
    return `GIN adds (1+${graphA.epsilon.toFixed(1)})×center + neighbor sum (${graphA.preActivation.toFixed(2)} for A, ${graphB.preActivation.toFixed(2)} for B), then passes each through a small neural net (MLP) to get ${graphA.output.toFixed(2)} vs ${graphB.output.toFixed(2)}.`;
  }

  if (!structureDiffers) {
    return `Right now Graph A and Graph B have the exact same center and neighbor numbers, so ${ruleName} correctly maps both to ${graphA.output.toFixed(2)}.`;
  }
  if (isBlindCollision) {
    return `Blind spot! Graph A and Graph B are clearly different shapes, yet ${ruleName} outputs ${graphA.output.toFixed(2)} for both — they land on the exact same point, so the classifier cannot tell them apart.`;
  }
  return `Distinguished! ${ruleName} maps A to ${graphA.output.toFixed(2)} and B to ${graphB.output.toFixed(2)} (gap ${result.outputGap.toFixed(2)}), so the next layer sees two different numbers.`;
}
