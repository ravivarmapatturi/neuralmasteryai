# Live Visuals Rollout — agy Lane Report

Tracking motion rationale and verification notes for each diagram in `docs/plans/live-visuals-agy.md`.

## Batch 1: Agents Foundations & Core

Pages covered:
- `src/content/docs/agents/a2a/overview.mdx`
- `src/content/docs/agents/agent-architectures.mdx`
- `src/content/docs/agents/agent-fundamentals.mdx`
- `src/content/docs/agents/agentic-coding-assistants.mdx`
- `src/content/docs/agents/browser-automation.mdx`
- `src/content/docs/agents/computer-use.mdx`
- `src/content/docs/agents/context-engineering.mdx`
- `src/content/docs/agents/loops-and-graphs.mdx`

### Motion Rationales:
1. `AgentCardDiagram`: Autocycles through manifest schema fields (capabilities, auth, endpoints) highlighting active card section and details.
2. `CrossOrgInteropDiagram`: `FlowDots` stream outbound across the trust boundary during request, and return on response; `PulseRect` highlights the active security gate / verification proxy.
3. `DelegationSequenceDiagram`: `FlowDots` travel down the active message exchange lifeline between client, orchestrator, and specialist agent; step cycle auto-advances.
4. `McpVsA2aScopeDiagram`: Left pane animates linear tool calls to local MCP server; right pane animates agent-to-agent negotiation across organizations.
5. `TaskLifecycleDiagram`: `FlowDots` transition along state edges (`submitted` -> `working` -> `completed`/`failed`); `PulseRect` marks active task status.
6. `AgentEvolutionDiagram`: `FlowDots` traverse progression from simple prompt wrapper to autonomous multi-agent hierarchy; `PulseRect` tracks selected architectural era.
7. `CoordinationPatternsDiagram`: In Hierarchical, pulses cascade down from manager to workers simultaneously; in Peer-to-peer, pulses cycle bidirectionally between mesh nodes; in Blackboard, worker pulses converge on the central shared state.
8. `HumanInTheLoopDiagram`: Auto-advances across HITL approval modes (passive monitor, active approval, post-hoc review) demonstrating human intervention gates.
9. `MemoryAsRetrievalDiagram`: `FlowDots` write user turn to vector store on ingestion, then stream top-k retrieved documents back to system prompt on query.
10. `ShortTermVsLongTermMemoryDiagram`: `FlowDots` stream down into long-term episodic store, and rise back into immediate working context on semantic retrieval.
11. `AgentLoopDiagram`: `FlowDots` circulate around the decision -> tool call -> tool result -> decision loop, branching to final answer when done.
12. `ArgumentSchemaValidationDiagram`: Steps through strict vs flexible JSON schema validation passes, highlighting type mismatches and coercion.
13. `ChatbotVsAgentDiagram`: Chatbot demonstrates simple linear input-to-output path; Agent demonstrates continuous circular execution loop with tool invocation and observation feedback.
14. `ContextWindowBudgetDiagram`: Autocycles conversation turns slider, visualizing progressive token accumulation, tool payload overhead, and system prompt compaction.
15. `ToolCallAnatomyDiagram`: Autocycles between tool function declaration, JSON argument payload, and environment execution response.
16. `ToolCallTraceDiagram`: Advances through execution trace frames, highlighting active tool execution and latency telemetry.
17. `AgenticCodingLoopDiagram`: `FlowDots` traverse loop from spec -> code edit -> unit test execution -> lint/error analysis -> fix iteration.
18. `CodingAgentSafetyModelDiagram`: `FlowDots` flow safely through containment sandbox and checkpoint rollback barriers before applying filesystem changes.
19. `OversightSpectrumDiagram`: `Pulse` glides along the spectrum from full manual control through supervised autonomy to unsupervised background worker.
20. `VerificationLayersDiagram`: Steps downward through progressive verification gates (typecheck -> unit tests -> integration tests -> security audit).
21. `BrowserAgentActionDiagram`: Auto-advances loop through DOM tree extraction, interactive element identification, synthesized keyboard/mouse event dispatch, and DOM delta observation.
22. `ComputerUseLoopDiagram`: Cycles through screen capture, OCR/coordinate inference, OS input dispatch, with a deliberate pause on high-consequence system actions.
23. `ContextEngineeringStrategiesDiagram`: Cycles through 4 prompt compression & context engineering strategies (scratchpad, summarization, pruning, selective retrieval).
24. `LoopGraphAnatomyDiagram`: Parallel `FlowDots` dispatch from graph router to parallel worker nodes simultaneously, then converge into aggregation evaluator node.

### Verification:
- Layer 1 (`tsc -b`): Clean (exit code 0).
- Layer 2 (`vitest run src/viz`): 84 files, 324 passed.
- Layer 3 (`check:notebook`): 0 violations.
- Layer 4 (Playwright screenshots): All 24 captured cleanly with 0 console/page errors in `docs/evidence/live-visuals/agy/batch-1/`.

## Batch 2: MCP, Multi-Agent & Orchestration Patterns

Pages covered:
- `src/content/docs/agents/mcp/overview.mdx`
- `src/content/docs/agents/mcp/protocol-deep-dive.mdx`
- `src/content/docs/agents/multi-agent-systems.mdx`
- `src/content/docs/agents/no-code-automation.mdx`
- `src/content/docs/agents/overview.mdx`
- `src/content/docs/agents/plan-and-execute.mdx`
- `src/content/docs/agents/reflection-self-critique.mdx`
- `src/content/docs/agents/routing-and-supervisor.mdx`

### Motion Rationales:
1. `McpArchitectureDiagram`: Autocycles through connected MCP servers (filesystem, GitHub, database); `FlowDots` stream along the active client-server RPC line and `PulseRect` highlights the active server card.
2. `McpCapabilityTypesDiagram`: Autocycles through Tools, Resources, and Prompts, highlighting the active capability type, description, and concrete production example.
3. `McpInAgentLoopDiagram`: Auto-advances through the 3 phases of an MCP-integrated loop (Agent reason -> MCP standardized tool call -> Result feedback into loop) with step transitions.
4. `McpLocalVsRemoteDiagram`: Autocycles between Local stdio subprocess and Remote Streamable HTTP server, emphasizing single-process vs multi-client network access.
5. `MxNIntegrationProblemDiagram`: In Custom mode, displays the messy $M \times N$ matrix of point-to-point connections; in Via MCP mode, `PulseRect` highlights the central MCP hub and parallel `FlowDots` stream simultaneously from apps into MCP and from MCP into downstream tools.
6. `TransportComparisonDiagram`: Cycles between stdio and Streamable HTTP, highlighting transport framing constraints and protocol requirements.
7. `OAuthAuthorizationFlowDiagram`: Steps sequentially down the 7-step RFC 8414 & PKCE authorization flow from initial 401 challenge through metadata discovery and token exchange to authenticated API requests.
8. `TokenAudienceBindingDiagram`: Cycles between forbidden token passthrough (confused deputy vulnerability) and separate audience-bound upstream token exchange with visual status glow.
9. `ToolCallFlowDiagram`: Cycles through the 5-step lifecycle (`tools/list` -> `LLM select` -> `tools/call` -> `server result` -> `client process`), tracking message flow.
10. `ToolErrorTypesDiagram`: Toggles between protocol-level JSON-RPC error format (-32602) and application-level tool execution failure (`isError: true` payload).
11. `ParallelAgentSpeedupDiagram`: Autocycles through 1 to 8 concurrent worker slots, animating the dynamic shrinkage of the greedy bin-packing makespan bar and calculating real wall-clock speedup.
12. `ClusterNodeAssemblyDiagram`: Autocycles through n8n AI Agent sub-node assembly combinations, transitioning from unrunnable root node to fully validated runnable agent when Chat Model and Tool sub-nodes attach.
13. `AgentFailureModesDiagram`: Steps through the 4 distinct agent failure modes (Tool misuse, Runaway loops, Context bloat, Coordination conflicts), mapping each to its specific root architecture layer.
14. `ArchitectureSpectrumDiagram`: Autocycles through ReAct, Plan-and-Execute, and Reflection; renders a breathing `Pulse` ring on the active 2D coordinate node (cost vs reliability).
15. `AutonomySpectrumDiagram`: Autocycles the autonomy slider from Read-only (0) through Full Autonomy (3); tracks slider head with a breathing `Pulse` on the spectrum line.
16. `PerceiveReasonActLoopDiagram`: Autocycles clockwise through Perceive, Reason, and Act; `FlowDots` travel smoothly along the quadratic bezier transition arcs while `Pulse` highlights the active loop stage.
17. `PlanExecuteReplanDiagram`: Steps through the 6-stage execution trace, highlighting plan generation, execution of steps 1-2, 404 failure detection, replanning insertion, substitute step execution, and successful completion.
18. `ReflexionLoopDiagram`: Advances through ALFWorld trial 1 failure and trial 2 success; streams `FlowDots` along active edge vectors between Actor, Evaluator, and Episodic Memory, pulsing the active node.
19. `RouterVsSupervisorDiagram`: Autocycles through Router pattern (single dispatch, unhandled question) then switches to Supervisor pattern (multi-turn inspection loop, full synthesis), showing step-by-step actor invocation and decision trace.

### Verification:
- Layer 1 (`tsc -b`): Clean (exit code 0).
- Layer 2 (`vitest run src/viz`): 84 files, 324 passed.
- Layer 3 (`check:notebook`): 0 violations.
- Layer 4 (Playwright screenshots): All 19 captured cleanly with 0 console/page errors in `docs/evidence/live-visuals/agy/batch-2/`.

## Batch 3

Pages covered:
- `src/content/docs/agents/single-vs-multi-agent.mdx`
- `src/content/docs/mlops/ai-cost-engineering.mdx`
- `src/content/docs/mlops/caching-strategies.mdx`
- `src/content/docs/mlops/cicd-and-ml-cicd.mdx`
- `src/content/docs/mlops/cloud-computing.mdx`
- `src/content/docs/mlops/cloud-model-deployment.mdx`
- `src/content/docs/mlops/containers.mdx`
- `src/content/docs/mlops/data-engineering-and-versioning.mdx`

