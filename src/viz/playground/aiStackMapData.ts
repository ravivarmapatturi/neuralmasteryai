export type StackLayerId = 'hardware' | 'runtimes' | 'frameworks' | 'agents' | 'evals';
export type RequestMode = 'chat' | 'rag' | 'agent';

export interface StackLayerSpec {
  id: StackLayerId;
  label: string;
  shortLabel: string;
  role: string;
  inputs: string;
  outputs: string;
  ifSkipped: string;
  baseLatencyMs: Record<RequestMode, number>;
  cachedLatencyMs: Record<RequestMode, number>;
  learnPath: string;
  learnTitle: string;
}

export const STACK_LAYERS: StackLayerSpec[] = [
  {
    id: 'hardware',
    label: 'Hardware & GPUs',
    shortLabel: 'Hardware',
    role: 'Provides HBM bandwidth for token decode and Tensor Core FLOPs for prompt prefill.',
    inputs: 'Quantized tensor tiles and KV blocks',
    outputs: 'Executed matmul kernels and next-token logits',
    ifSkipped: 'Without sized VRAM and bandwidth, weights offload to CPU or requests OOM under load.',
    baseLatencyMs: { chat: 180, rag: 260, agent: 640 },
    cachedLatencyMs: { chat: 110, rag: 180, agent: 360 },
    learnPath: '/docs/inference-engineering/roofline-and-kv-cache',
    learnTitle: 'The Roofline Model & KV Cache Mechanics',
  },
  {
    id: 'runtimes',
    label: 'Serving Runtimes',
    shortLabel: 'Runtimes',
    role: 'Schedules continuous batches, manages paged KV blocks, and reuses shared prompt prefixes.',
    inputs: 'Tokenized requests and sampling parameters',
    outputs: 'Streamed token deltas and usage counters',
    ifSkipped: 'Static one-at-a-time serving drops GPU utilization and re-prefills the system prompt on every call.',
    baseLatencyMs: { chat: 35, rag: 45, agent: 110 },
    cachedLatencyMs: { chat: 15, rag: 20, agent: 45 },
    learnPath: '/docs/mlops/llm-inference-engines',
    learnTitle: 'LLM Inference Engines',
  },
  {
    id: 'frameworks',
    label: 'Retrieval & Frameworks',
    shortLabel: 'Frameworks',
    role: 'Assembles prompt templates, fetches external chunks, and validates structured tool arguments.',
    inputs: 'User query, conversation state, and knowledge index',
    outputs: 'Bounded context payload with grounded evidence',
    ifSkipped: 'Unbounded retrieval or raw schema dumps inflate prompt tokens and invite hallucinated claims.',
    baseLatencyMs: { chat: 15, rag: 145, agent: 210 },
    cachedLatencyMs: { chat: 15, rag: 95, agent: 150 },
    learnPath: '/docs/llms-genai/rag',
    learnTitle: 'Retrieval-Augmented Generation (RAG)',
  },
  {
    id: 'agents',
    label: 'Agents & Harnesses',
    shortLabel: 'Agents',
    role: 'Routes multi-step tool calls, enforces step budgets, and runs deterministic verification checks.',
    inputs: 'Task goal, tool schemas, and sandbox observations',
    outputs: 'Verified actions, retries, and final structured reply',
    ifSkipped: 'Multi-step requests stall in infinite tool loops or claim completion before checking tests.',
    baseLatencyMs: { chat: 10, rag: 20, agent: 290 },
    cachedLatencyMs: { chat: 10, rag: 20, agent: 290 },
    learnPath: '/docs/harness-engineering/harness-architecture',
    learnTitle: 'Harness Architecture & Sandboxing',
  },
  {
    id: 'evals',
    label: 'Evaluation & Guardrails',
    shortLabel: 'Evals',
    role: 'Traces latency and cost per span, checks policy boundaries, and scores output quality.',
    inputs: 'Request span trace, candidate reply, and rubric',
    outputs: 'Pass/fail gate verdict, telemetry, and regression logs',
    ifSkipped: 'Silent prompt regressions, PII leaks, and runaway token bills reach users unnoticed.',
    baseLatencyMs: { chat: 25, rag: 60, agent: 130 },
    cachedLatencyMs: { chat: 25, rag: 60, agent: 130 },
    learnPath: '/docs/ai-evaluation/llm-rag-agent-evaluation',
    learnTitle: 'LLM, RAG & Agent Evaluation',
  },
];

export interface RequestTraceSummary {
  mode: RequestMode;
  activeLayers: StackLayerId[];
  totalLatencyMs: number;
  layerLatencies: Record<StackLayerId, number>;
  modelCalls: number;
  prefillTokens: number;
}

export function computeStackTrace(
  mode: RequestMode,
  prefixCacheEnabled: boolean,
  evalGateEnabled: boolean,
): RequestTraceSummary {
  const activeLayers: StackLayerId[] =
    mode === 'chat'
      ? ['frameworks', 'runtimes', 'hardware']
      : mode === 'rag'
        ? ['frameworks', 'runtimes', 'hardware']
        : ['agents', 'frameworks', 'runtimes', 'hardware'];
  if (evalGateEnabled) activeLayers.push('evals');

  const layerLatencies = {
    hardware: 0,
    runtimes: 0,
    frameworks: 0,
    agents: 0,
    evals: 0,
  } as Record<StackLayerId, number>;

  let totalLatencyMs = 0;
  for (const layer of STACK_LAYERS) {
    if (!activeLayers.includes(layer.id)) continue;
    const ms = prefixCacheEnabled ? layer.cachedLatencyMs[mode] : layer.baseLatencyMs[mode];
    layerLatencies[layer.id] = ms;
    totalLatencyMs += ms;
  }

  const modelCalls = mode === 'agent' ? 4 : 1;
  const rawTokens = mode === 'chat' ? 600 : mode === 'rag' ? 4200 : 12000;
  const prefillTokens = prefixCacheEnabled ? Math.round(rawTokens * 0.35) : rawTokens;

  return {
    mode,
    activeLayers,
    totalLatencyMs,
    layerLatencies,
    modelCalls,
    prefillTokens,
  };
}
