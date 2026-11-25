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
import {
  buildShiftedCurrentWeights,
  computePsiBreakdown,
  DEFAULT_PSI_REFERENCE,
  PSI_BUCKET_LABELS,
  PSI_PLAYBACK_STEPS,
} from '../lib/psiDrift';
import { useResponsiveHostWidth, useStepPlayback } from './useStepPlayback';

type PsiNoteId = 'psi' | 'symmetric-kl' | 'sign';

const PREDICT_OPTIONS = [
  'Same +15% shift gives the exact same PSI',
  'Moving +15% into the rare 10% bucket spikes PSI much higher',
  'Moving into the 35% bucket spikes PSI higher',
] as const;

const FORMULA_NOTES: {
  id: PsiNoteId;
  title: string;
  latex: string;
  color: 'yellow' | 'pink' | 'orange';
  plain: string;
}[] = [
  {
    id: 'psi',
    title: 'Population Stability Index (PSI)',
    latex: '\\mathrm{PSI} = \\sum_{i=1}^{5} (c_i - r_i)\\ln\\!\\left(\\frac{c_i}{r_i}\\right)',
    color: 'yellow',
    plain: 'Under 0.10 stable, 0.10–0.25 moderate watch, ≥ 0.25 alert.',
  },
  {
    id: 'symmetric-kl',
    title: 'Symmetric KL identity',
    latex: '\\mathrm{PSI} = D_{\\mathrm{KL}}(C\\|R) + D_{\\mathrm{KL}}(R\\|C)',
    color: 'pink',
    plain: 'Equals both KL directions added together (in nats).',
  },
  {
    id: 'sign',
    title: 'Why terms never cancel',
    latex: '(c_i - r_i)\\ln(c_i / r_i) \\ge 0',
    color: 'orange',
    plain: 'Both factors share the same sign, so shrinkage and spikes both add up.',
  },
];

