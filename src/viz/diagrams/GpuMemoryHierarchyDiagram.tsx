import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

const TIERS = [
  { key: 'registers', label: 'Registers', speed: 3, size: 1, scope: 'private per-thread', desc: 'Fastest possible access, but tiny and private to one thread.' },
  { key: 'shared', label: 'Shared memory', speed: 2, size: 2, scope: 'shared across a block', desc: 'Fast, explicitly managed by the programmer -- cache data reused many times within a block instead of re-reading global memory.' },
  { key: 'global', label: 'Global memory (VRAM)', speed: 1, size: 3, scope: 'accessible from every thread', desc: 'Largest, slowest -- this is what "VRAM" means. Writing fast CUDA code is largely about minimizing round-trips here.' },
];

function Dots({ n, color, t }: { n: number; color: string; t: ReturnType<typeof useVizTokens> }) {
  return <div style={{ display: 'flex', gap: 2 }}>{[1, 2, 3].map((i) => <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: i <= n ? color : t.border }} />)}</div>;
}

/** The same fast-small-close vs slow-large-far tradeoff as CPU caches,
 * one level down -- click a tier. */
export default function GpuMemoryHierarchyDiagram() {
  const t = useVizTokens();
  const { value: activeIndex, pick } = useAutoCycle(TIERS.length, 2800, 1);
  const color = getConceptColor(t, 'attention');
  const active = TIERS[activeIndex];

  return (
    <VisualizationContainer footer={active.desc}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {TIERS.map((tier, idx) => {
          const isSelected = activeIndex === idx;
          return (
            <div key={tier.key} onClick={() => pick(idx)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(idx); } }} onMouseEnter={() => pick(idx)} style={{ cursor: 'pointer', padding: '0.6rem 0.85rem', borderRadius: 8, background: isSelected ? `${color}20` : t.surfaceAlt, border: `1.5px solid ${isSelected ? color : t.border}`, transition: 'all 200ms ease' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, fontSize: 12.5, color: isSelected ? color : t.textPrimary }}>{isSelected ? `▶ ${tier.label}` : tier.label}</span>
                <span style={{ fontSize: 9, color: isSelected ? color : t.textMuted }}>{tier.scope}</span>
              </div>
              <div style={{ display: 'flex', gap: 14, marginTop: 5, fontSize: 9.5, color: t.textMuted }}>
                <span>speed <Dots n={tier.speed} color={color} t={t} /></span>
                <span>size <Dots n={tier.size} color={color} t={t} /></span>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 8 }}>
        The same "keep data close" principle as CPU L1/L2/L3 caches -- just with explicit programmer control instead of automatic hardware caching.
      </div>
    </VisualizationContainer>
  );
}
