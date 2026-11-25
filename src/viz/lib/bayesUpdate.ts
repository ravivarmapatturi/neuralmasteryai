import { bayesUpdate } from './probstat';

export type BayesOutcome = 'positive' | 'negative';

export interface BayesPreset {
  id: string;
  label: string;
  prior: number;
  tpr: number;
  fpr: number;
  population: number;
}

export const BAYES_PRESETS: readonly BayesPreset[] = [
  { id: 'rare', label: 'Rare condition (1%)', prior: 0.01, tpr: 0.95, fpr: 0.05, population: 1000 },
  { id: 'common', label: 'Common condition (20%)', prior: 0.2, tpr: 0.95, fpr: 0.05, population: 1000 },
  { id: 'precise', label: 'Sharp test (0.5% FP)', prior: 0.01, tpr: 0.95, fpr: 0.005, population: 1000 },
  { id: 'even', label: '50/50 toss-up (50%)', prior: 0.5, tpr: 0.9, fpr: 0.1, population: 1000 },
];

export interface BayesInput {
  prior: number;
  tpr: number;
  fpr: number;
  population: number;
  outcome: BayesOutcome;
}

export interface BayesStepRecord {
  id: 'prior' | 'counts' | 'pool' | 'retest';
  title: string;
  explain: string;
}

export interface BayesAnalysis {
  prior: number;
  tpr: number;
  fpr: number;
  population: number;
  outcome: BayesOutcome;
  sickCount: number;
  healthyCount: number;
  likelihoodCondition: number;
  likelihoodHealthy: number;
  conditionMatchCount: number;
  healthyMatchCount: number;
  totalMatchCount: number;
  evidenceProb: number;
  posterior1: number;
  posterior2: number;
  posterior3: number;
  falseAlarmShare: number;
  trace: BayesStepRecord[];
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

export function formatCount(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? rounded.toLocaleString('en-US') : rounded.toFixed(1);
}

export function analyzeBayesUpdate(input: BayesInput): BayesAnalysis {
  const prior = clamp(input.prior, 0.0005, 0.999);
  const tpr = clamp(input.tpr, 0.01, 0.999);
  const fpr = clamp(input.fpr, 0.0005, 0.95);
  const population = Math.round(clamp(input.population, 100, 100000));
  const outcome: BayesOutcome = input.outcome === 'negative' ? 'negative' : 'positive';

  const sickCount = population * prior;
  const healthyCount = population * (1 - prior);

  const likelihoodCondition = outcome === 'positive' ? tpr : 1 - tpr;
  const likelihoodHealthy = outcome === 'positive' ? fpr : 1 - fpr;

  const conditionMatchCount = sickCount * likelihoodCondition;
  const healthyMatchCount = healthyCount * likelihoodHealthy;
  const totalMatchCount = conditionMatchCount + healthyMatchCount;

  const evidenceProb = likelihoodCondition * prior + likelihoodHealthy * (1 - prior);
  const posterior1 = bayesUpdate(prior, likelihoodCondition, likelihoodHealthy);
  const posterior2 = bayesUpdate(posterior1, likelihoodCondition, likelihoodHealthy);
  const posterior3 = bayesUpdate(posterior2, likelihoodCondition, likelihoodHealthy);
  const falseAlarmShare = totalMatchCount > 0 ? healthyMatchCount / totalMatchCount : 0;

  const signLabel = outcome === 'positive' ? 'positive (+)' : 'negative (−)';
  const condMatchWord = outcome === 'positive' ? 'true catches' : 'missed cases';
  const healthyMatchWord = outcome === 'positive' ? 'false alarms' : 'true clears';

  const trace: BayesStepRecord[] = [
    {
      id: 'prior',
      title: 'Start with the prior belief (base rate)',
      explain: `Before any test, ${(prior * 100).toFixed(2)}% of ${population.toLocaleString('en-US')} people (${formatCount(sickCount)}) actually have the condition, and ${formatCount(healthyCount)} are healthy.`,
    },
    {
      id: 'counts',
      title: `Run the test on all ${population.toLocaleString('en-US')} people`,
      explain: `Out of the ${signLabel} results, ${formatCount(conditionMatchCount)} are ${condMatchWord} from sick people and ${formatCount(healthyMatchCount)} are ${healthyMatchWord} from healthy people.`,
    },
    {
      id: 'pool',
      title: `Keep only the ${formatCount(totalMatchCount)} ${signLabel} results`,
      explain: `Only ${formatCount(totalMatchCount)} people got a ${signLabel} result, so your updated belief is ${formatCount(conditionMatchCount)} / ${formatCount(totalMatchCount)} = ${(posterior1 * 100).toFixed(2)}%.`,
    },
    {
      id: 'retest',
      title: 'Update again if a 2nd independent test matches',
      explain: `Feeding ${(posterior1 * 100).toFixed(2)}% back as the new prior, a second independent ${signLabel} test moves your belief to ${(posterior2 * 100).toFixed(2)}% (and a third to ${(posterior3 * 100).toFixed(2)}%).`,
    },
  ];

  return {
    prior,
    tpr,
    fpr,
    population,
    outcome,
    sickCount,
    healthyCount,
    likelihoodCondition,
    likelihoodHealthy,
    conditionMatchCount,
    healthyMatchCount,
    totalMatchCount,
    evidenceProb,
    posterior1,
    posterior2,
    posterior3,
    falseAlarmShare,
    trace,
  };
}
