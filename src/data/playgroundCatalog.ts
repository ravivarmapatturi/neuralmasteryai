import type { ComponentType, LazyExoticComponent } from 'react';
import rawCatalog from './playgroundCatalog.json';
import { lazyWithRetry } from '../lib/lazyWithRetry';

export interface PlaygroundSection {
  id: string;
  label: string;
  track: string;
}

export interface TryThisPrompt {
  prompt: string;
  check: string;
}

export interface PlaygroundTool {
  slug: string;
  title: string;
  section: string;
  sectionLabel: string;
  whatYouTry: string;
  whatYouChange: string;
  whatYouSee: string;
  ideaTaught: string;
  component: string;
  learnPath: string;
  learnTitle: string;
  tryThis: TryThisPrompt[];
}

export interface ComingSoonTool {
  title: string;
  section: string;
  sectionLabel: string;
  whatYouTry: string;
  learnPath: string;
  learnTitle: string;
}

export type PlaygroundComponentLoader = () => Promise<{ default: ComponentType }>;

export const PLAYGROUND_SECTIONS: PlaygroundSection[] = rawCatalog.sections;
export const PLAYGROUND_TOOLS: PlaygroundTool[] = rawCatalog.tools;
export const COMING_SOON_TOOLS: ComingSoonTool[] = rawCatalog.comingSoon;

