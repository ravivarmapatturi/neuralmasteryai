import { useState } from 'react';
import { useVizTokens } from '../../../theme/vizTokens';
import LinearRegressionAtAGlance from '../../../viz/diagrams/LinearRegressionAtAGlance';
import PcaProjectionDiagram from '../../../viz/diagrams/PcaProjectionDiagram';
import LdaQdaBoundaryDiagram from '../../../viz/diagrams/LdaQdaBoundaryDiagram';
import BayesUpdateDiagram from '../../../viz/diagrams/BayesUpdateDiagram';
import KernelTrickDiagram from '../../../viz/diagrams/KernelTrickDiagram';
import GmmSoftAssignmentDiagram from '../../../viz/diagrams/GmmSoftAssignmentDiagram';
import TreeGrowthStrategyDiagram from '../../../viz/diagrams/TreeGrowthStrategyDiagram';
import DbscanLiveDiagram from '../../../viz/diagrams/DbscanLiveDiagram';
import GradientBoostingResidualDiagram from '../../../viz/diagrams/GradientBoostingResidualDiagram';
import BaggingVarianceDiagram from '../../../viz/diagrams/BaggingVarianceDiagram';
import ConformalPredictionDiagram from '../../../viz/diagrams/ConformalPredictionDiagram';
import IsolationPathLengthDiagram from '../../../viz/diagrams/IsolationPathLengthDiagram';
import TreeImportanceDiagram from '../../../viz/diagrams/TreeImportanceDiagram';
import KMeansVsEMeansVisual from './KMeansVsEMeansVisual';

interface Props {
  diagram: string;
  name: string;
}

