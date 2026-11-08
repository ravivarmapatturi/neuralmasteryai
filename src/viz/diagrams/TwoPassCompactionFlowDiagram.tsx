import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, VisualizationHeader, PillSelect } from '../primitives';

type StageKey = 'raw' | 'pass1' | 'pass2';

interface Stage {
  key: StageKey;
  label: string;
  totalTokens: number;
  toolLogTokens: number;
  reductionPct: number;
  description: string;
  breakdown: { component: string; tokens: number; sharePct: number }[];
}

const STAGES: Record<StageKey, Stage> = {
  raw: {
    key: 'raw',
    label: '1. Raw Uncompacted',
    totalTokens: 551,
    toolLogTokens: 430,
    reductionPct: 0,
    description: 'Raw conversational history with 6 turns of verbose compiler logs, full tracebacks, and terminal stdout flooding the window.',
    breakdown: [
      { component: 'System Instructions', tokens: 15, sharePct: 2.7 },
      { component: 'User Prompt', tokens: 12, sharePct: 2.2 },
      { component: 'Tool Output Traces', tokens: 430, sharePct: 78.0 },
      { component: 'Agent Thinking & Calls', tokens: 94, sharePct: 17.1 },
    ],
  },
  pass1: {
    key: 'pass1',
    label: '2. Pass 1: Old Tool Pruning',
    totalTokens: 184,
    toolLogTokens: 63,
    reductionPct: 66.6,
    description: 'Historical tool runs (> 2 turns old) are stripped of verbose output and replaced with compact semantic status markers (<tool_status passed="true" />).',
    breakdown: [
      { component: 'System Instructions', tokens: 15, sharePct: 8.2 },
      { component: 'User Prompt', tokens: 12, sharePct: 6.5 },
      { component: 'Tool Output Traces', tokens: 63, sharePct: 34.2 },
      { component: 'Agent Thinking & Calls', tokens: 94, sharePct: 51.1 },
    ],
  },
  pass2: {
    key: 'pass2',
    label: '3. Pass 2: Final Compaction',
    totalTokens: 76,
    toolLogTokens: 18,
    reductionPct: 86.2,
    description: 'Recent verbose tool logs are truncated to the essential exit code, error line, and assertion result. 100% of user constraints preserved.',
    breakdown: [
      { component: 'System Instructions', tokens: 15, sharePct: 19.7 },
      { component: 'User Prompt', tokens: 12, sharePct: 15.8 },
      { component: 'Tool Output Traces', tokens: 18, sharePct: 23.7 },
      { component: 'Agent Thinking & Calls', tokens: 31, sharePct: 40.8 },
    ],
  },
};

