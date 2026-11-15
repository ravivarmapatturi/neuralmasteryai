/**
 * searchSystemDesign.ts
 *
 * Mathematical and architectural model for Chapter 13:
 * Search & Recommendation System Design at Scale.
 *
 * Provides pure, reproducible functions for:
 * 1. Multi-stage latency budgets and SLA margin evaluation.
 * 2. 4-level resilience & degradation ladder.
 * 3. Capacity planning, QPS concurrency, and node sizing calculations.
 *
 * Note: All figures represent explicit pedagogical design assumptions
 * and derived budgets rather than universal empirical benchmarks.
 */

export interface FunnelStageBudget {
  id: string;
  name: string;
  inputVolume: string;
  outputVolume: string;
  budgetP99Ms: number;
  typicalP50Ms: number;
  typicalP99Ms: number;
  technology: string;
  failureRisk: string;
}

export interface SystemDegradationLevel {
  level: number;
  name: string;
  triggerCondition: string;
  activePath: string;
  expectedP99Ms: number;
  ndcgQualityEstimate: number; // illustrative proxy 0.0 - 1.0
  catalogCoveragePercent: number;
}

export interface CapacitySizingPlan {
  peakQps: number;
  targetP99LatencySec: number;
  targetCpuUtilization: number;
  requiredCores: number;
  recommendedNodes: number; // assuming 16 vCPU nodes
  catalogMemoryGb: number;
}

export const PRODUCTION_FUNNEL_BUDGETS: FunnelStageBudget[] = [
  {
    id: 'gateway',
    name: '1. API Gateway & Auth',
    inputVolume: 'Client HTTP Request',
    outputVolume: 'Validated Token & Context',
    budgetP99Ms: 5,
    typicalP50Ms: 2,
    typicalP99Ms: 4,
    technology: 'Envoy / API Gateway',
    failureRisk: 'Rate limit exhaustion, JWT verification delays',
  },
  {
    id: 'retrieval',
    name: '2. Candidate Generation (Parallel)',
    inputVolume: '50M item catalog',
    outputVolume: '1,000 candidates',
    budgetP99Ms: 25,
    typicalP50Ms: 14,
    typicalP99Ms: 23,
    technology: 'Elasticsearch (BM25) + HNSW (Vector ANN) + Graph DB',
    failureRisk: 'Vector index GC pauses, hot shard contention',
  },
  {
    id: 'filtering',
    name: '3. Hard Filtering & Feature Hydration',
    inputVolume: '1,000 candidates',
    outputVolume: '400 candidates',
    budgetP99Ms: 10,
    typicalP50Ms: 4,
    typicalP99Ms: 8,
    technology: 'Redis Feature Store & Bloom Filters',
    failureRisk: 'Redis connection pool exhaustion, feature cache miss',
  },
  {
    id: 'ranking',
    name: '4. Heavy Ranking (ML Scoring)',
    inputVolume: '400 candidates',
    outputVolume: '50 scored candidates',
    budgetP99Ms: 40,
    typicalP50Ms: 22,
    typicalP99Ms: 36,
    technology: 'Triton / ONNX (GBDT / Cross-Attention)',
    failureRisk: 'Batch inference queue saturation, GPU memory pressure',
  },
  {
    id: 'reranking',
    name: '5. Re-Ranking & Business Rules',
    inputVolume: '50 candidates',
    outputVolume: '10 display candidates',
    budgetP99Ms: 10,
    typicalP50Ms: 3,
    typicalP99Ms: 7,
    technology: 'Contextual Bandit & Category Deduplication',
    failureRisk: 'Bandit lock contention, contradictory rule pruning',
  },
  {
    id: 'serialization',
    name: '6. Egress & Tracking Serialization',
    inputVolume: '10 display candidates',
    outputVolume: 'Client JSON response',
    budgetP99Ms: 10,
    typicalP50Ms: 3,
    typicalP99Ms: 6,
    technology: 'Protobuf / JSON serializer + Kafka impression logger',
    failureRisk: 'Kafka broker backpressure, client payload bloat',
  },
];

export const DEGRADATION_LADDER: SystemDegradationLevel[] = [
  {
    level: 1,
    name: 'Level 1: Full High-Precision Pipeline',
    triggerCondition: 'All downstream microservices healthy (p99 latency < 90ms)',
    activePath: 'Parallel Retrieval → Redis Features → Heavy GBDT/Neural Ranker → Bandits',
    expectedP99Ms: 84,
    ndcgQualityEstimate: 0.85,
    catalogCoveragePercent: 100,
  },
  {
    level: 2,
    name: 'Level 2: Degraded Ranking (Light Ranker)',
    triggerCondition: 'Heavy ranking service p99 > 40ms or error rate > 2%',
    activePath: 'Parallel Retrieval → Fast Linear Ranker / Vector Cosine Dot-Product (skip deep cross-features)',
    expectedP99Ms: 38,
    ndcgQualityEstimate: 0.72,
    catalogCoveragePercent: 95,
  },
  {
    level: 3,
    name: 'Level 3: Cached Precomputed Recommendations',
    triggerCondition: 'Candidate generation or Redis feature store timeout (> 25ms)',
    activePath: 'Bypass live funnel → Fetch precomputed hourly recommendation slate from Redis cache',
    expectedP99Ms: 12,
    ndcgQualityEstimate: 0.65,
    catalogCoveragePercent: 80,
  },
  {
    level: 4,
    name: 'Level 4: Catastrophic Static Popularity Fallback',
    triggerCondition: 'Database, cache, and vector cluster failure / partitioned network',
    activePath: 'Bypass network dependencies → Serve static in-memory regional top-selling fallback',
    expectedP99Ms: 2,
    ndcgQualityEstimate: 0.40,
    catalogCoveragePercent: 30,
  },
];

/**
 * Calculates total p99 budget and margin against an SLA.
 */
export function calculateBudgetSummary(
  stages: FunnelStageBudget[] = PRODUCTION_FUNNEL_BUDGETS,
  targetSlaMs: number = 100,
): { totalBudgetP99: number; totalTypicalP99: number; marginMs: number; isWithinSla: boolean } {
  const totalBudgetP99 = stages.reduce((acc, s) => acc + s.budgetP99Ms, 0);
  const totalTypicalP99 = stages.reduce((acc, s) => acc + s.typicalP99Ms, 0);
  const marginMs = targetSlaMs - totalTypicalP99;

  return {
    totalBudgetP99,
    totalTypicalP99,
    marginMs,
    isWithinSla: totalTypicalP99 <= targetSlaMs,
  };
}

/**
 * Sizes compute clusters and nodes for peak QPS:
 * Required Cores = (Peak QPS * Latency Sec) / Target Utilization.
 */
export function calculateCapacitySizing(
  peakQps: number = 5000,
  targetP99LatencyMs: number = 85,
  targetCpuUtilization: number = 0.65,
  coresPerNode: number = 16,
): CapacitySizingPlan {
  const latencySec = targetP99LatencyMs / 1000;
  const rawCores = (peakQps * latencySec) / targetCpuUtilization;
  const requiredCores = Math.ceil(rawCores);
  const recommendedNodes = Math.ceil(requiredCores / coresPerNode);

  // 50M items with 256-dim float32 embeddings = 50M * 256 * 4 bytes = 51.2 GB
  // Inverted index + metadata approx 25 GB.
  const catalogMemoryGb = 76.8;

  return {
    peakQps,
    targetP99LatencySec: latencySec,
    targetCpuUtilization,
    requiredCores,
    recommendedNodes,
    catalogMemoryGb,
  };
}
