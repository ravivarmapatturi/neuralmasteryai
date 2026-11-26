import { useId, useMemo, useState } from 'react';
import { FONT_FAMILY, RADIUS, useVizTokens } from '../../theme/vizTokens';
import {
  Slider,
  StickyNote,
  StickyRow,
  VisualizationContainer,
  VisualizationHeader,
  VizButton,
  useVizVisible,
} from '../primitives';
import {
  analyzeBm25Explorer,
  BM25_PROBE_TFS,
  explainBm25Checkpoint,
} from '../lib/bm25';
import { useResponsiveHostWidth, useStepPlayback } from './useStepPlayback';

type FormulaFocus = 'idf' | 'length' | 'score';

const CORPUS_N = 1000;
const AVG_DOC_LEN = 100;

const PREDICT_OPTIONS = [
  'Barely grows (3.612 → 4.862, under 1.4×) near the k₁ + 1 cap',
  'Multiplies by 10× (3.612 → 36.120)',
  'Drops to 0 as a keyword-stuffing penalty',
] as const;

const PLOT = { left: 56, top: 38, width: 344, height: 242 } as const;
const MAX_PLOT_TF = 32;

function NumberField({
  label,
  hint,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  hint: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  const t = useVizTokens();
  return (
    <label style={{ display: 'block', minWidth: 0, fontSize: 15 }}>
      <span style={{ display: 'block', fontWeight: 700, color: t.textPrimary }}>{label}</span>
      <span style={{ display: 'block', fontSize: 14, color: t.textSecondary, marginBottom: 4 }}>{hint}</span>
      <input
        aria-label={label}
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => {
          const v = Number(e.target.value);
          if (Number.isFinite(v)) {
            onChange(Math.max(min, Math.min(max, v)));
          }
        }}
        style={{
          width: '100%',
          minHeight: 36,
          boxSizing: 'border-box',
          padding: '4px 8px',
          borderRadius: RADIUS.sm,
          border: `1.5px solid ${t.border}`,
          background: t.background,
          color: t.textPrimary,
          fontFamily: FONT_FAMILY,
          fontSize: 15,
          fontVariantNumeric: 'tabular-nums',
        }}
      />
    </label>
  );
}

