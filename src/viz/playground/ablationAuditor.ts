export interface AblationVariant {
  id: string;
  label: string;
  score: number;
  ciHalfWidth: number;
  computeRatio: number;
  usesExtraTuning: boolean;
  leakageInflation: number;
  note: string;
}

export interface PaperAuditScenario {
  id: string;
  title: string;
  metricName: string;
  claimedHeadline: string;
  baseline: AblationVariant;
  variants: AblationVariant[];
}

export interface AuditControls {
  normalizeCompute: boolean;
  showConfidenceIntervals: boolean;
  matchBaselineTuning: boolean;
  deduplicateLeakage: boolean;
  enabledComponents: string[];
}

export interface AuditedRow {
  variant: AblationVariant;
  adjustedScore: number;
  deltaFromBaseline: number;
  overlapsBaselineCI: boolean;
}

export interface PaperAuditResult {
  scenario: PaperAuditScenario;
  adjustedBaselineScore: number;
  rows: AuditedRow[];
  bestVariantDelta: number;
  verdict: 'Supported' | 'Inconclusive (CI overlap)' | 'Confounded (unfair baseline or compute)';
  explanation: string;
}

export const PAPER_AUDIT_SCENARIOS: PaperAuditScenario[] = [
  {
    id: 'compute-confound',
    title: 'Sparse-Route Transformer (+3.4% claimed)',
    metricName: 'Eval accuracy (%)',
    claimedHeadline: '+3.4% over Dense Baseline',
    baseline: {
      id: 'base',
      label: 'Dense Transformer baseline',
      score: 74.2,
      ciHalfWidth: 0.4,
      computeRatio: 1.0,
      usesExtraTuning: false,
      leakageInflation: 0,
      note: 'Trained at 1.0x FLOP budget',
    },
    variants: [
      {
        id: 'router',
        label: '+ Dynamic Router only (1.0x FLOPs)',
        score: 74.8,
        ciHalfWidth: 0.4,
        computeRatio: 1.0,
        usesExtraTuning: false,
        leakageInflation: 0,
        note: 'Equal compute isolates true routing gain (+0.6%)',
      },
      {
        id: 'router-2x',
        label: '+ Dynamic Router + 2.0x Pretrain FLOPs',
        score: 77.6,
        ciHalfWidth: 0.4,
        computeRatio: 2.0,
        usesExtraTuning: false,
        leakageInflation: 0,
        note: 'Adds 2x training tokens without matching baseline FLOPs',
      },
    ],
  },
  {
    id: 'ci-overlap',
    title: 'Graph-Filter Reranker (+1.1% claimed)',
    metricName: 'MMLU-slice score (%)',
    claimedHeadline: '+1.1% on curated 5-task subset',
    baseline: {
      id: 'base',
      label: 'Bi-encoder + cross-encoder baseline',
      score: 68.5,
      ciHalfWidth: 1.3,
      computeRatio: 1.0,
      usesExtraTuning: false,
      leakageInflation: 0,
      note: '3-seed bootstrap CI ±1.3%',
    },
    variants: [
      {
        id: 'graph-filter',
        label: '+ Graph Filter module',
        score: 69.6,
        ciHalfWidth: 1.4,
        computeRatio: 1.0,
        usesExtraTuning: false,
        leakageInflation: 0.4,
        note: '95% CI [68.2, 71.0] overlaps baseline [67.2, 69.8]',
      },
    ],
  },
  {
    id: 'baseline-tuning',
    title: 'Memory-Augmented Agent (+5.2% claimed)',
    metricName: 'Task success (%)',
    claimedHeadline: '+5.2% over default baseline',
    baseline: {
      id: 'base',
      label: 'ReAct baseline (default LR)',
      score: 52.0,
      ciHalfWidth: 0.8,
      computeRatio: 1.0,
      usesExtraTuning: false,
      leakageInflation: 0,
      note: 'Default hyperparameters; gains +3.1% once LR/prompts are tuned',
    },
    variants: [
      {
        id: 'mem-agent',
        label: '+ Memory index (tuned + overlap)',
        score: 57.2,
        ciHalfWidth: 0.8,
        computeRatio: 1.0,
        usesExtraTuning: true,
        leakageInflation: 1.2,
        note: 'Paper tuned proposed method and left 1.2% near-duplicate eval items',
      },
    ],
  },
];

