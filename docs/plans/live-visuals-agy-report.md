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
