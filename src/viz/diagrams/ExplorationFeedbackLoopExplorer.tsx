import { useState } from 'react';
import { useVizTokens, RADIUS, SPACING } from '../../theme/vizTokens';
import { VisualizationContainer, VisualizationHeader, PillSelect } from '../primitives';
import {
  computeContextualDecision,
  evaluateIps,
  simulateExposureFeedback,
  TOY_BANDIT_ARMS,
  TOY_LOGGED_OBSERVATIONS,
} from '../lib/explorationFeedback';

type ActiveTab = 'linucb' | 'ips' | 'feedback';

const TAB_OPTIONS: { value: ActiveTab; label: string }[] = [
  { value: 'linucb', label: 'Contextual LinUCB Decision' },
  { value: 'ips', label: 'Counterfactual IPS Evaluator' },
  { value: 'feedback', label: 'Exposure Feedback Dynamics' },
];

export default function ExplorationFeedbackLoopExplorer() {
  const t = useVizTokens();
  const [activeTab, setActiveTab] = useState<ActiveTab>('linucb');

  // Tab 1 state: LinUCB
  const [techAffinity, setTechAffinity] = useState<number>(0.8);
  const [audioAffinity, setAudioAffinity] = useState<number>(0.4);
  const [alpha, setAlpha] = useState<number>(1.0);

  // Tab 2 state: IPS
  const [targetArm, setTargetArm] = useState<string>('arm-2');
  const [clipThreshold, setClipThreshold] = useState<number>(5.0);

  // Tab 3 state: Feedback loop rounds
  const [simRounds, setSimRounds] = useState<number>(20);

  // Computations
  const context: [number, number] = [techAffinity, audioAffinity];
  const decisions = computeContextualDecision(context, alpha, TOY_BANDIT_ARMS);
  const ipsResult = evaluateIps(TOY_LOGGED_OBSERVATIONS, targetArm, clipThreshold);
  const feedbackSim = simulateExposureFeedback(simRounds, alpha);
  const lastFeedback = feedbackSim[feedbackSim.length - 1];

  const greedyWinner = decisions.find((d) => d.isGreedyWinner);
  const ucbWinner = decisions.find((d) => d.isUcbWinner);

  let footerText = '';
  if (activeTab === 'linucb') {
    footerText = `At context [${techAffinity.toFixed(2)}, ${audioAffinity.toFixed(2)}] with α=${alpha.toFixed(1)}: Pure greedy exploitation selects ${greedyWinner?.armName} (highest predicted CTR: ${(greedyWinner!.expectedReward * 100).toFixed(1)}%), while LinUCB explores ${ucbWinner?.armName} due to its higher parameter uncertainty bonus (+${(ucbWinner!.confidenceBonus * 100).toFixed(1)}%).`;
  } else if (activeTab === 'ips') {
    footerText = `Counterfactual IPS evaluates the new policy using historical logs: raw IPS yields ${ipsResult.unclippedIps.toFixed(4)} (max weight ${ipsResult.maxWeight}), clipped IPS (cap=${clipThreshold.toFixed(1)}) yields ${ipsResult.clippedIps.toFixed(4)}, and self-normalized SNIPS yields ${ipsResult.snips.toFixed(4)} with effective sample size ${ipsResult.effectiveSampleSize}.`;
  } else {
    footerText = `Exposure feedback across ${simRounds} rounds: Pure greedy exploitation concentrates ${(lastFeedback.greedyPopularityShare * 100).toFixed(1)}% of impressions on the dominant blockbuster, whereas bandit exploration limits it to ${(lastFeedback.banditPopularityShare * 100).toFixed(1)}%, preserving catalog discovery.`;
  }

  return (
    <div
      role="group"
      aria-label="Interactive Exploration & Feedback Loops Explorer"
      style={{
        margin: `${SPACING.lg}px 0`,
        fontFamily: 'var(--font-sans, system-ui, sans-serif)',
      }}
    >
      <VisualizationContainer footer={footerText}>
        <VisualizationHeader
          eyebrow="Bandits & Off-Policy Counterfactuals"
          title="Exploration, Feedback Loops & Counterfactual Evaluation"
          description="Explore contextual LinUCB decision boundaries, inverse propensity scoring (IPS), and popularity feedback loops."
        />

        <div style={{ marginBottom: SPACING.md }}>
          <PillSelect
            options={TAB_OPTIONS}
            value={activeTab}
            onChange={(val) => setActiveTab(val as ActiveTab)}
          />
        </div>

        {/* TAB 1: CONTEXTUAL LINUCB */}
        {activeTab === 'linucb' && (
          <div>
            {/* Control Sliders */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: SPACING.md,
                padding: SPACING.md,
                borderRadius: RADIUS.md,
                backgroundColor: t.surfaceAlt,
                border: `1px solid ${t.border}`,
                marginBottom: SPACING.lg,
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: SPACING.xs }}>
                  <label htmlFor="tech-affinity" style={{ fontSize: '0.85rem', fontWeight: 600, color: t.textPrimary }}>
                    User Tech Affinity ($x_1$)
                  </label>
                  <span style={{ fontSize: '0.85rem', color: t.accentPrimary, fontFamily: 'monospace' }}>
                    {techAffinity.toFixed(2)}
                  </span>
                </div>
                <input
                  id="tech-affinity"
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={techAffinity}
                  onChange={(e) => setTechAffinity(parseFloat(e.target.value))}
                  style={{ width: '100%', accentColor: t.accentPrimary }}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: SPACING.xs }}>
                  <label htmlFor="audio-affinity" style={{ fontSize: '0.85rem', fontWeight: 600, color: t.textPrimary }}>
                    User Audio Affinity ($x_2$)
                  </label>
                  <span style={{ fontSize: '0.85rem', color: t.accentPrimary, fontFamily: 'monospace' }}>
                    {audioAffinity.toFixed(2)}
                  </span>
                </div>
                <input
                  id="audio-affinity"
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={audioAffinity}
                  onChange={(e) => setAudioAffinity(parseFloat(e.target.value))}
                  style={{ width: '100%', accentColor: t.accentPrimary }}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: SPACING.xs }}>
                  <label htmlFor="bandit-alpha" style={{ fontSize: '0.85rem', fontWeight: 600, color: t.textPrimary }}>
                    Exploration Bonus (α)
                  </label>
                  <span style={{ fontSize: '0.85rem', color: t.accentPrimary, fontFamily: 'monospace' }}>
                    {alpha.toFixed(1)} {alpha === 0 ? '(Pure Greedy)' : ''}
                  </span>
                </div>
                <input
                  id="bandit-alpha"
                  type="range"
                  min="0.0"
                  max="2.5"
                  step="0.1"
                  value={alpha}
                  onChange={(e) => setAlpha(parseFloat(e.target.value))}
                  style={{ width: '100%', accentColor: t.accentPrimary }}
                />
              </div>
            </div>

            {/* Arm Decision Cards */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                gap: SPACING.md,
              }}
            >
              {decisions.map((d) => {
                const armMeta = TOY_BANDIT_ARMS.find((a) => a.id === d.armId)!;
                const isWinner = d.isUcbWinner;

                return (
                  <div
                    key={d.armId}
                    style={{
                      padding: SPACING.md,
                      borderRadius: RADIUS.md,
                      backgroundColor: isWinner ? t.surface : t.surfaceAlt,
                      border: `2px solid ${isWinner ? t.accentPrimary : t.border}`,
                      boxShadow: isWinner ? `0 0 12px ${t.accentPrimary}33` : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.xs }}>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          padding: '2px 8px',
                          borderRadius: RADIUS.sm,
                          backgroundColor: t.border,
                          color: t.textSecondary,
                          fontWeight: 600,
                        }}
                      >
                        {armMeta.category}
                      </span>
                      {d.isUcbWinner && (
                        <span
                          style={{
                            fontSize: '0.75rem',
                            padding: '2px 8px',
                            borderRadius: RADIUS.sm,
                            backgroundColor: t.accentPrimary,
                            color: t.background,
                            fontWeight: 700,
                          }}
                        >
                          LinUCB Pick
                        </span>
                      )}
                      {d.isGreedyWinner && !d.isUcbWinner && (
                        <span
                          style={{
                            fontSize: '0.75rem',
                            padding: '2px 8px',
                            borderRadius: RADIUS.sm,
                            backgroundColor: t.border,
                            color: t.textPrimary,
                            fontWeight: 600,
                          }}
                        >
                          Greedy Pick
                        </span>
                      )}
                    </div>

                    <h4 style={{ margin: `${SPACING.xs}px 0`, fontSize: '1rem', color: t.textPrimary }}>
                      {d.armName}
                    </h4>
                    <p style={{ fontSize: '0.8rem', color: t.textSecondary, marginBottom: SPACING.sm }}>
                      {armMeta.description}
                    </p>

                    <div style={{ fontSize: '0.85rem', lineHeight: 1.6 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: t.textSecondary }}>Predicted CTR (x^T θ):</span>
                        <strong style={{ color: t.textPrimary, fontFamily: 'monospace' }}>
                          {(d.expectedReward * 100).toFixed(2)}%
                        </strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: t.textSecondary }}>Uncertainty Bonus (CB):</span>
                        <span style={{ color: t.accentPrimary, fontFamily: 'monospace', fontWeight: 600 }}>
                          +{(d.confidenceBonus * 100).toFixed(2)}%
                        </span>
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          marginTop: SPACING.xs,
                          paddingTop: SPACING.xs,
                          borderTop: `1px dashed ${t.border}`,
                        }}
                      >
                        <span style={{ fontWeight: 600, color: t.textPrimary }}>Total UCB Score:</span>
                        <strong style={{ color: isWinner ? t.accentPrimary : t.textPrimary, fontFamily: 'monospace' }}>
                          {d.ucbScore.toFixed(4)}
                        </strong>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: COUNTERFACTUAL IPS */}
        {activeTab === 'ips' && (
          <div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: SPACING.md,
                padding: SPACING.md,
                borderRadius: RADIUS.md,
                backgroundColor: t.surfaceAlt,
                border: `1px solid ${t.border}`,
                marginBottom: SPACING.lg,
              }}
            >
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: t.textPrimary, marginBottom: SPACING.xs }}>
                  Target Policy to Evaluate Offline:
                </label>
                <select
                  value={targetArm}
                  onChange={(e) => setTargetArm(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: RADIUS.sm,
                    border: `1px solid ${t.border}`,
                    backgroundColor: t.surface,
                    color: t.textPrimary,
                    fontSize: '0.85rem',
                  }}
                >
                  <option value="arm-1">Policy A: Always Show Blockbuster Trend (Arm 1)</option>
                  <option value="arm-2">Policy B: Always Show Fresh Topic (Arm 2)</option>
                  <option value="arm-3">Policy C: Always Show Niche Long-Tail (Arm 3)</option>
                </select>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: SPACING.xs }}>
                  <label htmlFor="clip-thresh" style={{ fontSize: '0.85rem', fontWeight: 600, color: t.textPrimary }}>
                    Propensity Clip Threshold ($w_&#123;\max&#125;$)
                  </label>
                  <span style={{ fontSize: '0.85rem', color: t.accentPrimary, fontFamily: 'monospace' }}>
                    {clipThreshold.toFixed(1)}
                  </span>
                </div>
                <input
                  id="clip-thresh"
                  type="range"
                  min="1.0"
                  max="15.0"
                  step="0.5"
                  value={clipThreshold}
                  onChange={(e) => setClipThreshold(parseFloat(e.target.value))}
                  style={{ width: '100%', accentColor: t.accentPrimary }}
                />
              </div>
            </div>

            {/* IPS Metric Summary Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: SPACING.md,
                marginBottom: SPACING.lg,
              }}
            >
              <div style={{ padding: SPACING.md, borderRadius: RADIUS.md, backgroundColor: t.surfaceAlt, border: `1px solid ${t.border}` }}>
                <span style={{ fontSize: '0.75rem', color: t.textSecondary, textTransform: 'uppercase', fontWeight: 600 }}>
                  Standard Unclipped IPS
                </span>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: t.textPrimary, fontFamily: 'monospace', marginTop: SPACING.xs }}>
                  {ipsResult.unclippedIps.toFixed(4)}
                </div>
                <div style={{ fontSize: '0.75rem', color: t.textSecondary, marginTop: 4 }}>
                  Unbiased; high variance when propensities are small.
                </div>
              </div>

              <div style={{ padding: SPACING.md, borderRadius: RADIUS.md, backgroundColor: t.surfaceAlt, border: `1px solid ${t.border}` }}>
                <span style={{ fontSize: '0.75rem', color: t.textSecondary, textTransform: 'uppercase', fontWeight: 600 }}>
                  Clipped IPS (w ≤ {clipThreshold.toFixed(1)})
                </span>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: t.accentPrimary, fontFamily: 'monospace', marginTop: SPACING.xs }}>
                  {ipsResult.clippedIps.toFixed(4)}
                </div>
                <div style={{ fontSize: '0.75rem', color: t.textSecondary, marginTop: 4 }}>
                  Trades mild bias for vastly lower estimation variance.
                </div>
              </div>

              <div style={{ padding: SPACING.md, borderRadius: RADIUS.md, backgroundColor: t.surfaceAlt, border: `1px solid ${t.border}` }}>
                <span style={{ fontSize: '0.75rem', color: t.textSecondary, textTransform: 'uppercase', fontWeight: 600 }}>
                  Self-Normalized (SNIPS)
                </span>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: t.textPrimary, fontFamily: 'monospace', marginTop: SPACING.xs }}>
                  {ipsResult.snips.toFixed(4)}
                </div>
                <div style={{ fontSize: '0.75rem', color: t.textSecondary, marginTop: 4 }}>
                  Normalized by sum of observed importance weights.
                </div>
              </div>

              <div style={{ padding: SPACING.md, borderRadius: RADIUS.md, backgroundColor: t.surfaceAlt, border: `1px solid ${t.border}` }}>
                <span style={{ fontSize: '0.75rem', color: t.textSecondary, textTransform: 'uppercase', fontWeight: 600 }}>
                  Effective Sample Size
                </span>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: t.textPrimary, fontFamily: 'monospace', marginTop: SPACING.xs }}>
                  {ipsResult.effectiveSampleSize.toFixed(1)} / 10
                </div>
                <div style={{ fontSize: '0.75rem', color: t.textSecondary, marginTop: 4 }}>
                  Max importance weight encountered: {ipsResult.maxWeight.toFixed(2)}x
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: FEEDBACK LOOP */}
        {activeTab === 'feedback' && (
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: SPACING.md,
                borderRadius: RADIUS.md,
                backgroundColor: t.surfaceAlt,
                border: `1px solid ${t.border}`,
                marginBottom: SPACING.lg,
              }}
            >
              <div>
                <label htmlFor="sim-rounds" style={{ fontSize: '0.85rem', fontWeight: 600, color: t.textPrimary }}>
                  Feedback Simulation Horizon: {simRounds} Rounds
                </label>
                <div style={{ fontSize: '0.75rem', color: t.textSecondary }}>
                  Simulates user feedback accumulation with vs without bandit exploration
                </div>
              </div>
              <input
                id="sim-rounds"
                type="range"
                min="5"
                max="50"
                step="5"
                value={simRounds}
                onChange={(e) => setSimRounds(parseInt(e.target.value, 10))}
                style={{ width: '180px', accentColor: t.accentPrimary }}
              />
            </div>

            {/* Visual Bar Comparison */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                gap: SPACING.md,
              }}
            >
              <div style={{ padding: SPACING.md, borderRadius: RADIUS.md, backgroundColor: t.surfaceAlt, border: `1px solid ${t.border}` }}>
                <h4 style={{ margin: 0, fontSize: '0.95rem', color: t.textPrimary }}>
                  Pure Greedy Exploitation (No Exploration)
                </h4>
                <p style={{ fontSize: '0.8rem', color: t.textSecondary, margin: `${SPACING.xs}px 0 ${SPACING.md}px` }}>
                  Dominant blockbuster continues to accumulate clicks, starving fresh items of training data.
                </p>

                <div style={{ marginBottom: SPACING.xs }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: t.textPrimary }}>
                    <span>Blockbuster Share of Impressions</span>
                    <strong>{(lastFeedback.greedyPopularityShare * 100).toFixed(1)}%</strong>
                  </div>
                  <div style={{ height: 12, backgroundColor: t.border, borderRadius: RADIUS.sm, overflow: 'hidden', marginTop: 4 }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${lastFeedback.greedyPopularityShare * 100}%`,
                        backgroundColor: '#ef4444',
                      }}
                    />
                  </div>
                </div>

                <div style={{ fontSize: '0.75rem', color: t.textSecondary, marginTop: SPACING.sm }}>
                  Result: Severe popularity bias and catalog collapse (filter bubbles).
                </div>
              </div>

              <div style={{ padding: SPACING.md, borderRadius: RADIUS.md, backgroundColor: t.surfaceAlt, border: `1px solid ${t.border}` }}>
                <h4 style={{ margin: 0, fontSize: '0.95rem', color: t.textPrimary }}>
                  Contextual LinUCB (With Exploration)
                </h4>
                <p style={{ fontSize: '0.8rem', color: t.textSecondary, margin: `${SPACING.xs}px 0 ${SPACING.md}px` }}>
                  Uncertainty bonuses route exploration budget to promising fresh content and long-tail items.
                </p>

                <div style={{ marginBottom: SPACING.xs }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: t.textPrimary }}>
                    <span>Blockbuster Share of Impressions</span>
                    <strong>{(lastFeedback.banditPopularityShare * 100).toFixed(1)}%</strong>
                  </div>
                  <div style={{ height: 12, backgroundColor: t.border, borderRadius: RADIUS.sm, overflow: 'hidden', marginTop: 4 }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${lastFeedback.banditPopularityShare * 100}%`,
                        backgroundColor: t.accentPrimary,
                      }}
                    />
                  </div>
                </div>

                <div style={{ fontSize: '0.75rem', color: t.textSecondary, marginTop: SPACING.sm }}>
                  Result: Balanced exploration uncovers new hits and prevents data starvation.
                </div>
              </div>
            </div>
          </div>
        )}
      </VisualizationContainer>
    </div>
  );
}
