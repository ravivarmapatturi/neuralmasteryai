import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, useAutoCycle, usePrefersReducedMotion } from '../primitives';
import { getConceptColor } from './diagramSystem';

const STEPS = [
  { key: 'list', label: 'Client → tools/list', desc: 'Discovers what the server offers -- each tool\'s name, description, and inputSchema (a JSON Schema).' },
  { key: 'select', label: 'LLM selects a tool', desc: 'Given the discovered tools and the user\'s prompt, the LLM decides which tool (if any) to call and with what arguments -- this happens client-side, not in the protocol itself.' },
  { key: 'call', label: 'Client → tools/call', desc: '{"name":"get_weather","arguments":{"location":"New York"}} -- the server validates arguments against its own declared inputSchema before executing.' },
  { key: 'result', label: 'Server → result', desc: '{"content":[{"type":"text","text":"..."}],"isError":false} -- content can mix text, image, audio, resource links, and embedded resources in one result.' },
  { key: 'process', label: 'Client processes result', desc: 'The result is fed back to the LLM as the tool\'s output, continuing the conversation/agent loop.' },
];

/** The tools/list → select → tools/call → result cycle -- click a
 * step for the exact message shape or decision happening there. */
export default function ToolCallFlowDiagram() {
  const t = useVizTokens();
  const reducedMotion = usePrefersReducedMotion();
  const cyc = useAutoCycle(STEPS.length, 2500);
  const color = getConceptColor(t, 'attention');
  const s = STEPS[cyc.value];

  return (
    <VisualizationContainer footer={s.desc}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
        {STEPS.map((x, i) => {
          const isActive = cyc.value === i;
          return (
            <div key={x.key} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <div
                onClick={() => cyc.pick(i)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    cyc.pick(i);
                  }
                }}
                onMouseEnter={() => cyc.pick(i)}
                style={{
                  cursor: 'pointer',
                  padding: '0.45rem 0.5rem',
                  borderRadius: 7,
                  background: isActive ? `${color}18` : t.surfaceAlt,
                  border: `1.5px solid ${isActive ? color : t.border}`,
                  boxShadow: isActive && !reducedMotion ? `0 0 6px ${color}33` : 'none',
                  transform: isActive && !reducedMotion ? 'scale(1.04)' : 'scale(1)',
                  transition: 'all 0.2s ease',
                  maxWidth: 100,
                }}
              >
                <span style={{ fontSize: 8, fontWeight: isActive ? 700 : 500, color: isActive ? color : t.textPrimary }}>{x.label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <span
                  style={{
                    color: cyc.value === i && !reducedMotion ? color : t.textMuted,
                    fontSize: 10,
                    fontWeight: cyc.value === i ? 700 : 400,
                    transition: 'color 0.2s ease',
                  }}
                >
                  →
                </span>
              )}
            </div>
          );
        })}
      </div>
    </VisualizationContainer>
  );
}