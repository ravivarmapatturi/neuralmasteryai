import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import { FONT_FAMILY, RADIUS, useVizTokens } from '../../theme/vizTokens';
import {
  PillSelect,
  Slider,
  StickyNote,
  StickyRow,
  usePrefersReducedMotion,
  useVizVisible,
  VisualizationContainer,
  VisualizationHeader,
  VizButton,
} from '../primitives';
import {
  BUCKET_PRESETS,
  formatTokenCount,
  simulateTokenBucket,
  type BucketStageId,
} from '../lib/tokenBucket';
import { useResponsiveHostWidth } from './useStepPlayback';

const PREDICT_OPTIONS = [
  'Both arrive and pass because refill rate is 2 tokens/s',
  'Only 1 passes and 1 rejects (0.5 s × 2/s = 1 token refilled)',
  'Neither passes until a full 1.0 second elapses',
] as const;

type BucketFormulaTab = 'refill' | 'spend' | 'burst';

const FORMULA_LATEX: Record<BucketFormulaTab, string> = {
  refill: String.raw`\begin{gathered} B(t) = \min(C,\; B_0 + r\,\Delta t) \\ B_0 = B(t_0),\; \Delta t = t - t_0 \end{gathered}`,
  spend: String.raw`\begin{gathered} \text{accept if } B(t) \ge 1 \\ \Longrightarrow\; B \leftarrow B - 1 \end{gathered}`,
  burst: String.raw`\begin{gathered} \text{max admitted}(\Delta t) \\ = C + \lfloor r\,\Delta t\rfloor \end{gathered}`,
};

/** Playback hook starting on initialStep=1 ("Seven arrivals") so default mount shows the live burst result. */
function useBucketPlayback(totalSteps: number, intervalMs: number, initialStep: number, outerVisible: boolean) {
  const reducedMotion = usePrefersReducedMotion();
  const containerVisible = useVizVisible();
  const visible = outerVisible && containerVisible;
  const maxIdx = Math.max(0, totalSteps - 1);

  const [stepState, setStepState] = useState<number>(Math.min(maxIdx, initialStep));
  const [playing, setPlaying] = useState<boolean>(true);
  const step = Math.max(0, Math.min(maxIdx, stepState));
  const effectivePlaying = playing && !reducedMotion;

  useEffect(() => {
    if (!effectivePlaying || !visible || totalSteps < 2) return undefined;
    const id = window.setTimeout(() => {
      setStepState((curr) => (Math.min(maxIdx, curr) + 1) % totalSteps);
    }, intervalMs);
    return () => window.clearTimeout(id);
  }, [effectivePlaying, visible, totalSteps, maxIdx, intervalMs, step]);

  const setStep = useCallback(
    (idx: number) => {
      setPlaying(false);
      setStepState(Math.max(0, Math.min(maxIdx, idx)));
    },
    [maxIdx],
  );
  const next = useCallback(() => {
    setPlaying(false);
    setStepState((curr) => (curr + 1) % Math.max(1, totalSteps));
  }, [totalSteps]);
  const reset = useCallback(() => {
    setPlaying(false);
    setStepState(0);
  }, []);
  const toggle = useCallback(() => setPlaying((p) => !p), []);
  const playFrom = useCallback((idx: number) => {
    setStepState(Math.max(0, Math.min(maxIdx, idx)));
    setPlaying(true);
  }, [maxIdx]);

  return { step, playing: effectivePlaying, setStep, next, reset, toggle, playFrom };
}

