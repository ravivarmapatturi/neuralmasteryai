import { describe, expect, it } from 'vitest';
import { buildAgentExecution } from './agentExecutionGraph';

describe('agent execution graph', () => {
  it('adds exact model and tool durations for ReAct', () => {
    const result = buildAgentExecution({
      architecture: 'react', goal: 'Find two facts', toolCalls: 2,
      failAtCall: 0, retryBudget: 1, modelStepMs: 100, toolStepMs: 200,
    });
    // Think + decide + answer = 3 model steps; two observations = 2 tool steps.
    expect(result.totalMs).toBe(700);
    expect(result.toolAttempts).toBe(2);
    expect(result.completed).toBe(true);
  });

  it('retries one failed tool call when budget permits', () => {
    const result = buildAgentExecution({
      architecture: 'react', goal: 'Look up a fact', toolCalls: 1,
      failAtCall: 1, retryBudget: 1, modelStepMs: 100, toolStepMs: 200,
    });
    expect(result.retriesUsed).toBe(1);
    expect(result.toolAttempts).toBe(2);
    expect(result.totalMs).toBe(800);
  });

  it('stops safely when a failed call has no retry budget', () => {
    const result = buildAgentExecution({
      architecture: 'plan-execute', goal: 'Run one task', toolCalls: 1,
      failAtCall: 1, retryBudget: 0, modelStepMs: 100, toolStepMs: 200,
    });
    expect(result.completed).toBe(false);
    expect(result.totalMs).toBe(400);
    expect(result.steps.at(-1)?.phase).toBe('Stop safely');
  });
});
