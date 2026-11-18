import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, Slider, useAutoCycle, usePrefersReducedMotion } from '../primitives';
import { Pulse } from '../primitives/LiveFlow';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

const LEVELS = [
  { label: 'Read-only', desc: 'Can look things up (search, read files, query a DB) but cannot change anything. Lowest blast radius if it reasons badly.' },
  { label: 'Human approves each action', desc: 'Proposes an action, a human confirms before it executes -- catches bad actions before they happen, at the cost of throughput.' },
  { label: 'Human approves risky actions only', desc: 'Low-risk actions (read, draft, search) execute automatically; anything destructive or hard-to-reverse (delete, deploy, pay) still needs sign-off.' },
  { label: 'Fully autonomous', desc: 'Executes any action in its toolset without confirmation. Highest throughput, highest blast radius if something goes wrong -- reserved for well-tested, bounded toolsets.' },
];

/** Autonomy isn't a single on/off switch -- it's a slider, and scoping
 * WHERE on it an agent sits (per tool, not just globally) is as much a
 * design decision as which architecture it runs. */
export default function AutonomySpectrumDiagram() {
  const t = useVizTokens();
  const reducedMotion = usePrefersReducedMotion();
  const cyc = useAutoCycle(LEVELS.length, 3000);
  const level = cyc.value;
  const color = getConceptColor(t, level === 3 ? 'masked' : 'attention');
  const width = 480;

  return (
    <VisualizationContainer footer={LEVELS[level].desc}>
      <Slider
        label={`Autonomy level: ${LEVELS[level].label}`}
        min={0}
        max={3}
        step={1}
        value={level}
        onChange={(v) => cyc.pick(v)}
      />
      <svg width="100%" viewBox={`0 0 ${width} 50`} style={{ display: 'block' }}>
        <line x1={20} y1={25} x2={width - 20} y2={25} stroke={t.border} strokeWidth={4} strokeLinecap="round" />
        <line
          x1={20}
          y1={25}
          x2={20 + (level / 3) * (width - 40)}
          y2={25}
          stroke={color}
          strokeWidth={4}
          strokeLinecap="round"
          style={{ transition: reducedMotion ? 'none' : 'x2 0.3s ease' }}
        />
        {LEVELS.map((_, i) => {
          const x = 20 + (i / 3) * (width - 40);
          const isActive = level === i;
          return (
            <g key={i}>
              {isActive && !reducedMotion && <Pulse cx={x} cy={25} r={14} color={color} />}
              <circle
                cx={x}
                cy={25}
                r={isActive ? 9 : 6}
                fill={isActive ? color : t.surfaceAlt}
                stroke={color}
                strokeWidth={1.5}
                style={{ cursor: 'pointer' }}
                onClick={() => cyc.pick(i)}
              />
            </g>
          );
        })}
      </svg>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 4 }}>
        More autonomy = less friction, higher blast radius when the agent is wrong -- independent of how capable the underlying model is.
      </div>
    </VisualizationContainer>
  );
}