export function auditPaperScenario(
  scenario: PaperAuditScenario,
  controls: AuditControls,
): PaperAuditResult {
  // Adjusting baseline upward when matching LR/prompt tuning on unfair baseline
  const baselineTuningLift =
    controls.matchBaselineTuning && scenario.id === 'baseline-tuning' ? 3.1 : 0;
  const adjustedBaselineScore = scenario.baseline.score + baselineTuningLift;

  const activeVariants = scenario.variants.filter((v) => controls.enabledComponents.includes(v.id));
  const targetList = activeVariants.length > 0 ? activeVariants : scenario.variants;

  const rows: AuditedRow[] = targetList.map((variant) => {
    let adjusted = variant.score;
    // Removing uncredited extra FLOPs (illustrative ~2.8% scaling per 2x compute)
    if (controls.normalizeCompute && variant.computeRatio > 1.0) {
      adjusted -= (variant.computeRatio - 1.0) * 2.8;
    }
    if (controls.deduplicateLeakage && variant.leakageInflation > 0) {
      adjusted -= variant.leakageInflation;
    }

    const deltaFromBaseline = adjusted - adjustedBaselineScore;
    const combinedMargin = scenario.baseline.ciHalfWidth + variant.ciHalfWidth;
    const overlapsBaselineCI = Math.abs(deltaFromBaseline) < combinedMargin;

    return {
      variant,
      adjustedScore: adjusted,
      deltaFromBaseline,
      overlapsBaselineCI,
    };
  });

  const bestRow = rows.reduce((best, r) => (r.deltaFromBaseline > best.deltaFromBaseline ? r : best), rows[0]);
  const bestDelta = bestRow.deltaFromBaseline;

  const hadConfoundRemoved =
    (controls.normalizeCompute && targetList.some((v) => v.computeRatio > 1)) ||
    (controls.matchBaselineTuning && scenario.id === 'baseline-tuning') ||
    (controls.deduplicateLeakage && targetList.some((v) => v.leakageInflation > 0));

  let verdict: PaperAuditResult['verdict'] = 'Supported';
  let explanation = `Verified gain of +${bestDelta.toFixed(1)} pts clears combined 95% confidence bounds.`;

  if (controls.showConfidenceIntervals && bestRow.overlapsBaselineCI) {
    verdict = 'Inconclusive (CI overlap)';
    explanation = `Adjusted delta (${bestDelta >= 0 ? '+' : ''}${bestDelta.toFixed(1)} pts) sits inside the combined 95% confidence interval (±${(scenario.baseline.ciHalfWidth + bestRow.variant.ciHalfWidth).toFixed(1)} pts).`;
  } else if (!controls.normalizeCompute && targetList.some((v) => v.computeRatio > 1)) {
    verdict = 'Confounded (unfair baseline or compute)';
    explanation = 'Headline gain mixes architecture changes with 2.0x extra training FLOPs; toggle Equal compute budget to isolate the module delta.';
  } else if (!controls.matchBaselineTuning && scenario.id === 'baseline-tuning') {
    verdict = 'Confounded (unfair baseline or compute)';
    explanation = 'Baseline uses untuned defaults while the proposed system was heavily tuned. Match baseline tuning before trusting the gap.';
  } else if (hadConfoundRemoved && bestDelta < 1.0) {
    verdict = 'Inconclusive (CI overlap)';
    explanation = `After removing confounds, the remaining delta shrinks to +${bestDelta.toFixed(1)} pts.`;
  }

  return {
    scenario,
    adjustedBaselineScore,
    rows,
    bestVariantDelta: bestDelta,
    verdict,
    explanation,
  };
}
