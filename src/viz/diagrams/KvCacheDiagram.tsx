import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, PillSelect } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';
import { SketchRect } from '../../components/notebook/RoughShape';

const STEPS = 5;

/** Naive generation recomputes K/V for the WHOLE sequence so far at every
 * step; the KV cache computes each token's K/V exactly once and reuses it.
 * Toggle modes and watch the recomputed-cell count -- quadratic without
 * caching, linear with it. */
export default function KvCacheDiagram() {
  const t = useVizTokens();
  const [mode, setMode] = useState<'naive' | 'cached'>('cached');
  const cachedColor = getConceptColor(t, 'key');
  const recomputeColor = t.accentDanger;

  const width = 500;
  const cellSize = 26;
  const gap = 4;

  let totalCompute = 0;
  const rows = Array.from({ length: STEPS }, (_, step) => {
    const cells = Array.from({ length: step + 1 }, (_, tok) => {
      const isNew = tok === step;
      const recomputed = mode === 'naive' || isNew;
      if (recomputed) totalCompute++;
      return { tok, recomputed };
    });
    return cells;
  });

  return (
    <VisualizationContainer
      footer={
        mode === 'naive'
          ? `Naive: every generation step recomputes K/V for ALL tokens so far -- ${totalCompute} total K/V computations across ${STEPS} steps, growing quadratically with sequence length.`
          : `Cached: each token's K/V is computed exactly once, ever, and reused -- only ${totalCompute} total K/V computations across ${STEPS} steps, growing linearly. This is the single biggest inference speedup, and the primary consumer of GPU memory during generation.`
      }
    >
      <PillSelect<'naive' | 'cached'> label="Mode" value={mode} onChange={setMode} options={[{ value: 'naive', label: 'Naive (no cache)' }, { value: 'cached', label: 'KV cache' }]} />
      <svg width="100%" viewBox={`0 0 ${width} ${20 + STEPS * (cellSize + gap)}`} style={{ display: 'block', marginTop: 10 }}>
        {rows.map((cells, step) => (
          <g key={step}>
            <text x={4} y={20 + step * (cellSize + gap) + cellSize / 2 + 4} fontSize={9} fontFamily="monospace" fill={t.textMuted}>t={step}</text>
            {cells.map(({ tok, recomputed }) => (
              <g key={tok}>
                <rect
                  x={40 + tok * (cellSize + gap)}
                  y={20 + step * (cellSize + gap)}
                  width={cellSize}
                  height={cellSize}
                  rx={4}
                  fill={recomputed ? `${recomputeColor}30` : `${cachedColor}18`}
                  stroke="none"
                />
                <SketchRect
                  x={40 + tok * (cellSize + gap)}
                  y={20 + step * (cellSize + gap)}
                  width={cellSize}
                  height={cellSize}
                  color={recomputed ? recomputeColor : cachedColor}
                  strokeWidth={recomputed ? 2 : 1}
                  id={`kvc-${step}-${tok}`}
                />
              </g>
            ))}
          </g>
        ))}
      </svg>
      <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 6, fontSize: 10 }}>
        <span style={{ color: recomputeColor }}>■ recomputed this step</span>
        <span style={{ color: cachedColor }}>■ reused from cache</span>
      </div>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 6 }}>
        Total K/V computations over {STEPS} steps: <strong>{totalCompute}</strong>
      </div>
    </VisualizationContainer>
  );
}
