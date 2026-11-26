/**
 * Pure simulation and memory analysis for Python eager lists (`return [...]`)
 * vs lazy generators (`yield item`). Every figure is computed directly from
 * dataset size N, item footprint, and RAM ceiling.
 */

export type PipelineMode = 'list' | 'generator';
export type MemoryScaleMode = 'linear' | 'log';

export interface MemoryTraceStep {
  step: number;
  phase: 'produce' | 'consume' | 'done';
  activeItem: number | null;
  itemsInRam: number[];
  freedItems: number[];
  ramKb: number;
  explain: string;
}

export interface MemoryCurvePoint {
  n: number;
  listKb: number;
  generatorKb: number;
}

export interface GeneratorMemoryAnalysis {
  n: number;
  itemSizeKb: number;
  ramBudgetMb: number;
  listKb: number;
  listMb: number;
  generatorKb: number;
  generatorMb: number;
  savingsFactor: number;
  listExceedsBudget: boolean;
  generatorExceedsBudget: boolean;
  oomThresholdN: number;
  curve: MemoryCurvePoint[];
  trace: MemoryTraceStep[];
}

export const SAMPLE_STREAM_COUNT = 6;
export const MAX_DATASET_N = 20000;

export function listMemoryKb(n: number, itemSizeKb = 50): number {
  return Math.max(0, n) * Math.max(1, itemSizeKb);
}

export function generatorMemoryKb(itemSizeKb = 50): number {
  return Math.max(1, itemSizeKb);
}

export function buildMemoryTrace(
  mode: PipelineMode,
  itemSizeKb: number,
  sampleCount = SAMPLE_STREAM_COUNT,
): MemoryTraceStep[] {
  const steps: MemoryTraceStep[] = [];
  if (mode === 'list') {
    for (let k = 1; k <= sampleCount; k++) {
      const held = Array.from({ length: k }, (_, i) => i + 1);
      const ramKb = held.length * itemSizeKb;
      steps.push({
        step: k,
        phase: 'produce',
        activeItem: k,
        itemsInRam: held,
        freedItems: [],
        ramKb,
        explain: `List appends item ${k} before the loop even starts: ${k} items (${ramKb.toLocaleString('en-US')} KB) sit in RAM at once.`,
      });
    }
    const full = Array.from({ length: sampleCount }, (_, i) => i + 1);
    const fullKb = full.length * itemSizeKb;
    steps.push({
      step: sampleCount + 1,
      phase: 'consume',
      activeItem: 1,
      itemsInRam: full,
      freedItems: [],
      ramKb: fullKb,
      explain: `Training loop reads item 1, while items 2–${sampleCount} stay pinned in the list (${fullKb.toLocaleString('en-US')} KB held).`,
    });
    return steps;
  }

  for (let k = 1; k <= sampleCount; k++) {
    const freed = Array.from({ length: k - 1 }, (_, i) => i + 1);
    steps.push({
      step: k,
      phase: 'produce',
      activeItem: k,
      itemsInRam: [k],
      freedItems: freed,
      ramKb: itemSizeKb,
      explain:
        k === 1
          ? `Generator pauses at yield 1 and hands item 1 to the loop: only 1 item (${itemSizeKb.toLocaleString('en-US')} KB) is in RAM.`
          : `Item ${k - 1} is freed; generator resumes to yield item ${k}. RAM stays flat at 1 item (${itemSizeKb.toLocaleString('en-US')} KB).`,
    });
  }
  steps.push({
    step: sampleCount + 1,
    phase: 'done',
    activeItem: null,
    itemsInRam: [],
    freedItems: Array.from({ length: sampleCount }, (_, i) => i + 1),
    ramKb: itemSizeKb,
    explain: `All ${sampleCount} items streamed cleanly without ever holding more than 1 item (${itemSizeKb.toLocaleString('en-US')} KB) in RAM.`,
  });
  return steps;
}

export function analyzeGeneratorMemory({
  n,
  itemSizeKb,
  ramBudgetMb,
  mode,
  maxPlotN = MAX_DATASET_N,
}: {
  n: number;
  itemSizeKb: number;
  ramBudgetMb: number;
  mode: PipelineMode;
  maxPlotN?: number;
}): GeneratorMemoryAnalysis {
  const safeN = Math.max(100, Math.min(100000, Math.round(n)));
  const safeItemKb = Math.max(10, Math.min(500, Math.round(itemSizeKb)));
  const safeBudgetMb = Math.max(10, Math.min(4096, Math.round(ramBudgetMb)));

  const listKb = listMemoryKb(safeN, safeItemKb);
  const genKb = generatorMemoryKb(safeItemKb);
  const listMb = listKb / 1024;
  const generatorMb = genKb / 1024;
  const budgetKb = safeBudgetMb * 1024;
  const oomThresholdN = Math.floor(budgetKb / safeItemKb);

  const curve: MemoryCurvePoint[] = Array.from({ length: 41 }, (_, i) => {
    const sampleN = Math.max(100, Math.round((i / 40) * maxPlotN));
    return {
      n: sampleN,
      listKb: listMemoryKb(sampleN, safeItemKb),
      generatorKb: genKb,
    };
  });

  return {
    n: safeN,
    itemSizeKb: safeItemKb,
    ramBudgetMb: safeBudgetMb,
    listKb,
    listMb,
    generatorKb: genKb,
    generatorMb,
    savingsFactor: safeN,
    listExceedsBudget: listMb > safeBudgetMb,
    generatorExceedsBudget: generatorMb > safeBudgetMb,
    oomThresholdN,
    curve,
    trace: buildMemoryTrace(mode, safeItemKb, SAMPLE_STREAM_COUNT),
  };
}
