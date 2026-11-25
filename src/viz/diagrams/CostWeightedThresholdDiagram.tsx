import { useMemo, useState } from 'react';
import { FONT_FAMILY, RADIUS, useVizTokens } from '../../theme/vizTokens';
import { StickyNote, StickyRow, VisualizationContainer, VizButton } from '../primitives';
import {
  DEFAULT_NEGATIVE_SCORES,
  DEFAULT_POSITIVE_SCORES,
  buildThresholdCurve,
  evaluateThreshold,
  explainThresholdStep,
  parseScoreList,
} from '../lib/costWeightedThreshold';
import { PredictChallenge } from './playgroundPrimitives';
import { useStepPlayback } from './useStepPlayback';

const PREDICT_OPTIONS = [
  'Lower, so the system catches more real positives',
  'Higher, so fewer cases are reviewed',
  'It must stay at 0.50',
] as const;

function ThresholdPlayground({ compact }: { compact: boolean }) {
  const t = useVizTokens();
  const [positiveInput, setPositiveInput] = useState(DEFAULT_POSITIVE_SCORES.join(', '));
  const [negativeInput, setNegativeInput] = useState(DEFAULT_NEGATIVE_SCORES.join(', '));
  const [missedCaseCost, setMissedCaseCost] = useState(1);
  const [falseAlarmCost, setFalseAlarmCost] = useState(1);
  const [prediction, setPrediction] = useState<number | null>(null);
  const positiveScores = useMemo(() => parseScoreList(positiveInput, DEFAULT_POSITIVE_SCORES), [positiveInput]);
  const negativeScores = useMemo(() => parseScoreList(negativeInput, DEFAULT_NEGATIVE_SCORES), [negativeInput]);
  const curve = useMemo(() => buildThresholdCurve(positiveScores, negativeScores, missedCaseCost, falseAlarmCost), [positiveScores, negativeScores, missedCaseCost, falseAlarmCost]);
  const playback = useStepPlayback(curve.points.length, 1050, Math.max(0, curve.points.findIndex((point) => point.threshold === curve.best.threshold)));
  const current = curve.points[Math.min(playback.step, curve.points.length - 1)]
    ?? evaluateThreshold(positiveScores, negativeScores, 0.5, missedCaseCost, falseAlarmCost);
  const caption = explainThresholdStep(current, positiveScores.length, negativeScores.length);

  const positiveColor = t.accentPrimary;
  const negativeColor = t.accentPurple;
  const missColor = t.accentDanger;
  const totalColor = t.accentSecondary;
  const thresholdColor = t.accentWarn;
  const plot = { left: 70, right: 736, top: 214, bottom: 414 };
  const plotWidth = plot.right - plot.left;
  const plotHeight = plot.bottom - plot.top;
  const maxCost = Math.max(1, ...curve.points.map((point) => point.totalCost));
  const x = (threshold: number) => plot.left + (Math.min(1.01, Math.max(0, threshold)) / 1.01) * plotWidth;
  const y = (cost: number) => plot.bottom - (cost / maxCost) * plotHeight;
  const stepPath = (pick: (point: (typeof curve.points)[number]) => number) => curve.points.map((point, index) => {
    const px = x(point.threshold);
    const py = y(pick(point));
    if (index === 0) return `M ${px} ${py}`;
    return `H ${px} V ${py}`;
  }).join(' ');
  const costTicks = Array.from(new Set([0, Math.ceil(maxCost / 2), maxCost]));
  const inputStyle = { width: '100%', boxSizing: 'border-box' as const, minHeight: 38, padding: '6px 8px', border: `1.5px solid ${t.border}`, borderRadius: RADIUS.sm, background: t.background, color: t.textPrimary, fontFamily: FONT_FAMILY, fontSize: 15, fontVariantNumeric: 'tabular-nums' as const };

  const setInputs = (setter: (value: number) => void, value: number) => {
    setter(Math.max(0, Math.min(50, Number.isFinite(value) ? value : 0)));
    setPrediction(null);
    playback.setStep(0);
  };
  const chooseThreshold = (value: number) => {
    const index = curve.points.reduce((bestIndex, point, pointIndex) => (
      Math.abs(point.threshold - value) < Math.abs(curve.points[bestIndex].threshold - value) ? pointIndex : bestIndex
    ), 0);
    playback.setStep(index);
  };

  return (
    <>
      {!compact && (
        <>
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 18, fontWeight: 700 }}>Cost-weighted threshold playground</div>
            <p style={{ margin: '2px 0 0', fontSize: 15, lineHeight: 1.5, color: t.textSecondary }}>
              A classification threshold turns scores into actions, and this playground finds the cutoff with the lowest cost when misses and false alarms hurt differently.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 10 }}>
            <label style={{ minWidth: 0, fontSize: 15 }}>
              <span style={{ display: 'block', marginBottom: 4, fontWeight: 700 }}>Scores for real positive cases</span>
              <input aria-label="Scores for real positive cases" value={positiveInput} onChange={(event) => { setPositiveInput(event.target.value); playback.setStep(0); }} style={inputStyle} />
            </label>
            <label style={{ minWidth: 0, fontSize: 15 }}>
              <span style={{ display: 'block', marginBottom: 4, fontWeight: 700 }}>Scores for real negative cases</span>
              <input aria-label="Scores for real negative cases" value={negativeInput} onChange={(event) => { setNegativeInput(event.target.value); playback.setStep(0); }} style={inputStyle} />
            </label>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(155px, 1fr))', gap: 10, marginTop: 9 }}>
            <label style={{ minWidth: 0, fontSize: 15 }}>
              <span style={{ display: 'block', marginBottom: 4, fontWeight: 700 }}>Cost of one missed positive</span>
              <input aria-label="Cost of one missed positive" type="number" min={0} max={50} step={1} value={missedCaseCost} onChange={(event) => setInputs(setMissedCaseCost, Number(event.target.value))} style={inputStyle} />
            </label>
            <label style={{ minWidth: 0, fontSize: 15 }}>
              <span style={{ display: 'block', marginBottom: 4, fontWeight: 700 }}>Cost of one false alarm</span>
              <input aria-label="Cost of one false alarm" type="number" min={0} max={50} step={1} value={falseAlarmCost} onChange={(event) => setInputs(setFalseAlarmCost, Number(event.target.value))} style={inputStyle} />
            </label>
            <label style={{ minWidth: 0, fontSize: 15 }}>
              <span style={{ display: 'block', marginBottom: 4, fontWeight: 700 }}>Threshold t (nearest decision change)</span>
              <input aria-label="Classification threshold" type="number" min={0} max={1.01} step={0.01} value={current.threshold} onChange={(event) => chooseThreshold(Number(event.target.value))} style={inputStyle} />
            </label>
          </div>
        </>
      )}

      <svg width="100%" viewBox="0 0 760 474" role="img" aria-label={`At threshold ${current.threshold.toFixed(2)}, total cost is ${current.totalCost}; the minimum cost ${curve.best.totalCost} occurs at threshold ${curve.best.threshold.toFixed(2)}`} style={{ display: 'block', fontFamily: FONT_FAMILY }}>
        <defs><clipPath id="threshold-cost-clip"><rect x={plot.left} y={plot.top} width={plotWidth} height={plotHeight} /></clipPath></defs>
        <text x="14" y="25" fontSize="15" fontWeight="700" fill={t.textPrimary}>1. Scores become actions: every point to the right of threshold t is predicted positive</text>
        <line x1={plot.left} y1="88" x2={plot.right} y2="88" stroke={t.border} strokeWidth={1.5} />
        {[0, 0.25, 0.5, 0.75, 1].map((tickValue) => <g key={`score-${tickValue}`}><line x1={x(tickValue)} y1="84" x2={x(tickValue)} y2="94" stroke={t.border} /><text x={x(tickValue)} y="112" textAnchor="middle" fontSize="14" fill={t.textMuted}>{tickValue.toFixed(2)}</text></g>)}
        {positiveScores.map((score, index) => <circle key={`positive-${index}`} cx={x(score)} cy={index % 2 ? 64 : 50} r="6" fill={positiveColor} />)}
        {negativeScores.map((score, index) => <circle key={`negative-${index}`} cx={x(score)} cy={index % 2 ? 133 : 147} r="6" fill={negativeColor} />)}
        <text x="14" y="57" fontSize="14" fill={positiveColor}>real positive</text>
        <text x="14" y="145" fontSize="14" fill={negativeColor}>real negative</text>
        <line x1={x(current.threshold)} y1="36" x2={x(current.threshold)} y2="156" stroke={thresholdColor} strokeWidth={2.4} />
        <text x={Math.min(plot.right - 4, x(current.threshold) + 7)} y="44" textAnchor={x(current.threshold) > plot.right - 90 ? 'end' : 'start'} fontSize="14" fontWeight="700" fill={thresholdColor}>t = {current.threshold.toFixed(2)}</text>

        <text x="14" y="196" fontSize="15" fontWeight="700" fill={t.textPrimary}>2. Cost at every cutoff</text>
        <rect x={plot.left} y={plot.top} width={plotWidth} height={plotHeight} fill={t.background} rx={4} />
        <line x1={plot.left} y1={plot.top} x2={plot.left} y2={plot.bottom} stroke={t.border} strokeWidth={1.5} />
        <line x1={plot.left} y1={plot.bottom} x2={plot.right} y2={plot.bottom} stroke={t.border} strokeWidth={1.5} />
        {costTicks.map((tickValue) => <g key={`cost-${tickValue}`}><line x1={plot.left - 5} y1={y(tickValue)} x2={plot.left} y2={y(tickValue)} stroke={t.border} /><text x={plot.left - 10} y={y(tickValue) + 5} textAnchor="end" fontSize="14" fill={t.textMuted}>{tickValue}</text></g>)}
        {[0, 0.25, 0.5, 0.75, 1].map((tickValue) => <text key={`threshold-${tickValue}`} x={x(tickValue)} y={plot.bottom + 22} textAnchor="middle" fontSize="14" fill={t.textMuted}>{tickValue.toFixed(2)}</text>)}
        <text x={(plot.left + plot.right) / 2} y="464" textAnchor="middle" fontSize="14" fill={t.textSecondary}>classification threshold t →</text>
        <text x="18" y={plot.top + 8} fontSize="14" fill={t.textSecondary}>cost</text>
        <g clipPath="url(#threshold-cost-clip)">
          <path d={stepPath((point) => point.missedCaseCost)} fill="none" stroke={missColor} strokeWidth={2} strokeDasharray="7 4" />
          <path d={stepPath((point) => point.falseAlarmCost)} fill="none" stroke={negativeColor} strokeWidth={2} strokeDasharray="3 4" />
          <path d={stepPath((point) => point.totalCost)} fill="none" stroke={totalColor} strokeWidth={3} />
          <line x1={x(current.threshold)} y1={plot.top} x2={x(current.threshold)} y2={plot.bottom} stroke={thresholdColor} strokeWidth={2} />
        </g>
        <circle cx={x(current.threshold)} cy={y(current.totalCost)} r="5" fill={totalColor} />
        <circle cx={x(curve.best.threshold)} cy={y(curve.best.totalCost)} r="7" fill={t.background} stroke={positiveColor} strokeWidth={3} />
      </svg>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px 18px', fontSize: 15 }} aria-label="Chart colours">
        <span style={{ color: positiveColor }}>● real positive / best cutoff</span>
        <span style={{ color: negativeColor }}>● real negative / false-alarm cost</span>
        <span style={{ color: missColor }}>– – missed-positive cost</span>
        <span style={{ color: totalColor }}>━━ total cost</span>
        <span style={{ color: thresholdColor }}>│ current threshold</span>
      </div>

      {compact ? (
        <StickyRow>
          <StickyNote title="Weighted decision cost" latex={String.raw`C(t)=c_{\mathrm{FN}}\,\mathrm{FN}(t)+c_{\mathrm{FP}}\,\mathrm{FP}(t)`} color="yellow" tilt={-1}><p>At t = {current.threshold.toFixed(2)}, C = {current.totalCost.toFixed(0)}; best t = {curve.best.threshold.toFixed(2)}.</p></StickyNote>
          <StickyNote title={`What just happened · cutoff ${playback.step + 1}/${curve.points.length}`} color="blue" tilt={1} live><p>{caption}</p></StickyNote>
        </StickyRow>
      ) : (
        <>
          <StickyRow>
            <StickyNote title="Turn a score into an action" latex={String.raw`\hat y=\mathbf{1}[s\ge t]`} color="pink" tilt={-1}><p>s is a model score; t is the cutoff; scores at or above t trigger the positive action.</p></StickyNote>
            <StickyNote title="Weighted decision cost" latex={String.raw`C(t)=c_{\mathrm{FN}}\,\mathrm{FN}(t)+c_{\mathrm{FP}}\,\mathrm{FP}(t)`} color="yellow" tilt={1}><p>FN means a missed real positive. FP means a false alarm on a real negative.</p></StickyNote>
            <StickyNote title="Best threshold" latex={String.raw`t^*=\operatorname*{arg\,min}_{t}\;C(t)`} color="green" tilt={-1}><p>The exact best cutoff is {curve.best.threshold.toFixed(2)} with cost {curve.best.totalCost.toFixed(0)}.</p></StickyNote>
          </StickyRow>
          <StickyRow>
            <StickyNote title="Worked numbers" color="orange" tilt={1}>
              <p>FN = {current.falseNegatives}, FP = {current.falsePositives}.</p>
              <p style={{ fontVariantNumeric: 'tabular-nums' }}><strong>{current.falseNegatives} × {missedCaseCost} + {current.falsePositives} × {falseAlarmCost} = {current.totalCost}</strong>.</p>
            </StickyNote>
            <StickyNote title={`What just happened · cutoff ${playback.step + 1}/${curve.points.length}`} color="blue" tilt={-1} live><p>{caption}</p></StickyNote>
          </StickyRow>

          <PredictChallenge
            prompt="A missed positive changes from cost 1 to cost 5 while false alarms stay at cost 1. Where should the best threshold move?"
            options={PREDICT_OPTIONS}
            correctIndex={0}
            selected={prediction}
            onSelect={setPrediction}
            explanation="A lower cutoff catches the 0.40 positive case; accepting two false alarms now costs less than missing that one positive."
            actionLabel="Run cost 5 versus 1"
            onAction={() => { setMissedCaseCost(5); setFalseAlarmCost(1); playback.playFromStart(); }}
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
            <VizButton onClick={playback.toggle}>{playback.playing ? 'Pause' : 'Play'}</VizButton>
            <VizButton variant="secondary" onClick={playback.next}>Step →</VizButton>
            <VizButton variant="secondary" onClick={playback.reset}>Reset</VizButton>
            <span style={{ marginLeft: 'auto', fontSize: 15, color: t.textSecondary }}>The trace visits only cutoffs where one of your cases changes side.</span>
          </div>
        </>
      )}
    </>
  );
}

export default function CostWeightedThresholdDiagram({ compact = false }: { compact?: boolean } = {}) {
  return (
    <VisualizationContainer title="Cost-weighted threshold playground" footer="This is an exact threshold sweep over the scores you type. Costs are user-chosen decision weights, not clinical outcomes or model probabilities; a real deployment must estimate them with domain experts.">
      <ThresholdPlayground compact={compact} />
    </VisualizationContainer>
  );
}
