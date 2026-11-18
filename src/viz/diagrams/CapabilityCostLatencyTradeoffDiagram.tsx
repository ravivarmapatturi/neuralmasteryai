import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE } from './diagramSystem';

const MODELS = [
  { name: 'Small (7-8B)', capability: 0.55, cost: 0.15, latency: 0.15 },
  { name: 'Mid (30-70B)', capability: 0.78, cost: 0.45, latency: 0.45 },
  { name: 'Frontier (400B+)', capability: 0.95, cost: 0.9, latency: 0.85 },
];

/** Model-size choice as a scatter in capability-vs-cost space, dot size
 * encoding latency -- click a model to see its actual position rather
 * than just asserting "bigger is slower and pricier." */
export default function CapabilityCostLatencyTradeoffDiagram() {
  const t = useVizTokens();
  const cycle = useAutoCycle(MODELS.length, 3000, 1);
  const selected = cycle.value;
  const setSelected = cycle.pick;
  const color = t.accentPrimary;
  const width = 460;
  const height = 200;
  const left = 50, right = width - 20, top = 15, bottom = 160;
  const xFor = (c: number) => left + c * (right - left);
  const yFor = (cap: number) => bottom - cap * (bottom - top);

  return (
    <VisualizationContainer footer={`${MODELS[selected].name}: capability ${(MODELS[selected].capability * 100).toFixed(0)}%, cost ${(MODELS[selected].cost * 100).toFixed(0)}% of frontier, latency ${(MODELS[selected].latency * 100).toFixed(0)}% of frontier (dot size).`}>
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
        <line x1={left} y1={bottom} x2={right} y2={bottom} stroke={t.border} strokeWidth={1} />
        <line x1={left} y1={top} x2={left} y2={bottom} stroke={t.border} strokeWidth={1} />
        <text x={(left + right) / 2} y={height - 4} textAnchor="middle" fontSize={9} fill={t.textMuted}>cost / request →</text>
        <text x={14} y={(top + bottom) / 2} textAnchor="middle" fontSize={9} fill={t.textMuted} transform={`rotate(-90 14 ${(top + bottom) / 2})`}>capability →</text>
        {MODELS.map((m, i) => {
          const isSelected = selected === i;
          const r = 8 + m.latency * 16;
          return (
            <g key={m.name} onClick={() => setSelected(i)} onMouseEnter={() => setSelected(i)} style={{ cursor: 'pointer' }}>
              <circle cx={xFor(m.cost)} cy={yFor(m.capability)} r={r} fill={isSelected ? `${color}40` : `${color}18`} stroke={color} strokeWidth={isSelected ? 2.5 : 1.5} />
              <text x={xFor(m.cost)} y={yFor(m.capability) - r - 6} textAnchor="middle" fontSize={9} fontWeight={isSelected ? 700 : 400} fill={isSelected ? color : t.textMuted}>{m.name}</text>
            </g>
          );
        })}
      </svg>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 4 }}>
        Dot size = latency. Click a model — there's no free point in this space, only which axis you're willing to trade.
      </div>
    </VisualizationContainer>
  );
}
