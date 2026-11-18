import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, useAutoCycle, usePrefersReducedMotion } from '../primitives';
import { getConceptColor } from './diagramSystem';

const TYPES = [
  { key: 'tools', label: 'Tools', example: '"run this SQL query", "search this codebase"', desc: 'Functions the model can call to take an action or fetch data -- model-controlled, meaning the LLM discovers and invokes them based on context.' },
  { key: 'resources', label: 'Resources', example: '"the contents of this file", "the current git diff"', desc: 'Readable data the client can pull in directly -- conceptually closer to context than to an action; no side effects.' },
  { key: 'prompts', label: 'Prompts', example: 'a reusable "review this PR for security issues" template', desc: 'Reusable prompt templates the server exposes, so common workflows for that server don\'t need to be re-invented by every client.' },
];

/** The three kinds of capability an MCP server can expose -- click one
 * for a concrete example and what makes it distinct from the other
 * two. */
export default function McpCapabilityTypesDiagram() {
  const t = useVizTokens();
  const reducedMotion = usePrefersReducedMotion();
  const cyc = useAutoCycle(TYPES.length, 3500);
  const color = getConceptColor(t, 'attention');
  const x = TYPES[cyc.value];

  return (
    <VisualizationContainer footer={x.desc}>
      <div style={{ display: 'flex', gap: 5, marginBottom: 10 }}>
        {TYPES.map((y, i) => {
          const isActive = cyc.value === i;
          return (
            <div
              key={y.key}
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
                flex: 1,
                textAlign: 'center',
                padding: '0.5rem 0.5rem',
                borderRadius: 7,
                background: isActive ? `${color}18` : t.surfaceAlt,
                border: `1.5px solid ${isActive ? color : t.border}`,
                boxShadow: isActive && !reducedMotion ? `0 0 8px ${color}33` : 'none',
                transition: 'all 0.2s ease',
              }}
            >
              <span style={{ fontSize: 10.5, fontWeight: isActive ? 700 : 500, color: isActive ? color : t.textPrimary }}>{y.label}</span>
            </div>
          );
        })}
      </div>
      <div style={{ padding: '0.55rem 0.75rem', borderRadius: 7, background: `${color}10`, fontSize: 10, color: t.textSecondary, fontStyle: 'italic' }}>
        e.g. {x.example}
      </div>
    </VisualizationContainer>
  );
}