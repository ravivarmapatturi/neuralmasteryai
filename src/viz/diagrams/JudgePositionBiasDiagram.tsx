import { useId, useMemo, useState } from 'react';
import { FONT_FAMILY, RADIUS, useVizTokens } from '../../theme/vizTokens';
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
  analyzePositionBias,
  POSITION_BIAS_PRESETS,
  type JudgeOrderMode,
} from '../lib/judgePositionBias';
import { RESPONSE_A_QUALITY, RESPONSE_B_QUALITY } from '../lib/llmEval';
import { PredictChallenge } from './playgroundPrimitives';
import { useResponsiveHostWidth, useStepPlayback } from './useStepPlayback';

const PREDICT_OPTIONS = [
  'A wins both passes because 7.2 > 7.0',
  'A wins when shown first, then B wins when B is shown first (the verdict flips)',
  'Both scores drop equally to a tie in every pass',
] as const;

const FORMULA_LATEX: Record<JudgeOrderMode, string> = {
  AB: String.raw`S_A = q_A + \beta,\qquad S_B = q_B`,
  BA: String.raw`S_A = q_A,\qquad S_B = q_B + \beta`,
  swapped: String.raw`\bar S_A - \bar S_B = \left(q_A + \tfrac{\beta}{2}\right) - \left(q_B + \tfrac{\beta}{2}\right) = q_A - q_B`,
};

