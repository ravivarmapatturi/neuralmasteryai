import { useMemo, useState } from 'react';
import { useVizTokens } from '../theme/vizTokens';
import { SketchArrow, SketchRect } from '../components/notebook/RoughShape';
import { StickyNote, StickyRow, VisualizationContainer, VisualizationHeader, VizButton } from './primitives';
import {
  CANDIDATES,
  buildInferenceStages,
  computeDistribution,
  distributionEntropy,
  sampleFromDistribution,
} from './lib/sampling';
import { usePlaygroundPlayback } from './diagrams/usePlaygroundPlayback';

const HAND_FONT = "'Kalam', 'Comic Sans MS', cursive";

function NumberControl({ label, value, min, max, step, onChange }: {
  label: string; value: number; min: number; max: number; step: number; onChange: (value: number) => void;
}) {
  const t = useVizTokens();
  return <label style={{ display: 'block', minWidth: 130, fontSize: 15 }}>{label}
    <input aria-label={label} type="number" min={min} max={max} step={step} value={value}
      onChange={(event) => {
        const next = Number(event.target.value);
        if (Number.isFinite(next)) onChange(Math.max(min, Math.min(max, next)));
      }}
      style={{ display: 'block', width: '100%', boxSizing: 'border-box', minHeight: 34, marginTop: 3, padding: '3px 7px', border: `1.5px solid ${t.border}`, borderRadius: 6, background: t.background, color: t.textPrimary, font: 'inherit', fontVariantNumeric: 'tabular-nums' }} />
  </label>;
}