export const PLAYGROUND_COMPONENTS: Record<string, PlaygroundComponentLoader> = {
  'ai-stack-map': () => import('../viz/playground/AiStackMapTour'),
  'role-path-builder': () => import('../viz/playground/RolePathBuilder'),
  'tokenizer-prefix-cache': () => import('../viz/playground/TokenizerPrefixCacheInspector'),
  'anomaly-loop-alarm': () => import('../viz/playground/AnomalyLoopAlarmLab'),
  'serving-vram-estimator': () => import('../viz/playground/ServingVramEstimator'),
  'technique-tradeoff-radar': () => import('../viz/playground/TechniqueTradeoffComparator'),
  'shell-pipeline-sandbox': () => import('../viz/playground/ShellPipelineSandbox'),
  'ablation-table-auditor': () => import('../viz/playground/AblationTableAuditor'),
  'scalar-autograd-graph': () => import('../viz/playground/ScalarAutogradGraph'),
  'project-cost-estimator': () => import('../viz/playground/ProjectCostEstimator'),
  'open-model-license-checker': () => import('../viz/playground/OpenModelLicenseChecker'),
  'distribution-explorer': () => import('../viz/diagrams/DistributionExplorerDiagram'),
  'bayes-update': () => import('../viz/diagrams/BayesUpdateDiagram'),
  'entropy-kl-explorer': () => import('../viz/diagrams/EntropyKlDiagram'),
  'matrix-transformation': () => import('../viz/diagrams/MatrixTransformationDiagram'),
  'cap-theorem': () => import('../viz/diagrams/CapTheoremDiagram'),
  'tcp-vs-udp': () => import('../viz/diagrams/TcpVsUdpDiagram'),
  'consensus-quorum': () => import('../viz/diagrams/ConsensusQuorumDiagram'),
  'async-event-loop': () => import('../viz/diagrams/AsyncEventLoopDiagram'),
  'threading-vs-multiprocessing': () => import('../viz/diagrams/ThreadingVsMultiprocessingDiagram'),
  'generator-memory': () => import('../viz/diagrams/GeneratorMemoryDiagram'),
  'linear-regression-studio': () => import('../viz/LinearRegressionStudio'),
  'logistic-regression-studio': () => import('../viz/LogisticRegressionStudio'),
  'decision-boundary-playground': () => import('../viz/DecisionBoundaryPlayground'),
  'lasso-regression-studio': () => import('../viz/LassoRegressionStudio'),
  'neural-network-playground': () => import('../viz/NeuralNetworkPlayground'),
  'gradient-descent-explorer': () => import('../viz/GradientDescentExplorer'),
  'attention-step-through': () => import('../viz/AttentionStepThrough'),
  'diffusion-forward-process': () => import('../viz/diagrams/DiffusionForwardProcessDiagram'),
  'embedding-space-explorer': () => import('../viz/EmbeddingSpaceExplorer'),
  'tokenization-ambiguity': () => import('../viz/diagrams/TokenizationAmbiguityDiagram'),
  'bleu-score-explorer': () => import('../viz/diagrams/BleuScoreDiagram'),
  'convolution-slide-explorer': () => import('../viz/diagrams/ConvolutionSlideDiagram'),
  'image-tensor-explorer': () => import('../viz/diagrams/ImageTensorExplorerDiagram'),
  'morphological-ops': () => import('../viz/diagrams/MorphologicalOpsDiagram'),
  'sampling-nyquist': () => import('../viz/diagrams/SamplingNyquistDiagram'),
  'fourier-sum-of-sines': () => import('../viz/diagrams/FourierSumOfSinesDiagram'),
  'ctc-alignment': () => import('../viz/diagrams/CtcAlignmentDiagram'),
  'browser-lm': () => import('../viz/playground/BrowserLmLab'),
  'llm-inference-flow': () => import('../viz/InferenceFlowVisualizer'),
  'rag-pipeline-simulator': () => import('../viz/RagPipelineSimulator'),
  'kv-cache-explorer': () => import('../viz/diagrams/KvCacheDiagram'),
  'bm25-saturation-explorer': () => import('../viz/diagrams/Bm25SaturationExplorer'),
  'tfidf-search-explorer': () => import('../viz/diagrams/TfidfSearchExplorer'),
  'pagerank-visualizer': () => import('../viz/diagrams/PageRankVisualizer'),
  'ranking-metrics-explorer': () => import('../viz/diagrams/RankingMetricsExplorer'),
  'transe-embeddings': () => import('../viz/diagrams/TransEDiagram'),
  'gin-expressiveness': () => import('../viz/diagrams/GinExpressivenessDiagram'),
  'random-walk-embedding': () => import('../viz/diagrams/RandomWalkEmbeddingDiagram'),
  'bandit-regret-race': () => import('../viz/diagrams/BanditRegretRaceDiagram'),
  'qlearning-vs-sarsa': () => import('../viz/diagrams/QLearningVsSarsaCliffDiagram'),
  'return-discounting': () => import('../viz/diagrams/ReturnDiscountingDiagram'),
  'agent-execution-graph': () => import('../viz/AgentExecutionGraph'),
  'router-vs-supervisor': () => import('../viz/diagrams/RouterVsSupervisorDiagram'),
  'parallel-agent-speedup': () => import('../viz/diagrams/ParallelAgentSpeedupDiagram'),
  'agent-harness-architecture': () => import('../viz/diagrams/AgentHarnessArchitectureVisualizer'),
  'instruction-budget': () => import('../viz/diagrams/InstructionBudgetVisualizer'),
  'context-compaction': () => import('../viz/diagrams/ContextCompactionVisualizer'),
  'harness-ablation-studio': () => import('../viz/diagrams/HarnessAblationStudio'),
  'context-budget-waterfall': () => import('../viz/diagrams/ContextBudgetWaterfallVisualizer'),
  'consistent-hashing': () => import('../viz/diagrams/ConsistentHashMembershipExplorer'),
  'token-bucket-rate-limiter': () => import('../viz/diagrams/TokenBucketAdmissionExplorer'),
  'error-budget-explorer': () => import('../viz/diagrams/ErrorBudgetExplorer'),
  'write-skew-explorer': () => import('../viz/diagrams/WriteSkewExplorer'),
  'benchmark-dimensions': () => import('../viz/diagrams/BenchmarkDimensionsSelectorDiagram'),
  'cold-start-strategy': () => import('../viz/diagrams/ColdStartDiagram'),
  'ab-shadow-canary': () => import('../viz/diagrams/ABShadowCanaryDiagram'),
  'psi-drift-calculator': () => import('../viz/diagrams/PsiCalculatorDiagram'),
  'pipeline-bubble': () => import('../viz/diagrams/PipelineBubbleDiagram'),
  'adaptive-batching-queue': () => import('../viz/diagrams/AdaptiveBatchingQueueDiagram'),
  'cache-eviction-ttl': () => import('../viz/diagrams/CacheEvictionTtlDiagram'),
  'roofline-model': () => import('../viz/diagrams/RooflineModelVisualizer'),
  'paged-attention': () => import('../viz/diagrams/PagedAttentionVisualizer'),
  'speculative-decoding': () => import('../viz/diagrams/SpeculativeDecodingSimulator'),
  'quantization-scale': () => import('../viz/diagrams/QuantizationScaleVisualizer'),
  'embedding-similarity-search': () => import('../viz/diagrams/EmbeddingSimilaritySearchDiagram'),
  'ann-vs-exact': () => import('../viz/diagrams/AnnVsExactTradeoffDiagram'),
  'index-scan-comparison': () => import('../viz/diagrams/IndexScanComparisonDiagram'),
  'agent-control-flow-graph': () => import('../viz/diagrams/AgentControlFlowGraphDiagram'),
  'continuous-batching-sim': () => import('../viz/diagrams/ContinuousBatchingSimulationDiagram'),
  'judge-position-bias': () => import('../viz/diagrams/JudgePositionBiasDiagram'),
  'cohens-kappa': () => import('../viz/diagrams/CohensKappaDiagram'),
  'statistical-power': () => import('../viz/diagrams/StatisticalPowerDiagram'),
  'agent-trace-waterfall': () => import('../viz/diagrams/AgentTraceWaterfallVisualizer'),
  'adversarial-perturbation': () => import('../viz/diagrams/AdversarialPerturbationDiagram'),
  'membership-inference': () => import('../viz/diagrams/MembershipInferenceDiagram'),
  'instruction-data-boundary': () => import('../viz/diagrams/InstructionDataBoundaryDiagram'),
  'reward-hacking': () => import('../viz/diagrams/RewardHackingSimulationDiagram'),
  'specification-gaming': () => import('../viz/diagrams/SpecificationGamingDiagram'),
  'staged-deployment': () => import('../viz/diagrams/StagedDeploymentDiagram'),
  'shapley-coalitions': () => import('../viz/diagrams/ShapleyCoalitionDiagram'),
  'lime-local-approx': () => import('../viz/diagrams/LimeLocalApproxDiagram'),
  'superposition-explorer': () => import('../viz/diagrams/SuperpositionDiagram'),
  'pinn-loss-explorer': () => import('../viz/diagrams/PinnLossDiagram'),
  'neural-operator-explorer': () => import('../viz/diagrams/NeuralOperatorDiagram'),
  'screening-funnel': () => import('../viz/diagrams/ScreeningFunnelDiagram'),
  'cost-weighted-threshold': () => import('../viz/diagrams/CostWeightedThresholdDiagram'),
  'sim-to-real-gap': () => import('../viz/diagrams/SimToRealGapDiagram'),
  'two-pointers-sliding-window': () => import('../viz/TwoPointersSlidingWindowExplorer'),
  'graph-tree-traversal': () => import('../viz/GraphTreeTraversalExplorer'),
  'algorithm-selector': () => import('../viz/AlgorithmSelector'),
  'ridge-regression-studio': () => import('../viz/RidgeRegressionStudio'),
  'hashmap-vs-array': () => import('../viz/diagrams/HashMapVsArrayDiagram'),
};

const lazyCache = new Map<string, LazyExoticComponent<ComponentType>>();

export function getPlaygroundToolBySlug(slug: string): PlaygroundTool | undefined {
  return PLAYGROUND_TOOLS.find((tool) => tool.slug === slug);
}

export function resolvePlaygroundComponent(slug: string): PlaygroundComponentLoader | undefined {
  return PLAYGROUND_COMPONENTS[slug];
}

export function getLazyPlaygroundComponent(slug: string): LazyExoticComponent<ComponentType> | undefined {
  const cached = lazyCache.get(slug);
  if (cached) return cached;
  const loader = resolvePlaygroundComponent(slug);
  if (!loader) return undefined;
  const component = lazyWithRetry(loader);
  lazyCache.set(slug, component);
  return component;
}
