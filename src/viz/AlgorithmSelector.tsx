import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useVizTokens } from '../theme/vizTokens';
import { PillSelect, StickyNote, StickyRow, VisualizationContainer, VisualizationHeader, VizButton } from './primitives';
import {
  SCORE_FACTORS,
  scoreAlgorithms,
  scoreThroughFactor,
  type AlgorithmInputs,
  type ComputeBudget,
  type ExplanationNeed,
  type PatternKind,
  type ProblemKind,
} from './lib/algorithmSelection';
import { usePlaygroundPlayback } from './diagrams/usePlaygroundPlayback';

const HAND_FONT = "'Kalam', 'Comic Sans MS', cursive";
const DEFAULT_INPUTS: AlgorithmInputs = {
  problem: 'regression',
  rows: 1_000,
  features: 20,
  pattern: 'simple',
  explanationNeed: 'high',
  computeBudget: 'tight',
};

function NumberControl({ label, value, min, max, onChange }: {
  label: string; value: number; min: number; max: number; onChange: (value: number) => void;
}) {
  const t = useVizTokens();
  return <label style={{ display: 'block', minWidth: 140, fontSize: 15 }}>{label}
    <input aria-label={label} type="number" min={min} max={max} step={1} value={value}
      onChange={(event) => {
        const next = Number(event.target.value);
        if (Number.isFinite(next)) onChange(Math.max(min, Math.min(max, Math.round(next))));
      }}
      style={{ display: 'block', width: '100%', boxSizing: 'border-box', minHeight: 34, marginTop: 3, padding: '3px 7px', border: `1.5px solid ${t.border}`, borderRadius: 6, background: t.background, color: t.textPrimary, font: 'inherit', fontVariantNumeric: 'tabular-nums' }} />
  </label>;
}

