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
  computeMembershipAudit,
  MEMBERSHIP_PLAYBACK_STEPS,
} from '../lib/membershipInference';
import { useResponsiveHostWidth, useStepPlayback } from './useStepPlayback';

type AuditNoteId = 'advantage' | 'accuracy' | 'defense';

const GAP_OPTIONS = [
  { value: 0.15, label: 'Low overfitting (0.15)' },
  { value: 0.35, label: 'Typical gap (0.35)' },
  { value: 0.55, label: 'Heavy memorization (0.55)' },
] as const;

const PREDICT_OPTIONS = [
  'Jumps above 80%',
  'Drops near 10–25% (close to random guessing)',
  'Stays unchanged',
] as const;

const FORMULA_NOTES: {
  id: AuditNoteId;
  title: string;
  latex: string;
  color: 'pink' | 'yellow' | 'orange';
  plain: string;
}[] = [
  {
    id: 'advantage',
    title: 'Membership advantage (leak gap)',
    latex: '\\mathrm{Adv} = \\mathrm{TPR}(\\tau) - \\mathrm{FPR}(\\tau)',
    color: 'pink',
    plain: '0% means guessing at random; 100% means a total privacy leak.',
  },
  {
    id: 'accuracy',
    title: 'Attacker accuracy (50/50 prior)',
    latex: '\\mathrm{Acc} = \\tfrac{1}{2}\\bigl(\\mathrm{TPR} + (1 - \\mathrm{FPR})\\bigr)',
    color: 'yellow',
    plain: 'Share of records the attacker guesses right when half are members.',
  },
  {
    id: 'defense',
    title: 'Differential privacy noise σ',
    latex: '\\sigma_{\\mathrm{eff}} = 0.12 + \\sigma_{\\mathrm{DP}}',
    color: 'orange',
    plain: 'Adding training noise spreads both distributions until they overlap.',
  },
];

