import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, useAutoCycle } from '../primitives';
import { getConceptColor } from './diagramSystem';

const FRAMEWORKS = [
  {
    key: 'smolagents',
    label: 'smolagents',
    axis: 'Code-as-action',
    desc: 'HuggingFace\'s framework: the agent writes and executes real Python as its action, rather than emitting a JSON tool call that gets dispatched to a function. Its own README frames the distinction precisely: "agents being used to write code" (most frameworks) vs. "agents that think in code" (smolagents). Sandboxed execution via Docker, E2B, or Modal for the obvious reason.',
  },
  {
    key: 'maf',
    label: 'Microsoft Agent Framework',
    axis: 'Production successor to AutoGen',
    desc: 'AutoGen is officially in maintenance mode as of this writing -- Microsoft\'s own README directs new users to Microsoft Agent Framework (MAF) instead. MAF adds graph-based workflow patterns (sequential, concurrent, handoff, group), checkpointing, OpenTelemetry observability, and both Python and .NET support -- built for the "prototype to production" gap specifically.',
  },
  {
    key: 'adk',
    label: 'Google ADK',
    axis: 'Graph-based workflow runtime',
    desc: 'Code-first Python (and Java/Kotlin/Go/TypeScript) framework built around an explicit Workflow graph -- routing, fan-out/fan-in, loops, retry, and nested workflows as first-class primitives, plus a Task API for structured agent-to-agent delegation. Model-agnostic but optimized for Gemini; ships a local dev UI (`adk web`) for testing agents interactively.',
  },
  {
    key: 'dspy',
    label: 'DSPy',
    axis: 'Programs, not prompts',
    desc: 'A different axis entirely from the other four -- DSPy isn\'t about orchestrating multi-step control flow, it\'s about not hand-writing prompts at all. Declare a typed Signature (inputs/outputs), pick a Module (Predict, ChainOfThought, ReAct), and an optimizer ("teleprompter") tunes the actual prompt text against a metric on real training data -- the prompt becomes a compiled artifact, not something you edit by hand.',
  },
  {
    key: 'llamaindex-agent',
    label: 'LlamaIndex (as an agent framework)',
    axis: 'Data-connected agents',
    desc: 'Beyond the RAG/indexing role described above, LlamaIndex ships real agent classes -- FunctionAgent for straightforward tool-calling, AgentWorkflow for coordinating multiple agents, ReActAgent and CodeActAgent for different reasoning styles. The natural fit when an agent\'s main job is connecting to and reasoning over many data sources, since that\'s the same strength the RAG side of the library already has.',
  },
];

/** The point isn't "which is best" -- it's that these five sit on genuinely
 * different axes from each other and from LangGraph/CrewAI above: one
 * changes what an action even is (code vs. JSON tool call), one is a
 * maintenance-mode-to-production migration, two are graph-based runtimes
 * from different ecosystems, and one isn't about orchestration at all. */
export default function AgentFrameworkAxisDiagram() {
  const t = useVizTokens();
  const { value: autoIdx, pick: setAutoIdx, stop } = useAutoCycle(FRAMEWORKS.length, 3500, 0);
  const color = getConceptColor(t, 'attention');
  const f = FRAMEWORKS[autoIdx];
  const active = f.key;

  return (
    <VisualizationContainer footer={f.desc}>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {FRAMEWORKS.map((x, i) => {
          const isActive = active === x.key;
          return (
            <div
              key={x.key}
              onClick={() => {
                stop();
                setAutoIdx(i);
              }}
              onMouseEnter={() => {
                stop();
                setAutoIdx(i);
              }}
              role="button"
              tabIndex={0}
              aria-pressed={isActive}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  stop();
                  setAutoIdx(i);
                }
              }}
              style={{
                cursor: 'pointer',
                padding: '0.5rem 0.7rem',
                borderRadius: 8,
                background: isActive ? `${color}18` : t.surfaceAlt,
                border: `1.5px solid ${isActive ? color : t.border}`,
                minWidth: 130,
              }}
            >
              <div style={{ fontSize: 10, fontWeight: 700, color: isActive ? color : t.textPrimary }}>{x.label}</div>
              <div style={{ fontSize: 8.5, color: t.textMuted, marginTop: 2 }}>{x.axis}</div>
            </div>
          );
        })}
      </div>
    </VisualizationContainer>
  );
}
