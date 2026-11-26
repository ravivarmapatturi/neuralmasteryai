/**
 * Discrete single-threaded event loop simulator vs blocking synchronous execution.
 * Computes exact CPU bursts, I/O overlap intervals, idle stalls, and ready-queue
 * snapshots at every timeline milestone.
 */

export type LoopMode = 'async' | 'sync';

export interface RequestSpan {
  id: number;
  label: string;
  cpuStartMs: number;
  cpuEndMs: number;
  ioStartMs: number;
  ioEndMs: number;
  hasBlocker: boolean;
}

export type TaskStatusAtTime = 'queued' | 'cpu' | 'io' | 'done';

export interface TimelineSnapshot {
  timeMs: number;
  syncThreadState: string;
  asyncThreadState: string;
  asyncReadyQueue: string[];
  asyncWaitingIo: string[];
  asyncDoneCount: number;
  syncDoneCount: number;
  explain: string;
}

export interface AsyncEventLoopAnalysis {
  n: number;
  cpuMs: number;
  ioMs: number;
  blockingCpuMs: number;
  syncTotalMs: number;
  asyncTotalMs: number;
  totalCpuWorkMs: number;
  syncCpuUtilPct: number;
  asyncCpuUtilPct: number;
  speedup: number;
  syncRows: RequestSpan[];
  asyncRows: RequestSpan[];
  checkpoints: number[];
  snapshots: TimelineSnapshot[];
}

