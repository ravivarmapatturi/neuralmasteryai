import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, Slider, useAutoCycle, usePrefersReducedMotion } from '../primitives';
import { DIAGRAM_TYPE } from './diagramSystem';

const SIZE_PRESETS = [5000, 25000, 100000, 200000];

export default function HashMapVsArrayDiagram() {
  const t = useVizTokens();
  const reduced = usePrefersReducedMotion();
  const { value: autoIdx } = useAutoCycle(SIZE_PRESETS.length, 2800);
  const [userSize, setUserSize] = useState<number | null>(null);
  const size = userSize ?? SIZE_PRESETS[autoIdx];

  const arrayOps = size; // worst-case linear scan
  const hashOps = 1; // real O(1) average-case

  const height = 160;
  const maxV = size;
  const arrayH = Math.max(2, (arrayOps / maxV) * (height - 20));

  return (
    <VisualizationContainer footer={`Vocabulary/cache size = ${size.toLocaleString()} entries. Real worst-case lookup cost: array scan = ${arrayOps.toLocaleString()} comparisons; hash map = ${hashOps} (average case, real amortized O(1) via hashing). This gap is exactly why tokenizer vocabularies, caching layers, and data-pipeline de-duplication all use hash maps, not arrays, at any real scale.`}>
      <Slider label="collection size" value={size} onChange={setUserSize} min={100} max={200000} step={100} format={(v) => v.toLocaleString()} />

      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 40, height, justifyContent: 'center', marginTop: 12 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 70, height: arrayH, background: t.accentDanger, borderRadius: 4, transition: reduced ? 'none' : 'height 0.4s ease' }} />
          <div style={{ fontSize: 11, color: t.textMuted, marginTop: 6 }}>array (linear scan)</div>
          <div style={{ fontSize: 12, fontFamily: 'monospace', color: t.accentDanger }}>{arrayOps.toLocaleString()} ops</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 70, height: 3, background: t.accentPrimary, borderRadius: 4 }} />
          <div style={{ fontSize: 11, color: t.textMuted, marginTop: 6 }}>hash map</div>
          <div style={{ fontSize: 12, fontFamily: 'monospace', color: t.accentPrimary }}>{hashOps} op</div>
        </div>
      </div>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 8 }}>
        The hash map's bar never grows with collection size -- that flatness IS what O(1) means, made visible instead of asserted.
      </div>
    </VisualizationContainer>
  );
}
