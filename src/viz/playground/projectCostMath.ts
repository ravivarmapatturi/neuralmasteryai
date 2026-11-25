export interface ProjectTierPreset {
  id: string;
  label: string;
  recommendedLevel: string;
  dau: number;
  requestsPerUserPerDay: number;
  turnsPerRequest: number;
  staticPrefixTokens: number;
  freshInputTokens: number;
  historyGrowthPerTurn: number;
  outputTokensPerTurn: number;
  cacheHitRate: number;
  inputPricePer1M: number;
  outputPricePer1M: number;
}

export const PROJECT_PRESETS: ProjectTierPreset[] = [
  {
    id: 'level-1-classifier',
    label: 'Level 1: Single-turn API Classifier',
    recommendedLevel: 'Level 1 — Tiny Project',
    dau: 200,
    requestsPerUserPerDay: 5,
    turnsPerRequest: 1,
    staticPrefixTokens: 400,
    freshInputTokens: 250,
    historyGrowthPerTurn: 0,
    outputTokensPerTurn: 60,
    cacheHitRate: 0.0,
    inputPricePer1M: 0.25,
    outputPricePer1M: 1.0,
  },
  {
    id: 'level-2-rag',
    label: 'Level 2: RAG Assistant (3M req/mo)',
    recommendedLevel: 'Level 2 — Weekend Project',
    dau: 5000,
    requestsPerUserPerDay: 20,
    turnsPerRequest: 1,
    staticPrefixTokens: 3000,
    freshInputTokens: 6100,
    historyGrowthPerTurn: 0,
    outputTokensPerTurn: 400,
    cacheHitRate: 1.0,
    inputPricePer1M: 3.0,
    outputPricePer1M: 15.0,
  },
  {
    id: 'level-3-agent',
    label: 'Level 3: Multi-Turn Tool Agent',
    recommendedLevel: 'Level 3 — Advanced System',
    dau: 1000,
    requestsPerUserPerDay: 4,
    turnsPerRequest: 6,
    staticPrefixTokens: 3500,
    freshInputTokens: 800,
    historyGrowthPerTurn: 900,
    outputTokensPerTurn: 280,
    cacheHitRate: 0.75,
    inputPricePer1M: 3.0,
    outputPricePer1M: 15.0,
  },
  {
    id: 'level-4-frontier',
    label: 'Level 4: Frontier Reasoning Agent',
    recommendedLevel: 'Level 4 — Production System',
    dau: 2500,
    requestsPerUserPerDay: 6,
    turnsPerRequest: 8,
    staticPrefixTokens: 4500,
    freshInputTokens: 1200,
    historyGrowthPerTurn: 1200,
    outputTokensPerTurn: 500,
    cacheHitRate: 0.8,
    inputPricePer1M: 15.0,
    outputPricePer1M: 75.0,
  },
];

export interface CostEstimatorInput {
  monthlyRequests: number;
  turnsPerRequest: number;
  staticPrefixTokens: number;
  freshInputTokens: number;
  historyGrowthPerTurn: number;
  outputTokensPerTurn: number;
  cacheHitRate: number; // 0..1 applied to cacheable prefix tokens
  cacheReadMultiplier?: number; // default 0.10 (90% provider prompt cache discount)
  inputPricePer1M: number;
  outputPricePer1M: number;
}

export interface CostEstimatorResult {
  monthlyRequests: number;
  totalInputTokensPerReq: number;
  cacheablePrefixTokensPerReq: number;
  cachedReadTokensPerReq: number;
  uncachedInputTokensPerReq: number;
  outputTokensPerReq: number;
  uncachedInputCostPerReq: number;
  cachedReadCostPerReq: number;
  outputCostPerReq: number;
  totalCostPerReq: number;
  monthlyCostUncached: number;
  monthlyCostTotal: number;
  monthlyCacheSavings: number;
  perTurnGrowthMultipliers: number[];
}

/**
 * Exact multi-turn API token & cost calculation:
 * - Total input/req = T * (S + F) + G * T * (T - 1) / 2
 * - Cacheable prefix/req = T * S + G * T * (T - 1) / 2
 * - Cached read tokens/req = h * Cacheable prefix
 * - Uncached input/req = Total input - Cached read tokens
 * - Output/req = T * O
 * - Cost/req = (UncachedIn * P_in + CachedReads * P_in * cacheMult + Output * P_out) / 1e6
 */
export function computeProjectMonthlyCost(input: CostEstimatorInput): CostEstimatorResult {
  const T = Math.max(1, Math.floor(input.turnsPerRequest));
  const S = Math.max(0, input.staticPrefixTokens);
  const F = Math.max(0, input.freshInputTokens);
  const G = Math.max(0, input.historyGrowthPerTurn);
  const O = Math.max(0, input.outputTokensPerTurn);
  const h = Math.max(0, Math.min(1, input.cacheHitRate));
  const cacheMult = input.cacheReadMultiplier ?? 0.1;

  const historySum = (G * T * (T - 1)) / 2;
  const totalInputTokensPerReq = T * (S + F) + historySum;
  const cacheablePrefixTokensPerReq = T * S + historySum;
  const cachedReadTokensPerReq = h * cacheablePrefixTokensPerReq;
  const uncachedInputTokensPerReq = Math.max(0, totalInputTokensPerReq - cachedReadTokensPerReq);
  const outputTokensPerReq = T * O;

  const uncachedInputCostPerReq = (uncachedInputTokensPerReq * input.inputPricePer1M) / 1_000_000;
  const cachedReadCostPerReq = (cachedReadTokensPerReq * input.inputPricePer1M * cacheMult) / 1_000_000;
  const outputCostPerReq = (outputTokensPerReq * input.outputPricePer1M) / 1_000_000;
  const totalCostPerReq = uncachedInputCostPerReq + cachedReadCostPerReq + outputCostPerReq;

  const uncachedBaselineCostPerReq =
    (totalInputTokensPerReq * input.inputPricePer1M + outputTokensPerReq * input.outputPricePer1M) /
    1_000_000;

  const monthlyCostTotal = input.monthlyRequests * totalCostPerReq;
  const monthlyCostUncached = input.monthlyRequests * uncachedBaselineCostPerReq;
  const monthlyCacheSavings = Math.max(0, monthlyCostUncached - monthlyCostTotal);

  const perTurnGrowthMultipliers: number[] = [];
  for (let turn = 1; turn <= T; turn += 1) {
    perTurnGrowthMultipliers.push(S + F + G * (turn - 1));
  }

  return {
    monthlyRequests: input.monthlyRequests,
    totalInputTokensPerReq,
    cacheablePrefixTokensPerReq,
    cachedReadTokensPerReq,
    uncachedInputTokensPerReq,
    outputTokensPerReq,
    uncachedInputCostPerReq,
    cachedReadCostPerReq,
    outputCostPerReq,
    totalCostPerReq,
    monthlyCostUncached,
    monthlyCostTotal,
    monthlyCacheSavings,
    perTurnGrowthMultipliers,
  };
}
