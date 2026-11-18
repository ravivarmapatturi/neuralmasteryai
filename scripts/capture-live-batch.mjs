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
      // Ignore favicon or non-critical 404s
      if (!text.includes('favicon') && !text.includes('Failed to load resource')) {
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
      const container = page.locator(`div[role="group"]:has-text("${diag.match}")`).first();
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
