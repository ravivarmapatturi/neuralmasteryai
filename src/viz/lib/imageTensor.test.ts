import { describe, expect, it } from 'vitest';
import {
  IMAGE_PRESETS,
  clampByte,
  explainImagePixel,
  formatImageFormula,
  rgbToGrayscale,
  scaleToSignedUnit,
  tensorMemoryStats,
  zscoreChannel,
} from './imageTensor';

describe('imageTensor pure computation', () => {
  it('computes exact BT.601 grayscale luminance for pure primary and neutral pixels', () => {
    expect(rgbToGrayscale([255, 255, 0])).toBeCloseTo(0.299 * 255 + 0.587 * 255, 6); // ~225.93
    expect(rgbToGrayscale([100, 100, 100])).toBeCloseTo(100, 6);
    expect(rgbToGrayscale([0, 0, 255])).toBeCloseTo(0.114 * 255, 6);
  });

  it('maps 0..255 bytes cleanly to [-1, 1] and ImageNet z-scores', () => {
    expect(scaleToSignedUnit(0)).toBe(-1);
    expect(scaleToSignedUnit(255)).toBe(1);
    expect(scaleToSignedUnit(127.5)).toBeCloseTo(0, 6);

    // Channel 0 (R) mean=0.485, std=0.229 -> at R=255 (1.0): (1 - 0.485)/0.229 ≈ 2.2489
    expect(zscoreChannel(255, 0)).toBeCloseTo((1 - 0.485) / 0.229, 6);
    // Channel 2 (B) mean=0.406, std=0.225 -> at B=0: -0.406/0.225 ≈ -1.8044
    expect(zscoreChannel(0, 2)).toBeCloseTo(-0.406 / 0.225, 6);
  });

  it('computes exact tensor shapes and byte counts for uint8 RGB vs float32 grayscale/normalized', () => {
    expect(tensorMemoryStats(4, 4, 'rgb')).toEqual({
      shape: [4, 4, 3],
      channels: 3,
      totalValues: 48,
      bytesPerValue: 1,
      totalBytes: 48,
      dtype: 'uint8',
    });
    expect(tensorMemoryStats(4, 4, 'gray')).toEqual({
      shape: [4, 4, 1],
      channels: 1,
      totalValues: 16,
      bytesPerValue: 4,
      totalBytes: 64,
      dtype: 'float32',
    });
    expect(tensorMemoryStats(4, 4, 'zscore').totalBytes).toBe(192);
    expect(clampByte(300)).toBe(255);
    expect(clampByte(-12)).toBe(0);
  });

  it('validates 4x4 presets and formats plain-English captions and substituted formulas', () => {
    expect(IMAGE_PRESETS).toHaveLength(4);
    for (const preset of IMAGE_PRESETS) {
      expect(preset.grid).toHaveLength(4);
      for (const row of preset.grid) expect(row).toHaveLength(4);
    }
    const px = [255, 255, 0] as const;
    expect(explainImagePixel(px, 1, 2, 'gray')).toContain('225.9');
    const f = formatImageFormula(px, 'gray', tensorMemoryStats(4, 4, 'gray'));
    expect(f.general).toContain('0.299');
    expect(f.worked).toContain('0.299×255');
  });
});
