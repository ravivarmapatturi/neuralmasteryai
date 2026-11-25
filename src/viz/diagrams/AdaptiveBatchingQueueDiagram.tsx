import { useId, useMemo, useState } from 'react';
import { FONT_FAMILY, useVizTokens } from '../../theme/vizTokens';
import {
  PillSelect,
  Slider,
  StickyNote,
  StickyRow,
  useVizVisible,
  VisualizationContainer,
  VisualizationHeader,
  VizButton,
} from '../primitives';
import { simulateAdaptiveBatching } from '../lib/adaptiveBatching';
import { useResponsiveHostWidth, useStepPlayback } from './useStepPlayback';

type FormulaView = 'cost' | 'capacity' | 'latency';

const TRAFFIC_PRESETS = [
  { id: 'moderate', label: 'Moderate (120 req/s)', rate: 120, maxBatch: 8, maxWait: 8 },
  { id: 'burst', label: 'Burst overload (240 req/s)', rate: 240, maxBatch: 16, maxWait: 6 },
  { id: 'light', label: 'Light traffic (20 req/s)', rate: 20, maxBatch: 16, maxWait: 20 },
  { id: 'unbatched', label: 'No batching (B_max = 1)', rate: 120, maxBatch: 1, maxWait: 0 },
] as const;

const PREDICT_OPTIONS = [
  'Speeds up because the GPU batches 16 items',
  'Gets ~20 ms slower because lonely requests wait for the timer',
  'Throughput drops to zero',
] as const;

