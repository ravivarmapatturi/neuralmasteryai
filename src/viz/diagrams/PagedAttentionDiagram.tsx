import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, PillSelect, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

/** Naive contiguous allocation over-reserves and fragments; Paged
 * Attention allocates fixed-size, non-contiguous blocks -- toggle to see
 * the same 3 requests packed into the same memory two different ways. */
export default function PagedAttentionDiagram() {
  const t = useVizTokens();
  const cycle = useAutoCycle(2, 2600, 1);
  const mode = cycle.value === 0 ? 'naive' : 'paged';
  const setMode = (value: 'naive' | 'paged') => cycle.pick(value === 'naive' ? 0 : 1);
  const colors = [getConceptColor(t, 'query'), getConceptColor(t, 'attention'), t.accentWarn];
  const width = 560;

  // Naive: each request pre-reserves a large contiguous block (max possible
  // length) even if it only uses part of it -- wasted (hatched) space.
  const naiveBlocks = [{ used: 3, reserved: 8 }, { used: 5, reserved: 8 }, { used: 2, reserved: 8 }];
  // Paged: fixed-size pages allocated on demand, non-contiguous, no waste,
  // interleaved across requests in the same pool.
  const pagePool = [0, 1, 0, 2, 1, 0, 2, 1, 2]; // which request owns each page slot

  return (
    <VisualizationContainer footer={mode === 'naive' ? 'Naive: each request pre-reserves a large contiguous block sized for the WORST case -- the hatched region is memory reserved but unused, wasted for every other request.' : 'Paged: fixed-size blocks allocated on demand from a shared pool, non-contiguous -- no over-reservation, no fragmentation, far more concurrent requests fit in the same GPU memory.'}>
      <PillSelect<'naive' | 'paged'> label="KV cache allocation" value={mode} onChange={setMode} options={[{ value: 'naive', label: 'Naive (contiguous)' }, { value: 'paged', label: 'Paged Attention' }]} />
      <svg width="100%" viewBox={`0 0 ${width} 110`} style={{ display: 'block', marginTop: 8 }}>
        {mode === 'naive' ? (
          naiveBlocks.map((b, ri) => (
            <g key={ri}>
              <text x={10} y={25 + ri * 30} fontSize={8.5} fill={colors[ri]}>req {ri + 1}</text>
              {Array.from({ length: b.reserved }, (_, i) => (
                <rect key={i} x={55 + i * 55} y={12 + ri * 30} width={48} height={20} rx={3} fill={i < b.used ? colors[ri] : 'none'} opacity={i < b.used ? 0.8 : 0.5} stroke={colors[ri]} strokeWidth={1.25} strokeDasharray={i >= b.used ? '3 2' : undefined} />
              ))}
            </g>
          ))
        ) : (
          <>
            <text x={10} y={20} fontSize={8.5} fill={t.textMuted}>shared page pool:</text>
            {pagePool.map((owner, i) => (
              <rect key={i} x={10 + i * 55} y={30} width={48} height={24} rx={4} fill={colors[owner]} opacity={0.8} stroke={colors[owner]} strokeWidth={1.25} />
            ))}
            <text x={10} y={80} fontSize={8} fill={t.textMuted}>every block is a fixed size, in use, and owned by whichever request needs it next -- no gaps</text>
          </>
        )}
      </svg>
      <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 4, fontSize: DIAGRAM_TYPE.caption.size }}>
        <span style={{ color: colors[0] }}>● req 1</span>
        <span style={{ color: colors[1] }}>● req 2</span>
        <span style={{ color: colors[2] }}>● req 3</span>
      </div>
    </VisualizationContainer>
  );
}