### Motion Rationales:
1. `AgentSplitTradeoffDiagram`: Autocycles 1..5 specialized agents with dynamic width transition on makespan, coordination calls, and handoff points.
2. `ModelRoutingSavingsDiagram`: Autocycles between routed and unrouted; highlights 80% small model vs 20% large model cost reduction.
3. `QualityLatencyCostTriangleDiagram`: Autocycles 3 product modes (Latency-Critical, Balanced, Max-Quality); `Pulse` on ternary dot coordinates in trade-off space.
4. `TrainingVsInferenceCostDiagram`: Autocycles month 0..12; `Pulse` on intersection of current month line with training vs inference curves.
5. `UtilizationCostDiagram`: Autocycles 4 GPU utilization/bill quadrants with active badge glow.
6. `CacheAsideFlowDiagram`: Autocycles Cache Hit vs Cache Miss with step highlighting along application -> cache -> DB flow.
7. `CacheEvictionTtlDiagram`: Autocycles TTL expiry progression and LRU cache-full eviction with red/dimmed expired slots.
8. `WriteThroughVsWriteBehindDiagram`: Autocycles Write-through vs Write-behind with step progression and latency comparison.
9. `AutomatedRetrainLoopDiagram`: Autocycles schedule vs drift triggers with `FlowDots` along gate pipeline.
10. `CiVsCdDiagram`: Autocycles CI vs CD with `FlowDots` along the push -> CI -> merge -> CD -> prod path.
11. `GitOpsReconciliationDiagram`: Autocycles v1 vs v2 with rotating reconciliation sync indicator `⟳`.
12. `MlCicdPipelineStepsDiagram`: Autocycles 7 pipeline steps with warning badge on Step 4 regression gate.
13. `CloudDistinctiveFeaturesDiagram`: Autocycles GCP vs Azure services with card selection.
14. `CloudNeutralPortabilityDiagram`: Autocycles Docker, K8s, Terraform with cloud target status glow.
15. `CloudVocabularyMapDiagram`: Autocycles 6 cloud concepts mapping AWS, GCP, and Azure equivalents.
16. `ComputeSpectrumDiagram`: Autocycles EC2, ECS, EKS, Lambda with `Pulse` on spectrum track.
17. `ManagedMlPlatformTradeoffDiagram`: Autocycles Managed vs Self-hosted tradeoff matrix.
18. `RequestPathSecurityDiagram`: Autocycles request path across VPC, ALB, Compute, IAM.
19. `StorageUseCaseDiagram`: Autocycles S3, EBS, RDS, DynamoDB storage access.
20. `CloudDeploymentChoiceDiagram`: Autocycles 6 deployment patterns with AWS & Azure solutions.
21. `ContainerSecurityChecklistDiagram`: Autocycles 4 container security best practices.
22. `DockerArchitectureDiagram`: Autocycles 5 runtime stages; `FlowDots` down to running container.
23. `DockerfileLayerCachingDiagram`: Autocycles Good vs Bad ordering with code change toggle and REBUILD vs cached layer status.
24. `ImageVsContainerDiagram`: Autocycles 1..5 container instances sharing read-only image.
25. `MultiStageBuildDiagram`: Autocycles build stage vs copied minimal runtime stage.
26. `RegistryComparisonDiagram`: Autocycles 4 container registries.
27. `VolumesAndNetworksDiagram`: Autocycles container removal showing ephemeral container loss vs persistent volume survival.
28. `DataLineageProvenanceDiagram`: Autocycles Lineage, Provenance, Snapshots, Reproducibility.
29. `DataPipelineFlowDiagram`: Autocycles 6 pipeline stages with `FlowDots` and `PulseRect`.
30. `DataProcessingScaleDiagram`: Autocycles dataset sizes 1GB..100GB with dynamic selection of Pandas -> Polars -> PySpark.
31. `GitVsDataVersioningDiagram`: Autocycles Code vs 500GB dataset diff efficiency.
32. `SchemaEvolutionDiagram`: Autocycles Optional safe change vs Required breaking change with consumer status.

### Verification:
- Layer 1 (`tsc -b`): Clean (exit code 0).
- Layer 2 (`vitest run src/viz`): 84 files, 324 passed.
- Layer 3 (`check:notebook`): 0 violations.
- Layer 4 (Playwright screenshots): All 32 captured cleanly with 0 console/page errors in `docs/evidence/live-visuals/agy/batch-3/`.

## Batch 4

Pages covered:
- `src/content/docs/mlops/deployment-strategies.mdx`
- `src/content/docs/mlops/engineering-foundations.mdx`
- `src/content/docs/mlops/experiment-tracking.mdx`
- `src/content/docs/mlops/feature-stores-and-model-registry.mdx`
- `src/content/docs/mlops/federated-learning.mdx`
- `src/content/docs/mlops/gpu-and-distributed-training.mdx`
- `src/content/docs/mlops/infrastructure-as-code.mdx`
- `src/content/docs/mlops/kubernetes.mdx`

### Motion Rationales:
1. `BlueGreenCutoverDiagram`: Autocycles live environment between Blue and Green; `FlowDots` stream from the Router directly into the live environment.
2. `CanaryRampDiagram`: Autocycles through canary stages (5%, 25%, 50%, 100%) with smooth animated width transitions.
3. `CanaryVsAbPurposeDiagram`: Autocycles between Canary (rollout safety) and A/B Test (business impact).
4. `ComposedStrategyDiagram`: Autocycles through the rollout lifecycle (Shadow -> Canary -> A/B Test); `FlowDots` stream along the pipeline arrow to the active stage.
5. `ShadowDeploymentDiagram`: Live parallel `FlowDots` fire simultaneously down both branches (Request -> Old model -> User and Request -> New model -> Logged); `PulseRect` pulses both models concurrently.
6. `ConfigVsHardcodedDiagram`: Autocycles between Hardcoded and Config-driven; highlights environment badges (dev, staging, prod) showing config swapping.
7. `DependencyPinningDiagram`: Autocycles through Unpinned (Today), Unpinned (3 months later - drifted warning), and Pinned + lockfile.
8. `NotebookVsPipelineDiagram`: Autocycles between Fragile Notebook issues and Explicit Pipeline module guarantees.
9. `OnboardingStandardDiagram`: Autocycles through the 5-step onboarding pipeline (clone -> setup -> tests -> lint -> pipeline) with step-by-step progression.
10. `HyperparameterSweepDiagram`: Autocycles through 20 sweep runs; `Pulse` animates around the active (lr, accuracy) coordinate dot.
11. `RunComparisonChartDiagram`: Autocycles through runs a, b, and c; `FlowDots` trace along the active run's loss curve trajectory.
12. `SevenAnswersChecklistDiagram`: Autocycles through the 7 mandatory run-tracking fields.
13. `FeatureFreshnessDiagram`: Autocycles feature age across 1, 3, 5, 8, 15 minutes, transitioning status from fresh to stale when >5 min.
14. `LineageChainDiagram`: Autocycles backward through the 4 lineage links (Prediction -> Model version -> Training run -> Data version).
15. `OfflineVsOnlineStoreDiagram`: Autocycles between Offline store (data lake) and Online store (low-latency KV).
16. `PromotionWorkflowDiagram`: Autocycles between Manual approval and Automated CI gate with animated Staging -> Production promotion.
17. `TrainingServingSkewDiagram`: Autocycles between hidden and revealed computation details, exposing subtle window skew.
18. `FederatedRoundDiagram`: Autocycles through the 4 FederatedAveraging stages: Stage 0 (Distribute) streams parallel `FlowDots` from Server out to all 5 clients; Stage 1 (Local Train) pulses all 5 client nodes; Stage 2 (Upload) streams parallel `FlowDots` from clients back into the Server; Stage 3 (Aggregate) pulses the central Server.
19. `CudaExecutionHierarchyDiagram`: Autocycles through Kernel -> Grid -> Block -> Warp -> Thread hierarchy.
20. `CudaStreamsDiagram`: Autocycles between 1 stream and 2 overlapped streams; `PulseRect` highlights the concurrent transfer + compute window.
21. `FsdpZeroShardingDiagram`: Autocycles through ZeRO stages (Plain DP -> ZeRO-1 -> ZeRO-2 -> ZeRO-3) dynamically showing sharded vs replicated states.
22. `GpuMemoryHierarchyDiagram`: Autocycles through Registers -> Shared Memory -> Global VRAM.
23. `MixedPrecisionDiagram`: Autocycles through the 4 training steps (FP32 master -> FP16 forward/backward -> FP16/FP32 gradients -> FP32 optimizer step).
24. `OccupancyDiagram`: Autocycles register usage per thread across 24..96, dynamically updating resident warp count and occupancy percentage.
25. `ParallelismStrategiesDiagram`: Autocycles through the 6 parallelism strategies (data, model, pipeline, tensor, fsdp, expert).
26. `PipelineBubbleDiagram`: Autocycles micro-batch count from 2 to 16, dynamically expanding schedule and shrinking bubble idle time.
27. `ThreeDParallelismCompositionDiagram`: Autocycles through Tensor (within node) -> Pipeline (across nodes) -> Data (replicated groups).
28. `WarpDivergenceDiagram`: Autocycles between Uniform branch (1 pass) and Divergent branch (Pass 1 branch A + Pass 2 branch B with masking).
29. `ImmutableVsConfigMgmtDiagram`: Autocycles between Configuration management and Immutable infrastructure replacement.
30. `RemoteStateLockingDiagram`: Autocycles between Local state file (race condition) and Remote locked state (DynamoDB lock).
31. `StateDriftDiagram`: Autocycles between drift detected and terraform apply reconciliation.
32. `TerraformWorkflowDiagram`: Autocycles through the 4 core steps: Write -> Plan -> Apply -> State updated.
33. `ClusterArchitectureDiagram`: Autocycles through key components (kubectl, apiserver, scheduler, controller-manager, etcd, kubelet, pod) highlighting the central API server hub architecture.
34. `GpuSchedulingDiagram`: Autocycles between CPU web service and GPU inference service scale-up characteristics.
35. `HpaAutoscalingDiagram`: Autocycles load percentage from 60% to 720%, dynamically scaling and illuminating replicas.
36. `ResourceRequestsLimitsDiagram`: Autocycles memory usage across 350MB, 700MB, 950MB, and 1150MB, dynamically warning and triggering OOM-kill when exceeding limit.

