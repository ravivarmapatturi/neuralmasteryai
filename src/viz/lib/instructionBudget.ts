export type InstructionStrategy = 'inline' | 'map';

export interface InstructionBudgetConfig {
  strategy: InstructionStrategy;
  fileCount: number;
  tokensPerFile: number;
  mapTokensPerFile: number;
  instructionTokens: number;
  verificationTokens: number;
  contextWindow: number;
}

export interface BudgetAllocation {
  id: 'instructions' | 'repository' | 'verification';
  label: string;
  tokens: number;
}

export interface InstructionBudgetResult {
  allocations: BudgetAllocation[];
  totalTokens: number;
  remainingTokens: number;
  overflowTokens: number;
  utilization: number;
  fits: boolean;
}

function safeWhole(value: number, minimum: number): number {
  return Math.max(minimum, Math.round(Number.isFinite(value) ? value : minimum));
}

export function calculateInstructionBudget(input: InstructionBudgetConfig): InstructionBudgetResult {
  const fileCount = safeWhole(input.fileCount, 0);
  const perFile = input.strategy === 'inline'
    ? safeWhole(input.tokensPerFile, 0)
    : safeWhole(input.mapTokensPerFile, 0);
  const contextWindow = safeWhole(input.contextWindow, 1);
  const allocations: BudgetAllocation[] = [
    { id: 'instructions', label: 'Instructions', tokens: safeWhole(input.instructionTokens, 0) },
    { id: 'repository', label: input.strategy === 'inline' ? 'Full source files' : 'Repository map', tokens: fileCount * perFile },
    { id: 'verification', label: 'Verification notes', tokens: safeWhole(input.verificationTokens, 0) },
  ];
  const totalTokens = allocations.reduce((sum, allocation) => sum + allocation.tokens, 0);
  return {
    allocations,
    totalTokens,
    remainingTokens: Math.max(0, contextWindow - totalTokens),
    overflowTokens: Math.max(0, totalTokens - contextWindow),
    utilization: totalTokens / contextWindow,
    fits: totalTokens <= contextWindow,
  };
}

export function buildInstructionBudgetTrace(
  input: InstructionBudgetConfig,
  steps = 6,
): { loadedFiles: number; result: InstructionBudgetResult }[] {
  const totalFiles = safeWhole(input.fileCount, 0);
  const count = Math.max(2, safeWhole(steps, 2));
  const fileCounts = Array.from({ length: count }, (_, index) => Math.round((totalFiles * index) / (count - 1)));
  return [...new Set(fileCounts)].map((loadedFiles) => ({
    loadedFiles,
    result: calculateInstructionBudget({ ...input, fileCount: loadedFiles }),
  }));
}
