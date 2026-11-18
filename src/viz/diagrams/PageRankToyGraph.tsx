import { useVizTokens } from '../../theme/vizTokens';
import { SketchEllipse } from '../../components/notebook/RoughShape';
import Watermark from '../../components/notebook/Watermark';
import { FlowDots } from '../primitives';

/**
 * The 4-node PageRank example graph, drawn by pen.
 * Edges (from the page's worked example): A→B (1/2), A→C (1/2), B→C (1), C→A (1), D→C (1).
 * D has no incoming links.
 */
export default function PageRankToyGraph() {
  const t = useVizTokens();
  const font = "'Kalam', cursive";
  const nodes = {
    A: { x: 110, y: 70 },
    B: { x: 330, y: 70 },
    C: { x: 110, y: 230 },
    D: { x: 330, y: 230 },
  } as const;
  const r = 30;
  const paths = {
    ab: `M ${nodes.A.x + r} ${nodes.A.y} L ${nodes.B.x - r - 2} ${nodes.B.y}`,
    ac: `M ${nodes.A.x - 12} ${nodes.A.y + r - 2} L ${nodes.C.x - 12} ${nodes.C.y - r - 2}`,
    ca: `M ${nodes.C.x + 12} ${nodes.C.y - r + 2} L ${nodes.A.x + 12} ${nodes.A.y + r + 2}`,
    bc: `M ${nodes.B.x - 22} ${nodes.B.y + 22} L ${nodes.C.x + 24} ${nodes.C.y - 20}`,
    dc: `M ${nodes.D.x - r} ${nodes.D.y} L ${nodes.C.x + r + 2} ${nodes.C.y}`,
  };

  const arrow = (d: string, color: string) => (
    <path d={d} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" markerEnd="url(#pr-head)" />
  );
  const label = (x: number, y: number, text: string, color: string, anchor: 'start' | 'middle' | 'end' = 'middle') => (
    <text x={x} y={y} fill={color} fontSize={15} fontFamily={font} fontWeight={700} textAnchor={anchor}>
      {text}
    </text>
  );

  return (
    <figure style={{ margin: '1.5rem 0' }}>
      <svg
        viewBox="0 0 440 300"
        width="100%"
        style={{ display: 'block', maxWidth: 520, margin: '0 auto' }}
        role="img"
        aria-label="Directed graph: A links to B and C, B links to C, C links to A, D links to C. Nothing links to D."
      >
        <defs>
          <marker id="pr-head" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M 0 1 L 10 5 L 0 9 z" fill={t.textPrimary} />
          </marker>
        </defs>

        {/* A → B */}
        {arrow(paths.ab, t.accentSecondary)}
        {label(220, 58, '½', t.accentSecondary)}

        {/* A → C (left line, down) */}
        {arrow(paths.ac, t.accentSecondary)}
        {label(nodes.A.x - 26, 156, '½', t.accentSecondary, 'end')}

        {/* C → A (right line, up) */}
        {arrow(paths.ca, t.accentPurple)}
        {label(nodes.A.x + 26, 156, '1', t.accentPurple, 'start')}

        {/* B → C (diagonal) */}
        {arrow(paths.bc, t.accentPrimary)}
        {label(284, 142, '1', t.accentPrimary, 'start')}

        {/* D → C */}
        {arrow(paths.dc, t.accentWarn)}
        {label(220, 254, '1', t.accentWarn)}

        {Object.entries(paths).map(([key, d]) => (
          <FlowDots key={key} d={d} color={t.accentPrimary} count={1} dur={2.4} r={3} />
        ))}

        {Object.entries(nodes).map(([name, p]) => (
          <g key={name}>
            <SketchEllipse cx={p.x} cy={p.y} width={r * 2} height={r * 2} color={t.textPrimary} id={`pr-${name}`} />
            <text x={p.x} y={p.y + 7} fill={t.textPrimary} fontSize={20} fontFamily={font} fontWeight={700} textAnchor="middle">
              {name}
            </text>
          </g>
        ))}

        <text x={nodes.D.x + r + 8} y={nodes.D.y - r - 8} fill={t.textMuted} fontSize={13} fontFamily={font} textAnchor="end">
          nothing links to D
        </text>
      </svg>
      <figcaption style={{ textAlign: 'center', color: 'var(--nm-text-secondary)' }}>
        Each number is the share of a node's score that flows along that arrow.
      </figcaption>
      <Watermark />
    </figure>
  );
}
