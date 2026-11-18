import { useState, useMemo } from 'react';
import { useVizTokens, RADIUS, SPACING } from '../../theme/vizTokens';
import { VisualizationContainer, VisualizationHeader, Slider, useAutoCycle } from '../primitives';
import {
  TOY_MF_RATINGS,
  MF_USER_NAMES,
  MF_ITEM_NAMES,
  runAlsExplicit,
  rotateFactors2D,
} from '../lib/matrixFactorization';

export default function MatrixFactorizationExplorer() {
  const t = useVizTokens();
  const iterationCycle = useAutoCycle(20, 1400, 9);
  const iterations = iterationCycle.value + 1;
  const [rotationAngle, setRotationAngle] = useState<number>(0);
  const [viewTab, setViewTab] = useState<'reconstruction' | 'factors' | 'residuals'>('reconstruction');

  // Compute ALS factor matrices
  const { U, V, reconstructed: baseReconstructed, loss } = useMemo(
    () => runAlsExplicit(TOY_MF_RATINGS, iterations, 0.1),
    [iterations]
  );

  // Apply 2D rotation to verify non-identifiability
  const { U_rotated, V_rotated, reconstructed: rotatedReconstructed } = useMemo(
    () => rotateFactors2D(U, V, rotationAngle),
    [U, V, rotationAngle]
  );

  return (
    <VisualizationContainer
      title="Matrix Factorization & Latent Factor Explorer"
      footer={
        `Toy 4x4 matrix with rank k=2. ALS iterations: ${iterations}, regularizer λ=0.1. Current observed MSE: ${loss.toFixed(4)}. ` +
        `Rotational Invariance: Rotating factors by ${rotationAngle}° alters individual factor coordinates but leaves the outer product U·Vᵀ strictly unchanged.`
      }
    >
      <VisualizationHeader
        eyebrow="Latent Factor Models & Alternating Least Squares"
        title="Explore Matrix Factorization, ALS & Rotational Invariance"
        description="Inspect how Alternating Least Squares factorizes a sparse 4x4 rating matrix into rank-2 user factors U and item factors V, and rotate the latent factors to prove that orthogonal transformations leave predicted ratings 100% unchanged."
      />

      {/* Interactive Controls */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: SPACING.md,
          marginTop: SPACING.md,
          background: t.surfaceAlt,
          padding: SPACING.md,
          borderRadius: RADIUS.md,
          border: `1px solid ${t.border}`,
        }}
      >
        <Slider
          label="ALS Iterations"
          value={iterations}
          onChange={(value) => iterationCycle.pick(value - 1)}
          min={1}
          max={20}
          step={1}
        />

        <Slider
          label={`Rotation Angle Q(θ): ${rotationAngle}°`}
          value={rotationAngle}
          onChange={setRotationAngle}
          min={0}
          max={180}
          step={5}
        />
      </div>

      {/* View Tabs */}
      <div
        style={{
          display: 'flex',
          gap: SPACING.xs,
          marginTop: SPACING.md,
          alignItems: 'center',
        }}
      >
        {[
          { id: 'reconstruction', label: 'Reconstructed Matrix R̂' },
          { id: 'factors', label: 'Latent Factors U & V' },
          { id: 'residuals', label: 'Observed Residuals' },
        ].map((tab) => {
          const isSelected = viewTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setViewTab(tab.id as typeof viewTab)}
              style={{
                padding: '6px 12px',
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
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Main Content Area */}
      <div
        style={{
          marginTop: SPACING.md,
          background: t.surface,
          borderRadius: RADIUS.md,
          padding: SPACING.md,
          border: `1px solid ${t.border}`,
        }}
      >
        {viewTab === 'reconstruction' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: t.textPrimary }}>
                Predicted Matrix R̂ = U · Vᵀ (Rank k=2)
              </div>
              <div style={{ fontSize: 12, color: t.accentPrimary, fontWeight: 600 }}>
                Observed MSE: {loss.toFixed(4)}
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, textAlign: 'center' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '6px 8px', color: t.textSecondary }}>User</th>
                    {MF_ITEM_NAMES.map((name, j) => (
                      <th key={name} style={{ padding: '6px 4px', color: t.textSecondary }}>
                        I{j + 1}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {MF_USER_NAMES.map((userName, u) => (
                    <tr key={userName} style={{ borderTop: `1px solid ${t.border}` }}>
                      <td style={{ textAlign: 'left', padding: '6px 8px', fontWeight: 600, color: t.textPrimary }}>
                        {userName}
                      </td>
                      {MF_ITEM_NAMES.map((_, i) => {
                        const target = TOY_MF_RATINGS[u][i];
                        const isObserved = target !== null;
                        const pred = rotatedReconstructed[u][i];
                        return (
                          <td
                            key={i}
                            style={{
                              padding: '8px 4px',
                              fontFamily: 'monospace',
                              background: isObserved ? `${t.accentWarn}15` : 'transparent',
                              border: isObserved ? `1px solid ${t.accentWarn}` : `1px dashed ${t.border}`,
                            }}
                          >
                            <div style={{ fontWeight: 700, color: t.textPrimary }}>{pred.toFixed(2)}</div>
                            <div style={{ fontSize: 10, color: isObserved ? t.accentWarn : t.textMuted }}>
                              {isObserved ? `target ${target}` : 'unobserved'}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Invariance Banner */}
            <div
              style={{
                marginTop: SPACING.md,
                padding: SPACING.sm,
                borderRadius: RADIUS.sm,
                background: `${t.accentPrimary}10`,
                borderLeft: `3px solid ${t.accentPrimary}`,
                fontSize: 12,
                color: t.textPrimary,
              }}
            >
              <strong>Rotational Invariance Verification:</strong> Even when you rotate factor coordinates by {rotationAngle}°,
              the inner product matrix <strong>U·Vᵀ</strong> stays identically {baseReconstructed[0][0].toFixed(2)} for Alice on I1.
              This illustrates why latent dimensions in matrix factorization cannot be assigned fixed semantic names without external constraints.
            </div>
          </div>
        )}

        {viewTab === 'factors' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: SPACING.md }}>
            {/* User Factors U */}
            <div style={{ background: t.surfaceAlt, padding: SPACING.sm, borderRadius: RADIUS.sm }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: t.textPrimary, marginBottom: SPACING.xs }}>
                User Factor Matrix U (4 × 2)
              </div>
              <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '4px' }}>User</th>
                    <th style={{ padding: '4px' }}>Factor 1</th>
                    <th style={{ padding: '4px' }}>Factor 2</th>
                  </tr>
                </thead>
                <tbody>
                  {U_rotated.map((row, idx) => (
                    <tr key={idx} style={{ borderTop: `1px solid ${t.border}`, fontFamily: 'monospace' }}>
                      <td style={{ padding: '4px', textAlign: 'left' }}>{MF_USER_NAMES[idx].split(' ')[0]}</td>
                      <td style={{ padding: '4px', textAlign: 'center' }}>{row[0].toFixed(3)}</td>
                      <td style={{ padding: '4px', textAlign: 'center' }}>{row[1].toFixed(3)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Item Factors V */}
            <div style={{ background: t.surfaceAlt, padding: SPACING.sm, borderRadius: RADIUS.sm }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: t.textPrimary, marginBottom: SPACING.xs }}>
                Item Factor Matrix V (4 × 2)
              </div>
              <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '4px' }}>Item</th>
                    <th style={{ padding: '4px' }}>Factor 1</th>
                    <th style={{ padding: '4px' }}>Factor 2</th>
                  </tr>
                </thead>
                <tbody>
                  {V_rotated.map((row, idx) => (
                    <tr key={idx} style={{ borderTop: `1px solid ${t.border}`, fontFamily: 'monospace' }}>
                      <td style={{ padding: '4px', textAlign: 'left' }}>I{idx + 1}</td>
                      <td style={{ padding: '4px', textAlign: 'center' }}>{row[0].toFixed(3)}</td>
                      <td style={{ padding: '4px', textAlign: 'center' }}>{row[1].toFixed(3)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {viewTab === 'residuals' && (
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: t.textPrimary, marginBottom: SPACING.xs }}>
              Observed Rating Residuals (r_ui - r̂_ui)
            </div>
            <div style={{ fontSize: 12, color: t.textSecondary, marginBottom: SPACING.sm }}>
              ALS minimizes sum of squared residuals on observed entries plus L2 regularization penalty:
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 8 }}>
              {TOY_MF_RATINGS.flatMap((row, u) =>
                row.map((target, i) => {
                  if (target === null) return null;
                  const pred = rotatedReconstructed[u][i];
                  const residual = target - pred;
                  return (
                    <div
                      key={`${u}-${i}`}
                      style={{
                        padding: '6px 8px',
                        borderRadius: RADIUS.sm,
                        background: t.surfaceAlt,
                        border: `1px solid ${t.border}`,
                        fontSize: 11,
                        fontFamily: 'monospace',
                      }}
                    >
                      <div style={{ color: t.textMuted }}>
                        {MF_USER_NAMES[u].split(' ')[0]} - I{i + 1}
                      </div>
                      <div style={{ color: Math.abs(residual) < 0.3 ? t.accentPrimary : t.accentWarn, fontWeight: 700 }}>
                        err: {residual > 0 ? `+${residual.toFixed(2)}` : residual.toFixed(2)}
                      </div>
                    </div>
                  );
                })
              ).filter(Boolean)}
            </div>
          </div>
        )}
      </div>
    </VisualizationContainer>
  );
}
