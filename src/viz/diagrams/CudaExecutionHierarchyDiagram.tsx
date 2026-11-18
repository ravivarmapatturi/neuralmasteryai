import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

type Level = 'kernel' | 'grid' | 'block' | 'warp' | 'thread';
const LEVELS: { key: Level; label: string; desc: string }[] = [
  { key: 'kernel', label: 'Kernel', desc: 'A function launched from the CPU (host) to run on the GPU (device) -- every matmul, every elementwise add, compiles down to a kernel launch.' },
  { key: 'grid', label: 'Grid', desc: 'One kernel launch specifies one grid -- the full set of work for that launch.' },
  { key: 'block', label: 'Thread block', desc: 'A grid is divided into blocks. Each block is scheduled onto ONE SM and stays there for its entire execution.' },
  { key: 'warp', label: 'Warp', desc: 'Within a block, threads execute in groups of 32 -- the actual unit of scheduling/execution on the hardware. All 32 run the same instruction at once (SIMT).' },
  { key: 'thread', label: 'Thread', desc: 'The individual unit of work -- a single thread computes one (or a few) output elements.' },
];

/** Grid -> blocks -> warps -> threads, click a level to see how it maps
 * to the SMs actually doing the work. */
export default function CudaExecutionHierarchyDiagram() {
  const t = useVizTokens();
  const { value: activeIndex, pick } = useAutoCycle(LEVELS.length, 2600, 3);
  const color = getConceptColor(t, 'attention');
  const info = LEVELS[activeIndex];

  return (
    <VisualizationContainer footer={info.desc}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {LEVELS.map((l, i) => {
          const isActive = activeIndex === i;
          return (
            <div key={l.key} style={{ marginLeft: i * 18 }}>
              <div
                onClick={() => pick(i)}
                onMouseEnter={() => pick(i)}
                style={{ display: 'inline-block', cursor: 'pointer', padding: '5px 12px', borderRadius: 6, fontSize: 11.5, fontWeight: isActive ? 700 : 500, background: isActive ? `${color}20` : t.surfaceAlt, border: `1.25px solid ${isActive ? color : t.border}`, color: isActive ? color : t.textSecondary, transition: 'all 200ms ease' }}
              >
                {isActive ? `▶ ${l.label}` : l.label}
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 8 }}>
        A grid's many blocks distribute across all available SMs -- a block, once assigned, never migrates to a different SM mid-execution.
      </div>
    </VisualizationContainer>
  );
}
