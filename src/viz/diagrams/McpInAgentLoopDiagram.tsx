import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer } from '../primitives';
import { getConceptColor } from './diagramSystem';
import SketchBox from '../../components/notebook/SketchBox';

const HAND_FONT = "'Kalam', 'Comic Sans MS', cursive";

/** Where MCP sits relative to the agent tool-calling loop -- it's the
 * standardized transport underneath the "act" step, not a
 * replacement for the loop itself. */
export default function McpInAgentLoopDiagram() {
  const t = useVizTokens();
  const color = getConceptColor(t, 'attention');

  return (
    <VisualizationContainer footer="MCP doesn't change how an agent decides to call a tool -- it standardizes HOW that call actually reaches the tool, so the same agent framework works against any MCP-compatible server without bespoke integration code per data source.">
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <SketchBox color={t.border} style={{ flex: 1 }}>
          <div style={{ padding: '0.6rem 0.5rem', background: t.surfaceAlt, textAlign: 'center' }}>
            <span style={{ fontSize: 9.5, fontFamily: HAND_FONT, color: t.textPrimary }}>Agent reasons: &ldquo;I need to call a tool&rdquo;</span>
          </div>
        </SketchBox>
        <span style={{ color: t.textMuted, fontSize: 14 }}>→</span>
        <SketchBox color={color} strokeWidth={2} style={{ flex: 1 }}>
          <div style={{ padding: '0.6rem 0.5rem', background: `${color}18`, textAlign: 'center' }}>
            <span style={{ fontSize: 9.5, fontWeight: 700, fontFamily: HAND_FONT, color }}>MCP: standardized tools/call</span>
          </div>
        </SketchBox>
        <span style={{ color: t.textMuted, fontSize: 14 }}>→</span>
        <SketchBox color={t.border} style={{ flex: 1 }}>
          <div style={{ padding: '0.6rem 0.5rem', background: t.surfaceAlt, textAlign: 'center' }}>
            <span style={{ fontSize: 9.5, fontFamily: HAND_FONT, color: t.textPrimary }}>Result feeds back into the loop</span>
          </div>
        </SketchBox>
      </div>
    </VisualizationContainer>
  );
}
