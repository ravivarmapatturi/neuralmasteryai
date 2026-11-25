export type ProblemKind = 'regression' | 'classification' | 'clustering' | 'projection';
export type PatternKind = 'simple' | 'complex';
export type ExplanationNeed = 'high' | 'low';
export type ComputeBudget = 'tight' | 'balanced' | 'generous';

export interface AlgorithmInputs {
  problem: ProblemKind;
  rows: number;
  features: number;
  pattern: PatternKind;
  explanationNeed: ExplanationNeed;
  computeBudget: ComputeBudget;
}

export interface ScoreContribution {
  factor: string;
  points: number;
  explanation: string;
}

export interface AlgorithmScore {
  id: string;
  label: string;
  href: string;
  total: number;
  contributions: ScoreContribution[];
}

type Trait = 'simple' | 'complex' | 'mixed';
type Readability = 'high' | 'medium' | 'low';
type DataScale = 'small' | 'large' | 'any';
type Cost = 'low' | 'medium' | 'high';

interface AlgorithmDefinition {
  id: string;
  label: string;
  href: string;
  pattern: Trait;
  readability: Readability;
  dataScale: DataScale;
  cost: Cost;
  highDimensional: boolean;
}

const DEFINITIONS: Record<ProblemKind, AlgorithmDefinition[]> = {
  regression: [
    { id: 'linear', label: 'Linear regression', href: '/docs/machine-learning/linear-regression', pattern: 'simple', readability: 'high', dataScale: 'small', cost: 'low', highDimensional: false },
    { id: 'ridge', label: 'Ridge regression', href: '/docs/machine-learning/ridge-regression', pattern: 'simple', readability: 'high', dataScale: 'any', cost: 'low', highDimensional: true },
    { id: 'tree-reg', label: 'Decision tree', href: '/docs/machine-learning/decision-tree', pattern: 'complex', readability: 'high', dataScale: 'small', cost: 'medium', highDimensional: false },
    { id: 'boost-reg', label: 'Gradient boosting', href: '/docs/machine-learning/xgboost-lightgbm-catboost', pattern: 'complex', readability: 'low', dataScale: 'large', cost: 'high', highDimensional: true },
  ],
  classification: [
    { id: 'logistic', label: 'Logistic regression', href: '/docs/machine-learning/logistic-regression', pattern: 'simple', readability: 'high', dataScale: 'small', cost: 'low', highDimensional: true },
    { id: 'tree-clf', label: 'Decision tree', href: '/docs/machine-learning/decision-tree', pattern: 'complex', readability: 'high', dataScale: 'small', cost: 'medium', highDimensional: false },
    { id: 'boost-clf', label: 'Gradient boosting', href: '/docs/machine-learning/xgboost-lightgbm-catboost', pattern: 'complex', readability: 'low', dataScale: 'large', cost: 'high', highDimensional: true },
    { id: 'neural', label: 'Neural network', href: '/docs/deep-learning/neural-network-fundamentals', pattern: 'complex', readability: 'low', dataScale: 'large', cost: 'high', highDimensional: true },
  ],
  clustering: [
    { id: 'kmeans', label: 'K-means', href: '/docs/machine-learning/kmeans-hierarchical-clustering', pattern: 'simple', readability: 'high', dataScale: 'large', cost: 'low', highDimensional: true },
    { id: 'hierarchical', label: 'Hierarchical clustering', href: '/docs/machine-learning/kmeans-hierarchical-clustering', pattern: 'mixed', readability: 'high', dataScale: 'small', cost: 'medium', highDimensional: false },
    { id: 'dbscan', label: 'DBSCAN', href: '/docs/machine-learning/dbscan-hdbscan', pattern: 'complex', readability: 'medium', dataScale: 'small', cost: 'medium', highDimensional: false },
    { id: 'hdbscan', label: 'HDBSCAN', href: '/docs/machine-learning/dbscan-hdbscan', pattern: 'complex', readability: 'medium', dataScale: 'large', cost: 'high', highDimensional: true },
  ],
  projection: [
    { id: 'pca', label: 'PCA', href: '/docs/machine-learning/pca-svd', pattern: 'simple', readability: 'high', dataScale: 'large', cost: 'low', highDimensional: true },
    { id: 'svd', label: 'Truncated SVD', href: '/docs/machine-learning/pca-svd', pattern: 'simple', readability: 'high', dataScale: 'large', cost: 'medium', highDimensional: true },
    { id: 'umap', label: 'UMAP', href: '/docs/machine-learning/ica-tsne-umap', pattern: 'complex', readability: 'low', dataScale: 'large', cost: 'high', highDimensional: true },
    { id: 'tsne', label: 't-SNE', href: '/docs/machine-learning/ica-tsne-umap', pattern: 'complex', readability: 'low', dataScale: 'small', cost: 'high', highDimensional: true },
  ],
};

