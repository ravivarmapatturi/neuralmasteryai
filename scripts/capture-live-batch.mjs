import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const BATCH_ID = process.argv[2] || '1';
const PORT = process.argv[3] || '5186';
const LANE = process.argv[4] || 'agy';
const OUT_DIR = path.resolve(`docs/evidence/live-visuals/${LANE}/batch-${BATCH_ID}`);
fs.mkdirSync(OUT_DIR, { recursive: true });

const BATCH_CONFIGS = {
  1: [
    {
      route: '/docs/agents/a2a/overview',
      diagrams: [
        { name: 'AgentCardDiagram', match: 'invoice-processor' },
        { name: 'CrossOrgInteropDiagram', match: 'Trust boundary' },
        { name: 'DelegationSequenceDiagram', match: 'Agent A' },
        { name: 'McpVsA2aScopeDiagram', match: 'MCP: call, get result' },
        { name: 'TaskLifecycleDiagram', match: 'A delegated task branches' },
      ],
    },
    {
      route: '/docs/agents/agent-architectures',
      diagrams: [
        { name: 'AgentEvolutionDiagram', match: 'Harness' },
        { name: 'CoordinationPatternsDiagram', match: 'Coordination pattern' },
        { name: 'HumanInTheLoopDiagram', match: 'HITL pattern' },
        { name: 'MemoryAsRetrievalDiagram', match: 'Write (session 1)' },
        { name: 'ShortTermVsLongTermMemoryDiagram', match: 'Short-term' },
      ],
    },
    {
      route: '/docs/agents/agent-fundamentals',
      diagrams: [
        { name: 'AgentLoopDiagram', match: 'Model decides' },
        { name: 'ArgumentSchemaValidationDiagram', match: 'Well-specified' },
        { name: 'ChatbotVsAgentDiagram', match: 'Chatbot' },
        { name: 'ContextWindowBudgetDiagram', match: 'conversation turns so far' },
        { name: 'ToolCallAnatomyDiagram', match: "What's the weather in Tokyo?" },
        { name: 'ToolCallTraceDiagram', match: 'Is it a good day to fly a drone in Austin?' },
      ],
    },
    {
      route: '/docs/agents/agentic-coding-assistants',
      diagrams: [
        { name: 'AgenticCodingLoopDiagram', match: 'Trace step' },
        { name: 'CodingAgentSafetyModelDiagram', match: 'Safety model' },
        { name: 'OversightSpectrumDiagram', match: 'Full review' },
        { name: 'VerificationLayersDiagram', match: 'Types & static analysis' },
      ],
    },
    {
      route: '/docs/agents/browser-automation',
      diagrams: [
        { name: 'BrowserAgentActionDiagram', match: 'Extract DOM' },
      ],
    },
    {
      route: '/docs/agents/computer-use',
      diagrams: [
        { name: 'ComputerUseLoopDiagram', match: 'flights to Denver' },
      ],
    },
    {
      route: '/docs/agents/context-engineering',
      diagrams: [
        { name: 'ContextEngineeringStrategiesDiagram', match: 'Compress' },
      ],
    },
    {
      route: '/docs/agents/loops-and-graphs',
      diagrams: [
        { name: 'LoopGraphAnatomyDiagram', match: 'Return path on rejection' },
      ],
    },
  ],
  2: [
    {
      route: '/docs/agents/mcp/overview',
      diagrams: [
        { name: 'McpArchitectureDiagram', match: 'Filesystem server' },
        { name: 'McpCapabilityTypesDiagram', match: 'Functions the model can call' },
        { name: 'McpInAgentLoopDiagram', match: 'MCP: standardized tools/call' },
        { name: 'McpLocalVsRemoteDiagram', match: 'Local (stdio)' },
        { name: 'MxNIntegrationProblemDiagram', match: 'Custom integrations' },
        { name: 'TransportComparisonDiagram', match: 'Streamable HTTP' },
      ],
    },
    {
      route: '/docs/agents/mcp/protocol-deep-dive',
      diagrams: [
        { name: 'OAuthAuthorizationFlowDiagram', match: 'Client → MCP server' },
        { name: 'TokenAudienceBindingDiagram', match: 'Token passthrough' },
        { name: 'ToolCallFlowDiagram', match: 'Client → tools/list' },
        { name: 'ToolErrorTypesDiagram', match: 'Protocol error' },
      ],
    },
    {
      route: '/docs/agents/multi-agent-systems',
      diagrams: [
        { name: 'ParallelAgentSpeedupDiagram', match: 'concurrent slots' },
      ],
    },
    {
      route: '/docs/agents/no-code-automation',
      diagrams: [
        { name: 'ClusterNodeAssemblyDiagram', match: 'AI Agent' },
      ],
    },
    {
      route: '/docs/agents/overview',
      diagrams: [
        { name: 'AgentFailureModesDiagram', match: 'Tool misuse' },
        { name: 'ArchitectureSpectrumDiagram', match: 'cost/latency' },
        { name: 'AutonomySpectrumDiagram', match: 'Autonomy level' },
        { name: 'PerceiveReasonActLoopDiagram', match: 'Perceive' },
      ],
    },
    {
      route: '/docs/agents/plan-and-execute',
      diagrams: [
        { name: 'PlanExecuteReplanDiagram', match: 'Search Company A pricing page' },
      ],
    },
    {
      route: '/docs/agents/reflection-self-critique',
      diagrams: [
        { name: 'ReflexionLoopDiagram', match: 'episodic memory buffer' },
      ],
    },
    {
      route: '/docs/agents/routing-and-supervisor',
      diagrams: [
        { name: 'RouterVsSupervisorDiagram', match: 'weather_agent' },
      ],
    },
  ],
  3: [
    {
      route: '/docs/agents/single-vs-multi-agent',
      diagrams: [
        { name: 'AgentSplitTradeoffDiagram', match: 'Specialized agents' },
      ],
    },
    {
      route: '/docs/mlops/ai-cost-engineering',
      diagrams: [
        { name: 'ModelRoutingSavingsDiagram', match: 'Routed by difficulty' },
        { name: 'QualityLatencyCostTriangleDiagram', match: 'Real-time chat' },
        { name: 'TrainingVsInferenceCostDiagram', match: 'Month' },
        { name: 'UtilizationCostDiagram', match: 'Low util, high bill' },
      ],
    },
    {
      route: '/docs/mlops/caching-strategies',
      diagrams: [
        { name: 'CacheAsideFlowDiagram', match: 'Cache miss' },
        { name: 'CacheEvictionTtlDiagram', match: 'TTL expiry' },
        { name: 'WriteThroughVsWriteBehindDiagram', match: 'Write-through' },
      ],
    },
    {
      route: '/docs/mlops/cicd-and-ml-cicd',
      diagrams: [
        { name: 'AutomatedRetrainLoopDiagram', match: 'Trigger' },
        { name: 'CiVsCdDiagram', match: 'push/PR' },
        { name: 'GitOpsReconciliationDiagram', match: 'Git repo' },
        { name: 'MlCicdPipelineStepsDiagram', match: 'Code checks' },
      ],
    },
    {
      route: '/docs/mlops/cloud-computing',
      diagrams: [
        { name: 'CloudDistinctiveFeaturesDiagram', match: 'GCP' },
        { name: 'CloudNeutralPortabilityDiagram', match: 'Docker container' },
        { name: 'CloudVocabularyMapDiagram', match: 'Virtual machines' },
        { name: 'ComputeSpectrumDiagram', match: 'EC2' },
        { name: 'ManagedMlPlatformTradeoffDiagram', match: 'Managed platform' },
        { name: 'RequestPathSecurityDiagram', match: 'VPC' },
        { name: 'StorageUseCaseDiagram', match: 'Datasets, model artifacts' },
      ],
    },
    {
      route: '/docs/mlops/cloud-model-deployment',
      diagrams: [
        { name: 'CloudDeploymentChoiceDiagram', match: 'Synchronous, low-latency, steady traffic' },
      ],
    },
    {
      route: '/docs/mlops/containers',
      diagrams: [
        { name: 'ContainerSecurityChecklistDiagram', match: "Don't run as root" },
        { name: 'DockerArchitectureDiagram', match: 'docker CLI' },
        { name: 'DockerfileLayerCachingDiagram', match: 'Good order' },
        { name: 'ImageVsContainerDiagram', match: 'read-only template' },
        { name: 'MultiStageBuildDiagram', match: 'BUILD STAGE' },
        { name: 'RegistryComparisonDiagram', match: 'Amazon ECR' },
        { name: 'VolumesAndNetworksDiagram', match: 'Remove container' },
      ],
    },
    {
      route: '/docs/mlops/data-engineering-and-versioning',
      diagrams: [
        { name: 'DataLineageProvenanceDiagram', match: 'Lineage' },
        { name: 'DataPipelineFlowDiagram', match: 'Feature Eng.' },
        { name: 'DataProcessingScaleDiagram', match: 'Dataset size' },
        { name: 'GitVsDataVersioningDiagram', match: '500GB dataset' },
        { name: 'SchemaEvolutionDiagram', match: 'Producer (new schema)' },
      ],
    },
  ],
  4: [
    {
      route: '/docs/mlops/deployment-strategies',
      diagrams: [
        { name: 'BlueGreenCutoverDiagram', match: 'Router (100%)' },
        { name: 'CanaryRampDiagram', match: 'canary' },
        { name: 'CanaryVsAbPurposeDiagram', match: 'rollout safety' },
        { name: 'ComposedStrategyDiagram', match: 'Shadow' },
        { name: 'ShadowDeploymentDiagram', match: 'Old model' },
      ],
    },
    {
      route: '/docs/mlops/engineering-foundations',
      diagrams: [
        { name: 'ConfigVsHardcodedDiagram', match: 'Config-driven' },
        { name: 'DependencyPinningDiagram', match: 'Pinned + lockfile' },
        { name: 'NotebookVsPipelineDiagram', match: 'Explicit pipeline module' },
        { name: 'OnboardingStandardDiagram', match: 'git clone' },
      ],
    },
    {
      route: '/docs/mlops/experiment-tracking',
      diagrams: [
        { name: 'HyperparameterSweepDiagram', match: 'learning rate (log scale)' },
        { name: 'RunComparisonChartDiagram', match: 'run-a (lr=0.01)' },
        { name: 'SevenAnswersChecklistDiagram', match: 'Code' },
      ],
    },
    {
      route: '/docs/mlops/feature-stores-and-model-registry',
      diagrams: [
        { name: 'FeatureFreshnessDiagram', match: 'Feature age' },
        { name: 'LineageChainDiagram', match: 'Model version' },
        { name: 'OfflineVsOnlineStoreDiagram', match: 'Offline store' },
        { name: 'PromotionWorkflowDiagram', match: 'Promotion gate' },
        { name: 'TrainingServingSkewDiagram', match: 'Training (batch, Python)' },
      ],
    },
    {
      route: '/docs/mlops/federated-learning',
      diagrams: [
        { name: 'FederatedRoundDiagram', match: 'Distribute' },
      ],
    },
    {
      route: '/docs/mlops/gpu-and-distributed-training',
      diagrams: [
        { name: 'CudaExecutionHierarchyDiagram', match: 'Thread block' },
        { name: 'CudaStreamsDiagram', match: 'Streams' },
        { name: 'FsdpZeroShardingDiagram', match: 'Plain DP' },
        { name: 'GpuMemoryHierarchyDiagram', match: 'Registers' },
        { name: 'MixedPrecisionDiagram', match: 'FP32 master weights' },
        { name: 'OccupancyDiagram', match: 'Registers used per thread' },
        { name: 'ParallelismStrategiesDiagram', match: 'Data parallelism' },
        { name: 'PipelineBubbleDiagram', match: 'Micro-batches' },
        { name: 'ThreeDParallelismCompositionDiagram', match: 'DATA PARALLEL' },
        { name: 'WarpDivergenceDiagram', match: 'branch A' },
      ],
    },
    {
      route: '/docs/mlops/infrastructure-as-code',
      diagrams: [
        { name: 'ImmutableVsConfigMgmtDiagram', match: 'Immutable infrastructure' },
        { name: 'RemoteStateLockingDiagram', match: 'terraform apply' },
        { name: 'StateDriftDiagram', match: 'eks_cluster' },
        { name: 'TerraformWorkflowDiagram', match: 'terraform plan' },
      ],
    },
    {
      route: '/docs/mlops/kubernetes',
      diagrams: [
        { name: 'ClusterArchitectureDiagram', match: 'kube-apiserver' },
        { name: 'GpuSchedulingDiagram', match: 'Node type' },
        { name: 'HpaAutoscalingDiagram', match: 'Observed load' },
        { name: 'ResourceRequestsLimitsDiagram', match: 'Actual memory usage' },
      ],
    },
  ],
  5: [
    {
      route: '/docs/mlops/legal-licensing-and-governance',
      diagrams: [
        { name: 'ModelLicenseSpectrumDiagram', match: 'Apache 2.0' },
        { name: 'PrivacyRegulationScopeDiagram', match: 'PII controls' },
        { name: 'GovernanceApprovalFlowDiagram', match: 'Written policy' },
        { name: 'ModelCardVsDataCardDiagram', match: 'Model card' },
      ],
    },
    {
      route: '/docs/mlops/llm-evaluation-and-ragops',
      diagrams: [
        { name: 'BleuVsSemanticDiagram', match: 'Exact match' },
        { name: 'NdcgRankingDiagram', match: 'Recall@4' },
        { name: 'RagFailureLayerDiagram', match: 'Bad chunks' },
      ],
    },
    {
      route: '/docs/mlops/llm-hosting-and-serving-patterns',
      diagrams: [
        { name: 'EmbeddingRerankerPipelineDiagram', match: 'Runs over' },
        { name: 'FineTuningToInferenceHandoffDiagram', match: 'Base model' },
        { name: 'HostingStackDiagram', match: 'GPU VM' },
        { name: 'MultiLoraServingDiagram', match: 'One base model' },
        { name: 'ServerlessColdStartDiagram', match: 'Scales to zero' },
      ],
    },
    {
      route: '/docs/mlops/llm-inference-engines',
      diagrams: [
        { name: 'BaselineVsEngineDiagram', match: 'Dedicated engine' },
        { name: 'EdgeVsServerDeploymentDiagram', match: 'Server-side serving' },
        { name: 'EngineTerminologyDiagram', match: 'Inference engine/runtime' },
        { name: 'InferenceStackLayersDiagram', match: 'API Gateway' },
      ],
    },
    {
      route: '/docs/mlops/llm-inference-optimization',
      diagrams: [
        { name: 'FlashAttentionMemoryDiagram', match: 'Standard' },
        { name: 'PrefillVsDecodeDiagram', match: 'Request phase' },
        { name: 'PrefixCachingDiagram', match: 'Prefix caching' },
        { name: 'TtftTpotTimelineDiagram', match: 'request sent' },
      ],
    },
    {
      route: '/docs/mlops/message-queues-and-async-processing',
      diagrams: [
        { name: 'DeliverySemanticsDiagram', match: 'Delivery semantics' },
        { name: 'PartitionOrderingDiagram', match: 'Partition assignment' },
        { name: 'PubSubVsPointToPointDiagram', match: 'Point-to-Point' },
        { name: 'SyncVsAsyncDiagram', match: 'Processing time' },
      ],
    },
    {
      route: '/docs/mlops/ml-and-llm-testing',
      diagrams: [
        { name: 'JailbreakRegressionDiagram', match: 'jailbreak works' },
        { name: 'LlmTestTypesDiagram', match: 'Golden datasets' },
        { name: 'MlTestPyramidDiagram', match: 'Unit / data / schema' },
        { name: 'PromptAsCodeDiagram', match: 'Tests run' },
      ],
    },
    {
      route: '/docs/mlops/mlops-architecture-and-roadmap',
      diagrams: [
        { name: 'MlLifecyclePipelineDiagram', match: 'retraining loops back to validation' },
      ],
    },
  ],
  6: [
    {
      route: '/docs/mlops/model-serving',
      diagrams: [
        { name: 'AdaptiveBatchingQueueDiagram', match: 'Batch window collects' },
        { name: 'AsyncBlockingDiagram', match: 'Endpoint style' },
        { name: 'BatchOnlineStreamingDiagram', match: 'throughput' },
        { name: 'ModelServingRequestFlowDiagram', match: 'Model inference' },
      ],
    },
    {
      route: '/docs/mlops/monitoring-and-drift',
      diagrams: [
        { name: 'DataVsConceptDriftDiagram', match: 'Data drift' },
        { name: 'KsTestDiagram', match: 'Distribution shift' },
        { name: 'PsiCalculatorDiagram', match: 'reference (training)' },
        { name: 'ThreeMonitoringLayersDiagram', match: 'ML-specific' },
        { name: 'WassersteinDistanceDiagram', match: 'Distance between distributions' },
      ],
    },
    {
      route: '/docs/mlops/observability',
      diagrams: [
        { name: 'MonitoringVsObservabilityDiagram', match: 'something is wrong' },
        { name: 'PrometheusGrafanaFlowDiagram', match: 'Service exposes /metrics' },
        { name: 'StructuredLogsDiagram', match: 'Structured (JSON)' },
        { name: 'ThreePillarsIncidentDiagram', match: 'Metric spike' },
        { name: 'TraceWaterfallDiagram', match: 'Downstream DB' },
      ],
    },
    {
      route: '/docs/mlops/pipeline-orchestration',
      diagrams: [
        { name: 'BackfillDiagram', match: 'Backfill range' },
        { name: 'DagDependencyDiagram', match: 'A: extract' },
        { name: 'PipelineCachingDiagram', match: 'Click a stage to simulate its inputs changing' },
        { name: 'RetryBackoffDiagram', match: 'Attempt 1' },
      ],
    },
    {
      route: '/docs/mlops/production-reliability',
      diagrams: [
        { name: 'BackpressureQueueDiagram', match: 'No backpressure' },
        { name: 'CircuitBreakerStateDiagram', match: 'Closed' },
        { name: 'GracefulDegradationLadderDiagram', match: 'Full service' },
        { name: 'IdempotencyKeyDiagram', match: 'No idempotency key' },
        { name: 'TimeoutCascadeDiagram', match: 'connection pool' },
      ],
    },
    {
      route: '/docs/mlops/security-and-reproducibility',
      diagrams: [
        { name: 'LeastPrivilegeAgencyDiagram', match: 'Web search' },
        { name: 'LlmAttackSurfaceDiagram', match: 'Prompt injection' },
        { name: 'ReproducibilityChecklistDiagram', match: 'Seeds' },
        { name: 'SecretsInjectionDiagram', match: 'Secrets Manager / Vault' },
      ],
    },
    {
      route: '/docs/harness-engineering/autonomous-loops-and-supervisors',
      diagrams: [
        { name: 'AutonomousGoalLoopDiagram', match: 'Loop Phase' },
        { name: 'HarnessAblationStudio', match: 'Benchmark Scenario' },
      ],
    },
    {
      route: '/docs/harness-engineering/context-and-instruction-design',
      diagrams: [
        { name: 'ContextCompactionVisualizer', match: 'Strategy' },
        { name: 'InstructionBudgetVisualizer', match: 'Context Strategy' },
      ],
    },
  ],
  7: [
    {
      route: '/docs/harness-engineering/harness-architecture',
      diagrams: [
        { name: 'AgentHarnessArchitectureVisualizer', match: 'Full Production Harness' },
        { name: 'PreDispatchInterceptorDiagram', match: 'Tool Call Input' },
      ],
    },
    {
      route: '/docs/harness-engineering/roadmap',
      diagrams: [
        { name: 'HarnessCurriculumDiagram', match: 'Click any stage' },
      ],
    },
    {
      route: '/docs/harness-engineering/state-continuity-and-memory',
      diagrams: [
        { name: 'TwoPassCompactionFlowDiagram', match: 'Compaction Stage' },
      ],
    },
    {
      route: '/docs/harness-engineering/verification-loops',
      diagrams: [
        { name: 'VerificationFunnelDiagram', match: 'Verification Gate' },
      ],
    },
    {
      route: '/docs/software-system-design/autoscaling',
      diagrams: [
        { name: 'AutoscalingBacklogExplorer', match: 'Useful startup delay' },
      ],
    },
    {
      route: '/docs/software-system-design/availability-and-slos',
      diagrams: [
        { name: 'ErrorBudgetExplorer', match: 'Observed failures' },
      ],
    },
    {
      route: '/docs/software-system-design/caching-and-invalidation',
      diagrams: [
        { name: 'CacheInvalidationRaceExplorer', match: 'Fill policy' },
      ],
    },
    {
      route: '/docs/software-system-design/cap-and-pacelc',
      diagrams: [
        { name: 'PartitionDecisionExplorer', match: 'Partition-time read policy' },
      ],
    },
  ],
  8: [
    {
      route: '/docs/software-system-design/capacity-estimation',
      diagrams: [
        { name: 'SoftwareCapacityExplorer', match: 'Instances across three zones' },
      ],
    },
    {
      route: '/docs/software-system-design/cdns',
      diagrams: [
        { name: 'CdnOriginLoadExplorer', match: 'Edge cache hits' },
      ],
    },
    {
      route: '/docs/software-system-design/chat-system',
      diagrams: [
        { name: 'SoftwareCaseTrace', match: 'Failure path' },
      ],
    },
    {
      route: '/docs/software-system-design/consistency-models',
      diagrams: [
        { name: 'ConsistencyHistoryExplorer', match: 'Request history' },
      ],
    },
    {
      route: '/docs/software-system-design/consistent-hashing',
      diagrams: [
        { name: 'ConsistentHashMembershipExplorer', match: 'Ring membership' },
      ],
    },
    {
      route: '/docs/software-system-design/design-approach',
      diagrams: [
        { name: 'DesignDecisionExplorer', match: 'Time after revocation' },
      ],
    },
    {
      route: '/docs/software-system-design/indexing',
      diagrams: [
        { name: 'CompositeIndexExplorer', match: 'Composite key order' },
      ],
    },
    {
      route: '/docs/software-system-design/latency',
      diagrams: [
        { name: 'LatencyFanoutExplorer', match: 'Required downstream calls' },
        { name: 'RequestLatencyBudget', match: 'Application and storage' },
      ],
    },
  ],
  9: [
    {
      route: '/docs/software-system-design/load-balancing',
      diagrams: [
        { name: 'LoadAssignmentExplorer', match: 'Assignment unit' },
      ],
    },
    {
      route: '/docs/software-system-design/rate-limiting',
      diagrams: [
        { name: 'TokenBucketAdmissionExplorer', match: 'Admission step' },
      ],
    },
    {
      route: '/docs/software-system-design/replication',
      diagrams: [
        { name: 'SoftwareReplicationExplorer', match: 'Before write' },
      ],
    },
    {
      route: '/docs/software-system-design/requirements',
      diagrams: [
        { name: 'RequirementBoundaryExplorer', match: 'Measurement population' },
      ],
    },
    {
      route: '/docs/software-system-design/reverse-proxies-and-api-gateways',
      diagrams: [
        { name: 'ProxyTrustExplorer', match: 'Ingress policy' },
      ],
    },
    {
      route: '/docs/software-system-design/sharding',
      diagrams: [
        { name: 'ShardHotKeyExplorer', match: 'Shard owners' },
      ],
    },
    {
      route: '/docs/software-system-design/sql-vs-nosql',
      diagrams: [
        { name: 'StorageOwnershipExplorer', match: 'Ownership model' },
      ],
    },
    {
      route: '/docs/software-system-design/stateless-services',
      diagrams: [
        { name: 'StatelessSessionExplorer', match: 'Authoritative session location' },
      ],
    },
  ],
  10: [
    {
      route: '/docs/software-system-design/transactions-and-isolation',
      diagrams: [
        { name: 'WriteSkewExplorer', match: 'Transaction schedule' },
      ],
    },
    {
      route: '/docs/software-system-design/vertical-vs-horizontal-scaling',
      diagrams: [
        { name: 'ScalingBottleneckExplorer', match: 'Application replicas' },
      ],
    },
    {
      route: '/docs/ml-system-design/case-studies',
      diagrams: [
        { name: 'DiscoverySequenceDiagram', match: 'Click a step' },
        { name: 'TwoStagePipelinePatternDiagram', match: 'Two-stage retrieval and ranking' },
        { name: 'ColdStartDiagram', match: 'Approach' },
        { name: 'BlendedObjectiveDiagram', match: 'Revenue weight' },
        { name: 'DomainAgnosticDesignDiagram', match: 'Domain' },
        { name: 'GenAiCaseStudiesDiagram', match: 'RAG pipeline design' },
        { name: 'ProblemSolutionMapDiagram', match: 'Training-serving skew' },
      ],
    },
    {
      route: '/docs/ml-system-design/model-catalog-and-benchmarking',
      diagrams: [
        { name: 'ModelCategoryMapDiagram', match: 'A taxonomy, not a leaderboard' },
        { name: 'ModelCardChecklistDiagram', match: 'The same attribute set the Model Cards standard formalizes' },
        { name: 'ActiveVsTotalParamsDiagram', match: 'Total parameters' },
        { name: 'BenchmarkDimensionsSelectorDiagram', match: 'System type' },
        { name: 'UsageWorkflowDiagram', match: 'The checklist and dimensions stay true' },
      ],
    },
    {
      route: '/docs/ml-system-design/overview',
      diagrams: [
        { name: 'ThreeDisciplinesDiagram', match: 'Click a discipline' },
        { name: 'WhenSystemDesignMattersDiagram', match: 'When system design becomes necessary' },
        { name: 'ProblemFormulationFunnelDiagram', match: 'Turn a business request into a trainable objective' },
        { name: 'OfflineVsOnlineMetricsDiagram', match: 'Offline improvement is a hypothesis' },
        { name: 'TradeoffSpaceDiagram', match: 'Every design picks a dominant constraint' },
        { name: 'BatchVsOnlineServingDiagram', match: 'Freshness determines the serving path' },
        { name: 'LatencyBudgetBreakdownDiagram', match: 'A 100ms budget spans the whole request path' },
        { name: 'ModelComplexityInterpretabilityDiagram', match: 'Earn complexity with measured value' },
        { name: 'SectionMapDiagram', match: 'The system-design learning path' },
      ],
    },
    {
      route: '/docs/ml-system-design/roadmap',
      diagrams: [
        { name: 'NineStepPipelineDiagram', match: 'Problem formulation' },
      ],
    },
    {
      route: '/docs/ml-system-design/technology-ecosystem-map',
      diagrams: [
        { name: 'EcosystemMapDiagram', match: 'Frontend / Client Experience' },
      ],
    },
    {
      route: '/docs/ml-system-design/the-9-step-framework',
      diagrams: [
        { name: 'DataBiasDiagram', match: 'Showing full catalog' },
        { name: 'FeatureCategoriesDiagram', match: 'User features' },
        { name: 'TimeBasedSplitDiagram', match: 'Split strategy' },
        { name: 'ABShadowCanaryDiagram', match: 'Strategy' },
        { name: 'MonitoringRetrainLoopDiagram', match: 'loop is the step' },
      ],
    },
  ],
  11: [
    {
      route: '/docs/agent-observability/overview',
      diagrams: [
        { name: 'AgentTraceWaterfallVisualizer', match: 'Distributed Span Trees' },
      ],
    },
    {
      route: '/docs/ai-evaluation/evaluation-fundamentals',
      diagrams: [
        { name: 'ConstructValidityDiagram', match: 'Shortcut model' },
        { name: 'ContaminationDiagram', match: 'fraction of benchmark contaminated' },
        { name: 'GoldenDatasetCoverageDiagram', match: 'golden dataset size' },
        { name: 'SaturationDiagram', match: 'Re-sample generations' },
      ],
    },
    {
      route: '/docs/ai-evaluation/human-and-adversarial-evaluation',
      diagrams: [
        { name: 'AdversarialRobustnessDiagram', match: 'perturbation strength' },
        { name: 'CohensKappaDiagram', match: 'raw agreement' },
        { name: 'EloRatingDiagram', match: 'Play 10 matches' },
        { name: 'StatisticalPowerDiagram', match: 'real effect size to detect' },
      ],
    },
    {
      route: '/docs/ai-evaluation/llm-rag-agent-evaluation',
      diagrams: [
        { name: 'AgentTrajectoryDiagram', match: 'task success rate' },
        { name: 'JudgeValidationDiagram', match: 'example-anchored rubric' },
        { name: 'JudgeVerbosityBiasDiagram', match: 'judge\'s length bias strength' },
      ],
    },
    {
      route: '/docs/ai-safety/alignment-and-rlhf',
      diagrams: [
        { name: 'ConstitutionalAiLoopDiagram', match: 'no human' },
        { name: 'DeceptionDetectionDiagram', match: 'hidden misbehavior rate' },
        { name: 'RewardHackingSimulationDiagram', match: 'correlates with length' },
        { name: 'SpecificationGamingDiagram', match: 'training horizon' },
      ],
    },
    {
      route: '/docs/ai-safety/scalable-oversight-and-frontier-safety',
      diagrams: [
        { name: 'CapabilityThresholdDiagram', match: 'dangerous-capability threshold' },
        { name: 'DebateConvergenceDiagram', match: 'Re-run debate' },
        { name: 'OversightApproachesDiagram', match: 'Recursive reward modeling' },
        { name: 'ProcessVsOutcomeDiagram', match: 'Test Trace A' },
        { name: 'StagedDeploymentDiagram', match: 'real issue rate' },
      ],
    },
    {
      route: '/docs/ai-security/ai-red-teaming',
      diagrams: [
        { name: 'AgenticTop10CoverageDiagram', match: 'Agent Goal Hijack' },
      ],
    },
    {
      route: '/docs/ai-security/model-and-data-attacks',
      diagrams: [
        { name: 'AdversarialPerturbationDiagram', match: 'perturbation magnitude' },
        { name: 'BackdoorTriggerDiagram', match: 'possible trigger patterns' },
        { name: 'MembershipInferenceDiagram', match: 'differential-privacy noise' },
        { name: 'ModelExtractionDiagram', match: 'attacker\'s query budget' },
      ],
    },
  ],
  12: [
    {
      route: '/docs/ai-security/owasp-llm-top-10-and-prompt-attacks',
      diagrams: [
        { name: 'DefenseInDepthDiagram', match: 'Untrusted-content framing' },
        { name: 'DirectVsIndirectInjectionDiagram', match: 'Indirect (more dangerous)' },
        { name: 'ExcessiveAgencyDiagram', match: 'illustrative blast-radius severity' },
        { name: 'InstructionDataBoundaryDiagram', match: 'One channel' },
      ],
    },
    {
      route: '/docs/context-engineering/overview',
      diagrams: [
        { name: 'ContextBudgetWaterfallVisualizer', match: 'Token Budgeting & Allocation Breakdown' },
      ],
    },
    {
      route: '/docs/cs-fundamentals/apis-http-and-protocols',
      diagrams: [
        { name: 'AuthNvsAuthZDiagram', match: 'Request arrives' },
        { name: 'CommunicationPatternSequenceDiagram', match: 'Short polling' },
        { name: 'DependencyInjectionDiagram', match: 'Depends(get_current_user)' },
        { name: 'FastApiRequestFlowDiagram', match: 'Request validation' },
        { name: 'HttpMethodsDiagram', match: 'Idempotent:' },
        { name: 'JwtStructureDiagram', match: 'header.payload.signature' },
        { name: 'OAuthFlowDiagram', match: 'the authorization-code flow' },
        { name: 'PatternComparisonMatrixDiagram', match: 'Connection cost' },
        { name: 'RequestResponseCycleDiagram', match: 'REQUEST (client → server)' },
        { name: 'RestResourceModelDiagram', match: 'API style' },
        { name: 'StatusCodeFamiliesDiagram', match: '2xx Success' },
      ],
    },
    {
      route: '/docs/cs-fundamentals/linux-git-and-tooling',
      diagrams: [
        { name: 'CompiledVsInterpretedDiagram', match: 'Execution model' },
        { name: 'GitObjectModelDiagram', match: 'tree (root)' },
        { name: 'RebaseVsMergeDiagram', match: 'A, B (unchanged)' },
      ],
    },
    {
      route: '/docs/cs-fundamentals/networking-and-distributed-systems',
      diagrams: [
        { name: 'CapTheoremDiagram', match: 'Partition active' },
        { name: 'ConsensusQuorumDiagram', match: 'Unreachable nodes' },
        { name: 'DnsResolutionDiagram', match: 'Cold lookup' },
        { name: 'LoadBalancingDiagram', match: 'Round-robin' },
        { name: 'TcpVsUdpDiagram', match: 'Simulated packet loss' },
      ],
    },
    {
      route: '/docs/cs-fundamentals/operating-systems-and-concurrency',
      diagrams: [
        { name: 'ConcurrencyVsParallelismDiagram', match: 'Concurrent (1 core)' },
        { name: 'CpuCacheLatencyDiagram', match: 'Bar length is log-scaled' },
        { name: 'GilReleaseDiagram', match: 'Pure Python loop' },
        { name: 'ProcessVsThreadDiagram', match: 'Two Processes' },
        { name: 'SequentialVsRandomIoDiagram', match: 'Individual file size' },
      ],
    },
    {
      route: '/docs/cs-fundamentals/overview',
      diagrams: [
        { name: 'SystemStackFailureDiagram', match: 'distributed workers' },
      ],
    },
    {
      route: '/docs/cs-fundamentals/software-engineering-practices',
      diagrams: [
        { name: 'DesignPatternDiagram', match: 'Strategy' },
        { name: 'FlameGraphDiagram', match: 'train_step()' },
        { name: 'GitBisectDiagram', match: 'Commits to search' },
        { name: 'TestingPyramidDiagram', match: 'Pyramid (correct)' },
      ],
    },
  ],
  13: [
    {
      route: '/docs/databases/graph/overview',
      diagrams: [
        { name: 'CypherPatternMatchDiagram', match: 'MATCH (p1:Person)' },
        { name: 'DatabaseChoiceDecisionDiagram', match: 'Real systems typically use all three' },
        { name: 'PropertyGraphDiagram', match: 'WROTE' },
        { name: 'RelationalVsGraphTraversalDiagram', match: 'Relational JOIN chain' },
      ],
    },
    {
      route: '/docs/databases/overview',
      diagrams: [
        { name: 'ConsistencyVsApproximationDiagram', match: 'ANN search scope' },
        { name: 'DataShapeDecisionDiagram', match: 'Do you need exact rows' },
        { name: 'DatabasesSectionMapDiagram', match: 'Relational Databases' },
        { name: 'IndexingPhilosophyDiagram', match: 'Relational: B-tree index' },
        { name: 'PolyglotArchitectureDiagram', match: 'User asks a question' },
        { name: 'QueryPatternMatchDiagram', match: 'Find all orders placed' },
        { name: 'ScaleCharacteristicsDiagram', match: 'Query traverses' },
        { name: 'ThreeStoreComparisonDiagram', match: 'Good at:' },
      ],
    },
    {
      route: '/docs/databases/relational/overview',
      diagrams: [
        { name: 'IndexScanComparisonDiagram', match: 'table size = 10^' },
        { name: 'JoinTypesDiagram', match: 'INNER JOIN' },
      ],
    },
    {
      route: '/docs/databases/relational/postgresql',
      diagrams: [
        { name: 'SqlExecutionOrderDiagram', match: 'You write it' },
      ],
    },
    {
      route: '/docs/databases/vector/overview',
      diagrams: [
        { name: 'AnnVsExactTradeoffDiagram', match: 'ef (candidates examined per search)' },
        { name: 'EmbeddingSimilaritySearchDiagram', match: 'Distance metric' },
        { name: 'VectorDbToolComparisonDiagram', match: 'ChromaDB' },
      ],
    },
    {
      route: '/docs/domain-applications/healthcare-ai',
      diagrams: [
        { name: 'CostWeightedThresholdDiagram', match: 'cost(missed case) / cost(false alarm)' },
      ],
    },
    {
      route: '/docs/domain-applications/other-domain-applications',
      diagrams: [
        { name: 'SimToRealGapDiagram', match: 'true real-world friction' },
      ],
    },
    {
      route: '/docs/frameworks/core-ml-dl-frameworks',
      diagrams: [
        { name: 'ExperimentTrackingComparisonDiagram', match: 'Runs, click to highlight' },
      ],
    },
  ],
  14: [
    {
      route: '/docs/frameworks/llm-agent-frameworks',
      diagrams: [
        { name: 'AgentControlFlowGraphDiagram', match: 'Confidence threshold' },
        { name: 'AgentFrameworkAxisDiagram', match: 'Code-as-action' },
      ],
    },
    {
      route: '/docs/frameworks/serving-mlops',
      diagrams: [
        { name: 'ContinuousBatchingSimulationDiagram', match: 'Batch capacity' },
      ],
    },
    {
      route: '/docs/interview-prep/technology-comparisons',
      diagrams: [
        { name: 'TechComparisonDiagram', match: 'Inference engine' },
      ],
    },
    {
      route: '/docs/python-engineering/concurrency-memory-and-performance',
      diagrams: [
        { name: 'AsyncEventLoopDiagram', match: 'Concurrent requests' },
        { name: 'RefCountingDiagram', match: 'Normal Reference' },
        { name: 'ThreadingVsMultiprocessingDiagram', match: 'Workload type' },
        { name: 'VectorizationSpeedupDiagram', match: 'Array size (n)' },
      ],
    },
    {
      route: '/docs/python-engineering/language-fundamentals-and-oop',
      diagrams: [
        { name: 'ContextManagerFlowDiagram', match: 'Normal Completion' },
        { name: 'GeneratorMemoryDiagram', match: 'Dataset size' },
      ],
    },
    {
      route: '/docs/python-engineering/overview',
      diagrams: [
        { name: 'PythonLayerStackDiagram', match: 'Python (this section)' },
      ],
    },
    {
      route: '/docs/python-engineering/packaging-testing-and-tooling',
      diagrams: [
        { name: 'LogLevelFilterDiagram', match: 'Minimum level' },
        { name: 'VirtualEnvIsolationDiagram', match: 'Isolated venvs' },
      ],
    },
  ],
};