export default function InferenceFlowVisualizer({ compact = false }: { compact?: boolean }) {
  const t = useVizTokens();
  const [prompt, setPrompt] = useState('the cat sat on the');
  const [layers, setLayers] = useState(12);
  const [temperature, setTemperature] = useState(0.8);
  const [topK, setTopK] = useState(4);
  const [topP, setTopP] = useState(0.9);
  const [draw, setDraw] = useState(0.72);
  const [prediction, setPrediction] = useState<'rise' | 'fall' | 'same'>('rise');
  const [predictionResult, setPredictionResult] = useState<boolean | null>(null);

  const distribution = useMemo(() => computeDistribution(temperature, topK, topP), [temperature, topK, topP]);
  const selected = useMemo(() => sampleFromDistribution(distribution, draw), [distribution, draw]);
  const stages = useMemo(() => buildInferenceStages(prompt, layers, selected.token), [prompt, layers, selected.token]);
  const playback = usePlaygroundPlayback(stages.length, 1500);
  const stage = stages[playback.step];
  const entropy = distributionEntropy(distribution);
  const tokenColors = [t.accentPrimary, t.accentSecondary, t.accentWarn, t.accentDanger, t.accentPurple, t.accentTeal];
  const survivors = distribution.filter((entry) => entry.finalProb > 0);
  const selectedIndex = survivors.findIndex((entry) => entry.token === selected.token);
  const intervalStart = survivors.slice(0, selectedIndex).reduce((sum, entry) => sum + entry.finalProb, 0);
  const intervalEnd = intervalStart + selected.finalProb;
  const halfTemperature = Math.max(0.1, temperature / 2);
  const halfDistribution = computeDistribution(halfTemperature, topK, topP);
  const currentTop = Math.max(...distribution.map((entry) => entry.finalProb));
  const halfTop = Math.max(...halfDistribution.map((entry) => entry.finalProb));
  const actualPrediction = Math.abs(halfTop - currentTop) < 1e-9 ? 'same' : halfTop > currentTop ? 'rise' : 'fall';

  const setAndReset = (setter: (value: number) => void, value: number) => {
    setter(value);
    setPredictionResult(null);
    playback.setStep(0);
  };
  const activeValues = distribution.map((entry) => {
    if (playback.step < 5) return { value: entry.baseLogit, label: `logit ${entry.baseLogit.toFixed(1)}`, kept: true };
    if (playback.step === 5) return { value: entry.prob, label: `${(entry.prob * 100).toFixed(1)}%`, kept: true };
    return { value: entry.finalProb, label: entry.finalProb > 0 ? `${(entry.finalProb * 100).toFixed(1)}%` : 'cut', kept: entry.finalProb > 0 };
  });
  const maxBarValue = Math.max(0.01, ...activeValues.map((entry) => entry.value));
  const barHeading = playback.step < 5 ? 'Vocabulary scores (logits z)' : playback.step === 5 ? 'After temperature + softmax' : 'Final sampling probabilities';

  return <VisualizationContainer title="LLM inference flow playground"
    footer="The decoder flow follows the standard bottom-to-top Transformer convention. Candidate logits are illustrative; temperature scaling, softmax, top-k, top-p, entropy, cumulative sampling, and the selected token are computed exactly from the controls.">
    {!compact && <>
      <VisualizationHeader eyebrow="Live playground" title="Follow one next token from prompt to output"
        description="This solves the mystery of how an LLM turns text into one next token: it traces the decoder, then lets you change the real sampling math that chooses the result." />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
        <label style={{ display: 'block', gridColumn: '1 / -1', fontSize: 15 }}>Prompt text (what the model continues)
          <input aria-label="Prompt text (what the model continues)" value={prompt} maxLength={70}
            onChange={(event) => { setPrompt(event.target.value); playback.setStep(0); }}
            style={{ display: 'block', width: '100%', boxSizing: 'border-box', minHeight: 34, marginTop: 3, padding: '3px 7px', border: `1.5px solid ${t.border}`, borderRadius: 6, background: t.background, color: t.textPrimary, font: 'inherit' }} />
        </label>
        <NumberControl label="Decoder layers (blocks repeated)" value={layers} min={1} max={96} step={1} onChange={(value) => setAndReset(setLayers, Math.round(value))} />
        <NumberControl label="Temperature (probability sharpness)" value={temperature} min={0.1} max={2} step={0.1} onChange={(value) => setAndReset(setTemperature, value)} />
        <NumberControl label="Top-k (tokens kept first)" value={topK} min={1} max={CANDIDATES.length} step={1} onChange={(value) => setAndReset(setTopK, Math.round(value))} />
        <NumberControl label="Top-p (probability mass kept)" value={topP} min={0.1} max={1} step={0.05} onChange={(value) => setAndReset(setTopP, value)} />
        <NumberControl label="Random draw u (0 to 1)" value={draw} min={0} max={0.999} step={0.01} onChange={(value) => setAndReset(setDraw, value)} />
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, margin: '8px 0', fontSize: 15 }}>
        <strong style={{ color: t.accentWarn }}>Predict first:</strong>
        <span>If temperature is halved to {halfTemperature.toFixed(2)}, what happens to the largest probability?</span>
        <select aria-label="Predicted effect of halving temperature" value={prediction}
          onChange={(event) => { setPrediction(event.target.value as typeof prediction); setPredictionResult(null); }}
          style={{ minHeight: 34, border: `1.5px solid ${t.border}`, borderRadius: 6, background: t.background, color: t.textPrimary, font: 'inherit' }}>
          <option value="rise">It rises (distribution sharpens)</option>
          <option value="fall">It falls (distribution flattens)</option>
          <option value="same">It stays the same</option>
        </select>
        <VizButton onClick={() => setPredictionResult(prediction === actualPrediction)}>Run prediction</VizButton>
        {predictionResult !== null && <span role="status" style={{ color: predictionResult ? t.accentPrimary : t.accentDanger, fontWeight: 700 }}>
          {predictionResult ? 'Correct.' : `It ${actualPrediction === 'rise' ? 'rises' : actualPrediction === 'fall' ? 'falls' : 'stays the same'}: ${(currentTop * 100).toFixed(1)}% → ${(halfTop * 100).toFixed(1)}%.`}
        </span>}
      </div>
    </>}

    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px 14px', fontSize: 15 }} aria-label="Token colour legend">
      {distribution.map((entry, index) => <span key={entry.token}><span style={{ display: 'inline-block', width: 20, height: 5, marginRight: 5, verticalAlign: 'middle', background: tokenColors[index] }} />“{entry.token}”</span>)}
    </div>

    <svg width="100%" viewBox="0 0 760 410" role="img"
      aria-label={`Inference step ${playback.step + 1}: ${stage.label}; the draw selects ${selected.token}`}
      style={{ display: 'block', fontFamily: HAND_FONT }}>
      <text x={20} y={20} fontSize={16} fontWeight={700} fill={t.textPrimary}>Decoder-only Transformer flow</text>
      {stages.map((item, index) => {
        const y = 356 - index * 39;
        const active = index === playback.step;
        const done = index <= playback.step;
        return <g key={item.id} opacity={done ? 1 : 0.23} onClick={() => playback.setStep(index)} style={{ cursor: 'pointer' }}>
          {index > 0 && <SketchArrow points={[[178, y + 39], [178, y + 33]]} color={t.textSecondary} strokeWidth={1.5} id={`inference-arrow-${item.id}`} />}
          {active && <rect x={18} y={y} width={320} height={31} rx={6} fill={t.accentPrimary} fillOpacity={0.14} />}
          <SketchRect x={18} y={y} width={320} height={31} color={active ? t.accentPrimary : t.border} strokeWidth={active ? 2.5 : 1.2} id={`inference-stage-${item.id}`} />
          <text x={178} y={y + 21} textAnchor="middle" fontSize={14} fontWeight={active ? 700 : 400} fill={active ? t.accentPrimary : t.textPrimary}>{item.label}</text>
        </g>;
      })}
      <text x={395} y={28} fontSize={16} fontWeight={700} fill={t.textPrimary}>{barHeading}</text>
      {distribution.map((entry, index) => {
        const y = 58 + index * 50;
        const bar = activeValues[index];
        return <g key={entry.token} opacity={bar.kept ? 1 : 0.3}>
          <text x={395} y={y + 17} fontSize={15} fontWeight={entry.token === selected.token ? 700 : 400} fill={entry.token === selected.token ? tokenColors[index] : t.textPrimary}>“{entry.token}”</text>
          <rect x={475} y={y} width={Math.max(3, (bar.value / maxBarValue) * 190)} height={24} rx={5} fill={tokenColors[index]} fillOpacity={0.82} />
          <text x={675} y={y + 17} fontSize={14} fontWeight={700} fill={tokenColors[index]}>{bar.label}</text>
        </g>;
      })}
      <text x={395} y={370} fontSize={15} fill={t.textSecondary}>Entropy H = {entropy.toFixed(3)} bits</text>
      <text x={395} y={394} fontSize={15} fontWeight={700} fill={t.accentPrimary}>u = {draw.toFixed(2)} selects “{selected.token}”</text>
    </svg>

    {compact ? <StickyRow>
      <StickyNote title="Temperature softmax" latex={String.raw`p_i=\frac{e^{z_i/T}}{\sum_j e^{z_j/T}}`} color="yellow" tilt={-1}><p>z = logit, T = temperature, p = probability.</p></StickyNote>
      <StickyNote title={`Step ${playback.step + 1} of ${stages.length}`} color="blue" tilt={1} live><p>{stage.plainMeaning}</p></StickyNote>
    </StickyRow> : <>
      <StickyRow>
        <StickyNote title="Temperature softmax" latex={String.raw`p_i=\frac{e^{z_i/T}}{\sum_j e^{z_j/T}}`} color="yellow" tilt={-1}
          active={stage.id === 'softmax'} onSelect={() => playback.setStep(5)}><p>z = raw vocabulary score; T = temperature; p = probability.</p></StickyNote>
        <StickyNote title="Top-k filter" latex={String.raw`K=\operatorname{arg\,topk}_i(p_i)`} color="pink" tilt={1}
          active={stage.id === 'truncate'} onSelect={() => playback.setStep(6)}><p>Keep the k tokens with the largest probabilities.</p></StickyNote>
        <StickyNote title="Top-p filter" latex={String.raw`\sum_{i\in S}p_i\ge p_{\mathrm{target}}`} color="orange" tilt={-1}
          active={stage.id === 'truncate'} onSelect={() => playback.setStep(6)}><p>S is the smallest top-ranked set whose mass reaches top-p.</p></StickyNote>
      </StickyRow>
      <StickyRow>
        <StickyNote title="Worked random draw" color="green" tilt={1}>
          <p>“{selected.token}” owns [{intervalStart.toFixed(3)}, {intervalEnd.toFixed(3)}). u = {draw.toFixed(3)} lands inside it.</p>
        </StickyNote>
        <StickyNote title={`What just happened · step ${playback.step + 1}`} color="blue" tilt={-1} live><p>{stage.plainMeaning}</p></StickyNote>
      </StickyRow>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <VizButton onClick={playback.toggle}>{playback.playing ? 'Pause' : 'Play'}</VizButton>
        <VizButton variant="secondary" onClick={playback.next}>Step →</VizButton>
        <VizButton variant="secondary" onClick={playback.reset}>Reset</VizButton>
      </div>
    </>}
  </VisualizationContainer>;
}
