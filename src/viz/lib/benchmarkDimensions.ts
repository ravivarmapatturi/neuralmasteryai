export type BenchmarkSystemType = 'served' | 'retrieval';
export type ServedModelId = 'fast-8b' | 'balanced-70b' | 'reasoning-70b';
export type RetrievalPipelineId = 'bi-encoder' | 'hybrid-rerank';

export interface ServedModelSpec {
  id: ServedModelId;
  label: string;
  weightsGib: number;
  kvBytesPerToken: number;
  prefillTokPerMs: number;
  baseTtftMs: number;
  baseTpotMs: number;
  gpuCostPerHr: number;
  vramBudgetGib: number;
}

export const SERVED_MODELS: Record<ServedModelId, ServedModelSpec> = {
  'fast-8b': {
    id: 'fast-8b',
    label: 'Fast 8B (int8)',
    weightsGib: 8,
    kvBytesPerToken: 131_072,
    prefillTokPerMs: 20,
    baseTtftMs: 24,
    baseTpotMs: 7,
    gpuCostPerHr: 1.8,
    vramBudgetGib: 24,
  },
  'balanced-70b': {
    id: 'balanced-70b',
    label: 'Balanced 70B (int8)',
    weightsGib: 70,
    kvBytesPerToken: 327_680,
    prefillTokPerMs: 6,
    baseTtftMs: 50,
    baseTpotMs: 22,
    gpuCostPerHr: 4.5,
    vramBudgetGib: 80,
  },
  'reasoning-70b': {
    id: 'reasoning-70b',
    label: 'Reasoning 70B (long CoT)',
    weightsGib: 70,
    kvBytesPerToken: 327_680,
    prefillTokPerMs: 5,
    baseTtftMs: 70,
    baseTpotMs: 28,
    gpuCostPerHr: 4.5,
    vramBudgetGib: 80,
  },
};

export interface BenchmarkDimensionRow {
  id: 'latency' | 'core' | 'resource' | 'cost';
  title: string;
  valueLabel: string;
  coveredIn: string;
  plainWhy: string;
  gaugeFraction: number;
  passesTarget: boolean;
}

export interface BenchmarkAnalysis {
  system: BenchmarkSystemType;
  servedModel: ServedModelSpec;
  promptTokens: number;
  outputTokens: number;
  concurrency: number;
  ttftMs: number;
  tpotMs: number;
  e2eMs: number;
  throughputTokPerSec: number;
  kvCacheGib: number;
  totalVramGib: number;
  costPer1MTokens: number;
  fitsGpu: boolean;

  retrievalPipeline: RetrievalPipelineId;
  topK: number;
  rerankCandidates: number;
  relevantRanks: number[];
  hitsInTopK: number;
  recallAtK: number;
  precisionAtK: number;
  mrr: number;
  ndcgAtK: number;
  embedMs: number;
  annMs: number;
  rerankMs: number;
  retrievalLatencyMs: number;
  costPer1kQueries: number;

  dimensions: BenchmarkDimensionRow[];
  trace: { id: BenchmarkDimensionRow['id']; title: string; explain: string }[];
}

function clamp(v: number, min: number, max: number): number {
  if (!Number.isFinite(v)) return min;
  return Math.max(min, Math.min(max, v));
}

export function parseRelevantRanks(raw: string, maxRank = 20): number[] {
  const nums = raw
    .split(/[^0-9]+/)
    .map((s) => Number(s))
    .filter((n) => Number.isInteger(n) && n >= 1 && n <= maxRank);
  const unique = Array.from(new Set(nums)).sort((a, b) => a - b);
  return unique.length > 0 ? unique : [1, 3, 7];
}

