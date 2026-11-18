import { useMemo, useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, Slider, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE } from './diagramSystem';

// Real per-training-step operation counts: full softmax needs one
// dot-product-and-normalize pass over the ENTIRE vocabulary; negative
// sampling needs only k+1 (the true context word plus k negative
// samples), regardless of vocabulary size.
function fullSoftmaxOps(vocabSize: number): number { return vocabSize; }
function negativeSamplingOps(k: number): number { return k + 1; }

const VOCAB_PRESETS = [10000, 30000, 50000, 100000, 200000];

export default function NegativeSamplingCostDiagram() {
  const t = useVizTokens();
  const { value: autoIdx } = useAutoCycle(VOCAB_PRESETS.length, 2800);
  const [userVocab, setUserVocab] = useState<number | null>(null);
  const vocabSize = userVocab ?? VOCAB_PRESETS[autoIdx];
  const [k, setK] = useState(10);

  const fullOps = useMemo(() => fullSoftmaxOps(vocabSize), [vocabSize]);
  const nsOps = useMemo(() => negativeSamplingOps(k), [k]);
  const speedup = fullOps / nsOps;

  const height = 160;
  const maxOps = fullOps;
  const barH = (ops: number) => Math.max(2, (ops / maxOps) * height);

  return (
    <VisualizationContainer footer={`Real per-step operation count: full softmax = vocabulary size = ${fullOps.toLocaleString()} scored words, every single training step. Negative sampling = k+1 = ${nsOps} scored words (1 true context word + ${k} negative samples). Real speedup: ${speedup.toFixed(0)}x fewer scored words per step -- this is the actual mechanism behind "a large practical speedup," not a vague claim.`}>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <Slider label="vocabulary size" value={vocabSize} onChange={setUserVocab} min={1000} max={200000} step={1000} format={(v) => v.toLocaleString()} />
        <Slider label="negative samples (k)" value={k} onChange={setK} min={2} max={30} step={1} />
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 40, justifyContent: 'center', height, marginTop: 16 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 70, height: barH(fullOps), background: t.accentDanger, borderRadius: 4 }} />
          <div style={{ fontSize: 11, color: t.textMuted, marginTop: 6 }}>full softmax</div>
          <div style={{ fontSize: 12, fontFamily: 'monospace', color: t.accentDanger }}>{fullOps.toLocaleString()}</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 70, height: barH(nsOps), background: t.accentPrimary, borderRadius: 4 }} />
          <div style={{ fontSize: 11, color: t.textMuted, marginTop: 6 }}>negative sampling</div>
          <div style={{ fontSize: 12, fontFamily: 'monospace', color: t.accentPrimary }}>{nsOps}</div>
        </div>
      </div>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 8 }}>
        The gap only widens as real vocabularies grow -- negative sampling's cost per step never depends on vocabulary size at all.
      </div>
    </VisualizationContainer>
  );
}
