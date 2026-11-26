import { describe, expect, it } from 'vitest';
import { parseQuantizationValues, quantizeValues } from './quantizationScale';

describe('quantization scale', () => {
  it('parses editable weights', () => {
    expect(parseQuantizationValues('-1, 0.4  2')).toEqual([-1, 0.4, 2]);
  });

  it('hand-checks a 4-bit symmetric bucket', () => {
    const result = quantizeValues({ values: [-1, 0.4, 1], bits: 4, scope: 'tensor', groupSize: 3 });
    // qMax=7, S=1/7. 0.4/S=2.8 rounds to 3, so x-hat=3/7.
    expect(result.rows[1].integer).toBe(3);
    expect(result.rows[1].reconstructed).toBeCloseTo(3 / 7);
    expect(result.rows[1].error).toBeCloseTo(Math.abs(0.4 - 3 / 7));
  });

  it('isolates an outlier when groups do not share its scale', () => {
    const values = [-1, 0.2, 0.3, 0.4, -0.5, 0.6, 0.7, 10];
    const tensor = quantizeValues({ values, bits: 4, scope: 'tensor', groupSize: 4 });
    const grouped = quantizeValues({ values, bits: 4, scope: 'group', groupSize: 4 });
    expect(grouped.rows[1].error).toBeLessThan(tensor.rows[1].error);
    expect(grouped.mse).toBeLessThan(tensor.mse);
  });
});
