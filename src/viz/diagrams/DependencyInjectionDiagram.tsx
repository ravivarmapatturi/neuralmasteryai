import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, FlowDots, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

const ROUTES = ['GET /conversations', 'POST /conversations', 'DELETE /conversations/{id}'];

/** One dependency (get_current_user), declared once, resolved and shared
 * across every route that needs it -- click the dependency to see which
 * routes actually require it, instead of each handler re-implementing
 * its own auth check. */
export default function DependencyInjectionDiagram() {
  const t = useVizTokens();
  const { value: autoVal, stop } = useAutoCycle(2, 3500, 0);
  const [userHovered, setUserHovered] = useState<boolean | null>(null);
  const hovered = userHovered ?? (autoVal === 0);
  const depColor = getConceptColor(t, 'key');
  const routeColor = getConceptColor(t, 'attention');
  const width = 520;
  const height = 170;
  const depY = 30;
  const depX = width / 2;

  return (
    <VisualizationContainer footer="get_current_user() decodes and validates the JWT/API key ONCE, as a reusable function -- any route that declares Depends(get_current_user) automatically requires valid auth, instead of copy-pasting the same check into every handler.">
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
        <defs>
          <marker id="di-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
            <path d="M0,0 L7,3.5 L0,7 Z" fill={depColor} />
          </marker>
        </defs>
        <g onClick={() => { stop(); setUserHovered(!hovered); }} onMouseEnter={() => { stop(); setUserHovered(true); }} style={{ cursor: 'pointer' }}>
          <rect x={depX - 100} y={depY - 18} width={200} height={36} rx={8} fill={hovered ? `${depColor}30` : t.surfaceAlt} stroke={depColor} strokeWidth={hovered ? 2.5 : 1.5} />
          <text x={depX} y={depY + 5} textAnchor="middle" fontSize={10.5} fontFamily="monospace" fontWeight={700} fill={depColor}>Depends(get_current_user)</text>
        </g>
        {ROUTES.map((r, i) => {
          const x = 70 + i * ((width - 140) / (ROUTES.length - 1));
          const y = 130;
          return (
            <g key={r}>
              <line x1={depX} y1={depY + 18} x2={x} y2={y - 18} stroke={depColor} strokeWidth={hovered ? 2 : 1} opacity={hovered ? 0.9 : 0.35} markerEnd="url(#di-arrow)" />
              {hovered && (
                <FlowDots
                  d={`M ${depX} ${depY + 18} L ${x} ${y - 18}`}
                  color={depColor}
                  count={2}
                  r={2}
                />
              )}
              <rect x={x - 55} y={y - 18} width={110} height={36} rx={7} fill={t.surfaceAlt} stroke={routeColor} strokeWidth={1.5} />
              <text x={x} y={y + 5} textAnchor="middle" fontSize={8.5} fontFamily="monospace" fill={routeColor}>{r}</text>
            </g>
          );
        })}
      </svg>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 4 }}>
        One dependency, resolved and injected into every route that declares it -- this is where authentication actually gets enforced.
      </div>
    </VisualizationContainer>
  );
}
