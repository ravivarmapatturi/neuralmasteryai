import { describe, expect, it } from 'vitest';
import {
  classAt,
  evaluatePerturbation,
  scoreAt,
} from './adversarialPerturbation';

describe('adversarialPerturbation mathematics', () => {
  it('computes hand-checked baseline and L2 flip threshold from (1.3, 0.4) across x^2+y^2=1.6', () => {
    expect(scoreAt(1.3, 0.4, 1.6)).toBeCloseTo(0.25, 10);
    expect(classAt(1.3, 0.4, 1.6)).toBe(1);

    // Exact distance to boundary: sqrt(1.85) - sqrt(1.6) ~= 0.095236
    const beforeFlip = evaluatePerturbation({
      start: [1.3, 0.4],
      epsilon: 0.05,
      method: 'l2',
      rSquared: 1.6,
    });
    expect(beforeFlip.flipped).toBe(false);
    expect(beforeFlip.exactBoundaryDist).toBeCloseTo(Math.sqrt(1.85) - Math.sqrt(1.6), 8);
    expect(beforeFlip.perturbedScore).toBeGreaterThan(0);

    const afterFlip = evaluatePerturbation({
      start: [1.3, 0.4],
      epsilon: 0.1,
      method: 'l2',
      rSquared: 1.6,
    });
    // Radius becomes sqrt(1.85) - 0.10 = 1.260147..., score = r^2 - 1.6 ~= -0.01203
    expect(afterFlip.flipped).toBe(true);
    expect(afterFlip.perturbedClass).toBe(0);
    expect(afterFlip.perturbedScore).toBeCloseTo((Math.sqrt(1.85) - 0.1) ** 2 - 1.6, 8);
  });

  it('contrasts FGSM sign step with unaligned random nudge at the same epsilon', () => {
    const fgsm = evaluatePerturbation({
      start: [1.3, 0.4],
      epsilon: 0.1,
      method: 'fgsm',
      rSquared: 1.6,
    });
    // [1.3 - 0.1, 0.4 - 0.1] = [1.2, 0.3] -> 1.44 + 0.09 - 1.6 = -0.07
    expect(fgsm.perturbed[0]).toBeCloseTo(1.2, 10);
    expect(fgsm.perturbed[1]).toBeCloseTo(0.3, 10);
    expect(fgsm.perturbedScore).toBeCloseTo(-0.07, 10);
    expect(fgsm.flipped).toBe(true);

    const rand = evaluatePerturbation({
      start: [1.3, 0.4],
      epsilon: 0.15,
      method: 'random',
      rSquared: 1.6,
    });
    // Unaligned random nudge spends budget sideways and fails to flip
    expect(rand.flipped).toBe(false);
    expect(rand.perturbedClass).toBe(1);
  });
});
