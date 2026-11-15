import { useState } from 'react';
import { useVizTokens, RADIUS, SPACING } from '../../theme/vizTokens';
import { VisualizationContainer, VisualizationHeader, PillSelect } from '../primitives';
import {
  computeLambdaRank,
  computePointwiseMse,
  computeRankNet,
  fitLambdaMartStump,
  LtrDoc,
} from '../lib/learningToRank';

const OBJECTIVES = [
  'Pointwise (MSE)',
  'Pairwise (RankNet)',
  'LambdaRank (Metric Gradients)',
  'LambdaMART (GBDT Ensembles)',
];

const INITIAL_DOCS: LtrDoc[] = [
  {
    id: 'D1',
    title: 'D1: Neural Ranking Models for Web Search',
    label: 3, // Highly relevant
    score: 1.2,
    featureQueryMatch: 0.9,
    featureDocQuality: 0.8,
  },
  {
    id: 'D2',
    title: 'D2: Machine Learning Foundations for IR',
    label: 2, // Relevant
    score: 2.1,
    featureQueryMatch: 0.7,
    featureDocQuality: 0.9,
  },
  {
    id: 'D3',
    title: 'D3: Compiler Optimization for Distributed Schedulers',
    label: 0, // Irrelevant
    score: 0.4,
    featureQueryMatch: 0.1,
    featureDocQuality: 0.5,
  },
];

