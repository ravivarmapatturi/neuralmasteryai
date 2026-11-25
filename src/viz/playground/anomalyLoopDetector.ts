export interface TraceTurn {
  turn: number;
  tool: string;
  args: Record<string, unknown>;
  exitCode: number;
  tokens: number;
  costUsd: number;
}

export interface AgentTrace {
  id: string;
  title: string;
  isAnomaly: boolean;
  category: string;
  summary: string;
  turns: TraceTurn[];
}

export interface DetectorConfig {
  maxRepeatFailures: number;
  pingPongEnabled: boolean;
  costSpikeZScore: number;
  windowSize: number;
}

export interface TraceEvaluation {
  trace: AgentTrace;
  flagged: boolean;
  triggeredTurn: number | null;
  triggerReason: string | null;
  maxZScore: number;
  tokensBeforeStop: number;
  totalTraceTokens: number;
  tokensSaved: number;
  turnDiagnostics: Array<{
    turn: number;
    signature: string;
    zScore: number;
    alarm: string | null;
  }>;
}

export interface SuiteMetrics {
  tp: number;
  fp: number;
  fn: number;
  tn: number;
  precision: number;
  recall: number;
  f1: number;
  totalTokensSaved: number;
  falseAlarmTokensLost: number;
  evaluations: TraceEvaluation[];
}

function sortValue(val: unknown): unknown {
  if (Array.isArray(val)) return val.map(sortValue);
  if (val && typeof val === 'object') {
    const sorted: Record<string, unknown> = {};
    for (const k of Object.keys(val as Record<string, unknown>).sort()) {
      sorted[k] = sortValue((val as Record<string, unknown>)[k]);
    }
    return sorted;
  }
  return val;
}

/**
 * Deterministic order-sorted signature independent of JSON key order, matching
 * the production sentinel pattern in Failure Taxonomy & Anomaly Detection.
 */