function PsiCalculatorPlayground({ compact = false, outerVisible = true }: { compact?: boolean; outerVisible?: boolean }) {
  const t = useVizTokens();
  const clipBarsId = useId();
  const { hostRef, isCompactPhone } = useResponsiveHostWidth(760);

  const [presetId, setPresetId] = useState<string>('tail-spike');
  const [manualWeights, setManualWeights] = useState<readonly number[]>(PSI_PLAYBACK_STEPS[2].currentWeights);
  const [tailShiftPct, setTailShiftPct] = useState(15);
  const [activeFormula, setActiveFormula] = useState<PsiNoteId>('psi');
  const [followingTrace, setFollowingTrace] = useState(true);
  const [prediction, setPrediction] = useState<number | null>(null);

  const playback = useStepPlayback(PSI_PLAYBACK_STEPS.length, 2500, 2, outerVisible);
  const traceStep = PSI_PLAYBACK_STEPS[playback.step] ?? PSI_PLAYBACK_STEPS[0];

  const activeCurrentWeights = followingTrace ? traceStep.currentWeights : manualWeights;

  const breakdown = useMemo(
    () => computePsiBreakdown(DEFAULT_PSI_REFERENCE, activeCurrentWeights, PSI_BUCKET_LABELS),
    [activeCurrentWeights],
  );

  const refColor = t.accentSecondary;
  const curColor = t.accentPurple;
  const stableColor = t.accentPrimary;
  const warnColor = t.accentWarn;
  const dangerColor = t.accentDanger;

  const zoneColor =
    breakdown.zone === 'stable' ? stableColor : breakdown.zone === 'moderate' ? warnColor : dangerColor;

  const takeControl = (weights: readonly number[], id = 'custom') => {
    setFollowingTrace(false);
    playback.stop();
    setManualWeights(weights);
    setPresetId(id);
  };

  const applyPreset = (id: string) => {
    const found = PSI_PLAYBACK_STEPS.find((p) => p.id === id);
    if (!found) return;
    takeControl(found.currentWeights, found.id);
  };

  const updateBucketWeight = (idx: number, raw: string) => {
    const val = Math.max(0.1, Math.min(1000, Number(raw) || 0.1));
    const next = activeCurrentWeights.map((w, i) => (i === idx ? val : w));
    takeControl(next, 'custom');
  };

  const handleTailShift = (shift: number) => {
    setTailShiftPct(shift);
    const shifted = buildShiftedCurrentWeights(DEFAULT_PSI_REFERENCE, shift, 1, 4);
    takeControl(shifted, 'custom');
  };

  const explainText = followingTrace
    ? traceStep.explain
    : `Biggest drift comes from ${breakdown.rows[breakdown.biggestBinIndex].label} (${(breakdown.rows[breakdown.biggestBinIndex].refShare * 100).toFixed(0)}% → ${(breakdown.rows[breakdown.biggestBinIndex].curShare * 100).toFixed(0)}%), contributing ${breakdown.rows[breakdown.biggestBinIndex].psiTerm.toFixed(3)} to PSI = ${breakdown.psi.toFixed(3)} (${breakdown.zoneLabel}).`;

  const inputStyle: React.CSSProperties = {
    width: '100%',
    boxSizing: 'border-box',
    minHeight: 34,
    padding: '4px 6px',
    font: 'inherit',
    fontSize: 15,
    fontVariantNumeric: 'tabular-nums',
    border: `1.5px solid ${t.border}`,
    borderRadius: 6,
    background: t.background,
    color: t.textPrimary,
  };

  const renderBucketsPanel = (offsetX: number, panelW: number) => {
    const plotX = offsetX + 40;
    const plotY = 48;
    const plotW = panelW - 52;
    const plotH = 158;
    const maxShare = Math.max(0.45, ...breakdown.rows.flatMap((r) => [r.refShare, r.curShare]));
    const py = (share: number) => plotY + plotH - (share / maxShare) * (plotH - 22);
    const groupW = plotW / breakdown.rows.length;

    return (
      <g>
        <text x={offsetX + panelW / 2} y={20} textAnchor="middle" fontSize={15} fontWeight={700} fill={t.textPrimary}>
          Transaction size shares: Baseline R vs. Today C
        </text>
        <defs>
          <clipPath id={clipBarsId}>
            <rect x={plotX} y={plotY} width={plotW} height={plotH} />
          </clipPath>
        </defs>

        <line x1={plotX} y1={plotY} x2={plotX} y2={plotY + plotH} stroke={t.border} strokeWidth={1.3} />
        <line x1={plotX} y1={plotY + plotH} x2={plotX + plotW} y2={plotY + plotH} stroke={t.border} strokeWidth={1.3} />

        {[0, maxShare / 2, maxShare].map((tick, idx) => (
          <g key={idx}>
            <line x1={plotX - 4} y1={py(tick)} x2={plotX} y2={py(tick)} stroke={t.border} />
            <text x={plotX - 6} y={py(tick) + 4} textAnchor="end" fontSize={14} fill={t.textMuted}>
              {Math.round(tick * 100)}%
            </text>
          </g>
        ))}

        <g clipPath={`url(#${clipBarsId})`}>
          {breakdown.rows.map((row, i) => {
            const cx = plotX + i * groupW + groupW / 2;
            const bw = Math.min(24, Math.floor((groupW - 14) / 2));
            const ry = py(row.refShare);
            const cy = py(row.curShare);
            return (
              <g key={row.label}>
                <rect x={cx - bw - 2} y={ry} width={bw} height={Math.max(2, plotY + plotH - ry)} rx={3} fill={refColor} fillOpacity={0.85} />
                <rect x={cx + 2} y={cy} width={bw} height={Math.max(2, plotY + plotH - cy)} rx={3} fill={curColor} fillOpacity={0.85} />
              </g>
            );
          })}
        </g>

        {breakdown.rows.map((row, i) => {
          const cx = plotX + i * groupW + groupW / 2;
          const bw = Math.min(24, Math.floor((groupW - 14) / 2));
          const ry = py(row.refShare);
          const cy = py(row.curShare);
          const topLabelY = Math.max(plotY + 14, Math.min(ry, cy) - 6);
          return (
            <g key={`lbl-${row.label}`}>
              <text x={cx - bw / 2 - 3} y={Math.max(plotY + 14, ry - 5)} textAnchor="middle" fontSize={14} fontWeight={700} fill={refColor}>
                {Math.round(row.refShare * 100)}
              </text>
              <text
                x={cx + bw / 2 + 4}
                y={Math.abs(ry - cy) < 14 ? Math.max(plotY + 14, topLabelY - 14) : Math.max(plotY + 14, cy - 5)}
                textAnchor="middle"
                fontSize={14}
                fontWeight={700}
                fill={curColor}
              >
                {Math.round(row.curShare * 100)}
              </text>
              <text x={cx} y={plotY + plotH + 19} textAnchor="middle" fontSize={14} fontWeight={700} fill={t.textPrimary}>
                {row.label}
              </text>
              <text x={cx} y={plotY + plotH + 37} textAnchor="middle" fontSize={14} fill={i === breakdown.biggestBinIndex && row.psiTerm > 0.02 ? zoneColor : t.textSecondary}>
                +{row.psiTerm.toFixed(2)}
              </text>
            </g>
          );
        })}
      </g>
    );
  };

  const renderGaugePanel = (offsetX: number, panelW: number) => {
    const plotX = offsetX + 16;
    const gaugeW = panelW - 32;
    const gaugeMax = 0.5;
    const mapG = (v: number) => plotX + Math.min(1, Math.max(0, v / gaugeMax)) * gaugeW;
    const wStable = mapG(0.1) - plotX;
    const wMod = mapG(0.25) - mapG(0.1);
    const wSig = plotX + gaugeW - mapG(0.25);
    const ptrX = mapG(breakdown.psi);
    const maxTerm = Math.max(0.05, ...breakdown.rows.map((r) => r.psiTerm));

    return (
      <g>
        <text x={offsetX + panelW / 2} y={20} textAnchor="middle" fontSize={15} fontWeight={700} fill={zoneColor}>
          PSI = {breakdown.psi.toFixed(3)} · {breakdown.zoneLabel}
        </text>

        <rect x={plotX} y={40} width={wStable} height={20} rx={3} fill={stableColor} fillOpacity={0.35} />
        <rect x={plotX + wStable} y={40} width={wMod} height={20} fill={warnColor} fillOpacity={0.35} />
        <rect x={plotX + wStable + wMod} y={40} width={wSig} height={20} rx={3} fill={dangerColor} fillOpacity={0.35} />
        <line x1={ptrX} y1={35} x2={ptrX} y2={65} stroke={zoneColor} strokeWidth={3} />
        <circle cx={ptrX} cy={35} r={4.5} fill={zoneColor} />

        <text x={plotX} y={80} fontSize={14} fill={stableColor}>0.0</text>
        <text x={mapG(0.1)} y={80} textAnchor="middle" fontSize={14} fill={warnColor}>0.10</text>
        <text x={mapG(0.25)} y={80} textAnchor="middle" fontSize={14} fill={dangerColor}>0.25</text>
        <text x={plotX + gaugeW} y={80} textAnchor="end" fontSize={14} fill={t.textMuted}>0.50+</text>

        <text x={plotX} y={108} fontSize={14} fontWeight={700} fill={t.textPrimary}>
          Each bucket’s share of total PSI
        </text>
        {breakdown.rows.map((row, i) => {
          const y = 118 + i * 28;
          const barSpace = gaugeW - 134;
          const bw = Math.max(2, (row.psiTerm / maxTerm) * barSpace);
          const hot = i === breakdown.biggestBinIndex && row.psiTerm > 0.02;
          return (
            <g key={`term-${row.label}`}>
              <text x={plotX} y={y + 15} fontSize={14} fontWeight={hot ? 700 : 400} fill={t.textPrimary}>
                {row.label}
              </text>
              <rect x={plotX + 74} y={y + 2} width={barSpace} height={16} rx={3} fill={t.surfaceAlt} />
              <rect x={plotX + 74} y={y + 2} width={bw} height={16} rx={3} fill={hot ? zoneColor : curColor} fillOpacity={0.85} />
              <text x={plotX + gaugeW} y={y + 15} textAnchor="end" fontSize={14} fontWeight={hot ? 700 : 400} fill={hot ? zoneColor : t.textSecondary}>
                {row.psiTerm.toFixed(3)}
              </text>
            </g>
          );
        })}
      </g>
    );
  };

  return (
    <>
      {!compact && (
        <>
          <VisualizationHeader
            eyebrow="Live playground"
            title="How much did live data drift from training?"
            description="When production traffic shifts away from the training baseline, a model can fail silently before true labels arrive. Population Stability Index (PSI) compares today's bucket shares C against baseline shares R so both shrinkage and spikes add up."
          />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <div style={{ marginBottom: -8 }}>
              <PillSelect<string>
                label="Traffic scenario"
                value={followingTrace ? traceStep.id : presetId}
                onChange={applyPreset}
                options={[
                  ...PSI_PLAYBACK_STEPS.map((p) => ({ value: p.id, label: p.label })),
                  ...(!followingTrace && presetId === 'custom' ? [{ value: 'custom', label: 'Custom' }] : []),
                ]}
              />
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <VizButton
                onClick={() => {
                  if (!playback.playing) setFollowingTrace(true);
                  playback.toggle();
                }}
              >
                {playback.playing ? 'Pause' : 'Play'}
              </VizButton>
              <VizButton
                variant="secondary"
                onClick={() => {
                  setFollowingTrace(true);
                  playback.next();
                }}
              >
                Step →
              </VizButton>
              <VizButton
                variant="secondary"
                onClick={() => {
                  setFollowingTrace(true);
                  playback.reset();
                }}
              >
                Reset
              </VizButton>
            </div>
          </div>

          <div style={{ marginTop: 4 }}>
            <Slider
              label="Shift share from $20–50 into rare $250+ bucket"
              value={tailShiftPct}
              onChange={handleTailShift}
              min={0}
              max={24}
              step={1}
              format={(v) => `${v}%`}
            />
          </div>

          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: curColor, marginBottom: 4 }}>
              Today’s bucket weights C (auto-normalized to 100%; baseline R = 10, 25, 35, 20, 10)
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 8 }}>
              {PSI_BUCKET_LABELS.map((label, i) => (
                <label key={label} style={{ fontSize: 15, color: t.textPrimary }}>
                  <span style={{ display: 'block', marginBottom: 2 }}>{label} ({Math.round(breakdown.rows[i].curShare * 100)}%)</span>
                  <input
                    aria-label={`Today weight for ${label}`}
                    type="number"
                    min={0.1}
                    max={1000}
                    step={1}
                    value={activeCurrentWeights[i]}
                    onChange={(e) => updateBucketWeight(i, e.target.value)}
                    style={inputStyle}
                  />
                </label>
              ))}
            </div>
          </div>
        </>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 18px', fontSize: 15 }} aria-label="Chart legend">
        <span><span style={{ display: 'inline-block', width: 12, height: 12, background: refColor, borderRadius: 2, marginRight: 6 }} />Baseline R (training)</span>
        <span><span style={{ display: 'inline-block', width: 12, height: 12, background: curColor, borderRadius: 2, marginRight: 6 }} />Today C (production)</span>
        <span style={{ color: zoneColor, fontWeight: 700 }}>Verdict: {breakdown.zoneLabel}</span>
      </div>

      <div ref={hostRef} style={{ width: '100%' }}>
        {!isCompactPhone ? (
          <svg
            width="100%"
            viewBox="0 0 760 264"
            role="img"
            aria-label={`PSI = ${breakdown.psi.toFixed(3)} (${breakdown.zoneLabel}); biggest shift in ${breakdown.rows[breakdown.biggestBinIndex].label}`}
            style={{ display: 'block', fontFamily: FONT_FAMILY }}
          >
            {renderBucketsPanel(0, 420)}
            {renderGaugePanel(438, 322)}
          </svg>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            <svg width="100%" viewBox="0 0 370 258" role="img" aria-label="Baseline vs Today bucket shares" style={{ display: 'block', fontFamily: FONT_FAMILY }}>
              {renderBucketsPanel(0, 370)}
            </svg>
            <svg width="100%" viewBox="0 0 370 264" role="img" aria-label="PSI threshold gauge and per-bucket terms" style={{ display: 'block', fontFamily: FONT_FAMILY }}>
              {renderGaugePanel(0, 370)}
            </svg>
          </div>
        )}
      </div>

      {compact ? (
        <StickyRow>
          <StickyNote title="Population Stability Index (PSI)" latex={'\\mathrm{PSI} = \\sum_i (c_i - r_i)\\ln(c_i/r_i)'} color="yellow" tilt={-1}>
            <p className="nm-sticky__mono" style={{ textAlign: 'center' }}>
              {breakdown.rows.map((r) => r.psiTerm.toFixed(2)).join(' + ')} = <strong>{breakdown.psi.toFixed(3)}</strong> ({breakdown.zoneLabel})
            </p>
          </StickyNote>
          <StickyNote title={`Step ${playback.step + 1} of ${PSI_PLAYBACK_STEPS.length}`} color="blue" tilt={1} live>
            <p>{explainText}</p>
          </StickyNote>
        </StickyRow>
      ) : (
        <>
          <StickyRow>
            {FORMULA_NOTES.map((n, idx) => (
              <StickyNote
                key={n.id}
                title={n.title}
                latex={n.latex}
                color={n.color}
                tilt={idx % 2 ? 1 : -1}
                active={activeFormula === n.id}
                onSelect={() => setActiveFormula(n.id)}
              >
                <p style={{ textAlign: 'center' }}>{n.plain}</p>
              </StickyNote>
            ))}
          </StickyRow>
          <StickyRow>
            <StickyNote title={`Worked PSI sum = ${breakdown.psi.toFixed(3)}`} color="green" tilt={1}>
              <p className="nm-sticky__mono">
                {breakdown.rows.map((r) => r.psiTerm.toFixed(3)).join(' + ')} = <strong>{breakdown.psi.toFixed(3)}</strong>
              </p>
              <p className="nm-sticky__mono" style={{ marginTop: 4 }}>
                KL(C‖R) + KL(R‖C) = {breakdown.klCurToRef.toFixed(3)} + {breakdown.klRefToCur.toFixed(3)} = {breakdown.psi.toFixed(3)}
              </p>
            </StickyNote>
            <StickyNote title={followingTrace ? `Step ${playback.step + 1} of ${PSI_PLAYBACK_STEPS.length} · ${traceStep.label}` : 'What just happened'} color="blue" tilt={-1} live>
              <p>{explainText}</p>
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
            <span>Baseline has 10% in rare “$250+” and 35% in “$50–100”. If 15% of traffic moves out of “$20–50” into “$250+” instead of “$50–100”, what happens to PSI?</span>
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
                growing a 10% tail to 25% multiplies 0.15 by ln(2.5) = 0.916 (PSI = 0.275, alert!), whereas growing 35% to 50% multiplies by ln(1.43) = 0.357 (PSI = 0.191).{' '}
                <button
                  type="button"
                  onClick={() => {
                    setTailShiftPct(15);
                    takeControl([10, 10, 35, 20, 25], 'tail-spike');
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
                  Run +15% tail spike now
                </button>
              </span>
            )}
          </div>
        </>
      )}
    </>
  );
}

export default function PsiCalculatorDiagram({ compact = false }: { compact?: boolean } = {}) {
  const outerVisible = useVizVisible();
  return (
    <VisualizationContainer
      title="PSI distribution drift calculator"
      footer="Population Stability Index computed across 5 transaction brackets via Σ(cᵢ − rᵢ)·ln(cᵢ / rᵢ) = KL(C ‖ R) + KL(R ‖ C). Standard monitoring bands: < 0.10 stable, 0.10–0.25 moderate, ≥ 0.25 significant."
    >
      <PsiCalculatorPlayground compact={compact} outerVisible={outerVisible} />
    </VisualizationContainer>
  );
}
