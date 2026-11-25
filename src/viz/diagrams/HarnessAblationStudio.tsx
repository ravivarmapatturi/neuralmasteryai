import { useMemo, useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { StickyNote, StickyRow, VisualizationContainer, VisualizationHeader, VizButton } from '../primitives';
import { calculateAblations, compareHarnesses, type HarnessInputs, type HarnessPart } from '../lib/harnessAblation';
import { usePlaygroundPlayback } from './usePlaygroundPlayback';

const HAND_FONT = "'Kalam', 'Comic Sans MS', cursive";
const DEFAULT_INPUTS: HarnessInputs = {
  requiredSteps: 6,
  baseStepAccuracy: 0.75,
  verifierCoverage: 0.85,
  maxAttempts: 3,
  regressionRisk: 0.12,
  trackingBoost: 0.08,
};

function NumberControl({ label, value, min, max, step = 1, onChange }: {
  label: string; value: number; min: number; max: number; step?: number; onChange: (value: number) => void;
}) {
  const t = useVizTokens();
  return <label style={{ display: 'block', minWidth: 145, fontSize: 15 }}>{label}
    <input aria-label={label} type="number" min={min} max={max} step={step} value={value}
      onChange={(event) => {
        const next = Number(event.target.value);
        if (Number.isFinite(next)) onChange(Math.max(min, Math.min(max, next)));
      }}
      style={{ display: 'block', width: '100%', boxSizing: 'border-box', minHeight: 34, marginTop: 3, padding: '3px 7px', border: `1.5px solid ${t.border}`, borderRadius: 6, background: t.background, color: t.textPrimary, font: 'inherit', fontVariantNumeric: 'tabular-nums' }} />
  </label>;
}

export default function HarnessAblationStudio({ compact = false }: { compact?: boolean }) {
  const t = useVizTokens();
  const [inputs, setInputs] = useState(DEFAULT_INPUTS);
  const [prediction, setPrediction] = useState<HarnessPart>('verifier');
  const [predictionResult, setPredictionResult] = useState<boolean | null>(null);
  const variants = useMemo(() => compareHarnesses(inputs), [inputs]);
  const ablations = useMemo(() => calculateAblations(inputs), [inputs]);
  const playback = usePlaygroundPlayback(variants.length, 1650);
  const current = variants[playback.step];
  const readyColor = t.accentPrimary;
  const falseColor = t.accentDanger;
  const top = 38;
  const base = 272;
  const chartHeight = base - top;
  const groupWidth = 150;
  const groupStart = 105;

  const update = <K extends keyof HarnessInputs>(key: K, value: HarnessInputs[K]) => {
    setInputs((previous) => ({ ...previous, [key]: value }));
    setPredictionResult(null);
    playback.setStep(0);
  };
  const percentageInput = (key: 'baseStepAccuracy' | 'verifierCoverage' | 'regressionRisk' | 'trackingBoost', percent: number) => update(key, percent / 100);
  const biggestAblation = ablations[0];
  const currentStepAccuracy = current.id === 'full'
    ? inputs.baseStepAccuracy + (1 - inputs.baseStepAccuracy) * inputs.trackingBoost
    : inputs.baseStepAccuracy;
  const currentCoverage = current.id === 'prompt' ? 0 : inputs.verifierCoverage;
  const retryChance = (1 - currentStepAccuracy) * currentCoverage;

  return <VisualizationContainer title="Harness ablation studio playground"
    footer="This is an illustrative probability model, not measured model performance. It assumes independent step attempts, a verifier that catches a chosen share of wrong steps, and a sandbox that reduces regression risk to one fifth of the entered value.">
    {!compact && <>
      <VisualizationHeader eyebrow="Live playground" title="See which harness part prevents a false success"
        description="An ablation removes one safety or feedback part at a time; this tool solves the beginner problem of seeing why verification, repair, state tracking, and a sandbox change the chance of a task being ready to ship." />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))', gap: 10 }}>
        <NumberControl label="Required correct steps" value={inputs.requiredSteps} min={1} max={30} onChange={(value) => update('requiredSteps', Math.round(value))} />
        <NumberControl label="Base accuracy per step (%)" value={inputs.baseStepAccuracy * 100} min={5} max={99} onChange={(value) => percentageInput('baseStepAccuracy', value)} />
        <NumberControl label="Wrong steps the verifier catches (%)" value={inputs.verifierCoverage * 100} min={0} max={100} onChange={(value) => percentageInput('verifierCoverage', value)} />
        <NumberControl label="Maximum attempts per step" value={inputs.maxAttempts} min={1} max={6} onChange={(value) => update('maxAttempts', Math.round(value))} />
        <NumberControl label="Regression risk after the task (%)" value={inputs.regressionRisk * 100} min={0} max={50} onChange={(value) => percentageInput('regressionRisk', value)} />
        <NumberControl label="State-tracking accuracy boost (%)" value={inputs.trackingBoost * 100} min={0} max={30} onChange={(value) => percentageInput('trackingBoost', value)} />
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, margin: '8px 0', fontSize: 15 }}>
        <strong style={{ color: t.accentWarn }}>Predict first:</strong><span>Removing which part causes the biggest calculated drop in “ready to ship”?</span>
        <select aria-label="Predicted most important harness part" value={prediction}
          onChange={(event) => { setPrediction(event.target.value as HarnessPart); setPredictionResult(null); }}
          style={{ minHeight: 34, border: `1.5px solid ${t.border}`, borderRadius: 6, background: t.background, color: t.textPrimary, font: 'inherit' }}>
          {ablations.map((row) => <option key={row.part} value={row.part}>{row.label}</option>)}
        </select>
        <VizButton onClick={() => setPredictionResult(prediction === biggestAblation.part)}>Run ablation</VizButton>
        {predictionResult !== null && <span role="status" style={{ color: predictionResult ? t.accentPrimary : t.accentDanger, fontWeight: 700 }}>
          {predictionResult ? 'Correct.' : `The largest drop is ${biggestAblation.label}: ${(biggestAblation.shipReadyDrop * 100).toFixed(1)} percentage points.`}
        </span>}
      </div>
    </>}

    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px 18px', fontSize: 15 }} aria-label="Outcome colour legend">
      <span><span style={{ display: 'inline-block', width: 20, height: 5, marginRight: 5, verticalAlign: 'middle', background: readyColor }} />Ready to ship (all steps correct, no regression)</span>
      <span><span style={{ display: 'inline-block', width: 20, height: 5, marginRight: 5, verticalAlign: 'middle', background: falseColor }} />False victory (an error slips past)</span>
    </div>

    <svg width="100%" viewBox="0 0 760 356" role="img"
      aria-label={`Harness comparison: ${current.label} has ${(current.shipReady * 100).toFixed(1)} percent ready to ship and ${(current.falseVictory * 100).toFixed(1)} percent false victory`}
      style={{ display: 'block', fontFamily: HAND_FONT }}>
      {[0, 0.5, 1].map((tick) => {
        const y = base - tick * chartHeight;
        return <g key={tick}>
          <line x1={62} y1={y} x2={730} y2={y} stroke={t.border} strokeWidth={1} strokeDasharray={tick === 0 ? undefined : '4 5'} />
          <text x={52} y={y + 5} textAnchor="end" fontSize={14} fill={t.textSecondary}>{Math.round(tick * 100)}%</text>
        </g>;
      })}
      {variants.map((variant, index) => {
        const x = groupStart + index * groupWidth;
        const revealed = index <= playback.step;
        const active = index === playback.step;
        const readyHeight = variant.shipReady * chartHeight;
        const falseHeight = variant.falseVictory * chartHeight;
        return <g key={variant.id} opacity={revealed ? 1 : 0.18} onClick={() => playback.setStep(index)} style={{ cursor: 'pointer' }}>
          {active && <line x1={x - 42} y1={base + 8} x2={x + 42} y2={base + 8} stroke={t.accentSecondary} strokeWidth={4} />}
          <rect x={x - 32} y={base - readyHeight} width={28} height={readyHeight} rx={4} fill={readyColor} />
          <rect x={x + 7} y={base - falseHeight} width={28} height={falseHeight} rx={4} fill={falseColor} />
          <text x={x - 18} y={Math.max(top + 14, base - readyHeight - 7)} textAnchor="middle" fontSize={14} fontWeight={700} fill={readyColor}>{(variant.shipReady * 100).toFixed(1)}%</text>
          <text x={x + 21} y={Math.max(top + 14, base - falseHeight - 7)} textAnchor="middle" fontSize={14} fontWeight={700} fill={falseColor}>{(variant.falseVictory * 100).toFixed(1)}%</text>
          <text x={x} y={base + 34} textAnchor="middle" fontSize={15} fontWeight={active ? 700 : 400} fill={active ? t.accentSecondary : t.textPrimary}>{variant.label}</text>
        </g>;
      })}
      <text x={395} y={347} textAnchor="middle" fontSize={14} fill={t.textSecondary}>Each group uses the same task and model assumptions; only the surrounding harness changes.</text>
    </svg>

    {compact ? <StickyRow>
      <StickyNote title={`Worked outcome · ${current.label}`} color="green" tilt={-1}>
        <p>Ready = <strong>{(current.shipReady * 100).toFixed(1)}%</strong>; false victory = {(current.falseVictory * 100).toFixed(1)}%.</p>
      </StickyNote>
      <StickyNote title={`Step ${playback.step + 1} of ${variants.length}`} color="blue" tilt={1} live><p>{current.plainMeaning}</p></StickyNote>
    </StickyRow> : <>
      <StickyRow>
        <StickyNote title="Chance of another attempt" latex={String.raw`r=(1-p)c`} color="yellow" tilt={-1}>
          <p>p = step accuracy; c = verifier coverage. Another attempt happens only after a wrong step is caught.</p>
        </StickyNote>
        <StickyNote title="Chance one step ends correct" latex={String.raw`P_{\mathrm{step}}=p'\frac{1-r^A}{1-r}`} color="pink" tilt={1}>
          <p>p′ is the current step accuracy; state tracking raises it in the full harness. A is the maximum attempt count.</p>
        </StickyNote>
        <StickyNote title="Chance the task is ready" latex={String.raw`P_{\mathrm{ship}}=P_{\mathrm{step}}^N(1-g)`} color="orange" tilt={-1}>
          <p>N = required steps; g = regression risk after the task.</p>
        </StickyNote>
      </StickyRow>
      <StickyRow>
        <StickyNote title={`Worked outcome · ${current.label}`} color="green" tilt={1}>
          <p>r = {retryChance.toFixed(3)}. Expected attempts = {current.expectedAttempts.toFixed(2)}. Ready = <strong>{(current.shipReady * 100).toFixed(1)}%</strong>.</p>
        </StickyNote>
        <StickyNote title={`What just happened · step ${playback.step + 1}`} color="blue" tilt={-1} live>
          <p>{current.plainMeaning} False victory is {(current.falseVictory * 100).toFixed(1)}% in this model.</p>
        </StickyNote>
      </StickyRow>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <VizButton onClick={playback.toggle}>{playback.playing ? 'Pause' : 'Play'}</VizButton>
        <VizButton variant="secondary" onClick={playback.next}>Step →</VizButton>
        <VizButton variant="secondary" onClick={playback.reset}>Reset</VizButton>
      </div>
    </>}
  </VisualizationContainer>;
}