export default function MlModelVisual({ diagram, name }: Props) {
  const t = useVizTokens();
  const [kVal, setKVal] = useState<1 | 3 | 5>(3);
  const [perceptronStep, setPerceptronStep] = useState(1);
  const [lambdaVal, setLambdaVal] = useState<'low' | 'med' | 'high'>('med');

  switch (diagram) {
    case 'linear-regression':
      return <LinearRegressionAtAGlance />;
    case 'pca-svd':
      return <PcaProjectionDiagram />;
    case 'lda-qda':
      return <LdaQdaBoundaryDiagram />;
    case 'naive-bayes':
      return <BayesUpdateDiagram />;
    case 'gmm-em':
      return <GmmSoftAssignmentDiagram />;
    case 'decision-trees':
      return <TreeGrowthStrategyDiagram />;
    case 'svm':
      return <KernelTrickDiagram />;
    case 'dbscan-hdbscan':
      return <DbscanLiveDiagram />;
    case 'adaboost-gbm':
      return <GradientBoostingResidualDiagram />;
    case 'random-forest':
      return <BaggingVarianceDiagram />;
    case 'conformal-prediction':
      return <ConformalPredictionDiagram />;
    case 'isolation-forest':
      return <IsolationPathLengthDiagram />;
    case 'xgboost-lightgbm-catboost':
      return <TreeImportanceDiagram />;
    case 'e-means':
      return <KMeansVsEMeansVisual />;

    // --- Custom ML Visuals below ---

    case 'knn': {
      // k-NN Neighborhood voting
      const radius = kVal === 1 ? 28 : kVal === 3 ? 52 : 78;
      const votes = kVal === 1 ? '1 Red (100%)' : kVal === 3 ? '2 Red, 1 Blue (Red wins)' : '3 Red, 2 Blue (Red wins)';
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.85rem', color: t.textSecondary }}>
              Select neighborhood size k:
            </span>
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              {([1, 3, 5] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setKVal(k)}
                  style={{
                    padding: '0.2rem 0.55rem',
                    borderRadius: '4px',
                    border: `1px solid ${t.border}`,
                    background: kVal === k ? t.accentPrimary : t.surfaceAlt,
                    color: kVal === k ? '#ffffff' : t.textPrimary,
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    fontFamily: "'Kalam', cursive",
                  }}
                >
                  k = {k}
                </button>
              ))}
            </div>
          </div>
          <svg
            viewBox="0 0 300 130"
            style={{ width: '100%', height: 'auto', background: t.background, borderRadius: '6px', border: `1px solid ${t.border}` }}
            role="img"
            aria-label="k-nearest neighbours query circle and class votes"
          >
            {/* Neighborhood radius */}
            <circle cx="150" cy="65" r={radius} fill={t.accentPrimary} fillOpacity="0.08" stroke={t.accentPrimary} strokeDasharray="3 3" strokeWidth="1.5" />
            {/* Query point */}
            <circle cx="150" cy="65" r="5" fill="#f59e0b" stroke="#ffffff" strokeWidth="1.5" />
            <text x="156" y="60" fill={t.textPrimary} fontSize="11" fontFamily="'Kalam', cursive">Query x</text>
            {/* Points: Red class */}
            <circle cx="138" cy="50" r="4.5" fill="#ef4444" />
            <circle cx="168" cy="72" r="4.5" fill="#ef4444" />
            <circle cx="120" cy="85" r="4.5" fill="#ef4444" />
            <circle cx="95" cy="40" r="4.5" fill="#ef4444" />
            {/* Points: Blue class */}
            <circle cx="180" cy="48" r="4.5" fill="#3b82f6" />
            <circle cx="215" cy="85" r="4.5" fill="#3b82f6" />
            <circle cx="195" cy="100" r="4.5" fill="#3b82f6" />
            <text x="10" y="20" fill={t.textSecondary} fontSize="11" fontFamily="'Kalam', cursive">
              Radius: {radius}px · Neighbors: {votes}
            </text>
          </svg>
        </div>
      );
    }

    case 'perceptron': {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.82rem', color: t.textSecondary }}>
              Mistake-driven weight update: w ← w + η·y·x
            </span>
            <button
              type="button"
              onClick={() => setPerceptronStep((s) => (s === 1 ? 2 : 1))}
              style={{
                padding: '0.2rem 0.6rem',
                borderRadius: '4px',
                border: `1px solid ${t.border}`,
                background: t.surfaceAlt,
                color: t.accentPrimary,
                fontSize: '0.75rem',
                cursor: 'pointer',
                fontFamily: "'Kalam', cursive",
              }}
            >
              {perceptronStep === 1 ? 'Simulate Mistake Update →' : '← Reset Boundary'}
            </button>
          </div>
          <svg
            viewBox="0 0 300 130"
            style={{ width: '100%', height: 'auto', background: t.background, borderRadius: '6px', border: `1px solid ${t.border}` }}
            role="img"
            aria-label="Perceptron decision boundary updating on mistake"
          >
            {/* Hyperplane line */}
            {perceptronStep === 1 ? (
              <line x1="30" y1="120" x2="270" y2="40" stroke={t.accentDanger} strokeWidth="2" strokeDasharray="4 2" />
            ) : (
              <line x1="40" y1="110" x2="260" y2="15" stroke={t.accentPrimary} strokeWidth="2.5" />
            )}
            {/* Labels and normal vector */}
            {perceptronStep === 1 ? (
              <>
                <text x="50" y="35" fill={t.accentDanger} fontSize="11" fontFamily="'Kalam', cursive">Misclassified (+1 on negative side)</text>
                <circle cx="130" cy="55" r="5" fill="#10b981" stroke={t.accentDanger} strokeWidth="2" />
              </>
            ) : (
              <>
                <text x="50" y="30" fill={t.accentPrimary} fontSize="11" fontFamily="'Kalam', cursive">Corrected Boundary (w rotated by +x)</text>
                <circle cx="130" cy="55" r="5" fill="#10b981" stroke="#ffffff" strokeWidth="1.5" />
              </>
            )}
            {/* Fixed training points */}
            <circle cx="80" cy="90" r="4" fill="#3b82f6" />
            <circle cx="100" cy="105" r="4" fill="#3b82f6" />
            <circle cx="200" cy="35" r="4" fill="#10b981" />
            <circle cx="230" cy="45" r="4" fill="#10b981" />
          </svg>
        </div>
      );
    }

    case 'kmeans': {
      return (
        <svg
          viewBox="0 0 300 120"
          style={{ width: '100%', height: 'auto', background: t.background, borderRadius: '6px', border: `1px solid ${t.border}` }}
          role="img"
          aria-label="k-means Voronoi cells and centroid positions"
        >
          {/* Voronoi partition separator */}
          <line x1="150" y1="10" x2="150" y2="110" stroke={t.border} strokeDasharray="3 3" strokeWidth="1.5" />
          {/* Cluster 1 */}
          <circle cx="80" cy="60" r="7" fill="#3b82f6" stroke="#ffffff" strokeWidth="1.5" />
          <text x="73" y="64" fill="#ffffff" fontSize="9" fontWeight="bold">c₁</text>
          <circle cx="50" cy="40" r="4" fill="#3b82f6" opacity="0.8" />
          <circle cx="65" cy="80" r="4" fill="#3b82f6" opacity="0.8" />
          <circle cx="110" cy="50" r="4" fill="#3b82f6" opacity="0.8" />
          <circle cx="95" cy="85" r="4" fill="#3b82f6" opacity="0.8" />
          {/* Cluster 2 */}
          <circle cx="220" cy="60" r="7" fill="#10b981" stroke="#ffffff" strokeWidth="1.5" />
          <text x="213" y="64" fill="#ffffff" fontSize="9" fontWeight="bold">c₂</text>
          <circle cx="190" cy="45" r="4" fill="#10b981" opacity="0.8" />
          <circle cx="205" cy="85" r="4" fill="#10b981" opacity="0.8" />
          <circle cx="250" cy="40" r="4" fill="#10b981" opacity="0.8" />
          <circle cx="240" cy="80" r="4" fill="#10b981" opacity="0.8" />
          <text x="15" y="112" fill={t.textSecondary} fontSize="10" fontFamily="'Kalam', cursive">
            Voronoi Boundary separates points by closest centroid Euclidean distance
          </text>
        </svg>
      );
    }

    case 'hierarchical-clustering': {
      return (
        <svg
          viewBox="0 0 300 130"
          style={{ width: '100%', height: 'auto', background: t.background, borderRadius: '6px', border: `1px solid ${t.border}` }}
          role="img"
          aria-label="Agglomerative hierarchical clustering dendrogram"
        >
          {/* Dendrogram tree branches */}
          {/* Leaf points A(40), B(90), C(160), D(240) */}
          <line x1="40" y1="105" x2="40" y2="70" stroke={t.edge} strokeWidth="1.5" />
          <line x1="90" y1="105" x2="90" y2="70" stroke={t.edge} strokeWidth="1.5" />
          <line x1="40" y1="70" x2="90" y2="70" stroke={t.edge} strokeWidth="1.5" />
          <line x1="65" y1="70" x2="65" y2="35" stroke={t.edge} strokeWidth="1.5" />

          <line x1="160" y1="105" x2="160" y2="85" stroke={t.edge} strokeWidth="1.5" />
          <line x1="240" y1="105" x2="240" y2="85" stroke={t.edge} strokeWidth="1.5" />
          <line x1="160" y1="85" x2="240" y2="85" stroke={t.edge} strokeWidth="1.5" />
          <line x1="200" y1="85" x2="200" y2="35" stroke={t.edge} strokeWidth="1.5" />

          {/* Root merge */}
          <line x1="65" y1="35" x2="200" y2="35" stroke={t.edge} strokeWidth="1.5" />
          <line x1="132" y1="35" x2="132" y2="15" stroke={t.edge} strokeWidth="1.5" />

          {/* Cut threshold line */}
          <line x1="20" y1="55" x2="280" y2="55" stroke={t.accentDanger} strokeDasharray="4 2" strokeWidth="1.2" />
          <text x="210" y="50" fill={t.accentDanger} fontSize="10" fontFamily="'Kalam', cursive">Horizontal cut → 2 clusters</text>

          {/* Leaf labels */}
          <text x="35" y="122" fill={t.textPrimary} fontSize="11" fontFamily="'Kalam', cursive">x₁</text>
          <text x="85" y="122" fill={t.textPrimary} fontSize="11" fontFamily="'Kalam', cursive">x₂</text>
          <text x="155" y="122" fill={t.textPrimary} fontSize="11" fontFamily="'Kalam', cursive">x₃</text>
          <text x="235" y="122" fill={t.textPrimary} fontSize="11" fontFamily="'Kalam', cursive">x₄</text>
        </svg>
      );
    }

    case 'logistic-regression': {
      return (
        <svg
          viewBox="0 0 300 120"
          style={{ width: '100%', height: 'auto', background: t.background, borderRadius: '6px', border: `1px solid ${t.border}` }}
          role="img"
          aria-label="Logistic sigmoid probability curve"
        >
          {/* Axes */}
          <line x1="30" y1="100" x2="270" y2="100" stroke={t.border} strokeWidth="1" />
          <line x1="150" y1="15" x2="150" y2="105" stroke={t.border} strokeWidth="1" />
          {/* Threshold 0.5 line */}
          <line x1="30" y1="57" x2="270" y2="57" stroke={t.textMuted} strokeDasharray="3 3" strokeWidth="1" />
          <text x="35" y="53" fill={t.textSecondary} fontSize="10" fontFamily="'Kalam', cursive">P = 0.5 Threshold</text>
          {/* Sigmoid S-curve */}
          <path
            d="M 30 98 C 90 98, 120 90, 150 57 C 180 25, 210 17, 270 17"
            fill="none"
            stroke={t.accentPrimary}
            strokeWidth="2.5"
          />
          {/* Label */}
          <text x="180" y="30" fill={t.accentPrimary} fontSize="11" fontFamily="'Kalam', cursive">σ(z) = 1 / (1 + e⁻ᶻ)</text>
          <text x="250" y="112" fill={t.textSecondary} fontSize="10" fontFamily="'Kalam', cursive">Logit z</text>
        </svg>
      );
    }

    case 'ridge': {
      const radius = lambdaVal === 'low' ? 38 : lambdaVal === 'med' ? 26 : 14;
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.82rem', color: t.textSecondary }}>L2 constraint ball (‖w‖₂² ≤ t)</span>
            <div style={{ display: 'flex', gap: '0.3rem' }}>
              {(['low', 'med', 'high'] as const).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLambdaVal(l)}
                  style={{
                    padding: '0.2rem 0.5rem',
                    borderRadius: '4px',
                    border: `1px solid ${t.border}`,
                    background: lambdaVal === l ? t.accentPrimary : t.surfaceAlt,
                    color: lambdaVal === l ? '#ffffff' : t.textPrimary,
                    fontSize: '0.72rem',
                    cursor: 'pointer',
                    fontFamily: "'Kalam', cursive",
                  }}
                >
                  λ: {l}
                </button>
              ))}
            </div>
          </div>
          <svg
            viewBox="0 0 300 130"
            style={{ width: '100%', height: 'auto', background: t.background, borderRadius: '6px', border: `1px solid ${t.border}` }}
            role="img"
            aria-label="Ridge L2 circle constraint shrinking OLS solution"
          >
            {/* Coordinate axes */}
            <line x1="20" y1="65" x2="280" y2="65" stroke={t.border} strokeWidth="1" />
            <line x1="150" y1="10" x2="150" y2="120" stroke={t.border} strokeWidth="1" />
            {/* OLS solution */}
            <circle cx="230" cy="30" r="4" fill={t.accentDanger} />
            <text x="236" y="28" fill={t.accentDanger} fontSize="10" fontFamily="'Kalam', cursive">w_OLS</text>
            {/* OLS loss contours */}
            <ellipse cx="230" cy="30" rx="35" ry="20" fill="none" stroke={t.accentDanger} strokeOpacity="0.4" strokeWidth="1" />
            <ellipse cx="230" cy="30" rx="65" ry="40" fill="none" stroke={t.accentDanger} strokeOpacity="0.3" strokeWidth="1" />
            {/* L2 ball circle */}
            <circle cx="150" cy="65" r={radius} fill="none" stroke={t.accentPrimary} strokeWidth="2" />
            {/* Ridge tangent point */}
            <circle cx={150 + radius * 0.82} cy={65 - radius * 0.57} r="4" fill={t.accentPrimary} />
            <text x="15" y="25" fill={t.textSecondary} fontSize="10" fontFamily="'Kalam', cursive">
              Shrinks both weights non-zero (dense, smooth shrinkage)
            </text>
          </svg>
        </div>
      );
    }

    case 'lasso': {
      return (
        <svg
          viewBox="0 0 300 130"
          style={{ width: '100%', height: 'auto', background: t.background, borderRadius: '6px', border: `1px solid ${t.border}` }}
          role="img"
          aria-label="Lasso L1 diamond constraint producing exact zero sparsity"
        >
          {/* Coordinate axes */}
          <line x1="20" y1="65" x2="280" y2="65" stroke={t.border} strokeWidth="1" />
          <line x1="150" y1="10" x2="150" y2="120" stroke={t.border} strokeWidth="1" />
          {/* L1 diamond */}
          <polygon
            points="150,30 185,65 150,100 115,65"
            fill={t.accentPrimary}
            fillOpacity="0.08"
            stroke={t.accentPrimary}
            strokeWidth="2"
          />
          {/* OLS point and elliptical contours touching diamond corner */}
          <circle cx="215" cy="35" r="4" fill={t.accentDanger} />
          <text x="220" y="32" fill={t.accentDanger} fontSize="10" fontFamily="'Kalam', cursive">w_OLS</text>
          <ellipse cx="215" cy="35" rx="40" ry="22" fill="none" stroke={t.accentDanger} strokeOpacity="0.4" strokeWidth="1" transform="rotate(-15 215 35)" />
          {/* Corner contact point (exact w2 = 0) */}
          <circle cx="185" cy="65" r="5" fill="#10b981" stroke="#ffffff" strokeWidth="1.5" />
          <text x="175" y="82" fill="#10b981" fontSize="10" fontWeight="bold" fontFamily="'Kalam', cursive">w₂ = 0 (Corner: exact zero)</text>
          <text x="15" y="22" fill={t.textSecondary} fontSize="10" fontFamily="'Kalam', cursive">
            L1 diamond sharp corners cause contour tangency at axes (sparsity)
          </text>
        </svg>
      );
    }

    case 'elastic-net': {
      return (
        <svg
          viewBox="0 0 300 130"
          style={{ width: '100%', height: 'auto', background: t.background, borderRadius: '6px', border: `1px solid ${t.border}` }}
          role="img"
          aria-label="Elastic Net combination of L1 diamond and L2 circle"
        >
          {/* Coordinate axes */}
          <line x1="20" y1="65" x2="280" y2="65" stroke={t.border} strokeWidth="1" />
          <line x1="150" y1="10" x2="150" y2="120" stroke={t.border} strokeWidth="1" />
          {/* L1 diamond in dashed background */}
          <polygon points="150,32 183,65 150,98 117,65" fill="none" stroke={t.textMuted} strokeDasharray="3 2" strokeWidth="1" />
          {/* Elastic Net rounded diamond */}
          <path
            d="M 150 34 Q 175 42 181 65 Q 175 88 150 96 Q 125 88 119 65 Q 125 42 150 34 Z"
            fill={t.accentPrimary}
            fillOpacity="0.1"
            stroke={t.accentPrimary}
            strokeWidth="2.2"
          />
          <text x="15" y="24" fill={t.textSecondary} fontSize="10" fontFamily="'Kalam', cursive">
            Strictly convex rounded diamond: selects correlated feature groups together
          </text>
        </svg>
      );
    }

    case 'spectral-clustering': {
      return (
        <svg
          viewBox="0 0 300 120"
          style={{ width: '100%', height: 'auto', background: t.background, borderRadius: '6px', border: `1px solid ${t.border}` }}
          role="img"
          aria-label="Graph Laplacian Fiedler cut partitioning two dense cliques"
        >
          {/* Clique 1 */}
          <circle cx="60" cy="45" r="6" fill="#3b82f6" />
          <circle cx="75" cy="80" r="6" fill="#3b82f6" />
          <circle cx="100" cy="50" r="6" fill="#3b82f6" />
          <line x1="60" y1="45" x2="75" y2="80" stroke="#3b82f6" strokeWidth="1.5" />
          <line x1="75" y1="80" x2="100" y2="50" stroke="#3b82f6" strokeWidth="1.5" />
          <line x1="60" y1="45" x2="100" y2="50" stroke="#3b82f6" strokeWidth="1.5" />

          {/* Sparse bridge */}
          <line x1="100" y1="50" x2="200" y2="50" stroke={t.accentDanger} strokeDasharray="3 3" strokeWidth="1.5" />

          {/* Clique 2 */}
          <circle cx="200" cy="50" r="6" fill="#10b981" />
          <circle cx="225" cy="85" r="6" fill="#10b981" />
          <circle cx="240" cy="45" r="6" fill="#10b981" />
          <line x1="200" y1="50" x2="225" y2="85" stroke="#10b981" strokeWidth="1.5" />
          <line x1="225" y1="85" x2="240" y2="45" stroke="#10b981" strokeWidth="1.5" />
          <line x1="200" y1="50" x2="240" y2="45" stroke="#10b981" strokeWidth="1.5" />

          {/* Cut line */}
          <line x1="150" y1="15" x2="150" y2="105" stroke={t.accentDanger} strokeWidth="2" />
          <text x="120" y="112" fill={t.accentDanger} fontSize="10" fontFamily="'Kalam', cursive">
            Normalized Cut (min bridge edges)
          </text>
        </svg>
      );
    }

    case 'tsne-umap': {
      return (
        <svg
          viewBox="0 0 300 120"
          style={{ width: '100%', height: 'auto', background: t.background, borderRadius: '6px', border: `1px solid ${t.border}` }}
          role="img"
          aria-label="High-dimensional curved manifold unfolding into distinct 2D clusters"
        >
          {/* Left: Curved entangled representation */}
          <text x="25" y="20" fill={t.textSecondary} fontSize="10" fontFamily="'Kalam', cursive">High-D Manifold (Entangled)</text>
          <path d="M 35 45 Q 85 95 125 45" fill="none" stroke={t.textMuted} strokeWidth="1.5" strokeDasharray="3 2" />
          <circle cx="45" cy="50" r="4" fill="#3b82f6" />
          <circle cx="58" cy="65" r="4" fill="#3b82f6" />
          <circle cx="100" cy="65" r="4" fill="#10b981" />
          <circle cx="115" cy="50" r="4" fill="#10b981" />

          {/* Arrow */}
          <line x1="140" y1="60" x2="170" y2="60" stroke={t.accentPrimary} strokeWidth="2" />
          <polygon points="170,56 177,60 170,64" fill={t.accentPrimary} />

          {/* Right: Unfolded 2D clusters */}
          <text x="185" y="20" fill={t.accentPrimary} fontSize="10" fontFamily="'Kalam', cursive">2D Student-t / Fuzzy Set</text>
          <circle cx="205" cy="60" r="14" fill="#3b82f6" fillOpacity="0.15" stroke="#3b82f6" strokeWidth="1" />
          <circle cx="200" cy="58" r="3.5" fill="#3b82f6" />
          <circle cx="210" cy="62" r="3.5" fill="#3b82f6" />

          <circle cx="265" cy="60" r="14" fill="#10b981" fillOpacity="0.15" stroke="#10b981" strokeWidth="1" />
          <circle cx="260" cy="58" r="3.5" fill="#10b981" />
          <circle cx="270" cy="62" r="3.5" fill="#10b981" />
          <text x="35" y="112" fill={t.textSecondary} fontSize="10" fontFamily="'Kalam', cursive">
            Heavy tails prevent crowding and separate local clusters in 2D
          </text>
        </svg>
      );
    }

    default:
      return (
        <div style={{ padding: '1rem', color: t.textSecondary, fontSize: '0.82rem' }}>
          Visual for {name}
        </div>
      );
  }
}
