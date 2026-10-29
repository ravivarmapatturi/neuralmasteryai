import { useMemo, useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, Slider, PillSelect } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

type Strategy = 'temperature' | 'topk' | 'topp';

// Fixed raw logits for a small toy vocabulary, roughly decreasing.
const LOGITS = [4.2, 3.6, 2.1, 1.8, 1.2, 0.6, 0.1, -0.4, -1.0, -1.8];
const TOKENS = ['the', 'a', 'this', 'my', 'that', 'some', 'one', 'each', 'any', 'no'];

function softmax(logits: number[]): number[] {
  const max = Math.max(...logits);
  const exps = logits.map((l) => Math.exp(l - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / sum);
}

/** The same 10-token logit vector, run through 3 different next-token
 * selection rules -- drag the parameter and watch exactly which tokens
 * get zeroed out or reweighted before sampling actually happens. */
export default function SamplingStrategiesDiagram() {
  const t = useVizTokens();
  const [strategy, setStrategy] = useState<Strategy>('topp');
  const [temperature, setTemperature] = useState(1);
  const [k, setK] = useState(4);
  const [p, setP] = useState(0.85);
  const color = getConceptColor(t, 'attention');
  const dropColor = t.textMuted;

  const { probs, kept } = useMemo(() => {
    if (strategy === 'temperature') {
      const scaled = LOGITS.map((l) => l / temperature);
      return { probs: softmax(scaled), kept: LOGITS.map(() => true) };
    }
    const base = softmax(LOGITS);
    if (strategy === 'topk') {
      const sortedIdx = [...base.keys()].sort((a, b) => base[b] - base[a]);
      const keepSet = new Set(sortedIdx.slice(0, k));
      const keptProbsRaw = base.map((v, i) => (keepSet.has(i) ? v : 0));
      const sum = keptProbsRaw.reduce((a, b) => a + b, 0);
      return { probs: keptProbsRaw.map((v) => v / sum), kept: base.map((_, i) => keepSet.has(i)) };
    }
    // top-p
    const sortedIdx = [...base.keys()].sort((a, b) => base[b] - base[a]);
    let cum = 0;
    const keepSet = new Set<number>();
    for (const idx of sortedIdx) {
      if (cum >= p) break;
      keepSet.add(idx);
      cum += base[idx];
    }
    const keptProbsRaw = base.map((v, i) => (keepSet.has(i) ? v : 0));
    const sum = keptProbsRaw.reduce((a, b) => a + b, 0);
    return { probs: keptProbsRaw.map((v) => v / sum), kept: base.map((_, i) => keepSet.has(i)) };
  }, [strategy, temperature, k, p]);

  const maxProb = Math.max(...probs, 0.01);

  return (
    <VisualizationContainer footer={strategy === 'temperature' ? 'T<1 sharpens toward greedy; T>1 flattens toward uniform. Every token stays eligible -- temperature reshapes the distribution, it never drops candidates.' : strategy === 'topk' ? `Only the top-${k} tokens by probability stay eligible; everything else is zeroed and probabilities renormalized over the survivors.` : `Keeps the smallest set of tokens whose cumulative probability exceeds p=${p.toFixed(2)} -- adapts automatically: a peaked distribution keeps very few tokens, a flat one keeps more.`}>
      <PillSelect<Strategy> label="Strategy" value={strategy} onChange={setStrategy} options={[{ value: 'temperature', label: 'Temperature' }, { value: 'topk', label: 'Top-k' }, { value: 'topp', label: 'Top-p' }]} />
      {strategy === 'temperature' && <Slider label={`T = ${temperature.toFixed(2)}`} min={0.1} max={2} step={0.05} value={temperature} onChange={setTemperature} />}
      {strategy === 'topk' && <Slider label={`k = ${k}`} min={1} max={10} step={1} value={k} onChange={setK} />}
      {strategy === 'topp' && <Slider label={`p = ${p.toFixed(2)}`} min={0.1} max={1} step={0.05} value={p} onChange={setP} />}
      <div role="img" aria-label={`Computed token probabilities: ${TOKENS.map((tok, i) => `${tok} ${(probs[i] * 100).toFixed(1)} percent`).join(', ')}`} style={{ display: 'flex', gap: 4, alignItems: 'flex-end', height: 110, marginTop: 12, overflowX: 'auto' }}>
        {TOKENS.map((tok, i) => (
          <div key={tok} style={{ flex: '1 0 38px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <div style={{ width: '100%', height: 70, display: 'flex', alignItems: 'flex-end' }}>
              <div style={{ width: '100%', height: `${(probs[i] / maxProb) * 100}%`, background: kept[i] ? color : dropColor, opacity: kept[i] ? 0.85 : 0.2, borderRadius: '3px 3px 0 0' }} />
            </div>
            <div style={{ fontSize: 11, fontFamily: 'monospace', color: kept[i] ? t.textSecondary : t.textMuted }}>{tok}</div>
          </div>
        ))}
      </div>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 8 }}>
        {kept.filter(Boolean).length} of {TOKENS.length} tokens eligible for sampling.
      </div>
    </VisualizationContainer>
  );
}
