import { useId, useMemo, useState } from 'react';
import { FONT_FAMILY, useVizTokens } from '../../theme/vizTokens';
import {
  PillSelect,
  Slider,
  StickyNote,
  StickyRow,
  VisualizationContainer,
  VisualizationHeader,
  VizButton,
  useVizVisible,
} from '../primitives';
import {
  simulateSyncAndAsync,
  type LoopMode,
  type RequestSpan,
} from '../lib/asyncEventLoop';
import { NumericField, PredictChallenge } from './playgroundPrimitives';
import { useResponsiveHostWidth, useStepPlayback } from './useStepPlayback';

const PREDICT_OPTIONS = [
  'Total async time jumps from 140 ms to 240 ms because r2–r4 freeze behind r1',
  'r2–r4 still finish at 140 ms because async runs on 4 separate CPU cores',
  'Only r1 slows down; total async time stays 140 ms',
] as const;

function AsyncEventLoopPlayground({
  compact = false,
  outerVisible = true,
}: {
  compact?: boolean;
  outerVisible?: boolean;
}) {
  const t = useVizTokens();
  const clipTimelineId = useId();
  const clipLoopId = useId();
  const { hostRef, isCompactPhone } = useResponsiveHostWidth(760);

  const [mode, setMode] = useState<LoopMode>('async');
  const [n, setN] = useState(4);
  const [cpuMs, setCpuMs] = useState(15);
  const [ioMs, setIoMs] = useState(80);
  const [blockingCpuMs, setBlockingCpuMs] = useState(0);
  const [prediction, setPrediction] = useState<number | null>(null);

  const sim = useMemo(
    () => simulateSyncAndAsync({ n, cpuMs, ioMs, blockingCpuMs }),
    [n, cpuMs, ioMs, blockingCpuMs],
  );

  // Reduced motion opens around async completion (middle-late snapshot) so the speedup is clear.
  const reducedIdx = Math.max(1, Math.min(sim.snapshots.length - 1, n));
  const playback = useStepPlayback(sim.snapshots.length, 1100, reducedIdx, outerVisible);
  const snap = sim.snapshots[playback.step] ?? sim.snapshots[0];

  const cpuColor = t.accentSecondary;
  const ioColor = t.accentTeal;
  const blockerColor = t.accentDanger;
  const cursorColor = t.accentPurple;
  const okColor = t.accentPrimary;

  const formatTaskList = (items: string[], emptyText: string) => {
    if (items.length === 0) return emptyText;
    if (items.length <= 5) return items.join(', ');
    return `${items.slice(0, 4).join(', ')} +${items.length - 4}`;
  };

  const renderTimelinePanel = (offsetX: number, panelW: number) => {
    const plotX = offsetX + 34;
    const plotW = panelW - 48;
    const scale = sim.syncTotalMs > 0 ? plotW / sim.syncTotalMs : 1;
    const rowH = Math.max(15, Math.min(22, Math.floor(104 / sim.n)));
    const syncTop = 48;
    const asyncTop = syncTop + sim.n * rowH + 34;
    const axisY = asyncTop + sim.n * rowH + 12;
    const cursorX = plotX + snap.timeMs * scale;

    const drawRows = (rows: RequestSpan[], topY: number, isAsync: boolean) =>
      rows.map((row, i) => {
        const y = topY + i * rowH;
        const cpuW = Math.max(2, (row.cpuEndMs - row.cpuStartMs) * scale);
        const ioW = Math.max(0, (row.ioEndMs - row.ioStartMs) * scale);
        return (
          <g key={`${isAsync ? 'a' : 's'}-${row.id}`}>
            <text x={plotX - 6} y={y + rowH / 2 + 4} textAnchor="end" fontSize={14} fill={t.textMuted}>
              {row.label}
            </text>
            <rect
              x={plotX + row.cpuStartMs * scale}
              y={y + 1}
              width={cpuW}
              height={rowH - 3}
              rx={3}
              fill={row.hasBlocker ? blockerColor : cpuColor}
            />
            {ioW > 0 && (
              <rect
                x={plotX + row.ioStartMs * scale}
                y={y + 1}
                width={ioW}
                height={rowH - 3}
                rx={3}
                fill={ioColor}
                fillOpacity={isAsync ? 0.35 : 0.22}
                stroke={ioColor}
                strokeWidth={1.2}
                strokeDasharray={isAsync ? undefined : '4 3'}
              />
            )}
          </g>
        );
      });

    return (
      <g>
        <text x={offsetX + 8} y={20} fontSize={16} fontWeight={700} fill={t.textPrimary}>
          1. Same {sim.n} requests on 1 thread (ms)
        </text>
        <defs>
          <clipPath id={`${clipTimelineId}-${offsetX}`}>
            <rect x={plotX} y={32} width={plotW} height={axisY - 32} />
          </clipPath>
        </defs>

        <text x={plotX} y={syncTop - 10} fontSize={14} fontWeight={mode === 'sync' ? 700 : 500} fill={mode === 'sync' ? blockerColor : t.textSecondary}>
          Sync (thread stalls during wait): {sim.syncTotalMs} ms
        </text>
        <text x={plotX} y={asyncTop - 10} fontSize={14} fontWeight={mode === 'async' ? 700 : 500} fill={mode === 'async' ? okColor : t.textSecondary}>
          Async event loop (overlaps await): {sim.asyncTotalMs} ms
        </text>

        <g clipPath={`url(#${clipTimelineId}-${offsetX})`}>
          {drawRows(sim.syncRows, syncTop, false)}
          {drawRows(sim.asyncRows, asyncTop, true)}
          <line x1={cursorX} y1={36} x2={cursorX} y2={axisY} stroke={cursorColor} strokeWidth={2} strokeDasharray="4 3" />
        </g>

        <line x1={plotX} y1={axisY} x2={plotX + plotW} y2={axisY} stroke={t.border} strokeWidth={1.4} />
        {[0, Math.round(sim.syncTotalMs / 2), sim.syncTotalMs].map((ms) => (
          <text key={ms} x={plotX + ms * scale} y={axisY + 18} textAnchor={ms === 0 ? 'start' : ms === sim.syncTotalMs ? 'end' : 'middle'} fontSize={14} fill={t.textMuted}>
            {ms} ms
          </text>
        ))}
        <text x={Math.max(plotX + 36, Math.min(plotX + plotW - 36, cursorX))} y={axisY + 36} textAnchor="middle" fontSize={14} fontWeight={700} fill={cursorColor}>
          t = {snap.timeMs} ms
        </text>
      </g>
    );
  };

  const renderLoopPanel = (offsetX: number, panelW: number) => {
    const plotX = offsetX + 10;
    const plotY = 36;
    const plotW = panelW - 20;
    const plotH = 310;
    const boxW = plotW - 24;
    const boxX = plotX + 12;

    const hasHog = snap.asyncThreadState.includes('CPU hog');
    const threadFill = mode === 'sync'
      ? (snap.syncThreadState.includes('Blocked') ? blockerColor : cpuColor)
      : (hasHog ? blockerColor : snap.asyncThreadState === 'Idle' ? t.textMuted : okColor);

    const boxes = [
      {
        title: '1. Ready queue (waiting for CPU)',
        val: mode === 'sync' ? `Blocked (${sim.n - snap.syncDoneCount} left)` : formatTaskList(snap.asyncReadyQueue, 'empty'),
        col: cpuColor,
        y: plotY + 14,
      },
      {
        title: '2. Single Python CPU thread',
        val: mode === 'sync' ? snap.syncThreadState : snap.asyncThreadState,
        col: threadFill,
        y: plotY + 86,
      },
      {
        title: '3. OS / network await I/O pool',
        val: mode === 'sync' ? '0 overlapped (thread waits)' : formatTaskList(snap.asyncWaitingIo, 'none'),
        col: ioColor,
        y: plotY + 158,
      },
      {
        title: '4. Completed requests',
        val: mode === 'sync' ? `${snap.syncDoneCount} of ${sim.n}` : `${snap.asyncDoneCount} of ${sim.n}`,
        col: okColor,
        y: plotY + 230,
      },
    ];

    return (
      <g>
        <text x={offsetX + 8} y={20} fontSize={16} fontWeight={700} fill={t.textPrimary}>
          2. Inside the event loop ({mode === 'async' ? 'Async' : 'Sync'})
        </text>
        <defs>
          <clipPath id={`${clipLoopId}-${offsetX}`}>
            <rect x={plotX} y={plotY} width={plotW} height={plotH} />
          </clipPath>
        </defs>
        <rect x={plotX} y={plotY} width={plotW} height={plotH} fill={t.background} stroke={t.border} rx={4} />

        <g clipPath={`url(#${clipLoopId}-${offsetX})`}>
          {boxes.map((b, idx) => (
            <g key={b.title}>
              <rect x={boxX} y={b.y} width={boxW} height={54} rx={5} fill={b.col} fillOpacity={0.13} stroke={b.col} strokeWidth={1.6} />
              <text x={boxX + 10} y={b.y + 21} fontSize={14} fontWeight={700} fill={b.col}>
                {b.title}
              </text>
              <text x={boxX + 10} y={b.y + 42} fontSize={14} fill={t.textPrimary}>
                {b.val}
              </text>
              {idx < boxes.length - 1 && (
                <line x1={boxX + boxW / 2} y1={b.y + 54} x2={boxX + boxW / 2} y2={b.y + 70} stroke={t.border} strokeWidth={1.6} />
              )}
            </g>
          ))}
        </g>
      </g>
    );
  };

  return (
    <>
      {!compact && (
        <>
          <VisualizationHeader
            eyebrow="Live playground"
            title="How one thread serves many requests by overlapping waits"
            description="Web APIs and model servers spend most of their time waiting on databases or LLMs; an async event loop parks each waiting task at await so the single Python thread keeps starting new work."
          />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 10, marginBottom: 8 }}>
            <PillSelect<LoopMode>
              label="Inspector focus (event loop diagram)"
              value={mode}
              onChange={(v) => setMode(typeof v === 'function' ? v(mode) : v)}
              options={[
                { value: 'async', label: 'Async event loop' },
                { value: 'sync', label: 'Sync (blocking)' },
              ]}
            />

            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <VizButton onClick={playback.toggle}>{playback.playing ? 'Pause' : 'Play'}</VizButton>
              <VizButton variant="secondary" onClick={playback.next}>Step →</VizButton>
              <VizButton variant="secondary" onClick={playback.reset}>Reset</VizButton>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 8 }}>
            <Slider
              label="Concurrent requests n"
              value={n}
              onChange={(v) => { setN(v); playback.reset(); }}
              min={1}
              max={8}
              step={1}
              format={(v) => `${v} requests`}
            />
            <Slider
              label="CPU work per request C (ms)"
              value={cpuMs}
              onChange={(v) => { setCpuMs(v); playback.reset(); }}
              min={5}
              max={60}
              step={5}
              format={(v) => `${v} ms`}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 10 }}>
            <NumericField
              label="Requests n"
              hint="1 to 8 concurrent"
              value={n}
              min={1}
              max={8}
              step={1}
              onChange={(v) => { setN(v); playback.reset(); }}
            />
            <NumericField
              label="CPU per request C (ms)"
              hint="5 to 100 ms"
              value={cpuMs}
              min={5}
              max={100}
              step={5}
              onChange={(v) => { setCpuMs(v); playback.reset(); }}
            />
            <NumericField
              label="I/O wait W (ms)"
              hint="0 to 250 ms await"
              value={ioMs}
              min={0}
              max={250}
              step={10}
              onChange={(v) => { setIoMs(v); playback.reset(); }}
            />
            <NumericField
              label="r1 CPU block (ms)"
              hint="0 = clean, >0 stalls loop"
              value={blockingCpuMs}
              min={0}
              max={160}
              step={20}
              onChange={(v) => { setBlockingCpuMs(v); playback.reset(); }}
            />
          </div>
        </>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px', fontSize: 15, marginBottom: 4 }} aria-label="Event loop legend">
        <span style={{ color: cpuColor }}>● Python CPU burst (holds thread)</span>
        <span style={{ color: ioColor }}>● await I/O wait (overlaps in async)</span>
        <span style={{ color: blockerColor }}>● Blocking CPU hog / sync stall</span>
        <span style={{ color: cursorColor }}>● Time cursor t</span>
      </div>

      <div ref={hostRef} style={{ width: '100%' }}>
        {!isCompactPhone ? (
          <svg
            width="100%"
            viewBox="0 0 760 376"
            role="img"
            aria-label={`Sync finishes ${sim.n} requests in ${sim.syncTotalMs} ms while async finishes in ${sim.asyncTotalMs} ms (${sim.speedup.toFixed(2)}x faster)`}
            style={{ display: 'block', fontFamily: FONT_FAMILY }}
          >
            {renderTimelinePanel(0, 476)}
            <line x1={484} y1={14} x2={484} y2={358} stroke={t.border} strokeDasharray="4 4" strokeWidth={1.2} />
            {renderLoopPanel(492, 268)}
          </svg>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            <svg width="100%" viewBox="0 0 380 376" role="img" aria-label="Sync vs async timeline" style={{ display: 'block', fontFamily: FONT_FAMILY }}>
              {renderTimelinePanel(0, 380)}
            </svg>
            <svg width="100%" viewBox="0 0 380 360" role="img" aria-label="Inside the single-thread event loop" style={{ display: 'block', fontFamily: FONT_FAMILY }}>
              {renderLoopPanel(0, 380)}
            </svg>
          </div>
        )}
      </div>

      {compact ? (
        <StickyRow>
          <StickyNote
            title="Async vs Sync wall time"
            latex={String.raw`T_{\text{async}} = n C + C_{\text{block}} + W, \quad T_{\text{sync}} = n(C + W) + C_{\text{block}}`}
            color="green"
            tilt={-1}
          >
            <p className="nm-sticky__mono" style={{ textAlign: 'center' }}>
              Async = <strong>{sim.asyncTotalMs} ms</strong> vs Sync = <strong>{sim.syncTotalMs} ms</strong> ({sim.speedup.toFixed(2)}× faster)
            </p>
          </StickyNote>
          <StickyNote title={`What just happened · t = ${snap.timeMs} ms`} color="blue" tilt={1} live>
            <p>{snap.explain}</p>
          </StickyNote>
        </StickyRow>
      ) : (
        <>
          <StickyRow>
            <StickyNote
              title="1. Sync (blocking) time"
              latex={String.raw`T_{\text{sync}} = n(C + W) + C_{\text{block}}`}
              color="pink"
              tilt={-1}
              active={mode === 'sync'}
              onSelect={() => setMode('sync')}
            >
              <p>C = CPU ms, W = I/O wait ms. The thread idles for W ms on every request before starting the next.</p>
            </StickyNote>
            <StickyNote
              title="2. Async event loop time"
              latex={String.raw`T_{\text{async}} = n C + C_{\text{block}} + W`}
              color="green"
              tilt={1}
              active={mode === 'async'}
              onSelect={() => setMode('async')}
            >
              <p>CPU bursts run back-to-back on 1 thread while all W ms waits overlap in the background.</p>
            </StickyNote>
          </StickyRow>

          <StickyRow>
            <StickyNote title={`Worked numbers (n = ${sim.n}, C = ${sim.cpuMs} ms, W = ${sim.ioMs} ms)`} color="yellow" tilt={-1}>
              <p className="nm-sticky__mono">
                Sync = <strong>{sim.syncTotalMs} ms</strong> ({sim.syncCpuUtilPct.toFixed(1)}% CPU busy)
              </p>
              <p className="nm-sticky__mono" style={{ marginTop: 4 }}>
                Async = <strong>{sim.asyncTotalMs} ms</strong> ({sim.asyncCpuUtilPct.toFixed(1)}% CPU busy ·{' '}
                <strong style={{ color: okColor }}>{sim.speedup.toFixed(2)}× faster</strong>)
              </p>
            </StickyNote>
            <StickyNote title={`What just happened · t = ${snap.timeMs} ms`} color="blue" tilt={1} live>
              <p>{snap.explain}</p>
            </StickyNote>
          </StickyRow>

          <PredictChallenge
            prompt="With 4 async requests (15 ms CPU + 80 ms I/O wait), what happens if r1 runs a synchronous 100 ms Python CPU loop without await?"
            options={PREDICT_OPTIONS}
            correctIndex={0}
            selected={prediction}
            onSelect={setPrediction}
            explanation="Because asyncio uses one thread, r1 holds the thread for 115 ms (15 + 100), pushing total time from 140 ms to 240 ms while r2–r4 sit frozen in the ready queue."
            actionLabel="Add 100 ms CPU blocker to r1 now"
            onAction={() => {
              setMode('async');
              setN(4);
              setCpuMs(15);
              setIoMs(80);
              setBlockingCpuMs(100);
              playback.setStep(1);
            }}
          />
        </>
      )}
    </>
  );
}

export default function AsyncEventLoopDiagram({ compact = false }: { compact?: boolean } = {}) {
  const outerVisible = useVizVisible();
  return (
    <VisualizationContainer
      title="Async event loop timeline playground"
      footer={
        compact
          ? undefined
          : 'Deterministic single-thread event loop model: every CPU burst holds the sole Python thread while await I/O intervals overlap in the OS pool. Adding a blocking CPU call on r1 reproduces real event-loop starvation.'
      }
    >
      <AsyncEventLoopPlayground compact={compact} outerVisible={outerVisible} />
    </VisualizationContainer>
  );
}
