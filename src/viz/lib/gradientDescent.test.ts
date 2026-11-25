import { describe, expect, it } from 'vitest';
import {
  computeContourSegments,
  evaluateGrad,
  evaluateLoss,
  explainOptimizationStep,
  makeStepper,
  runTrajectory,
} from './gradientDescent';

describe('gradientDescent pure engine', () => {
  it('computes exact analytical losses and gradients on ravine, bowl, and saddle', () => {
    // Ravine: L(x,y) = 0.1x^2 + 2y^2, grad = [0.2x, 4y]
    expect(evaluateLoss('ravine', -4, 2)).toBeCloseTo(0.1 * 16 + 2 * 4, 10); // 9.6
    expect(evaluateGrad('ravine', -4, 2)).toEqual([-0.8, 8]);

    // Bowl: L(x,y) = 0.5x^2 + 0.5y^2, grad = [x, y]
    expect(evaluateLoss('bowl', 3, -4)).toBeCloseTo(12.5, 10);
    expect(evaluateGrad('bowl', 3, -4)).toEqual([3, -4]);

    // Saddle: two minima at (0, 1) and (0, -1), saddle at (0, 0)
    expect(evaluateLoss('saddle', 0, 1)).toBeCloseTo(0, 10);
    expect(evaluateLoss('saddle', 0, -1)).toBeCloseTo(0, 10);
    expect(evaluateGrad('saddle', 0, 0)).toEqual([0, 0]);
    expect(evaluateLoss('saddle', 0, 0)).toBeCloseTo(0.45, 10);
  });

  it('executes exact hand-checked SGD, Momentum, RMSProp, and Adam steps', () => {
    // 1 step of SGD on ravine from (-4, 2) with lr=0.15:
    // grad = [-0.8, 8] -> next = [-4 - 0.15*(-0.8), 2 - 0.15*8] = [-3.88, 0.8]
    const sgdNext = makeStepper('sgd', 0.15, 'ravine')({ x: -4, y: 2 });
    expect(sgdNext.x).toBeCloseTo(-3.88, 10);
    expect(sgdNext.y).toBeCloseTo(0.8, 10);

    // 1 step of Momentum (beta=0.85, lr=0.1) from (-4, 2):
    // v = [-0.1*(-0.8), -0.1*8] = [0.08, -0.8] -> next = [-3.92, 1.2]
    const momNext = makeStepper('momentum', 0.1, 'ravine', 0.85)({ x: -4, y: 2 });
    expect(momNext.x).toBeCloseTo(-3.92, 10);
    expect(momNext.y).toBeCloseTo(1.2, 10);

    // 1 step of Adam (b1=0.9, b2=0.999, lr=0.4) from (-4, 2):
    // First bias-corrected step has mHat = grad, vHat = grad^2 -> step = -lr * sign(grad) = [+0.4, -0.4]
    const adamNext = makeStepper('adam', 0.4, 'ravine')({ x: -4, y: 2 });
    expect(adamNext.x).toBeCloseTo(-3.6, 5);
    expect(adamNext.y).toBeCloseTo(1.6, 5);

    // RMSProp adapts per axis
    const rmsNext = makeStepper('rmsprop', 0.25, 'ravine')({ x: -4, y: 2 });
    expect(rmsNext.x).toBeGreaterThan(-4);
    expect(rmsNext.y).toBeLessThan(2);
  });

  it('detects SGD oscillation across steep ravine wall at lr=0.45 while Adam converges smoothly', () => {
    const sgdPath = runTrajectory({
      optimizer: 'sgd',
      lr: 0.45,
      start: { x: -4, y: 2 },
      surface: 'ravine',
      steps: 15,
    });
    // Step 1: y = 2 - 0.45 * 8 = -1.6 (crosses zero, then bounces back to +1.28 on step 2)
    expect(sgdPath[1].y).toBeCloseTo(-1.6, 6);
    expect(sgdPath[2].y).toBeCloseTo(1.28, 6);
    expect(sgdPath[2].oscillating).toBe(true);

    // Adam with lr=0.25 reaches much lower loss along flat x than SGD with lr=0.15 in 25 steps
    const sgdCalm = runTrajectory({ optimizer: 'sgd', lr: 0.15, start: { x: -4, y: 2 }, surface: 'ravine', steps: 25 });
    const adam = runTrajectory({ optimizer: 'adam', lr: 0.25, start: { x: -4, y: 2 }, surface: 'ravine', steps: 25 });
    expect(adam[25].loss).toBeLessThan(sgdCalm[25].loss);
    expect(Math.abs(adam[25].x)).toBeLessThan(Math.abs(sgdCalm[25].x));
  });

  it('escapes saddle valley toward a minimum and flags divergence for huge lr', () => {
    const saddleAdam = runTrajectory({
      optimizer: 'adam',
      lr: 0.25,
      start: { x: -3.5, y: 0.25 },
      surface: 'saddle',
      steps: 40,
    });
    const end = saddleAdam[saddleAdam.length - 1];
    expect(end.loss).toBeLessThan(0.05);
    expect(end.y).toBeGreaterThan(0.8);

    const boom = runTrajectory({
      optimizer: 'sgd',
      lr: 0.9,
      start: { x: -4, y: 2 },
      surface: 'ravine',
      steps: 20,
    });
    expect(boom.some((r) => r.diverged)).toBe(true);
  });

  it('computes real contour segments for saddle level curves and plain-English captions', () => {
    const segs = computeContourSegments('saddle', 0.7);
    expect(segs.length).toBeGreaterThan(20);
    for (const [[x1, y1], [x2, y2]] of segs) {
      expect(Number.isFinite(x1)).toBe(true);
      expect(Number.isFinite(y1)).toBe(true);
      expect(Number.isFinite(x2)).toBe(true);
      expect(Number.isFinite(y2)).toBe(true);
    }

    const path = runTrajectory({ optimizer: 'sgd', lr: 0.45, start: { x: -4, y: 2 }, surface: 'ravine', steps: 3 });
    const startMsg = explainOptimizationStep(path[0], undefined, 'sgd', 0.45, 'ravine');
    const bounceMsg = explainOptimizationStep(path[2], path[1], 'sgd', 0.45, 'ravine');
    expect(startMsg).toContain('(-4.00, 2.00)');
    expect(bounceMsg).toContain('bounced');
  });
});
