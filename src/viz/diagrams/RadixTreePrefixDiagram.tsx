import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, VisualizationHeader, PillSelect } from '../primitives';

type CacheMode = 'shared_system' | 'branch_conversation';

export default function RadixTreePrefixDiagram() {
  const t = useVizTokens();
  const [mode, setMode] = useState<CacheMode>('shared_system');

  return (
    <VisualizationContainer
      title="Radix Tree KV Cache Prefix Caching"
      footer={
        mode === 'shared_system'
          ? 'Prefix Matching: Request A and Request B share the 1,024-token system prompt. The engine matches the Radix node, reuses KV pages, and prefills only unique suffixes.'
          : 'Branching Conversations: Multi-turn agent turns reuse both system prompt and turn 1 context, avoiding redundant prefill computation.'
      }
    >
      <VisualizationHeader
        eyebrow="KV CACHE REUSE"
        title="Radix Tree (Compressed Trie) Memory Hierarchy"
        description="Inspect how vLLM and SGLang store attention key-value blocks in a prefix tree, avoiding recomputation across shared prompt prefixes."
      />

      <div style={{ margin: '0.75rem 0' }}>
        <PillSelect<CacheMode>
          label="Cache Topology"
          value={mode}
          onChange={setMode}
          options={[
            { value: 'shared_system', label: '1. Shared System Prompt (1,024 tok)' },
            { value: 'branch_conversation', label: '2. Multi-Turn Branching Conversation' },
          ]}
        />
      </div>

      <svg viewBox="0 0 680 250" width="100%" role="img" aria-label="Radix Tree Prefix Cache Diagram">
        <defs>
          <marker id="rt-arrow-primary" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
            <path d="M0,0 L7,3.5 L0,7 Z" fill={t.accentPrimary} />
          </marker>
          <marker id="rt-arrow-teal" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
            <path d="M0,0 L7,3.5 L0,7 Z" fill={t.accentTeal} />
          </marker>
          <marker id="rt-arrow-secondary" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
            <path d="M0,0 L7,3.5 L0,7 Z" fill={t.accentSecondary} />
          </marker>
        </defs>

        {/* Root Node */}
        <circle cx={340} cy={25} r={14} fill={t.surface} stroke={t.border} strokeWidth={2} />
        <text x={340} y={29} textAnchor="middle" fontSize={10} fontWeight={700} fill={t.textPrimary}>Root</text>

        <line x1={340} y1={40} x2={340} y2={63} stroke={t.accentPrimary} strokeWidth={2} markerEnd="url(#rt-arrow-primary)" />

        {/* Level 1: System Prompt Node */}
        <rect x={215} y={65} width={250} height={50} rx={8} fill={t.surfaceAlt} stroke={t.accentPrimary} strokeWidth={2} />
        <text x={340} y={87} textAnchor="middle" fontSize={12} fontWeight={700} fill={t.accentPrimary}>
          [System Prompt: 1,024 tokens]
        </text>
        <text x={340} y={104} textAnchor="middle" fontSize={10} fill={t.accentTeal}>
          KV Cache Cached in VRAM (Shared)
        </text>

        {/* Branches */}
        <path d="M 280 115 L 200 148" fill="none" stroke={t.accentTeal} strokeWidth={2} markerEnd="url(#rt-arrow-teal)" />
        <path d="M 400 115 L 480 148" fill="none" stroke={t.accentSecondary} strokeWidth={2} markerEnd="url(#rt-arrow-secondary)" />

        {/* Branch 1 */}
        <rect x={90} y={150} width={220} height={60} rx={8} fill={t.surface} stroke={t.accentTeal} strokeWidth={1.5} />
        <text x={200} y={173} textAnchor="middle" fontSize={12} fontWeight={700} fill={t.accentTeal}>
          {mode === 'shared_system' ? 'User Request 1' : 'Conversation Turn 1'}
        </text>
        <text x={200} y={190} textAnchor="middle" fontSize={10} fill={t.textSecondary}>
          {mode === 'shared_system' ? 'Doc A Query (+4k tok)' : 'User: "Analyze file A"'}
        </text>
        <text x={200} y={204} textAnchor="middle" fontSize={9} fontWeight={700} fill={t.accentTeal}>
          ✓ 1,024 Tokens Reused (0ms Prefill)
        </text>

        {/* Branch 2 */}
        <rect x={370} y={150} width={220} height={60} rx={8} fill={t.surface} stroke={t.accentSecondary} strokeWidth={1.5} />
        <text x={480} y={173} textAnchor="middle" fontSize={12} fontWeight={700} fill={t.accentSecondary}>
          {mode === 'shared_system' ? 'User Request 2' : 'Alternative Branch Turn 2'}
        </text>
        <text x={480} y={190} textAnchor="middle" fontSize={10} fill={t.textSecondary}>
          {mode === 'shared_system' ? 'Doc B Query (+4k tok)' : 'User: "Analyze file B"'}
        </text>
        <text x={480} y={204} textAnchor="middle" fontSize={9} fontWeight={700} fill={t.accentSecondary}>
          ✓ 1,024 Tokens Reused (0ms Prefill)
        </text>
      </svg>

      <div style={{ marginTop: '0.75rem', padding: '0.75rem', borderRadius: 8, background: t.surfaceAlt, border: `1px solid ${t.border}` }}>
        <p style={{ margin: 0, fontSize: 12, color: t.textSecondary }}>
          <strong style={{ color: t.textPrimary }}>Mechanism:</strong>{' '}
          When a request arrives, the engine matches prefix tokens against the tree. Matched blocks are mapped to physical memory pages with zero recomputation, dispatching only remaining tokens to Tensor Cores.
        </p>
      </div>
    </VisualizationContainer>
  );
}
