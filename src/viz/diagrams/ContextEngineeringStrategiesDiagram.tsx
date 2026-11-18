import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, useAutoCycle } from '../primitives';
import { getConceptColor } from './diagramSystem';

const STRATEGIES = [
  {
    key: 'write',
    label: 'Write',
    summary: 'Save information outside the context window for later.',
    detail: 'Scratchpads (a file or state object the agent persists notes/plans to, surviving a context reset) and memories (self-generated notes carried across sessions, the mechanism behind features like ChatGPT memory). The point: information the agent will need again doesn\'t have to stay in the live context the whole time.',
  },
  {
    key: 'select',
    label: 'Select',
    summary: 'Pull only the relevant piece back in when it\'s actually needed.',
    detail: 'From a scratchpad/memory store, from a large document collection (RAG — see Retrieval-Augmented Generation), or from a large tool library (semantic search over tool descriptions so the model only sees the tools relevant to this step, not all of them). Real code agents show this usually means combining several retrieval methods (grep, a knowledge graph, re-ranking), not just one.',
  },
  {
    key: 'compress',
    label: 'Compress',
    summary: 'Keep only the tokens that are actually pulling weight.',
    detail: 'Summarization (recursively condensing a long trajectory — Claude Code auto-compacts once context usage crosses ~95%) and trimming (hard-coded rules that drop older messages or stale tool output on a fixed schedule, no summarization involved).',
  },
  {
    key: 'isolate',
    label: 'Isolate',
    summary: 'Split context across separate execution spaces instead of one growing window.',
    detail: 'Multi-agent systems give each sub-agent its own focused tools and a clean context window, returning only a condensed summary to the parent (see Multi-Agent Systems). Sandboxed environments keep token-heavy objects (images, large file contents) out of the LLM\'s context entirely, letting code operate on them without the model ever having to read the raw bytes.',
  },
];

/** LangChain's write/select/compress/isolate framework for context
 * engineering -- four independent, composable strategies for managing
 * what's actually in an agent's context window, not a sequence. Click one
 * for the concrete techniques underneath it. */
export default function ContextEngineeringStrategiesDiagram() {
  const t = useVizTokens();
  const cyc = useAutoCycle(STRATEGIES.length, 3000, 2);
  const setActive = (k: string) => cyc.pick(STRATEGIES.findIndex((s) => s.key === k));
  const color = getConceptColor(t, 'attention');
  const info = STRATEGIES[cyc.value];

  return (
    <VisualizationContainer footer={info.detail}>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {STRATEGIES.map((s, i) => {
          const isActive = cyc.value === i;
          return (
            <div
              key={s.key}
              onClick={() => setActive(s.key)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActive(s.key); } }}
              onMouseEnter={() => setActive(s.key)}
              style={{ flex: '1 1 130px', cursor: 'pointer', padding: '0.65rem 0.7rem', borderRadius: 8, background: isActive ? `${color}18` : t.surfaceAlt, border: `1.5px solid ${isActive ? color : t.border}` }}
            >
              <div style={{ fontSize: 11.5, fontWeight: 700, color: isActive ? color : t.textPrimary, marginBottom: 3 }}>{s.label}</div>
              <div style={{ fontSize: 8.5, color: t.textMuted, lineHeight: 1.35 }}>{s.summary}</div>
            </div>
          );
        })}
      </div>
    </VisualizationContainer>
  );
}
