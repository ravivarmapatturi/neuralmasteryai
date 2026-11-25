export type FeatureId = 'I' | 'A' | 'C';

export const FEATURE_NAMES: Record<FeatureId, string> = {
  I: 'income',
  A: 'age',
  C: 'credit_score',
};

export const PLAIN_FEATURE_LABELS: Record<FeatureId, string> = {
  I: 'Income',
  A: 'Age',
  C: 'Credit score',
};

export const ORDERINGS: readonly (readonly [FeatureId, FeatureId, FeatureId])[] = [
  ['I', 'A', 'C'],
  ['I', 'C', 'A'],
  ['A', 'I', 'C'],
  ['A', 'C', 'I'],
  ['C', 'I', 'A'],
  ['C', 'A', 'I'],
];

export interface ShapleyGameParams {
  baseline: number;
  soloI: number;
  soloC: number;
  soloA: number;
  synergyIC: number;
  synergyIA: number;
  synergyAC: number;
  synergyThree: number;
}

export type ShapleyPresetId = 'loan-default' | 'dummy-age' | 'pure-synergy';

export interface ShapleyPreset {
  id: ShapleyPresetId;
  label: string;
  params: ShapleyGameParams;
}

export const SHAPLEY_PRESETS: readonly ShapleyPreset[] = [
  {
    id: 'loan-default',
    label: 'Loan score (chapter example)',
    params: {
      baseline: 50,
      soloI: 20,
      soloC: 10,
      soloA: 5,
      synergyIC: 5,
      synergyIA: 3,
      synergyAC: 0,
      synergyThree: -3,
    },
  },
  {
    id: 'dummy-age',
    label: 'Useless feature (Age adds 0)',
    params: {
      baseline: 50,
      soloI: 20,
      soloC: 10,
      soloA: 0,
      synergyIC: 5,
      synergyIA: 0,
      synergyAC: 0,
      synergyThree: 0,
    },
  },
  {
    id: 'pure-synergy',
    label: 'Teamwork bonus (I+C = +20)',
    params: {
      baseline: 40,
      soloI: 10,
      soloC: 10,
      soloA: 10,
      synergyIC: 20,
      synergyIA: 0,
      synergyAC: 0,
      synergyThree: 0,
    },
  },
];

export interface MarginalStep {
  feature: FeatureId;
  beforeCoalition: FeatureId[];
  afterCoalition: FeatureId[];
  before: number;
  after: number;
  delta: number;
}

export interface OrderingTrace {
  orderIndex: number;
  order: readonly [FeatureId, FeatureId, FeatureId];
  label: string;
  steps: MarginalStep[];
  deltas: Record<FeatureId, number>;
}

export interface ShapleyAnalysis {
  params: ShapleyGameParams;
  coalitionValues: Record<string, number>;
  baseline: number;
  fullPrediction: number;
  totalGain: number;
  orderings: OrderingTrace[];
  shapleyValues: Record<FeatureId, number>;
  efficiencySum: number;
  efficiencyResidual: number;
}

export function coalitionKey(features: readonly FeatureId[]): string {
  return [...features].sort().join('');
}

export function buildCoalitionTable(p: ShapleyGameParams): Record<string, number> {
  const b = p.baseline;
  return {
    '': b,
    I: b + p.soloI,
    A: b + p.soloA,
    C: b + p.soloC,
    AI: b + p.soloA + p.soloI + p.synergyIA,
    CI: b + p.soloC + p.soloI + p.synergyIC,
    AC: b + p.soloA + p.soloC + p.synergyAC,
    ACI: b + p.soloI + p.soloA + p.soloC + p.synergyIC + p.synergyIA + p.synergyAC + p.synergyThree,
  };
}

export function computeShapleyAnalysis(params: ShapleyGameParams): ShapleyAnalysis {
  const coalitionValues = buildCoalitionTable(params);
  const totals: Record<FeatureId, number> = { I: 0, A: 0, C: 0 };

  const orderings: OrderingTrace[] = ORDERINGS.map((order, orderIndex) => {
    let coalition: FeatureId[] = [];
    const steps: MarginalStep[] = [];
    const deltas: Record<FeatureId, number> = { I: 0, A: 0, C: 0 };

    for (const feature of order) {
      const before = coalitionValues[coalitionKey(coalition)];
      const nextCoalition = [...coalition, feature];
      const after = coalitionValues[coalitionKey(nextCoalition)];
      const delta = after - before;
      steps.push({
        feature,
        beforeCoalition: coalition,
        afterCoalition: nextCoalition,
        before,
        after,
        delta,
      });
      deltas[feature] = delta;
      totals[feature] += delta;
      coalition = nextCoalition;
    }

    return {
      orderIndex,
      order,
      label: order.map((f) => f).join('→'),
      steps,
      deltas,
    };
  });

  const n = ORDERINGS.length;
  const shapleyValues: Record<FeatureId, number> = {
    I: totals.I / n,
    A: totals.A / n,
    C: totals.C / n,
  };
  const baseline = coalitionValues[''];
  const fullPrediction = coalitionValues.ACI;
  const efficiencySum = baseline + shapleyValues.I + shapleyValues.A + shapleyValues.C;

  return {
    params,
    coalitionValues,
    baseline,
    fullPrediction,
    totalGain: fullPrediction - baseline,
    orderings,
    shapleyValues,
    efficiencySum,
    efficiencyResidual: Math.abs(efficiencySum - fullPrediction),
  };
}

export function explainShapleyStep(
  analysis: ShapleyAnalysis,
  orderIndex: number,
  focusFeature: FeatureId,
): string {
  const trace = analysis.orderings[orderIndex] ?? analysis.orderings[0];
  const step = trace.steps.find((s) => s.feature === focusFeature) ?? trace.steps[0];
  const beforeLabel = step.beforeCoalition.length === 0
    ? 'nobody yet (baseline)'
    : step.beforeCoalition.map((f) => FEATURE_NAMES[f]).join(' + ');
  const sign = step.delta >= 0 ? '+' : '';
  return `Order ${orderIndex + 1}/6 (${trace.order.map((f) => FEATURE_NAMES[f]).join(' → ')}): when ${FEATURE_NAMES[focusFeature]} joins after ${beforeLabel}, the loan score changes from ${step.before.toFixed(0)} to ${step.after.toFixed(0)} (${sign}${step.delta.toFixed(1)}).`;
}
