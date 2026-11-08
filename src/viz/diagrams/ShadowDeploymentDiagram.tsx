import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer } from '../primitives';
import { getConceptColor } from './diagramSystem';

/** Every request hits BOTH models -- only the old model's response ever
 * reaches the user, the new model's prediction is logged silently. */
export default function ShadowDeploymentDiagram() {
  const t = useVizTokens();
  const oldColor = getConceptColor(t, 'query');
  const newColor = getConceptColor(t, 'attention');
  const width = 480;

  return (
    <VisualizationContainer footer="The new model's prediction is logged and compared offline -- it can NEVER affect what the user sees, which is exactly what makes this the safest possible way to validate against real production traffic.">
      <svg width="100%" viewBox={`0 0 ${width} 130`} style={{ display: 'block' }}>
        <defs>
          <marker id="shadow-arrow-old" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0,0 L7,3.5 L0,7 Z" fill={oldColor} /></marker>
          <marker id="shadow-arrow-new" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0,0 L7,3.5 L0,7 Z" fill={newColor} /></marker>
        </defs>
        <rect x={10} y={50} width={70} height={30} rx={6} fill={t.surfaceAlt} stroke={t.textPrimary} strokeWidth={1.5} />
        <text x={45} y={69} textAnchor="middle" fontSize={9} fill={t.textPrimary}>Request</text>

        <line x1={80} y1={55} x2={154} y2={27} stroke={oldColor} strokeWidth={2} markerEnd="url(#shadow-arrow-old)" />
        <line x1={80} y1={75} x2={154} y2={98} stroke={newColor} strokeWidth={2} markerEnd="url(#shadow-arrow-new)" />

        <rect x={160} y={8} width={90} height={30} rx={6} fill={`${oldColor}20`} stroke={oldColor} strokeWidth={1.5} />
        <text x={205} y={27} textAnchor="middle" fontSize={9} fill={oldColor}>Old model</text>
        <rect x={160} y={85} width={90} height={30} rx={6} fill={`${newColor}20`} stroke={newColor} strokeWidth={1.5} />
        <text x={205} y={104} textAnchor="middle" fontSize={9} fill={newColor}>New model</text>

        <line x1={250} y1={23} x2={330} y2={23} stroke={oldColor} strokeWidth={2} markerEnd="url(#shadow-arrow-old)" />
        <text x={290} y={16} textAnchor="middle" fontSize={7.5} fill={oldColor}>returned to user</text>
        <text x={346} y={27} fontSize={9} fill={t.accentPrimary} fontWeight={700}>User</text>

        <line x1={250} y1={100} x2={295} y2={100} stroke={newColor} strokeWidth={1.5} strokeDasharray="3 2" markerEnd="url(#shadow-arrow-new)" />
        <text x={309} y={104} fontSize={8} fill={newColor}>logged only</text>
      </svg>
    </VisualizationContainer>
  );
}
