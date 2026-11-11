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
  getHeatGlowSize,
  getHeatGlowOpacity,
  getHeatmapColorMix,
  HEAT_STOPS,
  MASTERY_STOPS,
  MASTERY_COLORS_LIGHT,
  MASTERY_COLORS_DARK,
  MASTERY_TEXT_COLORS_LIGHT,
  MASTERY_TEXT_COLORS_DARK,
} from './masteryScale';
import { getContrastRatio } from '../../theme/themes';

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  return [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16),
  ];
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rf = r / 255;
  const gf = g / 255;
  const bf = b / 255;
  const max = Math.max(rf, gf, bf);
  const min = Math.min(rf, gf, bf);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rf:
        h = (gf - bf) / d + (gf < bf ? 6 : 0);
        break;
      case gf:
        h = (bf - rf) / d + 2;
        break;
      case bf:
        h = (rf - gf) / d + 4;
        break;
    }
    h *= 60;
  }
  return [Math.round(h), Math.round(s * 100), Math.round(l * 100)];
}

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

  describe('heat scale', () => {
    it('returns the stop itself at 0, 25, 50, 75 and 100 percent', () => {
      expect(getHeatmapColorMix(0)).toBe('var(--heat-0)');
      expect(getHeatmapColorMix(25)).toBe('var(--heat-1)');
      expect(getHeatmapColorMix(50)).toBe('var(--heat-2)');
      expect(getHeatmapColorMix(75)).toBe('var(--heat-3)');
      expect(getHeatmapColorMix(100)).toBe('var(--heat-4)');
    });

    it('mixes the two nearest stops in between', () => {
      expect(getHeatmapColorMix(10)).toBe('color-mix(in oklab, var(--heat-1) 40%, var(--heat-0))');
      expect(getHeatmapColorMix(60)).toBe('color-mix(in oklab, var(--heat-3) 40%, var(--heat-2))');
      expect(getHeatmapColorMix(99)).toBe('color-mix(in oklab, var(--heat-4) 96%, var(--heat-3))');
    });

    it('gives every whole percent from 1 to 100 its own colour', () => {
      const colours = new Set(Array.from({ length: 101 }, (_, pct) => getHeatmapColorMix(pct)));
      expect(colours.size).toBe(101);
    });

    it('clamps values outside 0 to 100', () => {
      expect(getHeatmapColorMix(-10)).toBe('var(--heat-0)');
      expect(getHeatmapColorMix(150)).toBe('var(--heat-4)');
    });

    it('grows the glow with progress and shows none at 0', () => {
      expect(getHeatGlowSize(0)).toBe(0);
      expect(getHeatGlowOpacity(0)).toBe(0);
      expect(getHeatGlowSize(1)).toBeLessThan(getHeatGlowSize(50));
      expect(getHeatGlowSize(50)).toBeLessThan(getHeatGlowSize(100));
      expect(getHeatGlowOpacity(1)).toBeLessThan(getHeatGlowOpacity(100));
      expect(getHeatGlowOpacity(100)).toBe(0.7);
    });

    it('defines 5 stops matching the green mastery scale', () => {
      expect(HEAT_STOPS).toEqual([0, 25, 50, 75, 100]);
      expect(MASTERY_STOPS).toEqual([0, 25, 50, 75, 100]);
      expect(MASTERY_COLORS_LIGHT).toHaveLength(5);
      expect(MASTERY_COLORS_DARK).toHaveLength(5);
    });

    it('ensures step 0 is neutral paper grey and steps 1 to 4 belong to the green hue family', () => {
      // Light scale check
      const [, l0S] = rgbToHsl(...hexToRgb(MASTERY_COLORS_LIGHT[0]));
      expect(l0S).toBeLessThanOrEqual(20); // neutral paper grey

      for (let i = 1; i <= 4; i++) {
        const [h, s] = rgbToHsl(...hexToRgb(MASTERY_COLORS_LIGHT[i]));
        expect(h).toBeGreaterThanOrEqual(120);
        expect(h).toBeLessThanOrEqual(165);
        expect(s).toBeGreaterThanOrEqual(50);
      }
      // Step 4 is deep, saturated green
      const [, l4S, l4L] = rgbToHsl(...hexToRgb(MASTERY_COLORS_LIGHT[4]));
      expect(l4S).toBeGreaterThanOrEqual(50);
      expect(l4L).toBeLessThanOrEqual(30);

      // Dark scale check
      const [, d0S] = rgbToHsl(...hexToRgb(MASTERY_COLORS_DARK[0]));
      expect(d0S).toBeLessThanOrEqual(25); // neutral dark slate grey

      for (let i = 1; i <= 4; i++) {
        const [h, s] = rgbToHsl(...hexToRgb(MASTERY_COLORS_DARK[i]));
        expect(h).toBeGreaterThanOrEqual(120);
        expect(h).toBeLessThanOrEqual(165);
        expect(s).toBeGreaterThanOrEqual(50);
      }
      // Step 4 in dark is bright saturated green
      const [, d4S, d4L] = rgbToHsl(...hexToRgb(MASTERY_COLORS_DARK[4]));
      expect(d4S).toBeGreaterThanOrEqual(50);
      expect(d4L).toBeGreaterThanOrEqual(50);
    });

    it('asserts that no step in the scale is in the red or orange hue range', () => {
      const allStops = [...MASTERY_COLORS_LIGHT, ...MASTERY_COLORS_DARK];
      for (const hex of allStops) {
        const [h, s] = rgbToHsl(...hexToRgb(hex));
        // Neutral steps (step 0) have very low saturation
        // If color has any significant saturation (> 20%), hue must NOT be red/orange (0°-55° or 340°-360°)
        if (s > 20) {
          const isRedOrOrange = (h >= 0 && h <= 55) || (h >= 340 && h <= 360);
          expect(isRedOrOrange, `Stop ${hex} (h=${h}, s=${s}) is in red/orange range`).toBe(false);
          // It must be within the green range
          expect(h, `Stop ${hex} hue must be in green family`).toBeGreaterThanOrEqual(100);
          expect(h, `Stop ${hex} hue must be in green family`).toBeLessThanOrEqual(180);
        }
      }
    });

    it('ensures text and numbers drawn on top of each step keep at least 4.5:1 contrast in all five themes', () => {
      const themes = [
        { id: 'pure-white', stops: MASTERY_COLORS_LIGHT, texts: MASTERY_TEXT_COLORS_LIGHT },
        { id: 'light', stops: MASTERY_COLORS_LIGHT, texts: MASTERY_TEXT_COLORS_LIGHT },
        { id: 'sepia', stops: MASTERY_COLORS_LIGHT, texts: MASTERY_TEXT_COLORS_LIGHT },
        { id: 'dark', stops: MASTERY_COLORS_DARK, texts: MASTERY_TEXT_COLORS_DARK },
        { id: 'forest', stops: MASTERY_COLORS_DARK, texts: MASTERY_TEXT_COLORS_DARK },
      ];

      for (const theme of themes) {
        for (let i = 0; i < 5; i++) {
          const stepColor = theme.stops[i];
          const textColor = theme.texts[i];
          const ratio = getContrastRatio(textColor, stepColor);
          expect(
            ratio,
            `Text ${textColor} on step ${i} (${stepColor}) in theme "${theme.id}" has contrast ${ratio.toFixed(2)}:1, below 4.5:1`
          ).toBeGreaterThanOrEqual(4.5);
        }
      }
    });
  });
});