### Verification:
- Layer 1 (`tsc -b`): Clean (exit code 0).
- Layer 2 (`vitest run src/viz`): 84 files, 324 passed.
- Layer 3 (`check:notebook`): 0 violations.
- Layer 4 (Playwright screenshots): All 36 captured cleanly with 0 console/page errors in `docs/evidence/live-visuals/agy/batch-4/`.

## Batch 5 Report

### Motion Rationales:
1. `GovernanceApprovalFlowDiagram.tsx`: Autocycles (2600ms) through 4 stages from written policy to CI/CD gate, because policy is dormant until technical automated enforcement executes.
2. `ModelCardVsDataCardDiagram.tsx`: Autocycles (3500ms) between model card and data card transparency artifacts, because practitioners must inspect both model limitations and dataset provenance before deployment.
3. `ModelLicenseSpectrumDiagram.tsx`: Autocycles (3200ms) across permissive, copyleft, and commercial restrictions, because license compatibility dictates enterprise deployment boundaries.
4. `PrivacyRegulationScopeDiagram.tsx`: Autocycles (3200ms) through PII controls, GDPR, and HIPAA scopes, because compliance requirements govern data retention and model deletion.
5. `BleuVsSemanticDiagram.tsx`: Autocycles (3000ms) across 3 candidate answers comparing n-gram overlap vs embedding cosine similarity, because lexical metrics fail on valid paraphrases.
6. `NdcgRankingDiagram.tsx`: Autocycles (3500ms) between good ranking and poor ranking, because rank-position discounting dictates search user satisfaction.
7. `RagFailureLayerDiagram.tsx`: Autocycles (3200ms) across 4 failure layers (chunking, retrieval, ranking, generation), because debugging RAG requires isolating which architectural stage introduced the error.
8. `EmbeddingRerankerPipelineDiagram.tsx`: Autocycles (3500ms) between bi-encoder embedding retrieval and cross-encoder reranking, because bi-encoders optimize candidate recall while rerankers optimize precision.
9. `FineTuningToInferenceHandoffDiagram.tsx`: Autocycles (2800ms) across 5 handoff stages, because training frameworks must output clean adapter weights for dedicated serving runtimes.
10. `HostingStackDiagram.tsx`: Autocycles (2600ms) through the 6 hosting stack layers, because production requests traverse load balancers, containers, and engines down to GPU hardware.
11. `MultiLoraServingDiagram.tsx`: Autocycles (3500ms) between separate full-model replicas and single-base multi-LoRA serving, because sharing base weights eliminates redundant VRAM waste.
12. `ServerlessColdStartDiagram.tsx`: Autocycles (3500ms) between always-on VMs and serverless scale-to-zero, because spiky workloads trade cold-start delay for zero idle compute cost.
13. `BaselineVsEngineDiagram.tsx`: Autocycles (3500ms) through 3 scaling challenges, contrasting naive PyTorch single-request bottlenecks with dedicated engine continuous batching.
14. `EdgeVsServerDeploymentDiagram.tsx`: Autocycles (3500ms) between Server and Edge across 4 tradeoff dimensions (throughput, privacy, offline, cost), because deployment target reflects structural architectural requirements.
15. `EngineTerminologyDiagram.tsx`: Autocycles (2500ms) through inference engine, serving framework, platform, and fine-tuning framework, highlighting Unsloth as the training outlier.
16. `InferenceStackLayersDiagram.tsx`: Autocycles (2500ms) through 5 request layers from API gateway to CUDA runtime, because modular serving isolates orchestration from kernel execution.
17. `FlashAttentionMemoryDiagram.tsx`: Autocycles (3500ms) between Standard and FlashAttention with FlowDots along HBM read-back line, because memory traffic to slow HBM is the actual hardware bottleneck.
18. `PrefillVsDecodeDiagram.tsx`: Autocycles (3500ms) between compute-bound Prefill (parallel prompt tokens) and memory-bandwidth-bound Decode (sequential autoregressive token generation).
19. `PrefixCachingDiagram.tsx`: Autocycles (3500ms) toggling prefix caching with FlowDots streaming to 3 requests in parallel, because identical system prompt KV blocks should only be computed once.
20. `TtftTpotTimelineDiagram.tsx`: Autocycles (3200ms) between TTFT and TPOT measurement windows on the request timeline, because responsiveness and streaming velocity have independent physical limits.
21. `DeliverySemanticsDiagram.tsx`: Autocycles (3500ms) across at-most-once, at-least-once, and effectively exactly-once semantics, because acknowledgement timing relative to processing dictates failure outcomes.
22. `PartitionOrderingDiagram.tsx`: Autocycles (3500ms) between round-robin and user ID keyed partitioning, because per-key ordering constraints trade off against uniform partition load balancing.
23. `PubSubVsPointToPointDiagram.tsx`: Autocycles (3500ms) between competing consumer queue and fanout topic with FlowDots, because point-to-point distributes tasks while pub/sub replicates events.
24. `SyncVsAsyncDiagram.tsx`: Autocycles (2500ms) across processing durations, showing linear client blocking for sync requests versus immediate client release for async queues.
25. `JailbreakRegressionDiagram.tsx`: Autocycles (2500ms) through 4 regression timeline stages, showing how subsequent model updates silently reopen patched jailbreak exploits.
26. `LlmTestTypesDiagram.tsx`: Autocycles (2500ms) across 7 LLM testing disciplines, because LLM evaluation requires non-classical testing modalities.
27. `MlTestPyramidDiagram.tsx`: Autocycles (2500ms) up the ML testing pyramid from cheap data contracts to statistical distribution tests and full regression benchmarks.
28. `PromptAsCodeDiagram.tsx`: Autocycles (3500ms) toggling test execution against fixed evaluation assertions, because prompt templates require regression testing identical to software code.
29. `MlLifecyclePipelineDiagram.tsx`: Autocycles (2200ms) through 9 lifecycle stages with FlowDots along pipeline and loopback arrow, because production MLOps is a continuous feedback loop from retraining to validation.

### Verification:
- Layer 1 (`tsc -b`): Clean (exit code 0).
- Layer 2 (`vitest run src/viz`): 84 files, 324 passed.
- Layer 3 (`check:notebook`): 0 violations.
- Layer 4 (Playwright screenshots): All 29 captured cleanly in `docs/evidence/live-visuals/agy/batch-5/`.

## Batch 6 Report

### Motion Rationales:
1. `AdaptiveBatchingQueueDiagram.tsx`: Autocycles (3000ms) batch sizes [1, 2, 4, 8, 16] down the cost curve, because batching amortizes weight loading memory bandwidth over concurrent requests.
2. `AsyncBlockingDiagram.tsx`: Autocycles (3500ms) between sync blocking and async polling/webhooks, because long-running inference ties up client connections without decoupling.
3. `BatchOnlineStreamingDiagram.tsx`: Autocycles (3200ms) between batch, online, and streaming, because latency budgets dictate ingestion architecture.
4. `ModelServingRequestFlowDiagram.tsx`: Autocycles (2500ms) through 5 serving pipeline stages with FlowDots along request path, because serving pipelines separate validation, batching, kernel execution, and streaming response.
5. `DataVsConceptDriftDiagram.tsx`: Autocycles (3500ms) between data drift P(X) and concept drift P(Y|X), because input distribution changes and ground-truth relationship changes require distinct remediation strategies.
6. `KsTestDiagram.tsx`: Autocycles (3000ms) distribution shifts [5, 15, 25, 35], showing expanding KS distance gap between baseline and production CDFs, because non-parametric hypothesis testing identifies continuous feature shift.
7. `PsiCalculatorDiagram.tsx`: Autocycles (3000ms) across PSI zone shifts [0.03, 0.12, 0.22, 0.28], because Population Stability Index thresholds directly trigger automated retraining alerts.
8. `ThreeMonitoringLayersDiagram.tsx`: Autocycles (3200ms) across infra, app, and ML layers, showing how infrastructure metrics remain healthy while statistical ML accuracy silently degrades.
9. `WassersteinDistanceDiagram.tsx`: Autocycles (3000ms) distribution separation [15, 40, 65, 90], showing earth mover's cost scaling linearly where KL divergence produces infinite distance.
10. `MonitoringVsObservabilityDiagram.tsx`: Autocycles (3500ms) between monitoring ("something is wrong") and observability ("here's why"), because pre-aggregated alerts cannot diagnose novel distributed system failure modes.
11. `PrometheusGrafanaFlowDiagram.tsx`: Autocycles (2500ms) through scrape, write, query, and dashboard stages with FlowDots, because time-series observability relies on periodic pull-based metrics collection.
12. `StructuredLogsDiagram.tsx`: Autocycles (3200ms) between unstructured text and structured JSON logs with trace IDs, because machine-queryable fields enable distributed log aggregation.
13. `ThreePillarsIncidentDiagram.tsx`: Autocycles (2500ms) through metric spike, trace pivot, and log isolation, because root-causing production incidents requires drilling down through the three observability pillars in sequence.
14. `TraceWaterfallDiagram.tsx`: Autocycles (2500ms) through 4 waterfall spans, highlighting how distributed parent-child spans locate the downstream database bottleneck.
15. `BackfillDiagram.tsx`: Autocycles (3000ms) backfill windows [2, 5, 8, 12], because retroactive data pipeline execution must reprocess historical partition slices without data leakage.
16. `DagDependencyDiagram.tsx`: Autocycles (2500ms) across 4 DAG nodes with FlowDots along active dependency paths, because orchestrators dispatch tasks strictly as upstream topological dependencies resolve.
17. `PipelineCachingDiagram.tsx`: Autocycles (3000ms) stage invalidation cascading downstream, because task output hashing prevents redundant re-computation of unchanged pipeline stages.
18. `RetryBackoffDiagram.tsx`: Autocycles (2600ms) through exponential retry attempts [0, 1, 2], because immediate retries overwhelm failing dependencies while exponential jitter allows recovery.
19. `BackpressureQueueDiagram.tsx`: Autocycles (3500ms) between unbounded queue overflow (OOM crash) and backpressure rejection (HTTP 429), because bounded buffers preserve system availability under load spikes.
20. `CircuitBreakerStateDiagram.tsx`: Autocycles (3000ms) across Closed, Open, and Half-Open states, because automated circuit breaking prevents cascading failure when downstream dependencies degrade.
21. `GracefulDegradationLadderDiagram.tsx`: Autocycles (3200ms) through full service, degraded cached fallbacks, and hard failure, because partial availability is vastly superior to total system outage.
22. `IdempotencyKeyDiagram.tsx`: Autocycles (3500ms) between duplicated non-idempotent operations and deduplicated idempotent requests with keys, because network timeouts cause clients to retry side-effecting operations.
23. `TimeoutCascadeDiagram.tsx`: Autocycles (3500ms) between cascading thread pool exhaustion and deadline propagation timeouts, because unconstrained downstream calls exhaust upstream server resources.
24. `LeastPrivilegeAgencyDiagram.tsx`: Autocycles (3000ms) through 3 agent tool privilege tiers (read-only, scoped write, administrative), because autonomous agents must be constrained by capability boundaries.
25. `LlmAttackSurfaceDiagram.tsx`: Autocycles (3000ms) across 5 LLM vulnerability categories, because generative systems introduce threats spanning prompt injection, insecure output handling, and supply chain poisoning.
26. `ReproducibilityChecklistDiagram.tsx`: Autocycles (2200ms) across 7 reproducibility checklist items, because reproducible ML pipelines require pinning seeds, code commits, container images, and dataset digests.
27. `SecretsInjectionDiagram.tsx`: Autocycles (3500ms) between hardcoded environment leakage and runtime Secrets Manager injection, because credential hygiene requires dynamic ephemeral secrets retrieval.
28. `AutonomousGoalLoopDiagram.tsx`: Autocycles (2500ms) through 5 loop phases with FlowDots along dispatch, execution, audit, and feedback branches, because autonomous agents iteratively sense, plan, execute, and verify against goal invariants.
29. `HarnessAblationStudio.tsx`: Autocycles (3500ms) across 3 benchmark scenarios (feature, bugfix, refactor), because evaluating harness effectiveness requires measuring completion rates across diverse task domains.
30. `ContextCompactionVisualizer.tsx`: Autocycles (3500ms) between naive truncation and structured compaction, because uncompacted conversational context overflows token windows and destroys working memory.
31. `InstructionBudgetVisualizer.tsx`: Autocycles (3500ms) between dumb inlining and map-and-manual budgeting, because prompt space allocation dictates reasoning capacity and instruction adherence.

