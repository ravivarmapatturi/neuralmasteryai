import { describe, expect, it } from 'vitest';
import {
  analyzeGeneratorMemory,
  buildMemoryTrace,
  generatorMemoryKb,
  listMemoryKb,
} from './generatorMemory';

describe('generatorMemory computation', () => {
  it('computes hand-checked O(N) list vs O(1) generator memory at N=20,000, 50 KB', () => {
    expect(listMemoryKb(20000, 50)).toBe(1_000_000);
    expect(generatorMemoryKb(50)).toBe(50);

    const out = analyzeGeneratorMemory({
      n: 20000,
      itemSizeKb: 50,
      ramBudgetMb: 512,
      mode: 'generator',
    });

    // 1,000,000 / 1024 = 976.5625 MB > 512 MB RAM budget
    expect(out.listMb).toBeCloseTo(976.5625, 4);
    expect(out.generatorMb).toBeCloseTo(50 / 1024, 6);
    expect(out.listExceedsBudget).toBe(true);
    expect(out.generatorExceedsBudget).toBe(false);
    // 512 * 1024 / 50 = 10,485.76 -> OOM after 10,485 items
    expect(out.oomThresholdN).toBe(10485);
  });

  it('builds exact 6-item execution traces for list and generator modes', () => {
    const listTrace = buildMemoryTrace('list', 50, 6);
    expect(listTrace).toHaveLength(7);
    expect(listTrace[0].itemsInRam).toEqual([1]);
    expect(listTrace[5].itemsInRam).toEqual([1, 2, 3, 4, 5, 6]);
    expect(listTrace[5].ramKb).toBe(300);
    expect(listTrace[6].ramKb).toBe(300);

    const genTrace = buildMemoryTrace('generator', 50, 6);
    expect(genTrace).toHaveLength(7);
    for (let i = 0; i < 6; i++) {
      expect(genTrace[i].itemsInRam).toEqual([i + 1]);
      expect(genTrace[i].ramKb).toBe(50);
    }
    expect(genTrace[6].itemsInRam).toEqual([]);
    expect(genTrace[6].freedItems).toEqual([1, 2, 3, 4, 5, 6]);
  });
});
