import { describe, expect, it } from 'vitest';
import { analyzeMatrixTransform } from './matrixTransformation';

describe('matrixTransformation pure calculations', () => {
  it('hand-checks Shear matrix basis columns, test vector, and determinant', () => {
    const res = analyzeMatrixTransform({
      targetA: [[1.4, 0.6], [0.2, 1.1]],
      inputV: [1, 2],
      morphFraction: 1,
    });
    // col1 = (1.4, 0.2), col2 = (0.6, 1.1)
    expect(res.col1[0]).toBeCloseTo(1.4, 10);
    expect(res.col1[1]).toBeCloseTo(0.2, 10);
    expect(res.col2[0]).toBeCloseTo(0.6, 10);
    expect(res.col2[1]).toBeCloseTo(1.1, 10);
    // A * [1, 2] = [1.4*1 + 0.6*2, 0.2*1 + 1.1*2] = [2.6, 2.4]
    expect(res.outputV[0]).toBeCloseTo(2.6, 10);
    expect(res.outputV[1]).toBeCloseTo(2.4, 10);
    // det = 1.4*1.1 - 0.6*0.2 = 1.54 - 0.12 = 1.42
    expect(res.determinant).toBeCloseTo(1.42, 10);
    expect(res.rank).toBe(2);
    expect(res.orientation).toBe('normal');
  });

  it('detects rank-1 collapse and mirror reflection accurately', () => {
    const collapse = analyzeMatrixTransform({
      targetA: [[1.0, 0.5], [2.0, 1.0]],
      inputV: [1, 1],
      morphFraction: 1,
    });
    expect(collapse.determinant).toBeCloseTo(0, 10);
    expect(collapse.rank).toBe(1);
    expect(collapse.orientation).toBe('collapsed');

    const reflect = analyzeMatrixTransform({
      targetA: [[-1, 0], [0, 1]],
      inputV: [1.5, -0.5],
      morphFraction: 1,
    });
    expect(reflect.determinant).toBe(-1);
    expect(reflect.areaScale).toBe(1);
    expect(reflect.orientation).toBe('flipped');
    expect(reflect.outputV).toEqual([-1.5, -0.5]);
  });

  it('interpolates smoothly from identity at morphFraction=0 to targetA at 1', () => {
    const start = analyzeMatrixTransform({
      targetA: [[1.4, 0.6], [0.2, 1.1]],
      inputV: [1, 1],
      morphFraction: 0,
    });
    expect(start.activeA).toEqual([[1, 0], [0, 1]]);
    expect(start.determinant).toBe(1);
    expect(start.outputV).toEqual([1, 1]);
  });
});
