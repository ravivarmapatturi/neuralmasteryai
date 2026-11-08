import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, PillSelect } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

type Shape = 'narrow' | 'monolithic';

const NARROW_TOOLS = ['search_flights', 'search_hotels', 'book_flight', 'book_hotel', 'cancel_booking'];

/** Same overall capability, two decompositions -- one giant do-everything
 * tool the model has to disambiguate internally via a mode/action
 * parameter, vs. several narrow, individually-named tools it can pick
 * between directly. */
export default function NarrowVsMonolithicToolsDiagram() {
  const t = useVizTokens();
  const [shape, setShape] = useState<Shape>('narrow');
  const color = getConceptColor(t, shape === 'narrow' ? 'attention' : 'masked');
  const width = 520;
  const height = 150;

  return (
    <VisualizationContainer
      footer={shape === 'narrow'
        ? 'Each tool has one job — the model picks the right one directly, the same way choosing from a menu of documented functions works.'
        : 'One tool, disambiguated by an internal "action" parameter — the model has to correctly encode intent INSIDE the arguments instead of by choosing the tool itself, which is exactly where ambiguous calls creep in.'}
    >
      <PillSelect<Shape> label="Decomposition" value={shape} onChange={setShape} options={[{ value: 'narrow', label: 'Narrow, composable tools' }, { value: 'monolithic', label: 'One do-everything tool' }]} />
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block', marginTop: 8 }}>
        <defs>
          <marker id="nvmt-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill={color} />
          </marker>
        </defs>
        <rect x={10} y={55} width={70} height={36} rx={7} fill={`${color}18`} stroke={color} strokeWidth={2} />
        <text x={45} y={77} textAnchor="middle" fontSize={10} fontWeight={700} fill={color}>Model</text>
        {shape === 'narrow' ? (
          NARROW_TOOLS.map((tool, i) => {
            const y = 8 + i * 27;
            return (
              <g key={tool}>
                <line x1={80} y1={73} x2={190} y2={y + 12} stroke={color} strokeWidth={1.25} markerEnd="url(#nvmt-arrow)" />
                <rect x={195} y={y} width={150} height={24} rx={5} fill={t.surfaceAlt} stroke={color} strokeWidth={1.25} />
                <text x={270} y={y + 16} textAnchor="middle" fontSize={9} fontFamily="monospace" fill={t.textSecondary}>{tool}</text>
              </g>
            );
          })
        ) : (
          <>
            <line x1={80} y1={73} x2={195} y2={73} stroke={color} strokeWidth={2} markerEnd="url(#nvmt-arrow)" />
            <rect x={200} y={40} width={180} height={66} rx={8} fill={t.surfaceAlt} stroke={color} strokeWidth={1.5} />
            <text x={290} y={62} textAnchor="middle" fontSize={10} fontFamily="monospace" fontWeight={700} fill={t.textSecondary}>manage_travel(</text>
            <text x={290} y={78} textAnchor="middle" fontSize={8} fontFamily="monospace" fill={t.textMuted}>action, resource, params)</text>
            <text x={290} y={95} textAnchor="middle" fontSize={8} fill={t.accentDanger}>which action? which resource?</text>
          </>
        )}
      </svg>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 4 }}>
        Same 5 capabilities, two decompositions.
      </div>
    </VisualizationContainer>
  );
}
