import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, useAutoCycle, usePrefersReducedMotion } from '../primitives';
import { Pulse } from '../primitives/LiveFlow';
import { getConceptColor } from './diagramSystem';

const PRODUCTS = [
  { key: 'chat', label: 'Real-time chat', quality: 55, latency: 90, cost: 40, desc: 'Latency dominates -- a slow response breaks the interaction, so it sits closer to the latency corner even at some cost/quality tradeoff.' },
  { key: 'batch', label: 'Batch analytics job', quality: 80, latency: 15, cost: 70, desc: 'Latency barely matters -- runs overnight. Free to prioritize quality and cost over speed.' },
  { key: 'internal', label: 'Internal tool', quality: 35, latency: 40, cost: 85, desc: 'Lower quality floor than a customer-facing feature -- cost efficiency dominates since the audience is small and tolerant.' },
];

/** A three-way tradeoff surface, not a free win -- click a product
 * type to see where it actually sits, since a real-time chat
 * interface and a batch job have genuinely different priorities. */
export default function QualityLatencyCostTriangleDiagram() {
  const t = useVizTokens();
  const reducedMotion = usePrefersReducedMotion();
  const cyc = useAutoCycle(PRODUCTS.length, 3500);
  const color = getConceptColor(t, 'attention');
  const p = PRODUCTS[cyc.value];

  const corners = { quality: { x: 150, y: 20 }, latency: { x: 40, y: 150 }, cost: { x: 260, y: 150 } };
  const dotX = (corners.quality.x * p.quality + corners.latency.x * p.latency + corners.cost.x * p.cost) / (p.quality + p.latency + p.cost);
  const dotY = (corners.quality.y * p.quality + corners.latency.y * p.latency + corners.cost.y * p.cost) / (p.quality + p.latency + p.cost);

  return (
    <VisualizationContainer footer={p.desc}>
      <div style={{ display: 'flex', gap: 5, marginBottom: 10, flexWrap: 'wrap' }}>
        {PRODUCTS.map((x, i) => {
          const isActive = cyc.value === i;
          return (
            <div
              key={x.key}
              onClick={() => cyc.pick(i)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  cyc.pick(i);
                }
              }}
              onMouseEnter={() => cyc.pick(i)}
              style={{
                cursor: 'pointer',
                padding: '0.4rem 0.6rem',
                borderRadius: 7,
                background: isActive ? `${color}18` : t.surfaceAlt,
                border: `1.5px solid ${isActive ? color : t.border}`,
                boxShadow: isActive && !reducedMotion ? `0 0 6px ${color}33` : 'none',
                transition: 'all 0.2s ease',
              }}
            >
              <span style={{ fontSize: 9.5, fontWeight: isActive ? 700 : 500, color: isActive ? color : t.textPrimary }}>{x.label}</span>
            </div>
          );
        })}
      </div>
      <svg width="100%" viewBox="0 0 300 170" style={{ display: 'block' }}>
        <polygon points={`${corners.quality.x},${corners.quality.y} ${corners.latency.x},${corners.latency.y} ${corners.cost.x},${corners.cost.y}`} fill="none" stroke={t.border} strokeWidth={1.5} />
        <text x={corners.quality.x} y={12} textAnchor="middle" fontSize={9} fill={t.textSecondary} fontWeight={600}>Quality</text>
        <text x={corners.latency.x - 5} y={165} textAnchor="middle" fontSize={9} fill={t.textSecondary} fontWeight={600}>Latency</text>
        <text x={corners.cost.x + 5} y={165} textAnchor="middle" fontSize={9} fill={t.textSecondary} fontWeight={600}>Cost</text>
        {!reducedMotion && <Pulse cx={dotX} cy={dotY} r={14} color={color} />}
        <circle cx={dotX} cy={dotY} r={7} fill={`${color}40`} stroke={color} strokeWidth={2.5} style={{ transition: reducedMotion ? 'none' : 'cx 0.3s ease, cy 0.3s ease' }} />
      </svg>
    </VisualizationContainer>
  );
}