function TokenBucketPlayground({
  compact = false,
  outerVisible = true,
}: {
  compact?: boolean;
  outerVisible?: boolean;
}) {
  const t = useVizTokens();
  const clipBucketId = useId();
  const clipSawId = useId();
  const { hostRef, isCompactPhone } = useResponsiveHostWidth(760);

  const [capacity, setCapacity] = useState<number>(5);
  const [refillRate, setRefillRate] = useState<number>(2);
  const [burstCount, setBurstCount] = useState<number>(7);
  const [waitSeconds, setWaitSeconds] = useState<number>(0.5);
  const [followUpCount, setFollowUpCount] = useState<number>(1);
  const [activeFormula, setActiveFormula] = useState<BucketFormulaTab>('refill');
  const [prediction, setPrediction] = useState<number | null>(null);

  const sim = useMemo(
    () =>
      simulateTokenBucket({
        capacity,
        refillRate,
        burstCount,
        waitSeconds,
        followUpCount,
      }),
    [capacity, refillRate, burstCount, waitSeconds, followUpCount],
  );

  const playback = useBucketPlayback(sim.stages.length, 2150, 1, outerVisible);
  const currentStage = sim.stages[playback.step] ?? sim.stages[1];

  const tokenColor = t.accentPrimary;
  const refillColor = t.accentSecondary;
  const rejectColor = t.accentDanger;
  const markerColor = t.accentPurple;

  const inputStyle: React.CSSProperties = {
    width: '100%',
    boxSizing: 'border-box',
    minHeight: 34,
    padding: '4px 8px',
    font: 'inherit',
    fontSize: 15,
    fontVariantNumeric: 'tabular-nums',
    border: `1.5px solid ${t.border}`,
    borderRadius: RADIUS.sm,
    background: t.background,
    color: t.textPrimary,
  };

  const renderBucketPanel = (offsetX: number, panelW: number) => {
    const plotX = offsetX + 18;
    const plotY = 36;
    const plotW = panelW - 34;
    const plotH = 198;

    const bucketX = plotX + 12;
    const bucketY = plotY + 46;
    const bucketW = Math.min(172, Math.max(116, plotW - 144));
    const bucketH = 112;
    const wholeTokens = Math.floor(currentStage.tokensAfter + 1e-9);
    const fracToken = currentStage.tokensAfter - wholeTokens;
    const slotsPerRow = Math.min(6, Math.max(3, Math.ceil(capacity / 2)));
    const rows = Math.ceil(capacity / slotsPerRow);
    const slotW = Math.floor((bucketW - 16 - (slotsPerRow - 1) * 5) / slotsPerRow);
    const slotH = Math.min(34, Math.floor((bucketH - 16 - (rows - 1) * 5) / rows));

    return (
      <g>
        <text x={offsetX + panelW / 2} y={20} textAnchor="middle" fontSize={15} fontWeight={700} fill={t.textPrimary}>
          1. Bucket ({formatTokenCount(currentStage.tokensAfter)} / {capacity} tokens)
        </text>
        <defs>
          <clipPath id={`${clipBucketId}-${offsetX}`}>
            <rect x={plotX} y={plotY} width={plotW} height={plotH} />
          </clipPath>
        </defs>

        <rect x={plotX} y={plotY} width={plotW} height={plotH} fill={t.background} rx={4} />

        <g clipPath={`url(#${clipBucketId}-${offsetX})`}>
          {/* Refill faucet entering from top */}
          <text x={bucketX + bucketW / 2} y={plotY + 18} textAnchor="middle" fontSize={14} fontWeight={700} fill={refillColor}>
            +{formatTokenCount(refillRate)}/s refill
          </text>
          <line x1={bucketX + bucketW / 2} y1={plotY + 24} x2={bucketX + bucketW / 2} y2={bucketY - 4} stroke={refillColor} strokeWidth={2} strokeDasharray={currentStage.id === 'wait' ? undefined : '4 3'} />
          <circle cx={bucketX + bucketW / 2} cy={bucketY - 8} r={4} fill={refillColor} opacity={currentStage.id === 'wait' ? 1 : 0.45} />

          {/* Open-top bucket outline */}
          <path
            d={`M${bucketX} ${bucketY} V${bucketY + bucketH} H${bucketX + bucketW} V${bucketY}`}
            fill={t.surfaceAlt}
            fillOpacity={0.35}
            stroke={t.border}
            strokeWidth={2.2}
          />

          {/* Discrete capacity slots */}
          {Array.from({ length: capacity }, (_, idx) => {
            const row = Math.floor(idx / slotsPerRow);
            const col = idx % slotsPerRow;
            const sx = bucketX + 8 + col * (slotW + 5);
            const sy = bucketY + bucketH - 8 - (row + 1) * slotH - row * 5;
            const isFull = idx < wholeTokens;
            const isPartial = !isFull && idx === wholeTokens && fracToken > 0.05;

            return (
              <g key={`slot-${idx}`}>
                <rect
                  x={sx}
                  y={sy}
                  width={slotW}
                  height={slotH}
                  rx={4}
                  fill={isFull ? tokenColor : t.surface}
                  fillOpacity={isFull ? 0.85 : 0.9}
                  stroke={isFull ? tokenColor : isPartial ? refillColor : t.border}
                  strokeWidth={isFull ? 1.5 : 1.2}
                  strokeDasharray={isFull || isPartial ? undefined : '3 2'}
                />
                {isPartial && (
                  <rect
                    x={sx + 1}
                    y={sy + slotH * (1 - fracToken)}
                    width={Math.max(2, slotW - 2)}
                    height={Math.max(2, slotH * fracToken - 1)}
                    rx={3}
                    fill={refillColor}
                    fillOpacity={0.75}
                  />
                )}
              </g>
            );
          })}

          {/* Outgoing accepted vs rejected counters */}
          <text x={bucketX + bucketW + 14} y={bucketY + 26} fontSize={14} fontWeight={700} fill={tokenColor}>
            ✓ {currentStage.totalAccepted} passed
          </text>
          <text x={bucketX + bucketW + 14} y={bucketY + 56} fontSize={14} fontWeight={700} fill={rejectColor}>
            ✕ {currentStage.totalRejected} dropped
          </text>
          <text x={bucketX + bucketW + 14} y={bucketY + 86} fontSize={14} fill={t.textSecondary}>
            at {currentStage.timeSec.toFixed(1)} s
          </text>
        </g>

        <text x={plotX + plotW / 2} y={plotY + plotH + 22} textAnchor="middle" fontSize={14} fill={t.textSecondary}>
          {currentStage.title}
        </text>
      </g>
    );
  };

  const renderSawtoothPanel = (offsetX: number, panelW: number) => {
    const plotX = offsetX + 46;
    const plotY = 36;
    const plotW = panelW - 76;
    const plotH = 198;
    const maxT = Math.max(1, waitSeconds + 0.25);

    const px = (sec: number) => plotX + (sec / maxT) * plotW;
    const py = (tok: number) => plotY + plotH - (Math.max(0, Math.min(capacity, tok)) / capacity) * (plotH - 14);

    const activeIdx = playback.step;
    const pts = sim.sawtooth.slice(0, activeIdx + 1);
    const fullPath = sim.sawtooth
      .map((p, i) => `${i === 0 ? 'M' : 'L'}${px(p.timeSec).toFixed(1)},${py(p.tokens).toFixed(1)}`)
      .join(' ');
    const activePath = pts
      .map((p, i) => `${i === 0 ? 'M' : 'L'}${px(p.timeSec).toFixed(1)},${py(p.tokens).toFixed(1)}`)
      .join(' ');
    const lastPt = pts[pts.length - 1] ?? sim.sawtooth[0];
    const lastX = px(lastPt.timeSec);
    const lastY = py(lastPt.tokens);
    const placeLeft = lastX > plotX + plotW - 100;
    const labelX = Math.max(plotX + 8, Math.min(plotX + plotW - 8, placeLeft ? lastX - 10 : lastX + 10));
    const labelY = lastY < plotY + 34 ? lastY + 20 : lastY - 12;

    return (
      <g>
        <text x={offsetX + panelW / 2} y={20} textAnchor="middle" fontSize={15} fontWeight={700} fill={t.textPrimary}>
          2. Tokens over time B(t) (sawtooth curve)
        </text>
        <defs>
          <clipPath id={`${clipSawId}-${offsetX}`}>
            <rect x={plotX} y={plotY} width={plotW} height={plotH} />
          </clipPath>
        </defs>

        <rect x={plotX} y={plotY} width={plotW} height={plotH} fill={t.background} rx={4} />
        <line x1={plotX} y1={plotY} x2={plotX} y2={plotY + plotH} stroke={t.border} strokeWidth={1.3} />
        <line x1={plotX} y1={plotY + plotH} x2={plotX + plotW} y2={plotY + plotH} stroke={t.border} strokeWidth={1.3} />

        {[0, Math.round(capacity / 2), capacity].map((yt, idx) => (
          <g key={`ty-${idx}-${yt}`}>
            <line x1={plotX - 4} y1={py(yt)} x2={plotX} y2={py(yt)} stroke={t.border} />
            <text x={plotX - 8} y={py(yt) + 5} textAnchor="end" fontSize={14} fill={t.textMuted}>
              {yt}
            </text>
          </g>
        ))}

        {[0, Number((maxT / 2).toFixed(1)), Number(maxT.toFixed(1))].map((xt, idx) => (
          <g key={`tx-${idx}-${xt}`}>
            <line x1={px(xt)} y1={plotY + plotH} x2={px(xt)} y2={plotY + plotH + 4} stroke={t.border} />
            <text x={px(xt)} y={plotY + plotH + 20} textAnchor="middle" fontSize={14} fill={t.textMuted}>
              {xt}s
            </text>
          </g>
        ))}

        <g clipPath={`url(#${clipSawId}-${offsetX})`}>
          {/* Capacity ceiling */}
          <line x1={plotX} y1={py(capacity)} x2={plotX + plotW} y2={py(capacity)} stroke={t.border} strokeDasharray="4 4" opacity={0.7} />

          {/* Ghost full trajectory + solid active trajectory */}
          <path d={fullPath} fill="none" stroke={t.border} strokeWidth={1.6} strokeDasharray="4 3" opacity={0.55} />
          <path d={activePath} fill="none" stroke={refillColor} strokeWidth={2.6} strokeLinejoin="round" />

          {pts.map((p, i) => (
            <circle
              key={`pt-${i}`}
              cx={px(p.timeSec)}
              cy={py(p.tokens)}
              r={i === pts.length - 1 ? 6 : 4}
              fill={i === pts.length - 1 ? markerColor : refillColor}
              stroke={t.background}
              strokeWidth={1.5}
            />
          ))}
        </g>

        <text
          x={labelX}
          y={labelY}
          textAnchor={placeLeft ? 'end' : 'start'}
          fontSize={14}
          fontWeight={700}
          fill={markerColor}
          stroke={t.background}
          strokeWidth={4}
          paintOrder="stroke"
        >
          {formatTokenCount(lastPt.tokens)} tok
        </text>

        <text x={offsetX + panelW / 2} y={plotY + plotH + 40} textAnchor="middle" fontSize={14} fill={t.textSecondary}>
          Elapsed time (seconds) · max burst = {sim.maxBurstInWindow}
        </text>
      </g>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {!compact && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
            <div style={{ flex: '1 1 320px', minWidth: 0, marginBottom: -8 }}>
              <VisualizationHeader
                eyebrow="Live playground"
                title="Why a rate limiter stores bursts as tokens in a bucket"
                description="A server cannot tell steady average traffic from a sudden spike without a burst budget. A token bucket saves up to C permissions so short bursts pass instantly while excess requests drop immediately."
              />
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', paddingTop: 2 }}>
              <VizButton onClick={playback.toggle}>{playback.playing ? 'Pause' : 'Play'}</VizButton>
              <VizButton variant="secondary" onClick={playback.next}>Step →</VizButton>
              <VizButton variant="secondary" onClick={playback.reset}>Reset</VizButton>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ marginBottom: -8 }}>
              <PillSelect<BucketStageId>
                label="Admission step"
                value={currentStage.id}
                onChange={(nextId) => {
                  const idx = sim.stages.findIndex((s) => s.id === nextId);
                  if (idx >= 0) playback.setStep(idx);
                }}
                options={sim.stages.map((st) => ({ value: st.id, label: st.buttonLabel }))}
              />
            </div>
            <div style={{ marginBottom: -8 }}>
              <PillSelect<string>
                label="Traffic presets"
                value={
                  BUCKET_PRESETS.find(
                    (p) =>
                      p.capacity === capacity &&
                      p.refillRate === refillRate &&
                      p.burstCount === burstCount &&
                      Math.abs(p.waitSeconds - waitSeconds) < 1e-6 &&
                      p.followUpCount === followUpCount,
                  )?.id ?? 'custom'
                }
                onChange={(id) => {
                  const found = BUCKET_PRESETS.find((p) => p.id === id);
                  if (found) {
                    setCapacity(found.capacity);
                    setRefillRate(found.refillRate);
                    setBurstCount(found.burstCount);
                    setWaitSeconds(found.waitSeconds);
                    setFollowUpCount(found.followUpCount);
                  }
                }}
                options={[
                  ...BUCKET_PRESETS.map((p) => ({ value: p.id, label: p.label })),
                  ...(BUCKET_PRESETS.some(
                    (p) =>
                      p.capacity === capacity &&
                      p.refillRate === refillRate &&
                      p.burstCount === burstCount &&
                      Math.abs(p.waitSeconds - waitSeconds) < 1e-6 &&
                      p.followUpCount === followUpCount,
                  )
                    ? []
                    : [{ value: 'custom', label: 'Custom settings' }]),
                ]}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 145px), 1fr))', gap: 12, alignItems: 'end' }}>
            <Slider
              label="Bucket capacity C (max burst)"
              value={capacity}
              onChange={(v) => setCapacity(v)}
              min={1}
              max={12}
              step={1}
              format={(v) => `${v} tokens`}
            />
            <label style={{ display: 'block', fontSize: 15, color: t.textPrimary }}>
              <span style={{ display: 'block', marginBottom: 4, fontWeight: 700 }}>Refill rate r (tok/s)</span>
              <input
                aria-label="Refill rate tokens per second"
                type="number"
                min={0.5}
                max={6}
                step={0.5}
                value={refillRate}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (Number.isFinite(v)) setRefillRate(Math.max(0.5, Math.min(6, v)));
                }}
                style={inputStyle}
              />
            </label>
            <label style={{ display: 'block', fontSize: 15, color: t.textPrimary }}>
              <span style={{ display: 'block', marginBottom: 4, fontWeight: 700 }}>Burst arrivals at t=0</span>
              <input
                aria-label="Burst arrivals count"
                type="number"
                min={1}
                max={12}
                step={1}
                value={burstCount}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (Number.isFinite(v)) setBurstCount(Math.max(1, Math.min(12, Math.round(v))));
                }}
                style={inputStyle}
              />
            </label>
            <label style={{ display: 'block', fontSize: 15, color: t.textPrimary }}>
              <span style={{ display: 'block', marginBottom: 4, fontWeight: 700 }}>Wait Δt (seconds)</span>
              <input
                aria-label="Wait duration seconds"
                type="number"
                min={0}
                max={3}
                step={0.25}
                value={waitSeconds}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (Number.isFinite(v)) setWaitSeconds(Math.max(0, Math.min(3, v)));
                }}
                style={inputStyle}
              />
            </label>
            <label style={{ display: 'block', fontSize: 15, color: t.textPrimary }}>
              <span style={{ display: 'block', marginBottom: 4, fontWeight: 700 }}>Follow-up requests</span>
              <input
                aria-label="Follow-up request count"
                type="number"
                min={1}
                max={6}
                step={1}
                value={followUpCount}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (Number.isFinite(v)) setFollowUpCount(Math.max(1, Math.min(6, Math.round(v))));
                }}
                style={inputStyle}
              />
            </label>
          </div>

          <p role="status" style={{ margin: 0, fontSize: 15, fontWeight: 700, color: t.textPrimary, fontVariantNumeric: 'tabular-nums' }}>
            Accepted {currentStage.totalAccepted} · rejected {currentStage.totalRejected} · tokens {formatTokenCount(currentStage.tokensAfter)}
          </p>
        </>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 18px', fontSize: 15 }} aria-label="Bucket colours">
        <span>
          <span style={{ display: 'inline-block', width: 12, height: 12, background: tokenColor, verticalAlign: 'middle', marginRight: 6 }} />
          Available tokens / accepted
        </span>
        <span>
          <span style={{ display: 'inline-block', width: 18, height: 4, background: refillColor, verticalAlign: 'middle', marginRight: 6 }} />
          Refill trajectory (+{formatTokenCount(refillRate)}/s)
        </span>
        <span>
          <span style={{ display: 'inline-block', width: 12, height: 12, background: rejectColor, verticalAlign: 'middle', marginRight: 6 }} />
          Dropped (429 rejected)
        </span>
      </div>

      <div ref={hostRef} style={{ width: '100%' }}>
        {!isCompactPhone ? (
          <svg
            width="100%"
            viewBox="0 0 760 296"
            role="img"
            aria-label={`${currentStage.title}; ${formatTokenCount(currentStage.tokensAfter)} tokens; ${currentStage.totalAccepted} accepted and ${currentStage.totalRejected} rejected`}
            style={{ display: 'block', fontFamily: FONT_FAMILY }}
          >
            {renderBucketPanel(0, 366)}
            {renderSawtoothPanel(378, 382)}
          </svg>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            <svg width="100%" viewBox="0 0 370 296" role="img" aria-label="Token bucket capacity slots" style={{ display: 'block', fontFamily: FONT_FAMILY }}>
              {renderBucketPanel(0, 370)}
            </svg>
            <svg width="100%" viewBox="0 0 370 296" role="img" aria-label="Tokens over time sawtooth" style={{ display: 'block', fontFamily: FONT_FAMILY }}>
              {renderSawtoothPanel(0, 370)}
            </svg>
          </div>
        )}
      </div>

      {compact ? (
        <StickyRow>
          <StickyNote title="Token bucket refill rule" latex={FORMULA_LATEX.refill} color="yellow" tilt={-1}>
            <p className="nm-sticky__mono" style={{ textAlign: 'center' }}>
              C = {capacity}, r = {formatTokenCount(refillRate)}/s · Accepted {currentStage.totalAccepted}, Rejected {currentStage.totalRejected}
            </p>
          </StickyNote>
          <StickyNote title={`Step ${playback.step + 1} of ${sim.stages.length}`} color="blue" tilt={1} live>
            <p>{currentStage.explain}</p>
          </StickyNote>
        </StickyRow>
      ) : (
        <>
          <StickyRow>
            <StickyNote
              title="Refill arithmetic"
              latex={FORMULA_LATEX.refill}
              color="yellow"
              tilt={-1}
              active={activeFormula === 'refill'}
              onSelect={() => setActiveFormula('refill')}
            >
              <p style={{ textAlign: 'center' }}>Unused time adds r tokens/s, never exceeding capacity C.</p>
            </StickyNote>
            <StickyNote
              title="Spend / reject check"
              latex={FORMULA_LATEX.spend}
              color="pink"
              tilt={1}
              active={activeFormula === 'spend'}
              onSelect={() => setActiveFormula('spend')}
            >
              <p style={{ textAlign: 'center' }}>One request needs ≥ 1 whole token; fractional refill waits.</p>
            </StickyNote>
            <StickyNote
              title="Window admission bound"
              latex={FORMULA_LATEX.burst}
              color="orange"
              tilt={-1}
              active={activeFormula === 'burst'}
              onSelect={() => setActiveFormula('burst')}
            >
              <p style={{ textAlign: 'center' }}>Over any Δt seconds, at most C + ⌊r·Δt⌋ unit requests pass.</p>
            </StickyNote>
          </StickyRow>

          <StickyRow>
            <StickyNote title={`Worked numbers · C = ${capacity}, r = ${formatTokenCount(refillRate)}/s`} color="green" tilt={1}>
              <p className="nm-sticky__mono">
                Refill: min({capacity}, {formatTokenCount(currentStage.tokensBefore)} + {formatTokenCount(waitSeconds)}×{formatTokenCount(refillRate)}) · Tokens left = <strong>{formatTokenCount(currentStage.tokensAfter)}</strong>
              </p>
              <p className="nm-sticky__mono" style={{ marginTop: 4 }}>
                Total passed = <strong>{currentStage.totalAccepted}</strong> · Rejected = <strong>{currentStage.totalRejected}</strong> · Max burst in {formatTokenCount(waitSeconds)} s = <strong>{sim.maxBurstInWindow}</strong>
              </p>
            </StickyNote>
            <StickyNote title={`Step ${playback.step + 1} of ${sim.stages.length} · What just happened`} color="blue" tilt={-1} live>
              <p>{currentStage.explain}</p>
            </StickyNote>
          </StickyRow>

          {/* Inline predict-then-run challenge using aria-live so role="status" remains unique */}
          <div
            style={{
              paddingTop: 8,
              borderTop: `1px dashed ${t.border}`,
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: '8px 12px',
              fontSize: 15,
            }}
          >
            <span style={{ fontWeight: 700, color: t.accentWarn }}>Predict first:</span>
            <span style={{ color: t.textPrimary }}>
              With C = 5 and refill r = 2/s, 7 burst requests empty the bucket at t = 0. You wait 0.5 s and 2 new requests arrive. How many pass?
            </span>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {PREDICT_OPTIONS.map((opt, idx) => {
                const revealed = prediction !== null;
                const picked = prediction === idx;
                const correct = idx === 1;
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setPrediction(idx)}
                    style={{
                      padding: '5px 10px',
                      borderRadius: RADIUS.sm,
                      border: `1.5px solid ${
                        revealed && correct
                          ? tokenColor
                          : revealed && picked
                            ? rejectColor
                            : t.border
                      }`,
                      background:
                        revealed && correct
                          ? tokenColor
                          : revealed && picked
                            ? rejectColor
                            : 'transparent',
                      color: revealed && (correct || picked) ? t.background : t.textPrimary,
                      fontFamily: FONT_FAMILY,
                      fontSize: 14,
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
              <span aria-live="polite" style={{ color: prediction === 1 ? tokenColor : t.accentWarn, fontSize: 15 }}>
                {prediction === 1 ? 'Right — ' : 'Try it — '}
                0.5 s × 2 tokens/s adds 1 token, so 1 passes and 1 drops.{' '}
                <button
                  type="button"
                  onClick={() => {
                    setCapacity(5);
                    setRefillRate(2);
                    setBurstCount(7);
                    setWaitSeconds(0.5);
                    setFollowUpCount(2);
                    playback.setStep(3);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    color: refillColor,
                    textDecoration: 'underline',
                    fontFamily: FONT_FAMILY,
                    fontSize: 15,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Test 2 follow-ups now
                </button>
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default function TokenBucketAdmissionExplorer({ compact = false }: { compact?: boolean } = {}) {
  const outerVisible = useVizVisible();
  return (
    <VisualizationContainer
      title="Token bucket rate limiter playground"
      footer="Exact RFC 2697 token bucket refill arithmetic: min(C, tokens + elapsed × rate). Rejected requests do not queue inside the bucket."
    >
      <TokenBucketPlayground compact={compact} outerVisible={outerVisible} />
    </VisualizationContainer>
  );
}
