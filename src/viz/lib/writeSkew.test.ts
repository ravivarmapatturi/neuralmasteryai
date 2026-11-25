import { describe, expect, it } from 'vitest';
import { simulateWriteSkew } from './writeSkew';

describe('writeSkew simulation', () => {
  it('reproduces classic 2-clinician write skew under snapshot isolation (0 left)', () => {
    const sim = simulateWriteSkew({
      mode: 'snapshot',
      totalClinicians: 2,
      minOnCall: 1,
      leaversCount: 2,
      firstActor: 'alice',
    });

    expect(sim.finalOnCallCount).toBe(0);
    expect(sim.invariantHolds).toBe(false);
    expect(sim.writeSkewOccurred).toBe(true);
    expect(sim.writeOverlap).toBe(false);
    expect(sim.clinicians.map((c) => c.decision)).toEqual(['left', 'left']);
    expect(sim.trace).toHaveLength(4);
    expect(sim.trace[3].onCallCount).toBe(0);
  });

  it('preserves exactly 1 clinician under serial order regardless of who goes first', () => {
    const aliceFirst = simulateWriteSkew({
      mode: 'serial',
      totalClinicians: 2,
      minOnCall: 1,
      leaversCount: 2,
      firstActor: 'alice',
    });
    expect(aliceFirst.finalOnCallCount).toBe(1);
    expect(aliceFirst.invariantHolds).toBe(true);
    expect(aliceFirst.writeSkewOccurred).toBe(false);
    expect(aliceFirst.clinicians[0].decision).toBe('left');
    expect(aliceFirst.clinicians[1].decision).toBe('stayed');
    expect(aliceFirst.clinicians[1].abortedFirstAttempt).toBe(true);

    const bobFirst = simulateWriteSkew({
      mode: 'serial',
      totalClinicians: 2,
      minOnCall: 1,
      leaversCount: 2,
      firstActor: 'bob',
    });
    expect(bobFirst.finalOnCallCount).toBe(1);
    expect(bobFirst.clinicians[1].decision).toBe('left');
    expect(bobFirst.clinicians[0].decision).toBe('stayed');
  });

  it('scales cleanly to N=4, M=2, K=3: snapshot fails to 1 while lock keeps 2', () => {
    const snap = simulateWriteSkew({
      mode: 'snapshot',
      totalClinicians: 4,
      minOnCall: 2,
      leaversCount: 3,
    });
    // Each of the 3 leavers reads 4 >= 3, so all 3 leave -> 1 remains (< 2)
    expect(snap.finalOnCallCount).toBe(1);
    expect(snap.writeSkewOccurred).toBe(true);

    const locked = simulateWriteSkew({
      mode: 'row-lock',
      totalClinicians: 4,
      minOnCall: 2,
      leaversCount: 3,
    });
    // Alice (4->3) and Bob (3->2) can leave; Carol sees 2 and stays -> 2 remain
    expect(locked.finalOnCallCount).toBe(2);
    expect(locked.invariantHolds).toBe(true);
    expect(locked.clinicians.map((c) => c.decision)).toEqual(['left', 'left', 'stayed', 'idle']);
  });

  it('handles slack where N-K >= M without false skew alarm', () => {
    const sim = simulateWriteSkew({
      mode: 'snapshot',
      totalClinicians: 4,
      minOnCall: 1,
      leaversCount: 2,
    });
    expect(sim.finalOnCallCount).toBe(2);
    expect(sim.invariantHolds).toBe(true);
    expect(sim.writeSkewOccurred).toBe(false);
  });
});