export default function AlgorithmSelector({ compact = false }: { compact?: boolean }) {
  const t = useVizTokens();
  const [inputs, setInputs] = useState(DEFAULT_INPUTS);
  const [prediction, setPrediction] = useState('linear');
  const [predictionResult, setPredictionResult] = useState<boolean | null>(null);
  const scores = useMemo(() => scoreAlgorithms(inputs), [inputs]);
  const playback = usePlaygroundPlayback(SCORE_FACTORS.length, 1450);
  const partial = scores.map((score, index) => ({ score, colorIndex: index, value: scoreThroughFactor(score, playback.step) }));
  const currentLeader = [...partial].sort((a, b) => b.value - a.value)[0];
  const top = scores[0];
  const predictionValue = scores.some((score) => score.id === prediction) ? prediction : top.id;
  const colors = [t.accentPrimary, t.accentSecondary, t.accentWarn, t.accentPurple];
  const maxScore = Math.max(20, ...scores.map((score) => score.total));
  const width = 760;
  const chartHeight = 70 + scores.length * 48;
  const currentFactor = SCORE_FACTORS[playback.step];
  const topFactor = top.contributions[playback.step];

  const update = <K extends keyof AlgorithmInputs>(key: K, value: AlgorithmInputs[K]) => {
    setInputs((previous) => ({ ...previous, [key]: value }));
    setPredictionResult(null);
    playback.setStep(0);
  };

  const patternLabel = inputs.problem === 'clustering'
    ? 'Cluster shape'
    : inputs.problem === 'projection'
      ? 'Structure to preserve'
      : 'Relationship in the data';

  return <VisualizationContainer title="Algorithm selector playground"
    footer="This is a transparent teaching heuristic, not a measured leaderboard. Every candidate starts at 40 and gains or loses the exact points shown for dataset size, pattern shape, explainability, compute budget, and feature pressure.">
    {!compact && <>
      <VisualizationHeader eyebrow="Live playground" title="Choose a sensible first algorithm"
        description="This solves the beginner problem of facing many model names without knowing which constraints make one a better starting point than another." />
      <p style={{ margin: '0 0 8px', fontSize: 15, color: t.textSecondary }}>Change the problem and constraints. The bars add one visible scoring factor at a time; a higher score means a better first experiment under this teaching rule.</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'end', gap: 12 }}>
        <PillSelect<ProblemKind> label="Problem to solve" value={inputs.problem}
          onChange={(value) => update('problem', typeof value === 'function' ? value(inputs.problem) : value)}
          options={[
            { value: 'regression', label: 'Predict a number' },
            { value: 'classification', label: 'Predict a category' },
            { value: 'clustering', label: 'Find groups' },
            { value: 'projection', label: 'Compress / visualize' },
          ]} />
        <NumberControl label="Rows in the dataset" value={inputs.rows} min={20} max={10_000_000} onChange={(value) => update('rows', value)} />
        <NumberControl label="Input features per row" value={inputs.features} min={1} max={100_000} onChange={(value) => update('features', value)} />
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'end', gap: 12, marginTop: 8 }}>
        <PillSelect<PatternKind> label={patternLabel} value={inputs.pattern}
          onChange={(value) => update('pattern', typeof value === 'function' ? value(inputs.pattern) : value)}
          options={[
            { value: 'simple', label: inputs.problem === 'clustering' ? 'Round groups' : 'Roughly linear' },
            { value: 'complex', label: inputs.problem === 'clustering' ? 'Irregular groups' : 'Nonlinear' },
          ]} />
        <PillSelect<ExplanationNeed> label="Need a person-readable model?" value={inputs.explanationNeed}
          onChange={(value) => update('explanationNeed', typeof value === 'function' ? value(inputs.explanationNeed) : value)}
          options={[{ value: 'high', label: 'Yes' }, { value: 'low', label: 'No' }]} />
        <PillSelect<ComputeBudget> label="Training compute available" value={inputs.computeBudget}
          onChange={(value) => update('computeBudget', typeof value === 'function' ? value(inputs.computeBudget) : value)}
          options={[{ value: 'tight', label: 'Tight' }, { value: 'balanced', label: 'Balanced' }, { value: 'generous', label: 'Generous' }]} />
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, margin: '8px 0', fontSize: 15 }}>
        <strong style={{ color: t.accentWarn }}>Predict first:</strong><span>Which algorithm will finish with the highest score?</span>
        <select aria-label="Predicted top algorithm" value={predictionValue}
          onChange={(event) => { setPrediction(event.target.value); setPredictionResult(null); }}
          style={{ minHeight: 34, border: `1.5px solid ${t.border}`, borderRadius: 6, background: t.background, color: t.textPrimary, font: 'inherit' }}>
          {scores.map((score) => <option key={score.id} value={score.id}>{score.label}</option>)}
        </select>
        <VizButton onClick={() => setPredictionResult(predictionValue === top.id)}>Run prediction</VizButton>
        {predictionResult !== null && <span role="status" style={{ color: predictionResult ? t.accentPrimary : t.accentDanger, fontWeight: 700 }}>
          {predictionResult ? 'Correct.' : `The calculated leader is ${top.label} with ${top.total} points.`}
        </span>}
      </div>
    </>}

    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px 16px', fontSize: 15 }} aria-label="Algorithm colour legend">
      {scores.map((score, index) => <span key={score.id}><span style={{ display: 'inline-block', width: 20, height: 5, marginRight: 5, verticalAlign: 'middle', background: colors[index] }} />{score.label}</span>)}
    </div>

    <svg width="100%" viewBox={`0 0 ${width} ${chartHeight}`} role="img"
      aria-label={`After ${currentFactor}, ${currentLeader.score.label} leads with ${currentLeader.value} points`}
      style={{ display: 'block', fontFamily: HAND_FONT }}>
      <defs><clipPath id="algorithm-score-plot"><rect x={205} y={34} width={470} height={chartHeight - 55} /></clipPath></defs>
      <text x={14} y={22} fontSize={16} fontWeight={700} fill={t.textPrimary}>Candidate algorithm</text>
      <text x={205} y={22} fontSize={16} fontWeight={700} fill={t.textPrimary}>Score after “{currentFactor}” →</text>
      <g clipPath="url(#algorithm-score-plot)">
        {partial.map(({ score, value, colorIndex }, index) => {
          const y = 48 + index * 48;
          return <g key={score.id}>
            <rect x={205} y={y} width={Math.max(3, (Math.max(0, value) / maxScore) * 450)} height={25} rx={5} fill={colors[colorIndex]} fillOpacity={0.82} />
          </g>;
        })}
      </g>
      {partial.map(({ score, value, colorIndex }, index) => {
        const y = 48 + index * 48;
        const contribution = score.contributions[playback.step].points;
        return <g key={`label-${score.id}`}>
          <text x={14} y={y + 18} fontSize={15} fontWeight={currentLeader.score.id === score.id ? 700 : 400} fill={currentLeader.score.id === score.id ? colors[colorIndex] : t.textPrimary}>{score.label}</text>
          <text x={690} y={y + 18} fontSize={15} fontWeight={700} fill={colors[colorIndex]}>{value} <tspan fill={t.textSecondary}>({contribution >= 0 ? '+' : ''}{contribution})</tspan></text>
        </g>;
      })}
      <line x1={205} y1={chartHeight - 18} x2={655} y2={chartHeight - 18} stroke={t.border} strokeWidth={1.5} />
      <text x={205} y={chartHeight - 1} fontSize={14} fill={t.textSecondary}>0</text>
      <text x={655} y={chartHeight - 1} textAnchor="end" fontSize={14} fill={t.textSecondary}>{maxScore} points</text>
    </svg>

    {compact ? <StickyRow>
      <StickyNote title="Selector score" latex={String.raw`S_a=\sum_i w_{a,i}`} color="yellow" tilt={-1}><p>S_a is algorithm a’s total; each w is one visible constraint score.</p></StickyNote>
      <StickyNote title={`Step ${playback.step + 1} of ${SCORE_FACTORS.length}`} color="blue" tilt={1} live><p>{currentFactor}: {currentLeader.score.label} currently leads with {currentLeader.value}.</p></StickyNote>
    </StickyRow> : <>
      <StickyRow>
        <StickyNote title="Selector score" latex={String.raw`S_a=\sum_i w_{a,i}`} color="yellow" tilt={-1}>
          <p>S_a = score for algorithm a. Each w_a,i is the points algorithm a gets for factor i.</p>
        </StickyNote>
        <StickyNote title={`Worked total · ${top.label}`} color="green" tilt={1}>
          <p>{top.contributions.map((row) => row.points).join(' + ').replaceAll('+ -', '− ')} = <strong>{top.total} points</strong>.</p>
        </StickyNote>
        <StickyNote title={`What just happened · step ${playback.step + 1}`} color="blue" tilt={-1} live>
          <p>{topFactor.explanation} {top.label} gets {topFactor.points >= 0 ? '+' : ''}{topFactor.points} at this step.</p>
        </StickyNote>
      </StickyRow>
      <p style={{ margin: '4px 0', fontSize: 15 }}><strong>Calculated first choice: {top.label}.</strong> The score is a starting point; validate it on held-out data before choosing a final model.</p>
      <Link to={top.href} style={{ color: t.accentSecondary, fontSize: 15, fontWeight: 700 }}>Read the {top.label} chapter →</Link>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
        <VizButton onClick={playback.toggle}>{playback.playing ? 'Pause' : 'Play'}</VizButton>
        <VizButton variant="secondary" onClick={playback.next}>Step →</VizButton>
        <VizButton variant="secondary" onClick={playback.reset}>Reset</VizButton>
      </div>
    </>}
  </VisualizationContainer>;
}
