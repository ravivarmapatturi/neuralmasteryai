import { useMemo, useState } from 'react';
import { FONT_FAMILY, RADIUS, useVizTokens } from '../../theme/vizTokens';
import { SketchRect } from '../../components/notebook/RoughShape';
import {
  PillSelect,
  StickyNote,
  StickyRow,
  VisualizationContainer,
  VizButton,
  useVizVisible,
} from '../primitives';
import {
  FEATURE_NAMES,
  SHAPLEY_PRESETS,
  computeShapleyAnalysis,
  explainShapleyStep,
  type FeatureId,
  type ShapleyGameParams,
  type ShapleyPresetId,
} from '../lib/shapleyCoalitions';
import { PredictChallenge } from './playgroundPrimitives';
import { useResponsiveHostWidth, useStepPlayback } from './useStepPlayback';

const FEATURE_OPTIONS: { value: FeatureId; label: string }[] = [
  { value: 'I', label: 'income' },
  { value: 'C', label: 'credit_score' },
  { value: 'A', label: 'age' },
];

const PREDICT_OPTIONS = [
  '0.0 (always zero)',
  'Depends on arrival order',
  'Equal to baseline ÷ 3',
] as const;

function shortName(id: FeatureId): string {
  if (id === 'I') return 'inc';
  if (id === 'C') return 'cred';
  return 'age';
}

function formatSignedSumList(values: number[]): string {
  return values
    .map((v, idx) => {
      const absStr = Math.abs(v).toFixed(0);
      if (idx === 0) return v < 0 ? `−${absStr}` : absStr;
      return v < 0 ? `− ${absStr}` : `+ ${absStr}`;
    })
    .join(' ');
}

