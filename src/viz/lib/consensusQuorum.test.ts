import { describe, expect, it } from 'vitest';
import {
  analyzeConsensus,
  maxTolerableFailures,
  quorumThreshold,
} from './consensusQuorum';

describe('consensusQuorum calculations', () => {
  it('computes exact majority quorum and failure tolerance for N = 3, 4, 5, 7', () => {
    expect(quorumThreshold(3)).toBe(2);
    expect(maxTolerableFailures(3)).toBe(1);

    // Crucial insight: 4-node cluster still only tolerates 1 crash, same as 3-node!
    expect(quorumThreshold(4)).toBe(3);
    expect(maxTolerableFailures(4)).toBe(1);

    expect(quorumThreshold(5)).toBe(3);
    expect(maxTolerableFailures(5)).toBe(2);

    expect(quorumThreshold(7)).toBe(4);
    expect(maxTolerableFailures(7)).toBe(3);
  });

  it('guarantees two majorities never both commit during a split', () => {
    for (let n = 3; n <= 9; n++) {
      for (let down = 0; down < n; down++) {
        const mask = Array.from({ length: n }, (_, i) => i > 0 && i <= down);
        const out = analyzeConsensus({
          n,
          unreachableMask: mask,
          scenario: 'partition',
          proposal: 'x = 1',
        });
        expect(out.minOverlap).toBeGreaterThanOrEqual(1);
        expect(out.committed && out.groupBCanCommit).toBe(false);
      }
    }
  });

  it('matches the 5-node boundary (2 down commits, 3 down halts)', () => {
    const ok = analyzeConsensus({
      n: 5,
      unreachableMask: [false, false, false, true, true],
      scenario: 'crash',
      proposal: 'pay $50',
    });
    expect(ok.reachable).toBe(3);
    expect(ok.quorum).toBe(3);
    expect(ok.committed).toBe(true);

    const blocked = analyzeConsensus({
      n: 5,
      unreachableMask: [false, false, true, true, true],
      scenario: 'crash',
      proposal: 'pay $50',
    });
    expect(blocked.reachable).toBe(2);
    expect(blocked.committed).toBe(false);
  });
});
