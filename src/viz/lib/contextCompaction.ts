export type CompactionStrategy = 'compacted' | 'sliding' | 'naive';

export interface CompactionInput {
  strategy: CompactionStrategy;
  turn: number;
  rawTokensPerTurn: number;
  windowLimit: number;
  recentTurnsKept: number;
}

export interface TurnCurvePoint {
  turn: number;
  activeTokens: number;
  naiveTokens: number;
}

export interface CompactionAnalysis {
  strategy: CompactionStrategy;
  turn: number;
  rawTokensPerTurn: number;
  keptTokensPerTurn: number;
  windowLimit: number;
  recentTurnsKept: number;
  systemTokens: number;
  toolTokens: number;
  fixedTokens: number;
  stateArtifactTokens: number;
  workingTurnTokens: number;
  totalTokens: number;
  naiveTotalTokens: number;
  usagePct: number;
  rawUsagePct: number;
  savedTokensVsNaive: number;
  savedPctVsNaive: number;
  overflowing: boolean;
  inAnxietyZone: boolean;
  earlyGoalsLost: boolean;
  focusRetentionPct: number;
  healthLabel: 'Sharp focus' | 'Goal amnesia' | 'Attention blur (>65%)' | 'Overflow (>100%)';
  curve: TurnCurvePoint[];
  explain: string;
}

export const SYSTEM_PROMPT_TOKENS = 3500;
export const TOOL_SCHEMAS_TOKENS = 2200;
export const FIXED_PREFIX_TOKENS = SYSTEM_PROMPT_TOKENS + TOOL_SCHEMAS_TOKENS;
export const COMPACTED_RECENT_TURN_TOKENS = 3200;
export const MAX_STATE_ARTIFACT_TOKENS = 2400;
export const ANXIETY_THRESHOLD_RATIO = 0.65;
export const MAX_TURNS = 20;
export const PLAYBACK_TURNS = [1, 4, 8, 12, 16, 20] as const;

export const COMPACTION_PRESETS: readonly {
  id: string;
  label: string;
  strategy: CompactionStrategy;
  turn: number;
  rawTokensPerTurn: number;
  windowLimit: number;
  recentTurnsKept: number;
}[] = [
  {
    id: 'worked-12',
    label: 'Turn 12 (worked 107.7k vs 17.7k)',
    strategy: 'compacted',
    turn: 12,
    rawTokensPerTurn: 8500,
    windowLimit: 128000,
    recentTurnsKept: 3,
  },
  {
    id: 'naive-overflow',
    label: 'Turn 16 Naive overflow',
    strategy: 'naive',
    turn: 16,
    rawTokensPerTurn: 8500,
    windowLimit: 128000,
    recentTurnsKept: 3,
  },
  {
    id: 'sliding-amnesia',
    label: 'Turn 12 Sliding window amnesia',
    strategy: 'sliding',
    turn: 12,
    rawTokensPerTurn: 8500,
    windowLimit: 128000,
    recentTurnsKept: 3,
  },
];

function clamp(v: number, min: number, max: number): number {
  if (!Number.isFinite(v)) return min;
  return Math.max(min, Math.min(max, v));
}

export function computeTokensAtTurn(
  strategy: CompactionStrategy,
  turn: number,
  rawTokensPerTurn: number,
  recentTurnsKept: number,
): { stateArtifactTokens: number; workingTurnTokens: number; totalTokens: number } {
  if (strategy === 'naive') {
    const workingTurnTokens = turn * rawTokensPerTurn;
    return {
      stateArtifactTokens: 0,
      workingTurnTokens,
      totalTokens: FIXED_PREFIX_TOKENS + workingTurnTokens,
    };
  }
  if (strategy === 'sliding') {
    const workingTurnTokens = Math.min(turn, recentTurnsKept) * COMPACTED_RECENT_TURN_TOKENS;
    return {
      stateArtifactTokens: 0,
      workingTurnTokens,
      totalTokens: FIXED_PREFIX_TOKENS + workingTurnTokens,
    };
  }
  const stateArtifactTokens = Math.min(turn * 250, MAX_STATE_ARTIFACT_TOKENS);
  const workingTurnTokens = Math.min(turn, recentTurnsKept) * COMPACTED_RECENT_TURN_TOKENS;
  return {
    stateArtifactTokens,
    workingTurnTokens,
    totalTokens: FIXED_PREFIX_TOKENS + stateArtifactTokens + workingTurnTokens,
  };
}

/**
 * Exact context-budget computation matching the worked 12-turn example:
 * Naive = 3,500 + 2,200 + 12 * 8,500 = 107,700 tokens (84.1% of 128k).
 * Compacted = 3,500 + 2,200 + 2,400 (state file) + 3 * 3,200 = 17,700 tokens (83.6% reduction).
 */