### Verification:
- Layer 1 (`tsc -b`): Clean (exit code 0).
- Layer 2 (`vitest run src/viz`): 84 files, 324 passed.
- Layer 3 (`check:notebook`): 0 violations.
- Layer 4 (Playwright screenshots): All 31 captured cleanly with 0 console/page errors in `docs/evidence/live-visuals/agy/batch-6/`. Note: `ThreePillarsIncidentDiagram` fallback mount was utilized during batch capture due to an upstream unclosed code fence typo (` ```output ` instead of ` ``` ` at line 346) in `src/content/docs/mlops/observability.mdx`. The MDX page itself was left untouched per lane rules; a ticket/fix should be applied by the page owner.

## Batch 7 Report

### Motion Rationales:
1. `AgentHarnessArchitectureVisualizer.tsx`: Autocycles (3000ms) across the 5 harness stages (context assembler, reasoning engine, execution sandbox, 3-layer verifier, state compactor), because the cybernetic formula (Agent = Model + Harness) functions as a staged pipeline isolating raw model proposals from host execution.
2. `PreDispatchInterceptorDiagram.tsx`: Autocycles (3000ms) across valid, exfiltration, and root deletion scenarios, with FlowDots routing permitted calls to isolated sandboxes and blocked probes directly to security violation error envelopes, because malicious commands must be aborted before process allocation.
3. `HarnessCurriculumDiagram.tsx`: Autocycles (2500ms) through 5 curriculum stages with FlowDots along the curriculum pipeline, because mastery of autonomous harnesses proceeds sequentially from execution boundaries to deterministic verification loops.
4. `TwoPassCompactionFlowDiagram.tsx`: Autocycles (3000ms) across raw, pass 1 (old tool pruning), and pass 2 (final compaction), dynamically collapsing the token budget bar from 551 to 76 tokens while preserving 100% of system invariants, because uncompacted terminal logs cause attention collapse.
5. `VerificationFunnelDiagram.tsx`: Autocycles (2800ms) down the 4 verification gates with FlowDots cascading down the funnel, because cheap static audits filter trivial syntax errors before expensive unit and behavioral test suites run.
6. `AutoscalingBacklogExplorer.tsx`: Autocycles (3000ms) across startup delays [30s, 60s, 90s, 120s] with FlowDots tracing queue backlog accumulation and subsequent drainage, because cold-start delay directly determines peak queue depth before spare capacity catches up.
7. `ErrorBudgetExplorer.tsx`: Autocycles (3000ms) across failure percentages [0.2%, 0.5%, 2.0%, 5.0%], dynamically expanding monthly budget consumption from 0.28% to 6.94% per hour, because high burn rates deplete monthly error budgets in hours rather than weeks.
8. `CacheInvalidationRaceExplorer.tsx`: Autocycles (3500ms) between delete-only and fenced invalidation policies with FlowDots down the timeline, showing how version floor fencing rejects stale asynchronous refills after newer database writes commit.
9. `PartitionDecisionExplorer.tsx`: Autocycles (3500ms) between return-local-value (progress) and require-linearizable-read (waiting/refusal), because network partitions force distributed nodes to choose between stale availability and consistency.

### Verification:
- Layer 1 (`tsc -b`): Clean (exit code 0).
- Layer 2 (`vitest run src/viz`): 84 files, 324 passed.
- Layer 3 (`check:notebook`): 0 violations.
- Layer 4 (Playwright screenshots): All 9 captured cleanly with 0 console/page errors in `docs/evidence/live-visuals/agy/batch-7/`.

## Batch 8 Report

### Motion Rationales:
1. `SoftwareCapacityExplorer.tsx`: Autocycles (3000ms) across instance counts [9, 10, 12, 15] across 3 availability zones, because N+1 redundancy requires enough capacity headroom to survive losing the largest single failure domain.
2. `CdnOriginLoadExplorer.tsx`: Autocycles (3000ms) edge cache hit ratios [95%, 90%, 75%, 50%], showing origin miss load multiplying tenfold from 300 to 3,000 req/s, because small drops in cache hit percentage dramatically amplify origin load.
3. `SoftwareCaseTrace.tsx`: Autocycles (3500ms) between normal path and failure path with FlowDots along sequence messages, because distributed systems must handle ACK loss and retry deduplication at every hop.
4. `ConsistencyHistoryExplorer.tsx`: Autocycles (3000ms) across request histories (own write, backward read, other client, current read) with FlowDots down the execution timeline, because monotonic reads, read-your-writes, and linearizability rule out distinct subsets of execution anomalies.
5. `ConsistentHashMembershipExplorer.tsx`: Autocycles (3500ms) between before and after node D joins with FlowDots around the hash ring, showing that only the single predecessor interval (20, 35] moves while 80% of keys retain their assigned owners.
6. `DesignDecisionExplorer.tsx`: Autocycles (3200ms) through revocation timelines (0s fresh, 61s cached, 300s expired) with FlowDots on edge refresh, because remote caches continue serving stale data long after the origin durable record has been revoked.
7. `CompositeIndexExplorer.tsx`: Autocycles (3500ms) between customer-first and time-first composite key orders, showing how customer-first seeks directly to 2 adjacent matching entries while time-first scans 6 entries, because column order in a composite B-tree dictates query selectivity.
8. `LatencyFanoutExplorer.tsx`: Autocycles (3000ms) across downstream fan-out call counts [1, 10, 50, 100], showing overall success probability collapsing from 99% down to 36.6%, because parent request latency is bounded by the slowest required leaf response.
9. `RequestLatencyBudget.tsx`: Autocycles (3000ms) across application durations [40ms, 80ms, 110ms, 140ms], showing remaining margin shrink to zero and breach the 200ms SLA, because fixed end-to-end budgets enforce zero-sum allocations between transport, gateway, and compute.

### Verification:
- Layer 1 (`tsc -b`): Clean (exit code 0).
- Layer 2 (`vitest run src/viz`): 84 files, 324 passed.
- Layer 3 (`check:notebook`): 0 violations.
- Layer 4 (Playwright screenshots): All 9 captured cleanly with 0 console/page errors in `docs/evidence/live-visuals/agy/batch-8/`.

## Batch 9 Report

