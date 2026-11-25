import { useMemo, useState } from 'react';
import { FONT_FAMILY, RADIUS, useVizTokens } from '../../theme/vizTokens';
import {
  Slider,
  StickyNote,
  StickyRow,
  VisualizationContainer,
  VizButton,
  useVizVisible,
} from '../primitives';
import {
  SLO_PRESETS,
  analyzeErrorBudget,
  buildSimulationHours,
  explainErrorBudgetStep,
  simulateBudgetAtHour,
} from '../lib/errorBudget';
import { useResponsiveHostWidth, useStepPlayback } from './useStepPlayback';

const PREDICT_OPTIONS = [
  '20× faster (empties in 36 hours)',
  '2× faster (empties in 15 days)',
  'Safe for the whole 30 days',
] as const;

function formatCount(value: number): string {
  if (!Number.isFinite(value)) return '∞';
  return Math.round(value).toLocaleString('en-US');
}

function ErrorBudgetPlayground({ compact = false, outerVisible }: { compact?: boolean; outerVisible: boolean }) {
  const t = useVizTokens();
  const { hostRef, isCompactPhone } = useResponsiveHostWidth(760);
  const [sloPercent, setSloPercent] = useState(99.9);
  const [observedErrorPercent, setObservedErrorPercent] = useState(2.0);
  const [windowDays, setWindowDays] = useState(30);
  const [rps, setRps] = useState(1000);
  const [activeFormula, setActiveFormula] = useState<'budget' | 'burn' | 'exhaustion'>('burn');
  const [prediction, setPrediction] = useState<number | null>(null);

  const analysis = useMemo(
    () =>
      analyzeErrorBudget({
        sloPercent,
        observedErrorPercent,
        windowDays,
        rps,
      }),
    [sloPercent, observedErrorPercent, windowDays, rps],
  );

  const simHours = useMemo(() => buildSimulationHours(analysis), [analysis]);
  const playback = useStepPlayback(simHours.length, 1900, 1, outerVisible);
  const currentHours = simHours[Math.min(playback.step, simHours.length - 1)] ?? 1;
  const simPoint = useMemo(() => simulateBudgetAtHour(analysis, currentHours), [analysis, currentHours]);

  // Distinct consistent colours everywhere (Blue = 1x sustainable pace, Green = remaining budget, Red = observed burn/spent, Purple = current hour marker)
  const pace1xColor = t.accentSecondary;
  const remainingColor = t.accentPrimary;
  const burnColor = t.accentDanger;
  const markerColor = t.accentPurple;

  const statusTextColor =
    analysis.burnRate === 0 || analysis.alertLevel === 'sustainable'
      ? remainingColor
      : analysis.alertLevel === 'slow-burn'
        ? markerColor
        : burnColor;

  const caption = explainErrorBudgetStep(analysis, simPoint);
  const workedText =
    analysis.burnRate > 0
      ? `b = 100% − ${analysis.sloPercent}% = ${analysis.allowedBadPercent.toFixed(3)}%  |  r = ${analysis.observedErrorPercent.toFixed(1)}% ÷ ${analysis.allowedBadPercent.toFixed(3)}% = ${analysis.burnRate.toFixed(1)}×  |  T_empty = ${analysis.windowHours}h ÷ ${analysis.burnRate.toFixed(1)} = ${analysis.exhaustionHours.toFixed(1)}h (${analysis.oneHourBudgetPercent.toFixed(2)}%/hr)`
      : `b = 100% − ${analysis.sloPercent}% = ${analysis.allowedBadPercent.toFixed(3)}%  |  r = 0.0% ÷ ${analysis.allowedBadPercent.toFixed(3)}% = 0.0×  |  0% consumed`;

  const renderChart = (x0: number, chartW: number, topY: number, bottomY: number) => {
    const plotL = x0 + 52;
    const plotR = x0 + chartW - 18;
    const w = plotR - plotL;
    const h = bottomY - topY;
    const maxSpanHours = Math.max(simHours[simHours.length - 1] ?? 48, 4);
    const clipId = `eb-chart-clip-${x0}-${chartW}`;

    const xHour = (hr: number) => plotL + (Math.min(maxSpanHours, Math.max(0, hr)) / maxSpanHours) * w;
    const yPct = (pct: number) => bottomY - (Math.min(100, Math.max(0, pct)) / 100) * h;

    const endBurnPct = simulateBudgetAtHour(analysis, maxSpanHours).budgetRemainingPercent;
    const endSustainPct = simulateBudgetAtHour(analysis, maxSpanHours).sustainableRemainingPercent;

    const zeroHitX = Number.isFinite(analysis.exhaustionHours) && analysis.exhaustionHours <= maxSpanHours
      ? xHour(analysis.exhaustionHours)
      : plotR;
    const zeroHitY = Number.isFinite(analysis.exhaustionHours) && analysis.exhaustionHours <= maxSpanHours
      ? yPct(0)
      : yPct(endBurnPct);

    const curX = xHour(simPoint.hoursElapsed);
    const curY = yPct(simPoint.budgetRemainingPercent);
    const labelRight = curX < plotR - 135;
    const labelX = labelRight ? curX + 12 : curX - 12;
    const labelY = curY < topY + 26 ? curY + 22 : curY - 14;

    return (
      <g>
        <defs>
          <clipPath id={clipId}>
            <rect x={plotL} y={topY} width={w} height={h} />
          </clipPath>
        </defs>
        <text x={plotL} y={topY - 14} fontSize={15} fontWeight={700} fill={t.textPrimary}>
          1. Error budget burndown (Google SRE style)
        </text>
        <rect x={plotL} y={topY} width={w} height={h} fill={t.background} rx={4} />
        <line x1={plotL} y1={topY} x2={plotL} y2={bottomY} stroke={t.border} strokeWidth={1.3} />
        <line x1={plotL} y1={bottomY} x2={plotR} y2={bottomY} stroke={t.border} strokeWidth={1.3} />

        {[0, 50, 100].map((tick) => (
          <g key={`yt-${tick}`}>
            <line x1={plotL - 4} y1={yPct(tick)} x2={plotL} y2={yPct(tick)} stroke={t.border} />
            <text x={plotL - 8} y={yPct(tick) + 5} textAnchor="end" fontSize={14} fill={t.textMuted}>
              {tick}%
            </text>
          </g>
        ))}

        <text x={plotL} y={bottomY + 20} fontSize={14} fill={t.textMuted}>0h</text>
        <text x={plotR} y={bottomY + 20} textAnchor="end" fontSize={14} fill={t.textSecondary}>
          Incident time (0 → {maxSpanHours}h) →
        </text>

        <g clipPath={`url(#${clipId})`}>
          {/* Sustainable 1x pace */}
          <line
            x1={xHour(0)}
            y1={yPct(100)}
            x2={plotR}
            y2={yPct(endSustainPct)}
            stroke={pace1xColor}
            strokeWidth={2}
            strokeDasharray="5 4"
          />

          {/* Observed burn line */}
          <polyline
            points={
              Number.isFinite(analysis.exhaustionHours) && analysis.exhaustionHours < maxSpanHours
                ? `${xHour(0)},${yPct(100)} ${zeroHitX},${zeroHitY} ${plotR},${yPct(0)}`
                : `${xHour(0)},${yPct(100)} ${plotR},${yPct(endBurnPct)}`
            }
            fill="none"
            stroke={burnColor}
            strokeWidth={2.6}
          />

          {/* Current time cursor */}
          <line x1={curX} y1={topY} x2={curX} y2={bottomY} stroke={markerColor} strokeDasharray="3 3" strokeWidth={1.3} />
        </g>

        <circle cx={curX} cy={curY} r={5} fill={markerColor} stroke={t.background} strokeWidth={1.3} />
        <line x1={curX} y1={curY} x2={labelRight ? labelX - 3 : labelX + 3} y2={labelY - 4} stroke={markerColor} strokeWidth={1.2} />
        <text
          x={labelX}
          y={labelY}
          textAnchor={labelRight ? 'start' : 'end'}
          fontSize={14}
          fontWeight={700}
          fill={markerColor}
        >
          {simPoint.hoursElapsed}h: {simPoint.budgetRemainingPercent.toFixed(0)}% left
        </text>
      </g>
    );
  };

  const renderTank = (x0: number, panelW: number, topY: number, bottomY: number) => {
    const tankW = 74;
    const tankH = bottomY - topY;
    const spentFrac = Math.min(1, Math.max(0, simPoint.budgetConsumedPercent / 100));
    const spentH = spentFrac * tankH;
    const remH = tankH - spentH;
    const clipId = `eb-tank-clip-${x0}-${panelW}`;
    const textX = x0 + tankW + 18;

    return (
      <g>
        <defs>
          <clipPath id={clipId}>
            <rect x={x0} y={topY} width={tankW} height={tankH} rx={6} />
          </clipPath>
        </defs>
        <text x={x0} y={topY - 14} fontSize={15} fontWeight={700} fill={t.textPrimary}>
          2. Budget tank at {simPoint.hoursElapsed}h
        </text>

        {/* Vertical glass tank: red spent from top down, green left at bottom */}
        <rect x={x0} y={topY} width={tankW} height={tankH} rx={6} fill={t.surfaceAlt} stroke={t.border} strokeWidth={1.4} />
        <g clipPath={`url(#${clipId})`}>
          {remH > 0 && (
            <rect x={x0} y={topY + spentH} width={tankW} height={remH} fill={remainingColor} fillOpacity={0.82} />
          )}
          {spentH > 0 && (
            <rect x={x0} y={topY} width={tankW} height={spentH} fill={burnColor} fillOpacity={0.35} />
          )}
          {spentH > 1 && spentH < tankH - 1 && (
            <line x1={x0} y1={topY + spentH} x2={x0 + tankW} y2={topY + spentH} stroke={burnColor} strokeWidth={2} />
          )}
        </g>

        <text x={textX} y={topY + 20} fontSize={14} fontWeight={700} fill={burnColor}>
          Spent: {simPoint.budgetConsumedPercent.toFixed(1)}%
        </text>
        <text x={textX} y={topY + 44} fontSize={14} fontWeight={700} fill={remainingColor}>
          Left: {simPoint.budgetRemainingPercent.toFixed(1)}%
        </text>
        <text x={textX} y={topY + 78} fontSize={14} fill={t.textPrimary}>
          Allowed ({windowDays}d): {formatCount(analysis.allowedBadRequests)}
        </text>
        <text x={textX} y={topY + 102} fontSize={14} fontWeight={700} fill={burnColor}>
          Failed in {simPoint.hoursElapsed}h: {formatCount(simPoint.failedRequestsSoFar)}
        </text>
        <text x={textX} y={topY + 134} fontSize={14} fontWeight={700} fill={statusTextColor}>
          {analysis.alertLevel === 'fast-burn-page'
            ? 'Alert: Fast burn (page!)'
            : analysis.alertLevel === 'slow-burn'
              ? 'Warning: Faster than 1×'
              : 'Healthy: Sustainable pace'}
        </text>
      </g>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {!compact && (
        <>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: t.accentPrimary, marginBottom: 4 }}>
              Live playground
            </div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, lineHeight: 1.35, color: t.textPrimary }}>
              How quickly does an incident spend a monthly error budget?
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: 15, color: t.textSecondary, lineHeight: 1.5 }}>
              A 99.9% reliability goal (SLO) permits only 0.1% of requests to fail over a month — watch how fast a small-looking 2% error spike drains the entire allowance.
            </p>
          </div>

          {/* Control Group 1: SLO Target presets + custom SLO input */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }} role="group" aria-label="SLO reliability targets">
            <span style={{ fontSize: 15, fontWeight: 700, color: t.textSecondary }}>SLO uptime target:</span>
            {SLO_PRESETS.map((preset) => {
              const active = Math.abs(sloPercent - preset) < 1e-4;
              return (
                <button
                  key={preset}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setSloPercent(preset)}
                  style={{
                    padding: '6px 11px',
                    borderRadius: RADIUS.sm,
                    border: `1.5px solid ${active ? t.accentPrimary : t.border}`,
                    background: active ? t.surfaceAlt : 'transparent',
                    color: active ? t.accentPrimary : t.textPrimary,
                    fontFamily: FONT_FAMILY,
                    fontSize: 15,
                    fontWeight: active ? 700 : 500,
                    cursor: 'pointer',
                  }}
                >
                  {preset}%
                </button>
              );
            })}
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 15, color: t.textSecondary }}>
              <span>Custom SLO %:</span>
              <input
                aria-label="Custom SLO target percent"
                type="number"
                min={90}
                max={99.999}
                step={0.05}
                value={sloPercent}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (Number.isFinite(v)) setSloPercent(Math.max(90, Math.min(99.999, v)));
                }}
                style={{
                  width: 82,
                  minHeight: 34,
                  padding: '4px 6px',
                  fontFamily: 'monospace',
                  fontSize: 15,
                  border: `1.5px solid ${t.border}`,
                  borderRadius: RADIUS.sm,
                  background: t.background,
                  color: t.textPrimary,
                }}
              />
            </label>
          </div>

          {/* Control Group 2: Observed failure rate slider + exact input + window + traffic */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 155px), 1fr))', gap: 12, alignItems: 'end' }}>
            <div>
              <Slider
                label="Observed failure rate (%)"
                value={observedErrorPercent}
                onChange={(v) => setObservedErrorPercent(v)}
                min={0}
                max={10}
                step={0.1}
                format={(v) => `${v.toFixed(1)}%`}
              />
            </div>

            <label style={{ display: 'block', minWidth: 0, fontSize: 15 }}>
              <span style={{ display: 'block', marginBottom: 4, color: t.textSecondary }}>Exact failure %</span>
              <input
                aria-label="Exact observed failures percent"
                type="number"
                min={0}
                max={100}
                step={0.1}
                value={observedErrorPercent}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (Number.isFinite(v)) setObservedErrorPercent(Math.max(0, Math.min(100, v)));
                }}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  minHeight: 36,
                  padding: '5px 8px',
                  fontFamily: 'monospace',
                  fontSize: 15,
                  border: `1.5px solid ${t.border}`,
                  borderRadius: RADIUS.sm,
                  background: t.background,
                  color: t.textPrimary,
                }}
              />
            </label>

            <label style={{ display: 'block', minWidth: 0, fontSize: 15 }}>
              <span style={{ display: 'block', marginBottom: 4, color: t.textSecondary }}>Window D (days)</span>
              <input
                aria-label="SLO window days"
                type="number"
                min={1}
                max={90}
                step={1}
                value={windowDays}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (Number.isFinite(v)) setWindowDays(Math.max(1, Math.min(90, Math.round(v))));
                }}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  minHeight: 36,
                  padding: '5px 8px',
                  fontFamily: 'monospace',
                  fontSize: 15,
                  border: `1.5px solid ${t.border}`,
                  borderRadius: RADIUS.sm,
                  background: t.background,
                  color: t.textPrimary,
                }}
              />
            </label>

            <label style={{ display: 'block', minWidth: 0, fontSize: 15 }}>
              <span style={{ display: 'block', marginBottom: 4, color: t.textSecondary }}>Traffic (requests/s)</span>
              <input
                aria-label="Traffic requests per second"
                type="number"
                min={1}
                max={1000000}
                step={100}
                value={rps}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (Number.isFinite(v)) setRps(Math.max(1, Math.min(1_000_000, Math.round(v))));
                }}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  minHeight: 36,
                  padding: '5px 8px',
                  fontFamily: 'monospace',
                  fontSize: 15,
                  border: `1.5px solid ${t.border}`,
                  borderRadius: RADIUS.sm,
                  background: t.background,
                  color: t.textPrimary,
                }}
              />
            </label>
          </div>

          {/* Unique role="status" summary readout (tested by ErrorBudgetExplorer.test.tsx) */}
          <p role="status" style={{ margin: 0, fontSize: 15, fontWeight: 600, color: t.textPrimary }}>
            {analysis.burnRate > 0
              ? `At this constant rate (${analysis.burnRate.toFixed(1)}× burn, ${analysis.oneHourBudgetPercent.toFixed(2)}%/hr), a full ${analysis.windowDays}-day budget lasts ${analysis.exhaustionHours.toFixed(1)} hours.`
              : 'No budget is consumed by this observed interval.'}
          </p>
        </>
      )}

      {/* HTML Colour Legend (consistent everywhere) */}
      <div
        style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px', fontSize: 15, color: t.textSecondary }}
        aria-label="Error budget colours"
      >
        <span>
          <span style={{ display: 'inline-block', width: 18, borderTop: `3px dashed ${pace1xColor}`, verticalAlign: 'middle', marginRight: 6 }} />
          Sustainable 1× pace
        </span>
        <span>
          <span style={{ display: 'inline-block', width: 18, height: 4, background: burnColor, verticalAlign: 'middle', marginRight: 6 }} />
          Observed burn ({analysis.burnRate.toFixed(1)}×) &amp; spent
        </span>
        <span>
          <span style={{ display: 'inline-block', width: 12, height: 12, background: remainingColor, verticalAlign: 'middle', marginRight: 6 }} />
          Remaining budget
        </span>
        <span>
          <span style={{ display: 'inline-block', width: 11, height: 11, borderRadius: '50%', background: markerColor, verticalAlign: 'middle', marginRight: 6 }} />
          Simulated hour ({simPoint.hoursElapsed}h)
        </span>
      </div>

      {/* Main SVG */}
      <div ref={hostRef} style={{ width: '100%' }}>
        {!isCompactPhone ? (
          <svg
            width="100%"
            viewBox="0 0 760 256"
            role="img"
            aria-label={`${analysis.burnRate.toFixed(1)} times burn rate; ${analysis.oneHourBudgetPercent.toFixed(2)} percent monthly budget spent in an hour`}
            style={{ display: 'block', fontFamily: FONT_FAMILY }}
          >
            {renderChart(8, 456, 36, 214)}
            <line x1={474} y1={14} x2={474} y2={236} stroke={t.border} strokeDasharray="4 4" strokeWidth={1.2} />
            {renderTank(492, 260, 36, 214)}
          </svg>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            <svg
              width="100%"
              viewBox="0 0 380 232"
              role="img"
              aria-label={`Remaining error budget burndown at ${analysis.burnRate.toFixed(1)}x speed`}
              style={{ display: 'block', fontFamily: FONT_FAMILY }}
            >
              {renderChart(4, 372, 36, 192)}
            </svg>
            <svg
              width="100%"
              viewBox="0 0 380 206"
              role="img"
              aria-label={`Budget tank at hour ${simPoint.hoursElapsed}`}
              style={{ display: 'block', fontFamily: FONT_FAMILY }}
            >
              {renderTank(14, 352, 36, 188)}
            </svg>
          </div>
        )}
      </div>

      {compact ? (
        <StickyRow>
          <StickyNote
            title="Burn rate & time left"
            latex="r = \frac{e_{\text{obs}}}{b}, \qquad T_{\text{empty}} = \frac{24 \cdot D}{r}"
            color="orange"
            tilt={-1}
          >
            <p className="nm-sticky__mono" style={{ textAlign: 'center' }}>{workedText}</p>
          </StickyNote>
          <StickyNote title={`Simulated hour ${simPoint.hoursElapsed}h (${playback.step + 1} of ${simHours.length})`} color="blue" tilt={1} live>
            <p>{caption}</p>
          </StickyNote>
        </StickyRow>
      ) : (
        <>
          <StickyRow>
            <StickyNote
              title="Allowed error budget b"
              latex="b = 100\% - \text{SLO}"
              color="yellow"
              tilt={-1}
              active={activeFormula === 'budget'}
              onSelect={() => setActiveFormula('budget')}
            >
              <p style={{ textAlign: 'center' }}>
                Share of requests allowed to fail (99.9% uptime target leaves b = 0.1%).
              </p>
            </StickyNote>
            <StickyNote
              title="Burn rate speed r"
              latex="r = \frac{e_{\text{obs}}}{b}"
              color="orange"
              tilt={1}
              active={activeFormula === 'burn'}
              onSelect={() => setActiveFormula('burn')}
            >
              <p style={{ textAlign: 'center' }}>
                How many times faster than 1× sustainable pace failures spend the budget.
              </p>
            </StickyNote>
            <StickyNote
              title="Hours until empty"
              latex="T_{\text{empty}} = \frac{24 \cdot D}{r}"
              color="pink"
              tilt={-1}
              active={activeFormula === 'exhaustion'}
              onSelect={() => setActiveFormula('exhaustion')}
            >
              <p style={{ textAlign: 'center' }}>
                Total hours in a D-day window divided by the burn multiplier r.
              </p>
            </StickyNote>
          </StickyRow>

          <StickyRow>
            <StickyNote title="Worked out with your numbers" color="green" tilt={1}>
              <p className="nm-sticky__mono">{workedText}</p>
            </StickyNote>
            <StickyNote title={`Simulated hour ${simPoint.hoursElapsed}h (${playback.step + 1} of ${simHours.length})`} color="blue" tilt={-1} live>
              <p>{caption}</p>
            </StickyNote>
          </StickyRow>

          {/* Inline predict-then-run challenge using aria-live instead of duplicate role="status" */}
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
              Your 30-day SLO is 99.9% (allowing 0.1% errors). An incident causes 2.0% failures. How fast does the budget drain?
            </span>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {PREDICT_OPTIONS.map((opt, idx) => {
                const revealed = prediction !== null;
                const picked = prediction === idx;
                const correct = idx === 0;
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
                          ? remainingColor
                          : revealed && picked
                            ? burnColor
                            : t.border
                      }`,
                      background:
                        revealed && correct
                          ? remainingColor
                          : revealed && picked
                            ? burnColor
                            : 'transparent',
                      color: revealed && (correct || picked) ? t.background : t.textPrimary,
                      fontFamily: FONT_FAMILY,
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
              <span aria-live="polite" style={{ color: prediction === 0 ? remainingColor : t.accentWarn, fontSize: 15 }}>
                {prediction === 0 ? 'Right — ' : 'Try it — '}
                2.0% ÷ 0.1% = 20× burn, spending all 720 hours in 36.0 hours.{' '}
                <button
                  type="button"
                  onClick={() => {
                    setSloPercent(99.9);
                    setObservedErrorPercent(2.0);
                    setWindowDays(30);
                    playback.playFromStart();
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    color: pace1xColor,
                    textDecoration: 'underline',
                    fontFamily: FONT_FAMILY,
                    fontSize: 15,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Test 2.0% on 99.9% now
                </button>
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <VizButton onClick={playback.toggle}>{playback.playing ? 'Pause' : 'Play'}</VizButton>
            <VizButton variant="secondary" onClick={playback.next}>Step →</VizButton>
            <VizButton variant="secondary" onClick={playback.reset}>Reset</VizButton>
            <span style={{ marginLeft: 'auto', fontSize: 15, color: t.textSecondary }}>
              Time budget: {analysis.timeBudgetMinutes.toFixed(1)} min / {windowDays}d · click any formula note to inspect
            </span>
          </div>
        </>
      )}
    </div>
  );
}

export default function ErrorBudgetExplorer({ compact = false }: { compact?: boolean } = {}) {
  const outerVisible = useVizVisible();
  return (
    <VisualizationContainer
      title="SLO Error Budget & Burn Rate Playground"
      footer="Exact constant-traffic SLO model (Google SRE Workbook). Compare 1× sustainable pace against observed failure burn across custom SLO targets, windows, and traffic."
    >
      <ErrorBudgetPlayground compact={compact} outerVisible={outerVisible} />
    </VisualizationContainer>
  );
}
