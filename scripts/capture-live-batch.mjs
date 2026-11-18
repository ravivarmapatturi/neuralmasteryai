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
