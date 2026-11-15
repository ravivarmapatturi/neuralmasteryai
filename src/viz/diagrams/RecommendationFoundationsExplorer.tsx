import { useState } from 'react';
import { useVizTokens, RADIUS, SPACING } from '../../theme/vizTokens';
import { VisualizationContainer, VisualizationHeader } from '../primitives';
import {
  TOY_FOUNDATIONS_MATRIX,
  getUserMean,
  userCosineSimilarity,
  itemCosineSimilarity,
  predictUserCollaborative,
  toImplicitConfidence,
} from '../lib/recommendationFoundations';

export default function RecommendationFoundationsExplorer() {
  const t = useVizTokens();
  const [activeUserIdx, setActiveUserIdx] = useState<number>(0);
  const [viewMode, setViewMode] = useState<'user' | 'item' | 'implicit'>('user');

  const { users, items, ratings } = TOY_FOUNDATIONS_MATRIX;
  const activeUserRatings = ratings[activeUserIdx];
  const activeUserMean = getUserMean(activeUserRatings);

  // Find first missing item for the active user, or fallback to item 3
  const missingItemIdx = activeUserRatings.findIndex((r) => r === null);
  const targetItemIdx = missingItemIdx !== -1 ? missingItemIdx : 0;

  const { predicted } = predictUserCollaborative(
    ratings,
    activeUserIdx,
    targetItemIdx
  );

  const { preferences, confidences } = toImplicitConfidence(ratings, 2);

  return (
    <VisualizationContainer
      title="Candidate Generation & Collaborative Filtering Explorer"
      footer={
        viewMode === 'implicit'
          ? `Implicit Feedback: Unobserved items are treated as negative preference (p=0) with low confidence (c=1), while observed clicks receive confidence c = 1 + 2 * rating. Missing entries represent lack of exposure rather than explicit user rejection.`
          : `Collaborative Filtering on 4x4 matrix: User ${users[activeUserIdx]} has observed mean rating of ${activeUserMean.toFixed(2)}. Target missing item "${items[targetItemIdx]}" is predicted at ${predicted.toFixed(2)} based on co-rated item neighborhood similarity.`
      }
    >
      <VisualizationHeader
        eyebrow="Candidate Generation & Collaborative Neighborhoods"
        title="Explore Interaction Matrices & Nearest-Neighbor Retrieval"
        description="Select an active user and toggle between User-User similarity, Item-Item similarity, and Implicit Exposure modes to observe how sparse interaction evidence produces personalized candidate scores."
      />

      {/* Control Bar */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: SPACING.md,
          marginTop: SPACING.md,
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* User Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: SPACING.xs }}>
          <span style={{ fontSize: 13, color: t.textSecondary, fontWeight: 600 }}>Active User:</span>
          {users.map((name, idx) => {
            const isSelected = idx === activeUserIdx;
            return (
              <button
                key={name}
                type="button"
                onClick={() => setActiveUserIdx(idx)}
                style={{
                  padding: '5px 10px',
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
                {name}
              </button>
            );
          })}
        </div>

        {/* View Mode Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: SPACING.xs }}>
          <span style={{ fontSize: 13, color: t.textSecondary, fontWeight: 600 }}>Mode:</span>
          {[
            { id: 'user', label: 'User-User k-NN' },
            { id: 'item', label: 'Item-Item k-NN' },
            { id: 'implicit', label: 'Implicit Exposure' },
          ].map((mode) => {
            const isSelected = viewMode === mode.id;
            return (
              <button
                key={mode.id}
                type="button"
                onClick={() => setViewMode(mode.id as typeof viewMode)}
                style={{
                  padding: '5px 10px',
                  borderRadius: 9999,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: `1px solid ${isSelected ? t.accentPrimary : t.border}`,
                  background: isSelected ? t.surface : t.surfaceAlt,
                  color: isSelected ? t.accentPrimary : t.textSecondary,
                  transition: 'all 0.15s ease',
                }}
              >
                {mode.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Grid & Computations */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: SPACING.md,
          marginTop: SPACING.md,
        }}
      >
        {/* Interaction Matrix Display */}
        <div
          style={{
            background: t.surfaceAlt,
            borderRadius: RADIUS.md,
            padding: SPACING.md,
            border: `1px solid ${t.border}`,
            overflowX: 'auto',
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 600, color: t.textPrimary, marginBottom: SPACING.sm }}>
            {viewMode === 'implicit' ? 'Confidence Matrix C_ui (p_ui indicator)' : 'Observed Rating Matrix R'}
          </div>

          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: 12,
              textAlign: 'center',
            }}
          >
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '6px 8px', color: t.textSecondary }}>User</th>
                {items.map((item, i) => (
                  <th
                    key={item}
                    style={{
                      padding: '6px 4px',
                      color: i === targetItemIdx ? t.accentWarn : t.textSecondary,
                      fontWeight: i === targetItemIdx ? 700 : 500,
                      maxWidth: 65,
                    }}
                    title={item}
                  >
                    I{i + 1}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((userName, uIdx) => {
                const isSelectedUser = uIdx === activeUserIdx;
                return (
                  <tr
                    key={userName}
                    style={{
                      background: isSelectedUser ? t.surface : 'transparent',
                      borderTop: `1px solid ${t.border}`,
                    }}
                  >
                    <td
                      style={{
                        textAlign: 'left',
                        padding: '6px 8px',
                        fontWeight: isSelectedUser ? 700 : 500,
                        color: isSelectedUser ? t.accentPrimary : t.textPrimary,
                      }}
                    >
                      {userName}
                    </td>
                    {items.map((_, iIdx) => {
                      const isTarget = isSelectedUser && iIdx === targetItemIdx;
                      const rawRating = ratings[uIdx][iIdx];

                      if (viewMode === 'implicit') {
                        const p = preferences[uIdx][iIdx];
                        const c = confidences[uIdx][iIdx];
                        return (
                          <td
                            key={iIdx}
                            style={{
                              padding: '6px 4px',
                              fontFamily: 'monospace',
                              fontWeight: isTarget ? 700 : 400,
                              color: p === 1 ? t.textPrimary : t.textMuted,
                              background: p === 1 ? `${t.accentPrimary}15` : 'transparent',
                            }}
                          >
                            c={c}
                          </td>
                        );
                      }

                      return (
                        <td
                          key={iIdx}
                          style={{
                            padding: '6px 4px',
                            fontFamily: 'monospace',
                            fontWeight: isTarget ? 700 : 400,
                            color: isTarget
                              ? t.accentWarn
                              : rawRating !== null
                              ? t.textPrimary
                              : t.textMuted,
                            background: isTarget ? `${t.accentWarn}20` : 'transparent',
                          }}
                        >
                          {isTarget ? `? (${predicted.toFixed(1)})` : rawRating !== null ? rawRating : '—'}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div style={{ fontSize: 11, color: t.textMuted, marginTop: SPACING.xs }}>
            Items: I1 = Matrix Algebra, I2 = Vector Search, I3 = Two-Tower Nets, I4 = Graph RAG
          </div>
        </div>

        {/* Step-by-Step Mathematical Walkthrough */}
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
          {viewMode === 'user' && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: t.textPrimary, marginBottom: SPACING.xs }}>
                User-User Cosine Neighborhood for {users[activeUserIdx]}
              </div>
              <div style={{ fontSize: 12, color: t.textSecondary, lineHeight: 1.5 }}>
                Comparing {users[activeUserIdx]} with peers on co-rated items:
              </div>
              <div style={{ marginTop: SPACING.sm, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {users.map((peer, pIdx) => {
                  if (pIdx === activeUserIdx) return null;
                  const { similarity, coRatedCount } = userCosineSimilarity(
                    ratings[activeUserIdx],
                    ratings[pIdx]
                  );
                  return (
                    <div
                      key={peer}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: 12,
                        padding: '4px 8px',
                        borderRadius: RADIUS.sm,
                        background: t.surfaceAlt,
                        border: `1px solid ${t.border}`,
                      }}
                    >
                      <span style={{ color: t.textPrimary }}>
                        sim({users[activeUserIdx]}, {peer}):
                      </span>
                      <span style={{ fontFamily: 'monospace', fontWeight: 600, color: t.accentPrimary }}>
                        {similarity.toFixed(4)} ({coRatedCount} co-rated)
                      </span>
                    </div>
                  );
                })}
              </div>
              <div
                style={{
                  marginTop: SPACING.sm,
                  padding: SPACING.sm,
                  borderRadius: RADIUS.sm,
                  background: `${t.accentPrimary}10`,
                  fontSize: 12,
                  color: t.textPrimary,
                  borderLeft: `3px solid ${t.accentPrimary}`,
                }}
              >
                <strong>Predicted rating for {items[targetItemIdx]}:</strong> {predicted.toFixed(2)} / 5.0
                <br />
                <span style={{ fontSize: 11, color: t.textSecondary }}>
                  Formula: r̂_ui = μ_u + Σ sim(u,v)(r_vi - μ_v) / Σ|sim(u,v)|
                </span>
              </div>
            </div>
          )}

          {viewMode === 'item' && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: t.textPrimary, marginBottom: SPACING.xs }}>
                Item-Item Similarity for Target: {items[targetItemIdx]}
              </div>
              <div style={{ fontSize: 12, color: t.textSecondary, lineHeight: 1.5 }}>
                Item-item similarity computed across users who rated both items:
              </div>
              <div style={{ marginTop: SPACING.sm, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {items.map((otherItem, oIdx) => {
                  if (oIdx === targetItemIdx) return null;
                  const { similarity, coRatedCount } = itemCosineSimilarity(
                    ratings,
                    targetItemIdx,
                    oIdx
                  );
                  return (
                    <div
                      key={otherItem}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: 12,
                        padding: '4px 8px',
                        borderRadius: RADIUS.sm,
                        background: t.surfaceAlt,
                        border: `1px solid ${t.border}`,
                      }}
                    >
                      <span style={{ color: t.textPrimary }}>
                        sim(I{targetItemIdx + 1}, I{oIdx + 1}):
                      </span>
                      <span style={{ fontFamily: 'monospace', fontWeight: 600, color: t.accentPrimary }}>
                        {similarity.toFixed(4)} ({coRatedCount} mutual users)
                      </span>
                    </div>
                  );
                })}
              </div>
              <div
                style={{
                  marginTop: SPACING.sm,
                  padding: SPACING.sm,
                  borderRadius: RADIUS.sm,
                  background: `${t.accentPrimary}10`,
                  fontSize: 12,
                  color: t.textPrimary,
                  borderLeft: `3px solid ${t.accentPrimary}`,
                }}
              >
                In production systems (Sarwar et al. 2001, Linden et al. 2003 Amazon), item-item similarities
                are precomputed offline and cached because catalog items change far slower than user activity.
              </div>
            </div>
          )}

          {viewMode === 'implicit' && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: t.textPrimary, marginBottom: SPACING.xs }}>
                Missing-Not-At-Random (MNAR) Exposure Model
              </div>
              <div style={{ fontSize: 12, color: t.textSecondary, lineHeight: 1.5 }}>
                In implicit feedback (clicks, video views, purchase events), unobserved entries are not negative ratings.
              </div>
              <div
                style={{
                  marginTop: SPACING.sm,
                  padding: SPACING.sm,
                  borderRadius: RADIUS.sm,
                  background: t.surfaceAlt,
                  fontSize: 12,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}
              >
                <div>
                  <strong>Observed Action:</strong> p_ui = 1, confidence c_ui = 1 + α * r_ui (e.g. 11 for rating 5).
                </div>
                <div>
                  <strong>Unobserved Entry:</strong> p_ui = 0, baseline confidence c_ui = 1.
                </div>
                <div style={{ color: t.textMuted, fontSize: 11 }}>
                  The loss function penalizes unobserved errors with weight 1, while penalizing errors on heavily consumed
                  items with weight 11.
                </div>
              </div>
              <div
                style={{
                  marginTop: SPACING.sm,
                  padding: SPACING.sm,
                  borderRadius: RADIUS.sm,
                  background: `${t.accentWarn}15`,
                  fontSize: 12,
                  color: t.textPrimary,
                  borderLeft: `3px solid ${t.accentWarn}`,
                }}
              >
                <strong>The Cold-Start Trap:</strong> A new user or item with 0 interactions cannot participate in
                collaborative neighborhoods. Candidate generation falls back to popularity or content attributes.
              </div>
            </div>
          )}
        </div>
      </div>
    </VisualizationContainer>
  );
}
