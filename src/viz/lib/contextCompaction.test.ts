import { describe, expect, it } from 'vitest';
import { analyzeContextCompaction } from './contextCompaction';

describe('contextCompaction pure calculations', () => {
  it('hand-checks Turn 12 worked example: Naive 107,700 (84.1%) vs Compacted 17,700 (83.6% saved)', () => {
    const naive = analyzeContextCompaction({
      strategy: 'naive',
      turn: 12,
      rawTokensPerTurn: 8500,
      windowLimit: 128000,
      recentTurnsKept: 3,
    });
    // 3,500 + 2,200 + 12 * 8,500 = 107,700
    expect(naive.fixedTokens).toBe(5700);
    expect(naive.workingTurnTokens).toBe(102000);
    expect(naive.totalTokens).toBe(107700);
    expect(naive.rawUsagePct).toBeCloseTo(84.140625, 4);
    expect(naive.inAnxietyZone).toBe(true);
    expect(naive.overflowing).toBe(false);

    const compacted = analyzeContextCompaction({
      strategy: 'compacted',
      turn: 12,
      rawTokensPerTurn: 8500,
      windowLimit: 128000,
      recentTurnsKept: 3,
    });
    // 3,500 + 2,200 + 2,400 (state file) + 3 * 3,200 = 17,700
    expect(compacted.stateArtifactTokens).toBe(2400);
    expect(compacted.workingTurnTokens).toBe(9600);
    expect(compacted.totalTokens).toBe(17700);
    expect(compacted.savedTokensVsNaive).toBe(90000);
    expect(compacted.savedPctVsNaive).toBeCloseTo(83.565459, 3);
    expect(compacted.earlyGoalsLost).toBe(false);
    expect(compacted.healthLabel).toBe('Sharp focus');
  });

  it('detects Sliding Window amnesia past W turns and Naive overflow past 128k', () => {
    const sliding = analyzeContextCompaction({
      strategy: 'sliding',
      turn: 12,
      rawTokensPerTurn: 8500,
      windowLimit: 128000,
      recentTurnsKept: 3,
    });
    expect(sliding.totalTokens).toBe(15300);
    expect(sliding.earlyGoalsLost).toBe(true);
    expect(sliding.healthLabel).toBe('Goal amnesia');

    const overflow = analyzeContextCompaction({
      strategy: 'naive',
      turn: 15,
      rawTokensPerTurn: 8500,
      windowLimit: 128000,
      recentTurnsKept: 3,
    });
    // 5,700 + 15 * 8,500 = 133,200 > 128,000
    expect(overflow.totalTokens).toBe(133200);
    expect(overflow.overflowing).toBe(true);
    expect(overflow.healthLabel).toBe('Overflow (>100%)');
  });
});