export default function TwoPassCompactionFlowDiagram() {
  const t = useVizTokens();
  const [selected, setSelected] = useState<StageKey>('pass2');
  const stage = STAGES[selected];

  return (
    <VisualizationContainer
      title="Two-Pass History Compaction Engine"
      footer="Two-pass compaction collapses verbose historical terminal outputs first, preserving 100% of system instructions and user constraints while reclaiming over 85% of token budget."
    >
      <VisualizationHeader
        eyebrow="CONTEXT OPTIMIZATION"
        title="Two-Pass Compaction Pipeline"
        description="Inspect how the harness purges historical compiler output and truncates recent logs before dispatching the next model inference call."
      />

      <div style={{ margin: '0.75rem 0' }}>
        <PillSelect<StageKey>
          label="Compaction Stage"
          value={selected}
          onChange={setSelected}
          options={[
            { value: 'raw', label: STAGES.raw.label },
            { value: 'pass1', label: STAGES.pass1.label },
            { value: 'pass2', label: STAGES.pass2.label },
          ]}
        />
      </div>

      <svg viewBox="0 0 680 240" width="100%" role="img" aria-label="Two-Pass Compaction Pipeline Diagram">
        <defs>
          <marker id="compaction-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 Z" fill={t.accentPrimary} />
          </marker>
        </defs>
        {/* Token Budget Bar Container */}
        <rect x={30} y={30} width={620} height={44} rx={6} fill={t.surfaceAlt} stroke={t.border} strokeWidth={1} />
        
        {/* Dynamic Proportion Bars */}
        {(() => {
          let currentX = 30;
          const colors = [t.accentPrimary, t.accentSecondary, t.accentWarn, t.accentTeal];
          return stage.breakdown.map((item, idx) => {
            const barWidth = Math.max(4, (item.tokens / 551) * 620);
            const rect = (
              <g key={item.component}>
                <rect
                  x={currentX}
                  y={30}
                  width={barWidth}
                  height={44}
                  rx={idx === 0 ? 6 : 0}
                  fill={colors[idx % colors.length]}
                  opacity={0.85}
                />
              </g>
            );
            currentX += barWidth;
            return rect;
          });
        })()}

        {/* Labels under the bar */}
        <text x={30} y={96} fontSize={12} fontWeight={700} fill={t.textPrimary}>
          Total Budget: {stage.totalTokens} tokens
        </text>
        <text x={650} y={96} textAnchor="end" fontSize={12} fontWeight={700} fill={selected === 'pass2' ? t.accentTeal : t.accentPrimary}>
          {stage.reductionPct > 0 ? `${stage.reductionPct}% Reduction` : 'Uncompressed 100%'}
        </text>

        {/* 3 Step Flow Diagram */}
        <g transform="translate(30, 120)">
          {/* Step 1 Box */}
          <rect
            x={0}
            y={0}
            width={180}
            height={70}
            rx={8}
            fill={selected === 'raw' ? `${t.accentPrimary}18` : t.surface}
            stroke={selected === 'raw' ? t.accentPrimary : t.border}
            strokeWidth={selected === 'raw' ? 2 : 1}
          />
          <text x={90} y={24} textAnchor="middle" fontSize={12} fontWeight={700} fill={t.textPrimary}>1. Raw Context</text>
          <text x={90} y={44} textAnchor="middle" fontSize={11} fill={t.textSecondary}>551 Tokens</text>
          <text x={90} y={60} textAnchor="middle" fontSize={10} fill={t.accentWarn}>Tool Logs: 78%</text>

          {/* Arrow 1 */}
          <line x1={188} y1={35} x2={224} y2={35} stroke={t.accentPrimary} strokeWidth={2} markerEnd="url(#compaction-arrow)" />

          {/* Step 2 Box */}
          <rect
            x={230}
            y={0}
            width={180}
            height={70}
            rx={8}
            fill={selected === 'pass1' ? `${t.accentPrimary}18` : t.surface}
            stroke={selected === 'pass1' ? t.accentPrimary : t.border}
            strokeWidth={selected === 'pass1' ? 2 : 1}
          />
          <text x={320} y={24} textAnchor="middle" fontSize={12} fontWeight={700} fill={t.textPrimary}>2. Pass 1: Prune Old</text>
          <text x={320} y={44} textAnchor="middle" fontSize={11} fill={t.textSecondary}>184 Tokens</text>
          <text x={320} y={60} textAnchor="middle" fontSize={10} fill={t.accentPrimary}>Prunes &gt; 2 turns ago</text>

          {/* Arrow 2 */}
          <line x1={418} y1={35} x2={454} y2={35} stroke={t.accentPrimary} strokeWidth={2} markerEnd="url(#compaction-arrow)" />

          {/* Step 3 Box */}
          <rect
            x={460}
            y={0}
            width={180}
            height={70}
            rx={8}
            fill={selected === 'pass2' ? `${t.accentTeal}18` : t.surface}
            stroke={selected === 'pass2' ? t.accentTeal : t.border}
            strokeWidth={selected === 'pass2' ? 2 : 1}
          />
          <text x={550} y={24} textAnchor="middle" fontSize={12} fontWeight={700} fill={selected === 'pass2' ? t.accentTeal : t.textPrimary}>
            3. Pass 2: Truncate
          </text>
          <text x={550} y={44} textAnchor="middle" fontSize={11} fill={t.textSecondary}>76 Tokens</text>
          <text x={550} y={60} textAnchor="middle" fontSize={10} fill={t.accentTeal}>86.2% Compaction</text>
        </g>
      </svg>

      <div style={{ marginTop: '0.75rem', padding: '0.75rem', borderRadius: 8, background: t.surfaceAlt, border: `1px solid ${t.border}` }}>
        <p style={{ margin: 0, fontSize: 12, color: t.textSecondary }}>
          <strong style={{ color: t.textPrimary }}>{stage.label}:</strong> {stage.description}
        </p>
      </div>
    </VisualizationContainer>
  );
}
