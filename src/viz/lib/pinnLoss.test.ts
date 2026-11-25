import { describe, expect, it } from 'vitest';
import { COLLOCATION_POINTS, buildPinnTrainingTrace, evaluatePinn } from './pinnLoss';
import { dataLoss, physicsLoss } from './aiforscience';

describe('pinnLoss pure calculations', () => {
  it('hand-checks data loss and analytical physics residual at a=1.0, b=0.80', () => {
    const res = evaluatePinn({
      mode: 'physicsInformed',
      a: 1.0,
      b: 0.8,
      dataX: 0.1,
      physicsWeight: 1.0,
    });

    // At a=1, b=0.8, x0=0.1: y_pred - y_true = 0.8 * 0.1 * exp(-0.1)
    const expectedDiff = 0.08 * Math.exp(-0.1);
    const expectedDataLoss = expectedDiff * expectedDiff;
    expect(res.dataErrorAtData).toBeCloseTo(expectedDiff, 10);
    expect(res.dLoss).toBeCloseTo(expectedDataLoss, 10);
    expect(res.dLoss).toBeCloseTo(dataLoss(1.0, 0.8, [0.1]), 12);

    // Exact residual for y_pred = e^-x + b*x*e^-x is dy/dx + y = b*e^-x
    const expectedPhysLoss =
      COLLOCATION_POINTS.reduce((sum, x) => sum + (0.8 * Math.exp(-x)) ** 2, 0) /
      COLLOCATION_POINTS.length;
    expect(res.pLoss).toBeCloseTo(expectedPhysLoss, 7);
    expect(res.pLoss).toBeCloseTo(physicsLoss(1.0, 0.8, [...COLLOCATION_POINTS]), 12);
    expect(res.totalLoss).toBeCloseTo(expectedDataLoss + expectedPhysLoss, 7);
  });

  it('drops both data and physics losses to ~0 at exact truth (a=1.0, b=0.0)', () => {
    const exact = evaluatePinn({
      mode: 'physicsInformed',
      a: 1.0,
      b: 0.0,
      dataX: 0.1,
      physicsWeight: 1.0,
    });
    expect(exact.dLoss).toBe(0);
    expect(exact.pLoss).toBeLessThan(1e-12);
    expect(exact.farErrorAt2).toBe(0);
  });

  it('ignores physics loss in dataOnly mode while still computing it transparently', () => {
    const dataOnly = evaluatePinn({
      mode: 'dataOnly',
      a: 1.0,
      b: 0.8,
      dataX: 0.1,
      physicsWeight: 1.5,
    });
    expect(dataOnly.totalLoss).toBeCloseTo(dataOnly.dLoss, 12);
    expect(dataOnly.pLoss).toBeGreaterThan(0.05);
  });

  it('training trace converges toward truth with physics loss, but keeps far error when data-only', () => {
    const physicsTrace = buildPinnTrainingTrace({
      mode: 'physicsInformed',
      startA: 1.0,
      startB: 0.8,
      dataX: 0.1,
      physicsWeight: 1.0,
    });
    const firstP = physicsTrace[0];
    const lastP = physicsTrace[physicsTrace.length - 1];
    expect(lastP.totalLoss).toBeLessThan(firstP.totalLoss);
    expect(lastP.farErrorAt2).toBeLessThan(firstP.farErrorAt2);
    expect(lastP.farErrorAt2).toBeLessThan(0.08);

    const dataTrace = buildPinnTrainingTrace({
      mode: 'dataOnly',
      startA: 1.0,
      startB: 0.8,
      dataX: 0.1,
      physicsWeight: 1.0,
    });
    const lastD = dataTrace[dataTrace.length - 1];
    expect(lastD.dLoss).toBeLessThan(0.002);
    expect(lastD.farErrorAt2).toBeGreaterThan(0.1);
  });
});