function Bm25SaturationPlayground({
  compact = false,
  outerVisible = true,
}: {
  compact?: boolean;
  outerVisible?: boolean;
}) {
  const t = useVizTokens();
  const clipCurveId = useId();
  const clipBarsId = useId();
  const { hostRef, isCompactPhone } = useResponsiveHostWidth(760);

  // Default fixture matches bm25.mdx worked example: N=1000, df=100, avgdl=100, tf=3, |D|=100, k1=1.2, b=0.75
  const [calcTf, setCalcTf] = useState(3);
  const [calcDocLen, setCalcDocLen] = useState(100);
  const [calcK1, setCalcK1] = useState(1.2);
  const [calcB, setCalcB] = useState(0.75);
  const [calcDf, setCalcDf] = useState(100);
  const [activeFormula, setActiveFormula] = useState<FormulaFocus>('score');
  const [prediction, setPrediction] = useState<number | null>(null);

  const params = useMemo(
    () => ({
      tf: calcTf,
      docLength: calcDocLen,
      avgDocLength: AVG_DOC_LEN,
      df: calcDf,
      N: CORPUS_N,
      k1: calcK1,
      b: calcB,
    }),
    [calcTf, calcDocLen, calcDf, calcK1, calcB],
  );

  const analysis = useMemo(() => analyzeBm25Explorer(params), [params]);

  // Step 1 corresponds to tf=3 (worked example baseline) when reducedMotion is enabled
  const playback = useStepPlayback(BM25_PROBE_TFS.length, 1550, 1, outerVisible);
  const activeCheckpoint = analysis.checkpoints[playback.step] ?? analysis.checkpoints[1];

  const activeColor = t.accentPrimary; // green: BM25 with your |D| & b
  const baselineColor = t.accentSecondary; // blue: average-length BM25 (B = 1)
  const linearColor = t.accentDanger; // red: uncapped linear TF
  const ceilingColor = t.accentWarn; // amber: k1+1 ceiling & probe marker
  const userColor = t.accentPurple; // purple: user's chosen tf when different

  const resetInputs = (tfVal: number, docLenVal: number, k1Val: number, bVal: number, dfVal = 100) => {
    setCalcTf(tfVal);
    setCalcDocLen(docLenVal);
    setCalcK1(k1Val);
    setCalcB(bVal);
    setCalcDf(dfVal);
    setPrediction(null);
  };

  const renderCurvePanel = (offsetX: number, panelW: number) => {
    const plotLeft = offsetX + PLOT.left;
    const plotW = panelW - PLOT.left - 18;
    const plotTop = PLOT.top;
    const plotBottom = plotTop + PLOT.height;
    const yMax = Math.max(0.8, analysis.scoreCeiling * 1.28);

    const xFor = (tfVal: number) => plotLeft + (tfVal / MAX_PLOT_TF) * plotW;
    const yFor = (scoreVal: number) => plotBottom - (scoreVal / yMax) * PLOT.height;

    const activeCurvePath = analysis.curve
      .map((pt, idx) => `${idx === 0 ? 'M' : 'L'} ${xFor(pt.tf).toFixed(1)},${yFor(pt.activeScore).toFixed(1)}`)
      .join(' ');
    const avgCurvePath = analysis.curve
      .map((pt, idx) => `${idx === 0 ? 'M' : 'L'} ${xFor(pt.tf).toFixed(1)},${yFor(pt.avgLenScore).toFixed(1)}`)
      .join(' ');
    const linearCurvePath = analysis.curve
      .map((pt, idx) => `${idx === 0 ? 'M' : 'L'} ${xFor(pt.tf).toFixed(1)},${yFor(pt.linearScore).toFixed(1)}`)
      .join(' ');

    const ceilingY = yFor(analysis.scoreCeiling);
    const probeX = xFor(activeCheckpoint.tf);
    const probeY = yFor(activeCheckpoint.score);
    const showLengthBaseline = Math.abs(calcDocLen - AVG_DOC_LEN) >= 1 && calcB > 0;
    const userOnChart = calcTf <= MAX_PLOT_TF && calcTf !== activeCheckpoint.tf;

    return (
      <g>
        <defs>
          <clipPath id={clipCurveId}>
            <rect x={plotLeft} y={plotTop} width={plotW} height={PLOT.height} />
          </clipPath>
        </defs>

        <text x={plotLeft} y={22} fontSize={16} fontWeight={700} fill={t.textPrimary}>
          BM25 score as a word repeats (tf)
        </text>
        <rect x={plotLeft} y={plotTop} width={plotW} height={PLOT.height} fill={t.background} stroke={t.border} />

        <g clipPath={`url(#${clipCurveId})`}>
          {/* Asymptote ceiling line */}
          <line
            x1={plotLeft}
            y1={ceilingY}
            x2={plotLeft + plotW}
            y2={ceilingY}
            stroke={ceilingColor}
            strokeWidth={1.6}
            strokeDasharray="5 4"
          />
          <text
            x={plotLeft + plotW - 6}
            y={Math.max(plotTop + 18, ceilingY - 6)}
            textAnchor="end"
            fontSize={14}
            fontWeight={700}
            fill={ceilingColor}
          >
            Ceiling IDF·(k₁+1) = {analysis.scoreCeiling.toFixed(3)}
          </text>

          {/* Uncapped linear TF */}
          <path d={linearCurvePath} fill="none" stroke={linearColor} strokeWidth={2} strokeDasharray="5 4" />

          {/* Average-length baseline when |D| differs from avgdl */}
          {showLengthBaseline && (
            <path d={avgCurvePath} fill="none" stroke={baselineColor} strokeWidth={2} opacity={0.85} />
          )}

          {/* Active BM25 saturation curve */}
          <path d={activeCurvePath} fill="none" stroke={activeColor} strokeWidth={2.8} />

          {/* Vertical guide to animated checkpoint */}
          <line
            x1={probeX}
            y1={probeY}
            x2={probeX}
            y2={plotBottom}
            stroke={ceilingColor}
            strokeWidth={1.4}
            strokeDasharray="3 3"
          />

          {/* Solid checkpoint markers */}
          {analysis.checkpoints.map((cp, idx) => {
            const cx = xFor(cp.tf);
            const cy = yFor(cp.score);
            const isProbe = idx === playback.step;
            return (
              <g
                key={cp.tf}
                onClick={() => {
                  playback.setStep(idx);
                  setCalcTf(cp.tf);
                }}
                style={{ cursor: 'pointer' }}
              >
                {isProbe && (
                  <circle cx={cx} cy={cy} r={8.5} fill="none" stroke={ceilingColor} strokeWidth={2.2} />
                )}
                <circle cx={cx} cy={cy} r={isProbe ? 5.5 : 4.5} fill={isProbe ? ceilingColor : activeColor} />
              </g>
            );
          })}

          {/* User's custom tf pin if not currently highlighted by probe */}
          {userOnChart && (
            <circle
              cx={xFor(calcTf)}
              cy={yFor(analysis.score)}
              r={5.5}
              fill={userColor}
              stroke={t.background}
              strokeWidth={1.5}
            />
          )}
        </g>

        {/* Axes */}
        <line x1={plotLeft} y1={plotBottom} x2={plotLeft + plotW} y2={plotBottom} stroke={t.border} strokeWidth={1.5} />
        <line x1={plotLeft} y1={plotTop} x2={plotLeft} y2={plotBottom} stroke={t.border} strokeWidth={1.5} />

        {[0, 5, 10, 15, 20, 25, 30].map((tick) => (
          <g key={tick}>
            <line x1={xFor(tick)} y1={plotBottom} x2={xFor(tick)} y2={plotBottom + 5} stroke={t.border} />
            <text x={xFor(tick)} y={plotBottom + 20} textAnchor="middle" fontSize={14} fill={t.textSecondary}>
              {tick}
            </text>
          </g>
        ))}

        {[0, yMax * 0.5, yMax].map((tick, idx) => (
          <text
            key={idx}
            x={plotLeft - 7}
            y={yFor(tick) + 4}
            textAnchor="end"
            fontSize={14}
            fill={t.textSecondary}
          >
            {tick.toFixed(1)}
          </text>
        ))}

        <text x={plotLeft + plotW / 2} y={plotBottom + 44} textAnchor="middle" fontSize={14} fontWeight={600} fill={t.textSecondary}>
          Term count tf (word repeats in document) →
        </text>
        <text x={14} y={plotTop + 14} fontSize={14} fontWeight={600} fill={t.textSecondary}>
          Score ↑
        </text>
      </g>
    );
  };

  const renderBarsPanel = (offsetX: number, panelW: number) => {
    const labelX = offsetX + 8;
    const barX = offsetX + 62;
    const barMaxW = Math.max(72, panelW - 186);
    const scaleMax = Math.max(0.8, analysis.scoreCeiling * 1.05);

    return (
      <g>
        <defs>
          <clipPath id={clipBarsId}>
            <rect x={barX} y={36} width={barMaxW} height={268} />
          </clipPath>
        </defs>

        <text x={labelX} y={22} fontSize={16} fontWeight={700} fill={t.textPrimary}>
          Score gain per repeat (click a row)
        </text>
        <text x={labelX} y={44} fontSize={14} fill={t.textSecondary}>
          tf
        </text>
        <text x={barX} y={44} fontSize={14} fill={activeColor} fontWeight={700}>
          BM25 score
        </text>
        <text x={offsetX + panelW - 8} y={44} textAnchor="end" fontSize={14} fill={linearColor} fontWeight={700}>
          vs. uncapped
        </text>

        {analysis.checkpoints.map((cp, idx) => {
          const y = 72 + idx * 50;
          const isProbe = idx === playback.step;
          const bm25W = Math.max(3, Math.min(barMaxW, (cp.score / scaleMax) * barMaxW));
          const deltaLabel =
            cp.marginalGainPerWord === null
              ? '1st mention'
              : `+${cp.marginalGainPerWord.toFixed(3)} per extra hit`;

          return (
            <g
              key={cp.tf}
              onClick={() => {
                playback.setStep(idx);
                setCalcTf(cp.tf);
              }}
              style={{ cursor: 'pointer' }}
            >
              {isProbe && (
                <rect
                  x={labelX - 4}
                  y={y - 18}
                  width={panelW - 8}
                  height={44}
                  rx={6}
                  fill={ceilingColor}
                  fillOpacity={0.14}
                />
              )}
              <text
                x={labelX}
                y={y}
                fontSize={15}
                fontWeight={isProbe ? 700 : 600}
                fill={isProbe ? ceilingColor : t.textPrimary}
              >
                tf={cp.tf}
              </text>
              <g clipPath={`url(#${clipBarsId})`}>
                <rect x={barX} y={y - 12} width={barMaxW} height={14} rx={4} fill={t.surfaceAlt} />
                <rect x={barX} y={y - 12} width={bm25W} height={14} rx={4} fill={activeColor} fillOpacity={0.85} />
              </g>
              <text
                x={barX + bm25W + 6}
                y={y}
                fontSize={14}
                fontWeight={700}
                fill={activeColor}
              >
                {cp.score.toFixed(3)}
              </text>
              <text
                x={offsetX + panelW - 8}
                y={y}
                textAnchor="end"
                fontSize={14}
                fontWeight={600}
                fill={linearColor}
              >
                {cp.unboundedScore.toFixed(1)}
              </text>
              <text x={barX} y={y + 18} fontSize={14} fill={t.textSecondary}>
                {deltaLabel}
              </text>
            </g>
          );
        })}

        <text x={labelX} y={330} fontSize={14} fontWeight={700} fill={userColor}>
          Your settings (tf={calcTf}, |D|={calcDocLen}): score = {analysis.score.toFixed(3)}
        </text>
      </g>
    );
  };

  const workedNumbersText = (
    <>
      <p style={{ fontVariantNumeric: 'tabular-nums' }}>
        IDF = <strong>{analysis.idf.toFixed(3)}</strong> · Length factor B ={' '}
        <strong>{analysis.lengthFactorB.toFixed(3)}</strong> · TF factor ={' '}
        <strong>{analysis.tfFactor.toFixed(3)}</strong> · BM25 term score ={' '}
        <strong>{analysis.score.toFixed(3)}</strong>
      </p>
      <p style={{ fontVariantNumeric: 'tabular-nums', marginTop: 4 }}>
        Ceiling = {analysis.scoreCeiling.toFixed(3)} (for any tf) vs. uncapped TF ={' '}
        {analysis.unboundedScore.toFixed(3)}
      </p>
    </>
  );

  const stepSummary = explainBm25Checkpoint(playback.step, analysis, params);

  return (
    <>
      {!compact && (
        <>
          <VisualizationHeader
            eyebrow="Live playground"
            title="Why repeating a keyword ten times does not give ten times the score"
            description={
              <span style={{ fontSize: 15 }}>
                Plain word counting lets spam pages win by repeating words, and favors long rambling manuals over concise answers. BM25 caps extra repeats using k₁ and adjusts for document length using b.
              </span>
            }
          />

          {/* Preset buttons */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }} role="group" aria-label="Scenario presets">
            <VizButton variant="secondary" onClick={() => resetInputs(3, 100, 1.2, 0.75, 100)}>
              Baseline (tf=3, |D|=100)
            </VizButton>
            <VizButton variant="secondary" onClick={() => { resetInputs(30, 100, 1.2, 0.75, 100); playback.setStep(4); }}>
              Keyword saturation (tf=30)
            </VizButton>
            <VizButton variant="secondary" onClick={() => resetInputs(3, 500, 1.2, 0.75, 100)}>
              Long document (|D|=500)
            </VizButton>
            <VizButton variant="secondary" onClick={() => resetInputs(3, 500, 1.2, 0.0, 100)}>
              Disable length penalty (b=0)
            </VizButton>
          </div>

          {/* Sliders */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
              gap: 12,
              marginBottom: 8,
            }}
          >
            <Slider
              label="Term count tf (word repeats in doc)"
              value={calcTf}
              onChange={setCalcTf}
              min={0}
              max={50}
              step={1}
              format={(v) => `${v} hits`}
            />
            <Slider
              label="Document length |D| (words, avg = 100)"
              value={calcDocLen}
              onChange={setCalcDocLen}
              min={10}
              max={500}
              step={10}
              format={(v) => `${v} words`}
            />
            <Slider
              label="Saturation k₁ (how fast repeats flatten)"
              value={calcK1}
              onChange={setCalcK1}
              min={0}
              max={3}
              step={0.1}
              format={(v) => v.toFixed(1)}
            />
            <Slider
              label="Length penalty b (0 ignores length)"
              value={calcB}
              onChange={setCalcB}
              min={0}
              max={1}
              step={0.05}
              format={(v) => v.toFixed(2)}
            />
          </div>

          {/* Free numeric inputs (including df rarity) */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(135px, 1fr))',
              gap: 10,
              marginBottom: 10,
            }}
          >
            <NumberField
              label="Term count tf"
              hint="0 to 100 repeats"
              value={calcTf}
              min={0}
              max={100}
              step={1}
              onChange={setCalcTf}
            />
            <NumberField
              label="Doc length |D|"
              hint="avgdl = 100 words"
              value={calcDocLen}
              min={1}
              max={2000}
              step={10}
              onChange={setCalcDocLen}
            />
            <NumberField
              label="Saturation k₁"
              hint="0.0 to 5.0"
              value={calcK1}
              min={0}
              max={5}
              step={0.1}
              onChange={setCalcK1}
            />
            <NumberField
              label="Length penalty b"
              hint="0.00 to 1.00"
              value={calcB}
              min={0}
              max={1}
              step={0.05}
              onChange={setCalcB}
            />
            <NumberField
              label="Docs with word df"
              hint="out of N = 1,000"
              value={calcDf}
              min={1}
              max={CORPUS_N}
              step={10}
              onChange={setCalcDf}
            />
          </div>
        </>
      )}

      {/* HTML colour legend */}
      <div
        style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px', fontSize: 15, marginBottom: 4 }}
        aria-label="Chart colour legend"
      >
        <span style={{ color: activeColor }}>● BM25 with your |D| &amp; b</span>
        <span style={{ color: baselineColor }}>● Average length baseline (|D|=100)</span>
        <span style={{ color: linearColor }}>● Uncapped linear TF (no ceiling)</span>
        <span style={{ color: ceilingColor }}>● Ceiling k₁+1 &amp; animated checkpoint</span>
        <span style={{ color: userColor }}>● Your chosen tf ({calcTf})</span>
      </div>

      {/* Main SVG */}
      <div ref={hostRef} style={{ width: '100%' }}>
        {!isCompactPhone ? (
          <svg
            width="100%"
            viewBox="0 0 760 350"
            role="img"
            aria-label={`BM25 saturation curve and marginal score gains for tf=${calcTf}, |D|=${calcDocLen}, k1=${calcK1.toFixed(1)}, b=${calcB.toFixed(2)}: BM25 score is ${analysis.score.toFixed(3)}`}
            style={{ display: 'block', fontFamily: FONT_FAMILY }}
          >
            {renderCurvePanel(0, 412)}
            <line x1={418} y1={14} x2={418} y2={334} stroke={t.border} strokeDasharray="4 4" strokeWidth={1.2} />
            {renderBarsPanel(422, 338)}
          </svg>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            <svg
              width="100%"
              viewBox="0 0 380 335"
              role="img"
              aria-label="BM25 term frequency saturation curve"
              style={{ display: 'block', fontFamily: FONT_FAMILY }}
            >
              {renderCurvePanel(0, 380)}
            </svg>
            <svg
              width="100%"
              viewBox="0 0 380 340"
              role="img"
              aria-label="BM25 marginal gain per repeat"
              style={{ display: 'block', fontFamily: FONT_FAMILY }}
            >
              {renderBarsPanel(0, 380)}
            </svg>
          </div>
        )}
      </div>

      {/* Sticky notes */}
      {compact ? (
        <StickyRow>
          <StickyNote
            title="BM25 single-term score"
            latex={String.raw`\text{Score} = \operatorname{IDF} \cdot \frac{\operatorname{tf}\,(k_1 + 1)}{\operatorname{tf} + k_1 \cdot B}`}
            color="orange"
            tilt={-1}
          >
            {workedNumbersText}
          </StickyNote>
          <StickyNote title={`Step ${playback.step + 1} of ${BM25_PROBE_TFS.length}`} color="blue" tilt={1} live>
            <p>{stepSummary}</p>
          </StickyNote>
        </StickyRow>
      ) : (
        <>
          <StickyRow>
            <StickyNote
              title="1. Rarity weight (IDF)"
              latex={String.raw`\operatorname{IDF}(q) = \ln\!\left(1 + \frac{N - \operatorname{df} + 0.5}{\operatorname{df} + 0.5}\right)`}
              color="yellow"
              tilt={-1}
              active={activeFormula === 'idf'}
              onSelect={() => setActiveFormula('idf')}
            >
              <p>Rarer words (smaller df out of N = 1,000 docs) get higher weight, always ≥ 0.</p>
            </StickyNote>
            <StickyNote
              title="2. Length factor (B)"
              latex={String.raw`B = 1 - b + b \cdot \frac{|D|}{\operatorname{avgdl}}`}
              color="pink"
              tilt={1}
              active={activeFormula === 'length'}
              onSelect={() => setActiveFormula('length')}
            >
              <p>Short docs have B &lt; 1 (boosted); long docs have B &gt; 1 (penalized). At b = 0, B = 1.</p>
            </StickyNote>
            <StickyNote
              title="3. Saturated count & score"
              latex={String.raw`\text{Score} = \operatorname{IDF} \cdot \frac{\operatorname{tf}\,(k_1 + 1)}{\operatorname{tf} + k_1 \cdot B}`}
              color="orange"
              tilt={-1}
              active={activeFormula === 'score'}
              onSelect={() => setActiveFormula('score')}
            >
              <p>Dividing by tf + k₁·B caps the TF factor at k₁ + 1, stopping spam repeats.</p>
            </StickyNote>
          </StickyRow>

          <StickyRow>
            <StickyNote title="Worked numbers (your settings)" color="green" tilt={-1}>
              {workedNumbersText}
            </StickyNote>
            <StickyNote
              title={`What just happened · step ${playback.step + 1} of ${BM25_PROBE_TFS.length}`}
              color="blue"
              tilt={1}
              live
            >
              <p>{stepSummary}</p>
            </StickyNote>
          </StickyRow>

          {/* Playback transport */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
            <VizButton onClick={playback.toggle}>{playback.playing ? 'Pause' : 'Play'}</VizButton>
            <VizButton variant="secondary" onClick={playback.next}>
              Step →
            </VizButton>
            <VizButton variant="secondary" onClick={playback.reset}>
              Reset
            </VizButton>
          </div>

          {/* Predict-then-run challenge */}
          <div
            style={{
              marginTop: 10,
              paddingTop: 8,
              borderTop: `1px dashed ${t.border}`,
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: '6px 10px',
              fontSize: 15,
            }}
          >
            <strong style={{ color: t.accentWarn }}>Predict first:</strong>
            <span>
              With k₁ = 1.2 and |D| = 100, if a page repeats a word 10× more (tf = 3 → 30), what happens to its BM25 score?
            </span>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {PREDICT_OPTIONS.map((opt, idx) => {
                const picked = prediction === idx;
                const correct = idx === 0;
                const revealed = prediction !== null;
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setPrediction(idx)}
                    style={{
                      padding: '5px 10px',
                      borderRadius: RADIUS.sm,
                      border: `1px solid ${
                        revealed && correct ? activeColor : revealed && picked ? linearColor : t.border
                      }`,
                      background:
                        revealed && correct ? activeColor : revealed && picked ? linearColor : 'transparent',
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
              <span role="status" style={{ color: prediction === 0 ? activeColor : ceilingColor, fontSize: 15 }}>
                {prediction === 0 ? 'Right — ' : 'Watch — '}
                even a 10× jump in repeats (tf = 3 → 30) only raises the score from 3.612 to 4.862 (under the 5.057 ceiling).{' '}
                <button
                  type="button"
                  onClick={() => {
                    resetInputs(30, 100, 1.2, 0.75, 100);
                    playback.setStep(4);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    color: baselineColor,
                    textDecoration: 'underline',
                    fontFamily: FONT_FAMILY,
                    fontSize: 15,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Run tf = 30 now
                </button>
              </span>
            )}
          </div>
        </>
      )}
    </>
  );
}

export function Bm25SaturationExplorer({ compact = false }: { compact?: boolean } = {}) {
  const outerVisible = useVizVisible();
  return (
    <VisualizationContainer
      title="Interactive BM25 Saturation & Calculator"
      footer={
        compact
          ? undefined
          : `Corpus size N = ${CORPUS_N.toLocaleString('en-US')} documents, average length avgdl = ${AVG_DOC_LEN} words, Robertson/Lucene smoothed IDF. Every curve point and score bar is recomputed live from your inputs.`
      }
    >
      <Bm25SaturationPlayground compact={compact} outerVisible={outerVisible} />
    </VisualizationContainer>
  );
}

export default Bm25SaturationExplorer;
