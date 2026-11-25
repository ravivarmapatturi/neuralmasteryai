import { architectureEntries } from '../../data/agentArchitectureAtlas';
import { inferenceAtlasEntries } from '../../data/inferenceAtlas';
import { trainingAtlas } from '../../data/trainingAtlas';

export type AtlasDomain = 'inference' | 'training' | 'agents';

export const TRADEOFF_AXES = [
  { key: 'throughput', label: 'Throughput / speed' },
  { key: 'memory', label: 'Memory savings' },
  { key: 'simplicity', label: 'Simplicity' },
  { key: 'fidelity', label: 'Output fidelity' },
  { key: 'robustness', label: 'Operational safety' },
] as const;

export type TradeoffAxisKey = (typeof TRADEOFF_AXES)[number]['key'];

export interface TechniqueProfile {
  id: string;
  domain: AtlasDomain;
  name: string;
  year: string;
  summary: string;
  avoid: string;
  metrics: string;
  learnPath: string;
  /** Qualitative 1-5 rubric ratings (illustrative engineering profile). */
  scores: Record<TradeoffAxisKey, number>;
}

const inferenceById = new Map(inferenceAtlasEntries.map((e) => [e.id, e]));
const trainingById = new Map(trainingAtlas.map((e) => [e.id, e]));
const agentById = new Map(architectureEntries.map((e) => [e.id, e]));

function inf(
  id: string,
  scores: Record<TradeoffAxisKey, number>,
): TechniqueProfile {
  const entry = inferenceById.get(id);
  if (!entry) throw new Error(`Missing inference atlas entry: ${id}`);
  return {
    id: entry.id,
    domain: 'inference',
    name: entry.name,
    year: String(entry.year),
    summary: entry.whatItIs,
    avoid: entry.avoid,
    metrics: entry.metrics,
    learnPath: entry.learnPath,
    scores,
  };
}

function trn(
  id: string,
  scores: Record<TradeoffAxisKey, number>,
): TechniqueProfile {
  const entry = trainingById.get(id);
  if (!entry) throw new Error(`Missing training atlas entry: ${id}`);
  return {
    id: entry.id,
    domain: 'training',
    name: entry.name,
    year: String(entry.year),
    summary: entry.whatItIs,
    avoid: entry.whenNotToUse,
    metrics: entry.metrics,
    learnPath: entry.learnPath,
    scores,
  };
}

function agt(
  id: string,
  scores: Record<TradeoffAxisKey, number>,
): TechniqueProfile {
  const entry = agentById.get(id);
  if (!entry) throw new Error(`Missing agent architecture atlas entry: ${id}`);
  return {
    id: entry.id,
    domain: 'agents',
    name: entry.name,
    year: entry.date.slice(0, 4),
    summary: entry.what,
    avoid: entry.avoid,
    metrics: `Best suited to ${entry.layer.toLowerCase()} workflows; limit: ${entry.limit}`,
    learnPath: entry.learnPath,
    scores,
  };
}

export const TECHNIQUE_PROFILES: TechniqueProfile[] = [
  // Inference techniques
  inf('paged-kv-cache', { throughput: 5, memory: 5, simplicity: 2, fidelity: 5, robustness: 4 }),
  inf('prefix-caching', { throughput: 5, memory: 4, simplicity: 3, fidelity: 5, robustness: 3 }),
  inf('continuous-batching', { throughput: 5, memory: 3, simplicity: 2, fidelity: 5, robustness: 4 }),
  inf('speculative-decoding', { throughput: 4, memory: 2, simplicity: 2, fidelity: 5, robustness: 3 }),
  inf('awq', { throughput: 4, memory: 5, simplicity: 3, fidelity: 4, robustness: 4 }),
  inf('disaggregated-prefill-decode', { throughput: 5, memory: 3, simplicity: 1, fidelity: 5, robustness: 3 }),

  // Training & adaptation techniques
  trn('sft', { throughput: 3, memory: 2, simplicity: 4, fidelity: 4, robustness: 4 }),
  trn('lora', { throughput: 4, memory: 4, simplicity: 4, fidelity: 4, robustness: 5 }),
  trn('qlora', { throughput: 3, memory: 5, simplicity: 3, fidelity: 3, robustness: 4 }),
  trn('dpo', { throughput: 4, memory: 3, simplicity: 4, fidelity: 4, robustness: 4 }),
  trn('rlhf-ppo', { throughput: 2, memory: 1, simplicity: 1, fidelity: 5, robustness: 2 }),
  trn('gradient-checkpointing', { throughput: 2, memory: 5, simplicity: 5, fidelity: 5, robustness: 5 }),

  // Agent architecture patterns
  agt('ai-chains', { throughput: 4, memory: 4, simplicity: 5, fidelity: 4, robustness: 5 }),
  agt('react', { throughput: 3, memory: 3, simplicity: 4, fidelity: 4, robustness: 3 }),
  agt('tree-of-thoughts', { throughput: 1, memory: 2, simplicity: 2, fidelity: 5, robustness: 3 }),
  agt('langgraph', { throughput: 3, memory: 3, simplicity: 2, fidelity: 4, robustness: 5 }),
  agt('routing-workflow', { throughput: 5, memory: 4, simplicity: 4, fidelity: 4, robustness: 5 }),
  agt('orchestrator-workers', { throughput: 4, memory: 2, simplicity: 2, fidelity: 4, robustness: 4 }),
];

export function computeRadarPolygonPoints(
  scores: Record<TradeoffAxisKey, number>,
  cx: number,
  cy: number,
  radius: number,
): string {
  return TRADEOFF_AXES.map((axis, idx) => {
    const angle = -Math.PI / 2 + (idx * 2 * Math.PI) / TRADEOFF_AXES.length;
    const r = (scores[axis.key] / 5) * radius;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
}

export function computeAxisTip(idx: number, cx: number, cy: number, radius: number): { x: number; y: number } {
  const angle = -Math.PI / 2 + (idx * 2 * Math.PI) / TRADEOFF_AXES.length;
  return {
    x: cx + radius * Math.cos(angle),
    y: cy + radius * Math.sin(angle),
  };
}
