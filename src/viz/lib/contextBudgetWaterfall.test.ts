import { describe, expect, it } from 'vitest';
import { CONTEXT_PRESETS, simulateContextWaterfall } from './contextBudgetWaterfall';

describe('contextBudgetWaterfall', () => {
  it('matches the exact Turn 8 numbers for Engineered (8,000) and Unmanaged (80,200)', () => {
    const eng = simulateContextWaterfall(CONTEXT_PRESETS.engineered.config, 16);
    const unm = simulateContextWaterfall(CONTEXT_PRESETS.unmanaged.config, 16);

    const engT8 = eng[7]; // Turn 8
    expect(engT8.turn).toBe(8);
    expect(engT8.prefixTokens + engT8.toolTokens + engT8.fileTokens).toBe(3800);
    expect(engT8.historyTokens).toBe(4200);
    expect(engT8.inputUsed).toBe(8000);
    expect(engT8.utilizationPct).toBeCloseTo(6.25, 2);
    expect(engT8.freeHeadroom).toBe(128000 - 8000 - 4000);

    const unmT8 = unm[7]; // Turn 8
    expect(unmT8.turn).toBe(8);
    expect(unmT8.prefixTokens + unmT8.toolTokens + unmT8.fileTokens).toBe(44200);
    expect(unmT8.historyTokens).toBe(36000);
    expect(unmT8.inputUsed).toBe(80200);
    expect(unmT8.regime).toBe('warning');

    // Across 16 turns, cumulative billed input tokens exceed 1.3M:
    // sum_{t=1..16} (44200 + 4500*t) = 16*44200 + 4500*(16*17/2) = 707,200 + 612,000 = 1,319,200
    expect(unm[15].cumulativeBilledTokens).toBe(1319200);
  });

  it('triggers compaction at the 80% watermark (22,400) in the 32k preset before overflowing', () => {
    const tight = simulateContextWaterfall(CONTEXT_PRESETS['tight-32k'].config, 16);
    // Usable = 32,000 - 4,000 = 28,000; watermark = 0.8 * 28,000 = 22,400
    expect(tight[0].usableBudget).toBe(28000);
    expect(tight[0].watermarkTokens).toBe(22400);

    // Static = 4,500; Turn 8 adds 8*2,300 = 18,400 -> 22,900 >= 22,400 -> triggers compaction!
    expect(tight[7].compactedThisTurn).toBe(true);
    expect(tight[7].overflowTokens).toBe(0);
    expect(tight[7].historyTokens).toBe(250 + 2300 * 2);
  });
});
