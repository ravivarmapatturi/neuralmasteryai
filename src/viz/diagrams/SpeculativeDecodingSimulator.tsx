import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, PillSelect } from '../primitives';

type Scenario = 'high_predictable' | 'medium_code' | 'low_creative';

interface TokenPrediction {
  token: string;
  draftProb: number;
  targetProb: number;
  accepted: boolean;
  correctionToken?: string;
}

const SCENARIOS: Record<Scenario, { name: string; draftRatio: number; tokens: TokenPrediction[] }> = {
  high_predictable: {
    name: '1. Boilerplate & Structured Syntax (High Acceptance ~90%)',
    draftRatio: 0.1, // Draft is 10x cheaper than Target
    tokens: [
      { token: 'def', draftProb: 0.98, targetProb: 0.99, accepted: true },
      { token: ' forward', draftProb: 0.95, targetProb: 0.96, accepted: true },
      { token: '(', draftProb: 0.99, targetProb: 0.99, accepted: true },
      { token: 'self', draftProb: 0.96, targetProb: 0.97, accepted: true },
      { token: ',', draftProb: 0.94, targetProb: 0.95, accepted: true },
    ],
  },
  medium_code: {
    name: '2. Standard Python Implementation (Balanced ~70%)',
    draftRatio: 0.12,
    tokens: [
      { token: 'return', draftProb: 0.92, targetProb: 0.94, accepted: true },
      { token: ' torch', draftProb: 0.88, targetProb: 0.91, accepted: true },
      { token: '.matmul', draftProb: 0.65, targetProb: 0.42, accepted: false, correctionToken: '.bmm' },
      { token: '(', draftProb: 0.90, targetProb: 0.85, accepted: false },
      { token: 'q', draftProb: 0.80, targetProb: 0.82, accepted: false },
    ],
  },
  low_creative: {
    name: '3. Highly Branching Logic / Reasoning (Low Acceptance ~40%)',
    draftRatio: 0.15,
    tokens: [
      { token: 'However', draftProb: 0.75, targetProb: 0.78, accepted: true },
      { token: ',', draftProb: 0.88, targetProb: 0.92, accepted: true },
      { token: ' the', draftProb: 0.55, targetProb: 0.30, accepted: false, correctionToken: ' under' },
      { token: ' gradient', draftProb: 0.40, targetProb: 0.20, accepted: false },
      { token: ' vanishes', draftProb: 0.35, targetProb: 0.15, accepted: false },
    ],
  },
};

