export type QuantizationScope = 'tensor' | 'group';

export interface QuantizationConfig {
  values: number[];
  bits: number;
  scope: QuantizationScope;
  groupSize: number;
}

export interface QuantizedValue {
  index: number;
  group: number;
  input: number;
  integer: number;
  reconstructed: number;
  error: number;
  scale: number;
}

export interface QuantizationResult {
  rows: QuantizedValue[];
  qMin: number;
  qMax: number;
  mse: number;
  maxError: number;
  storageBytes: number;
}

export function parseQuantizationValues(text: string): number[] {
  return text
    .split(/[\s,]+/)
    .map(Number)
    .filter(Number.isFinite)
    .slice(0, 16);
}

/** Symmetric uniform quantization, optionally with one scale per group. */
export function quantizeValues(input: QuantizationConfig): QuantizationResult {
  const bits = Math.max(2, Math.min(8, Math.round(input.bits)));
  const qMax = 2 ** (bits - 1) - 1;
  const qMin = -qMax;
  const values = input.values.length > 0 ? input.values : [0];
  const groupSize = input.scope === 'tensor'
    ? values.length
    : Math.max(1, Math.min(values.length, Math.round(input.groupSize)));
  const rows: QuantizedValue[] = [];

  for (let start = 0; start < values.length; start += groupSize) {
    const groupValues = values.slice(start, start + groupSize);
    const maxAbs = Math.max(...groupValues.map(Math.abs));
    const scale = maxAbs === 0 ? 1 : maxAbs / qMax;
    groupValues.forEach((value, offset) => {
      const integer = Math.max(qMin, Math.min(qMax, Math.round(value / scale)));
      const reconstructed = integer * scale;
      rows.push({
        index: start + offset,
        group: Math.floor(start / groupSize),
        input: value,
        integer,
        reconstructed,
        error: Math.abs(value - reconstructed),
        scale,
      });
    });
  }

  const squaredError = rows.reduce((sum, row) => sum + (row.input - row.reconstructed) ** 2, 0);
  return {
    rows,
    qMin,
    qMax,
    mse: squaredError / rows.length,
    maxError: Math.max(...rows.map((row) => row.error)),
    storageBytes: (rows.length * bits) / 8,
  };
}