export default function LearningToRankDiagram() {
  const t = useVizTokens();
  const [selectedObjective, setSelectedObjective] = useState<string>(OBJECTIVES[0]);
  const [isResolved, setIsResolved] = useState<boolean>(false);

  // Dynamic scores based on resolution toggle
  const currentDocs = INITIAL_DOCS.map((doc) => {
    if (isResolved) {
      if (doc.id === 'D1') return { ...doc, score: 2.4 };
      if (doc.id === 'D2') return { ...doc, score: 1.5 };
    }
    return doc;
  });

  const scores = currentDocs.map((d) => d.score);
  const labels = currentDocs.map((d) => d.label);

  const pointwise = computePointwiseMse(scores, labels);
  const rankNet = computeRankNet(scores, labels);
  const lambdaRank = computeLambdaRank(scores, labels);
  const stump = fitLambdaMartStump(currentDocs, lambdaRank.lambdas);

  return (
    <VisualizationContainer
      footer="Learning to Rank bridges pointwise regression, pairwise preference ranking, and listwise metric optimization. LambdaRank scales pairwise logistic gradients by the metric delta, while LambdaMART fits boosted regression trees directly to these virtual lambda forces."
    >
      <div role="group" aria-label="Learning to Rank Objectives and Lambda Gradients Simulator">
        <VisualizationHeader
          title="Learning to Rank (LTR) Objectives & Lambda Gradients"
          subtitle="Compare Pointwise MSE, Pairwise RankNet, Metric-discounted LambdaRank, and LambdaMART tree boosting"
        />

        {/* Controls */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: SPACING.md,
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: SPACING.md,
            padding: SPACING.sm,
            background: t.surfaceAlt,
            borderRadius: RADIUS.md,
            border: `1px solid ${t.border}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: t.textSecondary }}>
              Objective:
            </span>
            <PillSelect
              options={OBJECTIVES.map((obj) => ({ value: obj, label: obj }))}
              value={selectedObjective}
              onChange={(val) => setSelectedObjective(val as string)}
            />
          </div>

          <button
            type="button"
            onClick={() => setIsResolved(!isResolved)}
            style={{
              padding: '5px 12px',
              borderRadius: RADIUS.sm,
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              border: `1px solid ${isResolved ? t.accentSuccess : t.accentPrimary}`,
              background: isResolved ? `${t.accentSuccess}20` : `${t.accentPrimary}20`,
              color: isResolved ? t.accentSuccess : t.accentPrimary,
              transition: 'all 0.15s ease',
            }}
          >
            {isResolved ? 'Resolved: D1 > D2 (Ideal)' : 'State: Inversion (D2 > D1)'}
          </button>
        </div>

        {/* Candidate Slate */}
        <div
          style={{
            background: t.surface,
            borderRadius: RADIUS.md,
            border: `1px solid ${t.border}`,
            padding: SPACING.sm,
            marginBottom: SPACING.md,
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 700, color: t.textSecondary, marginBottom: 6 }}>
            Candidate Slate (Query: &ldquo;neural ranking model&rdquo;)
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {lambdaRank.ranking.map((docIdx, rankSlot) => {
              const doc = currentDocs[docIdx];
              const isInverted = !isResolved && doc.id === 'D2' && rankSlot === 0;
              return (
                <div
                  key={doc.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: RADIUS.sm,
                    border: `1px solid ${isInverted ? t.accentWarn : t.border}`,
                    background: isInverted ? `${t.accentWarn}15` : t.surfaceAlt,
                    flexWrap: 'wrap',
                    gap: 6,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span
                      style={{
                        fontWeight: 800,
                        fontSize: 13,
                        color: rankSlot === 0 ? t.accentPrimary : t.textSecondary,
                        minWidth: 50,
                      }}
                    >
                      Slot #{rankSlot + 1}
                    </span>
                    <span style={{ fontWeight: 700, fontSize: 13, color: t.textPrimary }}>
                      {doc.id}
                    </span>
                    <span
                      style={{
                        padding: '2px 6px',
                        borderRadius: RADIUS.xs,
                        fontSize: 10,
                        fontWeight: 700,
                        background: doc.label > 0 ? `${t.accentSuccess}25` : `${t.border}`,
                        color: doc.label > 0 ? t.accentSuccess : t.textMuted,
                      }}
                    >
                      Grade {doc.label}
                    </span>
                    <span style={{ fontSize: 12, color: t.textSecondary }}>
                      {doc.title.replace(`${doc.id}: `, '')}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 12, fontFamily: 'monospace', color: t.textPrimary }}>
                      Score s = <strong>{doc.score.toFixed(1)}</strong>
                    </span>
                    {selectedObjective.includes('Lambda') && (
                      <span
                        style={{
                          fontSize: 11,
                          fontFamily: 'monospace',
                          color: lambdaRank.lambdas[docIdx] < 0 ? t.accentPrimary : t.textMuted,
                        }}
                      >
                        &lambda; = {lambdaRank.lambdas[docIdx].toFixed(4)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Objective Details Panel */}
        <div
          style={{
            background: t.surfaceAlt,
            borderRadius: RADIUS.md,
            border: `1px solid ${t.border}`,
            padding: SPACING.md,
          }}
        >
          {selectedObjective === 'Pointwise (MSE)' && (
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: t.accentPrimary, marginBottom: 6 }}>
                Pointwise Objective: Mean Squared Error Regression
              </div>
              <div style={{ fontSize: 12, color: t.textSecondary, marginBottom: 10 }}>
                Pointwise loss evaluates each document independently as a regression target. Total MSE:{' '}
                <strong>{pointwise.mse.toFixed(4)}</strong>.
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8 }}>
                {currentDocs.map((doc, idx) => (
                  <div
                    key={doc.id}
                    style={{
                      background: t.surface,
                      padding: 8,
                      borderRadius: RADIUS.sm,
                      border: `1px solid ${t.border}`,
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: 12, color: t.textPrimary }}>{doc.id} Error</div>
                    <div style={{ fontSize: 11, fontFamily: 'monospace', color: t.textMuted }}>
                      ({doc.score.toFixed(1)} - {doc.label})^2
                    </div>
                    <div style={{ fontSize: 14, fontFamily: 'monospace', fontWeight: 800, color: t.accentPrimary }}>
                      {pointwise.errors[idx].toFixed(4)}
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 11, color: t.textMuted, marginTop: 10 }}>
                Limitation: Pointwise regression does not model relative ordering. Swapping D1 and D2 at the top is penalized identically regardless of slate position.
              </div>
            </div>
          )}

          {selectedObjective === 'Pairwise (RankNet)' && (
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: t.accentPrimary, marginBottom: 6 }}>
                Pairwise Objective: RankNet Logistic Cross-Entropy
              </div>
              <div style={{ fontSize: 12, color: t.textSecondary, marginBottom: 10 }}>
                Evaluates preference pairs (D_i, D_j) where y_i &gt; y_j using logistic sigmoid P_ij = &sigma;(s_i - s_j).
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {rankNet.pairs.map((pair) => (
                  <div
                    key={`${pair.i}-${pair.j}`}
                    style={{
                      background: t.surface,
                      padding: '8px 12px',
                      borderRadius: RADIUS.sm,
                      border: `1px solid ${t.border}`,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: 6,
                    }}
                  >
                    <span style={{ fontWeight: 700, fontSize: 12, color: t.textPrimary }}>
                      Pair ({currentDocs[pair.i].id} &gt; {currentDocs[pair.j].id})
                    </span>
                    <span style={{ fontSize: 11, fontFamily: 'monospace', color: t.textSecondary }}>
                      s_{pair.i+1} - s_{pair.j+1} = {pair.diff.toFixed(2)}
                    </span>
                    <span style={{ fontSize: 11, fontFamily: 'monospace', color: t.textSecondary }}>
                      P_ij = {pair.prob.toFixed(4)}
                    </span>
                    <span style={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 700, color: t.accentPrimary }}>
                      RankNet Force &lambda; = {pair.lambda.toFixed(4)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedObjective === 'LambdaRank (Metric Gradients)' && (
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: t.accentPrimary, marginBottom: 6 }}>
                Metric-Scaled Objective: LambdaRank NDCG-Weighted Forces
              </div>
              <div style={{ fontSize: 12, color: t.textSecondary, marginBottom: 10 }}>
                Scales RankNet&apos;s gradient by |&Delta;NDCG_ij|: current NDCG ={' '}
                <strong>{lambdaRank.currentNdcg.toFixed(4)}</strong> (DCG: {lambdaRank.currentDcg.toFixed(4)} / IDCG: {lambdaRank.idcg.toFixed(4)}).
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {lambdaRank.pairs.map((pair) => (
                  <div
                    key={`${pair.i}-${pair.j}`}
                    style={{
                      background: t.surface,
                      padding: '8px 12px',
                      borderRadius: RADIUS.sm,
                      border: `1px solid ${t.border}`,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: 6,
                    }}
                  >
                    <span style={{ fontWeight: 700, fontSize: 12, color: t.textPrimary }}>
                      Pair ({currentDocs[pair.i].id}, {currentDocs[pair.j].id})
                    </span>
                    <span style={{ fontSize: 11, fontFamily: 'monospace', color: t.textSecondary }}>
                      |&Delta;NDCG| = {pair.deltaNdcg.toFixed(4)}
                    </span>
                    <span style={{ fontSize: 11, fontFamily: 'monospace', color: t.textMuted }}>
                      Base &lambda; = {pair.lambda.toFixed(4)}
                    </span>
                    <span style={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 800, color: t.accentSuccess }}>
                      LambdaRank &lambda; = {pair.scaledLambda.toFixed(4)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedObjective === 'LambdaMART (GBDT Ensembles)' && (
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: t.accentPrimary, marginBottom: 6 }}>
                Tree Ensemble Objective: LambdaMART GBDT Split
              </div>
              <div style={{ fontSize: 12, color: t.textSecondary, marginBottom: 10 }}>
                GBDT fits regression trees directly to the virtual lambda forces &lambda;_i as pseudo-residuals.
              </div>
              <div
                style={{
                  background: t.surface,
                  padding: 10,
                  borderRadius: RADIUS.sm,
                  border: `1px solid ${t.border}`,
                  fontSize: 12,
                  fontFamily: 'monospace',
                }}
              >
                <div>Decision Stump Split: [{stump.splitFeature} &le; {stump.threshold}]</div>
                <div style={{ marginTop: 4, color: t.accentPrimary }}>
                  Left Leaf (match &le; 0.5): update &gamma; = {stump.leftValue.toFixed(4)}
                </div>
                <div style={{ color: t.accentSuccess }}>
                  Right Leaf (match &gt; 0.5): update &gamma; = {stump.rightValue.toFixed(4)}
                </div>
              </div>
              <div style={{ fontSize: 11, color: t.textMuted, marginTop: 10 }}>
                In production, LightGBM or XGBoost fits hundreds of shallow trees with Newton-Raphson leaf updates to optimize NDCG directly without differentiating discrete ranks.
              </div>
            </div>
          )}
        </div>
      </div>
    </VisualizationContainer>
  );
}
