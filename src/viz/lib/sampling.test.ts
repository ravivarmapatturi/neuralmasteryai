import { describe, expect, it } from 'vitest';
import { buildInferenceStages, computeDistributionFor, distributionEntropy, sampleFromDistribution } from './sampling';

const TOY = [
  { token: 'a', baseLogit: Math.log(4) },
  { token: 'b', baseLogit: Math.log(2) },
  { token: 'c', baseLogit: Math.log(1) },
];

describe('LLM sampling calculations', () => {
  it('matches hand-computed softmax and top-k renormalization', () => {
    const full = computeDistributionFor(TOY, 1, 3, 1);
    expect(full.map((entry) => entry.finalProb)).toEqual([
      expect.closeTo(4 / 7, 10),
      expect.closeTo(2 / 7, 10),
      expect.closeTo(1 / 7, 10),
    ]);

    const topTwo = computeDistributionFor(TOY, 1, 2, 1);
    expect(topTwo[0].finalProb).toBeCloseTo(2 / 3, 10);
    expect(topTwo[1].finalProb).toBeCloseTo(1 / 3, 10);
    expect(topTwo[2].finalProb).toBe(0);
  });

  it('uses the visible random draw against cumulative probability', () => {
    const distribution = computeDistributionFor(TOY, 1, 2, 1);
    expect(sampleFromDistribution(distribution, 0.65).token).toBe('a');
    expect(sampleFromDistribution(distribution, 0.8).token).toBe('b');
  });

  it('computes entropy and builds the exact displayed inference stages', () => {
    const certain = computeDistributionFor([{ token: 'only', baseLogit: 0 }], 1, 1, 1);
    expect(distributionEntropy(certain)).toBe(0);
    const stages = buildInferenceStages('the cat sat', 4, 'mat');
    expect(stages).toHaveLength(9);
    expect(stages[1].plainMeaning).toContain('3 toy word tokens');
    expect(stages.at(-1)?.plainMeaning).toContain('“mat”');
  });
});
