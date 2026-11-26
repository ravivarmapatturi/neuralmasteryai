export type SpeculativeScenarioId = 'code' | 'python' | 'reasoning' | 'custom';

export interface SpeculativeScenarioPreset {
  id: Exclude<SpeculativeScenarioId, 'custom'>;
  label: string;
  prompt: string;
  draftText: string;
  baseDraftProbs: readonly number[];
  baseTargetAffinities: readonly number[];
  correctionTokens: readonly string[];
}

export const SPECULATIVE_SCENARIOS: readonly SpeculativeScenarioPreset[] = [
  {
    id: 'code',
    label: 'Code syntax',
    prompt: 'def forward(self,',
    draftText: 'x , mask = None )',
    baseDraftProbs: [0.96, 0.94, 0.92, 0.90, 0.93, 0.95],
    baseTargetAffinities: [0.99, 0.98, 0.95, 0.94, 0.96, 0.97],
    correctionTokens: ['hidden', ':', 'attention', ':=', 'True', ':'],
  },
  {
    id: 'python',
    label: 'Standard Python',
    prompt: 'return torch',
    draftText: '.matmul ( q , k .T',
    baseDraftProbs: [0.90, 0.88, 0.82, 0.86, 0.78, 0.84],
    baseTargetAffinities: [0.95, 0.92, 0.62, 0.85, 0.58, 0.80],
    correctionTokens: ['.nn', '.bmm', 'scores', ';', '.transpose', ')'],
  },
  {
    id: 'reasoning',
    label: 'Creative reasoning',
    prompt: 'However, the gradient',
    draftText: 'vanishes fast when layers stack deep',
    baseDraftProbs: [0.76, 0.72, 0.68, 0.64, 0.60, 0.58],
    baseTargetAffinities: [0.80, 0.45, 0.40, 0.35, 0.30, 0.25],
    correctionTokens: ['explodes', 'steadily', 'across', 'blocks', 'grow', 'tall'],
  },
];

export interface SpeculativeConfig {
  scenarioId: SpeculativeScenarioId;
  customDraftText: string;
  draftHorizon: number;
  acceptanceAlpha: number;
  draftLatencyMs: number;
  targetLatencyMs: number;
  checkRoll: number;
}

export interface SpeculativeTokenTrace {
  index: number;
  token: string;
  draftProb: number;
  targetProb: number;
  acceptThreshold: number;
  status: 'accepted' | 'rejected' | 'discarded';
  correctionToken: string | null;
}

export interface SpeculativeStepFrame {
  stepIndex: number;
  phase: 'draft' | 'verify';
  activeDraftIndex: number;
  draftedCount: number;
  elapsedMs: number;
  emittedSoFar: number;
  summary: string;
}

export interface SpeculativeAnalysis {
  tokens: SpeculativeTokenTrace[];
  draftHorizon: number;
  acceptanceAlpha: number;
  draftLatencyMs: number;
  targetLatencyMs: number;
  checkRoll: number;
  acceptedCount: number;
  rejectedIndex: number | null;
  emittedTokens: number;
  bonusOrCorrectionToken: string;
  stepLatencyMs: number;
  expectedTokensPerStep: number;
  expectedBaselineMs: number;
  expectedSpeedup: number;
  actualBaselineMs: number;
  actualSpeedup: number;
  breakEvenAlpha: number;
  curve: { k: number; expectedTokens: number; stepLatencyMs: number; speedup: number }[];
  frames: SpeculativeStepFrame[];
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function deterministicUnit(token: string, salt: number): number {
  let h = 2166136261 ^ salt;
  for (let i = 0; i < token.length; i++) {
    h ^= token.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 1000) / 1000;
}

export function expectedTokensGeometric(alpha: number, k: number): number {
  const a = clamp(alpha, 0, 1);
  const horizon = Math.max(1, Math.round(k));
  let sum = 0;
  for (let i = 0; i <= horizon; i++) {
    sum += Math.pow(a, i);
  }
  return sum;
}

export function computeExpectedSpeedup(
  alpha: number,
  k: number,
  draftLatencyMs: number,
  targetLatencyMs: number,
): { expectedTokens: number; stepLatencyMs: number; baselineMs: number; speedup: number } {
  const horizon = Math.max(1, Math.round(k));
  const dMs = Math.max(0.5, draftLatencyMs);
  const tMs = Math.max(1, targetLatencyMs);
  const expectedTokens = expectedTokensGeometric(alpha, horizon);
  const stepLatencyMs = tMs + horizon * dMs;
  const baselineMs = expectedTokens * tMs;
  return {
    expectedTokens,
    stepLatencyMs,
    baselineMs,
    speedup: baselineMs / stepLatencyMs,
  };
}

export function parseDraftTokens(text: string, fallback: readonly string[]): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean).slice(0, 6);
  if (words.length === 0) return [...fallback].slice(0, 6);
  const out = [...words];
  let padIdx = 0;
  while (out.length < 6) {
    out.push(fallback[padIdx % fallback.length] ?? `tok${out.length + 1}`);
    padIdx++;
  }
  return out;
}