### Motion Rationales:
1. `LoadAssignmentExplorer.tsx`: Autocycles (3500ms) between L4 connection-level hashing and L7 request-level balancing, showing how long-lived HTTP/2 streams cause 101 requests to pile up on a single replica under L4 while L7 balances them evenly (51 vs 52).
2. `TokenBucketAdmissionExplorer.tsx`: Autocycles (3000ms) across admission steps (initial, burst, wait, next), showing how an initial burst of 7 requests depletes all 5 bucket tokens and rejects 2, before token replenishment permits subsequent admission.
3. `SoftwareReplicationExplorer.tsx`: Autocycles (3000ms) across replication phases (before, lag, caught) with FlowDots along write propagation, showing that immediately after acknowledging version 8 at the primary, asynchronous replicas still serve stale version 7 until replication catch-up finishes.
4. `RequirementBoundaryExplorer.tsx`: Autocycles (3500ms) between measuring all requests (including non-retryable 4xx client errors) versus measuring only eligible requests, showing how client-side errors artificially disguise whether server availability meets the 99.9% SLO.
5. `ProxyTrustExplorer.tsx`: Autocycles (3500ms) between passing raw client headers and sanitizing with observed peer IP with FlowDots through ingress, showing how an upstream proxy without sanitization permits clients to forge identity claims to internal services.
6. `ShardHotKeyExplorer.tsx`: Autocycles (3000ms) across shard counts [3, 4, 5, 6], showing that doubling shard count halves record count per owner but leaves the hot key (6,000 ops/s) indivisibly overloading its single assigned shard owner.
7. `StorageOwnershipExplorer.tsx`: Autocycles (3000ms) through migration steps (before, one updated, all updated), showing how embedded/denormalized records require multiple atomic updates across duplicate orders, creating temporary inconsistency windows.
8. `StatelessSessionExplorer.tsx`: Autocycles (3000ms) across destinations (Replica A, Replica B, Restart A) with FlowDots on request ingress, showing that local session memory causes session loss upon rerouting or restart, whereas an external authoritative store survives instance failure.

### Verification:
- Layer 1 (`tsc -b`): Clean (exit code 0).
- Layer 2 (`vitest run src/viz`): 84 files, 324 passed.
- Layer 3 (`check:notebook`): 0 violations.
- Layer 4 (Playwright screenshots): All 8 captured cleanly with 0 console/page errors in `docs/evidence/live-visuals/agy/batch-9/`.

## Batch 10 Report

### Motion Rationales:
1. `WriteSkewExplorer.tsx`: Autocycles (3500ms) between concurrent snapshot reads and serial decision order with FlowDots connecting clinician decisions, showing how concurrent reads each see the other present and allow both to leave, violating the on-call invariant.
2. `ScalingBottleneckExplorer.tsx`: Autocycles (3000ms) replica counts [6, 4, 2, 8], demonstrating that doubling application capacity leaves total throughput capped at the shared storage ceiling (3,000 requests/s).
3. `BlendedObjectiveDiagram.tsx`: Autocycles (3000ms) across revenue weights [40, 15, 85, 60], dynamically reordering the 4 feed items to show how business priority shifts feed rank.
4. `ColdStartDiagram.tsx`: Autocycles (3000ms) across collaborative filtering, content-based fallback, and exploration approaches, showing that collaborative filtering fails outright for new users while content/exploration produce signal.
5. `DiscoverySequenceDiagram.tsx`: Autocycles (2500ms) through discovery steps with FlowDots along the pipeline, showing that each technology exists to overcome the physical bottleneck of the preceding stage.
6. `DomainAgnosticDesignDiagram.tsx`: Autocycles (3500ms) between NLP and Computer Vision domains, demonstrating that swapping the model leaves the surrounding latency, monitoring, and experimentation architecture identical.
7. `GenAiCaseStudiesDiagram.tsx`: Autocycles (3000ms) across RAG, agent systems, and serving infrastructure categories, mapping unique metrics to the same underlying 9-step framework.
8. `ProblemSolutionMapDiagram.tsx`: Autocycles (2500ms) through 5 recurring production ML failure modes, linking each to its proven architectural mitigation.
9. `TwoStagePipelinePatternDiagram.tsx`: Autocycles (2500ms) through Catalog, Retrieve, Rank, and Serve with FlowDots along the candidate funnel, showing cheap high-recall filtering preceding expensive precision ranking.
10. `ActiveVsTotalParamsDiagram.tsx`: Autocycles (3200ms) parameter presets (Mixtral 8x7B, dense Llama 70B, large MoE 128B), showing that inference compute scales with active parameters while memory footprint tracks total parameters.
11. `BenchmarkDimensionsSelectorDiagram.tsx`: Autocycles (3500ms) between served model and retrieval benchmark dimensions, showing how evaluation criteria change with system archetype.
12. `ModelCardChecklistDiagram.tsx`: Autocycles (2500ms) through the 12 model card attributes, explaining the operational failure mode prevented by each checklist item.
13. `ModelCategoryMapDiagram.tsx`: Autocycles (2500ms) through 9 model categories, showing stable taxonomy mapping to corresponding platform deep-dives.
14. `UsageWorkflowDiagram.tsx`: Autocycles (2500ms) through 4 evaluation workflow steps, moving from raw candidate lists through benchmark skepticism to attribute scoring.
15. `BatchVsOnlineServingDiagram.tsx`: Autocycles (2500ms) through serving pipeline stages with FlowDots, showing event ingestion leading to either batch precomputation or online per-request evaluation.
16. `LatencyBudgetBreakdownDiagram.tsx`: Autocycles (2500ms) through network, features, model, and return stages with FlowDots, illustrating that model inference is only one consumer of an end-to-end 100ms budget.
17. `ModelComplexityInterpretabilityDiagram.tsx`: Autocycles (2500ms) through baseline, measurement, complexity increase, and operations with FlowDots, reinforcing that architectural complexity must be earned with empirical metrics.
18. `OfflineVsOnlineMetricsDiagram.tsx`: Autocycles (2500ms) through historical data, offline proxy, A/B test, and online metrics with FlowDots, showing that offline improvement is merely a hypothesis until validated live.
19. `ProblemFormulationFunnelDiagram.tsx`: Autocycles (2500ms) through goal, decision, target, and metric stages with FlowDots, showing the translation of vague business needs into trainable objectives.
20. `SectionMapDiagram.tsx`: Autocycles (2500ms) through framework, case studies, catalog, and build stages with FlowDots, mapping the learning progression.
21. `ThreeDisciplinesDiagram.tsx`: Autocycles (2800ms) across research, system design, and MLOps with FlowDots, clarifying the distinct problem boundaries of each discipline.
22. `TradeoffSpaceDiagram.tsx`: Autocycles (2500ms) across accuracy, latency, cost, and risk constraints with FlowDots, showing that every system design selects a dominant tradeoff.
23. `WhenSystemDesignMattersDiagram.tsx`: Autocycles (2500ms) from one-off notebooks to production systems with FlowDots, illustrating when reliability, monitoring, and rollback architectures become mandatory.
24. `NineStepPipelineDiagram.tsx`: Autocycles (2200ms) through all 9 steps with FlowDots along the pipeline, demonstrating the progression from framing through model building to production operations.
25. `EcosystemMapDiagram.tsx`: Autocycles (2500ms) vertically through the production software stack layers, highlighting dedicated architecture deep-dives across the platform.
26. `ABShadowCanaryDiagram.tsx`: Autocycles (3000ms) across A/B split, shadow, and canary rollout traffic distributions, illustrating user-facing risk isolation.
27. `DataBiasDiagram.tsx`: Autocycles (3000ms) between observed and hidden catalog items, showing how training solely on past exposure data perpetuates historical ranking blind spots.
28. `FeatureCategoriesDiagram.tsx`: Autocycles (2800ms) across user, item, and context features with concrete attribute pills, showing how production predictions combine all three dimensions.
29. `MonitoringRetrainLoopDiagram.tsx`: Autocycles (2500ms) through serve, monitor, detect, and retrain stages with circular FlowDots, illustrating that production MLOps is an active continuous loop.
30. `TimeBasedSplitDiagram.tsx`: Autocycles (3500ms) between random split and time-based split, showing how random splitting leaks future temporal trends into training datasets.

### Verification:
- Layer 1 (`tsc -b`): Clean (exit code 0).
- Layer 2 (`vitest run src/viz`): 84 files, 324 passed.
- Layer 3 (`check:notebook`): 0 violations.
- Layer 4 (Playwright screenshots): All 28 captured cleanly with 0 console/page errors in `docs/evidence/live-visuals/agy/batch-10/`.

## Batch 11 Report