export function orderSortedSignature(tool: string, args: Record<string, unknown>): string {
  const normalized = JSON.stringify(sortValue(args));
  // FNV-1a 32-bit hash rendered in hex for compact deterministic display
  let hash = 0x811c9dc5;
  const payload = `${tool}:${normalized}`;
  for (let i = 0; i < payload.length; i += 1) {
    hash ^= payload.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return `${tool}#${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

export function computeWindowZScore(historyCosts: readonly number[], currentCost: number): number {
  if (historyCosts.length < 2) return 0;
  const mean = historyCosts.reduce((sum, v) => sum + v, 0) / historyCosts.length;
  const variance =
    historyCosts.reduce((sum, v) => sum + (v - mean) ** 2, 0) / historyCosts.length;
  const std = Math.sqrt(variance);
  if (std < 1e-9) {
    return currentCost > mean * 2 ? 4.0 : 0;
  }
  return (currentCost - mean) / std;
}

export function evaluateTrace(trace: AgentTrace, config: DetectorConfig): TraceEvaluation {
  const diagnostics: TraceEvaluation['turnDiagnostics'] = [];
  const sigs: string[] = [];
  let triggeredTurn: number | null = null;
  let triggerReason: string | null = null;
  let maxZScore = 0;

  for (let i = 0; i < trace.turns.length; i += 1) {
    const current = trace.turns[i];
    const sig = orderSortedSignature(current.tool, current.args);
    sigs.push(sig);

    const startIdx = Math.max(0, i - config.windowSize);
    const baselineCosts = trace.turns.slice(startIdx, i).map((t) => t.costUsd);
    const zScore = computeWindowZScore(baselineCosts, current.costUsd);
    maxZScore = Math.max(maxZScore, zScore);

    let alarm: string | null = null;

    // 1. Consecutive identical failing tool calls (within trailing K)
    if (i + 1 >= config.maxRepeatFailures) {
      const recent = trace.turns.slice(i + 1 - config.maxRepeatFailures, i + 1);
      const recentSigs = sigs.slice(i + 1 - config.maxRepeatFailures, i + 1);
      if (recentSigs.every((s) => s === sig) && recent.every((r) => r.exitCode !== 0)) {
        alarm = `Direct failure loop (${config.maxRepeatFailures}x identical failing ${current.tool})`;
      }
    }

    // 2. Ping-pong 4-turn oscillation A -> B -> A -> B
    if (!alarm && config.pingPongEnabled && i >= 3) {
      const s1 = sigs[i - 3];
      const s2 = sigs[i - 2];
      const s3 = sigs[i - 1];
      const s4 = sigs[i];
      if (s1 === s3 && s2 === s4 && s1 !== s2) {
        alarm = `Ping-pong cycle (${trace.turns[i - 3].tool} <-> ${trace.turns[i - 2].tool})`;
      }
    }

    // 3. Cost spike z-score within sliding baseline window
    if (!alarm && zScore >= config.costSpikeZScore && baselineCosts.length >= 3) {
      alarm = `Cost spike z=${zScore.toFixed(2)} >= ${config.costSpikeZScore.toFixed(2)}`;
    }

    if (alarm && triggeredTurn === null) {
      triggeredTurn = current.turn;
      triggerReason = alarm;
    }

    diagnostics.push({
      turn: current.turn,
      signature: sig,
      zScore,
      alarm,
    });
  }

  const totalTraceTokens = trace.turns.reduce((sum, t) => sum + t.tokens, 0);
  const tokensBeforeStop =
    triggeredTurn === null
      ? totalTraceTokens
      : trace.turns
          .filter((t) => t.turn <= triggeredTurn)
          .reduce((sum, t) => sum + t.tokens, 0);

  return {
    trace,
    flagged: triggeredTurn !== null,
    triggeredTurn,
    triggerReason,
    maxZScore,
    tokensBeforeStop,
    totalTraceTokens,
    tokensSaved: totalTraceTokens - tokensBeforeStop,
    turnDiagnostics: diagnostics,
  };
}

export function evaluateAgentSuite(
  traces: readonly AgentTrace[],
  config: DetectorConfig,
): SuiteMetrics {
  const evaluations = traces.map((trace) => evaluateTrace(trace, config));
  let tp = 0;
  let fp = 0;
  let fn = 0;
  let tn = 0;
  let totalTokensSaved = 0;
  let falseAlarmTokensLost = 0;

  for (const ev of evaluations) {
    if (ev.trace.isAnomaly && ev.flagged) {
      tp += 1;
      totalTokensSaved += ev.tokensSaved;
    } else if (!ev.trace.isAnomaly && ev.flagged) {
      fp += 1;
      falseAlarmTokensLost += ev.tokensSaved;
    } else if (ev.trace.isAnomaly && !ev.flagged) {
      fn += 1;
    } else {
      tn += 1;
    }
  }

  const precision = tp + fp > 0 ? tp / (tp + fp) : 1;
  const recall = tp + fn > 0 ? tp / (tp + fn) : 1;
  const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

  return {
    tp,
    fp,
    fn,
    tn,
    precision,
    recall,
    f1,
    totalTokensSaved,
    falseAlarmTokensLost,
    evaluations,
  };
}

export const SAMPLE_AGENT_TRACES: AgentTrace[] = [
  {
    id: 'loop-chmod',
    title: 'Permission-denied edit spiral (5x)',
    isAnomaly: true,
    category: 'Direct loop',
    summary: 'Agent keeps calling edit_file on a read-only config file with reordered JSON keys.',
    turns: [
      { turn: 1, tool: 'read_file', args: { path: 'etc/prod.yml' }, exitCode: 0, tokens: 1200, costUsd: 0.012 },
      { turn: 2, tool: 'edit_file', args: { path: 'etc/prod.yml', mode: 'replace' }, exitCode: 13, tokens: 1500, costUsd: 0.015 },
      { turn: 3, tool: 'edit_file', args: { mode: 'replace', path: 'etc/prod.yml' }, exitCode: 13, tokens: 1650, costUsd: 0.017 },
      { turn: 4, tool: 'edit_file', args: { path: 'etc/prod.yml', mode: 'replace' }, exitCode: 13, tokens: 1800, costUsd: 0.018 },
      { turn: 5, tool: 'edit_file', args: { mode: 'replace', path: 'etc/prod.yml' }, exitCode: 13, tokens: 1950, costUsd: 0.020 },
      { turn: 6, tool: 'edit_file', args: { path: 'etc/prod.yml', mode: 'replace' }, exitCode: 13, tokens: 2100, costUsd: 0.021 },
    ],
  },
  {
    id: 'pingpong-npm',
    title: 'Test <-> install ping-pong cycle',
    isAnomaly: true,
    category: 'Ping-pong',
    summary: 'Alternates npm_test (exit 1) and npm_install (exit 0) without fixing lockfile.',
    turns: [
      { turn: 1, tool: 'npm_test', args: { target: 'auth' }, exitCode: 1, tokens: 1400, costUsd: 0.014 },
      { turn: 2, tool: 'npm_install', args: { pkg: 'jose' }, exitCode: 0, tokens: 1500, costUsd: 0.015 },
      { turn: 3, tool: 'npm_test', args: { target: 'auth' }, exitCode: 1, tokens: 1600, costUsd: 0.016 },
      { turn: 4, tool: 'npm_install', args: { pkg: 'jose' }, exitCode: 0, tokens: 1700, costUsd: 0.017 },
      { turn: 5, tool: 'npm_test', args: { target: 'auth' }, exitCode: 1, tokens: 1800, costUsd: 0.018 },
      { turn: 6, tool: 'npm_install', args: { pkg: 'jose' }, exitCode: 0, tokens: 1900, costUsd: 0.019 },
    ],
  },
  {
    id: 'csv-spike',
    title: 'Raw 15 MB log stdout spike',
    isAnomaly: true,
    category: 'Cost spike',
    summary: 'Normal variable turns until turn 5 dumps un-truncated CSV rows into context.',
    turns: [
      { turn: 1, tool: 'list_dir', args: { dir: 'logs' }, exitCode: 0, tokens: 900, costUsd: 0.009 },
      { turn: 2, tool: 'head', args: { file: 'logs/jobs.csv', n: 5 }, exitCode: 0, tokens: 1600, costUsd: 0.016 },
      { turn: 3, tool: 'grep', args: { pattern: 'ERROR', file: 'logs/jobs.csv' }, exitCode: 0, tokens: 1100, costUsd: 0.011 },
      { turn: 4, tool: 'stat', args: { file: 'logs/jobs.csv' }, exitCode: 0, tokens: 1900, costUsd: 0.019 },
      { turn: 5, tool: 'cat', args: { file: 'logs/jobs.csv' }, exitCode: 0, tokens: 29000, costUsd: 0.029 },
      { turn: 6, tool: 'cat', args: { file: 'logs/jobs.csv' }, exitCode: 0, tokens: 34000, costUsd: 0.034 },
    ],
  },
  {
    id: 'short-retry-spiral',
    title: 'Tight 2-step failing query loop',
    isAnomaly: true,
    category: 'Direct loop',
    summary: 'Fails twice on a missing SQL column before burning extra diagnostic calls.',
    turns: [
      { turn: 1, tool: 'sql_query', args: { q: 'SELECT tenant FROM users' }, exitCode: 1, tokens: 1300, costUsd: 0.013 },
      { turn: 2, tool: 'sql_query', args: { q: 'SELECT tenant FROM users' }, exitCode: 1, tokens: 1400, costUsd: 0.014 },
      { turn: 3, tool: 'sql_query', args: { q: 'SELECT tenant FROM users' }, exitCode: 1, tokens: 1500, costUsd: 0.015 },
    ],
  },
  {
    id: 'pingpong-git-grep',
    title: 'Git status <-> grep oscillation',
    isAnomaly: true,
    category: 'Ping-pong',
    summary: 'Loops between git_status and grep without editing any file.',
    turns: [
      { turn: 1, tool: 'git_status', args: { short: true }, exitCode: 0, tokens: 800, costUsd: 0.008 },
      { turn: 2, tool: 'grep', args: { pattern: 'TODO' }, exitCode: 0, tokens: 950, costUsd: 0.010 },
      { turn: 3, tool: 'git_status', args: { short: true }, exitCode: 0, tokens: 1050, costUsd: 0.011 },
      { turn: 4, tool: 'grep', args: { pattern: 'TODO' }, exitCode: 0, tokens: 1150, costUsd: 0.012 },
      { turn: 5, tool: 'git_status', args: { short: true }, exitCode: 0, tokens: 1250, costUsd: 0.013 },
    ],
  },
  {
    id: 'gradual-drift-spike',
    title: 'Accumulated history cost surge',
    isAnomaly: true,
    category: 'Cost spike',
    summary: 'Each turn appends uncompacted tool diffs until token spend spikes sharply.',
    turns: [
      { turn: 1, tool: 'read_file', args: { path: 'a.ts' }, exitCode: 0, tokens: 1500, costUsd: 0.015 },
      { turn: 2, tool: 'read_file', args: { path: 'b.ts' }, exitCode: 0, tokens: 2400, costUsd: 0.024 },
      { turn: 3, tool: 'read_file', args: { path: 'c.ts' }, exitCode: 0, tokens: 1800, costUsd: 0.018 },
      { turn: 4, tool: 'read_file', args: { path: 'd.ts' }, exitCode: 0, tokens: 2600, costUsd: 0.026 },
      { turn: 5, tool: 'run_build', args: { verbose: true }, exitCode: 0, tokens: 35000, costUsd: 0.035 },
    ],
  },
  {
    id: 'healthy-multifile-refactor',
    title: 'Healthy 5-file TypeScript refactor',
    isAnomaly: false,
    category: 'Healthy',
    summary: 'Reads schema, edits 3 different files, runs typecheck and tests once.',
    turns: [
      { turn: 1, tool: 'read_file', args: { path: 'src/types.ts' }, exitCode: 0, tokens: 1200, costUsd: 0.012 },
      { turn: 2, tool: 'edit_file', args: { path: 'src/types.ts' }, exitCode: 0, tokens: 2200, costUsd: 0.022 },
      { turn: 3, tool: 'edit_file', args: { path: 'src/api.ts' }, exitCode: 0, tokens: 1500, costUsd: 0.015 },
      { turn: 4, tool: 'edit_file', args: { path: 'src/api.test.ts' }, exitCode: 0, tokens: 2400, costUsd: 0.024 },
      { turn: 5, tool: 'run_pytest', args: { path: 'src/api.test.ts' }, exitCode: 0, tokens: 2600, costUsd: 0.026 },
    ],
  },
  {
    id: 'healthy-debug-fix-pass',
    title: 'Healthy TDD fail-fix-pass cycle',
    isAnomaly: false,
    category: 'Healthy',
    summary: 'Runs test (fails), edits code, re-runs same test (passes) — normal TDD.',
    turns: [
      { turn: 1, tool: 'run_pytest', args: { suite: 'unit' }, exitCode: 1, tokens: 1300, costUsd: 0.013 },
      { turn: 2, tool: 'read_file', args: { path: 'auth.py' }, exitCode: 0, tokens: 2100, costUsd: 0.021 },
      { turn: 3, tool: 'edit_file', args: { path: 'auth.py' }, exitCode: 0, tokens: 1600, costUsd: 0.016 },
      { turn: 4, tool: 'run_pytest', args: { suite: 'unit' }, exitCode: 0, tokens: 2300, costUsd: 0.023 },
    ],
  },
  {
    id: 'healthy-retry-twice',
    title: 'Transient network flake (2 fails, then succeeds)',
    isAnomaly: false,
    category: 'Healthy',
    summary: 'Two transient 503 retries on fetch_schema followed by a clean 200 on attempt 3.',
    turns: [
      { turn: 1, tool: 'read_file', args: { path: 'client.py' }, exitCode: 0, tokens: 1100, costUsd: 0.011 },
      { turn: 2, tool: 'fetch_schema', args: { env: 'staging' }, exitCode: 1, tokens: 1900, costUsd: 0.019 },
      { turn: 3, tool: 'fetch_schema', args: { env: 'staging' }, exitCode: 1, tokens: 1400, costUsd: 0.014 },
      { turn: 4, tool: 'fetch_schema', args: { env: 'staging' }, exitCode: 0, tokens: 2000, costUsd: 0.020 },
    ],
  },
  {
    id: 'healthy-large-docs-read',
    title: 'Healthy gradual context growth + test suite',
    isAnomaly: false,
    category: 'Healthy',
    summary: 'Reads three spec sections cleanly, then triggers full test run with modestly higher output.',
    turns: [
      { turn: 1, tool: 'read_file', args: { path: 'docs/spec.md', start: 1 }, exitCode: 0, tokens: 1400, costUsd: 0.014 },
      { turn: 2, tool: 'read_file', args: { path: 'docs/spec.md', start: 100 }, exitCode: 0, tokens: 2500, costUsd: 0.025 },
      { turn: 3, tool: 'read_file', args: { path: 'docs/spec.md', start: 200 }, exitCode: 0, tokens: 1800, costUsd: 0.018 },
      { turn: 4, tool: 'edit_file', args: { path: 'parser.py' }, exitCode: 0, tokens: 2700, costUsd: 0.027 },
      { turn: 5, tool: 'run_pytest', args: { suite: 'all' }, exitCode: 0, tokens: 3000, costUsd: 0.030 },
    ],
  },
  {
    id: 'healthy-grep-distinct',
    title: 'Healthy symbol search across modules',
    isAnomaly: false,
    category: 'Healthy',
    summary: 'Runs distinct grep patterns across modules without repeating identical failed calls.',
    turns: [
      { turn: 1, tool: 'grep', args: { pattern: 'CacheKey' }, exitCode: 0, tokens: 900, costUsd: 0.009 },
      { turn: 2, tool: 'grep', args: { pattern: 'buildPrefix' }, exitCode: 0, tokens: 1600, costUsd: 0.016 },
      { turn: 3, tool: 'read_file', args: { path: 'cache.ts' }, exitCode: 0, tokens: 1100, costUsd: 0.011 },
      { turn: 4, tool: 'edit_file', args: { path: 'cache.ts' }, exitCode: 0, tokens: 1800, costUsd: 0.018 },
    ],
  },
  {
    id: 'healthy-two-test-passes',
    title: 'Lint then unit test then integration test',
    isAnomaly: false,
    category: 'Healthy',
    summary: 'Runs three distinct checks in sequence, all exiting cleanly with steady token volume.',
    turns: [
      { turn: 1, tool: 'run_lint', args: { path: 'src/' }, exitCode: 0, tokens: 1000, costUsd: 0.010 },
      { turn: 2, tool: 'run_typecheck', args: { path: 'tsconfig.json' }, exitCode: 0, tokens: 1700, costUsd: 0.017 },
      { turn: 3, tool: 'run_pytest', args: { suite: 'unit' }, exitCode: 0, tokens: 1200, costUsd: 0.012 },
      { turn: 4, tool: 'run_pytest', args: { suite: 'integration' }, exitCode: 0, tokens: 1900, costUsd: 0.019 },
    ],
  },
];