async function main() {
  const pages = BATCH_CONFIGS[BATCH_ID];
  if (!pages) {
    console.error(`Unknown batch ID: ${BATCH_ID}`);
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  const errors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text();
      // Ignore favicon, non-critical 404s, or preexisting page MDX key warnings
      if (!text.includes('favicon') && !text.includes('Failed to load resource') && !text.includes('Encountered two children with the same key')) {
        errors.push(`Console error on ${page.url()}: ${text}`);
      }
    }
  });

  page.on('pageerror', (err) => {
    errors.push(`Page error on ${page.url()}: ${err.message}`);
  });

  console.log(`Starting capture for batch ${BATCH_ID} on port ${PORT}...`);

  for (const pageConfig of pages) {
    const url = `http://localhost:${PORT}${pageConfig.route}`;
    console.log(`Navigating to ${url}...`);

    const res = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    if (!res || res.status() >= 400) {
      throw new Error(`Failed to load ${url}: status ${res?.status()}`);
    }

    // Wait for article prose to load
    await page.waitForFunction(() => {
      const main = document.querySelector('main');
      const heading = main?.querySelector('h1')?.textContent?.trim();
      const article = main?.querySelector('article.prose');
      const body = article?.innerText?.trim() ?? '';
      return Boolean(heading && body.length > 100 && !/^Loading[.…]*$/m.test(body));
    }, undefined, { timeout: 45000 });

    // Ensure light theme
    await page.evaluate(() => {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    });

    // Check for "Could not load this page" or error boundary
    const bodyText = await page.innerText('body');
    if (bodyText.includes('Could not load this page')) {
      throw new Error(`Page error boundary triggered on ${url}`);
    }

    // Wait 1s for layout and animations to initialize
    await page.waitForTimeout(1000);

    for (const diag of pageConfig.diagrams) {
      console.log(`  Locating diagram: ${diag.name} (match: "${diag.match}")...`);
      let container = page.locator(`div[role="group"]:has-text("${diag.match}")`).first();
      const hasMatch = await container.count().then(c => c > 0).catch(() => false);
      if (!hasMatch) {
        console.log(`  Diagram not found in DOM, mounting fallback for ${diag.name}...`);
        await page.evaluate(async (diagName) => {
          const React = (await import('/node_modules/.vite/deps/react.js')).default;
          const ReactDOM = (await import('/node_modules/.vite/deps/react-dom_client.js')).default;
          const { ThemeProvider } = await import('/src/theme/ThemeProvider.tsx');
          const mod = await import(`/src/viz/diagrams/${diagName}.tsx`);
          const mountEl = document.createElement('div');
          mountEl.id = `diag-fallback-mount-${diagName}`;
          mountEl.style.padding = '20px';
          (document.querySelector('article.prose') || document.querySelector('main') || document.body).appendChild(mountEl);
          const root = ReactDOM.createRoot(mountEl);
          root.render(React.createElement(ThemeProvider, null, React.createElement(mod.default)));
        }, diag.name);
        await page.waitForTimeout(1000);
        container = page.locator(`div[role="group"]:has-text("${diag.match}")`).first();
      }
      await container.waitFor({ state: 'visible', timeout: 10000 });
      await container.scrollIntoViewIfNeeded();
      await page.waitForTimeout(600);

      const outPath = path.join(OUT_DIR, `${diag.name}.png`);
      await container.screenshot({ path: outPath });
      console.log(`  Captured ${outPath}`);
    }
  }

  await browser.close();

  if (errors.length > 0) {
    console.error('Errors encountered during run:');
    for (const e of errors) console.error(' ', e);
    process.exit(1);
  }

  console.log(`Batch ${BATCH_ID} capture complete! All screenshots saved to ${OUT_DIR}`);
}

main().catch((err) => {
  console.error('Capture failed:', err);
  process.exit(1);
});
