export type AgentSpanKind = 'session' | 'model' | 'tool' | 'retry' | 'verify';

export interface AgentTraceConfig {
  task: string;
  planInputTokens: number;
  planOutputTokens: number;
  patchInputTokens: number;
  patchOutputTokens: number;
  tokensPerSecond: number;
  toolLatencyMs: number;
  verificationMs: number;
  retries: number;
  inputPricePerMillion: number;
  outputPricePerMillion: number;
}

export interface AgentSpan {
  id: string;
  label: string;
  detail: string;
  kind: AgentSpanKind;
  parentId?: string;
  startMs: number;
  durationMs: number;
  endMs: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}

export interface AgentTraceResult {
  spans: AgentSpan[];
  totalDurationMs: number;
  totalTokens: number;
  totalCostUsd: number;
}

const MODEL_FIXED_MS = 120;

function finiteAtLeast(value: number, minimum: number): number {
  return Math.max(minimum, Number.isFinite(value) ? value : minimum);
}

export function calculateTokenCost(
  inputTokens: number,
  outputTokens: number,
  inputPricePerMillion: number,
  outputPricePerMillion: number,
): number {
  return (
    finiteAtLeast(inputTokens, 0) * finiteAtLeast(inputPricePerMillion, 0)
    + finiteAtLeast(outputTokens, 0) * finiteAtLeast(outputPricePerMillion, 0)
  ) / 1_000_000;
}

export function calculateModelDuration(outputTokens: number, tokensPerSecond: number): number {
  return MODEL_FIXED_MS + (finiteAtLeast(outputTokens, 0) / finiteAtLeast(tokensPerSecond, 1)) * 1_000;
}

/**
 * Builds a deterministic sequential trace. Model spans use generated tokens / model
 * speed plus a 120 ms fixed overhead; tool and verification spans use the editable
 * latencies directly. The numbers are a transparent teaching model, not a benchmark.
 */
export function buildAgentTrace(config: AgentTraceConfig): AgentTraceResult {
  const spans: AgentSpan[] = [];
  let cursor = 0;

  const pushSpan = (
    id: string,
    label: string,
    detail: string,
    kind: Exclude<AgentSpanKind, 'session'>,
    durationMs: number,
    inputTokens = 0,
    outputTokens = 0,
  ) => {
    const safeDuration = finiteAtLeast(durationMs, 0);
    const span: AgentSpan = {
      id,
      label,
      detail,
      kind,
      parentId: 'session',
      startMs: cursor,
      durationMs: safeDuration,
      endMs: cursor + safeDuration,
      inputTokens,
      outputTokens,
      costUsd: kind === 'model' || kind === 'retry'
        ? calculateTokenCost(
            inputTokens,
            outputTokens,
            config.inputPricePerMillion,
            config.outputPricePerMillion,
          )
        : 0,
    };
    spans.push(span);
    cursor = span.endMs;
  };

  pushSpan(
    'plan',
    'Plan with the model',
    'The model reads the task and writes a plan.',
    'model',
    calculateModelDuration(config.planOutputTokens, config.tokensPerSecond),
    finiteAtLeast(config.planInputTokens, 0),
    finiteAtLeast(config.planOutputTokens, 0),
  );
  pushSpan(
    'search',
    'Search the code',
    'A tool finds files related to the task.',
    'tool',
    finiteAtLeast(config.toolLatencyMs, 0),
  );
  pushSpan(
    'read',
    'Read the files',
    'A second tool loads the exact source that will change.',
    'tool',
    finiteAtLeast(config.toolLatencyMs, 0) * 0.6,
  );
  pushSpan(
    'patch',
    'Write the patch',
    'The model turns the plan and source into an edit.',
    'model',
    calculateModelDuration(config.patchOutputTokens, config.tokensPerSecond),
    finiteAtLeast(config.patchInputTokens, 0),
    finiteAtLeast(config.patchOutputTokens, 0),
  );

  const retryCount = Math.max(0, Math.min(4, Math.round(config.retries)));
  for (let index = 0; index < retryCount; index += 1) {
    const retryInput = Math.round(finiteAtLeast(config.patchInputTokens, 0) * 0.4);
    const retryOutput = Math.round(finiteAtLeast(config.patchOutputTokens, 0) * 0.35);
    pushSpan(
      `retry-${index + 1}`,
      `Repair attempt ${index + 1}`,
      'A failed check is fed back to the model, which writes a smaller repair.',
      'retry',
      calculateModelDuration(retryOutput, config.tokensPerSecond),
      retryInput,
      retryOutput,
    );
  }

  pushSpan(
    'verify',
    'Run verification',
    'Tests and type checks decide whether the result is ready.',
    'verify',
    finiteAtLeast(config.verificationMs, 0),
  );

  const childCost = spans.reduce((sum, span) => sum + span.costUsd, 0);
  const childTokens = spans.reduce((sum, span) => sum + span.inputTokens + span.outputTokens, 0);
  const session: AgentSpan = {
    id: 'session',
    label: config.task.trim() || 'Agent task',
    detail: 'The root span contains every model, tool, repair, and verification span.',
    kind: 'session',
    startMs: 0,
    durationMs: cursor,
    endMs: cursor,
    inputTokens: 0,
    outputTokens: 0,
    costUsd: childCost,
  };

  return {
    spans: [session, ...spans],
    totalDurationMs: cursor,
    totalTokens: childTokens,
    totalCostUsd: childCost,
  };
}