export function analyzeBenchmarkDimensions(input: {
  system: BenchmarkSystemType;
  servedModelId: ServedModelId;
  promptTokens: number;
  outputTokens: number;
  concurrency: number;
  retrievalPipeline: RetrievalPipelineId;
  topK: number;
  rerankCandidates: number;
  relevantRanks: number[];
}): BenchmarkAnalysis {
  const spec = SERVED_MODELS[input.servedModelId];
  const promptTokens = Math.round(clamp(input.promptTokens, 64, 16384));
  const outputTokens = Math.round(clamp(input.outputTokens, 16, 2048));
  const concurrency = Math.round(clamp(input.concurrency, 1, 64));

  const ttftMs = spec.baseTtftMs + (promptTokens / spec.prefillTokPerMs) * (1 + 0.08 * (concurrency - 1));
  const tpotMs = spec.baseTpotMs * (1 + 0.025 * (concurrency - 1));
  const e2eMs = ttftMs + outputTokens * tpotMs;
  const throughputTokPerSec = (concurrency * outputTokens) / (e2eMs / 1000);
  const kvCacheGib = (concurrency * (promptTokens + outputTokens) * spec.kvBytesPerToken) / 1024 ** 3;
  const totalVramGib = spec.weightsGib + kvCacheGib;
  const fitsGpu = totalVramGib <= spec.vramBudgetGib;
  const costPer1MTokens = (spec.gpuCostPerHr / (throughputTokPerSec * 3600)) * 1_000_000;

  const topK = Math.round(clamp(input.topK, 1, 10));
  const rerankCandidates = Math.round(clamp(input.rerankCandidates, 5, 100));
  const relevantRanks = Array.from(new Set(input.relevantRanks.filter((r) => r >= 1))).sort((a, b) => a - b);
  const effectiveRanks = relevantRanks.length > 0 ? relevantRanks : [1, 3, 7];

  const hits = effectiveRanks.filter((r) => r <= topK);
  const hitsInTopK = hits.length;
  const recallAtK = hitsInTopK / effectiveRanks.length;
  const precisionAtK = hitsInTopK / topK;
  const mrr = 1 / effectiveRanks[0];

  const dcg = hits.reduce((sum, rank) => sum + 1 / Math.log2(rank + 1), 0);
  const idealCount = Math.min(effectiveRanks.length, topK);
  let idcg = 0;
  for (let i = 1; i <= idealCount; i++) {
    idcg += 1 / Math.log2(i + 1);
  }
  const ndcgAtK = idcg > 0 ? dcg / idcg : 0;

  const embedMs = 8;
  const annMs = 12;
  const rerankMs = input.retrievalPipeline === 'hybrid-rerank' ? rerankCandidates * 1.4 : 0;
  const retrievalLatencyMs = embedMs + annMs + rerankMs;
  const costPer1kQueries = ((retrievalLatencyMs / 1000) * (1.8 / 3600)) * 1000;

  const dimensions: BenchmarkDimensionRow[] =
    input.system === 'served'
      ? [
          {
            id: 'latency',
            title: 'Latency (TTFT + O × TPOT)',
            valueLabel: `TTFT ${ttftMs.toFixed(0)} ms · TPOT ${tpotMs.toFixed(1)} ms`,
            coveredIn: 'LLM Inference Optimization',
            plainWhy: 'Users feel TTFT before word 1 and TPOT while words stream.',
            gaugeFraction: Math.min(1, e2eMs / 8000),
            passesTarget: ttftMs <= 800,
          },
          {
            id: 'core',
            title: 'Throughput (tokens/sec)',
            valueLabel: `${throughputTokPerSec.toFixed(0)} tok/s (${concurrency} users)`,
            coveredIn: 'LLM Inference Optimization',
            plainWhy: 'Total generated words per second across concurrent users.',
            gaugeFraction: Math.min(1, throughputTokPerSec / 1200),
            passesTarget: throughputTokPerSec >= 100,
          },
          {
            id: 'resource',
            title: 'Memory (Weights + KV cache)',
            valueLabel: `${totalVramGib.toFixed(1)} / ${spec.vramBudgetGib} GiB`,
            coveredIn: 'LLM Inference — KV Cache',
            plainWhy: 'Weights stay fixed; KV cache grows with concurrency and context.',
            gaugeFraction: Math.min(1, totalVramGib / spec.vramBudgetGib),
            passesTarget: fitsGpu,
          },
          {
            id: 'cost',
            title: 'Cost (per 1M output tokens)',
            valueLabel: `$${costPer1MTokens.toFixed(2)} / 1M tok`,
            coveredIn: 'AI Cost Engineering',
            plainWhy: 'GPU hourly rate divided by tokens produced per hour.',
            gaugeFraction: Math.min(1, costPer1MTokens / 8),
            passesTarget: costPer1MTokens <= 5,
          },
        ]
      : [
          {
            id: 'latency',
            title: 'Retrieval latency (ms/query)',
            valueLabel: `${retrievalLatencyMs.toFixed(1)} ms (${embedMs}+${annMs}+${rerankMs.toFixed(0)})`,
            coveredIn: 'RAG — Evaluating RAG',
            plainWhy: 'Query embedding + ANN index lookup + optional cross-encoder reranker.',
            gaugeFraction: Math.min(1, retrievalLatencyMs / 160),
            passesTarget: retrievalLatencyMs <= 100,
          },
          {
            id: 'core',
            title: `Ranking order (MRR & NDCG@${topK})`,
            valueLabel: `MRR ${mrr.toFixed(2)} · NDCG ${(ndcgAtK * 100).toFixed(1)}%`,
            coveredIn: 'Learning-to-Rank',
            plainWhy: 'Putting relevant docs at slot 1 matters far more than slot 5.',
            gaugeFraction: ndcgAtK,
            passesTarget: ndcgAtK >= 0.65,
          },
          {
            id: 'resource',
            title: `Cutoff coverage (Recall@${topK}, P@${topK})`,
            valueLabel: `R@${topK} ${(recallAtK * 100).toFixed(0)}% · P@${topK} ${(precisionAtK * 100).toFixed(0)}%`,
            coveredIn: 'Learning-to-Rank',
            plainWhy: 'How many true relevant docs made it inside the top-k shortlist.',
            gaugeFraction: recallAtK,
            passesTarget: recallAtK >= 0.6,
          },
          {
            id: 'cost',
            title: 'Cost (per 1,000 queries)',
            valueLabel: `$${costPer1kQueries.toFixed(3)} / 1k queries`,
            coveredIn: 'AI Cost Engineering',
            plainWhy: 'Cross-encoder reranking multiplies query cost with candidate count.',
            gaugeFraction: Math.min(1, costPer1kQueries / 0.1),
            passesTarget: costPer1kQueries <= 0.06,
          },
        ];

  const trace =
    input.system === 'served'
      ? [
          {
            id: 'latency' as const,
            title: 'Latency splits into TTFT vs TPOT',
            explain: `Reading ${promptTokens} prompt tokens takes ${ttftMs.toFixed(0)} ms (TTFT); streaming ${outputTokens} tokens takes ${tpotMs.toFixed(1)} ms each, totaling ${(e2eMs / 1000).toFixed(2)} s.`,
          },
          {
            id: 'core' as const,
            title: 'Batching lifts throughput',
            explain: `Serving ${concurrency} concurrent requests shares weight loads and outputs ${throughputTokPerSec.toFixed(0)} tokens/sec total.`,
          },
          {
            id: 'resource' as const,
            title: 'KV cache consumes remaining VRAM',
            explain: `Weights take ${spec.weightsGib} GiB plus ${kvCacheGib.toFixed(2)} GiB of KV cache = ${totalVramGib.toFixed(1)} GiB (${fitsGpu ? 'fits inside' : 'exceeds'} ${spec.vramBudgetGib} GiB GPU).`,
          },
          {
            id: 'cost' as const,
            title: 'Unit cost follows throughput',
            explain: `At $${spec.gpuCostPerHr.toFixed(2)}/hr and ${throughputTokPerSec.toFixed(0)} tok/s, serving costs $${costPer1MTokens.toFixed(2)} per 1M tokens.`,
          },
        ]
      : [
          {
            id: 'latency' as const,
            title: 'Query latency adds up per stage',
            explain: `Embed (${embedMs} ms) + ANN search (${annMs} ms) + ${input.retrievalPipeline === 'hybrid-rerank' ? `rerank ${rerankCandidates} docs (${rerankMs.toFixed(0)} ms)` : 'no reranker (0 ms)'} = ${retrievalLatencyMs.toFixed(1)} ms.`,
          },
          {
            id: 'core' as const,
            title: 'Top slots weigh most in MRR and NDCG',
            explain: `First hit at rank #${effectiveRanks[0]} gives MRR = ${mrr.toFixed(2)}; position discounting yields NDCG@${topK} = ${(ndcgAtK * 100).toFixed(1)}%.`,
          },
          {
            id: 'resource' as const,
            title: `Top-${topK} cutoff replaces KV cache`,
            explain: `${hitsInTopK} of ${effectiveRanks.length} relevant docs land in top ${topK}: Recall@${topK} = ${(recallAtK * 100).toFixed(0)}% and Precision@${topK} = ${(precisionAtK * 100).toFixed(0)}%.`,
          },
          {
            id: 'cost' as const,
            title: 'Unit cost scales per 1,000 queries',
            explain: `Each search takes ${retrievalLatencyMs.toFixed(1)} ms of compute, costing $${costPer1kQueries.toFixed(3)} per 1,000 queries.`,
          },
        ];

  return {
    system: input.system,
    servedModel: spec,
    promptTokens,
    outputTokens,
    concurrency,
    ttftMs,
    tpotMs,
    e2eMs,
    throughputTokPerSec,
    kvCacheGib,
    totalVramGib,
    costPer1MTokens,
    fitsGpu,
    retrievalPipeline: input.retrievalPipeline,
    topK,
    rerankCandidates,
    relevantRanks: effectiveRanks,
    hitsInTopK,
    recallAtK,
    precisionAtK,
    mrr,
    ndcgAtK,
    embedMs,
    annMs,
    rerankMs,
    retrievalLatencyMs,
    costPer1kQueries,
    dimensions,
    trace,
  };
}