function JudgePositionBiasPlayground({
  compact = false,
  outerVisible = true,
}: {
  compact?: boolean;
  outerVisible?: boolean;
}) {
  const t = useVizTokens();
  const clipPromptId = useId();
  const clipScoresId = useId();
  const { hostRef, isCompactPhone } = useResponsiveHostWidth(760);

  const [manualMode, setManualMode] = useState<JudgeOrderMode | null>(null);
  const [qualityA, setQualityA] = useState<number>(RESPONSE_A_QUALITY);
  const [qualityB, setQualityB] = useState<number>(RESPONSE_B_QUALITY);
  const [bias, setBias] = useState<number>(0.5);
  const [prediction, setPrediction] = useState<number | null>(null);

  const analysis = useMemo(
    () => analyzePositionBias({ qualityA, qualityB, bias }),
    [qualityA, qualityB, bias],
  );

  const playback = useStepPlayback(analysis.trace.length, 2300, 1, outerVisible);
  const activeTrace = analysis.trace[playback.step] ?? analysis.trace[0];
  const orderMode: JudgeOrderMode = manualMode ?? activeTrace.mode;

  const colorA = t.accentSecondary;
  const colorB = t.accentPurple;
  const biasColor = t.accentWarn;
  const okColor = t.accentPrimary;
  const wrongColor = t.accentDanger;

  const selectOrderMode = (mode: JudgeOrderMode) => {
    playback.stop();
    setManualMode(mode);
  };

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

  const shownScoreA =
    orderMode === 'AB'
      ? analysis.passAB.scoreA
      : orderMode === 'BA'
        ? analysis.passBA.scoreA
        : analysis.avgScoreA;
  const shownScoreB =
    orderMode === 'AB'
      ? analysis.passAB.scoreB
      : orderMode === 'BA'
        ? analysis.passBA.scoreB
        : analysis.avgScoreB;
  const shownVerdict =
    orderMode === 'AB'
      ? analysis.passAB.winner
      : orderMode === 'BA'
        ? analysis.passBA.winner
        : analysis.consistentVerdict;

  const renderPromptPanel = (offsetX: number, panelW: number) => {
    const plotX = offsetX + 16;
    const plotY = 36;
    const plotW = panelW - 32;
    const plotH = 212;

    const slot1IsA = orderMode !== 'BA';
    const slot1Col = slot1IsA ? colorA : colorB;
    const slot2Col = slot1IsA ? colorB : colorA;
    const slot1Name = slot1IsA ? 'Response A' : 'Response B';
    const slot2Name = slot1IsA ? 'Response B' : 'Response A';
    const slot1Base = slot1IsA ? analysis.qualityA : analysis.qualityB;
    const slot2Base = slot1IsA ? analysis.qualityB : analysis.qualityA;

    const verdictColor =
      orderMode === 'swapped'
        ? analysis.verdictFlips
          ? biasColor
          : okColor
        : shownVerdict === analysis.trueWinner
          ? okColor
          : wrongColor;

    return (
      <g>
        <text x={offsetX + panelW / 2} y={20} textAnchor="middle" fontSize={15} fontWeight={700} fill={t.textPrimary}>
          1. Prompt slots sent to LLM judge
        </text>
        <defs>
          <clipPath id={`${clipPromptId}-${offsetX}`}>
            <rect x={plotX} y={plotY} width={plotW} height={plotH} />
          </clipPath>
        </defs>

        <rect x={plotX} y={plotY} width={plotW} height={plotH} fill={t.background} stroke={t.border} strokeWidth={1} rx={4} />

        <g clipPath={`url(#${clipPromptId}-${offsetX})`}>
          {orderMode === 'swapped' ? (
            <>
              {/* Pass AB box */}
              <rect x={plotX + 12} y={plotY + 12} width={plotW - 24} height={58} rx={6} fill={t.surfaceAlt} stroke={colorA} strokeWidth={1.6} />
              <text x={plotX + 24} y={plotY + 35} fontSize={14} fontWeight={700} fill={t.textPrimary}>
                Pass 1 (A then B): A = {analysis.passAB.scoreA.toFixed(2)}, B = {analysis.passAB.scoreB.toFixed(2)}
              </text>
              <text x={plotX + 24} y={plotY + 57} fontSize={14} fontWeight={700} fill={analysis.passAB.correct ? okColor : wrongColor}>
                Pass 1 picks {analysis.passAB.winner} (+{analysis.bias.toFixed(2)} went to A)
              </text>

              {/* Pass BA box */}
              <rect x={plotX + 12} y={plotY + 80} width={plotW - 24} height={58} rx={6} fill={t.surfaceAlt} stroke={colorB} strokeWidth={1.6} />
              <text x={plotX + 24} y={plotY + 103} fontSize={14} fontWeight={700} fill={t.textPrimary}>
                Pass 2 (B then A): B = {analysis.passBA.scoreB.toFixed(2)}, A = {analysis.passBA.scoreA.toFixed(2)}
              </text>
              <text x={plotX + 24} y={plotY + 125} fontSize={14} fontWeight={700} fill={analysis.passBA.correct ? okColor : wrongColor}>
                Pass 2 picks {analysis.passBA.winner} (+{analysis.bias.toFixed(2)} went to B)
              </text>

              {/* Calibrated result */}
              <rect x={plotX + 12} y={plotY + 148} width={plotW - 24} height={50} rx={6} fill={`${verdictColor}18`} stroke={verdictColor} strokeWidth={1.6} />
              <text x={plotX + plotW / 2} y={plotY + 172} textAnchor="middle" fontSize={15} fontWeight={700} fill={verdictColor}>
                {analysis.verdictFlips
                  ? `Verdict flips (${analysis.passAB.winner} vs ${analysis.passBA.winner}) → Tie`
                  : `Consistent winner: ${analysis.consistentVerdict}`}
              </text>
              <text x={plotX + plotW / 2} y={plotY + 191} textAnchor="middle" fontSize={14} fill={t.textSecondary}>
                Swap-avg gap: {analysis.swappedGap >= 0 ? '+' : ''}{analysis.swappedGap.toFixed(2)}
              </text>
            </>
          ) : (
            <>
              {/* Slot 1 with bias highlight */}
              <rect x={plotX + 12} y={plotY + 14} width={plotW - 24} height={56} rx={6} fill={`${slot1Col}14`} stroke={slot1Col} strokeWidth={1.8} />
              <text x={plotX + 24} y={plotY + 37} fontSize={15} fontWeight={700} fill={slot1Col}>
                Slot 1: {slot1Name} (base {slot1Base.toFixed(2)})
              </text>
              <text x={plotX + 24} y={plotY + 58} fontSize={14} fontWeight={700} fill={biasColor}>
                + {analysis.bias.toFixed(2)} first-slot bias → {(slot1Base + analysis.bias).toFixed(2)}
              </text>

              {/* Slot 2 without bias */}
              <rect x={plotX + 12} y={plotY + 80} width={plotW - 24} height={54} rx={6} fill={t.surfaceAlt} stroke={slot2Col} strokeWidth={1.6} />
              <text x={plotX + 24} y={plotY + 104} fontSize={15} fontWeight={700} fill={slot2Col}>
                Slot 2: {slot2Name} (base {slot2Base.toFixed(2)})
              </text>
              <text x={plotX + 24} y={plotY + 124} fontSize={14} fill={t.textSecondary}>
                + 0.00 position bonus → {slot2Base.toFixed(2)}
              </text>

              {/* Judge decision */}
              <rect x={plotX + 12} y={plotY + 146} width={plotW - 24} height={52} rx={6} fill={`${verdictColor}18`} stroke={verdictColor} strokeWidth={1.8} />
              <text x={plotX + plotW / 2} y={plotY + 170} textAnchor="middle" fontSize={15} fontWeight={700} fill={verdictColor}>
                Judge picks: {shownVerdict === 'Tie' ? 'Tie' : `${shownVerdict} wins`}
              </text>
              <text x={plotX + plotW / 2} y={plotY + 190} textAnchor="middle" fontSize={14} fill={t.textSecondary}>
                {shownVerdict === analysis.trueWinner
                  ? `Matches true quality (${analysis.qualityA.toFixed(1)} vs ${analysis.qualityB.toFixed(1)})`
                  : `Wrong winner! True quality favors ${analysis.trueWinner}`}
              </text>
            </>
          )}
        </g>

        <text x={plotX + plotW / 2} y={plotY + plotH + 22} textAnchor="middle" fontSize={14} fill={t.textSecondary}>
          True gap: q_A − q_B = {analysis.trueGap >= 0 ? '+' : ''}{analysis.trueGap.toFixed(2)}
        </text>
      </g>
    );
  };

  const renderBarsPanel = (offsetX: number, panelW: number) => {
    const plotX = offsetX + 46;
    const plotY = 36;
    const plotW = panelW - 64;
    const plotH = 212;
    const maxScore = 11.5;

    const yVal = (v: number) => plotY + plotH - (Math.max(0, Math.min(maxScore, v)) / maxScore) * (plotH - 12);

    const groups = [
      { label: 'True q', a: analysis.qualityA, b: analysis.qualityB, aBonus: 0, bBonus: 0 },
      { label: 'Pass AB', a: analysis.qualityA, b: analysis.qualityB, aBonus: analysis.bias, bBonus: 0 },
      { label: 'Pass BA', a: analysis.qualityA, b: analysis.qualityB, aBonus: 0, bBonus: analysis.bias },
    ];
    const groupSlot = plotW / groups.length;
    const barW = Math.min(26, Math.floor(groupSlot * 0.28));

    return (
      <g>
        <text x={offsetX + panelW / 2} y={20} textAnchor="middle" fontSize={15} fontWeight={700} fill={t.textPrimary}>
          2. True quality vs. judge scores (0–10 scale)
        </text>
        <defs>
          <clipPath id={`${clipScoresId}-${offsetX}`}>
            <rect x={plotX} y={plotY} width={plotW} height={plotH} />
          </clipPath>
        </defs>

        <rect x={plotX} y={plotY} width={plotW} height={plotH} fill={t.background} rx={4} />
        <line x1={plotX} y1={plotY} x2={plotX} y2={plotY + plotH} stroke={t.border} strokeWidth={1.3} />
        <line x1={plotX} y1={plotY + plotH} x2={plotX + plotW} y2={plotY + plotH} stroke={t.border} strokeWidth={1.3} />

        {[0, 5, 10].map((yt) => (
          <g key={`sy-${yt}`}>
            <line x1={plotX - 4} y1={yVal(yt)} x2={plotX} y2={yVal(yt)} stroke={t.border} />
            <text x={plotX - 8} y={yVal(yt) + 5} textAnchor="end" fontSize={14} fill={t.textMuted}>
              {yt}
            </text>
          </g>
        ))}

        <g clipPath={`url(#${clipScoresId}-${offsetX})`}>
          {groups.map((grp, gIdx) => {
            const gx = plotX + gIdx * groupSlot + groupSlot / 2;
            const ax = gx - barW - 4;
            const bx = gx + 4;
            const totalA = grp.a + grp.aBonus;
            const totalB = grp.b + grp.bBonus;
            const isHighlighted =
              (orderMode === 'AB' && gIdx === 1) ||
              (orderMode === 'BA' && gIdx === 2) ||
              (orderMode === 'swapped' && gIdx >= 1);

            const drawBar = (x: number, base: number, bonus: number, fill: string) => {
              const baseTop = yVal(base);
              const totalTop = yVal(base + bonus);
              const bottom = plotY + plotH;
              return (
                <g opacity={isHighlighted || gIdx === 0 ? 1 : 0.45}>
                  <rect x={x} y={baseTop} width={barW} height={Math.max(2, bottom - baseTop)} rx={2} fill={fill} fillOpacity={0.85} />
                  {bonus > 0.01 && (
                    <rect
                      x={x}
                      y={totalTop}
                      width={barW}
                      height={Math.max(2, baseTop - totalTop)}
                      rx={2}
                      fill={biasColor}
                      fillOpacity={0.9}
                    />
                  )}
                </g>
              );
            };

            return (
              <g key={grp.label}>
                {drawBar(ax, grp.a, grp.aBonus, colorA)}
                {drawBar(bx, grp.b, grp.bBonus, colorB)}
                <text
                  x={ax + barW / 2}
                  y={Math.max(plotY + 15, yVal(totalA) - 5)}
                  textAnchor="middle"
                  fontSize={14}
                  fontWeight={700}
                  fill={colorA}
                  stroke={t.background}
                  strokeWidth={3}
                  paintOrder="stroke"
                >
                  {totalA.toFixed(1)}
                </text>
                <text
                  x={bx + barW / 2}
                  y={Math.max(plotY + 15, yVal(totalB) - 5)}
                  textAnchor="middle"
                  fontSize={14}
                  fontWeight={700}
                  fill={colorB}
                  stroke={t.background}
                  strokeWidth={3}
                  paintOrder="stroke"
                >
                  {totalB.toFixed(1)}
                </text>
              </g>
            );
          })}
        </g>

        {groups.map((grp, gIdx) => (
          <text
            key={`gl-${grp.label}`}
            x={plotX + gIdx * groupSlot + groupSlot / 2}
            y={plotY + plotH + 20}
            textAnchor="middle"
            fontSize={14}
            fontWeight={700}
            fill={t.textPrimary}
          >
            {grp.label}
          </text>
        ))}
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
                title="Why swapping two answers flips an LLM judge's verdict"
                description="Pairwise LLM judges tend to award an extra position bonus β to whichever response sits in Slot 1. When true quality difference is smaller than β, swapping the order flips the winner."
              />
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', paddingTop: 2 }}>
              <VizButton
                onClick={() => {
                  setManualMode(null);
                  playback.toggle();
                }}
              >
                {playback.playing ? 'Pause' : 'Play'}
              </VizButton>
              <VizButton
                variant="secondary"
                onClick={() => {
                  setManualMode(null);
                  playback.next();
                }}
              >
                Step →
              </VizButton>
              <VizButton
                variant="secondary"
                onClick={() => {
                  setManualMode(null);
                  playback.reset();
                }}
              >
                Reset
              </VizButton>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ marginBottom: -8 }}>
              <PillSelect<JudgeOrderMode>
                label="Display order (which response sits in Slot 1)"
                value={orderMode}
                onChange={(val) => selectOrderMode(typeof val === 'function' ? val(orderMode) : val)}
                options={[
                  { value: 'AB', label: 'A shown first' },
                  { value: 'BA', label: 'B shown first' },
                  { value: 'swapped', label: 'Both orders (AB + BA)' },
                ]}
              />
            </div>
            <div style={{ marginBottom: -8 }}>
              <PillSelect<string>
                label="Scenario presets"
                value={
                  POSITION_BIAS_PRESETS.find(
                    (p) =>
                      Math.abs(p.qA - qualityA) < 1e-6 &&
                      Math.abs(p.qB - qualityB) < 1e-6 &&
                      Math.abs(p.bias - bias) < 1e-6,
                  )?.id ?? 'custom'
                }
                onChange={(id) => {
                  const found = POSITION_BIAS_PRESETS.find((p) => p.id === id);
                  if (found) {
                    setQualityA(found.qA);
                    setQualityB(found.qB);
                    setBias(found.bias);
                  }
                }}
                options={[
                  ...POSITION_BIAS_PRESETS.map((p) => ({ value: p.id, label: p.label })),
                  ...(POSITION_BIAS_PRESETS.some(
                    (p) =>
                      Math.abs(p.qA - qualityA) < 1e-6 &&
                      Math.abs(p.qB - qualityB) < 1e-6 &&
                      Math.abs(p.bias - bias) < 1e-6,
                  )
                    ? []
                    : [{ value: 'custom', label: 'Custom scores' }]),
                ]}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 155px), 1fr))', gap: 12, alignItems: 'end' }}>
            <Slider
              label="First-slot position bias β"
              value={bias}
              onChange={(v) => setBias(v)}
              min={0}
              max={2.0}
              step={0.05}
              format={(v) => `+${v.toFixed(2)}`}
            />
            <label style={{ display: 'block', fontSize: 15, color: t.textPrimary }}>
              <span style={{ display: 'block', marginBottom: 4, fontWeight: 700 }}>True quality A (q_A)</span>
              <input
                aria-label="True quality of Response A"
                type="number"
                min={1}
                max={10}
                step={0.1}
                value={qualityA}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (Number.isFinite(v)) setQualityA(Math.max(1, Math.min(10, Number(v.toFixed(1)))));
                }}
                style={inputStyle}
              />
            </label>
            <label style={{ display: 'block', fontSize: 15, color: t.textPrimary }}>
              <span style={{ display: 'block', marginBottom: 4, fontWeight: 700 }}>True quality B (q_B)</span>
              <input
                aria-label="True quality of Response B"
                type="number"
                min={1}
                max={10}
                step={0.1}
                value={qualityB}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (Number.isFinite(v)) setQualityB(Math.max(1, Math.min(10, Number(v.toFixed(1)))));
                }}
                style={inputStyle}
              />
            </label>
          </div>
        </>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 18px', fontSize: 15 }} aria-label="Score colours">
        <span>
          <span style={{ display: 'inline-block', width: 12, height: 12, background: colorA, verticalAlign: 'middle', marginRight: 6 }} />
          Response A true quality ({analysis.qualityA.toFixed(1)})
        </span>
        <span>
          <span style={{ display: 'inline-block', width: 12, height: 12, background: colorB, verticalAlign: 'middle', marginRight: 6 }} />
          Response B true quality ({analysis.qualityB.toFixed(1)})
        </span>
        <span>
          <span style={{ display: 'inline-block', width: 12, height: 12, background: biasColor, verticalAlign: 'middle', marginRight: 6 }} />
          First-slot bonus (+{analysis.bias.toFixed(2)})
        </span>
      </div>

      <div ref={hostRef} style={{ width: '100%' }}>
        {!isCompactPhone ? (
          <svg
            width="100%"
            viewBox="0 0 760 282"
            role="img"
            aria-label={`Order ${orderMode}: A scores ${shownScoreA.toFixed(2)}, B scores ${shownScoreB.toFixed(2)}, verdict ${shownVerdict}`}
            style={{ display: 'block', fontFamily: FONT_FAMILY }}
          >
            {renderPromptPanel(0, 366)}
            {renderBarsPanel(378, 382)}
          </svg>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            <svg width="100%" viewBox="0 0 370 282" role="img" aria-label="Prompt slots and judge verdict" style={{ display: 'block', fontFamily: FONT_FAMILY }}>
              {renderPromptPanel(0, 370)}
            </svg>
            <svg width="100%" viewBox="0 0 370 282" role="img" aria-label="True quality versus biased judge scores" style={{ display: 'block', fontFamily: FONT_FAMILY }}>
              {renderBarsPanel(0, 370)}
            </svg>
          </div>
        )}
      </div>

      {compact ? (
        <StickyRow>
          <StickyNote title={`Order: ${orderMode}`} latex={FORMULA_LATEX[orderMode]} color="yellow" tilt={-1}>
            <p className="nm-sticky__mono" style={{ textAlign: 'center' }}>
              A = {shownScoreA.toFixed(2)} · B = {shownScoreB.toFixed(2)} · Verdict: {shownVerdict}
            </p>
          </StickyNote>
          <StickyNote title={`Step ${playback.step + 1} of ${analysis.trace.length}`} color="blue" tilt={1} live>
            <p>{activeTrace.explain}</p>
          </StickyNote>
        </StickyRow>
      ) : (
        <>
          <StickyRow>
            <StickyNote
              title="Pass 1: A in Slot 1"
              latex={FORMULA_LATEX.AB}
              color="yellow"
              tilt={-1}
              active={orderMode === 'AB'}
              onSelect={() => selectOrderMode('AB')}
            >
              <p style={{ textAlign: 'center' }}>A sits first and receives +β; B sits second and scores only its true quality.</p>
            </StickyNote>
            <StickyNote
              title="Pass 2: B in Slot 1"
              latex={FORMULA_LATEX.BA}
              color="pink"
              tilt={1}
              active={orderMode === 'BA'}
              onSelect={() => selectOrderMode('BA')}
            >
              <p style={{ textAlign: 'center' }}>Swapping slots moves +β onto B, flipping the verdict whenever β exceeds |q_A − q_B|.</p>
            </StickyNote>
            <StickyNote
              title="Swap & average mitigation"
              latex={FORMULA_LATEX.swapped}
              color="orange"
              tilt={-1}
              active={orderMode === 'swapped'}
              onSelect={() => selectOrderMode('swapped')}
            >
              <p style={{ textAlign: 'center' }}>Scoring both orders cancels +β/2 symmetrically and flags inconsistent flips as ties.</p>
            </StickyNote>
          </StickyRow>

          <StickyRow>
            <StickyNote title={`Worked numbers · bias β = +${analysis.bias.toFixed(2)}`} color="green" tilt={1}>
              <p className="nm-sticky__mono">
                Pass AB: A = <strong>{analysis.passAB.scoreA.toFixed(2)}</strong> vs B = <strong>{analysis.passAB.scoreB.toFixed(2)}</strong> ({analysis.passAB.winner}) · Pass BA: A = <strong>{analysis.passBA.scoreA.toFixed(2)}</strong> vs B = <strong>{analysis.passBA.scoreB.toFixed(2)}</strong> ({analysis.passBA.winner})
              </p>
              <p className="nm-sticky__mono" style={{ marginTop: 4 }}>
                Swap avg: A = {analysis.avgScoreA.toFixed(2)} vs B = {analysis.avgScoreB.toFixed(2)} · Gap = <strong>{analysis.swappedGap >= 0 ? '+' : ''}{analysis.swappedGap.toFixed(2)}</strong> · {analysis.verdictFlips ? 'Flips on swap!' : 'Consistent'}
              </p>
            </StickyNote>
            <StickyNote title={`Step ${playback.step + 1} of ${analysis.trace.length} · What just happened`} color="blue" tilt={-1} live>
              <p>{activeTrace.explain}</p>
            </StickyNote>
          </StickyRow>

          <PredictChallenge
            prompt="Response A is 7.2 and Response B is 7.0, and the judge adds +0.50 to whichever response goes in Slot 1. What happens when you test both AB and BA?"
            options={PREDICT_OPTIONS}
            correctIndex={1}
            selected={prediction}
            onSelect={setPrediction}
            explanation="Because +0.50 is larger than the 0.20 true gap, Slot 1 always wins—so AB picks A and BA picks B."
            actionLabel="Run +0.50 swap check now"
            onAction={() => {
              setQualityA(RESPONSE_A_QUALITY);
              setQualityB(RESPONSE_B_QUALITY);
              setBias(0.5);
              selectOrderMode('swapped');
            }}
          />
        </>
      )}
    </div>
  );
}

export default function JudgePositionBiasDiagram({ compact = false }: { compact?: boolean } = {}) {
  const outerVisible = useVizVisible();
  return (
    <VisualizationContainer
      title="LLM-as-judge position bias playground"
      footer="Exact additive first-slot bias model (Zheng et al., 2023 MT-Bench protocol). Running both AB and BA orders cancels bias symmetrically and catches flips."
    >
      <JudgePositionBiasPlayground compact={compact} outerVisible={outerVisible} />
    </VisualizationContainer>
  );
}
