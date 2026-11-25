import { useMemo, useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, VisualizationHeader, VizButton, StickyNote, StickyRow } from '../primitives';
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

function ModelInput({ label, hint, value, onChange, min = 1, max = 131072 }: { label: string; hint?: string; value: number; onChange: (value: number) => void; min?: number; max?: number }) {
  const t = useVizTokens();
  return (
    <label style={{ display: 'block', minWidth: 0, fontSize: 15 }}>
      <span style={{ display: 'block', marginBottom: 2, fontWeight: 700 }}>{label}</span>
      {hint && <span style={{ display: 'block', marginBottom: 4, fontSize: 13, color: t.textSecondary }}>{hint}</span>}
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

function KvCachePlayground({ compact = false }: { compact?: boolean }) {
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
  const playback = usePlaygroundPlayback(trace.length, 1800);
  const step = trace[playback.step] ?? trace[0];
  const n = step.cache.length;
  const costs = calculateKvCosts(model, n);
  const maxWeightIndex = step.weights.indexOf(Math.max(...step.weights));
  const strongestToken = step.cache[maxWeightIndex]?.token ?? step.token;
  const allTokens = trace[trace.length - 1]?.cache.map((r) => r.token) ?? [];

  const queryColor = t.accentPurple;
  const keyColor = t.accentTeal;
  const valueColor = t.accentWarn;
  const goodColor = t.accentPrimary;
  const badColor = t.accentDanger;

  const updateModel = (key: keyof KvModelConfig, value: number) => setModel((current) => ({ ...current, [key]: value }));
  const updateTokens = (setter: (value: string) => void, value: string) => {
    setter(value);
    setPredictionResult(null);
    playback.setStep(0);
  };
  const inputStyle = { width: '100%', boxSizing: 'border-box' as const, minHeight: 34, padding: '4px 8px', font: 'inherit', border: `1.5px solid ${t.border}`, borderRadius: 6, background: t.background, color: t.textPrimary };

  // ---- table geometry ----
  const W = 760;
  const cols = { word: 16, key: 190, value: 350, score: 520, weight: 650 };
  const rowH = 34;
  const tableH = 52 + allTokens.length * rowH;

  // ---- work grids: rows = generation steps, columns = words ----
  const total = allTokens.length;
  const promptCount = trace[0]?.promptTokenCount ?? 1;
  // Row 0 = reading the prompt (both sides compute it once); then one row per generated word.
  const gridRows = [promptCount, ...trace.map((st) => st.cache.length)];
  const cell = Math.min(32, Math.floor(300 / Math.max(total, 1)));
  const activeRow = playback.step + 1;
  const grid = (withCache: boolean, x0: number) => (
    <g transform={`translate(${x0} 0)`}>
      <text x={0} y={18} fontSize={16} fontWeight={700} fill={withCache ? goodColor : badColor}>{withCache ? 'With a KV cache' : 'Without a cache'}</text>
      <text x={0} y={38} fontSize={14} fill={t.textSecondary}>{withCache ? 'only the new word is computed' : 'every word is computed again'}</text>
      {allTokens.map((tok, j) => (
        <text key={`h${j}`} x={92 + j * cell + (cell - 4) / 2} y={62} textAnchor="middle" fontSize={13} fill={t.textSecondary}>{tok.length > 4 ? `${tok.slice(0, 3)}…` : tok}</text>
      ))}
      <text x={92 + total * cell + 6} y={62} fontSize={13} fill={t.textSecondary}>K/V computed</text>
      {gridRows.map((len, i) => {
        const y = 72 + i * (cell + 5);
        const active = i === activeRow;
        const done = i <= activeRow;
        const computedCount = withCache ? (i === 0 ? len : 1) : len;
        return (
          <g key={`r${i}`} opacity={done ? 1 : 0.22}>
            <text x={0} y={y + cell / 2 + 5} fontSize={14} fontWeight={active ? 700 : 400} fill={t.textPrimary}>{i === 0 ? 'read prompt' : `new word ${i}`}</text>
            {Array.from({ length: len }, (_, j) => {
              const computed = withCache ? (i === 0 || j === len - 1) : true;
              return (
                <rect key={j} x={92 + j * cell} y={y} width={cell - 4} height={cell} rx={4}
                  fill={computed ? (withCache ? goodColor : badColor) : t.surface} fillOpacity={computed ? 0.8 : 1}
                  stroke={computed ? 'none' : t.textMuted} strokeWidth={1.4} strokeDasharray={computed ? undefined : '3 2'} />
              );
            })}
            <text x={92 + total * cell + 6} y={y + cell / 2 + 5} fontSize={14} fontWeight={700} fill={withCache ? goodColor : badColor}>{computedCount}</text>
          </g>
        );
      })}
    </g>
  );
  // Totals read straight off the grid rows so the note and the picture always agree.
  const workWith = promptCount + activeRow;
  const workWithout = gridRows.slice(0, activeRow + 1).reduce((a, b) => a + b, 0);
  const gridH = 72 + gridRows.length * (cell + 5) + 34;

  const caption = `Step ${playback.step + 1}/${trace.length}: We appended K/V for “${shortToken(step.token)}”, reused ${n - 1} earlier rows, and its query put the most weight (${(step.weights[maxWeightIndex] * 100).toFixed(1)}%) on “${shortToken(strongestToken)}”; the output is ${vector(step.output)}.`;

  return (
    <>
      {!compact && (
        <>
          <VisualizationHeader
            eyebrow="Live playground"
            title="A KV cache stops an LLM from redoing old work"
            description="An LLM writes one word at a time. Each new word must look back at every earlier word through their keys (K) and values (V). A KV cache keeps those K and V rows, so each word's K and V are computed once instead of on every step."
          />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
            <label style={{ display: 'block', minWidth: 0, fontSize: 15 }}>
              <span style={{ display: 'block', marginBottom: 4, fontWeight: 700 }}>Prompt (up to 3 words)</span>
              <input aria-label="Prompt tokens" maxLength={40} value={prompt} onChange={(event) => updateTokens(setPrompt, event.target.value)} style={inputStyle} />
            </label>
            <label style={{ display: 'block', minWidth: 0, fontSize: 15 }}>
              <span style={{ display: 'block', marginBottom: 4, fontWeight: 700 }}>Words the model generates (up to 3)</span>
              <input aria-label="Generated tokens" maxLength={40} value={generated} onChange={(event) => updateTokens(setGenerated, event.target.value)} style={inputStyle} />
            </label>
          </div>
        </>
      )}

      {!compact && (
      <svg
        width="100%"
        viewBox={`0 0 ${W} ${tableH}`}
        role="img"
        aria-label={`Generated token ${step.token} appends key ${vector(step.cache.at(-1)?.key ?? [])} and value ${vector(step.cache.at(-1)?.value ?? [])}, then attends most to ${strongestToken}`}
        style={{ display: 'block', fontFamily: HAND_FONT }}
      >
        <text x={cols.word} y={18} fontSize={16} fontWeight={700} fill={t.textPrimary}>The KV cache after step {playback.step + 1}</text>
        <text x={W - 16} y={18} textAnchor="end" fontSize={15} fill={queryColor}>new word’s query q = {vector(step.query)}</text>
        {[
          ['word', cols.word, t.textPrimary],
          ['key K: what it offers', cols.key, keyColor],
          ['value V: what it passes on', cols.value, valueColor],
          ['score q·K ÷ √2', cols.score, queryColor],
          ['weight', cols.weight, goodColor],
        ].map(([label, x, color]) => (
          <text key={label as string} x={x as number} y={44} fontSize={14} fontWeight={700} fill={color as string}>{label as string}</text>
        ))}
        <line x1={12} y1={52} x2={W - 12} y2={52} stroke={t.border} strokeWidth={1.2} />
        {allTokens.map((tok, index) => {
          const y = 52 + index * rowH;
          const inCache = index < n;
          const row = step.cache[index];
          const isNew = index === n - 1;
          const isPrompt = index < step.promptTokenCount;
          const isStrongest = index === maxWeightIndex;
          return (
            <g key={`${tok}-${index}`} opacity={inCache ? 1 : 0.3}>
              {isNew && <rect x={10} y={y + 4} width={W - 20} height={rowH - 6} rx={6} fill={`${goodColor}22`} />}
              <text x={cols.word} y={y + 24} fontSize={15} fontWeight={isNew ? 700 : 400} fill={t.textPrimary}>
                “{shortToken(tok)}” <tspan fontSize={13} fill={isNew ? goodColor : t.textSecondary}>{!inCache ? 'not yet' : isNew ? 'just added' : isPrompt ? 'prompt, cached' : 'cached'}</tspan>
              </text>
              {inCache && row && (
                <>
                  <text x={cols.key} y={y + 24} fontSize={15} fontFamily="monospace" fill={keyColor}>{vector(row.key)}</text>
                  <text x={cols.value} y={y + 24} fontSize={15} fontFamily="monospace" fill={valueColor}>{vector(row.value)}</text>
                  <text x={cols.score} y={y + 24} fontSize={15} fontFamily="monospace" fill={queryColor}>{step.scores[index].toFixed(3)}</text>
                  <text x={cols.weight} y={y + 24} fontSize={15} fontFamily="monospace" fontWeight={isStrongest ? 700 : 400} fill={isStrongest ? goodColor : t.textSecondary}>{(step.weights[index] * 100).toFixed(1)}%</text>
                </>
              )}
            </g>
          );
        })}
      </svg>
      )}

      <svg width="100%" viewBox={`0 0 ${W} ${gridH}`} role="img" aria-label="Work per step with and without a KV cache" style={{ display: 'block', fontFamily: HAND_FONT }}>
        {grid(true, 10)}
        {grid(false, W / 2 + 10)}
        <g transform={`translate(10 ${gridH - 14})`}>
          <rect x={0} y={-12} width={16} height={16} rx={3} fill={goodColor} fillOpacity={0.8} />
          <rect x={22} y={-12} width={16} height={16} rx={3} fill={badColor} fillOpacity={0.8} />
          <text x={46} y={1} fontSize={14} fill={t.textPrimary}>= K and V computed in this step</text>
          <rect x={300} y={-12} width={16} height={16} rx={3} fill={t.surface} stroke={t.textMuted} strokeDasharray="3 2" strokeWidth={1.4} />
          <text x={324} y={1} fontSize={14} fill={t.textPrimary}>= reused from the cache (no work)</text>
        </g>
      </svg>

      <StickyRow>
        {!compact && <StickyNote title="Attention for the new word" latex={'o = \\sum_i \\mathrm{softmax}\\!\\left(\\tfrac{q\\cdot k_i}{\\sqrt{d}}\\right) v_i'} color="pink" tilt={-1}>
          <p style={{ textAlign: 'center' }}>Every cached k and v is used again; only the new word’s q, k, v are new. Here o = <span className="nm-sticky__mono">{vector(step.output)}</span>.</p>
        </StickyNote>}
        <StickyNote title={`Total work so far (${n} words)`} latex={'\\text{cache: } n \\qquad \\text{no cache: } p + (p{+}1) + \\dots + n'} color="yellow" tilt={1}>
          <p style={{ textAlign: 'center' }}>p = {promptCount} prompt words. K/V rows computed: <strong style={{ color: goodColor }}>{workWith}</strong> with a cache vs <strong style={{ color: badColor }}>{workWithout}</strong> without ({gridRows.slice(0, activeRow + 1).join(' + ')}).</p>
        </StickyNote>
        <StickyNote title={`Step ${playback.step + 1} of ${trace.length}`} color="blue" tilt={-1} live>
          <p>{caption}</p>
        </StickyNote>
      </StickyRow>

      {!compact && (
        <>
          <h4 style={{ margin: '0.6rem 0 0', fontSize: 18 }}>How much memory does the cache take?</h4>
          <p style={{ margin: 0, fontSize: 15, color: t.textSecondary }}>Change the model size to see the cost. Every layer keeps one K and one V vector per head for every word in the context.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14 }}>
            <ModelInput label="Layers" hint="blocks stacked in the model" value={model.layers} onChange={(value) => updateModel('layers', value)} max={256} />
            <ModelInput label="KV heads" hint="K/V groups per layer" value={model.kvHeads} onChange={(value) => updateModel('kvHeads', value)} max={256} />
            <ModelInput label="Head dim" hint="numbers in each K or V" value={model.headDim} onChange={(value) => updateModel('headDim', value)} max={1024} />
            <ModelInput label="Sequence tokens" hint="words kept in context" value={model.sequenceLength} onChange={(value) => updateModel('sequenceLength', value)} max={131072} />
            <ModelInput label="Bytes/value" hint="2 for fp16, 1 for int8" value={model.bytesPerValue} onChange={(value) => updateModel('bytesPerValue', value)} max={8} />
            <ModelInput label="Model width" hint="used for the FLOP count" value={model.modelWidth} onChange={(value) => updateModel('modelWidth', value)} max={32768} />
          </div>
          <StickyRow>
            <StickyNote title="Cache memory" latex={'2 \\times L \\times H_{kv} \\times d_{head} \\times T \\times b'} color="green" tilt={1}>
              <p className="nm-sticky__mono" style={{ textAlign: 'center' }}>2 × {model.layers} × {model.kvHeads} × {model.headDim} × {model.sequenceLength} × {model.bytesPerValue} = {exact(costs.cacheBytes)} bytes</p>
              <p style={{ textAlign: 'center' }}><strong>{gib(costs.cacheBytes)} GiB</strong> (the 2 is one K plus one V)</p>
            </StickyNote>
            <StickyNote title="Compute this step" color="orange" tilt={-1}>
              <p>With cache: <strong>{exact(costs.withCache.flopsThisStep)}</strong> FLOPs</p>
              <p>Without: <strong>{exact(costs.withoutCache.flopsThisStep)}</strong> FLOPs</p>
            </StickyNote>
          </StickyRow>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: 15 }}>
            <strong>Predict first:</strong>
            <span>without a cache, how does the work for each new word change?</span>
            <select aria-label="Predicted no-cache growth" value={prediction} onChange={(event) => { setPrediction(event.target.value as typeof prediction); setPredictionResult(null); }} style={{ minHeight: 32, font: 'inherit', border: `1.5px solid ${t.border}`, borderRadius: 6, background: t.background, color: t.textPrimary }}>
              <option value="linear">stays the same</option>
              <option value="triangular">grows by one row per word</option>
              <option value="square">doubles every word</option>
            </select>
            <VizButton onClick={() => setPredictionResult(prediction === 'triangular')}>Check</VizButton>
            {predictionResult !== null && (
              <span role="status" style={{ color: predictionResult ? goodColor : badColor, fontWeight: 700 }}>
                {predictionResult ? `Correct: ${gridRows.join(', ')} rows, one more each time, so the total grows like n².` : `It grows by one row per word (${gridRows.join(', ')}), so the total grows like n².`}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <VizButton onClick={playback.toggle}>{playback.playing ? 'Pause' : 'Play'}</VizButton>
            <VizButton variant="secondary" onClick={playback.next}>Step →</VizButton>
            <VizButton variant="secondary" onClick={playback.reset}>Reset</VizButton>
            <span style={{ marginLeft: 'auto', fontSize: 14, color: t.textSecondary }}>Toy vectors have 2 numbers so they fit on screen; real ones have {model.headDim}.</span>
          </div>
        </>
      )}
    </>
  );
}

export default function KvCacheDiagram({ compact = false }: { compact?: boolean }) {
  return (
    <VisualizationContainer
      title="KV cache mechanism playground"
      footer="The toy attention trace uses real two-value Q/K/V projections so every number fits on screen. The work and memory counters use the editable model dimensions exactly; they are calculated values, not production timing estimates."
    >
      <KvCachePlayground compact={compact} />
    </VisualizationContainer>
  );
}
