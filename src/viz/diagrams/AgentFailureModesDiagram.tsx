import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, useAutoCycle, usePrefersReducedMotion } from '../primitives';
import { DIAGRAM_TYPE } from './diagramSystem';

const MODES = [
  { label: 'Tool misuse', layer: 'Tool design', desc: 'Ambiguous names/schemas lead the model to call the wrong tool, or call the right tool with malformed arguments.' },
  { label: 'Runaway loops', layer: 'Loop structure', desc: 'The agent keeps acting without converging on an answer -- no stopping condition, or a plan that never actually gets closer to done.' },
  { label: 'Context bloat', layer: 'Memory management', desc: 'Tool results and history silently fill the context window until older, still-relevant information gets truncated or crowded out.' },
  { label: 'Coordination conflicts', layer: 'Coordination pattern', desc: 'Multiple agents reach contradictory conclusions or edit the same shared state without a resolution strategy.' },
];

/** Each failure mode is traced to the specific layer that causes it --
 * the point being these are NOT one generic "agents are unreliable"
 * problem, they're four separate problems with four separate fixes. */
export default function AgentFailureModesDiagram() {
  const t = useVizTokens();
  const reducedMotion = usePrefersReducedMotion();
  const cyc = useAutoCycle(MODES.length, 3000);
  const active = cyc.value;
  const color = t.accentDanger;
  const width = 520;

  return (
    <VisualizationContainer footer={MODES[active].desc}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {MODES.map((m, i) => {
          const isActive = active === i;
          return (
            <div
              key={m.label}
              onClick={() => cyc.pick(i)}
              onMouseEnter={() => cyc.pick(i)}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '8px 12px',
                borderRadius: 6,
                cursor: 'pointer',
                background: isActive ? `${color}18` : t.surfaceAlt,
                border: `1.5px solid ${isActive ? color : t.border}`,
                boxShadow: isActive && !reducedMotion ? `0 0 8px ${color}33` : 'none',
                transform: isActive && !reducedMotion ? 'translateX(3px)' : 'none',
                transition: 'all 0.2s ease',
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 700, color: isActive ? color : t.textSecondary }}>{m.label}</span>
              <span style={{ fontSize: 10, fontFamily: 'monospace', color: isActive ? color : t.textMuted }}>→ {m.layer}</span>
            </div>
          );
        })}
      </div>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 8, maxWidth: width }}>
        Four separate failure modes, four separate root layers -- not one generic "agents are unreliable" problem.
      </div>
    </VisualizationContainer>
  );
}