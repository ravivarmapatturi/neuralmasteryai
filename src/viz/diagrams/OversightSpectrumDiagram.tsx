import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, Pulse, useAutoCycle } from '../primitives';
import { getConceptColor } from './diagramSystem';

const POINTS = [
  {
    key: 'full-review',
    label: 'Full review',
    pos: 5,
    desc: 'Every diff read before it lands, same bar as a human PR. Slowest, but nothing ships unseen -- the right default when the blast radius is wide or hard to reverse (see Loops and Graphs\' reversibility tiers).',
  },
  {
    key: 'spec-driven',
    label: 'Spec-driven',
    pos: 45,
    desc: 'Write and review the spec/plan up front, then let the agent implement against it with less line-by-line scrutiny -- the oversight moves earlier (is this the right plan?) rather than disappearing. A real, named methodology, not a synonym for less rigor.',
  },
  {
    key: 'vibe',
    label: '"Vibe coding"',
    pos: 95,
    desc: 'Andrej Karpathy\'s own description, from the post that coined the term (Feb 2025): "I just see stuff, say stuff, run stuff, and copy-paste stuff, and it mostly works." No diff review -- the agent runs, errors get pasted back in, repeat. Legitimate for a throwaway prototype; the actual risk is using it unchanged once the code has to be correct, not fast.',
  },
];

/** Not a hierarchy where one end is simply "better" -- a real tradeoff
 * between review cost and iteration speed, with the right point on the
 * spectrum set by the same variable Loops and Graphs uses for gates: how
 * reversible and contained the blast radius actually is. */
export default function OversightSpectrumDiagram() {
  const t = useVizTokens();
  const cyc = useAutoCycle(POINTS.length, 3000, 1);
  const selected = POINTS[cyc.value].key;
  const setSelected = (k: string) => cyc.pick(POINTS.findIndex((p) => p.key === k));
  const color = getConceptColor(t, 'attention');
  const active = POINTS[cyc.value];
  const width = 420;
  const trackY = 50;
  const toX = (pos: number) => 30 + (pos / 100) * (width - 60);

  return (
    <VisualizationContainer footer={active.desc}>
      <svg width="100%" viewBox={`0 0 ${width} 100`}>
        <line x1={30} y1={trackY} x2={width - 30} y2={trackY} stroke={t.border} strokeWidth={2} />
        {POINTS.map((p) => {
          const isActive = p.key === selected;
          const x = toX(p.pos);
          return (
            <g
              key={p.key}
              onClick={() => setSelected(p.key)}
              role="button"
              tabIndex={0}
              aria-pressed={isActive}
              aria-label={p.label}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setSelected(p.key);
                }
              }}
              style={{ cursor: 'pointer' }}
            >
              <circle cx={x} cy={trackY} r={isActive ? 10 : 7} fill={isActive ? color : t.surfaceAlt} stroke={color} strokeWidth={2} />
              {isActive && <Pulse cx={x} cy={trackY} r={10} color={color} dur={2} />}
              <text x={x} y={trackY - 18} textAnchor="middle" fontSize={9.5} fontWeight={isActive ? 700 : 500} fill={isActive ? color : t.textSecondary}>
                {p.label}
              </text>
            </g>
          );
        })}
        <text x={30} y={trackY + 30} fontSize={8} fill={t.textMuted}>more oversight, slower</text>
        <text x={width - 30} y={trackY + 30} textAnchor="end" fontSize={8} fill={t.textMuted}>less oversight, faster</text>
      </svg>
    </VisualizationContainer>
  );
}
