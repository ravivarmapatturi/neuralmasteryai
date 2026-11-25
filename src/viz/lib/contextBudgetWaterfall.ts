// Pure multi-turn context window budgeting & auto-compaction math.

export type ContextPresetId = 'engineered' | 'unmanaged' | 'tight-32k';

export interface ContextBudgetConfig {
  windowLimit: number;
  outputReserve: number;
  prefixTokens: number;
  toolTokens: number;
  fileTokens: number;
  tokensPerTurn: number;
  autoCompact: boolean;
  watermarkRatio: number;
}

export interface ContextTurnSnapshot {
  turn: number;
  prefixTokens: number;
  toolTokens: number;
  fileTokens: number;
  historyTokens: number;
  outputReserve: number;
  inputUsed: number;
  usableBudget: number;
  watermarkTokens: number;
  freeHeadroom: number;
  overflowTokens: number;
  utilizationPct: number;
  compactedThisTurn: boolean;
  compactionsSoFar: number;
  cumulativeBilledTokens: number;
  regime: 'healthy' | 'warning' | 'overflow';
  explain: string;
}

export const CONTEXT_MAX_TURNS = 16;
export const CONTEXT_TRACE_TURNS = [1, 4, 8, 10, 13, 16] as const;

export const CONTEXT_PRESETS: Record<
  ContextPresetId,
  { label: string; shortLabel: string; config: ContextBudgetConfig }
> = {
  engineered: {
    label: '1. Engineered Context (Curated)',
    shortLabel: 'Engineered (128k)',
    config: {
      windowLimit: 128000,
      outputReserve: 4000,
      prefixTokens: 1800,
      toolTokens: 600,
      fileTokens: 1400,
      tokensPerTurn: 525, // 8 turns -> 4,200 history -> 8,000 total input (matches overview.mdx)
      autoCompact: true,
      watermarkRatio: 0.75,
    },
  },
  unmanaged: {
    label: '2. Unmanaged Context (Inlined)',
    shortLabel: 'Unmanaged (128k)',
    config: {
      windowLimit: 128000,
      outputReserve: 4000,
      prefixTokens: 4200,
      toolTokens: 12000,
      fileTokens: 28000,
      tokensPerTurn: 4500, // 8 turns -> 36,000 history -> 80,200 total input (matches overview.mdx)
      autoCompact: false,
      watermarkRatio: 0.75,
    },
  },
  'tight-32k': {
    label: '3. Tight 32k Window + 80% Watermark',
    shortLabel: 'Tight 32k + Compact',
    config: {
      windowLimit: 32000,
      outputReserve: 4000,
      prefixTokens: 1500,
      toolTokens: 2500,
      fileTokens: 500,
      tokensPerTurn: 2300, // matches token-budgeting-and-compaction.mdx RunnableCode
      autoCompact: true,
      watermarkRatio: 0.8,
    },
  },
};

/** Simulates 1..maxTurns of an AI agent loop, returning exact per-turn allocations and cumulative billed tokens. */
export function simulateContextWaterfall(
  rawConfig: Partial<ContextBudgetConfig>,
  maxTurns = CONTEXT_MAX_TURNS,
): ContextTurnSnapshot[] {
  const windowLimit = Math.max(8000, Math.min(256000, Math.round(rawConfig.windowLimit ?? 128000)));
  const outputReserve = Math.max(0, Math.min(Math.floor(windowLimit * 0.4), Math.round(rawConfig.outputReserve ?? 4000)));
  const prefixTokens = Math.max(200, Math.min(40000, Math.round(rawConfig.prefixTokens ?? 1800)));
  const toolTokens = Math.max(0, Math.min(60000, Math.round(rawConfig.toolTokens ?? 600)));
  const fileTokens = Math.max(0, Math.min(80000, Math.round(rawConfig.fileTokens ?? 1400)));
  const tokensPerTurn = Math.max(100, Math.min(12000, Math.round(rawConfig.tokensPerTurn ?? 525)));
  const autoCompact = rawConfig.autoCompact ?? true;
  const watermarkRatio = Math.max(0.5, Math.min(0.95, rawConfig.watermarkRatio ?? 0.75));

  const usableBudget = Math.max(0, windowLimit - outputReserve);
  const watermarkTokens = Math.round(usableBudget * watermarkRatio);
  const staticBase = prefixTokens + toolTokens + fileTokens;

  const snapshots: ContextTurnSnapshot[] = [];
  let historyTokens = 0;
  let compactionsSoFar = 0;
  let cumulativeBilledTokens = 0;

  for (let turn = 1; turn <= maxTurns; turn++) {
    historyTokens += tokensPerTurn;
    let compactedThisTurn = false;

    if (autoCompact && staticBase + historyTokens >= watermarkTokens && historyTokens > tokensPerTurn * 2) {
      // Compact older turns down to a 250-token checklist summary + keep the latest 2 turns intact
      const keptRecent = tokensPerTurn * 2;
      const summaryCost = 250;
      const compacted = Math.min(historyTokens, summaryCost + keptRecent);
      if (compacted < historyTokens) {
        historyTokens = compacted;
        compactedThisTurn = true;
        compactionsSoFar++;
      }
    }

    const inputUsed = staticBase + historyTokens;
    cumulativeBilledTokens += inputUsed;

    const totalNeeded = inputUsed + outputReserve;
    const freeHeadroom = Math.max(0, windowLimit - totalNeeded);
    const overflowTokens = Math.max(0, totalNeeded - windowLimit);
    const utilizationPct = (inputUsed / windowLimit) * 100;

    let regime: 'healthy' | 'warning' | 'overflow' = 'healthy';
    if (overflowTokens > 0) {
      regime = 'overflow';
    } else if (inputUsed >= watermarkTokens || utilizationPct >= 62) {
      regime = 'warning';
    }

    let explain = '';
    if (overflowTokens > 0) {
      explain = `Turn ${turn} overflows by ${overflowTokens.toLocaleString('en-US')} tokens! With ${inputUsed.toLocaleString('en-US')} input + ${outputReserve.toLocaleString('en-US')} reply reserve, it exceeds the ${windowLimit.toLocaleString('en-US')} limit.`;
    } else if (compactedThisTurn) {
      explain = `Turn ${turn} crossed the ${Math.round(watermarkRatio * 100)}% watermark (${watermarkTokens.toLocaleString('en-US')}), so auto-compaction folded old logs down to ${historyTokens.toLocaleString('en-US')} history tokens.`;
    } else if (regime === 'warning') {
      explain = `Turn ${turn}: ${inputUsed.toLocaleString('en-US')} tokens used (${utilizationPct.toFixed(1)}%). Attention spreads thin past ~65% — free headroom shrinks to ${freeHeadroom.toLocaleString('en-US')} tokens.`;
    } else {
      explain = `Turn ${turn}: ${inputUsed.toLocaleString('en-US')} tokens used (${utilizationPct.toFixed(1)}% of ${windowLimit.toLocaleString('en-US')}), leaving ${freeHeadroom.toLocaleString('en-US')} free headroom plus ${outputReserve.toLocaleString('en-US')} reserved for the reply.`;
    }

    snapshots.push({
      turn,
      prefixTokens,
      toolTokens,
      fileTokens,
      historyTokens,
      outputReserve,
      inputUsed,
      usableBudget,
      watermarkTokens,
      freeHeadroom,
      overflowTokens,
      utilizationPct,
      compactedThisTurn,
      compactionsSoFar,
      cumulativeBilledTokens,
      regime,
      explain,
    });
  }

  return snapshots;
}
