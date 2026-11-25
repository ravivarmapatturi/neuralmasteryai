# Real live playgrounds: all 92 original tools (rollout)

Owner (2026-11-25): "make all 92 tools real playground, one by one and ship" + "real and live playground, as much as possible".

## What "real and live" means (acceptance for EVERY tool)
1. The learner drives it: at least 3 meaningful controls (sliders, inputs they can type, draggable points, toggles, presets). Free text/number input wherever the idea allows (type your own sentence, data points, expression, numbers).
2. Real computation: every number, curve and state is computed from the inputs by the actual algorithm (no hardcoded frames, no random fakes). Put the math in a pure `*.ts` module with unit tests on hand-checked cases.
3. Live: it moves. Play/Pause/Step to run the process (training steps, packets, queue, iterations), with motion that teaches the idea. Pauses off screen (useAutoCycle / VizVisibleContext), respects reduced motion.
4. Shows the why: a live readout of the key quantity (loss, regret, latency, probability...) and one "predict then run" challenge inside the tool.
5. Notebook style (notebook-page skill), theme tokens, fits phone (375 px) and laptop, no text overlap/clipping.
6. Keep the same component file path and default export so every Learn page that embeds it also gets the upgrade; the Learn page must still read correctly.

## Order (weakest first; number = current control count, lines)
- [ ] B01 tfidf-search-explorer (1 controls, 351 lines) `src/viz/diagrams/TfidfSearchExplorer.tsx`
- [ ] B01 hashmap-vs-array (1 controls, 43 lines) `src/viz/diagrams/HashMapVsArrayDiagram.tsx`
- [ ] B01 image-tensor-explorer (1 controls, 44 lines) `src/viz/diagrams/ImageTensorExplorerDiagram.tsx`
- [ ] B01 reward-hacking (1 controls, 47 lines) `src/viz/diagrams/RewardHackingSimulationDiagram.tsx`
- [ ] B01 screening-funnel (1 controls, 48 lines) `src/viz/diagrams/ScreeningFunnelDiagram.tsx`
- [ ] B01 return-discounting (1 controls, 49 lines) `src/viz/diagrams/ReturnDiscountingDiagram.tsx`
- [ ] B01 staged-deployment (1 controls, 49 lines) `src/viz/diagrams/StagedDeploymentDiagram.tsx`
- [ ] B01 tcp-vs-udp (1 controls, 51 lines) `src/viz/diagrams/TcpVsUdpDiagram.tsx`
- [ ] B02 specification-gaming (1 controls, 53 lines) `src/viz/diagrams/SpecificationGamingDiagram.tsx`
- [ ] B02 superposition-explorer (1 controls, 57 lines) `src/viz/diagrams/SuperpositionDiagram.tsx`
- [ ] B02 diffusion-forward-process (1 controls, 63 lines) `src/viz/diagrams/DiffusionForwardProcessDiagram.tsx`
- [ ] B02 generator-memory (1 controls, 66 lines) `src/viz/diagrams/GeneratorMemoryDiagram.tsx`
- [ ] B02 async-event-loop (1 controls, 67 lines) `src/viz/diagrams/AsyncEventLoopDiagram.tsx`
- [ ] B02 consensus-quorum (1 controls, 68 lines) `src/viz/diagrams/ConsensusQuorumDiagram.tsx`
- [ ] B02 adversarial-perturbation (1 controls, 71 lines) `src/viz/diagrams/AdversarialPerturbationDiagram.tsx`
- [ ] B02 gin-expressiveness (1 controls, 77 lines) `src/viz/diagrams/GinExpressivenessDiagram.tsx`
- [ ] B03 sampling-nyquist (1 controls, 96 lines) `src/viz/diagrams/SamplingNyquistDiagram.tsx`
- [ ] B03 shapley-coalitions (2 controls, 108 lines) `src/viz/diagrams/ShapleyCoalitionDiagram.tsx`
- [ ] B03 error-budget-explorer (2 controls, 41 lines) `src/viz/diagrams/ErrorBudgetExplorer.tsx`
- [ ] B03 instruction-data-boundary (2 controls, 48 lines) `src/viz/diagrams/InstructionDataBoundaryDiagram.tsx`
- [ ] B03 bleu-score-explorer (2 controls, 49 lines) `src/viz/diagrams/BleuScoreDiagram.tsx`
- [ ] B03 tokenization-ambiguity (2 controls, 53 lines) `src/viz/diagrams/TokenizationAmbiguityDiagram.tsx`
- [ ] B03 pipeline-bubble (2 controls, 54 lines) `src/viz/diagrams/PipelineBubbleDiagram.tsx`
- [ ] B03 cost-weighted-threshold (2 controls, 56 lines) `src/viz/diagrams/CostWeightedThresholdDiagram.tsx`
- [ ] B04 continuous-batching-sim (2 controls, 57 lines) `src/viz/diagrams/ContinuousBatchingSimulationDiagram.tsx`
- [ ] B04 entropy-kl-explorer (2 controls, 60 lines) `src/viz/diagrams/EntropyKlDiagram.tsx`
- [ ] B04 index-scan-comparison (2 controls, 61 lines) `src/viz/diagrams/IndexScanComparisonDiagram.tsx`
- [ ] B04 membership-inference (2 controls, 61 lines) `src/viz/diagrams/MembershipInferenceDiagram.tsx`
- [ ] B04 sim-to-real-gap (2 controls, 61 lines) `src/viz/diagrams/SimToRealGapDiagram.tsx`
- [ ] B04 psi-drift-calculator (2 controls, 64 lines) `src/viz/diagrams/PsiCalculatorDiagram.tsx`
- [ ] B04 qlearning-vs-sarsa (2 controls, 68 lines) `src/viz/diagrams/QLearningVsSarsaCliffDiagram.tsx`
- [ ] B04 adaptive-batching-queue (2 controls, 71 lines) `src/viz/diagrams/AdaptiveBatchingQueueDiagram.tsx`
- [ ] B05 random-walk-embedding (2 controls, 74 lines) `src/viz/diagrams/RandomWalkEmbeddingDiagram.tsx`
- [ ] B05 parallel-agent-speedup (2 controls, 76 lines) `src/viz/diagrams/ParallelAgentSpeedupDiagram.tsx`
- [ ] B05 transe-embeddings (2 controls, 77 lines) `src/viz/diagrams/TransEDiagram.tsx`
- [ ] B05 fourier-sum-of-sines (2 controls, 78 lines) `src/viz/diagrams/FourierSumOfSinesDiagram.tsx`
- [ ] B05 ann-vs-exact (2 controls, 79 lines) `src/viz/diagrams/AnnVsExactTradeoffDiagram.tsx`
- [ ] B05 bandit-regret-race (2 controls, 99 lines) `src/viz/diagrams/BanditRegretRaceDiagram.tsx`
- [ ] B05 morphological-ops (3 controls, 109 lines) `src/viz/diagrams/MorphologicalOpsDiagram.tsx`
- [ ] B05 context-budget-waterfall (3 controls, 119 lines) `src/viz/diagrams/ContextBudgetWaterfallVisualizer.tsx`
- [ ] B06 agent-trace-waterfall (3 controls, 120 lines) `src/viz/diagrams/AgentTraceWaterfallVisualizer.tsx`
- [ ] B06 embedding-space-explorer (3 controls, 144 lines) `src/viz/EmbeddingSpaceExplorer.tsx`
- [ ] B06 algorithm-selector (3 controls, 150 lines) `src/viz/AlgorithmSelector.tsx`
- [ ] B06 llm-inference-flow (3 controls, 190 lines) `src/viz/InferenceFlowVisualizer.tsx`
- [ ] B06 harness-ablation-studio (3 controls, 210 lines) `src/viz/diagrams/HarnessAblationStudio.tsx`
- [ ] B06 write-skew-explorer (3 controls, 42 lines) `src/viz/diagrams/WriteSkewExplorer.tsx`
- [ ] B06 judge-position-bias (3 controls, 45 lines) `src/viz/diagrams/JudgePositionBiasDiagram.tsx`
- [ ] B06 neural-operator-explorer (3 controls, 46 lines) `src/viz/diagrams/NeuralOperatorDiagram.tsx`
- [ ] B07 token-bucket-rate-limiter (3 controls, 50 lines) `src/viz/diagrams/TokenBucketAdmissionExplorer.tsx`
- [ ] B07 consistent-hashing (3 controls, 53 lines) `src/viz/diagrams/ConsistentHashMembershipExplorer.tsx`
- [ ] B07 bayes-update (3 controls, 54 lines) `src/viz/diagrams/BayesUpdateDiagram.tsx`
- [ ] B07 cold-start-strategy (3 controls, 54 lines) `src/viz/diagrams/ColdStartDiagram.tsx`
- [ ] B07 benchmark-dimensions (3 controls, 58 lines) `src/viz/diagrams/BenchmarkDimensionsSelectorDiagram.tsx`
- [ ] B07 ab-shadow-canary (3 controls, 60 lines) `src/viz/diagrams/ABShadowCanaryDiagram.tsx`
- [ ] B07 lime-local-approx (3 controls, 67 lines) `src/viz/diagrams/LimeLocalApproxDiagram.tsx`
- [ ] B07 cap-theorem (3 controls, 77 lines) `src/viz/diagrams/CapTheoremDiagram.tsx`
- [ ] B08 ctc-alignment (3 controls, 83 lines) `src/viz/diagrams/CtcAlignmentDiagram.tsx`
- [x] B08 kv-cache-explorer (3 controls, 87 lines) `src/viz/diagrams/KvCacheDiagram.tsx`
- [x] B08 embedding-similarity-search (4 controls, 106 lines) `src/viz/diagrams/EmbeddingSimilaritySearchDiagram.tsx`
- [ ] B08 convolution-slide-explorer (4 controls, 175 lines) `src/viz/diagrams/ConvolutionSlideDiagram.tsx`
- [ ] B08 agent-harness-architecture (4 controls, 287 lines) `src/viz/diagrams/AgentHarnessArchitectureVisualizer.tsx`
- [ ] B08 cohens-kappa (4 controls, 55 lines) `src/viz/diagrams/CohensKappaDiagram.tsx`
- [ ] B08 pinn-loss-explorer (4 controls, 61 lines) `src/viz/diagrams/PinnLossDiagram.tsx`
- [ ] B08 ridge-regression-studio (4 controls, 62 lines) `src/viz/RidgeRegressionStudio.tsx`
- [ ] B09 lasso-regression-studio (4 controls, 64 lines) `src/viz/LassoRegressionStudio.tsx`
- [ ] B09 matrix-transformation (4 controls, 64 lines) `src/viz/diagrams/MatrixTransformationDiagram.tsx`
- [ ] B09 statistical-power (4 controls, 66 lines) `src/viz/diagrams/StatisticalPowerDiagram.tsx`
- [ ] B09 router-vs-supervisor (5 controls, 133 lines) `src/viz/diagrams/RouterVsSupervisorDiagram.tsx`
- [ ] B09 context-compaction (5 controls, 182 lines) `src/viz/diagrams/ContextCompactionVisualizer.tsx`
- [ ] B09 paged-attention (5 controls, 234 lines) `src/viz/diagrams/PagedAttentionVisualizer.tsx`
- [ ] B09 pagerank-visualizer (5 controls, 339 lines) `src/viz/diagrams/PageRankVisualizer.tsx`
- [ ] B09 distribution-explorer (5 controls, 69 lines) `src/viz/diagrams/DistributionExplorerDiagram.tsx`
- [ ] B10 threading-vs-multiprocessing (5 controls, 94 lines) `src/viz/diagrams/ThreadingVsMultiprocessingDiagram.tsx`
- [ ] B10 cache-eviction-ttl (6 controls, 111 lines) `src/viz/diagrams/CacheEvictionTtlDiagram.tsx`
- [ ] B10 agent-execution-graph (6 controls, 172 lines) `src/viz/AgentExecutionGraph.tsx`
- [ ] B10 instruction-budget (6 controls, 187 lines) `src/viz/diagrams/InstructionBudgetVisualizer.tsx`
- [ ] B10 quantization-scale (6 controls, 225 lines) `src/viz/diagrams/QuantizationScaleVisualizer.tsx`
- [x] B10 attention-step-through (6 controls, 230 lines) `src/viz/AttentionStepThrough.tsx`
- [ ] B10 speculative-decoding (6 controls, 240 lines) `src/viz/diagrams/SpeculativeDecodingSimulator.tsx`
- [ ] B10 rag-pipeline-simulator (7 controls, 188 lines) `src/viz/RagPipelineSimulator.tsx`
- [x] B11 gradient-descent-explorer (7 controls, 190 lines) `src/viz/GradientDescentExplorer.tsx`
- [ ] B11 agent-control-flow-graph (7 controls, 242 lines) `src/viz/diagrams/AgentControlFlowGraphDiagram.tsx`
- [ ] B11 neural-network-playground (9 controls, 186 lines) `src/viz/NeuralNetworkPlayground.tsx`
- [ ] B11 roofline-model (9 controls, 317 lines) `src/viz/diagrams/RooflineModelVisualizer.tsx`
- [ ] B11 two-pointers-sliding-window (9 controls, 369 lines) `src/viz/TwoPointersSlidingWindowExplorer.tsx`
- [ ] B11 decision-boundary-playground (10 controls, 220 lines) `src/viz/DecisionBoundaryPlayground.tsx`
- [ ] B11 ranking-metrics-explorer (10 controls, 381 lines) `src/viz/diagrams/RankingMetricsExplorer.tsx`
- [ ] B11 logistic-regression-studio (11 controls, 205 lines) `src/viz/LogisticRegressionStudio.tsx`
- [ ] B12 linear-regression-studio (12 controls, 254 lines) `src/viz/LinearRegressionStudio.tsx`
- [ ] B12 graph-tree-traversal (12 controls, 499 lines) `src/viz/GraphTreeTraversalExplorer.tsx`
- [ ] B12 bm25-saturation-explorer (16 controls, 534 lines) `src/viz/diagrams/Bm25SaturationExplorer.tsx`

## Lanes
Odd batches: agy (Gemini 4 Hydrogen XHigh). Even batches: Codex (gpt-5.6-sol, xhigh). Claude reviews every batch in the browser and ships it to main.
Per batch: branch `real-pg/BNN` from origin/main; one commit; tick the boxes for that batch in this file; never run `npm run build` or Playwright (Claude does); run typecheck, check:links, check:notebook, and the tests for the files you touched.
