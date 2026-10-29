import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, PillSelect } from '../primitives';

const HAND_FONT = "'Kalam', 'Comic Sans MS', cursive";

type BenchmarkTask = 'refactor' | 'bugfix' | 'feature';

interface BenchmarkMetrics {
  completionRate: number; // %
  prematureVictory: number; // %
  runawayLoop: number; // %
  codebaseRegression: number; // %
}

interface TierResult {
  tierName: string;
  badge: string;
  metrics: BenchmarkMetrics;
  highlight: string;
}

export default function HarnessAblationStudio() {
  const t = useVizTokens();
  const [task, setTask] = useState<BenchmarkTask>('feature');

  const getTierData = (tId: BenchmarkTask): TierResult[] => {
    switch (tId) {
      case 'refactor':
        return [
          {
            tierName: 'Prompt-Only LLM',
            badge: 'Zero-Shot',
            metrics: { completionRate: 11, prematureVictory: 86, runawayLoop: 0, codebaseRegression: 48 },
            highlight: 'Outputs snippet in chat, claims refactor complete without checking imports or types.',
          },
          {
            tierName: 'Basic ReAct Agent',
            badge: 'Unverified Loop',
            metrics: { completionRate: 38, prematureVictory: 54, runawayLoop: 22, codebaseRegression: 31 },
            highlight: 'Edits files iteratively but stops early on first partial test pass; breaks adjacent modules.',
          },
          {
            tierName: 'Full Production Harness',
            badge: 'Closed-Loop Cybernetic',
            metrics: { completionRate: 91, prematureVictory: 0, runawayLoop: 3, codebaseRegression: 2 },
            highlight: 'Gated by 3-layer verifier; halts only when full test suite & typecheck confirm zero regressions.',
          },
        ];
      case 'bugfix':
        return [
          {
            tierName: 'Prompt-Only LLM',
            badge: 'Zero-Shot',
            metrics: { completionRate: 18, prematureVictory: 79, runawayLoop: 0, codebaseRegression: 35 },
            highlight: 'Explains bug theoretically; proposes non-compiling snippet with unimported symbols.',
          },
          {
            tierName: 'Basic ReAct Agent',
            badge: 'Unverified Loop',
            metrics: { completionRate: 46, prematureVictory: 42, runawayLoop: 16, codebaseRegression: 24 },
            highlight: 'Loops 8 times modifying test files instead of source code to artificially pass assertions.',
          },
          {
            tierName: 'Full Production Harness',
            badge: 'Closed-Loop Cybernetic',
            metrics: { completionRate: 94, prematureVictory: 0, runawayLoop: 2, codebaseRegression: 1 },
            highlight: 'Sandboxed permissions forbid test tampering; requires deterministic repro test before patching.',
          },
        ];
      case 'feature':
      default:
        return [
          {
            tierName: 'Prompt-Only LLM',
            badge: 'Zero-Shot',
            metrics: { completionRate: 14, prematureVictory: 82, runawayLoop: 0, codebaseRegression: 42 },
            highlight: 'Produces plausible architecture doc but builds 0 functional integrations.',
          },
          {
            tierName: 'Basic ReAct Agent',
            badge: 'Unverified Loop',
            metrics: { completionRate: 42, prematureVictory: 49, runawayLoop: 28, codebaseRegression: 29 },
            highlight: 'Suffers context rot after turn 9; re-implements already existing helper functions.',
          },
          {
            tierName: 'Full Production Harness',
            badge: 'Closed-Loop Cybernetic',
            metrics: { completionRate: 93, prematureVictory: 0, runawayLoop: 2, codebaseRegression: 2 },
            highlight: 'feature_list.json tracks completed subtasks; memory compactor keeps token budget sharp.',
          },
        ];
    }
  };

  const tiers = getTierData(task);

  return (
    <VisualizationContainer
      footer="Empirical Ablation: Testing the identical frontier LLM across 3 harness configurations. The model reasoning engine is held constant -- all performance gains in task completion and safety come entirely from the engineering of the surrounding harness."
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <PillSelect<BenchmarkTask>
          label="Benchmark Scenario"
          value={task}
          onChange={setTask}
          options={[
            { value: 'feature', label: '1. Multi-Page Feature Addition' },
            { value: 'bugfix', label: '2. Deep Concurrency Bug Fix' },
            { value: 'refactor', label: '3. 50-File Architectural Refactor' },
          ]}
        />
        <div style={{ fontSize: 12, fontFamily: HAND_FONT, color: t.textSecondary }}>
          Same Foundation Model, <strong style={{ color: t.accentPrimary }}>Different Harness Architecture</strong>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
        {tiers.map((tier, idx) => {
          const isFullHarness = idx === 2;
          const borderColor = isFullHarness ? t.accentPrimary : idx === 1 ? t.accentWarn : t.border;
          return (
            <div
              key={tier.tierName}
              style={{
                padding: 16,
                borderRadius: 8,
                background: t.surface,
                border: `1.5px solid ${borderColor}`,
                boxShadow: isFullHarness ? `0 2px 14px ${t.accentPrimary}20` : 'none',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '2px 7px',
                      borderRadius: 4,
                      fontSize: 10,
                      fontWeight: 700,
                      background: isFullHarness ? `${t.accentPrimary}25` : t.surfaceAlt,
                      color: isFullHarness ? t.accentPrimary : t.textMuted,
                      marginBottom: 4,
                    }}
                  >
                    {tier.badge}
                  </span>
                  <div style={{ fontSize: 14, fontWeight: 700, color: t.textPrimary }}>{tier.tierName}</div>
                </div>
              </div>

              {/* Metrics */}
              <div style={{ margin: '14px 0 12px', display: 'grid', gap: 8 }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 2 }}>
                    <span style={{ color: t.textSecondary, fontWeight: 500 }}>Task Completion</span>
                    <strong style={{ color: isFullHarness ? t.accentPrimary : t.textPrimary }}>{tier.metrics.completionRate}%</strong>
                  </div>
                  <div style={{ width: '100%', height: 6, background: t.surfaceAlt, borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: `${tier.metrics.completionRate}%`, height: '100%', background: isFullHarness ? t.accentPrimary : t.accentSecondary }} />
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 2 }}>
                    <span style={{ color: t.textSecondary, fontWeight: 500 }}>Premature Victory</span>
                    <strong style={{ color: tier.metrics.prematureVictory > 40 ? t.accentDanger : t.accentPrimary }}>{tier.metrics.prematureVictory}%</strong>
                  </div>
                  <div style={{ width: '100%', height: 6, background: t.surfaceAlt, borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: `${tier.metrics.prematureVictory}%`, height: '100%', background: t.accentDanger }} />
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 2 }}>
                    <span style={{ color: t.textSecondary, fontWeight: 500 }}>Codebase Regression</span>
                    <strong style={{ color: tier.metrics.codebaseRegression > 20 ? t.accentDanger : t.accentPrimary }}>{tier.metrics.codebaseRegression}%</strong>
                  </div>
                  <div style={{ width: '100%', height: 6, background: t.surfaceAlt, borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: `${tier.metrics.codebaseRegression}%`, height: '100%', background: tier.metrics.codebaseRegression > 20 ? t.accentDanger : t.accentWarn }} />
                  </div>
                </div>
              </div>

              <div
                style={{
                  padding: 8,
                  borderRadius: 4,
                  background: t.surfaceAlt,
                  fontSize: 11,
                  color: t.textMuted,
                  lineHeight: 1.35,
                  minHeight: 46,
                }}
              >
                {tier.highlight}
              </div>
            </div>
          );
        })}
      </div>
    </VisualizationContainer>
  );
}
