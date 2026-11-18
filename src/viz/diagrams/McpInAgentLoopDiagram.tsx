import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, useAutoCycle, usePrefersReducedMotion } from '../primitives';
import { getConceptColor } from './diagramSystem';
import SketchBox from '../../components/notebook/SketchBox';

const HAND_FONT = "'Kalam', 'Comic Sans MS', cursive";

const STEPS = [
  { label: 'Agent reasons: \u201cI need to call a tool\u201d', mcp: false },
  { label: 'MCP: standardized tools/call', mcp: true },
  { label: 'Result feeds back into the loop', mcp: false },
];

/** Where MCP sits relative to the agent tool-calling loop -- it's the
 * standardized transport underneath the "act" step, not a
 * replacement for the loop itself. */
export default function McpInAgentLoopDiagram() {
  const t = useVizTokens();
  const reducedMotion = usePrefersReducedMotion();
  const cyc = useAutoCycle(STEPS.length, 2500);
  const color = getConceptColor(t, 'attention');

  return (
    <VisualizationContainer footer="MCP doesn't change how an agent decides to call a tool -- it standardizes HOW that call actually reaches the tool, so the same agent framework works against any MCP-compatible server without bespoke integration code per data source.">
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {STEPS.map((step, i) => {
          const isActive = cyc.value === i;
          const boxColor = step.mcp ? color : isActive ? t.textPrimary : t.border;
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', flex: 1, gap: 6 }}>
              <div
                onClick={() => cyc.pick(i)}
                style={{
                  flex: 1,
                  cursor: 'pointer',
                  transform: isActive && !reducedMotion ? 'scale(1.02)' : 'scale(1)',
                  transition: 'transform 0.2s ease',
                }}
              >
                <SketchBox color={boxColor} strokeWidth={isActive || step.mcp ? 2 : 1.2}>
                  <div
                    style={{
                      padding: '0.6rem 0.5rem',
                      background: step.mcp ? `${color}18` : isActive ? `${color}0c` : t.surfaceAlt,
                      textAlign: 'center',
                    }}
                  >
                    <span
                      style={{
                        fontSize: 9.5,
                        fontFamily: HAND_FONT,
                        fontWeight: isActive || step.mcp ? 700 : 400,
                        color: step.mcp ? color : isActive ? t.textPrimary : t.textSecondary,
                      }}
                    >
                      {step.label}
                    </span>
                  </div>
                </SketchBox>
              </div>
              {i < STEPS.length - 1 && (
                <span
                  style={{
                    color: cyc.value === i && !reducedMotion ? color : t.textMuted,
                    fontSize: 14,
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