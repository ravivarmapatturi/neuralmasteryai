import { describe, expect, it } from 'vitest';
import {
  analyzeCtcAlignment,
  buildExtendedTarget,
  countCtcAlignments,
  parseCtcFrames,
} from './ctcAlignment';

describe('ctcAlignment pure calculations', () => {
  it('hand-checks HELLO collapse with separator blank vs broken drop-blanks-first order', () => {
    const realCtc = analyzeCtcAlignment({
      framesText: 'H H - E E - - L L - L L - O O -',
      targetWord: 'HELLO',
      dropBlanksFirst: false,
    });

    expect(realCtc.frames).toHaveLength(16);
    expect(realCtc.blankCount).toBe(6);
    // Merge consecutive duplicates keeps: H, -, E, -, L, -, L, -, O, -
    expect(realCtc.afterStep1).toEqual(['H', '-', 'E', '-', 'L', '-', 'L', '-', 'O', '-']);
    expect(realCtc.afterStep2).toEqual(['H', 'E', 'L', 'L', 'O']);
    expect(realCtc.decoded).toBe('HELLO');
    expect(realCtc.matchesTarget).toBe(true);
    expect(realCtc.separatorBlanks).toBe(1);
    expect(realCtc.alignedPathStates).not.toBeNull();

    // Dropping blanks BEFORE merging turns LL-LL into LLLL -> single L -> HELO
    const broken = analyzeCtcAlignment({
      framesText: 'H H - E E - - L L - L L - O O -',
      targetWord: 'HELLO',
      dropBlanksFirst: true,
    });
    expect(broken.decoded).toBe('HELO');
    expect(broken.matchesTarget).toBe(false);
  });

  it('hand-checks Graves forward-DP alignment count on small exact sequences', () => {
    expect(buildExtendedTarget('LL')).toEqual(['-', 'L', '-', 'L', '-']);
    // For target "A" and T=2 frames: valid paths in {-A-} are "-A", "A-", "AA" -> 3 paths
    expect(countCtcAlignments(2, 'A')).toBe(3);
    // For target "LL" and T=2 frames: impossible without separator blank -> 0 paths
    expect(countCtcAlignments(2, 'LL')).toBe(0);
    // For target "LL" and T=3 frames: only "L-L" works -> 1 path
    expect(countCtcAlignments(3, 'LL')).toBe(1);
    // For target "AB" and T=2 frames: only "AB" works -> 1 path
    expect(countCtcAlignments(2, 'AB')).toBe(1);
  });

  it('normalizes underscores and whitespace in free frame text input', () => {
    expect(parseCtcFrames('s _ p p - e _ e')).toEqual(['S', '-', 'P', 'P', '-', 'E', '-', 'E']);
  });
});
