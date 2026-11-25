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
  blendWeights,
  computeEntropyKlBreakdown,
  ENTROPY_PLAYBACK_STEPS,
  ENTROPY_PRESETS,
  type EntropyFormulaId,
} from '../lib/entropyKl';
import { useResponsiveHostWidth, useStepPlayback } from './useStepPlayback';

const PREDICT_OPTIONS = [
  'Stays small (~1.2 bits)',
  'Spikes sharply (> 4.5 bits)',
  'Drops below H(P)',
] as const;

const FORMULA_NOTES: {
  id: EntropyFormulaId;
  title: string;
  latex: string;
  color: 'yellow' | 'pink' | 'blue' | 'orange';
  plain: string;
}[] = [
  {
    id: 'entropy',
    title: 'Entropy H(P) · true surprise',
    latex: 'H(P) = -\\sum_x P(x)\\log_2 P(x)',
    color: 'yellow',
    plain: 'Unavoidable average surprise in the true world P alone.',
  },
  {
    id: 'cross-entropy',
    title: 'Cross-entropy H(P, Q) · training loss',
    latex: 'H(P,Q) = -\\sum_x P(x)\\log_2 Q(x)',
    color: 'pink',
    plain: 'Average surprise when nature uses P and your model bets Q.',
  },
  {
    id: 'forward-kl',
    title: 'Forward KL D_KL(P ‖ Q) · extra cost',
    latex: 'D_{\\mathrm{KL}}(P\\|Q) = \\sum_x P(x)\\log_2\\frac{P(x)}{Q(x)}',
    color: 'blue',
    plain: 'Extra bits wasted by Q missing P (equals H(P,Q) − H(P)).',
  },
  {
    id: 'reverse-kl',
    title: 'Reverse KL D_KL(Q ‖ P) · swapped',
    latex: 'D_{\\mathrm{KL}}(Q\\|P) = \\sum_x Q(x)\\log_2\\frac{Q(x)}{P(x)}',
    color: 'orange',
    plain: 'Weights mistakes by Q instead of P, so order changes the score.',
  },
];

function clampWeight(raw: string): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return 1;
  return Math.max(0.5, Math.min(1000, n));
}

