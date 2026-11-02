import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, VisualizationHeader, PillSelect } from '../primitives';

type Mode = 'linear' | 'tree';

export default function TreeAttentionDraftDiagram() {
  const t = useVizTokens();
  const [mode, setMode] = useState<Mode>('tree');

  return (
    <VisualizationContainer
      title="Linear Draft vs Tree Attention (Medusa / EAGLE)"
      footer={
        mode === 'tree'
          ? 'Tree Attention drafts multiple candidate sequences simultaneously. The target model verifies all candidate paths in a single forward pass using custom 2D attention masks.'
          : 'Linear Draft verifies candidate tokens sequentially. If token 2 fails verification, tokens 3 and 4 are immediately discarded, limiting speedup.'
      }
    >
      <VisualizationHeader
        eyebrow="SPECULATIVE DECODING"
        title="Candidate Generation: Linear vs Tree Topology"
        description="Inspect how modern speculative decoders generate branched token trees, verifying multiple alternative paths in one forward pass."
      />

      <div style={{ margin: '0.75rem 0' }}>
        <PillSelect<Mode>
          label="Draft Topology"
          value={mode}
          onChange={setMode}
          options={[
            { value: 'linear', label: '1. Standard Linear Draft (K=4)' },
            { value: 'tree', label: '2. Medusa / EAGLE Tree Attention' },
          ]}
        />
      </div>

      <svg viewBox="0 0 680 240" width="100%" role="img" aria-label="Linear vs Tree Attention Draft Diagram">
        {mode === 'linear' ? (
          <g transform="translate(40, 60)">
            {/* Token 1 */}
            <rect x={0} y={30} width={100} height={50} rx={8} fill={t.surfaceAlt} stroke={t.accentPrimary} strokeWidth={2} />
            <text x={50} y={60} textAnchor="middle" fontSize={12} fontWeight={700} fill={t.accentPrimary}>Token 1</text>

            <line x1={100} y1={55} x2={150} y2={55} stroke={t.accentPrimary} strokeWidth={2} />

            {/* Token 2 */}
            <rect x={150} y={30} width={100} height={50} rx={8} fill={t.surfaceAlt} stroke={t.accentPrimary} strokeWidth={2} />
            <text x={200} y={60} textAnchor="middle" fontSize={12} fontWeight={700} fill={t.accentPrimary}>Token 2</text>

            <line x1={250} y1={55} x2={300} y2={55} stroke={t.accentPrimary} strokeWidth={2} />

            {/* Token 3 */}
            <rect x={300} y={30} width={100} height={50} rx={8} fill={t.surfaceAlt} stroke={t.accentPrimary} strokeWidth={2} />
            <text x={350} y={60} textAnchor="middle" fontSize={12} fontWeight={700} fill={t.accentPrimary}>Token 3</text>

            <line x1={400} y1={55} x2={450} y2={55} stroke={t.accentPrimary} strokeWidth={2} />

            {/* Token 4 */}
            <rect x={450} y={30} width={100} height={50} rx={8} fill={t.surfaceAlt} stroke={t.accentPrimary} strokeWidth={2} />
            <text x={500} y={60} textAnchor="middle" fontSize={12} fontWeight={700} fill={t.accentPrimary}>Token 4</text>

            <text x={300} y={115} textAnchor="middle" fontSize={11} fill={t.textSecondary}>
              Single Path · Failure at Token 2 halts chain · Avg Accepted Tokens: ~2.1
            </text>
          </g>
        ) : (
          <g transform="translate(40, 25)">
            {/* Token 1 */}
            <rect x={0} y={65} width={110} height={50} rx={8} fill={t.surfaceAlt} stroke={t.accentPrimary} strokeWidth={2} />
            <text x={55} y={95} textAnchor="middle" fontSize={12} fontWeight={700} fill={t.accentPrimary}>Token 1 (Root)</text>

            {/* Branch Lines */}
            <path d="M 110 90 L 170 40 L 200 40" fill="none" stroke={t.accentTeal} strokeWidth={2} />
            <path d="M 110 90 L 170 140 L 200 140" fill="none" stroke={t.accentSecondary} strokeWidth={2} />

            {/* Branch A: Token 2a */}
            <rect x={200} y={15} width={120} height={50} rx={8} fill={t.surfaceAlt} stroke={t.accentTeal} strokeWidth={2} />
            <text x={260} y={40} textAnchor="middle" fontSize={12} fontWeight={700} fill={t.accentTeal}>Branch A: Tok 2a</text>
            <text x={260} y={55} textAnchor="middle" fontSize={10} fill={t.textSecondary}>High Confidence</text>

            <line x1={320} y1={40} x2={370} y2={40} stroke={t.accentTeal} strokeWidth={2} />

            {/* Branch A: Token 3a */}
            <rect x={370} y={15} width={120} height={50} rx={8} fill={t.surfaceAlt} stroke={t.accentTeal} strokeWidth={2} />
            <text x={430} y={40} textAnchor="middle" fontSize={12} fontWeight={700} fill={t.accentTeal}>Token 3a</text>
            <text x={430} y={55} textAnchor="middle" fontSize={10} fill={t.textSecondary}>Path A Continuation</text>

            {/* Branch B: Token 2b */}
            <rect x={200} y={115} width={120} height={50} rx={8} fill={t.surfaceAlt} stroke={t.accentSecondary} strokeWidth={2} />
            <text x={260} y={140} textAnchor="middle" fontSize={12} fontWeight={700} fill={t.accentSecondary}>Branch B: Tok 2b</text>
            <text x={260} y={155} textAnchor="middle" fontSize={10} fill={t.textSecondary}>Alternative Option</text>

            <line x1={320} y1={140} x2={370} y2={140} stroke={t.accentSecondary} strokeWidth={2} />

            {/* Branch B: Token 3b */}
            <rect x={370} y={115} width={120} height={50} rx={8} fill={t.surfaceAlt} stroke={t.accentSecondary} strokeWidth={2} />
            <text x={430} y={140} textAnchor="middle" fontSize={12} fontWeight={700} fill={t.accentSecondary}>Token 3b</text>
            <text x={430} y={155} textAnchor="middle" fontSize={10} fill={t.textSecondary}>Path B Continuation</text>

            {/* Tree Mask Evaluation Note */}
            <rect x={510} y={40} width={120} height={100} rx={8} fill={t.surface} stroke={t.border} strokeWidth={1} />
            <text x={570} y={65} textAnchor="middle" fontSize={11} fontWeight={700} fill={t.textPrimary}>Tree Mask</text>
            <text x={570} y={85} textAnchor="middle" fontSize={10} fill={t.textSecondary}>Single GEMM Pass</text>
            <text x={570} y={105} textAnchor="middle" fontSize={10} fill={t.accentTeal}>Verifies All Paths</text>
            <text x={570} y={125} textAnchor="middle" fontSize={10} fill={t.textPrimary}>Avg Acc: ~3.6 tok</text>
          </g>
        )}
      </svg>

      <div style={{ marginTop: '0.75rem', padding: '0.75rem', borderRadius: 8, background: t.surfaceAlt, border: `1px solid ${t.border}` }}>
        <p style={{ margin: 0, fontSize: 12, color: t.textSecondary }}>
          <strong style={{ color: t.textPrimary }}>{mode === 'tree' ? 'Medusa / EAGLE Tree Attention:' : 'Standard Linear Draft:'}</strong>{' '}
          {mode === 'tree'
            ? 'By branching the speculative candidate pool into multiple parallel paths and evaluating them under a 2D tree attention mask, target models recover from minor draft branching misalignments, achieving higher speedups.'
            : 'Linear drafts evaluate tokens strictly in order. If the second speculative token is rejected by the target model, all remaining downstream draft tokens are discarded regardless of validity.'}
        </p>
      </div>
    </VisualizationContainer>
  );
}
