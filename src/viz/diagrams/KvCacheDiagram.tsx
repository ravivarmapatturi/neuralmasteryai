import { useMemo, useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { SketchPath } from '../../components/notebook/RoughShape';
import { VisualizationContainer, VisualizationHeader, VizButton } from '../primitives';
import { buildKvTrace, calculateKvCosts, type KvModelConfig } from '../lib/kvCache';
import { usePlaygroundPlayback } from './usePlaygroundPlayback';

const HAND_FONT = "'Kalam', 'Comic Sans MS', cursive";

function vector(values: readonly number[]): string {
  return `[${values.map((value) => value.toFixed(2)).join(', ')}]`;
}

function exact(value: bigint): string {
  return value.toLocaleString('en-US');
}

function gib(bytes: bigint): string {
  return (Number(bytes) / 1024 ** 3).toFixed(2);
}

function shortToken(token: string): string {
  return token.length > 10 ? `${token.slice(0, 9)}…` : token;
}

function ModelInput({ label, value, onChange, min = 1, max = 131072 }: { label: string; value: number; onChange: (value: number) => void; min?: number; max?: number }) {
  const t = useVizTokens();
  return (
    <label style={{ display: 'block', minWidth: 0, fontSize: 14 }}>
      <span style={{ display: 'block', marginBottom: 2 }}>{label}</span>
      <input
        aria-label={label}
        type="number"
        min={min}
        max={max}
        step={1}
        value={value}
        onChange={(event) => onChange(Math.max(min, Math.min(max, Math.round(Number(event.target.value) || min))))}
        style={{ width: '100%', boxSizing: 'border-box', minHeight: 30, padding: '3px 6px', font: 'inherit', border: `1px solid ${t.border}`, borderRadius: 6, background: t.background, color: t.textPrimary }}
      />
    </label>
  );
}

function KvCachePlayground() {
  const t = useVizTokens();
  const [prompt, setPrompt] = useState('the cat');
  const [generated, setGenerated] = useState('sat softly on');
  const [model, setModel] = useState<KvModelConfig>({
    modelWidth: 4096,
    layers: 32,
    kvHeads: 8,
    headDim: 128,
    sequenceLength: 8192,
    bytesPerValue: 2,
  });
  const [prediction, setPrediction] = useState<'linear' | 'triangular' | 'square'>('triangular');
  const [predictionResult, setPredictionResult] = useState<boolean | null>(null);
  const rawTrace = useMemo(() => buildKvTrace(prompt, generated), [prompt, generated]);
  const trace = rawTrace.length > 0 ? rawTrace : buildKvTrace(prompt || 'the', 'token');
  const playback = usePlaygroundPlayback(trace.length, 1450);
  const step = trace[playback.step] ?? trace[0];
  const currentTokenCount = step.cache.length;
  const costs = calculateKvCosts(model, currentTokenCount);
  const maxWeightIndex = step.weights.indexOf(Math.max(...step.weights));
  const strongestToken = step.cache[maxWeightIndex]?.token ?? step.token;

  const queryColor = t.accentPurple;
  const keyColor = t.accentTeal;
  const valueColor = t.accentWarn;
  const attentionColor = t.accentPrimary;
  const noCacheColor = t.accentDanger;

  const updateModel = (key: keyof KvModelConfig, value: number) => setModel((current) => ({ ...current, [key]: value }));
  const updateTokens = (setter: (value: string) => void, value: string) => {
    setter(value);
    setPredictionResult(null);
    playback.setStep(0);
  };

  return (
    <>
      <VisualizationHeader
        eyebrow="Live playground"
        title="A KV cache reuses the past"
        description="Watch each generated token append one K/V row, then use its new query to attend over every cached key."
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8, marginBottom: 5 }}>
        <label style={{ display: 'block', minWidth: 0, fontSize: 14 }}>
          <span style={{ display: 'block', marginBottom: 2 }}>Prompt (first 3 tokens)</span>
          <input aria-label="Prompt tokens" maxLength={40} value={prompt} onChange={(event) => updateTokens(setPrompt, event.target.value)} style={{ width: '100%', boxSizing: 'border-box', minHeight: 31, padding: '3px 7px', font: 'inherit', border: `1px solid ${t.border}`, borderRadius: 6, background: t.background, color: t.textPrimary }} />
        </label>
        <label style={{ display: 'block', minWidth: 0, fontSize: 14 }}>
          <span style={{ display: 'block', marginBottom: 2 }}>Generated tokens (first 3)</span>
          <input aria-label="Generated tokens" maxLength={40} value={generated} onChange={(event) => updateTokens(setGenerated, event.target.value)} style={{ width: '100%', boxSizing: 'border-box', minHeight: 31, padding: '3px 7px', font: 'inherit', border: `1px solid ${t.border}`, borderRadius: 6, background: t.background, color: t.textPrimary }} />
        </label>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(82px, 1fr))', gap: 7 }}>
        <ModelInput label="Model width" value={model.modelWidth} onChange={(value) => updateModel('modelWidth', value)} max={32768} />
        <ModelInput label="Layers" value={model.layers} onChange={(value) => updateModel('layers', value)} max={256} />
        <ModelInput label="KV heads" value={model.kvHeads} onChange={(value) => updateModel('kvHeads', value)} max={256} />
        <ModelInput label="Head dim" value={model.headDim} onChange={(value) => updateModel('headDim', value)} max={1024} />
        <ModelInput label="Sequence tokens" value={model.sequenceLength} onChange={(value) => updateModel('sequenceLength', value)} max={131072} />
        <ModelInput label="Bytes/value" value={model.bytesPerValue} onChange={(value) => updateModel('bytesPerValue', value)} max={8} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap', margin: '5px 0 3px', fontSize: 14 }}>
        <strong>Predict first:</strong>
        <span>After n tokens, no-cache total K/V row pairs are</span>
        <select aria-label="Predicted no-cache growth" value={prediction} onChange={(event) => { setPrediction(event.target.value as typeof prediction); setPredictionResult(null); }} style={{ minHeight: 29, font: 'inherit', border: `1px solid ${t.border}`, borderRadius: 6, background: t.background, color: t.textPrimary }}>
          <option value="linear">n</option>
          <option value="triangular">n(n+1)/2</option>
          <option value="square">n²</option>
        </select>
        <VizButton onClick={() => setPredictionResult(prediction === 'triangular')}>Run prediction</VizButton>
        {predictionResult !== null && (
          <span role="status" style={{ color: predictionResult ? attentionColor : noCacheColor, fontWeight: 700 }}>
            {predictionResult ? `Correct: ${currentTokenCount} tokens need ${exact(costs.withoutCache.pairsTotal)} pairs.` : `Try n(n+1)/2: 1+…+${currentTokenCount} = ${exact(costs.withoutCache.pairsTotal)}.`}
          </span>
        )}
      </div>

      <svg
        width="100%"
        viewBox="0 0 760 182"
        role="img"
        aria-label={`Generated token ${step.token} appends key ${vector(step.cache.at(-1)?.key ?? [])} and value ${vector(step.cache.at(-1)?.value ?? [])}, then attends most to ${strongestToken}`}
        style={{ display: 'block', fontFamily: HAND_FONT }}
      >
        <text x={18} y={18} fontSize={14} fontWeight={700} fill={queryColor}>New query q(“{shortToken(step.token)}”) = {vector(step.query)}</text>
        <text x={742} y={18} textAnchor="end" fontSize={14} fontWeight={700} fill={attentionColor}>output Σ weight×V = {vector(step.output)}</text>

        <text x={18} y={39} fontSize={14} fontWeight={700} fill={t.textPrimary}>Cached token</text>
        <text x={180} y={39} fontSize={14} fontWeight={700} fill={keyColor}>Key row K · teal</text>
        <text x={334} y={39} fontSize={14} fontWeight={700} fill={valueColor}>Value row V · amber</text>
        <text x={500} y={39} fontSize={14} fontWeight={700} fill={queryColor}>score q·K/√2 · purple</text>
        <text x={651} y={39} fontSize={14} fontWeight={700} fill={attentionColor}>softmax · green</text>
        <SketchPath d="M 16 45 Q 380 42 744 45" color={t.border} strokeWidth={1.2} id="kv-cache-table-header" />

        {step.cache.map((row, index) => {
          const y = 62 + index * 23;
          const isNew = index === step.cache.length - 1;
          const isPrompt = index < step.promptTokenCount;
          const isStrongest = index === maxWeightIndex;
          return (
            <g key={`${row.token}-${index}`}>
              {isNew && <rect x={12} y={y - 17} width={735} height={22} rx={6} fill={`${attentionColor}18`} stroke="none" />}
              <text x={20} y={y} fontSize={14} fontWeight={isNew ? 700 : 400} fill={isNew ? attentionColor : t.textPrimary}>
                {index + 1}. “{shortToken(row.token)}” · {isPrompt ? 'prompt' : isNew ? 'append' : 'reused'}
              </text>
              <text x={180} y={y} fontSize={14} fontFamily="monospace" fill={keyColor}>{vector(row.key)}</text>
              <text x={334} y={y} fontSize={14} fontFamily="monospace" fill={valueColor}>{vector(row.value)}</text>
              <text x={515} y={y} fontSize={14} fontFamily="monospace" fill={queryColor}>{step.scores[index].toFixed(3)}</text>
              <text x={676} y={y} fontSize={14} fontFamily="monospace" fontWeight={isStrongest ? 700 : 400} fill={isStrongest ? attentionColor : t.textSecondary}>{(step.weights[index] * 100).toFixed(1)}%</text>
            </g>
          );
        })}
      </svg>

      <div style={{ fontSize: 14, color: t.textSecondary, lineHeight: 1.35 }} aria-live="polite">
        Step {playback.step + 1}/{trace.length}: We appended K/V for “{shortToken(step.token)}”, reused {step.cache.length - 1} earlier rows, and its query put the most weight ({(step.weights[maxWeightIndex] * 100).toFixed(1)}%) on “{shortToken(strongestToken)}”; the output is {vector(step.output)}.
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(245px, 1fr))', gap: 10, marginTop: 5, fontSize: 14, lineHeight: 1.35 }}>
        <div style={{ background: `${attentionColor}12`, padding: '5px 8px', borderRadius: 7 }}>
          <strong style={{ color: attentionColor }}>With cache · reuse earlier K/V</strong><br />
          Step: {exact(costs.withCache.pairsThisStep)} pair / {exact(costs.withCache.flopsThisStep)} FLOPs · Total: {exact(costs.withCache.pairsTotal)} = n / {exact(costs.withCache.flopsTotal)} FLOPs
        </div>
        <div style={{ background: `${noCacheColor}12`, padding: '5px 8px', borderRadius: 7 }}>
          <strong style={{ color: noCacheColor }}>Without cache · recompute the prefix</strong><br />
          Step: {exact(costs.withoutCache.pairsThisStep)} pairs / {exact(costs.withoutCache.flopsThisStep)} FLOPs · Total: {exact(costs.withoutCache.pairsTotal)} = n(n+1)/2 / {exact(costs.withoutCache.flopsTotal)} FLOPs
        </div>
      </div>

      <div style={{ marginTop: 5, fontSize: 14, background: t.surfaceAlt, borderRadius: 7, padding: '5px 8px', lineHeight: 1.35 }}>
        <strong>Cache memory</strong> = 2 × {model.layers} layers × {model.kvHeads} heads × {model.headDim} head dim × {model.sequenceLength} tokens × {model.bytesPerValue} bytes = <strong>{exact(costs.cacheBytes)} bytes ({gib(costs.cacheBytes)} GiB)</strong>.
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 5 }}>
        <VizButton onClick={playback.toggle}>{playback.playing ? 'Pause' : 'Play'}</VizButton>
        <VizButton variant="secondary" onClick={playback.next}>Step →</VizButton>
        <VizButton variant="secondary" onClick={playback.reset}>Reset</VizButton>
        <span style={{ marginLeft: 'auto', fontSize: 14, color: t.textSecondary }}>Toy vectors: 2 dims · Counter: editable model size</span>
      </div>
    </>
  );
}

export default function KvCacheDiagram() {
  return (
    <VisualizationContainer
      title="KV cache mechanism playground"
      footer="The toy attention trace uses real two-value Q/K/V projections so every number fits on screen. The work and memory counters use the editable model dimensions exactly; they are calculated values, not production timing estimates."
    >
      <KvCachePlayground />
    </VisualizationContainer>
  );
}
