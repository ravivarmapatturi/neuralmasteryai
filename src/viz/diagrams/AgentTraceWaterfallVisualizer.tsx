import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, VisualizationHeader, PillSelect } from '../primitives';

type ViewMode = 'trace_spans' | 'cost_attribution';

export default function AgentTraceWaterfallVisualizer() {
  const t = useVizTokens();
  const [view, setView] = useState<ViewMode>('trace_spans');

  return (
    <VisualizationContainer
      title="Agent OpenTelemetry Trace Waterfall & Cost Attribution"
      footer={
        view === 'trace_spans'
          ? 'OpenTelemetry Spans for Agents trace the parent task span into model reasoning turns, tool dispatch spans, and child verification runs with sub-millisecond timestamps.'
          : 'Cost Attribution maps input/output token usage per turn, identifying that Turn 3 tool error recovery accounted for 64% of total turn spend.'
      }
    >
      <VisualizationHeader
        eyebrow="OBSERVABILITY RUNTIME"
        title="Distributed Span Trees & Execution Telemetry"
        description="Inspect how OpenTelemetry span hierarchies capture tool invocations, token velocity, and failure points in multi-step agent runs."
      />

      <div style={{ margin: '0.75rem 0' }}>
        <PillSelect<ViewMode>
          label="Telemetry Lens"
          value={view}
          onChange={setView}
          options={[
            { value: 'trace_spans', label: '1. OpenTelemetry Span Hierarchy' },
            { value: 'cost_attribution', label: '2. Step Token & Cost Attribution' },
          ]}
        />
      </div>

      {view === 'trace_spans' ? (
        <svg viewBox="0 0 680 250" width="100%" role="img" aria-label="OpenTelemetry Span Waterfall">
          {/* Root Span */}
          <rect x={40} y={25} width={600} height={26} rx={4} fill={t.accentPrimary} />
          <text x={50} y={43} fontSize={11} fontWeight={700} fill={t.background}>
            Root: agent.session.solve_issue (3,420ms) · trace_id: 8a4f91b
          </text>

          {/* Child 1: LLM Reasoning */}
          <rect x={70} y={65} width={280} height={24} rx={4} fill={t.accentSecondary} />
          <text x={80} y={81} fontSize={11} fontWeight={600} fill={t.background}>
            llm.generate.plan (1,240ms · 840 tok)
          </text>

          {/* Child 2: Tool Call git_grep */}
          <rect x={110} y={100} width={120} height={24} rx={4} fill={t.surfaceAlt} stroke={t.border} strokeWidth={1} />
          <text x={120} y={116} fontSize={11} fill={t.textPrimary}>
            tool.git_grep (45ms)
          </text>

          {/* Child 3: Tool Call read_file */}
          <rect x={240} y={100} width={140} height={24} rx={4} fill={t.surfaceAlt} stroke={t.border} strokeWidth={1} />
          <text x={250} y={116} fontSize={11} fill={t.textPrimary}>
            tool.read_file (18ms)
          </text>

          {/* Child 4: LLM Generation 2 */}
          <rect x={390} y={135} width={220} height={24} rx={4} fill={t.accentSecondary} />
          <text x={400} y={151} fontSize={11} fontWeight={600} fill={t.background}>
            llm.generate.patch (1,520ms · 1,420 tok)
          </text>

          {/* Child 5: Verification Gate */}
          <rect x={420} y={170} width={180} height={24} rx={4} fill={t.accentTeal} />
          <text x={430} y={186} fontSize={11} fontWeight={600} fill={t.background}>
            sandbox.run_pytest (420ms · exit 0)
          </text>

          {/* Timeline axis */}
          <line x1={40} y1={215} x2={640} y2={215} stroke={t.border} strokeWidth={1} />
          <text x={40} y={235} fontSize={10} fill={t.textSecondary}>0ms</text>
          <text x={340} y={235} fontSize={10} textAnchor="middle" fill={t.textSecondary}>1,700ms</text>
          <text x={640} y={235} fontSize={10} textAnchor="end" fill={t.textSecondary}>3,420ms</text>
        </svg>
      ) : (
        <svg viewBox="0 0 680 250" width="100%" role="img" aria-label="Step Token & Cost Attribution">
          {/* Step 1 */}
          <text x={40} y={45} fontSize={12} fontWeight={700} fill={t.textPrimary}>Step 1: Planning</text>
          <rect x={180} y={32} width={180} height={18} rx={3} fill={t.accentPrimary} />
          <text x={370} y={46} fontSize={11} fill={t.textSecondary}>840 tokens · $0.0025 (18%)</text>

          {/* Step 2 */}
          <text x={40} y={85} fontSize={12} fontWeight={700} fill={t.textPrimary}>Step 2: Exploration</text>
          <rect x={180} y={72} width={90} height={18} rx={3} fill={t.accentSecondary} />
          <text x={280} y={86} fontSize={11} fill={t.textSecondary}>420 tokens · $0.0012 (9%)</text>

          {/* Step 3 */}
          <text x={40} y={125} fontSize={12} fontWeight={700} fill={t.textPrimary}>Step 3: Patch Gen</text>
          <rect x={180} y={112} width={340} height={18} rx={3} fill={t.accentDanger} />
          <text x={530} y={126} fontSize={11} fontWeight={600} fill={t.accentDanger}>2,850 tokens · $0.0089 (64%)</text>

          {/* Step 4 */}
          <text x={40} y={165} fontSize={12} fontWeight={700} fill={t.textPrimary}>Step 4: Verification</text>
          <rect x={180} y={152} width={70} height={18} rx={3} fill={t.accentTeal} />
          <text x={260} y={166} fontSize={11} fill={t.textSecondary}>310 tokens · $0.0009 (7%)</text>

          {/* Summary */}
          <line x1={40} y1={195} x2={640} y2={195} stroke={t.border} strokeWidth={1} />
          <text x={40} y={220} fontSize={12} fontWeight={700} fill={t.textPrimary}>
            Total Session: 4,420 tokens · Cumulative Cost: $0.0135 · Verification: PASSED
          </text>
        </svg>
      )}
    </VisualizationContainer>
  );
}
