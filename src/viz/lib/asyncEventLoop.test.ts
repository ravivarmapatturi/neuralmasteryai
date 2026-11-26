import { describe, expect, it } from 'vitest';
import { simulateSyncAndAsync } from './asyncEventLoop';

describe('asyncEventLoop simulation', () => {
  it('matches hand-checked timings for 4 requests (15 ms CPU + 80 ms I/O)', () => {
    const out = simulateSyncAndAsync({ n: 4, cpuMs: 15, ioMs: 80, blockingCpuMs: 0 });
    // Sync: 4 * (15 + 80) = 380 ms
    // Async: 4 * 15 + 80 = 140 ms
    expect(out.syncTotalMs).toBe(380);
    expect(out.asyncTotalMs).toBe(140);
    expect(out.totalCpuWorkMs).toBe(60);
    expect(out.syncCpuUtilPct).toBeCloseTo((60 / 380) * 100, 4);
    expect(out.asyncCpuUtilPct).toBeCloseTo((60 / 140) * 100, 4);
    expect(out.speedup).toBeCloseTo(380 / 140, 6);

    // Every async request finishes its CPU before starting I/O
    expect(out.asyncRows[0]).toMatchObject({ cpuStartMs: 0, cpuEndMs: 15, ioStartMs: 15, ioEndMs: 95 });
    expect(out.asyncRows[3]).toMatchObject({ cpuStartMs: 45, cpuEndMs: 60, ioStartMs: 60, ioEndMs: 140 });
  });

  it('captures single-thread starvation when request 1 blocks the event loop with CPU work', () => {
    const out = simulateSyncAndAsync({ n: 4, cpuMs: 15, ioMs: 80, blockingCpuMs: 100 });
    // r1 hogs CPU from 0..115 ms -> r2 starts at 115 -> r4 ends CPU at 160 -> I/O ends at 240 ms
    expect(out.asyncTotalMs).toBe(240);
    expect(out.syncTotalMs).toBe(480);
    expect(out.asyncRows[1].cpuStartMs).toBe(115);

    const hogSnap = out.snapshots.find((s) => s.timeMs === 115);
    expect(hogSnap).toBeDefined();
    expect(hogSnap!.asyncThreadState).toContain('CPU hog');
    expect(hogSnap!.asyncReadyQueue).toEqual(['r2', 'r3', 'r4']);

    for (const snap of out.snapshots) {
      const cpuBusy = snap.asyncThreadState === 'Idle' ? 0 : 1;
      expect(cpuBusy + snap.asyncReadyQueue.length + snap.asyncWaitingIo.length + snap.asyncDoneCount).toBe(out.n);
    }
  });
});