export function simulateSyncAndAsync({
  n,
  cpuMs,
  ioMs,
  blockingCpuMs = 0,
}: {
  n: number;
  cpuMs: number;
  ioMs: number;
  blockingCpuMs?: number;
}): AsyncEventLoopAnalysis {
  const safeN = Math.max(1, Math.min(8, Math.round(n)));
  const safeCpu = Math.max(5, Math.min(100, Math.round(cpuMs)));
  const safeIo = Math.max(0, Math.min(250, Math.round(ioMs)));
  const safeBlock = Math.max(0, Math.min(160, Math.round(blockingCpuMs)));

  const syncRows: RequestSpan[] = [];
  let syncCursor = 0;
  for (let i = 0; i < safeN; i++) {
    const reqCpu = safeCpu + (i === 0 ? safeBlock : 0);
    const cpuStartMs = syncCursor;
    const cpuEndMs = cpuStartMs + reqCpu;
    const ioStartMs = cpuEndMs;
    const ioEndMs = ioStartMs + safeIo;
    syncRows.push({
      id: i,
      label: `r${i + 1}`,
      cpuStartMs,
      cpuEndMs,
      ioStartMs,
      ioEndMs,
      hasBlocker: i === 0 && safeBlock > 0,
    });
    syncCursor = ioEndMs;
  }

  const asyncRows: RequestSpan[] = [];
  let cpuCursor = 0;
  for (let i = 0; i < safeN; i++) {
    const reqCpu = safeCpu + (i === 0 ? safeBlock : 0);
    const cpuStartMs = cpuCursor;
    const cpuEndMs = cpuStartMs + reqCpu;
    const ioStartMs = cpuEndMs;
    const ioEndMs = ioStartMs + safeIo;
    asyncRows.push({
      id: i,
      label: `r${i + 1}`,
      cpuStartMs,
      cpuEndMs,
      ioStartMs,
      ioEndMs,
      hasBlocker: i === 0 && safeBlock > 0,
    });
    cpuCursor = cpuEndMs;
  }

  const syncTotalMs = syncRows[syncRows.length - 1]?.ioEndMs ?? 0;
  const asyncTotalMs = asyncRows.reduce((max, row) => Math.max(max, row.ioEndMs), 0);
  const totalCpuWorkMs = safeN * safeCpu + safeBlock;
  const syncCpuUtilPct = syncTotalMs > 0 ? (totalCpuWorkMs / syncTotalMs) * 100 : 100;
  const asyncCpuUtilPct = asyncTotalMs > 0 ? (totalCpuWorkMs / asyncTotalMs) * 100 : 100;
  const speedup = asyncTotalMs > 0 ? syncTotalMs / asyncTotalMs : 1;

  // Meaningful sorted timeline checkpoints for Play/Step inspection
  const rawPoints = new Set<number>([0]);
  for (const row of asyncRows) {
    rawPoints.add(row.cpuEndMs);
    rawPoints.add(row.ioEndMs);
  }
  rawPoints.add(syncTotalMs);
  const checkpoints = Array.from(rawPoints).sort((a, b) => a - b);

  const snapshots: TimelineSnapshot[] = checkpoints.map((timeMs) => {
    // Evaluate state slightly inside the interval if between events, or at exact boundary
    const probe = timeMs === 0 ? 0.001 : timeMs - 0.001;
    let asyncThreadState = 'Idle';
    const asyncReadyQueue: string[] = [];
    const asyncWaitingIo: string[] = [];
    let asyncDoneCount = 0;

    for (const row of asyncRows) {
      if (timeMs >= row.ioEndMs) {
        asyncDoneCount++;
      } else if (timeMs === 0 ? row.cpuStartMs === 0 : probe >= row.cpuStartMs && probe < row.cpuEndMs) {
        asyncThreadState = row.hasBlocker ? `${row.label} (CPU hog!)` : `${row.label} CPU`;
      } else if (probe >= row.cpuEndMs && timeMs < row.ioEndMs) {
        asyncWaitingIo.push(row.label);
      } else if (probe < row.cpuStartMs) {
        asyncReadyQueue.push(row.label);
      }
    }

    let syncThreadState = 'Idle (all done)';
    let syncDoneCount = 0;
    for (const row of syncRows) {
      if (timeMs >= row.ioEndMs) {
        syncDoneCount++;
      } else if (timeMs === 0 ? row.cpuStartMs === 0 : probe >= row.cpuStartMs && probe < row.cpuEndMs) {
        syncThreadState = `${row.label} CPU`;
      } else if (timeMs >= row.cpuEndMs && timeMs < row.ioEndMs) {
        syncThreadState = `Blocked waiting on ${row.label} I/O`;
      }
    }

    let explain: string;
    if (timeMs === 0) {
      explain = `t = 0 ms: All ${safeN} requests arrive. Async hands the thread to r1 first while r2–r${safeN} sit in the ready queue.`;
    } else if (timeMs >= syncTotalMs) {
      explain = `t = ${timeMs} ms: Sync finally finishes its last request (${syncTotalMs} ms total) — async finished ${(syncTotalMs - asyncTotalMs)} ms earlier (${speedup.toFixed(2)}× faster).`;
    } else if (timeMs >= asyncTotalMs) {
      explain = `t = ${timeMs} ms: Async already finished all ${safeN} requests at ${asyncTotalMs} ms! Sync is still stuck on ${syncThreadState}.`;
    } else if (asyncThreadState.includes('CPU hog')) {
      explain = `t = ${timeMs} ms: r1 ran ${safeBlock} ms of extra blocking Python CPU without await, stalling [${asyncReadyQueue.join(', ') || 'none'}] in the queue!`;
    } else if (asyncWaitingIo.length > 0 && asyncThreadState === 'Idle') {
      explain = `t = ${timeMs} ms: All ${asyncWaitingIo.length} active requests (${asyncWaitingIo.join(', ')}) are awaiting I/O in parallel while the thread rests.`;
    } else {
      explain = `t = ${timeMs} ms: Event loop runs ${asyncThreadState}; [${asyncWaitingIo.join(', ') || 'none'}] await I/O in background (${asyncDoneCount}/${safeN} done).`;
    }

    return {
      timeMs,
      syncThreadState,
      asyncThreadState,
      asyncReadyQueue,
      asyncWaitingIo,
      asyncDoneCount,
      syncDoneCount,
      explain,
    };
  });

  return {
    n: safeN,
    cpuMs: safeCpu,
    ioMs: safeIo,
    blockingCpuMs: safeBlock,
    syncTotalMs,
    asyncTotalMs,
    totalCpuWorkMs,
    syncCpuUtilPct,
    asyncCpuUtilPct,
    speedup,
    syncRows,
    asyncRows,
    checkpoints,
    snapshots,
  };
}