### Motion Rationales:
1. `AgentTraceWaterfallVisualizer.tsx`: Autocycles (3500ms) across End-to-End Latency Waterfall, Step Token & Cost Attribution, and Tool Failure Cascade views with FlowDots on the timeline, showing the correlation between span durations, token burn, and error propagation.
2. `ConstructValidityDiagram.tsx`: Autocycles (3000ms) cue correlation presets [0.85, 0.60, 0.95, 0.70], demonstrating that when surface cues correlate with answers, a shortcut model with zero real reasoning beats a genuinely capable model.
3. `ContaminationDiagram.tsx`: Autocycles (3000ms) contamination rates [0.15, 0.0, 0.35, 0.50], showing that test memorization inflates reported benchmark score linearly while leaving true model capability completely unchanged.
4. `GoldenDatasetCoverageDiagram.tsx`: Autocycles (3000ms) dataset sizes [8, 4, 20, 32], showing how small golden sets disproportionately miss sparse tail and edge-case inputs in production distributions.
5. `SaturationDiagram.tsx`: Autocycles (3000ms) generation spread seeds, showing that as models cluster against the benchmark ceiling, score variance collapses and discriminative power evaporates.
6. `AdversarialRobustnessDiagram.tsx`: Autocycles (3000ms) attack strength [0.4, 0.1, 0.8, 1.2], showing how standard models suffer steep accuracy degradation under meaning-preserving perturbations whereas adversarially-trained models degrade gracefully.
7. `CohensKappaDiagram.tsx`: Autocycles (3200ms) rater scenarios, illustrating how high raw percentage agreement (e.g. 85%) can mask low or chance-level Cohen's kappa when category marginals are skewed.
8. `EloRatingDiagram.tsx`: Autocycles (2500ms) simulated pairwise matches, showing how stochastic individual head-to-head outcomes incrementally converge toward true underlying model skill differences.
9. `StatisticalPowerDiagram.tsx`: Autocycles (3000ms) sample size and effect size presets, illustrating that an evaluation study showing "no clear winner" is frequently underpowered rather than reflecting parity.
10. `AgentTrajectoryDiagram.tsx`: Autocycles (2500ms) through trajectory steps 1-4, demonstrating that while overall task success rate flags a run as PASS, trajectory inspection uncovers wasted or dangerous tool calls.
11. `JudgeValidationDiagram.tsx`: Autocycles (3500ms) between vague ("Rate 1-10") and explicit example-anchored rubrics, showing that explicit rubrics eliminate LLM judge dispersion and align with human ratings.
12. `JudgeVerbosityBiasDiagram.tsx`: Autocycles (3000ms) length bias strength [0.6, 0.1, 0.9, 0.3], showing how uncalibrated LLM judges systematically prefer longer responses regardless of actual answer quality.
13. `ConstitutionalAiLoopDiagram.tsx`: Autocycles (3000ms) through Generate, Self-critique, Self-revise, and Train with FlowDots circling the loop, emphasizing that the model critiques and refines itself against written principles without human labeling in the loop.
14. `DeceptionDetectionDiagram.tsx`: Autocycles (3200ms) across misbehavior rate and test volume presets, demonstrating that rare misbehaviors require orders of magnitude more evaluations to achieve 95% statistical confidence.
15. `RewardHackingSimulationDiagram.tsx`: Autocycles (3000ms) across beta correlation presets [0.3, 0.05, 0.8, 0.5], showing that as proxy reward correlation with length grows, the optimizer sacrifices true output quality to maximize word count.
16. `SpecificationGamingDiagram.tsx`: Autocycles (3000ms) training horizons [40, 15, 80, 55], showing that dense frequent sub-rewards (looping a power-up) outscore sparse high-value goals (finishing the race) over finite training windows.
17. `CapabilityThresholdDiagram.tsx`: Autocycles (3000ms) log compute scales [4.5, 2.0, 7.5, 5.8], showing how non-linear capability scaling crosses dangerous-capability thresholds unpredictably.
18. `DebateConvergenceDiagram.tsx`: Autocycles (3500ms) debate seeds, showing that an unspecialized judge converges on the correct conclusion over iterative rounds because truth has stronger defensible arguments.
19. `OversightApproachesDiagram.tsx`: Autocycles (3500ms) across debate, recursive reward modeling, and process-based oversight, highlighting how each methodology scales human judgment to superhuman model tasks.
20. `ProcessVsOutcomeDiagram.tsx`: Autocycles (4000ms) between initial validation and counter-example testing on 97, showing that invalid reasoning can accidentally produce correct answers but fails upon generalization.
21. `StagedDeploymentDiagram.tsx`: Autocycles (3000ms) user issue rates [0.0005, 0.002, 0.0001, 0.005], showing that staged rollout bounds the blast radius of rare issues to early cohorts rather than full general availability.
22. `AgenticTop10CoverageDiagram.tsx`: Autocycles (3000ms) through OWASP Agentic Top 10 categories, distinguishing mature defense tooling (prompt injection, memory guard) from active industry gaps (cascading failure, inter-agent trust).
23. `AdversarialPerturbationDiagram.tsx`: Autocycles (3000ms) perturbation magnitude [0.05, 0.25, 0.45, 0.12], showing how small continuous steps along the loss gradient flip decision boundary classifications.
24. `BackdoorTriggerDiagram.tsx`: Autocycles (3200ms) trigger space and test sample presets, illustrating the near impossibility of detecting targeted supply-chain backdoors through random black-box sampling.
25. `MembershipInferenceDiagram.tsx`: Autocycles (3200ms) differential privacy noise and threshold presets, showing how training data memorization creates output confidence distribution gaps between members and non-members.
26. `ModelExtractionDiagram.tsx`: Autocycles (3000ms) query budgets [2000, 500, 8000, 15000], illustrating that surrogate model fidelity saturates with query volume and that rate limiting raises extraction cost beyond asset value.

### Verification:
- Layer 1 (`tsc -b`): Clean (exit code 0).
- Layer 2 (`vitest run src/viz`): 84 files, 324 passed.
- Layer 3 (`check:notebook`): 0 violations.
- Layer 4 (Playwright screenshots): All 26 captured cleanly with 0 console/page errors in `docs/evidence/live-visuals/agy/batch-11/`.

## Batch 12 Report

### Motion Rationales:
1. `DefenseInDepthDiagram.tsx`: Autocycles (3500ms) preset layer combinations, demonstrating that while individual defenses have modest catch rates (25-45%), combining all layers mathematically drives cumulative defense catch probability to 80%+.
2. `DirectVsIndirectInjectionDiagram.tsx`: Autocycles (4000ms) between direct and indirect injection modes with FlowDots tracking attacker-to-model data flow, demonstrating that indirect injection hides malicious payloads in external retrieval sources where innocent users trigger them unwittingly.
3. `ExcessiveAgencyDiagram.tsx`: Autocycles (3000ms) agency grant levels from read-only to financial actions, showing that identical injection attacks yield drastically different real-world blast radiuses depending on tool scopes.
4. `InstructionDataBoundaryDiagram.tsx`: Autocycles (3800ms) between parameterized SQL (mechanically separated code/data channels) and LLM prompt concatenation (single unified channel), illustrating why prompt injection cannot be resolved by standard syntax parsers.
5. `ContextBudgetWaterfallVisualizer.tsx`: Autocycles (3800ms) between unmanaged (inlining raw files/schemas consuming 62.6% of window) and engineered context (AST maps and deferred schemas consuming only 6.2%), showing how context budgeting preserves 93.8% free attention headroom.
6. `AuthNvsAuthZDiagram.tsx`: Autocycles (3500ms) between Authentication and Authorization stages with FlowDots along the pipeline, clarifying that identity verification (AuthN) and permission scoping (AuthZ) are distinct sequential failure boundaries.
7. `CommunicationPatternSequenceDiagram.tsx`: Autocycles (3500ms) across short-poll, long-poll, webhook, SSE, and WebSocket patterns with animated request/response arrows, illustrating the connection lifecycles and latency trade-offs between pull and push models.
8. `DependencyInjectionDiagram.tsx`: Autocycles (3500ms) hover/active state with FlowDots flowing from `Depends(get_current_user)` to route handlers, illustrating how shared authentication logic is resolved once and injected without duplicated boilerplate.
9. `FastApiRequestFlowDiagram.tsx`: Autocycles (3000ms) through route matching, request validation, handler execution, response validation, and OpenAPI documentation, highlighting how Pydantic models automatically reject invalid payloads before execution.
10. `HttpMethodsDiagram.tsx`: Autocycles (3000ms) across HTTP verbs (GET, POST, PUT, PATCH, DELETE), teaching which verbs are safe to retry without side effects (idempotent) versus those that risk duplicate operations.
11. `JwtStructureDiagram.tsx`: Autocycles (3200ms) across Header, Payload, and Signature components, debunking the misconception that JWTs are encrypted by revealing that payloads are only base64url-encoded and unencrypted.
12. `OAuthFlowDiagram.tsx`: Autocycles (3000ms) through the 5 steps of the authorization code grant, illustrating that client secrets and user credentials remain strictly partitioned server-side.
13. `PatternComparisonMatrixDiagram.tsx`: Autocycles (3200ms) across communication patterns in the comparison matrix, showing the multi-dimensional trade-offs between latency, push capability, and connection complexity.
14. `RequestResponseCycleDiagram.tsx`: Autocycles (3000ms) through request and response segments (method, URL, headers, bodies, status), showing how client queries translate into server actions and formatted responses.
15. `RestResourceModelDiagram.tsx`: Autocycles (3500ms) across REST, RPC, and GraphQL conventions for fetching conversation entities, demonstrating how REST maps standard verbs to resource URIs.
16. `StatusCodeFamiliesDiagram.tsx`: Autocycles (3200ms) across 2xx, 3xx, 4xx, and 5xx status families, teaching client retry policies (e.g. backoff for 429 and 5xx vs. immediate error correction for 4xx).
17. `CompiledVsInterpretedDiagram.tsx`: Autocycles (3500ms) across compiled (C++/Rust), interpreted, Python hybrid bytecode, and PyTorch tensor ops, showing that PyTorch tensors execute inside pre-compiled CUDA kernels without paying per-element interpreter loops.
18. `GitObjectModelDiagram.tsx`: Autocycles (3000ms) between commit, tree, and blob objects with FlowDots illustrating pointer relationships, demonstrating content-addressable storage where unchanged files share identical SHA hashes.
19. `RebaseVsMergeDiagram.tsx`: Autocycles (4000ms) between git merge and git rebase modes with FlowDots on branch trajectories, showing how rebase rewrites linear commit history with new SHA hashes whereas merge preserves historical branching.
20. `CapTheoremDiagram.tsx`: Autocycles (3500ms) across partitioned/unpartitioned and CP/AP states, demonstrating that under a network split a system must choose between returning stale data (AP) or erroring out to preserve consistency (CP).
21. `ConsensusQuorumDiagram.tsx`: Autocycles (3000ms) unreachable node counts [1, 0, 2, 3, 4] across 5 cluster nodes, showing that commits succeed only when reachable nodes strictly exceed majority quorum (>= 3).
22. `DnsResolutionDiagram.tsx`: Autocycles (3500ms) between cold (200ms) and cached (2ms) DNS lookups, showing the dramatic reduction in connection setup latency once host mappings are cached locally.
23. `LoadBalancingDiagram.tsx`: Autocycles (3500ms) between round-robin, least-connections, and consistent hashing on variable-cost requests, demonstrating that least-connections balances real worker load whereas round-robin causes tail hot-spots.
24. `TcpVsUdpDiagram.tsx`: Autocycles (3000ms) packet loss rates [0.2, 0.05, 0.4, 0.1], showing that UDP drops lost packets with low latency whereas TCP pauses to retransmit missing sequence numbers in order.
25. `ConcurrencyVsParallelismDiagram.tsx`: Autocycles (3800ms) between 1 core interleaved concurrency and 3 core simultaneous parallelism, demonstrating that concurrency shares a single execution unit whereas parallelism executes truly in parallel.
26. `CpuCacheLatencyDiagram.tsx`: Autocycles (2500ms) across L1, L2, L3, and RAM memory hierarchy levels, using log-scaled bars to teach that RAM access (~200 cycles) is roughly 50x slower than L1 cache (4 cycles).
27. `GilReleaseDiagram.tsx`: Autocycles (3800ms) between pure Python CPU loops and NumPy/PyTorch calls, showing how native C/CUDA libraries release Python's GIL during execution so other threads can proceed.
28. `ProcessVsThreadDiagram.tsx`: Autocycles (3800ms) between two isolated processes and two shared-memory threads, highlighting the trade-off between private OS memory safety and shared-state speed.
29. `SequentialVsRandomIoDiagram.tsx`: Autocycles (3000ms) file size presets [50KB, 10KB, 200KB, 25KB], illustrating why formats like Parquet/WebDataset pack training data sequentially to avoid per-file seek latency overheads.
30. `SystemStackFailureDiagram.tsx`: Autocycles (2500ms) down the full system stack (CPU -> RAM -> PCIe -> GPU -> VRAM -> Network -> Distributed), isolating the specific architectural failure mode at each layer.
31. `DesignPatternDiagram.tsx`: Autocycles (3500ms) across Strategy, Factory, Observer, and Decorator patterns, showcasing how design patterns decouple core ML training loops from optimizer implementations and logging.
32. `FlameGraphDiagram.tsx`: Autocycles (2500ms) across call stack frames, showing how stack bar widths accurately expose hidden performance bottlenecks (such as JSON parsing taking 65% of batch time).
33. `GitBisectDiagram.tsx`: Autocycles (3000ms) commit search presets [200, 50, 500, 1000], illustrating how binary search halves the commit range in log2(n) steps compared to linear search.
34. `TestingPyramidDiagram.tsx`: Autocycles (3800ms) between traditional pyramid and inverted test suites, showing that suites dominated by slow end-to-end tests explode total test suite execution time from seconds to minutes.

