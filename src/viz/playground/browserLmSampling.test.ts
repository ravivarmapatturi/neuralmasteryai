import { describe, expect, it } from 'vitest';
import {
  createSeededRandom,
  sampleFromLogits,
  softmaxWithTemperature,
  topKMask,
  topPMask,
} from './browserLmSampling';

describe('browser LM sampling math', () => {
  it('computes a stable softmax whose probabilities sum to one', () => {
    const probabilities = softmaxWithTemperature([1000, 999, 998], 1);
    expect(probabilities.reduce((sum, value) => sum + value, 0)).toBeCloseTo(1, 12);
    expect(probabilities[0]).toBeGreaterThan(probabilities[1]);
    expect(probabilities.every(Number.isFinite)).toBe(true);
  });

  it('sharpens with low temperature and flattens with high temperature', () => {
    const cold = softmaxWithTemperature([3, 2, 1], 0.5);
    const hot = softmaxWithTemperature([3, 2, 1], 2);
    expect(cold[0]).toBeGreaterThan(hot[0]);
    expect(cold[2]).toBeLessThan(hot[2]);
  });

  it('treats temperature zero as greedy argmax', () => {
    expect(softmaxWithTemperature([1, 4, 2], 0)).toEqual([0, 1, 0]);
  });

  it('keeps exactly the highest k probabilities and disables at k zero', () => {
    expect(topKMask([0.1, 0.5, 0.3, 0.1], 2)).toEqual([false, true, true, false]);
    expect(topKMask([0.1, 0.5, 0.3, 0.1], 0)).toEqual([true, true, true, true]);
  });

  it('keeps the smallest nucleus that reaches top-p', () => {
    expect(topPMask([0.5, 0.3, 0.15, 0.05], 0.8)).toEqual([true, true, false, false]);
    expect(topPMask([0.5, 0.3, 0.15, 0.05], 0.81)).toEqual([true, true, true, false]);
  });

  it('renormalizes top-p over tokens that survived top-k', () => {
    const eligible = topKMask([0.45, 0.25, 0.2, 0.1], 3);
    expect(topPMask([0.45, 0.25, 0.2, 0.1], 0.7, eligible)).toEqual([true, true, false, false]);
  });

  it('reports which filter cut each candidate', () => {
    const result = sampleFromLogits([4, 3, 2, 1], {
      temperature: 1,
      topK: 3,
      topP: 0.75,
      greedy: false,
    }, () => 0);

    expect(result.selectedId).toBe(0);
    expect(result.candidates[0].finalProbability).toBeGreaterThan(0);
    expect(result.candidates[2].cutByTopP).toBe(true);
    expect(result.candidates[3].cutByTopK).toBe(true);
  });

  it('replays the same sample sequence for the same seed', () => {
    const run = (seed: number) => {
      const random = createSeededRandom(seed);
      return Array.from({ length: 6 }, () => sampleFromLogits(
        [1, 1, 1],
        { temperature: 1, topK: 0, topP: 1, greedy: false },
        random,
      ).selectedId);
    };
    expect(run(42)).toEqual(run(42));
    expect(run(42)).not.toEqual(run(43));
  });
});