export function analyzeSpeculativeDecoding(config: SpeculativeConfig): SpeculativeAnalysis {
  const preset =
    SPECULATIVE_SCENARIOS.find((s) => s.id === config.scenarioId) ?? SPECULATIVE_SCENARIOS[1];
  const k = Math.max(1, Math.min(6, Math.round(config.draftHorizon)));
  const alpha = clamp(Number.isFinite(config.acceptanceAlpha) ? config.acceptanceAlpha : 0.75, 0.1, 1.0);
  const draftMs = clamp(Number.isFinite(config.draftLatencyMs) ? config.draftLatencyMs : 3, 0.5, 25);
  const targetMs = clamp(Number.isFinite(config.targetLatencyMs) ? config.targetLatencyMs : 30, 5, 120);
  const roll = clamp(Number.isFinite(config.checkRoll) ? config.checkRoll : 0.5, 0.05, 0.95);

  const fallbackTokens = preset.draftText.split(/\s+/);
  const words = parseDraftTokens(config.customDraftText, fallbackTokens).slice(0, k);

  const tokens: SpeculativeTokenTrace[] = [];
  let acceptedCount = 0;
  let rejectedIndex: number | null = null;
  let halted = false;

  for (let i = 0; i < k; i++) {
    const word = words[i];
    const baseQ = config.scenarioId === 'custom'
      ? 0.55 + 0.35 * deterministicUnit(word, i + 11)
      : preset.baseDraftProbs[i % preset.baseDraftProbs.length];
    const baseAff = config.scenarioId === 'custom'
      ? 0.65 + 0.30 * deterministicUnit(word, i + 37)
      : preset.baseTargetAffinities[i % preset.baseTargetAffinities.length];

    const draftProb = Number(clamp(baseQ, 0.15, 0.99).toFixed(2));
    // Scale target probability smoothly with acceptanceAlpha so alpha=1 guarantees acceptance
    // and lower alpha drops later tokens first.
    const positionDecay = Math.pow(alpha, 0.65 + i * 0.28);
    const rawTarget = alpha >= 0.999 ? Math.max(draftProb, 0.95) : draftProb * (0.45 + 0.95 * positionDecay * baseAff);
    const targetProb = Number(clamp(rawTarget, 0.02, 0.99).toFixed(2));
    const acceptThreshold = Math.min(1, targetProb / draftProb);

    if (halted) {
      tokens.push({
        index: i,
        token: word,
        draftProb,
        targetProb,
        acceptThreshold,
        status: 'discarded',
        correctionToken: null,
      });
    } else if (roll <= acceptThreshold) {
      acceptedCount++;
      tokens.push({
        index: i,
        token: word,
        draftProb,
        targetProb,
        acceptThreshold,
        status: 'accepted',
        correctionToken: null,
      });
    } else {
      halted = true;
      rejectedIndex = i;
      const correction = preset.correctionTokens[i % preset.correctionTokens.length] ?? 'alt';
      tokens.push({
        index: i,
        token: word,
        draftProb,
        targetProb,
        acceptThreshold,
        status: 'rejected',
        correctionToken: correction,
      });
    }
  }

  const emittedTokens = acceptedCount + 1;
  const bonusOrCorrectionToken =
    rejectedIndex !== null
      ? tokens[rejectedIndex].correctionToken ?? 'alt'
      : 'next';

  const expected = computeExpectedSpeedup(alpha, k, draftMs, targetMs);
  const actualBaselineMs = emittedTokens * targetMs;
  const actualSpeedup = actualBaselineMs / expected.stepLatencyMs;
  const breakEvenAlpha = draftMs / targetMs;

  const curve = [1, 2, 3, 4, 5, 6].map((horizon) => {
    const res = computeExpectedSpeedup(alpha, horizon, draftMs, targetMs);
    return {
      k: horizon,
      expectedTokens: res.expectedTokens,
      stepLatencyMs: res.stepLatencyMs,
      speedup: res.speedup,
    };
  });

  const frames: SpeculativeStepFrame[] = [];
  for (let i = 0; i < k; i++) {
    frames.push({
      stepIndex: i,
      phase: 'draft',
      activeDraftIndex: i,
      draftedCount: i + 1,
      elapsedMs: (i + 1) * draftMs,
      emittedSoFar: 0,
      summary: `Draft guess ${i + 1} of ${k}: small model proposes “${words[i]}” (confidence q = ${tokens[i].draftProb.toFixed(2)}) in ${draftMs.toFixed(1)} ms.`,
    });
  }

  const verifySummary =
    rejectedIndex === null
      ? `Target checks all ${k} guesses in 1 pass (${targetMs.toFixed(1)} ms): every guess cleared p/q >= ${roll.toFixed(2)}, plus 1 bonus word -> ${emittedTokens} words total (${actualSpeedup.toFixed(2)}× real step speedup).`
      : `Target checks all ${k} guesses in 1 pass (${targetMs.toFixed(1)} ms): kept ${acceptedCount}, rejected “${words[rejectedIndex]}” (p/q = ${tokens[rejectedIndex].acceptThreshold.toFixed(2)} < ${roll.toFixed(2)}) and replaced it with “${bonusOrCorrectionToken}” -> ${emittedTokens} words emitted.`;

  frames.push({
    stepIndex: k,
    phase: 'verify',
    activeDraftIndex: k - 1,
    draftedCount: k,
    elapsedMs: expected.stepLatencyMs,
    emittedSoFar: emittedTokens,
    summary: verifySummary,
  });

  return {
    tokens,
    draftHorizon: k,
    acceptanceAlpha: alpha,
    draftLatencyMs: draftMs,
    targetLatencyMs: targetMs,
    checkRoll: roll,
    acceptedCount,
    rejectedIndex,
    emittedTokens,
    bonusOrCorrectionToken,
    stepLatencyMs: expected.stepLatencyMs,
    expectedTokensPerStep: expected.expectedTokens,
    expectedBaselineMs: expected.baselineMs,
    expectedSpeedup: expected.speedup,
    actualBaselineMs,
    actualSpeedup,
    breakEvenAlpha,
    curve,
    frames,
  };
}