export default function SpeculativeDecodingSimulator() {
  const t = useVizTokens();
  const [scenarioKey, setScenarioKey] = useState<Scenario>('medium_code');
  const [draftLength, setDraftLength] = useState<number>(5);

  const scenario = SCENARIOS[scenarioKey];
  const activeTokens = scenario.tokens.slice(0, draftLength);

  // Compute accepted tokens count
  let acceptedCount = 0;
  for (let i = 0; i < activeTokens.length; i++) {
    if (activeTokens[i].accepted) {
      acceptedCount++;
    } else {
      break;
    }
  }

  // Target model emits 1 recovery token on the first rejection
  const totalTokensGenerated = acceptedCount + 1;

  // Theoretical speedup calculation
  // Cost = 1 Target Pass + (K * Draft Latency Ratio)
  const relativeCost = 1 + draftLength * scenario.draftRatio;
  const speedup = (totalTokensGenerated / relativeCost).toFixed(2);

  return (
    <VisualizationContainer footer="Speculative Decoding converts memory-bandwidth-bound token generation into compute-bound parallel verification. The draft model proposes K tokens sequentially, and the target model verifies all K tokens in parallel in a single forward pass, yielding 2x to 3x wall-clock speedup without any loss in output distribution.">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: t.accentPrimary }}>
            Algorithmic Acceleration
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: t.textPrimary }}>
            Speculative Decoding: Draft-Verify Acceleration Engine
          </div>
        </div>
        <PillSelect<Scenario>
          label="Workload Entropy"
          value={scenarioKey}
          onChange={setScenarioKey}
          options={[
            { value: 'high_predictable', label: '1. High Predictability (~90% Match)' },
            { value: 'medium_code', label: '2. Typical Python (~70% Match)' },
            { value: 'low_creative', label: '3. High Entropy (~40% Match)' },
          ]}
        />
      </div>

      {/* Slider for Draft Length K */}
      <div style={{ background: t.surfaceAlt, border: `1px solid ${t.border}`, borderRadius: 8, padding: 14, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: t.textPrimary }}>
            Draft Horizon (K): <strong style={{ color: t.accentPrimary }}>{draftLength} Tokens</strong>
          </label>
          <span style={{ fontSize: 12, color: t.textMuted }}>
            Draft Model: 8B parameters | Target Model: 70B parameters
          </span>
        </div>
        <input
          type="range"
          min="1"
          max="5"
          step="1"
          value={draftLength}
          onChange={(e) => setDraftLength(parseInt(e.target.value, 10))}
          style={{ width: '100%', cursor: 'pointer' }}
        />
      </div>

      {/* Visual Pipeline: Draft Phase vs Parallel Target Verification */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 16 }}>
        {/* Phase 1: Draft Model Proposes K tokens */}
        <div style={{ background: t.surfaceAlt, border: `1px solid ${t.border}`, borderRadius: 8, padding: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: t.accentPurple, textTransform: 'uppercase' }}>
              Phase 1: Small Draft Model (Sequential)
            </span>
            <span style={{ fontSize: 10, background: `${t.accentPurple}22`, color: t.accentPurple, padding: '2px 6px', borderRadius: 4 }}>
              Fast Autoregressive
            </span>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
            {activeTokens.map((item, idx) => (
              <div
                key={idx}
                style={{
                  background: t.background,
                  border: `1px solid ${t.border}`,
                  padding: '6px 10px',
                  borderRadius: 6,
                  fontFamily: 'monospace',
                  fontSize: 12,
                  color: t.accentPurple,
                }}
              >
                {item.token}
              </div>
            ))}
          </div>
          <div style={{ fontSize: 11, color: t.textSecondary }}>
            Generated {draftLength} candidate tokens in {draftLength} lightweight forward passes (~{draftLength * 3}ms).
          </div>
        </div>

        {/* Phase 2: Target Model Parallel Verification */}
        <div style={{ background: t.surfaceAlt, border: `1px solid ${t.border}`, borderRadius: 8, padding: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: t.accentPrimary, textTransform: 'uppercase' }}>
              Phase 2: Large Target Model (1 Parallel Pass)
            </span>
            <span style={{ fontSize: 10, background: `${t.accentPrimary}22`, color: t.accentPrimary, padding: '2px 6px', borderRadius: 4 }}>
              O(1) Verification
            </span>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
            {activeTokens.map((item, idx) => {
              const isAccepted = idx < acceptedCount;
              const isFirstRejection = idx === acceptedCount;
              const color = isAccepted ? t.accentPrimary : isFirstRejection ? t.accentDanger : t.textMuted;

              return (
                <div
                  key={idx}
                  style={{
                    background: isAccepted ? `${t.accentPrimary}22` : isFirstRejection ? `${t.accentDanger}22` : t.background,
                    border: `1px solid ${color}`,
                    padding: '6px 10px',
                    borderRadius: 6,
                    fontFamily: 'monospace',
                    fontSize: 12,
                    color: color,
                    fontWeight: 600,
                  }}
                >
                  {isFirstRejection && item.correctionToken ? (
                    <span>
                      <s style={{ opacity: 0.6 }}>{item.token}</s> → {item.correctionToken}
                    </span>
                  ) : (
                    <span>{item.token}</span>
                  )}
                  <span style={{ fontSize: 9, marginLeft: 4 }}>{isAccepted ? '✔' : isFirstRejection ? '✗' : '—'}</span>
                </div>
              );
            })}
          </div>
          <div style={{ fontSize: 11, color: t.textSecondary }}>
            Target model verified all tokens in ONE forward pass (~25ms). Accepted {acceptedCount} tokens + sampled 1 correction token.
          </div>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        <div style={{ background: t.surfaceAlt, border: `1px solid ${t.border}`, borderRadius: 8, padding: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, textTransform: 'uppercase' }}>Net Tokens Emitted</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: t.accentPrimary, marginTop: 2 }}>
            {totalTokensGenerated} Tokens
          </div>
          <div style={{ fontSize: 11, color: t.textSecondary, marginTop: 2 }}>
            In a single target forward pass
          </div>
        </div>

        <div style={{ background: t.surfaceAlt, border: `1px solid ${t.border}`, borderRadius: 8, padding: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, textTransform: 'uppercase' }}>Wall-Clock Speedup</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: Number(speedup) >= 1.5 ? t.accentPrimary : t.accentWarn, marginTop: 2 }}>
            {speedup}x Faster
          </div>
          <div style={{ fontSize: 11, color: t.textSecondary, marginTop: 2 }}>
            Relative to naive autoregressive decoding
          </div>
        </div>

        <div style={{ background: t.surfaceAlt, border: `1px solid ${t.border}`, borderRadius: 8, padding: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, textTransform: 'uppercase' }}>Mathematical Guarantee</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: t.accentTeal, marginTop: 4 }}>
            Lossless Distribution Match
          </div>
          <div style={{ fontSize: 11, color: t.textSecondary, marginTop: 2 }}>
            Modified rejection sampling preserves exact target logits
          </div>
        </div>
      </div>
    </VisualizationContainer>
  );
}
