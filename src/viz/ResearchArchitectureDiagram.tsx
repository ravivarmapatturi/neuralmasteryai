import { useVizTokens, FONT_FAMILY } from '../theme/vizTokens';
import { VisualizationContainer, usePrefersReducedMotion } from './primitives';

/**
 * The architecture of one paper, drawn as its parts in data-flow order.
 * The part the current step builds is highlighted; parts whose steps are
 * all passed get a check. Clicking a part selects its first step.
 */
export default function ResearchArchitectureDiagram({
  title,
  blocks,
  activeBlock,
  doneBlocks,
  onSelectBlock,
}: {
  title: string;
  blocks: string[];
  activeBlock: number;
  doneBlocks: Set<number>;
  onSelectBlock?: (block: number) => void;
}) {
  const t = useVizTokens();
  const reducedMotion = usePrefersReducedMotion();
  const W = 320;
  const boxH = 40;
  const gap = 22;
  const H = blocks.length * boxH + (blocks.length - 1) * gap + 8;

  return (
    <VisualizationContainer
      title={`${title} architecture`}
      footer={`Data flows top to bottom through ${blocks.length} parts. The highlighted part is "${blocks[activeBlock]}", which the current step builds.`}
    >
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxWidth: W, display: 'block', margin: '0 auto' }} role="img" aria-label={`${title} architecture, current part: ${blocks[activeBlock]}`}>
        <defs>
          <marker id="research-arrow" viewBox="0 0 10 10" refX="5" refY="9" markerWidth="7" markerHeight="7" orient="auto">
            <path d="M0,0 L10,0 L5,10 z" fill={t.edge} />
          </marker>
        </defs>
        {blocks.map((label, i) => {
          const y = 4 + i * (boxH + gap);
          const active = i === activeBlock;
          const done = doneBlocks.has(i);
          return (
            <g
              key={label}
              onClick={onSelectBlock ? () => onSelectBlock(i) : undefined}
              style={{ cursor: onSelectBlock ? 'pointer' : 'default' }}
            >
              {i < blocks.length - 1 && (
                <line x1={W / 2} y1={y + boxH} x2={W / 2} y2={y + boxH + gap - 3} stroke={t.edge} strokeWidth={1.5} markerEnd="url(#research-arrow)" />
              )}
              <rect
                x={40}
                y={y}
                width={W - 80}
                height={boxH}
                rx={8}
                fill={active ? t.accentPrimary : t.nodeFill}
                fillOpacity={active ? 0.22 : 1}
                stroke={active ? t.accentPrimary : t.border}
                strokeWidth={active ? 2.5 : 1}
                style={{ transition: reducedMotion ? undefined : 'fill-opacity 200ms, stroke-width 200ms' }}
              />
              <text x={W / 2} y={y + boxH / 2 + 5} textAnchor="middle" fontFamily={FONT_FAMILY} fontSize={13} fontWeight={active ? 700 : 500} fill={t.textPrimary}>
                {label}
              </text>
              {done && (
                <text x={W - 52} y={y + boxH / 2 + 5} textAnchor="end" fontFamily={FONT_FAMILY} fontSize={13} fill={t.accentPrimary} aria-label="done">
                  ✓
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </VisualizationContainer>
  );
}