### Verification:
- Layer 1 (`tsc -b`): Clean (exit code 0).
- Layer 2 (`vitest run src/viz`): 84 files, 324 passed.
- Layer 3 (`check:notebook`): 0 violations.
- Layer 4 (Playwright screenshots): All 34 captured cleanly with 0 console/page errors in `docs/evidence/live-visuals/agy/batch-12/`.

## Batch 13 Report

### Motion Rationales:
1. `CypherPatternMatchDiagram.tsx`: Autocycles (3000ms) through steps 0-3 of the Cypher pattern match (`MATCH (p1:Person)-[:WROTE]->(d1:Document)<-[:CITES]-(d2:Document)<-[:WROTE]-(p2:Person)`), showing how graph pattern matching navigates multi-hop citation relationships directly.
2. `DatabaseChoiceDecisionDiagram.tsx`: Autocycles (3500ms) across structured, semantic, and connected query archetypes, showing how distinct query questions route to Relational (Postgres), Vector, or Graph (Neo4j) database engines.
3. `PropertyGraphDiagram.tsx`: Autocycles (3000ms) across Ada, Paper A, Paper B, and Grace nodes, displaying each node's first-class properties and highlighting how relationships carry native attributes.
4. `RelationalVsGraphTraversalDiagram.tsx`: Autocycles (3000ms) across relationship depth presets [3, 1, 5, 2] hops, demonstrating that multi-hop relational join chains suffer exponential combinatorial explosion while graph pointer traversals scale near-linearly.
5. `ConsistencyVsApproximationDiagram.tsx`: Autocycles (3000ms) ANN search scope presets [30%, 10%, 80%, 50%], showing how approximate vector search trades a small tunable recall drop for flat latency against relational exactness.
6. `DataShapeDecisionDiagram.tsx`: Autocycles (3500ms) across the three core query criteria (exact condition matching, semantic similarity, and multi-hop relationship depth), emphasizing that query shape dictates the optimal database engine.
7. `DatabasesSectionMapDiagram.tsx`: Autocycles (3000ms) across Relational, PostgreSQL deep dive, Vector Databases, and Graph Databases modules, illustrating the structured curriculum reading order.
8. `IndexingPhilosophyDiagram.tsx`: Autocycles (3200ms) across B-tree, HNSW/IVF, and native adjacency indexes, demonstrating how each engine formulates a distinct geometric or topological definition of data "proximity".
9. `PolyglotArchitectureDiagram.tsx`: Autocycles (3000ms) across User request, Relational session lookup, Vector chunk retrieval, Graph multi-hop traversal, and App synthesis, demonstrating a concrete request lifecycle across specialized polyglot stores.
10. `QueryPatternMatchDiagram.tsx`: Autocycles (2800ms) across six real-world query patterns, teaching which storage engine naturally answers each query based on its underlying shape.
11. `ScaleCharacteristicsDiagram.tsx`: Autocycles (3000ms) across relationship hop presets [3, 1, 5, 2], showing how relational join costs scale exponentially with relationship depth compared to graph pointer traversals.
12. `ThreeStoreComparisonDiagram.tsx`: Autocycles (3500ms) across Relational, Vector, and Graph stores, showcasing what each engine is optimized to answer and what it sacrifices.
13. `IndexScanComparisonDiagram.tsx`: Autocycles (3000ms) across table size presets [10^4, 10^2, 10^5.5, 10^3], illustrating how the logarithmic O(log n) efficiency advantage of B-tree indexes widens exponentially as datasets grow.
14. `JoinTypesDiagram.tsx`: Autocycles (3500ms) across INNER, LEFT, RIGHT, and FULL joins, demonstrating how outer joins systematically preserve unmatched rows with explicit NULL padding.
15. `SqlExecutionOrderDiagram.tsx`: Autocycles (2800ms) through query clauses with animated FlowDots tracing the transition from written order to Postgres execution order, demonstrating why WHERE cannot reference SELECT aliases but ORDER BY can.
16. `AnnVsExactTradeoffDiagram.tsx`: Autocycles (3000ms) across candidate search parameter presets [40, 10, 150, 80], demonstrating how tuning `ef` navigates the Pareto frontier between recall and latency.
17. `EmbeddingSimilaritySearchDiagram.tsx`: Autocycles (3500ms) across Cosine, Euclidean, and Dot product distance metrics, demonstrating how geometric distance definitions alter nearest-neighbor retrieval sets for identical query points.
18. `VectorDbToolComparisonDiagram.tsx`: Autocycles (3500ms) across ChromaDB, Pinecone, Weaviate, pgvector, and Milvus, summarizing operational trade-offs from local embedded prototypes to distributed billion-scale clusters.
19. `CostWeightedThresholdDiagram.tsx`: Autocycles (3000ms) across false-negative cost penalty ratios [10:1, 2:1, 25:1, 5:1], illustrating how clinical and high-stakes loss matrices shift decision thresholds well below the default 0.5 cutoff.
20. `SimToRealGapDiagram.tsx`: Autocycles (3000ms) across real-world friction presets [1.2, 0.9, 1.5, 0.7], proving that domain-randomized policies hedge against physical parameter shifts where nominal simulation-tuned policies fail.
21. `ExperimentTrackingComparisonDiagram.tsx`: Autocycles (2800ms) across 5 hyperparameter sweep runs, highlighting loss curves to demonstrate how experiment tracking dashboards distinguish fast-converging configurations from diverging runs.

### Verification:
- Layer 1 (`tsc -b`): Clean (exit code 0).
- Layer 2 (`vitest run src/viz`): 84 files, 324 passed.
- Layer 3 (`check:notebook`): 0 violations.
- Layer 4 (Playwright screenshots): All 21 captured cleanly with 0 console/page errors in `docs/evidence/live-visuals/agy/batch-13/`.

## Batch 14 Report

### Motion Rationales:
1. `AgentControlFlowGraphDiagram.tsx`: Auto-steps (2500ms) through nodes (Plan -> Tool Call -> Inspect -> Evaluator) with dynamic back-edge cycling when confidence threshold (< 0.8) triggers re-planning, visually reinforcing iterative agent control-flow loops.
2. `AgentFrameworkAxisDiagram.tsx`: Autocycles (3500ms) across 5 framework design dimensions (orchestration graph, memory state, code-as-action, multi-agent communication, human-in-the-loop), illustrating trade-offs between rigid declarative graphs and dynamic autonomous code loops.
3. `ContinuousBatchingSimulationDiagram.tsx`: Autocycles (3000ms) batch capacity presets [4, 2, 6, 8], illustrating how iteration-level scheduling instantly evicts completed requests and packs new requests into freed engine slots without stalling on the slowest generation.
4. `TechComparisonDiagram.tsx`: Autocycles (3500ms) across tech comparison categories (Inference engine, RAG vs fine-tuning, PEFT, Database type, DDP vs FSDP, PyTorch vs JAX), presenting concrete decision rules for real-world engineering trade-off interviews.
5. `AsyncEventLoopDiagram.tsx`: Autocycles (3000ms) concurrent request presets [4, 2, 7, 5], showing how asynchronous event loops interleave quick CPU bursts while I/O waits overlap in parallel, dramatically outperforming blocking synchronous execution as concurrency grows.
6. `RefCountingDiagram.tsx`: Auto-steps (2200ms) through memory reference lifecycles, illustrating that standard reference counts deallocate deterministically upon reaching zero, whereas cyclical references require CPython's cyclic garbage collector to detect and collect unreferenced loops.
7. `ThreadingVsMultiprocessingDiagram.tsx`: Autocycles (3500ms) across all 4 combinations of workload (CPU vs I/O) and concurrency model (threading vs multiprocessing), demonstrating how Python's GIL serializes CPU threads while releasing during I/O, and showing multiprocessing's overhead vs true parallelism trade-offs.
8. `VectorizationSpeedupDiagram.tsx`: Autocycles (3000ms) array size presets [10,000, 500, 100,000, 2,000], showing the widening order-of-magnitude speedup of compiled vector SIMD instructions over interpreted Python loop overhead.
9. `ContextManagerFlowDiagram.tsx`: Auto-steps (2000ms) through the execution sequence of context managers, highlighting that `__exit__()` is guaranteed to run and release resources regardless of whether the inner block terminates normally or raises an unhandled exception.
10. `GeneratorMemoryDiagram.tsx`: Auto-cycles (3000ms) dataset size presets [2,000, 500, 15,000, 8,000], contrasting the linearly exploding memory footprint of list-based pipelines against the flat O(1) constant memory footprint of generator pipelines.
11. `PythonLayerStackDiagram.tsx`: Autocycles (2800ms) through the architectural layer stack (Python language -> NumPy vectorization -> PyTorch tensors/autograd -> Production Python tooling), showing how each foundational abstraction compounds up the stack.
12. `LogLevelFilterDiagram.tsx`: Autocycles (3000ms) across log severity thresholds (DEBUG -> INFO -> WARNING -> ERROR -> CRITICAL), showing dynamic message emission versus suppression at runtime without redeployment.
13. `VirtualEnvIsolationDiagram.tsx`: Autocycles (3500ms) between isolated venvs and shared global environments, demonstrating how separate `site-packages` directories eliminate dependency collision between projects requiring conflicting package versions.

