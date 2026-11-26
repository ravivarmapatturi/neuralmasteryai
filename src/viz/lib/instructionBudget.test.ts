import { describe, expect, it } from 'vitest';
import { buildInstructionBudgetTrace, calculateInstructionBudget } from './instructionBudget';

const BASE = {
  fileCount: 10,
  tokensPerFile: 100,
  mapTokensPerFile: 10,
  instructionTokens: 200,
  verificationTokens: 100,
  contextWindow: 2_000,
} as const;

describe('instruction budget', () => {
  it('adds every inline allocation exactly', () => {
    const result = calculateInstructionBudget({ ...BASE, strategy: 'inline' });
    expect(result.totalTokens).toBe(1_300);
    expect(result.remainingTokens).toBe(700);
    expect(result.utilization).toBeCloseTo(0.65);
  });

  it('uses map tokens per file for the map strategy', () => {
    const result = calculateInstructionBudget({ ...BASE, strategy: 'map' });
    expect(result.totalTokens).toBe(400);
    expect(result.remainingTokens).toBe(1_600);
  });

  it('ends the teaching trace at the requested file count', () => {
    const trace = buildInstructionBudgetTrace({ ...BASE, strategy: 'inline' }, 4);
    expect(trace[0].loadedFiles).toBe(0);
    expect(trace.at(-1)?.loadedFiles).toBe(10);
    expect(trace.at(-1)?.result.totalTokens).toBe(1_300);
  });
});
