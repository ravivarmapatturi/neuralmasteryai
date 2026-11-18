import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, useAutoCycle } from '../primitives';
import { getConceptColor } from './diagramSystem';

const CARS = [
  { x: 20, w: 40 },
  { x: 70, w: 35 },
  { x: 115, w: 45 },
];

/** Three cars in a scene -- click to compare semantic segmentation
 * (all "car" pixels the same class) against instance segmentation
 * (each car distinguished individually). */
export default function SemanticVsInstanceSegmentationDiagram() {
  const t = useVizTokens();
  const cycle = useAutoCycle(2, 2600, 1);
  const instance = cycle.value === 1;
  const setInstance = (value: boolean) => cycle.pick(value ? 1 : 0);
  const color = getConceptColor(t, 'attention');
  const okColor = t.accentPrimary;
  const colors = [color, t.accentWarn, t.accentPurple];

  return (
    <VisualizationContainer footer={instance ? 'Instance segmentation: each car gets its OWN mask, distinguished from the other two even though they\'re the same class.' : 'Semantic segmentation: every "car" pixel gets the same class label -- the three cars aren\'t distinguished from each other, just labeled as one blob of "car."'}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        <button type="button" onClick={() => setInstance(false)} style={{ flex: 1, padding: '6px 10px', borderRadius: 6, fontSize: 10.5, fontWeight: !instance ? 700 : 500, background: !instance ? `${color}20` : t.surfaceAlt, border: `1.25px solid ${!instance ? color : t.border}`, color: !instance ? color : t.textSecondary, cursor: 'pointer' }}>
          Semantic
        </button>
        <button type="button" onClick={() => setInstance(true)} style={{ flex: 1, padding: '6px 10px', borderRadius: 6, fontSize: 10.5, fontWeight: instance ? 700 : 500, background: instance ? `${color}20` : t.surfaceAlt, border: `1.25px solid ${instance ? color : t.border}`, color: instance ? color : t.textSecondary, cursor: 'pointer' }}>
          Instance
        </button>
      </div>
      <svg width="100%" viewBox="0 0 180 50" style={{ display: 'block' }}>
        <rect x={0} y={0} width={180} height={50} fill={t.surfaceAlt} />
        {CARS.map((c, i) => (
          <rect key={i} x={c.x} y={15} width={c.w} height={20} rx={4} fill={instance ? `${colors[i]}50` : `${okColor}40`} stroke={instance ? colors[i] : okColor} strokeWidth={1.5} />
        ))}
      </svg>
    </VisualizationContainer>
  );
}