function ShapleyPlayground({ compact = false, outerVisible }: { compact?: boolean; outerVisible: boolean }) {
  const t = useVizTokens();
  const { hostRef, isCompactPhone } = useResponsiveHostWidth(760);
  const [presetId, setPresetId] = useState<ShapleyPresetId | 'custom'>('loan-default');
  const [params, setParams] = useState<ShapleyGameParams>(() => ({ ...SHAPLEY_PRESETS[0].params }));
  const [focusFeature, setFocusFeature] = useState<FeatureId>('I');
  const [activeFormula, setActiveFormula] = useState<'shapley' | 'efficiency'>('shapley');
  const [prediction, setPrediction] = useState<number | null>(null);

  const playback = useStepPlayback(6, 2200, 0, outerVisible);
  const orderIdx = playback.step;

  const analysis = useMemo(() => computeShapleyAnalysis(params), [params]);
  const trace = analysis.orderings[orderIdx] ?? analysis.orderings[0];

  // Distinct consistent colours everywhere (Blue = income, Purple = credit_score, Teal = age, Green = total/check)
  const featureColors: Record<FeatureId, string> = {
    I: t.accentSecondary,
    C: t.accentPurple,
    A: t.accentTeal,
  };
  const checkColor = t.accentPrimary;

  const applyPreset = (id: ShapleyPresetId) => {
    const found = SHAPLEY_PRESETS.find((p) => p.id === id);
    if (!found) return;
    setPresetId(id);
    setParams({ ...found.params });
    playback.setStep(0);
  };

  const updateParam = (key: keyof ShapleyGameParams, raw: number) => {
    const val = Math.max(-50, Math.min(100, Number.isFinite(raw) ? raw : 0));
    setPresetId('custom');
    setParams((prev) => ({ ...prev, [key]: val }));
  };

  const focusDeltas = analysis.orderings.map((o) => o.deltas[focusFeature]);
  const focusSum = focusDeltas.reduce((acc, v) => acc + v, 0);
  const workedShapley = `φ(${FEATURE_NAMES[focusFeature]}) = (${formatSignedSumList(focusDeltas)}) ÷ 6 = ${focusSum.toFixed(0)} ÷ 6 = ${analysis.shapleyValues[focusFeature].toFixed(1)}  |  Check: ${analysis.baseline.toFixed(0)} + ${analysis.shapleyValues.I.toFixed(1)} + ${analysis.shapleyValues.C.toFixed(1)} + ${analysis.shapleyValues.A.toFixed(1)} = ${analysis.efficiencySum.toFixed(1)}`;
  const caption = explainShapleyStep(analysis, orderIdx, focusFeature);

  const allScores = Object.values(analysis.coalitionValues);
  const minScore = Math.min(0, ...allScores) - 6;
  const maxScore = Math.max(100, ...allScores) + 10;

  const renderPathPanel = (x0: number, panelW: number, topY: number, bottomY: number) => {
    const plotL = x0 + 38;
    const plotR = x0 + panelW - 22;
    const stageX = [
      plotL + 16,
      plotL + Math.round((plotR - plotL) * 0.35),
      plotL + Math.round((plotR - plotL) * 0.67),
      plotR - 18,
    ];
    const yFor = (val: number) =>
      bottomY - ((val - minScore) / Math.max(1, maxScore - minScore)) * (bottomY - topY);
    const clipId = `shap-path-clip-${x0}-${panelW}`;

    const points = [
      { x: stageX[0], y: yFor(analysis.baseline), score: analysis.baseline, label: 'none' },
      ...trace.steps.map((s, idx) => ({
        x: stageX[idx + 1],
        y: yFor(s.after),
        score: s.after,
        label: s.afterCoalition.map(shortName).join('+'),
      })),
    ];

    return (
      <g>
        <defs>
          <clipPath id={clipId}>
            <rect x={plotL} y={topY - 6} width={plotR - plotL} height={bottomY - topY + 12} />
          </clipPath>
        </defs>
        <text x={x0} y={topY - 22} fontSize={15} fontWeight={700} fill={t.textPrimary}>
          Arrival order #{orderIdx + 1}: {trace.order.map((f) => FEATURE_NAMES[f]).join(' → ')}
        </text>
        <rect x={plotL} y={topY} width={plotR - plotL} height={bottomY - topY} fill={t.background} rx={4} />
        <line x1={plotL} y1={topY} x2={plotL} y2={bottomY} stroke={t.border} strokeWidth={1.2} />
        <line x1={plotL} y1={bottomY} x2={plotR} y2={bottomY} stroke={t.border} strokeWidth={1.2} />
        <text x={plotL - 6} y={topY + 10} textAnchor="end" fontSize={14} fill={t.textMuted}>{Math.round(maxScore)}</text>
        <text x={plotL - 6} y={bottomY + 4} textAnchor="end" fontSize={14} fill={t.textMuted}>{Math.round(minScore)}</text>

        <g clipPath={`url(#${clipId})`}>
          {trace.steps.map((s, i) => {
            const x1 = points[i].x;
            const y1 = points[i].y;
            const x2 = points[i + 1].x;
            const y2 = points[i + 1].y;
            const color = featureColors[s.feature];
            const isFocus = s.feature === focusFeature;
            return (
              <line
                key={`${s.feature}-${i}`}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={color}
                strokeWidth={isFocus ? 3.5 : 2.3}
                strokeOpacity={isFocus ? 1 : 0.78}
              />
            );
          })}
        </g>

        {/* Offset delta labels with short leader lines below segments so they never collide with dot scores */}
        {trace.steps.map((s, i) => {
          const x1 = points[i].x;
          const y1 = points[i].y;
          const x2 = points[i + 1].x;
          const y2 = points[i + 1].y;
          const midX = (x1 + x2) / 2;
          const midY = (y1 + y2) / 2;
          const color = featureColors[s.feature];
          const isFocus = s.feature === focusFeature;
          const placeBelow = midY < bottomY - 26;
          const labelY = placeBelow ? Math.min(bottomY - 6, midY + 22) : Math.max(topY + 16, midY - 20);
          return (
            <g key={`lbl-${s.feature}-${i}`}>
              <line x1={midX} y1={midY} x2={midX} y2={placeBelow ? labelY - 12 : labelY + 4} stroke={color} strokeWidth={1} strokeOpacity={0.6} />
              <text
                x={midX}
                y={labelY}
                textAnchor="middle"
                fontSize={14}
                fontWeight={isFocus ? 700 : 600}
                fill={color}
              >
                {shortName(s.feature)} {s.delta >= 0 ? '+' : ''}{s.delta.toFixed(0)}
              </text>
            </g>
          );
        })}

        {points.map((pt, idx) => {
          const scoreAbove = pt.y > topY + 20;
          return (
            <g key={`pt-${idx}`}>
              <line x1={pt.x} y1={bottomY} x2={pt.x} y2={pt.y} stroke={t.border} strokeDasharray="3 3" strokeWidth={1} />
              <circle cx={pt.x} cy={pt.y} r={5} fill={t.textPrimary} stroke={t.background} strokeWidth={1.3} />
              <text
                x={pt.x}
                y={scoreAbove ? pt.y - 10 : pt.y + 18}
                textAnchor="middle"
                fontSize={14}
                fontWeight={700}
                fontFamily="monospace"
                fill={t.textPrimary}
              >
                {pt.score.toFixed(0)}
              </text>
              <text x={pt.x} y={bottomY + 19} textAnchor="middle" fontSize={14} fill={t.textSecondary}>
                {pt.label}
              </text>
            </g>
          );
        })}
      </g>
    );
  };

  const renderBarsPanel = (x0: number, panelW: number, topY: number) => {
    const vals = (['I', 'C', 'A'] as FeatureId[]).map((f) => analysis.shapleyValues[f]);
    const minVal = Math.min(0, ...vals);
    const maxVal = Math.max(10, ...vals);
    const span = Math.max(10, maxVal - minVal);
    const barStart = x0 + 96;
    const maxBarW = Math.max(82, panelW - 158);
    const zeroX = barStart + ((0 - minVal) / span) * maxBarW;
    const clipId = `shap-bars-clip-${x0}-${panelW}`;

    return (
      <g>
        <defs>
          <clipPath id={clipId}>
            <rect x={barStart} y={topY} width={maxBarW} height={134} rx={4} />
          </clipPath>
        </defs>
        <text x={x0} y={topY - 22} fontSize={15} fontWeight={700} fill={t.textPrimary}>
          Fair average across 6 orders (φ)
        </text>
        <line x1={zeroX} y1={topY + 2} x2={zeroX} y2={topY + 122} stroke={t.border} strokeWidth={1.3} />
        {(['I', 'C', 'A'] as FeatureId[]).map((f, idx) => {
          const y = topY + 6 + idx * 42;
          const val = analysis.shapleyValues[f];
          const valX = barStart + ((val - minVal) / span) * maxBarW;
          const bx = Math.min(zeroX, valX);
          const bw = Math.max(4, Math.abs(valX - zeroX));
          const color = featureColors[f];
          const isFocus = f === focusFeature;
          return (
            <g key={f} onClick={() => setFocusFeature(f)} style={{ cursor: 'pointer' }}>
              <text
                x={barStart - 8}
                y={y + 16}
                textAnchor="end"
                fontSize={14}
                fontWeight={isFocus ? 700 : 500}
                fill={color}
              >
                {FEATURE_NAMES[f]}
              </text>
              <rect x={barStart} y={y + 1} width={maxBarW} height={20} rx={4} fill={t.surfaceAlt} />
              <g clipPath={`url(#${clipId})`}>
                <rect x={bx} y={y + 1} width={bw} height={20} rx={4} fill={color} fillOpacity={isFocus ? 0.95 : 0.72} />
              </g>
              <text
                x={barStart + maxBarW + 8}
                y={y + 16}
                fontSize={14}
                fontWeight={700}
                fontFamily="monospace"
                fill={color}
              >
                {val >= 0 ? '+' : ''}{val.toFixed(1)}
              </text>
            </g>
          );
        })}
        <text x={x0} y={topY + 148} fontSize={14} fontWeight={700} fill={checkColor}>
          Sum = {analysis.baseline.toFixed(0)} + {analysis.totalGain.toFixed(0)} = {analysis.efficiencySum.toFixed(0)} (exact!)
        </text>
      </g>
    );
  };

  const renderSixOrdersStrip = (x0: number, totalW: number, topY: number) => {
    const colW = Math.floor(totalW / 6);
    const focusColor = featureColors[focusFeature];
    return (
      <g>
        <text x={x0} y={topY - 8} fontSize={14} fontWeight={700} fill={t.textSecondary}>
          All 6 arrival orders (click any order to check {FEATURE_NAMES[focusFeature]}’s jump):
        </text>
        {analysis.orderings.map((ord, idx) => {
          const cx = x0 + idx * colW + colW / 2;
          const active = idx === orderIdx;
          const delta = ord.deltas[focusFeature];
          return (
            <g key={ord.label} onClick={() => playback.setStep(idx)} style={{ cursor: 'pointer' }}>
              {active && (
                <SketchRect
                  x={x0 + idx * colW + 4}
                  y={topY + 2}
                  width={colW - 8}
                  height={46}
                  color={focusColor}
                  strokeWidth={2}
                  roughness={1}
                  id={`shap-order-${idx}`}
                />
              )}
              <text
                x={cx}
                y={topY + 21}
                textAnchor="middle"
                fontSize={14}
                fontWeight={active ? 700 : 500}
                fill={active ? focusColor : t.textSecondary}
              >
                {ord.label}
              </text>
              <text
                x={cx}
                y={topY + 41}
                textAnchor="middle"
                fontSize={14}
                fontWeight={700}
                fontFamily="monospace"
                fill={active ? focusColor : t.textPrimary}
              >
                {delta >= 0 ? '+' : ''}{delta.toFixed(0)}
              </text>
            </g>
          );
        })}
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
              How does SHAP split credit fairly when arrival order matters?
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: 15, color: t.textSecondary, lineHeight: 1.5 }}>
              When a loan model combines income, credit score, and age, adding a feature boosts the score differently depending on who arrived first — Shapley values average every feature’s jump across all 6 possible orders so nothing is left over.
            </p>
          </div>

          {/* Control Group 1: Scenarios */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }} role="group" aria-label="Loan game scenarios">
            <span style={{ fontSize: 15, fontWeight: 700, color: t.textSecondary }}>Scenarios (try a payoff setup):</span>
            {SHAPLEY_PRESETS.map((p) => {
              const active = presetId === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => applyPreset(p.id)}
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
                  {p.label}
                </button>
              );
            })}
          </div>

          {/* Control Group 2: Free numeric coalition inputs (all interaction terms visible!) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 108px), 1fr))', gap: 8, alignItems: 'end' }}>
            {[
              { key: 'baseline' as const, label: 'Baseline v(∅)' },
              { key: 'soloI' as const, label: 'Income +I' },
              { key: 'soloC' as const, label: 'Credit +C' },
              { key: 'soloA' as const, label: 'Age +A' },
              { key: 'synergyIC' as const, label: 'I+C bonus' },
              { key: 'synergyIA' as const, label: 'I+A bonus' },
              { key: 'synergyThree' as const, label: '3-way adj.' },
            ].map((field) => (
              <label key={field.key} style={{ display: 'block', minWidth: 0, fontSize: 15 }}>
                <span style={{ display: 'block', marginBottom: 4, color: t.textSecondary }}>{field.label}</span>
                <input
                  aria-label={field.label}
                  type="number"
                  min={-30}
                  max={100}
                  step={1}
                  value={params[field.key]}
                  onChange={(e) => updateParam(field.key, Number(e.target.value))}
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
            ))}
          </div>

          {/* Control Group 3: Feature focus + Live readout */}
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
            <PillSelect<FeatureId>
              label="Feature to track across all 6 arrival orders"
              value={focusFeature}
              onChange={(next) => setFocusFeature(typeof next === 'function' ? next(focusFeature) : next)}
              options={FEATURE_OPTIONS}
            />
            <div style={{ fontSize: 15, color: t.textPrimary, fontVariantNumeric: 'tabular-nums' }} aria-live="polite">
              Baseline: <strong>{analysis.baseline.toFixed(0)}</strong> → Final:{' '}
              <strong style={{ color: checkColor }}>{analysis.fullPrediction.toFixed(0)}</strong> · φ({FEATURE_NAMES[focusFeature]}):{' '}
              <strong style={{ color: featureColors[focusFeature] }}>{analysis.shapleyValues[focusFeature].toFixed(1)}</strong>
            </div>
          </div>
        </>
      )}

      {/* HTML Colour Legend (consistent everywhere) */}
      <div
        style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px', fontSize: 15, color: t.textSecondary }}
        aria-label="Feature colours"
      >
        <span>
          <span style={{ display: 'inline-block', width: 16, height: 4, background: featureColors.I, verticalAlign: 'middle', marginRight: 6 }} />
          income (I)
        </span>
        <span>
          <span style={{ display: 'inline-block', width: 16, height: 4, background: featureColors.C, verticalAlign: 'middle', marginRight: 6 }} />
          credit_score (C)
        </span>
        <span>
          <span style={{ display: 'inline-block', width: 16, height: 4, background: featureColors.A, verticalAlign: 'middle', marginRight: 6 }} />
          age (A)
        </span>
        <span>
          <span style={{ display: 'inline-block', width: 11, height: 11, borderRadius: '50%', background: checkColor, verticalAlign: 'middle', marginRight: 6 }} />
          Efficiency check (sums to {analysis.fullPrediction.toFixed(0)})
        </span>
      </div>

      {/* Main SVG */}
      <div ref={hostRef} style={{ width: '100%' }}>
        {!isCompactPhone ? (
          <svg
            width="100%"
            viewBox="0 0 760 326"
            role="img"
            aria-label={`Shapley coalition ordering ${trace.label} giving φ_income=${analysis.shapleyValues.I.toFixed(1)}, φ_credit=${analysis.shapleyValues.C.toFixed(1)}, φ_age=${analysis.shapleyValues.A.toFixed(1)}`}
            style={{ display: 'block', fontFamily: FONT_FAMILY }}
          >
            {renderPathPanel(8, 444, 42, 200)}
            <line x1={462} y1={14} x2={462} y2={224} stroke={t.border} strokeDasharray="4 4" strokeWidth={1.2} />
            {renderBarsPanel(478, 272, 42)}
            {renderSixOrdersStrip(14, 732, 260)}
          </svg>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            <svg
              width="100%"
              viewBox="0 0 380 232"
              role="img"
              aria-label={`Shapley arrival order ${trace.label}`}
              style={{ display: 'block', fontFamily: FONT_FAMILY }}
            >
              {renderPathPanel(4, 372, 42, 198)}
            </svg>
            <svg
              width="100%"
              viewBox="0 0 380 202"
              role="img"
              aria-label={`Average Shapley attributions across all 6 orders`}
              style={{ display: 'block', fontFamily: FONT_FAMILY }}
            >
              {renderBarsPanel(10, 360, 40)}
            </svg>
            {!compact && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 6 }} role="group" aria-label="All 6 arrival orders">
                {analysis.orderings.map((ord, idx) => {
                  const active = idx === orderIdx;
                  const focusColor = featureColors[focusFeature];
                  const delta = ord.deltas[focusFeature];
                  return (
                    <button
                      key={ord.label}
                      type="button"
                      aria-pressed={active}
                      onClick={() => playback.setStep(idx)}
                      style={{
                        padding: '6px 4px',
                        borderRadius: RADIUS.sm,
                        border: `1.5px solid ${active ? focusColor : t.border}`,
                        background: active ? t.surfaceAlt : 'transparent',
                        color: active ? focusColor : t.textPrimary,
                        fontFamily: FONT_FAMILY,
                        fontSize: 15,
                        fontWeight: active ? 700 : 500,
                        cursor: 'pointer',
                      }}
                    >
                      {ord.label}: {delta >= 0 ? '+' : ''}{delta.toFixed(0)}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {compact ? (
        <StickyRow>
          <StickyNote
            title="Shapley value (fair average)"
            latex="\phi_i = \frac{1}{|N|!}\sum_{\pi} \big[v(S_\pi \cup \{i\}) - v(S_\pi)\big]"
            color="yellow"
            tilt={-1}
          >
            <p className="nm-sticky__mono" style={{ textAlign: 'center' }}>{workedShapley}</p>
          </StickyNote>
          <StickyNote title={`Order ${orderIdx + 1} of 6 (${trace.label})`} color="blue" tilt={1} live>
            <p>{caption}</p>
          </StickyNote>
        </StickyRow>
      ) : (
        <>
          <StickyRow>
            <StickyNote
              title="Shapley value (fair average across orders)"
              latex="\phi_i = \frac{1}{|N|!}\sum_{\pi} \big[v(S_\pi \cup \{i\}) - v(S_\pi)\big]"
              color="yellow"
              tilt={-1}
              active={activeFormula === 'shapley'}
              onSelect={() => setActiveFormula('shapley')}
            >
              <p style={{ textAlign: 'center' }}>
                Average score jump when feature i enters the room across all 3! = 6 permutations π.
              </p>
            </StickyNote>
            <StickyNote
              title="Efficiency rule (zero leftover residual)"
              latex="v(N) - v(\emptyset) = \sum_{i \in N} \phi_i"
              color="pink"
              tilt={1}
              active={activeFormula === 'efficiency'}
              onSelect={() => setActiveFormula('efficiency')}
            >
              <p style={{ textAlign: 'center' }}>
                Baseline v(∅) plus every feature’s Shapley value φ_i always equals the full prediction v(N).
              </p>
            </StickyNote>
          </StickyRow>

          <StickyRow>
            <StickyNote title={`Worked out for ${FEATURE_NAMES[focusFeature]}`} color="green" tilt={1}>
              <p className="nm-sticky__mono">{workedShapley}</p>
            </StickyNote>
            <StickyNote title={`Step ${orderIdx + 1} of 6 (${trace.label})`} color="blue" tilt={-1} live>
              <p>{caption}</p>
            </StickyNote>
          </StickyRow>

          <PredictChallenge
            prompt="Suppose age never changes any loan score (a dummy feature adding 0 in every coalition). What is age's Shapley value φ_age?"
            options={PREDICT_OPTIONS}
            correctIndex={0}
            selected={prediction}
            onSelect={setPrediction}
            explanation="Every marginal jump is 0 across all 6 orders, so the average is strictly 0.0."
            actionLabel="Test Useless Age preset now"
            onAction={() => {
              applyPreset('dummy-age');
              setFocusFeature('A');
              playback.playFromStart();
            }}
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <VizButton onClick={playback.toggle}>{playback.playing ? 'Pause' : 'Play'}</VizButton>
            <VizButton variant="secondary" onClick={playback.next}>Step →</VizButton>
            <VizButton variant="secondary" onClick={playback.reset}>Reset</VizButton>
            <span style={{ marginLeft: 'auto', fontSize: 15, color: t.textSecondary }}>
              v(S) = score with only coalition S known · matches Waterfall below
            </span>
          </div>
        </>
      )}
    </div>
  );
}

export default function ShapleyCoalitionDiagram({ compact = false }: { compact?: boolean } = {}) {
  const outerVisible = useVizVisible();
  return (
    <VisualizationContainer
      title="Shapley Value Coalition Playground"
      footer="Exact Shapley calculation across all 3! = 6 feature arrival orders from the editable coalition table, verifying that baseline + Σ φ_i equals the full prediction."
    >
      <ShapleyPlayground compact={compact} outerVisible={outerVisible} />
    </VisualizationContainer>
  );
}