export const SCORE_FACTORS = ['Starting score', 'Dataset size', 'Pattern shape', 'Readable result', 'Compute budget', 'Many features'] as const;

function safePositive(value: number, fallback: number): number {
  return Math.max(1, Number.isFinite(value) ? value : fallback);
}

function scoreDefinition(definition: AlgorithmDefinition, inputs: AlgorithmInputs): AlgorithmScore {
  const rows = safePositive(inputs.rows, 1);
  const features = safePositive(inputs.features, 1);
  const smallData = rows <= 2_000;
  const largeData = rows >= 50_000;
  const featurePressure = features > 200 || features / rows >= 0.1;

  const sizePoints = smallData
    ? definition.dataScale === 'small' ? 12 : definition.dataScale === 'large' ? -8 : 7
    : largeData
      ? definition.dataScale === 'large' ? 15 : definition.dataScale === 'small' ? -10 : 8
      : definition.dataScale === 'any' ? 10 : 6;
  const patternPoints = inputs.pattern === 'simple'
    ? definition.pattern === 'simple' ? 25 : definition.pattern === 'mixed' ? 10 : -8
    : definition.pattern === 'complex' ? 25 : definition.pattern === 'mixed' ? 15 : -12;
  const readablePoints = inputs.explanationNeed === 'high'
    ? definition.readability === 'high' ? 20 : definition.readability === 'medium' ? 8 : -12
    : definition.readability === 'low' ? 12 : definition.readability === 'medium' ? 6 : 0;
  const budgetPoints = inputs.computeBudget === 'tight'
    ? definition.cost === 'low' ? 15 : definition.cost === 'medium' ? 5 : -15
    : inputs.computeBudget === 'generous'
      ? definition.cost === 'high' ? 12 : definition.cost === 'medium' ? 8 : 4
      : definition.cost === 'medium' ? 10 : definition.cost === 'low' ? 8 : 2;
  const dimensionPoints = featurePressure ? (definition.highDimensional ? 15 : -5) : 0;

  const contributions: ScoreContribution[] = [
    { factor: 'Starting score', points: 40, explanation: 'Every candidate starts at 40 before your constraints are applied.' },
    { factor: 'Dataset size', points: sizePoints, explanation: `${rows.toLocaleString()} rows ${smallData ? 'favor methods that learn from less data' : largeData ? 'favor methods that scale to larger datasets' : 'fit the middle range'}.` },
    { factor: 'Pattern shape', points: patternPoints, explanation: inputs.pattern === 'simple' ? 'You chose a roughly linear or round pattern.' : 'You chose a nonlinear or irregular pattern.' },
    { factor: 'Readable result', points: readablePoints, explanation: inputs.explanationNeed === 'high' ? 'You need a model a person can inspect.' : 'You allow a harder-to-explain model.' },
    { factor: 'Compute budget', points: budgetPoints, explanation: `You chose a ${inputs.computeBudget} training budget.` },
    { factor: 'Many features', points: dimensionPoints, explanation: featurePressure ? `${features.toLocaleString()} features are large relative to ${rows.toLocaleString()} rows.` : 'The feature count is modest for this dataset size.' },
  ];

  return {
    id: definition.id,
    label: definition.label,
    href: definition.href,
    total: contributions.reduce((sum, row) => sum + row.points, 0),
    contributions,
  };
}

export function scoreAlgorithms(inputs: AlgorithmInputs): AlgorithmScore[] {
  return DEFINITIONS[inputs.problem]
    .map((definition) => scoreDefinition(definition, inputs))
    .sort((a, b) => b.total - a.total || a.label.localeCompare(b.label));
}

export function scoreThroughFactor(score: AlgorithmScore, factorIndex: number): number {
  return score.contributions
    .slice(0, Math.max(0, Math.min(score.contributions.length, factorIndex + 1)))
    .reduce((sum, contribution) => sum + contribution.points, 0);
}
