import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, VisualizationHeader, PillSelect } from '../primitives';

interface StageInfo {
  id: string;
  label: string;
  focus: string;
  prerequisite: string;
  skipTrap: string;
  runtimePattern: string;
  metrics: { name: string; value: string }[];
}

const STAGES: StageInfo[] = [
  {
    id: 'context',
    label: '1. One Agent & Context',
    focus: 'Curating the exact token working set per turn rather than prompt wordsmithing.',
    prerequisite: 'Python fluency, tool invocation, token budgets.',
    skipTrap: 'Agents spin in execution loops or hallucinatory searches when token history overflows.',
    runtimePattern: 'Dynamic pruning, schema discovery, KV cache reuse.',
    metrics: [
      { name: 'Context Budget', value: '< 16k tokens' },
      { name: 'Irrelevant Chunks', value: '0% in window' },
      { name: 'Failure Mode', value: 'Context anxiety' },
    ],
  },
  {
    id: 'evals',
    label: '2. Tracing & Evals',
    focus: 'Deterministic assertion suites and step-level spans before autonomous loops.',
    prerequisite: 'Predictable single-turn agent execution.',
    skipTrap: 'Prompt edits fix one edge case while quietly breaking three previous tasks.',
    runtimePattern: 'Span attributes, Golden dataset assertion, Judge correlation check.',
    metrics: [
      { name: 'Eval Latency', value: '< 120s / run' },
      { name: 'Regression Gate', value: '100% CI pass' },
      { name: 'Trace Granularity', value: 'Per-tool span' },
    ],
  },
  {
    id: 'mcp',
    label: '3. Model Context Protocol',
    focus: 'Standardized client-server protocol separating tools from core agent orchestration.',
    prerequisite: 'Existing real service boundary (DB, internal API, code search).',
    skipTrap: 'Writing bespoke wrapper scripts for every microservice, creating brittle glue code.',
    runtimePattern: 'JSON-RPC over stdio / SSE with capability negotiation.',
    metrics: [
      { name: 'Tool Def Size', value: '~100 tokens name/desc' },
      { name: 'Schema Fetch', value: 'On-demand loading' },
      { name: 'Interface Contract', value: 'JSON-RPC 2.0' },
    ],
  },
  {
    id: 'inference',
    label: '4. Serving & Inference',
    focus: 'Throughput economics: prefix caching, continuous batching, and KV cache bounds.',
    prerequisite: 'Verified agent workflow with measurable production volume.',
    skipTrap: 'Uncontrolled GPU memory usage causing out-of-memory aborts during multi-turn sessions.',
    runtimePattern: 'Radix trees, PagedAttention, Speculative draft verification.',
    metrics: [
      { name: 'Prefix Cache Hit', value: '> 80% shared prompt' },
      { name: 'TTFT Reduction', value: '3-5x with caching' },
      { name: 'Memory per Request', value: 'Strictly bounded' },
    ],
  },
];

export default function AiEngineeringLearningLadder() {
  const t = useVizTokens();
  const [activeStageId, setActiveStageId] = useState<string>('context');

  const current = STAGES.find(s => s.id === activeStageId) ?? STAGES[0];
  const activeIndex = STAGES.findIndex(s => s.id === activeStageId);

  return (
    <VisualizationContainer
      title="The AI Engineering Learning Progression"
      footer={`Stage ${activeIndex + 1} of 4: ${current.focus} If skipped: ${current.skipTrap}`}
    >
      <VisualizationHeader
        eyebrow="SYSTEM ARCHITECTURE"
        title="What to Master Before Moving to the Next Layer"
        description="Select a discipline to inspect the architectural responsibilities, key metrics, and the failure mode that occurs when teams skip ahead."
      />

      <div style={{ margin: '0.75rem 0' }}>
        <PillSelect<string>
          label="Learning Stage"
          options={STAGES.map(s => ({ value: s.id, label: s.label }))}
          value={activeStageId}
          onChange={setActiveStageId}
        />
      </div>

      <svg viewBox="0 0 680 240" width="100%" role="img" aria-label={`AI Engineering Stage: ${current.label}`}>
        {/* Layer stack visualization */}
        {STAGES.map((s, idx) => {
          const isCurrent = idx === activeIndex;
          const isPassed = idx < activeIndex;
          const y = 20 + idx * 48;
          return (
            <g key={s.id}>
              {/* Layer bar */}
              <rect
                x={20}
                y={y}
                width={260}
                height={40}
                rx={6}
                fill={isCurrent ? t.accentPrimary : isPassed ? t.surfaceAlt : t.surface}
                stroke={isCurrent ? t.accentPrimary : t.border}
                strokeWidth={isCurrent ? 2 : 1}
              />
              <text
                x={36}
                y={y + 24}
                fontSize={13}
                fontWeight={isCurrent ? 700 : 500}
                fill={isCurrent ? t.background : t.textPrimary}
              >
                {s.label}
              </text>
              {/* Connection indicator */}
              {idx < STAGES.length - 1 && (
                <line
                  x1={150}
                  y1={y + 40}
                  x2={150}
                  y2={y + 48}
                  stroke={t.border}
                  strokeWidth={2}
                  strokeDasharray="2 2"
                />
              )}
            </g>
          );
        })}

        {/* Detail Panel */}
        <rect
          x={300}
          y={20}
          width={360}
          height={184}
          rx={8}
          fill={t.surface}
          stroke={t.border}
          strokeWidth={1.5}
        />

        <text x={318} y={46} fontSize={15} fontWeight={700} fill={t.textPrimary}>
          {current.label}
        </text>

        <text x={318} y={72} fontSize={12} fill={t.textSecondary}>
          Pattern:
        </text>
        <text x={368} y={72} fontSize={12} fontWeight={600} fill={t.textPrimary}>
          {current.runtimePattern}
        </text>

        <text x={318} y={96} fontSize={12} fill={t.accentDanger}>
          Trap if skipped:
        </text>
        <foreignObject x={318} y={102} width={326} height={44}>
          <div style={{ fontSize: '11px', color: t.textSecondary, lineHeight: '1.3' }}>
            {current.skipTrap}
          </div>
        </foreignObject>

        {/* Metrics Grid */}
        <line x1={318} y1={152} x2={644} y2={152} stroke={t.border} strokeWidth={1} />
        {current.metrics.map((m, mIdx) => {
          const mx = 318 + mIdx * 110;
          return (
            <g key={m.name}>
              <text x={mx} y={170} fontSize={10} fill={t.textSecondary}>
                {m.name}
              </text>
              <text x={mx} y={190} fontSize={12} fontWeight={700} fill={t.accentTeal}>
                {m.value}
              </text>
            </g>
          );
        })}
      </svg>
    </VisualizationContainer>
  );
}