function EntropyKlPlayground({ compact = false, outerVisible = true }: { compact?: boolean; outerVisible?: boolean }) {
  const t = useVizTokens();
  const clipLeftId = useId();
  const clipRightId = useId();
  const { hostRef, isCompactPhone } = useResponsiveHostWidth(760);

  const [presetId, setPresetId] = useState<string>('next-word');
  const [outcomes, setOutcomes] = useState<readonly [string, string, string]>(ENTROPY_PRESETS[0].outcomes);
  const [trueWeights, setTrueWeights] = useState<readonly [number, number, number]>(ENTROPY_PRESETS[0].trueWeights);
  const [manualModelWeights, setManualModelWeights] = useState<readonly [number, number, number]>(ENTROPY_PRESETS[0].modelWeights);
  const [manualFormula, setManualFormula] = useState<EntropyFormulaId>('cross-entropy');
  const [blendAlpha, setBlendAlpha] = useState<number>(1);
  const [followingTrace, setFollowingTrace] = useState(true);
  const [prediction, setPrediction] = useState<number | null>(null);

  const playback = useStepPlayback(ENTROPY_PLAYBACK_STEPS.length, 2600, 3, outerVisible);
  const activeTraceStep = ENTROPY_PLAYBACK_STEPS[playback.step] ?? ENTROPY_PLAYBACK_STEPS[0];

  const activeModelWeights = followingTrace ? activeTraceStep.modelWeights : manualModelWeights;
  const activeFormula = followingTrace ? activeTraceStep.formula : manualFormula;

  const breakdown = useMemo(
    () => computeEntropyKlBreakdown(outcomes, trueWeights, activeModelWeights),
    [outcomes, trueWeights, activeModelWeights],
  );

  const pColor = t.accentSecondary;
  const qColor = t.accentPurple;
  const entColor = t.accentPrimary;
  const klColor = t.accentDanger;
  const revColor = t.accentTeal;

  const takeManualControl = (nextModel = activeModelWeights, nextFormula = activeFormula) => {
    setFollowingTrace(false);
    playback.stop();
    setManualModelWeights(nextModel);
    setManualFormula(nextFormula);
  };

  const applyPreset = (id: string) => {
    const preset = ENTROPY_PRESETS.find((p) => p.id === id) ?? ENTROPY_PRESETS[0];
    setPresetId(preset.id);
    setOutcomes(preset.outcomes);
    setTrueWeights(preset.trueWeights);
    setBlendAlpha(1);
    takeManualControl(preset.modelWeights, 'cross-entropy');
  };

  const updateTrueWeight = (idx: number, raw: string) => {
    const next: [number, number, number] = [...trueWeights];
    next[idx] = clampWeight(raw);
    setTrueWeights(next);
    setPresetId('custom');
    takeManualControl(activeModelWeights, activeFormula);
  };

  const updateModelWeight = (idx: number, raw: string) => {
    const base = [...activeModelWeights] as [number, number, number];
    base[idx] = clampWeight(raw);
    setBlendAlpha(1);
    setPresetId('custom');
    takeManualControl(base, activeFormula);
  };

  const handleBlendChange = (alpha: number) => {
    setBlendAlpha(alpha);
    const blended = blendWeights(trueWeights, [1, 49, 50], alpha);
    takeManualControl([blended[0], blended[1], blended[2]], activeFormula);
  };

  const activeTotalValue =
    activeFormula === 'entropy'
      ? breakdown.entropyP
      : activeFormula === 'cross-entropy'
        ? breakdown.crossEntropyPQ
        : activeFormula === 'forward-kl'
          ? breakdown.klPQ
          : breakdown.klQP;

  const workedSumText = useMemo(() => {
    if (activeFormula === 'entropy') {
      const terms = breakdown.rows.map((r) => `${r.p.toFixed(2)}×${r.selfSurpriseBits.toFixed(2)}`);
      return `${terms.join(' + ')} = ${breakdown.entropyP.toFixed(3)} bits`;
    }
    if (activeFormula === 'cross-entropy') {
      const terms = breakdown.rows.map((r) => `${r.p.toFixed(2)}×${r.modelSurpriseBits.toFixed(2)}`);
      return `${terms.join(' + ')} = ${breakdown.crossEntropyPQ.toFixed(3)} bits`;
    }
    if (activeFormula === 'forward-kl') {
      const terms = breakdown.rows.map((r) => r.forwardKlTerm.toFixed(3));
      return `${terms.join(' + ').replace(/\+ -/g, '− ')} = ${breakdown.klPQ.toFixed(3)} bits`;
    }
    const terms = breakdown.rows.map((r) => r.reverseKlTerm.toFixed(3));
    return `${terms.join(' + ').replace(/\+ -/g, '− ')} = ${breakdown.klQP.toFixed(3)} bits`;
  }, [activeFormula, breakdown]);

  const liveStepDescription = followingTrace
    ? activeTraceStep.explain
    : breakdown.klPQ < 0.01
      ? `Your guess Q matches true P closely: extra penalty is ${breakdown.klPQ.toFixed(3)} bits, so training loss H(P, Q) hits its floor of ${breakdown.entropyP.toFixed(3)} bits.`
      : `“${breakdown.worstOutcomeLabel}” carries the biggest loss share: P = ${(breakdown.rows.find((r) => r.label === breakdown.worstOutcomeLabel)!.p * 100).toFixed(0)}%, model Q = ${(breakdown.rows.find((r) => r.label === breakdown.worstOutcomeLabel)!.q * 100).toFixed(0)}%, adding ${breakdown.klPQ.toFixed(3)} extra bits beyond H(P).`;

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

  const renderProbPanel = (offsetX: number) => {
    const plotX = offsetX + 46;
    const plotY = 48;
    const plotW = 304;
    const plotH = 160;
    const maxP = Math.max(0.8, ...breakdown.rows.flatMap((r) => [r.p, r.q]));
    const yMap = (prob: number) => plotY + plotH - (prob / maxP) * (plotH - 18);
    const groupW = plotW / breakdown.rows.length;

    return (
      <g>
        <text x={offsetX + 185} y={20} textAnchor="middle" fontSize={15} fontWeight={700} fill={t.textPrimary}>
          Probabilities: True P vs. Model Q
        </text>
        <defs>
          <clipPath id={clipLeftId}>
            <rect x={plotX} y={plotY} width={plotW} height={plotH} />
          </clipPath>
        </defs>
        <line x1={plotX} y1={plotY} x2={plotX} y2={plotY + plotH} stroke={t.border} strokeWidth={1.3} />
        <line x1={plotX} y1={plotY + plotH} x2={plotX + plotW} y2={plotY + plotH} stroke={t.border} strokeWidth={1.3} />
        {[0, 0.5, maxP].map((tick, idx) => {
          const ty = yMap(tick);
          return (
            <g key={idx}>
              <line x1={plotX - 4} y1={ty} x2={plotX} y2={ty} stroke={t.border} />
              <text x={plotX - 8} y={ty + 5} textAnchor="end" fontSize={14} fill={t.textMuted}>
                {Math.round(tick * 100)}%
              </text>
            </g>
          );
        })}

        <g clipPath={`url(#${clipLeftId})`}>
          {breakdown.rows.map((row, i) => {
            const cx = plotX + i * groupW + groupW / 2;
            const barW = 28;
            const pyP = yMap(row.p);
            const pyQ = yMap(row.q);
            return (
              <g key={row.label}>
                <rect x={cx - barW - 3} y={pyP} width={barW} height={Math.max(2, plotY + plotH - pyP)} rx={4} fill={pColor} fillOpacity={0.85} />
                <rect x={cx + 3} y={pyQ} width={barW} height={Math.max(2, plotY + plotH - pyQ)} rx={4} fill={qColor} fillOpacity={0.85} />
              </g>
            );
          })}
        </g>

        {breakdown.rows.map((row, i) => {
          const cx = plotX + i * groupW + groupW / 2;
          const barW = 28;
          const pyP = Math.max(plotY + 14, yMap(row.p) - 6);
          const pyQ = Math.max(plotY + 14, yMap(row.q) - 6);
          const blindSpot = row.p >= 0.25 && row.q < 0.08;
          return (
            <g key={`lbl-${row.label}`}>
              <text x={cx - barW / 2 - 4} y={pyP} textAnchor="middle" fontSize={14} fontWeight={700} fill={pColor}>
                {Math.round(row.p * 100)}%
              </text>
              <text x={cx + barW / 2 + 4} y={pyQ} textAnchor="middle" fontSize={14} fontWeight={700} fill={qColor}>
                {Math.round(row.q * 100)}%
              </text>
              <text x={cx} y={plotY + plotH + 20} textAnchor="middle" fontSize={15} fontWeight={700} fill={t.textPrimary}>
                {row.label}
              </text>
              {blindSpot && (
                <text x={cx} y={plotY + plotH + 40} textAnchor="middle" fontSize={14} fontWeight={700} fill={klColor}>
                  blind spot!
                </text>
              )}
            </g>
          );
        })}
      </g>
    );
  };

  const renderBitsPanel = (offsetX: number) => {
    const plotX = offsetX + 24;
    const plotW = 326;
    const maxBits = Math.max(2.5, breakdown.crossEntropyPQ * 1.15, breakdown.klQP * 1.15);
    const barW = (val: number) => Math.max(3, Math.min(plotW - 90, (val / maxBits) * (plotW - 90)));

    const hWidth = barW(breakdown.entropyP);
    const klWidth = breakdown.klPQ > 0.002 ? Math.max(4, barW(breakdown.crossEntropyPQ) - hWidth) : 0;
    const revWidth = barW(breakdown.klQP);

    return (
      <g>
        <text x={offsetX + 185} y={20} textAnchor="middle" fontSize={15} fontWeight={700} fill={t.textPrimary}>
          Surprise cost in bits (lower is better)
        </text>
        <defs>
          <clipPath id={clipRightId}>
            <rect x={plotX} y={36} width={plotW} height={224} />
          </clipPath>
        </defs>

        <g clipPath={`url(#${clipRightId})`}>
          <text x={plotX} y={56} fontSize={14} fontWeight={700} fill={entColor}>
            1. World’s own surprise H(P) (fixed floor)
          </text>
          <rect x={plotX} y={64} width={plotW - 86} height={24} rx={5} fill={t.surfaceAlt} />
          <rect x={plotX} y={64} width={hWidth} height={24} rx={5} fill={entColor} fillOpacity={0.85} />
          <text x={plotX + plotW - 78} y={81} fontSize={15} fontWeight={700} fill={entColor}>
            {breakdown.entropyP.toFixed(2)} b
          </text>

          <text x={plotX} y={114} fontSize={14} fontWeight={700} fill={t.textPrimary}>
            2. Model loss H(P, Q) = H(P) + KL(P ‖ Q)
          </text>
          <rect x={plotX} y={122} width={plotW - 86} height={24} rx={5} fill={t.surfaceAlt} />
          <rect x={plotX} y={122} width={hWidth} height={24} rx={5} fill={entColor} fillOpacity={0.85} />
          {klWidth > 0 && (
            <rect x={plotX + hWidth} y={122} width={klWidth} height={24} rx={4} fill={klColor} fillOpacity={0.88} />
          )}
          <text x={plotX + plotW - 78} y={139} fontSize={15} fontWeight={700} fill={klWidth > 4 ? klColor : entColor}>
            {breakdown.crossEntropyPQ.toFixed(2)} b
          </text>

          <text x={plotX} y={172} fontSize={14} fontWeight={700} fill={klColor}>
            3. Extra penalty KL(P ‖ Q) vs. reverse KL(Q ‖ P)
          </text>
          <rect x={plotX} y={180} width={plotW - 86} height={18} rx={4} fill={t.surfaceAlt} />
          <rect x={plotX} y={180} width={breakdown.klPQ > 0.001 ? barW(breakdown.klPQ) : 0} height={18} rx={4} fill={klColor} fillOpacity={0.85} />
          <text x={plotX + plotW - 78} y={194} fontSize={14} fontWeight={700} fill={klColor}>
            {breakdown.klPQ.toFixed(2)} b
          </text>

          <rect x={plotX} y={204} width={plotW - 86} height={18} rx={4} fill={t.surfaceAlt} />
          <rect x={plotX} y={204} width={breakdown.klQP > 0.001 ? revWidth : 0} height={18} rx={4} fill={revColor} fillOpacity={0.85} />
          <text x={plotX + plotW - 78} y={218} fontSize={14} fontWeight={700} fill={revColor}>
            {breakdown.klQP.toFixed(2)} b
          </text>
          <text x={plotX} y={242} fontSize={14} fill={t.textSecondary}>
            Top: P‖Q (true weights) · Bottom: Q‖P (swapped)
          </text>
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
            title="How much does a model's guess miss reality?"
            description="When reality picks outcomes with odds P and an AI model guesses Q, cross-entropy H(P, Q) measures total surprise in bits and KL divergence measures the extra wasted bits above nature's minimum H(P)."
          />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <div style={{ marginBottom: -8 }}>
              <PillSelect<string>
                label="Scenario (what we are predicting)"
                value={presetId}
                onChange={applyPreset}
                options={[...ENTROPY_PRESETS.map((p) => ({ value: p.id, label: p.label })), ...(presetId === 'custom' ? [{ value: 'custom', label: 'Custom' }] : [])]}
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

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginTop: 6 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: pColor, marginBottom: 4 }}>
                True world shares P (auto-normalized to 100%)
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
                {outcomes.map((name, i) => (
                  <label key={`p-${name}`} style={{ fontSize: 15, color: t.textPrimary }}>
                    <span style={{ display: 'block', marginBottom: 2 }}>{name} ({Math.round(breakdown.rows[i].p * 100)}%)</span>
                    <input
                      aria-label={`True P weight for ${name}`}
                      type="number"
                      min={0.5}
                      max={1000}
                      step={1}
                      value={trueWeights[i]}
                      onChange={(e) => updateTrueWeight(i, e.target.value)}
                      style={inputStyle}
                    />
                  </label>
                ))}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: qColor, marginBottom: 4 }}>
                Model guess Q (edit weights directly)
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
                {outcomes.map((name, i) => (
                  <label key={`q-${name}`} style={{ fontSize: 15, color: t.textPrimary }}>
                    <span style={{ display: 'block', marginBottom: 2 }}>{name} ({Math.round(breakdown.rows[i].q * 100)}%)</span>
                    <input
                      aria-label={`Model Q weight for ${name}`}
                      type="number"
                      min={0.5}
                      max={1000}
                      step={1}
                      value={activeModelWeights[i]}
                      onChange={(e) => updateModelWeight(i, e.target.value)}
                      style={inputStyle}
                    />
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div style={{ marginTop: 4 }}>
            <Slider
              label="Move Q from matching P (0%) toward blind-spot error (100%)"
              value={blendAlpha}
              onChange={handleBlendChange}
              min={0}
              max={1}
              step={0.05}
              format={(v) => `${Math.round(v * 100)}%`}
            />
          </div>
        </>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 18px', fontSize: 15 }} aria-label="Chart legend">
        <span><span style={{ display: 'inline-block', width: 12, height: 12, background: pColor, borderRadius: 2, marginRight: 6 }} />True world P</span>
        <span><span style={{ display: 'inline-block', width: 12, height: 12, background: qColor, borderRadius: 2, marginRight: 6 }} />Model guess Q</span>
        <span><span style={{ display: 'inline-block', width: 12, height: 12, background: entColor, borderRadius: 2, marginRight: 6 }} />World surprise H(P)</span>
        <span><span style={{ display: 'inline-block', width: 12, height: 12, background: klColor, borderRadius: 2, marginRight: 6 }} />Extra KL penalty</span>
      </div>

      <div ref={hostRef} style={{ width: '100%' }}>
        {!isCompactPhone ? (
          <svg
            width="100%"
            viewBox="0 0 760 272"
            role="img"
            aria-label={`Entropy H(P) = ${breakdown.entropyP.toFixed(3)} bits, Cross-entropy H(P,Q) = ${breakdown.crossEntropyPQ.toFixed(3)} bits, KL divergence = ${breakdown.klPQ.toFixed(3)} bits`}
            style={{ display: 'block', fontFamily: FONT_FAMILY }}
          >
            {renderProbPanel(0)}
            {renderBitsPanel(390)}
          </svg>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            <svg width="100%" viewBox="0 0 370 264" role="img" aria-label="True P vs Model Q probabilities" style={{ display: 'block', fontFamily: FONT_FAMILY }}>
              {renderProbPanel(0)}
            </svg>
            <svg width="100%" viewBox="0 0 370 258" role="img" aria-label="Surprise in bits breakdown" style={{ display: 'block', fontFamily: FONT_FAMILY }}>
              {renderBitsPanel(0)}
            </svg>
          </div>
        )}
      </div>

      {compact ? (
        <StickyRow>
          {FORMULA_NOTES.filter((n) => n.id === activeFormula).map((n) => (
            <StickyNote key={n.id} title={n.title} latex={n.latex} color={n.color} tilt={-1}>
              <p className="nm-sticky__mono" style={{ textAlign: 'center' }}>{workedSumText}</p>
            </StickyNote>
          ))}
          <StickyNote title={`Step ${playback.step + 1} of ${ENTROPY_PLAYBACK_STEPS.length}`} color="blue" tilt={1} live>
            <p>{liveStepDescription}</p>
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
                onSelect={() => takeManualControl(activeModelWeights, n.id)}
              >
                <p style={{ textAlign: 'center' }}>{n.plain}</p>
              </StickyNote>
            ))}
          </StickyRow>
          <StickyRow>
            <StickyNote title={`Worked numbers · ${activeTotalValue.toFixed(3)} bits`} color="green" tilt={1}>
              <p className="nm-sticky__mono">{workedSumText}</p>
              <p className="nm-sticky__mono" style={{ marginTop: 4 }}>
                H(P) = {breakdown.entropyP.toFixed(3)} + KL = {breakdown.klPQ.toFixed(3)} → <strong>H(P, Q) = {breakdown.crossEntropyPQ.toFixed(3)}</strong>
              </p>
            </StickyNote>
            <StickyNote title={followingTrace ? `Step ${playback.step + 1} of ${ENTROPY_PLAYBACK_STEPS.length} · ${activeTraceStep.title}` : 'What just happened'} color="blue" tilt={-1} live>
              <p>{liveStepDescription}</p>
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
            <span>Keep P = [70%, 20%, 10%]. If the model guesses Q = [1%, 49%, 50%] (almost ignoring “cat”), what happens to training loss H(P, Q)?</span>
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
                giving 1% to a 70% event makes −0.70 × log₂(0.01) = 4.65 bits from “cat” alone, pushing H(P, Q) to 4.96 bits.{' '}
                <button
                  type="button"
                  onClick={() => {
                    setPresetId('blind-spot');
                    setOutcomes(['cat', 'dog', 'bird']);
                    setTrueWeights([70, 20, 10]);
                    setBlendAlpha(1);
                    takeManualControl([1, 49, 50], 'cross-entropy');
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
                  Run blind-spot Q now
                </button>
              </span>
            )}
          </div>
        </>
      )}
    </>
  );
}

export default function EntropyKlDiagram({ compact = false }: { compact?: boolean } = {}) {
  const outerVisible = useVizVisible();
  return (
    <VisualizationContainer
      title="Entropy and KL divergence playground"
      footer="Shannon entropy H(P), cross-entropy H(P, Q), forward KL D_KL(P ‖ Q), and reverse KL D_KL(Q ‖ P) computed live in base-2 bits from the exact normalized distributions above."
    >
      <EntropyKlPlayground compact={compact} outerVisible={outerVisible} />
    </VisualizationContainer>
  );
}