function MembershipInferencePlayground({ compact = false, outerVisible = true }: { compact?: boolean; outerVisible?: boolean }) {
  const t = useVizTokens();
  const clipHistId = useId();
  const { hostRef, isCompactPhone } = useResponsiveHostWidth(760);

  const [manualGap, setManualGap] = useState(0.35);
  const [manualNoise, setManualNoise] = useState(0);
  const [manualThreshold, setManualThreshold] = useState(0.55);
  const [manualProbe, setManualProbe] = useState(0.72);
  const [activeNote, setActiveNote] = useState<AuditNoteId>('advantage');
  const [followingTrace, setFollowingTrace] = useState(true);
  const [prediction, setPrediction] = useState<number | null>(null);

  const playback = useStepPlayback(MEMBERSHIP_PLAYBACK_STEPS.length, 2600, 3, outerVisible);
  const traceStep = MEMBERSHIP_PLAYBACK_STEPS[playback.step] ?? MEMBERSHIP_PLAYBACK_STEPS[0];

  const gap = followingTrace ? traceStep.gap : manualGap;
  const noise = followingTrace ? traceStep.noise : manualNoise;
  const threshold = followingTrace ? traceStep.threshold : manualThreshold;
  const testConfidence = followingTrace ? traceStep.testConfidence : manualProbe;

  const audit = useMemo(
    () =>
      computeMembershipAudit({
        sampleCount: 200,
        seed: 5,
        gap,
        noise,
        threshold,
        testConfidence,
        bins: 20,
      }),
    [gap, noise, threshold, testConfidence],
  );

  const memberColor = t.accentDanger;
  const nonMemberColor = t.accentSecondary;
  const cutoffColor = t.accentPurple;
  const probeColor = t.accentPrimary;

  const takeControl = (next: { gap?: number; noise?: number; threshold?: number; probe?: number } = {}) => {
    setFollowingTrace(false);
    playback.stop();
    setManualGap(next.gap ?? gap);
    setManualNoise(next.noise ?? noise);
    setManualThreshold(next.threshold ?? threshold);
    setManualProbe(next.probe ?? testConfidence);
  };

  const liveExplain = followingTrace
    ? traceStep.explain
    : audit.advantage < 0.15
      ? `Privacy holds well here: attacker advantage is only ${(audit.advantage * 100).toFixed(1)}%, barely above random guessing (${(audit.balancedAccuracy * 100).toFixed(1)}% accuracy).`
      : `Attack succeeds easily: ${(audit.tpr * 100).toFixed(1)}% of real training members exceed cutoff τ = ${(threshold * 100).toFixed(0)}%, compared with ${(audit.fpr * 100).toFixed(1)}% of non-members.`;

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

  const renderHistogramPanel = (offsetX: number, panelW: number) => {
    const plotX = offsetX + 40;
    const plotY = 50;
    const plotW = panelW - 56;
    const plotH = 158;
    const px = (conf: number) => plotX + conf * plotW;
    const binW = plotW / audit.bins;
    const tauX = px(threshold);
    const probeX = px(audit.testConfidence);

    return (
      <g>
        <text x={offsetX + panelW / 2} y={20} textAnchor="middle" fontSize={15} fontWeight={700} fill={t.textPrimary}>
          Model confidence scores (200 members vs. 200 non-members)
        </text>
        <defs>
          <clipPath id={clipHistId}>
            <rect x={plotX} y={plotY} width={plotW} height={plotH} />
          </clipPath>
        </defs>

        <line x1={plotX} y1={plotY} x2={plotX} y2={plotY + plotH} stroke={t.border} strokeWidth={1.3} />
        <line x1={plotX} y1={plotY + plotH} x2={plotX + plotW} y2={plotY + plotH} stroke={t.border} strokeWidth={1.3} />

        {[0, 0.25, 0.5, 0.75, 1].map((tick) => (
          <g key={`xt-${tick}`}>
            <line x1={px(tick)} y1={plotY + plotH} x2={px(tick)} y2={plotY + plotH + 4} stroke={t.border} />
            <text x={px(tick)} y={plotY + plotH + 19} textAnchor="middle" fontSize={14} fill={t.textMuted}>
              {Math.round(tick * 100)}%
            </text>
          </g>
        ))}

        {[0, audit.maxBinCount].map((cnt, idx) => {
          const y = plotY + plotH - (cnt / audit.maxBinCount) * (plotH - 28);
          return (
            <text key={`yt-${idx}`} x={plotX - 6} y={y + 4} textAnchor="end" fontSize={14} fill={t.textMuted}>
              {cnt}
            </text>
          );
        })}

        <g clipPath={`url(#${clipHistId})`}>
          <rect x={tauX} y={plotY} width={Math.max(0, plotX + plotW - tauX)} height={plotH} fill={cutoffColor} fillOpacity={0.1} />

          {audit.nonMemberHist.map((nmCount, i) => {
            const mCount = audit.memberHist[i];
            const nmH = (nmCount / audit.maxBinCount) * (plotH - 28);
            const mH = (mCount / audit.maxBinCount) * (plotH - 28);
            const halfW = Math.max(2, (binW - 3) / 2);
            const bx = plotX + i * binW + 1;
            const binStart = i / audit.bins;
            const pastCutoff = binStart + 0.5 / audit.bins >= threshold;
            return (
              <g key={`bin-${i}`}>
                <rect
                  x={bx}
                  y={plotY + plotH - nmH}
                  width={halfW}
                  height={nmH}
                  rx={1.5}
                  fill={nonMemberColor}
                  fillOpacity={pastCutoff ? 0.92 : 0.45}
                />
                <rect
                  x={bx + halfW + 1}
                  y={plotY + plotH - mH}
                  width={halfW}
                  height={mH}
                  rx={1.5}
                  fill={memberColor}
                  fillOpacity={pastCutoff ? 0.92 : 0.45}
                />
              </g>
            );
          })}

          <line x1={tauX} y1={plotY} x2={tauX} y2={plotY + plotH} stroke={cutoffColor} strokeWidth={2.4} strokeDasharray="5 3" />
        </g>

        <text
          x={threshold > 0.68 ? tauX - 6 : tauX + 6}
          y={plotY + 14}
          textAnchor={threshold > 0.68 ? 'end' : 'start'}
          fontSize={14}
          fontWeight={700}
          fill={cutoffColor}
        >
          cutoff τ = {Math.round(threshold * 100)}%
        </text>

        <path
          d={`M${probeX} ${plotY + plotH - 8} L${probeX + 7} ${plotY + plotH} L${probeX} ${plotY + plotH + 8} L${probeX - 7} ${plotY + plotH} Z`}
          fill={probeColor}
          stroke={t.background}
          strokeWidth={1.3}
        />
        <text
          x={audit.testConfidence > 0.65 ? probeX - 10 : audit.testConfidence < 0.35 ? probeX + 10 : probeX}
          y={plotY + plotH + 39}
          textAnchor={audit.testConfidence > 0.65 ? 'end' : audit.testConfidence < 0.35 ? 'start' : 'middle'}
          fontSize={14}
          fontWeight={700}
          fill={probeColor}
        >
          probe c = {(audit.testConfidence * 100).toFixed(0)}% ({audit.testFlaggedAsMember ? 'flagged' : 'cleared'})
        </text>
      </g>
    );
  };

  const renderScorecardPanel = (offsetX: number, panelW: number) => {
    const plotX = offsetX + 18;
    const barMax = panelW - 106;
    const rows: { label: string; value: number; detail: string; color: string }[] = [
      {
        label: '1. Caught members (TPR)',
        value: audit.tpr,
        detail: `${audit.tpCount}/200`,
        color: memberColor,
      },
      {
        label: '2. False alarms (FPR)',
        value: audit.fpr,
        detail: `${audit.fpCount}/200`,
        color: nonMemberColor,
      },
      {
        label: '3. Attack advantage (TPR − FPR)',
        value: Math.max(0, audit.advantage),
        detail: `${(audit.advantage * 100).toFixed(0)}%`,
        color: cutoffColor,
      },
    ];

    return (
      <g>
        <text x={offsetX + panelW / 2} y={20} textAnchor="middle" fontSize={15} fontWeight={700} fill={t.textPrimary}>
          Attack scorecard (privacy leak check)
        </text>
        <text x={plotX} y={46} fontSize={14} fill={t.textSecondary}>
          Attacker flags any score ≥ {(threshold * 100).toFixed(0)}% as “in training”
        </text>

        {rows.map((r, i) => {
          const y = 66 + i * 54;
          const w = Math.max(3, Math.min(barMax, r.value * barMax));
          return (
            <g key={r.label}>
              <text x={plotX} y={y + 12} fontSize={14} fontWeight={700} fill={r.color}>
                {r.label}
              </text>
              <rect x={plotX} y={y + 20} width={barMax} height={20} rx={4} fill={t.surfaceAlt} />
              <rect x={plotX} y={y + 20} width={w} height={20} rx={4} fill={r.color} fillOpacity={0.85} />
              <text x={plotX + barMax + 8} y={y + 35} fontSize={14} fontWeight={700} fill={r.color}>
                {r.detail}
              </text>
            </g>
          );
        })}

        <text x={plotX} y={244} fontSize={14} fontWeight={700} fill={audit.advantage < 0.15 ? probeColor : memberColor}>
          Verdict: {audit.advantage < 0.15 ? 'Near coin-flip (private)' : audit.advantage < 0.35 ? 'Moderate leak' : 'Strong privacy leak!'}
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
            title="Can an attacker tell if your data was used to train a model?"
            description="When a model memorizes its training data, it returns higher confidence on training members than on unseen records. An attacker picks a confidence cutoff τ to spot members — unless differential-privacy noise σ blurs both groups together."
          />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <div style={{ marginBottom: -8 }}>
              <PillSelect<number>
                label="Memorization gap (model overfitting)"
                value={gap}
                onChange={(v) => {
                  const val = typeof v === 'function' ? v(gap) : v;
                  takeControl({ gap: val });
                }}
                options={[...GAP_OPTIONS]}
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

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))', gap: 14, alignItems: 'end', marginTop: 4 }}>
            <Slider
              label="Privacy noise σ (DP training blur)"
              value={noise}
              onChange={(v) => takeControl({ noise: v })}
              min={0}
              max={0.4}
              step={0.01}
              format={(v) => v.toFixed(2)}
            />
            <Slider
              label="Attacker cutoff τ (flag ≥ τ)"
              value={threshold}
              onChange={(v) => takeControl({ threshold: v })}
              min={0.1}
              max={0.9}
              step={0.01}
              format={(v) => `${Math.round(v * 100)}%`}
            />
            <label style={{ display: 'block', fontSize: 15, color: t.textPrimary }}>
              <span style={{ display: 'block', marginBottom: 4, fontWeight: 700 }}>Test noise σ directly (0–0.40)</span>
              <input
                aria-label="Test noise σ directly"
                type="number"
                min={0}
                max={0.4}
                step={0.02}
                value={Number(noise.toFixed(2))}
                onChange={(e) => takeControl({ noise: Math.max(0, Math.min(0.4, Number(e.target.value) || 0)) })}
                style={inputStyle}
              />
            </label>
            <label style={{ display: 'block', fontSize: 15, color: t.textPrimary }}>
              <span style={{ display: 'block', marginBottom: 4, fontWeight: 700 }}>Probe record confidence c (0–1)</span>
              <input
                aria-label="Probe record confidence c"
                type="number"
                min={0}
                max={1}
                step={0.02}
                value={Number(audit.testConfidence.toFixed(2))}
                onChange={(e) => takeControl({ probe: Math.max(0, Math.min(1, Number(e.target.value) || 0)) })}
                style={inputStyle}
              />
            </label>
          </div>
        </>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 18px', fontSize: 15 }} aria-label="Chart legend">
        <span><span style={{ display: 'inline-block', width: 12, height: 12, background: memberColor, borderRadius: 2, marginRight: 6 }} />Training members</span>
        <span><span style={{ display: 'inline-block', width: 12, height: 12, background: nonMemberColor, borderRadius: 2, marginRight: 6 }} />Non-members</span>
        <span><span style={{ display: 'inline-block', width: 14, height: 3, background: cutoffColor, verticalAlign: 'middle', marginRight: 6 }} />Attacker cutoff τ</span>
        <span><span style={{ display: 'inline-block', width: 10, height: 10, background: probeColor, transform: 'rotate(45deg)', marginRight: 6 }} />Probed record c</span>
      </div>

      <div ref={hostRef} style={{ width: '100%' }}>
        {!isCompactPhone ? (
          <svg
            width="100%"
            viewBox="0 0 760 264"
            role="img"
            aria-label={`Membership inference at noise ${noise.toFixed(2)} and cutoff ${threshold.toFixed(2)}: TPR ${(audit.tpr * 100).toFixed(1)}%, FPR ${(audit.fpr * 100).toFixed(1)}%, advantage ${(audit.advantage * 100).toFixed(1)}%`}
            style={{ display: 'block', fontFamily: FONT_FAMILY }}
          >
            {renderHistogramPanel(0, 420)}
            {renderScorecardPanel(438, 322)}
          </svg>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            <svg width="100%" viewBox="0 0 370 260" role="img" aria-label="Member vs non-member confidence histogram" style={{ display: 'block', fontFamily: FONT_FAMILY }}>
              {renderHistogramPanel(0, 370)}
            </svg>
            <svg width="100%" viewBox="0 0 370 255" role="img" aria-label="Attack scorecard" style={{ display: 'block', fontFamily: FONT_FAMILY }}>
              {renderScorecardPanel(0, 370)}
            </svg>
          </div>
        )}
      </div>

      {compact ? (
        <StickyRow>
          <StickyNote title="Attack advantage" latex={'\\mathrm{Adv} = \\mathrm{TPR}(\\tau) - \\mathrm{FPR}(\\tau)'} color="pink" tilt={-1}>
            <p className="nm-sticky__mono" style={{ textAlign: 'center' }}>
              {(audit.tpr * 100).toFixed(1)}% − {(audit.fpr * 100).toFixed(1)}% = <strong>{(audit.advantage * 100).toFixed(1)}%</strong>
            </p>
          </StickyNote>
          <StickyNote title={`Step ${playback.step + 1} of ${MEMBERSHIP_PLAYBACK_STEPS.length}`} color="blue" tilt={1} live>
            <p>{liveExplain}</p>
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
                active={activeNote === n.id}
                onSelect={() => setActiveNote(n.id)}
              >
                <p style={{ textAlign: 'center' }}>{n.plain}</p>
              </StickyNote>
            ))}
          </StickyRow>
          <StickyRow>
            <StickyNote title="Audit numbers (200 + 200 records)" color="green" tilt={1}>
              <p className="nm-sticky__mono">
                TPR = {audit.tpCount}/200 (<strong>{(audit.tpr * 100).toFixed(1)}%</strong>) · FPR = {audit.fpCount}/200 (<strong>{(audit.fpr * 100).toFixed(1)}%</strong>)
              </p>
              <p className="nm-sticky__mono" style={{ marginTop: 4 }}>
                Advantage = {(audit.advantage * 100).toFixed(1)}% · Accuracy = {(audit.balancedAccuracy * 100).toFixed(1)}% · Probe c = {(audit.testConfidence * 100).toFixed(0)}% ({(audit.localMemberShare * 100).toFixed(0)}% local member share)
              </p>
            </StickyNote>
            <StickyNote title={followingTrace ? `Step ${playback.step + 1} of ${MEMBERSHIP_PLAYBACK_STEPS.length} · ${traceStep.title}` : 'What just happened'} color="blue" tilt={-1} live>
              <p>{liveExplain}</p>
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
            <span>With typical overfitting (gap = 0.35) and cutoff τ = 55%, if we add differential-privacy noise σ = 0.35, what happens to Attack Advantage (TPR − FPR)?</span>
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
                noise σ = 0.35 widens both member and non-member curves until they overlap heavily, dropping advantage from ~65% down into the 15% range.{' '}
                <button
                  type="button"
                  onClick={() => takeControl({ gap: 0.35, noise: 0.35, threshold: 0.55 })}
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
                  Apply σ = 0.35 defense now
                </button>
              </span>
            )}
          </div>
        </>
      )}
    </>
  );
}

export default function MembershipInferenceDiagram({ compact = false }: { compact?: boolean } = {}) {
  const outerVisible = useVizVisible();
  return (
    <VisualizationContainer
      title="Membership inference privacy audit playground"
      footer="Seeded confidence distributions over 200 training members and 200 non-members. Differential privacy noise widens both distributions equally, shrinking TPR − FPR toward random guessing."
    >
      <MembershipInferencePlayground compact={compact} outerVisible={outerVisible} />
    </VisualizationContainer>
  );
}
