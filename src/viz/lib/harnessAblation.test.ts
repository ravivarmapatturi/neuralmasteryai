import { describe, expect, it } from 'vitest';
import { calculateAblations, calculateHarnessOutcome, compareHarnesses } from './harnessAblation';

describe('harness ablation probability model', () => {
  it('matches a hand-checked two-attempt example', () => {
    const outcome = calculateHarnessOutcome({
      requiredSteps: 1,
      stepAccuracy: 0.8,
      coverage: 0.5,
      attempts: 2,
      regressionRisk: 0,
    });

    // Retry chance r = (1 - 0.8) × 0.5 = 0.1.
    // P(step correct) = 0.8 × (1 + 0.1) = 0.88.
    expect(outcome.stepSuccess).toBeCloseTo(0.88, 10);
    expect(outcome.expectedAttempts).toBeCloseTo(1.1, 10);
    expect(outcome.falseVictory).toBeCloseTo(0.11, 10);
  });

  it('raises ship-ready probability as verification, repair, and tracking are added', () => {
    const variants = compareHarnesses({
      requiredSteps: 4,
      baseStepAccuracy: 0.8,
      verifierCoverage: 0.9,
      maxAttempts: 3,
      regressionRisk: 0.1,
      trackingBoost: 0.1,
    });
    expect(variants[2].shipReady).toBeGreaterThan(variants[1].shipReady);
    expect(variants[3].shipReady).toBeGreaterThan(variants[2].shipReady);
    expect(variants[1].falseVictory).toBeLessThan(variants[0].falseVictory);
  });

  it('returns one calculated removal delta for every harness part', () => {
    const ablations = calculateAblations({
      requiredSteps: 6,
      baseStepAccuracy: 0.75,
      verifierCoverage: 0.85,
      maxAttempts: 3,
      regressionRisk: 0.12,
      trackingBoost: 0.08,
    });
    expect(ablations.map((row) => row.part).sort()).toEqual(['retries', 'sandbox', 'state', 'verifier']);
    expect(ablations.every((row) => row.shipReadyDrop >= 0)).toBe(true);
  });
});
