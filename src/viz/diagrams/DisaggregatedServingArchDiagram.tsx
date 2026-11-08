import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, VisualizationHeader, PillSelect } from '../primitives';

type RouteMode = 'long_prompt' | 'short_prompt';

export default function DisaggregatedServingArchDiagram() {
  const t = useVizTokens();
  const [route, setRoute] = useState<RouteMode>('long_prompt');

  return (
    <VisualizationContainer
      title="Prefill-Decode Disaggregated Serving Architecture"
      footer={
        route === 'long_prompt'
          ? 'Long Prompt (≥ 256 tokens): Dispatched to compute-optimized Prefill workers to avoid head-of-line blocking on Decode workers. KV Cache transferred via high-speed RDMA.'
          : 'Short Prompt (< 256 tokens): Executed directly on Decode workers to avoid network serialization overhead that exceeds local compute time.'
      }
    >
      <VisualizationHeader
        eyebrow="DISTRIBUTED SERVING"
        title="Conditional Prefill-Decode Routing"
        description="Inspect how production clusters route incoming requests based on prompt length, isolating compute-heavy prefill from bandwidth-bound decoding."
      />

      <div style={{ margin: '0.75rem 0' }}>
        <PillSelect<RouteMode>
          label="Request Dispatch Mode"
          value={route}
          onChange={setRoute}
          options={[
            { value: 'long_prompt', label: '1. Long Prompt (≥ 256 tokens, Disaggregated)' },
            { value: 'short_prompt', label: '2. Short Prompt (< 256 tokens, Colocated)' },
          ]}
        />
      </div>

      <svg viewBox="0 0 680 250" width="100%" role="img" aria-label="Disaggregated Serving Architecture Diagram">
        <defs>
          <marker id="dsa-pri" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
            <path d="M0,0 L7,3.5 L0,7 Z" fill={t.accentPrimary} />
          </marker>
          <marker id="dsa-warn" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
            <path d="M0,0 L7,3.5 L0,7 Z" fill={t.accentWarn} />
          </marker>
          <marker id="dsa-teal" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
            <path d="M0,0 L7,3.5 L0,7 Z" fill={t.accentTeal} />
          </marker>
        </defs>

        {/* Router Box */}
        <rect x={20} y={95} width={150} height={60} rx={8} fill={t.surface} stroke={t.border} strokeWidth={1.5} />
        <text x={95} y={120} textAnchor="middle" fontSize={12} fontWeight={700} fill={t.textPrimary}>Intelligent Router</text>
        <text x={95} y={140} textAnchor="middle" fontSize={10} fill={t.textSecondary}>Length &amp; Cache Aware</text>

        {route === 'long_prompt' ? (
          <g>
            {/* Arrow to Prefill */}
            <path d="M 170 115 L 210 55 L 258 55" fill="none" stroke={t.accentPrimary} strokeWidth={2} markerEnd="url(#dsa-pri)" />
            <text x={210} y={45} textAnchor="middle" fontSize={10} fontWeight={700} fill={t.accentPrimary}>≥ 256 tok</text>

            {/* Prefill Pool */}
            <rect x={260} y={20} width={180} height={75} rx={8} fill={t.surfaceAlt} stroke={t.accentPrimary} strokeWidth={2} />
            <text x={350} y={45} textAnchor="middle" fontSize={12} fontWeight={700} fill={t.accentPrimary}>Prefill Worker Pool</text>
            <text x={350} y={63} textAnchor="middle" fontSize={10} fill={t.textSecondary}>Compute-Optimized (TP=1/2)</text>
            <text x={350} y={80} textAnchor="middle" fontSize={10} fill={t.accentTeal}>Runs prompt GEMM in FP8</text>

            {/* RDMA Link */}
            <path d="M 440 55 C 475 55 490 85 508 128" fill="none" stroke={t.accentWarn} strokeWidth={2} strokeDasharray="4 4" markerEnd="url(#dsa-warn)" />
            <rect x={435} y={85} width={90} height={18} rx={4} fill={t.surface} stroke={t.border} strokeWidth={1} />
            <text x={480} y={98} textAnchor="middle" fontSize={10} fontWeight={700} fill={t.accentWarn}>RDMA KV Sync</text>

            {/* Decode Pool */}
            <rect x={470} y={130} width={180} height={75} rx={8} fill={t.surfaceAlt} stroke={t.accentSecondary} strokeWidth={2} />
            <text x={560} y={155} textAnchor="middle" fontSize={12} fontWeight={700} fill={t.accentSecondary}>Decode Worker Pool</text>
            <text x={560} y={173} textAnchor="middle" fontSize={10} fill={t.textSecondary}>Memory-Optimized (TP=4/8)</text>
            <text x={560} y={190} textAnchor="middle" fontSize={10} fill={t.textPrimary}>Zero prefill interference</text>
          </g>
        ) : (
          <g>
            {/* Arrow directly to Decode */}
            <line x1={170} y1={140} x2={468} y2={140} stroke={t.accentTeal} strokeWidth={2} markerEnd="url(#dsa-teal)" />
            <text x={320} y={128} textAnchor="middle" fontSize={11} fontWeight={600} fill={t.accentTeal}>
              Direct Dispatch (&lt; 256 tok, Bypass Network Overhead)
            </text>

            {/* Decode Pool */}
            <rect x={470} y={105} width={180} height={75} rx={8} fill={t.surfaceAlt} stroke={t.accentTeal} strokeWidth={2} />
            <text x={560} y={130} textAnchor="middle" fontSize={12} fontWeight={700} fill={t.accentTeal}>Decode Worker</text>
            <text x={560} y={148} textAnchor="middle" fontSize={10} fill={t.textSecondary}>Computes Prefill &amp; Decodes Locally</text>
            <text x={560} y={165} textAnchor="middle" fontSize={10} fill={t.textPrimary}>Latency: sub-5ms total</text>
          </g>
        )}
      </svg>

      <div style={{ marginTop: '0.75rem', padding: '0.75rem', borderRadius: 8, background: t.surfaceAlt, border: `1px solid ${t.border}` }}>
        <p style={{ margin: 0, fontSize: 12, color: t.textSecondary }}>
          <strong style={{ color: t.textPrimary }}>Systems Tradeoff:</strong>{' '}
          Disaggregation isolates erratic prompt prefills (which spike GPU compute to 100%) from token decode loops (which require low, predictable inter-token latency of 10-15ms).
        </p>
      </div>
    </VisualizationContainer>
  );
}