export function analyzeContextCompaction({
  strategy,
  turn,
  rawTokensPerTurn,
  windowLimit,
  recentTurnsKept,
}: CompactionInput): CompactionAnalysis {
  const cleanStrategy: CompactionStrategy =
    strategy === 'naive' || strategy === 'sliding' ? strategy : 'compacted';
  const cleanTurn = Math.round(clamp(turn, 1, MAX_TURNS));
  const cleanRaw = Math.round(clamp(rawTokensPerTurn, 1000, 16000));
  const cleanLimit = Math.round(clamp(windowLimit, 16000, 256000));
  const cleanWindow = Math.round(clamp(recentTurnsKept, 1, 6));

  const { stateArtifactTokens, workingTurnTokens, totalTokens } = computeTokensAtTurn(
    cleanStrategy,
    cleanTurn,
    cleanRaw,
    cleanWindow,
  );
  const naiveTotalTokens = FIXED_PREFIX_TOKENS + cleanTurn * cleanRaw;

  const rawUsagePct = (totalTokens / cleanLimit) * 100;
  const usagePct = Math.min(100, rawUsagePct);
  const savedTokensVsNaive = Math.max(0, naiveTotalTokens - totalTokens);
  const savedPctVsNaive = naiveTotalTokens > 0 ? (savedTokensVsNaive / naiveTotalTokens) * 100 : 0;

  const overflowing = totalTokens > cleanLimit;
  const inAnxietyZone = !overflowing && rawUsagePct >= ANXIETY_THRESHOLD_RATIO * 100;
  const earlyGoalsLost = cleanStrategy === 'sliding' && cleanTurn > cleanWindow;

  let focusRetentionPct = 98;
  if (cleanStrategy === 'sliding') {
    focusRetentionPct = earlyGoalsLost
      ? Math.max(20, Math.round((cleanWindow / cleanTurn) * 100))
      : 96;
  } else if (cleanStrategy === 'naive') {
    if (overflowing) focusRetentionPct = 0;
    else if (inAnxietyZone) focusRetentionPct = Math.max(15, Math.round(100 - (rawUsagePct - 45) * 1.4));
    else focusRetentionPct = Math.max(55, Math.round(100 - rawUsagePct * 0.5));
  } else {
    if (overflowing) focusRetentionPct = 0;
    else if (inAnxietyZone) focusRetentionPct = 72;
    else focusRetentionPct = 98;
  }

  let healthLabel: CompactionAnalysis['healthLabel'] = 'Sharp focus';
  if (overflowing) healthLabel = 'Overflow (>100%)';
  else if (earlyGoalsLost) healthLabel = 'Goal amnesia';
  else if (inAnxietyZone) healthLabel = 'Attention blur (>65%)';

  const curve: TurnCurvePoint[] = Array.from({ length: MAX_TURNS }, (_, idx) => {
    const t = idx + 1;
    const active = computeTokensAtTurn(cleanStrategy, t, cleanRaw, cleanWindow).totalTokens;
    const naive = FIXED_PREFIX_TOKENS + t * cleanRaw;
    return { turn: t, activeTokens: active, naiveTokens: naive };
  });

  let explain = '';
  if (cleanStrategy === 'compacted') {
    explain = `Turn ${cleanTurn}: Old tool logs were compacted into a ${stateArtifactTokens.toLocaleString('en-US')}-token checklist while keeping the last ${Math.min(cleanTurn, cleanWindow)} turns (${workingTurnTokens.toLocaleString('en-US')}). Total stays at ${totalTokens.toLocaleString('en-US')} tokens (${rawUsagePct.toFixed(1)}% of ${(cleanLimit / 1000).toFixed(0)}k) — saving ${savedPctVsNaive.toFixed(1)}% vs Naive.`;
  } else if (cleanStrategy === 'sliding') {
    explain = earlyGoalsLost
      ? `Turn ${cleanTurn}: Sliding window keeps only ${Math.min(cleanTurn, cleanWindow)} recent turns (${totalTokens.toLocaleString('en-US')} tokens), but dropped turns 1–${cleanTurn - cleanWindow} without saving a state checklist — early goals are forgotten!`
      : `Turn ${cleanTurn}: Only ${cleanTurn} turns so far (within the ${cleanWindow}-turn window), so nothing has fallen off yet (${totalTokens.toLocaleString('en-US')} tokens).`;
  } else {
    explain = overflowing
      ? `Turn ${cleanTurn}: Keeping all ${cleanTurn} raw turns (${(cleanTurn * cleanRaw).toLocaleString('en-US')} log tokens) reaches ${totalTokens.toLocaleString('en-US')} tokens — overflowing the ${(cleanLimit / 1000).toFixed(0)}k window!`
      : inAnxietyZone
        ? `Turn ${cleanTurn}: Unpruned logs push context to ${totalTokens.toLocaleString('en-US')} tokens (${rawUsagePct.toFixed(1)}% of ${(cleanLimit / 1000).toFixed(0)}k), crossing the 65% attention-blur zone.`
        : `Turn ${cleanTurn}: Naive history holds ${totalTokens.toLocaleString('en-US')} tokens (${rawUsagePct.toFixed(1)}% of ${(cleanLimit / 1000).toFixed(0)}k). Each extra turn adds ${cleanRaw.toLocaleString('en-US')} more raw log tokens.`;
  }

  return {
    strategy: cleanStrategy,
    turn: cleanTurn,
    rawTokensPerTurn: cleanRaw,
    keptTokensPerTurn: COMPACTED_RECENT_TURN_TOKENS,
    windowLimit: cleanLimit,
    recentTurnsKept: cleanWindow,
    systemTokens: SYSTEM_PROMPT_TOKENS,
    toolTokens: TOOL_SCHEMAS_TOKENS,
    fixedTokens: FIXED_PREFIX_TOKENS,
    stateArtifactTokens,
    workingTurnTokens,
    totalTokens,
    naiveTotalTokens,
    usagePct,
    rawUsagePct,
    savedTokensVsNaive,
    savedPctVsNaive,
    overflowing,
    inAnxietyZone,
    earlyGoalsLost,
    focusRetentionPct,
    healthLabel,
    curve,
    explain,
  };
}