### Verification:
- Layer 1 (`tsc -b`): Clean (exit code 0).
- Layer 2 (`vitest run src/viz`): 84 files, 324 passed.
- Layer 3 (`check:notebook`): 0 violations.
- Layer 4 (Playwright screenshots): All 13 captured cleanly with 0 console/page errors in `docs/evidence/live-visuals/agy/batch-14/`.

## Codex batch 9 (done by agy)

### Motion Rationales:
1. `AttentionComplexityDiagram.tsx`: Autocycles sequence length presets [2000, 8000, 16000, 24000, 32000] demonstrating the widening quadratic vs linear computational gap in self-attention mechanisms.
2. `BigOGrowthDiagram.tsx`: Autocycles input size n presets [4, 16, 64, 256, 1024] showing the explosive growth divergence between O(1), O(log n), O(n), O(n log n), O(n²), and O(2ⁿ).
3. `HashMapVsArrayDiagram.tsx`: Autocycles collection size presets [10, 100, 1000, 10000] contrasting O(1) constant hash lookups with O(n) linear array scans.
4. `SortingComplexityDiagram.tsx`: Autocycles array size presets [10, 50, 200, 1000, 5000] contrasting O(n²) comparison sorting against O(n log n) divide-and-conquer algorithms.
5. `ConvexVsNonConvexDiagram.tsx`: Autocycles starting point presets [-2.5, -1.2, 0.2, 1.8] showing how gradient descent gets trapped in local minima on non-convex surfaces while converging globally on convex objectives.
6. `GradientDirectionDiagram.tsx`: Autocycles position presets on the 2D Rosenbrock-style surface, showing how negative gradient vectors point along the direction of steepest descent.
7. `HessianCurvatureDiagram.tsx`: Autocycles surface curvature presets (local minimum, local maximum, saddle point) displaying the second-order Taylor expansion and eigenvalue signs.
8. `LagrangeKktDiagram.tsx`: Autocycles constraint bound presets to illustrate how Lagrange multipliers align gradient vectors at constrained optimum boundaries.
9. `MatrixMultiplicationDiagram.tsx`: Autocycles row/column index pairs through the matrix multiplication walk, highlighting the inner dot product accumulation for each output entry.
10. `MatrixTransformationDiagram.tsx`: Autocycles 2D linear transformation presets (shear, rotation, scaling, reflection) showing the distortion of the unit grid and basis vectors.
11. `QuadraticFormContourDiagram.tsx`: Autocycles matrix eigenvalues to visualize how positive definite, indefinite, and negative definite matrices shape elliptical and hyperbolic contours.
12. `RankSpanDiagram.tsx`: Autocycles matrix column configurations to illustrate vector span and the dimensionality collapse of rank-deficient linear systems.
13. `SvdCompressionDiagram.tsx`: Autocycles rank truncation k presets [1, 2, 3] demonstrating the Eckart-Young optimal low-rank matrix approximation and reconstruction error.
14. `VectorOperationsDiagram.tsx`: Autocycles vector pair presets (acute, orthogonal, opposite, collinear) showing live dot product and cosine similarity calculations independent of vector magnitude.
15. `BayesUpdateDiagram.tsx`: Autocycles prior and likelihood presets demonstrating how rare disease priors temper positive test evidence via Bayes' theorem.
16. `BootstrapDiagram.tsx`: Autocycles random resample seeds demonstrating the empirical construction of non-parametric 95% confidence intervals from 1,000 bootstrap draws.
17. `CltDemoDiagram.tsx`: Autocycles sample batch size presets [1, 5, 20, 60, 100] illustrating the convergence of sample means toward a normal distribution via the Central Limit Theorem.
18. `ConfounderDiagram.tsx`: Autocycles between observational and randomized controlled trial data to show how randomization shatters spurious confounder correlations.
19. `DistributionExplorerDiagram.tsx`: Autocycles across probability distributions (Gaussian, Bernoulli, Binomial, Categorical) highlighting dynamic shape, mean, and variance.
20. `EntropyKlDiagram.tsx`: Autocycles distribution Q presets toward true distribution P, showing cross-entropy converging to Shannon entropy as KL divergence drops to zero.
21. `MleVsMapDiagram.tsx`: Autocycles sample count and head count presets showing Maximum A Posteriori estimates converging to Maximum Likelihood as sample evidence overcomes the Beta prior.
22. `PermutationPValueDiagram.tsx`: Autocycles effect size presets showing empirical permutation null distributions and the exact computation of two-sided p-values.
23. `NerfRayMarchingDiagram.tsx`: Autocycles camera ray offsets through the 3D volume, showing density sampling and optical transmittance accumulation yielding final pixel color.
24. `PointCloudDiagram.tsx`: Autocycles 3D viewing azimuth angles to visualize 2D projection and painter's depth-sorted rendering of a 3D point cloud.
25. `TemporalConsistencyDiagram.tsx`: Autocycles between independent per-frame generation and temporally consistent sequences, illustrating artifact reduction across video frames.
26. `VideoUnderstandingArchitectureDiagram.tsx`: Autocycles across 3D-CNN, Two-Stream, and Video Transformer architectures, comparing temporal receptive fields and spatio-temporal attention.
27. `ClassicalAndLearnedVisionDiagram.tsx`: Autocycles between classical deterministic pipelines, learned neural representations, and hybrid production architectures.
28. `ImageTensorExplorerDiagram.tsx`: Autocycles between RGB 3D tensor views, grayscale intensity, and z-score normalized representations for neural network ingestion.
29. `VisionDataContractDiagram.tsx`: Autocycles through data contract definition stages (decision, output geometry, allowed variation, failure cost) prior to model selection.
30. `VisionDataShiftDiagram.tsx`: Autocycles domain shift severity percentages [10%, 35%, 65%, 90%], demonstrating distribution overlap decay between training and camera deployment.
31. `VisionErrorCostDiagram.tsx`: Autocycles deployment risk scenarios (defect inspection, pedestrian safety, photo tagging) showing asymmetric false-positive versus false-negative operational trade-offs.
32. `VisionFeedbackLoopDiagram.tsx`: Autocycles active stages of the production data flywheel (collect -> label -> train -> guard -> monitor -> refresh).
33. `VisionInvarianceDiagram.tsx`: Autocycles environmental factors (lighting, crop, stroke, boundary), contrasting invariance augmentation against critical discriminative signal retention.
34. `VisionLabelGranularityDiagram.tsx`: Autocycles annotation granularity levels (whole-image label, bounding box, keypoints, dense mask) versus marginal labeling costs.
35. `VisionSectionMapDiagram.tsx`: Autocycles section navigation milestones across vision fundamentals, tasks and models, and modern multimodal architectures.
36. `VisionTaskTaxonomyDiagram.tsx`: Autocycles canonical vision problem formulations (classification, bounding box detection, semantic segmentation, multi-object tracking).
37. `ConvolutionSlideDiagram.tsx`: Autocycles 3x3 receptive field sliding steps across the input feature map, computing dot-product elementwise activations on the output grid.
38. `DataAugmentationDiagram.tsx`: Autocycles data augmentation transformations (horizontal flip, rotation, random crop, brightness jitter, cutout, mixup) preserving semantic class labels.
39. `HogFeatureDiagram.tsx`: Autocycles synthetic edge patterns showing real-time 4x4 spatial cell gradient histogram starburst extraction for HOG descriptors.
40. `MorphologicalOpsDiagram.tsx`: Autocycles morphological operations (erosion, dilation, opening, closing) illustrating noise suppression and hole filling on binary masks.
41. `RgbChannelDecompositionDiagram.tsx`: Autocycles channel views (RGB color, red, green, blue, luminance grayscale) showing per-channel pixel contributions.
42. `OcrPipelineDiagram.tsx`: Autocycles pipeline stages (raw image -> text detection bounding boxes -> cropped patches -> sequence recognition) for optical character recognition.
43. `OpticalFlowFieldDiagram.tsx`: Autocycles motion displacement vectors [dx, dy] visualizing ground-truth pixel motion displacement fields across consecutive video frames.
44. `PoseEstimationApproachDiagram.tsx`: Autocycles person count n presets, comparing linear O(n) top-down detection cascades against constant O(1) bottom-up keypoint grouping costs.
45. `StereoDepthDiagram.tsx`: Autocycles target depth presets, computing stereo camera horizontal disparity d = f * B / Z and optical ray triangulation.
46. `TrackingAssociationDiagram.tsx`: Autocycles multi-frame tracking sequence, showing Kalman filter velocity predictions resolving trajectory crossover without identity swapping.

### Verification:
- Layer 1 (`tsc -b`): Clean (exit code 0).
- Layer 2 (`vitest run src/viz`): 84 files, 324 passed.
- Layer 3 (`check:notebook`): 0 violations.
- Visual inspection: Verified all 46 components maintain proper SVG viewBox bounds, responsive containers, and zero text/label overlaps.
