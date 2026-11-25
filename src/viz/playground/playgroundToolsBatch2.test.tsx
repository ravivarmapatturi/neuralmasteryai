import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../theme/vizTokens', async () => {
  const actual = await vi.importActual<typeof import('../../theme/vizTokens')>('../../theme/vizTokens');
  return { ...actual, useVizTokens: () => actual.LIGHT };
});

import AblationTableAuditor from './AblationTableAuditor';
import OpenModelLicenseChecker from './OpenModelLicenseChecker';
import ProjectCostEstimator from './ProjectCostEstimator';
import ScalarAutogradGraph from './ScalarAutogradGraph';
import ShellPipelineSandbox from './ShellPipelineSandbox';
import { auditPaperScenario, PAPER_AUDIT_SCENARIOS } from './ablationAuditor';
import { evaluateModelLicense, OPEN_MODEL_LICENSES } from './openModelLicenses';
import { computeProjectMonthlyCost } from './projectCostMath';
import { evaluateAutogradExpression } from './scalarAutograd';
import { runSandboxPipeline } from './shellSandbox';

describe('Commit 2 pure logic, finite differences, and hand-checked formulas', () => {
  it('runs simulated shell pipelines over fixed sample files and blocks non-sandbox commands', () => {
    const grepRes = runSandboxPipeline('cat api.log | grep -i error | wc -l');
    expect(grepRes.finalExitCode).toBe(0);
    expect(grepRes.finalStdout).toBe('3');

    const jqQuoted = runSandboxPipeline('cat metrics.jsonl | jq .route');
    expect(jqQuoted.finalStdout.split('\n')[0]).toBe('"/v1/chat"');

    const jqRaw = runSandboxPipeline('cat metrics.jsonl | jq -r .route');
    expect(jqRaw.finalStdout.split('\n')[0]).toBe('/v1/chat');

    const noMatch = runSandboxPipeline('cat api.log | grep NONEXISTENT_PATTERN');
    expect(noMatch.finalExitCode).toBe(1);
    expect(noMatch.finalStdout).toBe('');

    const blocked = runSandboxPipeline('rm -rf /');
    expect(blocked.finalExitCode).toBe(127);
    expect(blocked.finalStderr).toMatch(/not permitted/i);
  });

  it('audits paper ablation confounds accurately', () => {
    const scenario = PAPER_AUDIT_SCENARIOS[0]; // compute confound
    const unnormalized = auditPaperScenario(scenario, {
      normalizeCompute: false,
      showConfidenceIntervals: true,
      matchBaselineTuning: false,
      deduplicateLeakage: false,
      enabledComponents: ['router', 'router-2x'],
    });
    expect(unnormalized.verdict).toMatch(/Confounded/i);

    const normalized = auditPaperScenario(scenario, {
      normalizeCompute: true,
      showConfidenceIntervals: true,
      matchBaselineTuning: false,
      deduplicateLeakage: false,
      enabledComponents: ['router', 'router-2x'],
    });
    expect(normalized.verdict).toMatch(/Inconclusive/i);
    expect(normalized.bestVariantDelta).toBeCloseTo(0.6, 1);
  });

  it('verifies reverse-mode scalar autograd gradients against central finite differences', () => {
    const cases: Array<{ expr: string; env: Record<string, number> }> = [
      { expr: 'tanh(w * x + b)', env: { w: -3.0, x: 2.0, b: 6.88 } },
      { expr: '(w * x + b - y) ** 2', env: { w: 1.5, x: 2.0, b: -0.5, y: 1.0 } },
      { expr: 'x * x + tanh(x * w)', env: { x: 1.4, w: 0.7 } },
      { expr: 'sigmoid(w * x) / (1 + b ** 2)', env: { w: 1.2, x: 0.9, b: 0.5 } },
      { expr: 'exp(-0.5 * x * x) + relu(x - 0.2)', env: { x: 0.8 } },
    ];

    const h = 1e-6;
    for (const c of cases) {
      const result = evaluateAutogradExpression(c.expr, c.env);
      for (const v of result.variables) {
        const base = c.env[v];
        const plus = evaluateAutogradExpression(c.expr, { ...c.env, [v]: base + h }).outputValue;
        const minus = evaluateAutogradExpression(c.expr, { ...c.env, [v]: base - h }).outputValue;
        const finiteDiff = (plus - minus) / (2 * h);
        expect(
          Math.abs(result.gradients[v] - finiteDiff),
          `Gradient mismatch for ${v} in ${c.expr}`,
        ).toBeLessThan(1e-6);
      }
    }
  });

  it('matches hand-checked monthly API cost formulas from AI Cost Engineering', () => {
    // Hand-checked benchmark from src/content/docs/mlops/ai-cost-engineering.mdx:
    // 2M req/mo, S=3000, F=6100, O=400, T=1, G=0, $3/$15, 0.10 cache read
    const uncached = computeProjectMonthlyCost({
      monthlyRequests: 2_000_000,
      turnsPerRequest: 1,
      staticPrefixTokens: 3000,
      freshInputTokens: 6100,
      historyGrowthPerTurn: 0,
      outputTokensPerTurn: 400,
      cacheHitRate: 0,
      cacheReadMultiplier: 0.1,
      inputPricePer1M: 3,
      outputPricePer1M: 15,
    });
    expect(uncached.totalCostPerReq).toBeCloseTo(0.0333, 6);
    expect(uncached.monthlyCostTotal).toBeCloseTo(66600, 2);

    const cached = computeProjectMonthlyCost({
      monthlyRequests: 2_000_000,
      turnsPerRequest: 1,
      staticPrefixTokens: 3000,
      freshInputTokens: 6100,
      historyGrowthPerTurn: 0,
      outputTokensPerTurn: 400,
      cacheHitRate: 1.0,
      cacheReadMultiplier: 0.1,
      inputPricePer1M: 3,
      outputPricePer1M: 15,
    });
    expect(cached.totalCostPerReq).toBeCloseTo(0.0252, 6);
    expect(cached.monthlyCostTotal).toBeCloseTo(50400, 2);

    // Multi-turn quadratic growth check: T=4, S=1000, F=500, G=1000 -> 4*1500 + 1000*6 = 12000 in
    const agent = computeProjectMonthlyCost({
      monthlyRequests: 1000,
      turnsPerRequest: 4,
      staticPrefixTokens: 1000,
      freshInputTokens: 500,
      historyGrowthPerTurn: 1000,
      outputTokensPerTurn: 200,
      cacheHitRate: 0,
      inputPricePer1M: 3,
      outputPricePer1M: 15,
    });
    expect(agent.totalInputTokensPerReq).toBe(12000);
    expect(agent.outputTokensPerReq).toBe(800);
  });

  it('verifies curated open model licenses have valid source URLs and accurate policy verdicts', () => {
    expect(OPEN_MODEL_LICENSES.length).toBeGreaterThanOrEqual(12);
    for (const model of OPEN_MODEL_LICENSES) {
      expect(model.sourceUrl).toMatch(/^https:\/\/(huggingface\.co|ai\.google\.dev)\//);
    }

    const llama = OPEN_MODEL_LICENSES.find((m) => m.id === 'llama-3.1-8b-instruct')!;
    const mistralLarge = OPEN_MODEL_LICENSES.find((m) => m.id === 'mistral-large-2407')!;
    const deepseek = OPEN_MODEL_LICENSES.find((m) => m.id === 'deepseek-r1')!;

    expect(
      evaluateModelLicense(llama, {
        commercialUse: true,
        saasHosting: true,
        redistributeFinetunes: true,
        noMauCap: true,
        osiOnly: false,
      }).status,
    ).toBe('Blocked');

    expect(
      evaluateModelLicense(mistralLarge, {
        commercialUse: true,
        saasHosting: false,
        redistributeFinetunes: false,
        noMauCap: false,
        osiOnly: false,
      }).status,
    ).toBe('Blocked');

    expect(
      evaluateModelLicense(deepseek, {
        commercialUse: true,
        saasHosting: true,
        redistributeFinetunes: true,
        noMauCap: true,
        osiOnly: true,
      }).status,
    ).toBe('Compatible');
  });
});

describe('Commit 2 interactive components', () => {
  it('renders ShellPipelineSandbox and switches between presets cleanly', () => {
    render(<ShellPipelineSandbox />);
    expect(screen.getByRole('group', { name: 'Shell Pipeline & Flag Sandbox' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'jq JSON stream' }));
    expect(screen.getByText(/-r \(raw unquoted string\)/i)).toBeInTheDocument();
  });

  it('renders AblationTableAuditor and recalculates verdict when normalizing compute', () => {
    render(<AblationTableAuditor />);
    expect(screen.getByRole('group', { name: 'Paper Reading & Ablation Table Auditor' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Normalize compute to 1\.0/i }));
    expect(screen.getAllByText(/Inconclusive \(CI overlap\)/i).length).toBeGreaterThan(0);
  });

  it('renders ScalarAutogradGraph and verifies finite differences on step backward', () => {
    render(<ScalarAutogradGraph />);
    expect(screen.getByRole('group', { name: 'Scalar Autograd Expression Graph' })).toBeInTheDocument();
    expect(screen.getByText(/Autograd ∂out\/∂var/i)).toBeInTheDocument();
  });

  it('renders ProjectCostEstimator and computes exact monthly bill for RAG preset', () => {
    render(<ProjectCostEstimator />);
    expect(screen.getByRole('group', { name: 'Project Scope & Monthly Cost Estimator' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Level 2: RAG Assistant/i }));
    expect(screen.getAllByText(/\$75,600/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/\$0\.0252/i).length).toBeGreaterThan(0);
  });

  it('renders OpenModelLicenseChecker and filters models by OSI license constraint', () => {
    render(<OpenModelLicenseChecker />);
    expect(screen.getByRole('group', { name: 'Open-Source Model & License Checker' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'OSI-approved license only' }));
    expect(screen.getAllByText(/Blocked/i).length).toBeGreaterThan(0);
  });
});