function AdaptiveBatchingPlayground({
  compact = false,
  outerVisible = true,
}: {
  compact?: boolean;
  outerVisible?: boolean;
}) {
  const t = useVizTokens();
  const clipTimelineId = useId();
  const clipCurveId = useId();
  const { hostRef, isCompactPhone } = useResponsiveHostWidth(760);

  const [arrivalRate, setArrivalRate] = useState(120);
  const [maxBatch, setMaxBatch] = useState(8);
  const [maxWaitMs, setMaxWaitMs] = useState(8);
  const [fixedOverheadMs, setFixedOverheadMs] = useState(20);
  const [perItemMs, setPerItemMs] = useState(1.0);
  const [formulaView, setFormulaView] = useState<FormulaView>('cost');
  const [prediction, setPrediction] = useState<number | null>(null);

  const sim = useMemo(
    () =>
      simulateAdaptiveBatching({
        arrivalRate,
        maxBatch,
        maxWaitMs,
        fixedOverheadMs,
        perItemMs,
        requestCount: 18,
      }),
    [arrivalRate, maxBatch, maxWaitMs, fixedOverheadMs, perItemMs],
  );

  const playback = useStepPlayback(sim.batches.length, 2100, 0, outerVisible);
  const activeBatch = sim.batches[playback.step] ?? sim.batches[0];

  const setupColor = t.accentDanger;
  const batchedColor = t.accentPrimary;
  const curveColor = t.accentSecondary;
  const waitColor = t.accentPurple;

  const activePreset =
    TRAFFIC_PRESETS.find(
      (p) => p.rate === arrivalRate && p.maxBatch === maxBatch && p.maxWait === maxWaitMs,
    )?.id ?? 'custom';

  const inputStyle: React.CSSProperties = {
    width: '100%',
    boxSizing: 'border-box',
    minHeight: 34,
    padding: '4px 8px',
    font: 'inherit',
    fontSize: 15,
    fontVariantNumeric: 'tabular-nums',
    border: `1.5px solid ${t.border}`,
    borderRadius: 6,
    background: t.background,
    color: t.textPrimary,
  };

  const renderTimelinePanel = (offsetX: number, panelW: number) => {
    const plotX = offsetX + 16;
    const plotW = panelW - 32;
    const batchCount = activeBatch.size;
    // Compare running the SAME `batchCount` items one-by-one vs grouped into this 1 batch
    const soloTotalMs = batchCount * sim.unbatchedPerRequestMs;
    const waitMs = Math.max(0, activeBatch.dispatchMs - activeBatch.firstArrivalMs);
    const groupedTotalMs = waitMs + activeBatch.gpuMs;
    const maxScaleMs = Math.max(soloTotalMs, groupedTotalMs, 25);
    const wScale = (ms: number) => Math.max(2, (ms / maxScaleMs) * plotW);

    return (
      <g>
        <text x={offsetX + panelW / 2} y={20} textAnchor="middle" fontSize={15} fontWeight={700} fill={t.textPrimary}>
          Processing {batchCount} request{batchCount === 1 ? '' : 's'} (Batch #{activeBatch.id})
        </text>
        <defs>
          <clipPath id={`${clipTimelineId}-${offsetX}`}>
            <rect x={plotX} y={32} width={plotW} height={220} />
          </clipPath>
        </defs>

        <text x={plotX} y={50} fontSize={14} fontWeight={700} fill={setupColor}>
          1. Without batching: {soloTotalMs.toFixed(1)} ms total
        </text>
        <g clipPath={`url(#${clipTimelineId}-${offsetX})`}>
          {Array.from({ length: batchCount }, (_, i) => {
            const xStart = plotX + wScale(i * sim.unbatchedPerRequestMs);
            const setupW = wScale(sim.config.fixedOverheadMs);
            const itemW = wScale(sim.config.perItemMs);
            return (
              <g key={`solo-${i}`}>
                <rect x={xStart} y={60} width={Math.max(2, setupW - 1)} height={28} rx={3} fill={setupColor} fillOpacity={0.85} />
                <rect x={xStart + setupW} y={60} width={Math.max(2, itemW)} height={28} rx={2} fill={curveColor} fillOpacity={0.85} />
              </g>
            );
          })}
        </g>

        <text x={plotX} y={126} fontSize={14} fontWeight={700} fill={batchedColor}>
          2. Dynamic batching: {groupedTotalMs.toFixed(1)} ms total
        </text>
        <g clipPath={`url(#${clipTimelineId}-${offsetX})`}>
          {waitMs > 0.1 && (
            <rect
              x={plotX}
              y={136}
              width={wScale(waitMs)}
              height={32}
              rx={4}
              fill={waitColor}
              fillOpacity={0.25}
              stroke={waitColor}
              strokeWidth={1.6}
              strokeDasharray="4 3"
            />
          )}
          <rect
            x={plotX + wScale(waitMs)}
            y={136}
            width={wScale(sim.config.fixedOverheadMs)}
            height={32}
            rx={4}
            fill={setupColor}
            fillOpacity={0.88}
          />
          {Array.from({ length: batchCount }, (_, i) => (
            <rect
              key={`bitem-${i}`}
              x={plotX + wScale(waitMs + sim.config.fixedOverheadMs + i * sim.config.perItemMs)}
              y={136}
              width={Math.max(2, wScale(sim.config.perItemMs) - 1)}
              height={32}
              rx={2}
              fill={batchedColor}
              fillOpacity={0.9}
            />
          ))}
        </g>

        <text x={plotX} y={196} fontSize={14} fontWeight={700} fill={t.textPrimary}>
          GPU time / item: {activeBatch.perRequestGpuMs.toFixed(1)} ms (vs {sim.unbatchedPerRequestMs.toFixed(1)} ms unbatched)
        </text>
        <text x={plotX} y={220} fontSize={14} fill={sim.overloaded ? setupColor : t.textSecondary}>
          {sim.overloaded
            ? `Queue overloaded! Arrivals (${sim.config.arrivalRate}/s) > max capacity (${sim.maxBatchCapacityRps.toFixed(0)}/s)`
            : `Avg batch = ${sim.avgBatchSize.toFixed(1)} · Capacity = ${sim.maxBatchCapacityRps.toFixed(0)} req/s (${Math.round(sim.utilization * 100)}% load)`}
        </text>
        <text x={plotX} y={244} fontSize={14} fill={t.textSecondary}>
          Mean latency: {sim.meanLatencyMs.toFixed(1)} ms (vs {sim.unbatchedMeanLatencyMs.toFixed(1)} ms unbatched)
        </text>
      </g>
    );
  };

  const renderCurvePanel = (offsetX: number, panelW: number) => {
    const plotX = offsetX + 54;
    const plotY = 44;
    const plotW = panelW - 72;
    const plotH = 164;
    const maxY = Math.max(sim.unbatchedPerRequestMs * 1.05, 5);

    const px = (b: number) => plotX + ((b - 1) / 31) * plotW;
    const py = (ms: number) => plotY + plotH - (ms / maxY) * (plotH - 8);

    const curvePts = sim.curve.map((pt) => `${px(pt.batchSize)},${py(pt.perRequestGpuMs)}`).join(' ');
    const avgX = px(sim.avgBatchSize);
    const avgY = py(sim.avgPerRequestGpuMs);
    const maxBX = px(sim.config.maxBatch);
    const labelLeft = sim.avgBatchSize > 19;

    return (
      <g>
        <text x={offsetX + panelW / 2} y={20} textAnchor="middle" fontSize={15} fontWeight={700} fill={t.textPrimary}>
          GPU time per request as batch size grows
        </text>
        <defs>
          <clipPath id={`${clipCurveId}-${offsetX}`}>
            <rect x={plotX} y={plotY} width={plotW} height={plotH} />
          </clipPath>
        </defs>

        <line x1={plotX} y1={plotY} x2={plotX} y2={plotY + plotH} stroke={t.border} strokeWidth={1.3} />
        <line x1={plotX} y1={plotY + plotH} x2={plotX + plotW} y2={plotY + plotH} stroke={t.border} strokeWidth={1.3} />

        {[1, 8, 16, 24, 32].map((bTick) => (
          <g key={`bt-${bTick}`}>
            <line x1={px(bTick)} y1={plotY + plotH} x2={px(bTick)} y2={plotY + plotH + 4} stroke={t.border} />
            <text x={px(bTick)} y={plotY + plotH + 19} textAnchor="middle" fontSize={14} fill={t.textMuted}>
              {bTick}
            </text>
          </g>
        ))}

        {[0, Math.round(maxY / 2), Math.round(maxY)].map((yTick, idx) => (
          <g key={`yt-${idx}`}>
            <line x1={plotX - 4} y1={py(yTick)} x2={plotX} y2={py(yTick)} stroke={t.border} />
            <text x={plotX - 8} y={py(yTick) + 4} textAnchor="end" fontSize={14} fill={t.textMuted}>
              {yTick}
            </text>
          </g>
        ))}

        <g clipPath={`url(#${clipCurveId}-${offsetX})`}>
          <line x1={maxBX} y1={plotY} x2={maxBX} y2={plotY + plotH} stroke={waitColor} strokeWidth={1.5} strokeDasharray="4 3" />
          <polyline points={curvePts} fill="none" stroke={curveColor} strokeWidth={2.5} />
          <circle cx={avgX} cy={avgY} r={5.5} fill={batchedColor} stroke={t.background} strokeWidth={1.5} />
        </g>

        <text
          x={labelLeft ? avgX - 8 : avgX + 8}
          y={avgY < plotY + 34 ? avgY + 20 : avgY - 8}
          textAnchor={labelLeft ? 'end' : 'start'}
          fontSize={14}
          fontWeight={700}
          fill={batchedColor}
        >
          B̄={sim.avgBatchSize.toFixed(1)} ({sim.avgPerRequestGpuMs.toFixed(1)} ms)
        </text>
        <text
          x={sim.config.maxBatch > 22 ? maxBX - 6 : maxBX + 6}
          y={plotY + plotH - 8}
          textAnchor={sim.config.maxBatch > 22 ? 'end' : 'start'}
          fontSize={14}
          fill={waitColor}
        >
          B_max={sim.config.maxBatch}
        </text>
        <text x={plotX + plotW / 2} y={plotY + plotH + 40} textAnchor="middle" fontSize={14} fill={t.textSecondary}>
          Batch size B (items grouped per GPU call)
        </text>
      </g>
    );
  };

  return (
    <>
      {!compact && (
        <>
          <VisualizationHeader
            eyebrow="Live playground"
            title="Why GPUs wait briefly to group requests together"
            description="Every GPU inference call pays a large fixed setup cost t₀ ms once per batch plus a tiny per-item cost t₁ ms. A dynamic batcher waits up to W_max ms or until B_max requests arrive so the whole group splits one setup cost."
          />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <div style={{ marginBottom: -8 }}>
              <PillSelect<string>
                label="Traffic scenario (load & batch limits)"
                value={activePreset}
                onChange={(id) => {
                  const found = TRAFFIC_PRESETS.find((p) => p.id === id);
                  if (!found) return;
                  setArrivalRate(found.rate);
                  setMaxBatch(found.maxBatch);
                  setMaxWaitMs(found.maxWait);
                }}
                options={[
                  ...TRAFFIC_PRESETS.map((p) => ({ value: p.id, label: p.label })),
                  ...(activePreset === 'custom' ? [{ value: 'custom', label: 'Custom' }] : []),
                ]}
              />
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <VizButton onClick={playback.toggle}>{playback.playing ? 'Pause' : 'Play'}</VizButton>
              <VizButton variant="secondary" onClick={playback.next}>
                Step →
              </VizButton>
              <VizButton variant="secondary" onClick={playback.reset}>
                Reset
              </VizButton>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14, alignItems: 'end', marginTop: 6 }}>
            <Slider
              label="Arrival rate λ (req/s)"
              value={arrivalRate}
              onChange={(v) => setArrivalRate(v)}
              min={10}
              max={400}
              step={10}
              format={(v) => `${v}/s`}
            />
            <Slider
              label="Max batch B_max"
              value={maxBatch}
              onChange={(v) => setMaxBatch(v)}
              min={1}
              max={32}
              step={1}
            />
            <Slider
              label="Max wait W_max (ms)"
              value={maxWaitMs}
              onChange={(v) => setMaxWaitMs(v)}
              min={0}
              max={30}
              step={1}
              format={(v) => `${v} ms`}
            />
            <label style={{ display: 'block', fontSize: 15, color: t.textPrimary }}>
              <span style={{ display: 'block', marginBottom: 4, fontWeight: 700 }}>Fixed GPU setup t₀ (ms)</span>
              <input
                aria-label="Fixed GPU setup t0 (ms)"
                type="number"
                min={2}
                max={50}
                step={1}
                value={fixedOverheadMs}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  if (!Number.isFinite(val)) return;
                  setFixedOverheadMs(Math.max(2, Math.min(50, Math.round(val))));
                }}
                style={inputStyle}
              />
            </label>
            <label style={{ display: 'block', fontSize: 15, color: t.textPrimary }}>
              <span style={{ display: 'block', marginBottom: 4, fontWeight: 700 }}>Per-item GPU cost t₁ (ms)</span>
              <input
                aria-label="Per-item GPU cost t1 (ms)"
                type="number"
                min={0.2}
                max={10}
                step={0.2}
                value={perItemMs}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  if (!Number.isFinite(val)) return;
                  setPerItemMs(Math.max(0.2, Math.min(10, Number(val.toFixed(1)))));
                }}
                style={inputStyle}
              />
            </label>
          </div>
        </>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 18px', fontSize: 15 }} aria-label="Chart legend">
        <span>
          <span style={{ display: 'inline-block', width: 12, height: 12, background: setupColor, borderRadius: 2, verticalAlign: 'middle', marginRight: 6 }} />
          Fixed GPU setup t₀
        </span>
        <span>
          <span style={{ display: 'inline-block', width: 12, height: 12, background: waitColor, borderRadius: 2, verticalAlign: 'middle', marginRight: 6 }} />
          Queue wait ≤ W_max
        </span>
        <span>
          <span style={{ display: 'inline-block', width: 12, height: 12, background: batchedColor, borderRadius: 2, verticalAlign: 'middle', marginRight: 6 }} />
          Batched GPU work
        </span>
        <span>
          <span style={{ display: 'inline-block', width: 14, height: 4, background: curveColor, verticalAlign: 'middle', marginRight: 6 }} />
          Cost/item curve
        </span>
      </div>

      <div ref={hostRef} style={{ width: '100%' }}>
        {!isCompactPhone ? (
          <svg
            width="100%"
            viewBox="0 0 760 272"
            role="img"
            aria-label={`Dynamic batch #${activeBatch.id} groups ${activeBatch.size} items at ${activeBatch.perRequestGpuMs.toFixed(1)} ms per item`}
            style={{ display: 'block', fontFamily: FONT_FAMILY }}
          >
            {renderTimelinePanel(0, 396)}
            {renderCurvePanel(406, 354)}
          </svg>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            <svg width="100%" viewBox="0 0 370 264" role="img" aria-label="Batched vs unbatched timeline" style={{ display: 'block', fontFamily: FONT_FAMILY }}>
              {renderTimelinePanel(0, 370)}
            </svg>
            <svg width="100%" viewBox="0 0 370 262" role="img" aria-label="GPU cost per request curve" style={{ display: 'block', fontFamily: FONT_FAMILY }}>
              {renderCurvePanel(0, 370)}
            </svg>
          </div>
        )}
      </div>

      {compact ? (
        <StickyRow>
          <StickyNote
            title="GPU cost per request"
            latex={'T_{\\text{req}}(B) = \\frac{t_0 + B \\cdot t_1}{B} = \\frac{t_0}{B} + t_1'}
            color="yellow"
            tilt={-1}
          >
            <p className="nm-sticky__mono" style={{ textAlign: 'center' }}>
              B = {activeBatch.size}: ({sim.config.fixedOverheadMs} + {activeBatch.size}×{sim.config.perItemMs})/{activeBatch.size} = <strong>{activeBatch.perRequestGpuMs.toFixed(1)} ms/req</strong>
            </p>
          </StickyNote>
          <StickyNote title={`Step ${playback.step + 1} of ${sim.batches.length}`} color="blue" tilt={1} live>
            <p>{activeBatch.explain}</p>
          </StickyNote>
        </StickyRow>
      ) : (
        <>
          <StickyRow>
            <StickyNote
              title="GPU time per item"
              latex={'T_{\\text{req}}(B) = \\frac{t_0 + B \\cdot t_1}{B}'}
              color="pink"
              tilt={-1}
              active={formulaView === 'cost'}
              onSelect={() => setFormulaView('cost')}
            >
              <p style={{ textAlign: 'center' }}>Fixed setup t₀ is divided across all B requests in one batch.</p>
            </StickyNote>
            <StickyNote
              title="Max capacity μ"
              latex={'\\mu(B) = \\frac{1000 \\cdot B}{t_0 + B \\cdot t_1}\\text{ req/s}'}
              color="yellow"
              tilt={1}
              active={formulaView === 'capacity'}
              onSelect={() => setFormulaView('capacity')}
            >
              <p style={{ textAlign: 'center' }}>If arrival rate λ exceeds μ, the queue backlog grows unboundedly.</p>
            </StickyNote>
            <StickyNote
              title="Request latency"
              latex={'L_i = (t_{\\text{dispatch}} - a_i) + (t_0 + B \\cdot t_1)'}
              color="orange"
              tilt={-1}
              active={formulaView === 'latency'}
              onSelect={() => setFormulaView('latency')}
            >
              <p style={{ textAlign: 'center' }}>Queue wait (capped at W_max when quiet) plus shared GPU call time.</p>
            </StickyNote>
          </StickyRow>

          <StickyRow>
            <StickyNote title={`Worked numbers · Batch #${activeBatch.id} (B = ${activeBatch.size})`} color="green" tilt={1}>
              <p className="nm-sticky__mono">
                Batch GPU time = {sim.config.fixedOverheadMs} + {activeBatch.size}×{sim.config.perItemMs} = <strong>{activeBatch.gpuMs.toFixed(1)} ms</strong> ({activeBatch.perRequestGpuMs.toFixed(1)} ms/req vs {sim.unbatchedPerRequestMs.toFixed(1)} ms alone)
              </p>
              <p className="nm-sticky__mono" style={{ marginTop: 4 }}>
                Max throughput: <strong>{sim.maxBatchCapacityRps.toFixed(0)} req/s</strong> (unbatched: {sim.unbatchedCapacityRps.toFixed(0)} req/s) · Mean latency <strong>{sim.meanLatencyMs.toFixed(1)} ms</strong>
              </p>
            </StickyNote>
            <StickyNote title={`Step ${playback.step + 1} of ${sim.batches.length} · What just happened`} color="blue" tilt={-1} live>
              <p>{activeBatch.explain}</p>
            </StickyNote>
          </StickyRow>

          <div
            style={{
              marginTop: 4,
              paddingTop: 10,
              borderTop: `1px dashed ${t.border}`,
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: '8px 12px',
              fontSize: 15,
            }}
          >
            <strong style={{ color: t.accentWarn }}>Predict first:</strong>
            <span>Traffic is very light (20 req/s — one request every ~50 ms). If you raise Max Wait W_max to 20 ms with Max Batch = 16, what happens to latency?</span>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {PREDICT_OPTIONS.map((opt, idx) => {
                const picked = prediction === idx;
                const correct = idx === 1;
                const revealed = prediction !== null;
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setPrediction(idx)}
                    style={{
                      padding: '5px 10px',
                      borderRadius: 6,
                      border: `1px solid ${revealed && correct ? t.accentPrimary : revealed && picked ? t.accentDanger : t.border}`,
                      background: revealed && correct ? t.accentPrimary : revealed && picked ? t.accentDanger : 'transparent',
                      color: revealed && (correct || picked) ? t.background : t.textPrimary,
                      font: 'inherit',
                      fontSize: 15,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
            {prediction !== null && (
              <span role="status" style={{ fontSize: 15, color: prediction === 1 ? t.accentPrimary : t.accentWarn }}>
                {prediction === 1 ? 'Correct — ' : 'Watch — '}
                when requests arrive 50 ms apart, lonely items sit idle for the full 20 ms timeout and still run mostly alone.{' '}
                <button
                  type="button"
                  onClick={() => {
                    setArrivalRate(20);
                    setMaxBatch(16);
                    setMaxWaitMs(20);
                    playback.setStep(0);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    color: t.accentSecondary,
                    textDecoration: 'underline',
                    font: 'inherit',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Run light traffic (20 req/s, 20 ms wait) now
                </button>
              </span>
            )}
          </div>
        </>
      )}
    </>
  );
}

export default function AdaptiveBatchingQueueDiagram({ compact = false }: { compact?: boolean } = {}) {
  const outerVisible = useVizVisible();
  return (
    <VisualizationContainer
      title="Adaptive batching queue playground"
      footer="Discrete-event batcher simulation: each batch collects arrivals up to B_max or W_max ms, then executes one GPU pass of t₀ + B·t₁ ms."
    >
      <AdaptiveBatchingPlayground compact={compact} outerVisible={outerVisible} />
    </VisualizationContainer>
  );
}
