import { describe, expect, it } from 'vitest';
import {
  calculateTopicProgress,
  calculateEdgeProgress,
  getEdgeStrokeWidth,
  getEdgeOpacity,
  getNodeDotSize,
  getNodeRingSize,
  getNodeRingStrokeWidth,
  getNodeOpacity,
  formatTopicLabel,
  formatAccessibleTopicLabel,
  getHeatmapWeight,
  getHeatmapColorMix,
} from './masteryScale';

describe('masteryScale unit tests', () => {
  describe('calculateTopicProgress', () => {
    it('handles 0% completion state', () => {
      const res = calculateTopicProgress(0, 24);
      expect(res.ratio).toBe(0);
      expect(res.pct).toBe(0);
      expect(res.isComplete).toBe(false);
    });

    it('handles partial completion with correct rounding', () => {
      // 10 / 24 = 0.41666... -> 42%
      const res = calculateTopicProgress(10, 24);
      expect(res.ratio).toBeCloseTo(0.4167, 3);
      expect(res.pct).toBe(42);
      expect(res.isComplete).toBe(false);
    });

    it('handles 100% completion state', () => {
      const res = calculateTopicProgress(24, 24);
      expect(res.ratio).toBe(1);
      expect(res.pct).toBe(100);
      expect(res.isComplete).toBe(true);
    });

    it('clamps invalid or boundary inputs safely', () => {
      expect(calculateTopicProgress(-5, 20)).toEqual({ ratio: 0, pct: 0, isComplete: false });
      expect(calculateTopicProgress(25, 20)).toEqual({ ratio: 1, pct: 100, isComplete: true });
      expect(calculateTopicProgress(0, 0)).toEqual({ ratio: 0, pct: 0, isComplete: false });
    });
  });

  describe('calculateEdgeProgress', () => {
    it('evaluates 0 when both topics are untouched', () => {
      expect(calculateEdgeProgress(0, 0)).toBe(0);
    });

    it('evaluates halfway when one topic is mastered and the other untouched', () => {
      expect(calculateEdgeProgress(1, 0)).toBe(0.5);
      expect(calculateEdgeProgress(0, 1)).toBe(0.5);
    });

    it('evaluates 1.0 when both connected topics are complete', () => {
      expect(calculateEdgeProgress(1, 1)).toBe(1);
    });

    it('increases monotonically as either connected topic progresses', () => {
      const p0 = calculateEdgeProgress(0, 0);
      const p1 = calculateEdgeProgress(0.3, 0);
      const p2 = calculateEdgeProgress(0.7, 0);
      const p3 = calculateEdgeProgress(1.0, 0.4);
      const p4 = calculateEdgeProgress(1.0, 1.0);

      expect(p0).toBeLessThan(p1);
      expect(p1).toBeLessThan(p2);
      expect(p2).toBeLessThan(p3);
      expect(p3).toBeLessThan(p4);
    });
  });

  describe('getEdgeStrokeWidth (thickness scale)', () => {
    it('scales thickness monotonically from 1.0px at 0% to 2.8px at 100%', () => {
      const w0 = getEdgeStrokeWidth(0, false);
      const w25 = getEdgeStrokeWidth(0.25, false);
      const w50 = getEdgeStrokeWidth(0.5, false);
      const w75 = getEdgeStrokeWidth(0.75, false);
      const w100 = getEdgeStrokeWidth(1.0, false);

      expect(w0).toBe(1.0);
      expect(w50).toBe(1.9);
      expect(w100).toBe(2.8);

      expect(w0).toBeLessThan(w25);
      expect(w25).toBeLessThan(w50);
      expect(w50).toBeLessThan(w75);
      expect(w75).toBeLessThan(w100);
    });

    it('provides prominent thickness when edge is lit/active', () => {
      const active0 = getEdgeStrokeWidth(0, true);
      const active100 = getEdgeStrokeWidth(1, true);

      expect(active0).toBeGreaterThanOrEqual(2.5);
      expect(active100).toBeGreaterThan(active0);
    });
  });

  describe('getEdgeOpacity (brightness scale)', () => {
    it('scales brightness monotonically from 0% to 100% in light mode', () => {
      const op0 = getEdgeOpacity(0, false, false);
      const op50 = getEdgeOpacity(0.5, false, false);
      const op100 = getEdgeOpacity(1.0, false, false);

      expect(op0).toBe(0.22);
      expect(op100).toBe(0.85);
      expect(op0).toBeLessThan(op50);
      expect(op50).toBeLessThan(op100);
    });

    it('scales brightness monotonically from 0% to 100% in dark mode', () => {
      const op0 = getEdgeOpacity(0, false, true);
      const op50 = getEdgeOpacity(0.5, false, true);
      const op100 = getEdgeOpacity(1.0, false, true);

      expect(op0).toBe(0.20);
      expect(op100).toBe(0.88);
      expect(op0).toBeLessThan(op50);
      expect(op50).toBeLessThan(op100);
    });

    it('returns full 1.0 opacity when edge is active', () => {
      expect(getEdgeOpacity(0, true, false)).toBe(1.0);
      expect(getEdgeOpacity(1, true, true)).toBe(1.0);
    });
  });

  describe('Node visual scale (dot, ring, opacity)', () => {
    it('scales dot size monotonically as progress increases', () => {
      const dot0 = getNodeDotSize(20, 0);
      const dot50 = getNodeDotSize(20, 0.5);
      const dot100 = getNodeDotSize(20, 1.0);

      expect(dot0).toBeLessThan(dot50);
      expect(dot50).toBeLessThan(dot100);
      expect(dot100 - dot0).toBeCloseTo(3.5, 1);
    });

    it('scales ring stroke width and ring diameter monotonically', () => {
      expect(getNodeRingStrokeWidth(0)).toBe(2.0);
      expect(getNodeRingStrokeWidth(0.5)).toBe(3.0);
      expect(getNodeRingStrokeWidth(1.0)).toBe(4.0);

      const r0 = getNodeRingSize(14, 0);
      const r50 = getNodeRingSize(14, 0.5);
      const r100 = getNodeRingSize(14, 1.0);
      expect(r0).toBe(22);
      expect(r50).toBe(24);
      expect(r100).toBe(26);
      expect(r0).toBeLessThan(r50);
      expect(r50).toBeLessThan(r100);
    });

    it('scales node opacity for far/unselected nodes from 0.42 to 0.80', () => {
      expect(getNodeOpacity(0, true)).toBe(0.42);
      expect(getNodeOpacity(0.5, true)).toBeCloseTo(0.61, 2);
      expect(getNodeOpacity(1.0, true)).toBe(0.80);
      // Near / active nodes remain full 1.0
      expect(getNodeOpacity(0, false)).toBe(1.0);
      expect(getNodeOpacity(1.0, false)).toBe(1.0);
    });
  });

  describe('label formatting', () => {
    it('shows only topic title at 0%', () => {
      expect(formatTopicLabel('Transformers', 0)).toBe('Transformers');
      expect(formatTopicLabel('Classical ML', 0)).toBe('Classical ML');
    });

    it('shows percentage next to topic label once above 0', () => {
      expect(formatTopicLabel('Transformers', 42)).toBe('Transformers 42%');
      expect(formatTopicLabel('Fine-tuning', 15)).toBe('Fine-tuning 15%');
      expect(formatTopicLabel('Classical ML', 100)).toBe('Classical ML 100%');
    });

    it('formats accessible label stating percentage and counts clearly', () => {
      expect(formatAccessibleTopicLabel('Transformers', 0, 0, 32))
        .toBe('Transformers, 0% completed, 0 of 32 questions');
      expect(formatAccessibleTopicLabel('Transformers', 42, 13, 32))
        .toBe('Transformers, 42% completed, 13 of 32 questions');
      expect(formatAccessibleTopicLabel('Transformers', 100, 32, 32))
        .toBe('Transformers, 100% completed, 32 of 32 questions');
    });
  });

  describe('heatmap sequential color scale', () => {
    it('scales weight monotonically from 18% at 0% to 100% at 100%', () => {
      expect(getHeatmapWeight(0)).toBe(18);
      expect(getHeatmapWeight(50)).toBe(59);
      expect(getHeatmapWeight(100)).toBe(100);
      expect(getHeatmapWeight(0)).toBeLessThan(getHeatmapWeight(50));
      expect(getHeatmapWeight(50)).toBeLessThan(getHeatmapWeight(100));
    });

    it('clamps out of bounds percentages safely', () => {
      expect(getHeatmapWeight(-10)).toBe(18);
      expect(getHeatmapWeight(150)).toBe(100);
    });

    it('generates valid CSS color-mix expressions', () => {
      expect(getHeatmapColorMix(0)).toBe('color-mix(in srgb, var(--accent) 18%, var(--surface-alt))');
      expect(getHeatmapColorMix(50)).toBe('color-mix(in srgb, var(--accent) 59%, var(--surface-alt))');
      expect(getHeatmapColorMix(100)).toBe('color-mix(in srgb, var(--accent) 100%, var(--surface-alt))');
    });
  });
});
