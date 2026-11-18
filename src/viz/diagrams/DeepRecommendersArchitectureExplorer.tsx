import { useVizTokens, RADIUS, SPACING } from '../../theme/vizTokens';
import { VisualizationContainer, VisualizationHeader, useAutoCycle } from '../primitives';
import {
  ARCHITECTURE_PROFILES,
  TOY_CANDIDATE_DATA,
  computeTwoTowerScore,
  computeDlrmInteractions,
  computeSasrecAttentionStep,
} from '../lib/deepRecommenders';

export default function DeepRecommendersArchitectureExplorer() {
  const t = useVizTokens();
  const architectures = ['twoTower', 'wideAndDeep', 'dlrm', 'sasrec'] as const;
  const architectureCycle = useAutoCycle(architectures.length, 3600, 0);
  const selectedArch = architectures[architectureCycle.value];

  const profile = ARCHITECTURE_PROFILES[selectedArch];

  // Calculations for current candidate
  const twoTowerScore = computeTwoTowerScore(
    TOY_CANDIDATE_DATA.userVector,
    TOY_CANDIDATE_DATA.itemVector
  );

  const dlrmInteractions = computeDlrmInteractions(
    [0.7, 0.5, 0.3], // bottom MLP output
    [
      TOY_CANDIDATE_DATA.userVector,
      TOY_CANDIDATE_DATA.itemVector,
      TOY_CANDIDATE_DATA.categoryEmbedding,
    ]
  );

  const sasrecAttention = computeSasrecAttentionStep(
    [
      [0.6, 0.4, 0.2], // Item 1 embedding
      [0.2, 0.8, 0.7], // Item 3 embedding
    ],
    1
  );

  return (
    <VisualizationContainer
      title="Deep Recommender Architectures Explorer"
      footer={
        `Current Architecture: ${profile.name}. Funnel role: ${profile.primaryRole}. ` +
        `ANN Indexable: ${profile.canUseANN ? 'YES (offline item embeddings allow sub-15ms ScaNN/HNSW retrieval)' : 'NO (online cross-feature interaction requires evaluation on every candidate in ranking stage)'}.`
      }
    >
      <VisualizationHeader
        eyebrow="Deep Recommender Architectures"
        title="Compare Two-Tower, Wide & Deep, DLRM & Sequential Models"
        description="Inspect how Two-Tower retrieval, Wide & Deep feature crosses, DLRM embedding dot products, and SASRec sequential self-attention handle candidate generation versus high-capacity ranking."
      />

      {/* Architecture Selection Buttons */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: SPACING.xs,
          marginTop: SPACING.md,
        }}
      >
        {[
          { id: 'twoTower', label: 'Two-Tower Retrieval' },
          { id: 'wideAndDeep', label: 'Wide & Deep' },
          { id: 'dlrm', label: 'DLRM' },
          { id: 'sasrec', label: 'SASRec (Sequential)' },
        ].map((arch) => {
          const isSelected = selectedArch === arch.id;
          return (
            <button
              key={arch.id}
              type="button"
              onClick={() => architectureCycle.pick(architectures.indexOf(arch.id as typeof selectedArch))}
              style={{
                padding: '6px 14px',
                borderRadius: 9999,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                border: `1px solid ${isSelected ? t.accentPrimary : t.border}`,
                background: isSelected ? t.accentPrimary : t.surfaceAlt,
                color: isSelected ? t.background : t.textPrimary,
                transition: 'all 0.15s ease',
              }}
            >
              {arch.label}
            </button>
          );
        })}
      </div>

      {/* Architecture Specs & Flow */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: SPACING.md,
          marginTop: SPACING.md,
        }}
      >
        {/* Mechanism Flowcard */}
        <div
          style={{
            background: t.surface,
            borderRadius: RADIUS.md,
            padding: SPACING.md,
            border: `1px solid ${t.border}`,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.xs }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: t.textPrimary }}>
                {profile.name}
              </div>
              <span
                style={{
                  fontSize: 11,
                  padding: '2px 8px',
                  borderRadius: 9999,
                  background: profile.canUseANN ? `${t.accentPrimary}20` : `${t.accentWarn}20`,
                  color: profile.canUseANN ? t.accentPrimary : t.accentWarn,
                  fontWeight: 700,
                }}
              >
                {profile.canUseANN ? 'ANN Compatible' : 'Ranking Stage Only'}
              </span>
            </div>
            <div style={{ fontSize: 11, color: t.textMuted, marginBottom: SPACING.sm }}>
              Primary Paper: {profile.paper}
            </div>

            {selectedArch === 'twoTower' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: SPACING.sm }}>
                <div style={{ fontSize: 12, color: t.textSecondary }}>
                  User features pass through <code>UserTower</code> to yield vector <code>u</code>.
                  Item features pass through <code>ItemTower</code> to yield vector <code>v</code>.
                </div>
                <div style={{ background: t.surfaceAlt, padding: SPACING.sm, borderRadius: RADIUS.sm, fontSize: 11, fontFamily: 'monospace' }}>
                  u = [{TOY_CANDIDATE_DATA.userVector.join(', ')}]
                  <br />
                  v = [{TOY_CANDIDATE_DATA.itemVector.join(', ')}]
                  <br />
                  <strong>Retrieval Score:</strong> ⟨u, v⟩ = {twoTowerScore.toFixed(4)}
                </div>
                <div style={{ fontSize: 11, color: t.accentWarn }}>
                  Why limited for ranking: Zero early cross-interactions between user and item features.
                </div>
              </div>
            )}

            {selectedArch === 'wideAndDeep' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: SPACING.sm }}>
                <div style={{ fontSize: 12, color: t.textSecondary }}>
                  Wide linear model memorizes specific feature crosses; Deep feedforward net generalizes on dense embeddings.
                </div>
                <div style={{ background: t.surfaceAlt, padding: SPACING.sm, borderRadius: RADIUS.sm, fontSize: 11, fontFamily: 'monospace' }}>
                  Wide Cross: (device=mobile × cat=AI) → w_cross = +1.45
                  <br />
                  Deep Stack: ReLU(W^(2) · ReLU(W^(1) · x_dense)) → +0.82
                  <br />
                  <strong>Score:</strong> σ(1.45 + 0.82 - 0.40) = 0.8665 CTR
                </div>
                <div style={{ fontSize: 11, color: t.accentPrimary }}>
                  Cheng et al. (2016): Balanced app store installation lift with memorization stability.
                </div>
              </div>
            )}

            {selectedArch === 'dlrm' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: SPACING.sm }}>
                <div style={{ fontSize: 12, color: t.textSecondary }}>
                  Naumov et al. (2019): Dense features processed by Bottom MLP, then every embedding interacts via pairwise dot product.
                </div>
                <div style={{ background: t.surfaceAlt, padding: SPACING.sm, borderRadius: RADIUS.sm, fontSize: 11, fontFamily: 'monospace' }}>
                  {dlrmInteractions.pairwiseProducts.map((p) => (
                    <div key={p.pair}>
                      {p.pair}: {p.dot.toFixed(3)}
                    </div>
                  ))}
                  <strong>Interaction dimension:</strong> {dlrmInteractions.interactionDimension} dot products
                </div>
              </div>
            )}

            {selectedArch === 'sasrec' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: SPACING.sm }}>
                <div style={{ fontSize: 12, color: t.textSecondary }}>
                  Kang & McAuley (2018): Causal self-attention captures long-term dependencies in user interaction histories.
                </div>
                <div style={{ background: t.surfaceAlt, padding: SPACING.sm, borderRadius: RADIUS.sm, fontSize: 11, fontFamily: 'monospace' }}>
                  History: [Item 1, Item 3]
                  <br />
                  Causal Attention Weights on step 2: [{sasrecAttention.attentionWeights.map((w) => w.toFixed(3)).join(', ')}]
                  <br />
                  Context vector: [{sasrecAttention.contextVector.map((v) => v.toFixed(3)).join(', ')}]
                </div>
              </div>
            )}
          </div>

          <div
            style={{
              marginTop: SPACING.md,
              padding: SPACING.xs,
              borderRadius: RADIUS.sm,
              background: `${t.accentPrimary}10`,
              fontSize: 11,
              fontFamily: 'monospace',
              color: t.accentPrimary,
            }}
          >
            Formula: {profile.scoringMechanism}
          </div>
        </div>

        {/* System & Serving Constraints Card */}
        <div
          style={{
            background: t.surfaceAlt,
            borderRadius: RADIUS.md,
            padding: SPACING.md,
            border: `1px solid ${t.border}`,
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 700, color: t.textPrimary, marginBottom: SPACING.sm }}>
            Production Systems Constraints
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: SPACING.sm, fontSize: 12 }}>
            <div>
              <div style={{ color: t.textSecondary, fontWeight: 600 }}>Pipeline Funnel Stage:</div>
              <div style={{ color: t.textPrimary, fontWeight: 700 }}>{profile.primaryRole}</div>
            </div>

            <div>
              <div style={{ color: t.textSecondary, fontWeight: 600 }}>Precompute Item Vectors Offline?</div>
              <div style={{ color: profile.canPrecomputeItemIndex ? t.accentPrimary : t.textMuted, fontWeight: 700 }}>
                {profile.canPrecomputeItemIndex ? 'Yes (Item tower independent of user)' : 'No (Requires candidate-time feature crosses)'}
              </div>
            </div>

            <div>
              <div style={{ color: t.textSecondary, fontWeight: 600 }}>Approximate Nearest Neighbor (ANN) Indexable?</div>
              <div style={{ color: profile.canUseANN ? t.accentPrimary : t.accentWarn, fontWeight: 700 }}>
                {profile.canUseANN ? 'Yes (MIPS via ScaNN, HNSW, Faiss)' : 'No (Must evaluate deep network on candidate pool)'}
              </div>
            </div>

            <div>
              <div style={{ color: t.textSecondary, fontWeight: 600 }}>Serving Latency Budget:</div>
              <div style={{ color: t.textPrimary, fontFamily: 'monospace' }}>{profile.servingLatencyEstimate}</div>
            </div>

            <div>
              <div style={{ color: t.textSecondary, fontWeight: 600 }}>Cross-Feature Capacity:</div>
              <div style={{ color: t.textPrimary }}>{profile.crossFeatureCapacity}</div>
            </div>
          </div>
        </div>
      </div>
    </VisualizationContainer>
  );
}