// Kept for AgentExecutionGraph, which uses a separate scripted ReAct lesson.
export type StepType = 'thought' | 'action' | 'observation' | 'answer';

export interface AgentStep {
  type: StepType;
  title: string;
  detail: string;
}

export interface Scenario {
  label: string;
  query: string;
  steps: AgentStep[];
}

export const SCENARIOS: Record<string, Scenario> = {
  weather: {
    label: 'Weather lookup',
    query: 'What’s the current weather in the capital of France, in Fahrenheit?',
    steps: [
      { type: 'thought', title: 'Thought', detail: 'I need the capital of France, then its current weather, then I’ll need to convert Celsius to Fahrenheit.' },
      { type: 'action', title: 'Action', detail: 'search(query="capital of France")' },
      { type: 'observation', title: 'Observation', detail: 'Paris is the capital of France.' },
      { type: 'thought', title: 'Thought', detail: 'Now I need the current weather in Paris.' },
      { type: 'action', title: 'Action', detail: 'get_weather(city="Paris")' },
      { type: 'observation', title: 'Observation', detail: '18°C, partly cloudy (demo data).' },
      { type: 'thought', title: 'Thought', detail: '18×9/5+32 = 64.4. I have both facts I need -- ready to answer.' },
      { type: 'answer', title: 'Answer', detail: 'It’s currently 64.4°F and partly cloudy in Paris, the capital of France.' },
    ],
  },
  marketcap: {
    label: 'Company lookup',
    query: 'How many employees does the company with the highest market cap have?',
    steps: [
      { type: 'thought', title: 'Thought', detail: 'First I need to find which public company currently has the highest market cap.' },
      { type: 'action', title: 'Action', detail: 'search(query="company with highest market cap")' },
      { type: 'observation', title: 'Observation', detail: '"Company X" has the highest market cap at $3.5T (demo data).' },
      { type: 'thought', title: 'Thought', detail: 'Now I need that company’s employee count.' },
      { type: 'action', title: 'Action', detail: 'search(query="Company X employee count")' },
      { type: 'observation', title: 'Observation', detail: 'Company X employs approximately 164,000 people (demo data).' },
      { type: 'thought', title: 'Thought', detail: 'I have both facts needed -- ready to answer.' },
      { type: 'answer', title: 'Answer', detail: 'The company with the highest market cap ("Company X") employs about 164,000 people.' },
    ],
  },
};

export const STEP_NODE: Record<StepType, StepType> = {
  thought: 'thought',
  action: 'action',
  observation: 'observation',
  answer: 'answer',
};
