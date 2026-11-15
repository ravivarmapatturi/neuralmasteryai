import { useState } from 'react';
import { useVizTokens, RADIUS, SPACING } from '../../theme/vizTokens';
import { VisualizationContainer, VisualizationHeader, PillSelect } from '../primitives';
import {
  calculateBudgetSummary,
  calculateCapacitySizing,
  DEGRADATION_LADDER,
  PRODUCTION_FUNNEL_BUDGETS,
} from '../lib/searchSystemDesign';

type ActiveTab = 'latency' | 'resilience' | 'capacity';

const TAB_OPTIONS: { value: ActiveTab; label: string }[] = [
  { value: 'latency', label: 'Multi-Stage Latency Budget' },
  { value: 'resilience', label: 'Resilience Fallback Ladder' },
  { value: 'capacity', label: 'Scale & Capacity Planner' },
];

export default function SearchSystemDesignExplorer() {
  const t = useVizTokens();
  const [activeTab, setActiveTab] = useState<ActiveTab>('latency');

  // Latency tab state
  const [targetSla, setTargetSla] = useState<number>(100);

  // Resilience tab state
  const [selectedLevelIndex, setSelectedLevelIndex] = useState<number>(0);

  // Capacity tab state
  const [peakQps, setPeakQps] = useState<number>(5000);
  const [cpuUtil, setCpuUtil] = useState<number>(0.65);

  const budgetSummary = calculateBudgetSummary(PRODUCTION_FUNNEL_BUDGETS, targetSla);
  const currentLevel = DEGRADATION_LADDER[selectedLevelIndex];
  const capacity = calculateCapacitySizing(peakQps, budgetSummary.totalTypicalP99, cpuUtil, 16);

  let footerText = '';
  if (activeTab === 'latency') {
    footerText = `Illustrative latency budget: Total typical p99 is ${budgetSummary.totalTypicalP99} ms against a target SLA of ${targetSla} ms (Margin: ${budgetSummary.marginMs >= 0 ? '+' : ''}${budgetSummary.marginMs} ms). Heavy ML ranking consumes the largest slice (${PRODUCTION_FUNNEL_BUDGETS[3].typicalP99Ms} ms typical p99).`;
  } else if (activeTab === 'resilience') {
    footerText = `Resilience ladder at ${currentLevel.name}: ${currentLevel.triggerCondition}. Active serving path: ${currentLevel.activePath}. Latency drops to ${currentLevel.expectedP99Ms} ms p99 while maintaining illustrative NDCG@10 of ${currentLevel.ndcgQualityEstimate.toFixed(2)}.`;
  } else {
    footerText = `Capacity sizing for peak ${peakQps.toLocaleString()} QPS at ${(cpuUtil * 100).toFixed(0)}% target CPU utilization: requires ${capacity.requiredCores} vCPU cores across ~${capacity.recommendedNodes} serving nodes (16 vCPU each). Catalog vector index requires ~${capacity.catalogMemoryGb.toFixed(1)} GB RAM.`;
  }

  return (
    <div
      role="group"
      aria-label="Interactive Search & Recommendation System Design Explorer"
      style={{
        margin: `${SPACING.lg}px 0`,
        fontFamily: 'var(--font-sans, system-ui, sans-serif)',
      }}
    >
      <VisualizationContainer footer={footerText}>
        <VisualizationHeader
          eyebrow="System Design Architecture"
          title="Search & Recommendation System Design"
          description="Inspect end-to-end latency budgets, multi-tier failure fallback ladders, and production capacity sizing."
        />

        <div style={{ marginBottom: SPACING.md }}>
          <PillSelect
            options={TAB_OPTIONS}
            value={activeTab}
            onChange={(val) => setActiveTab(val as ActiveTab)}
          />
        </div>

        {/* TAB 1: LATENCY BUDGET */}
        {activeTab === 'latency' && (
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
                <label htmlFor="target-sla" style={{ fontSize: '0.85rem', fontWeight: 600, color: t.textPrimary }}>
                  Target End-to-End SLA Budget: {targetSla} ms (p99)
                </label>
                <div style={{ fontSize: '0.75rem', color: t.textSecondary }}>
                  Total typical p99 sum: {budgetSummary.totalTypicalP99} ms (
                  <span style={{ color: budgetSummary.isWithinSla ? '#16a34a' : '#ef4444', fontWeight: 700 }}>
                    {budgetSummary.isWithinSla ? 'Within SLA' : 'SLA Exceeded'}
                  </span>
                  )
                </div>
              </div>
              <input
                id="target-sla"
                type="range"
                min="70"
                max="150"
                step="5"
                value={targetSla}
                onChange={(e) => setTargetSla(parseInt(e.target.value, 10))}
                style={{ width: '180px', accentColor: t.accentPrimary }}
              />
            </div>

            {/* Stages Grid */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: SPACING.sm }}>
              {PRODUCTION_FUNNEL_BUDGETS.map((stage) => {
                const pct = (stage.typicalP99Ms / budgetSummary.totalTypicalP99) * 100;
                return (
                  <div
                    key={stage.id}
                    style={{
                      padding: SPACING.md,
                      borderRadius: RADIUS.md,
                      backgroundColor: t.surfaceAlt,
                      border: `1px solid ${t.border}`,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                      <div>
                        <strong style={{ color: t.textPrimary, fontSize: '0.9rem' }}>{stage.name}</strong>
                        <div style={{ fontSize: '0.75rem', color: t.textSecondary }}>
                          Volume: {stage.inputVolume} → {stage.outputVolume} | Tech: {stage.technology}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', fontFamily: 'monospace' }}>
                        <div style={{ fontSize: '0.9rem', fontWeight: 700, color: t.accentPrimary }}>
                          {stage.typicalP99Ms} ms p99
                        </div>
                        <div style={{ fontSize: '0.7rem', color: t.textSecondary }}>
                          Budget: {stage.budgetP99Ms} ms
                        </div>
                      </div>
                    </div>

                    {/* Latency Bar */}
                    <div style={{ height: 6, backgroundColor: t.border, borderRadius: RADIUS.sm, overflow: 'hidden', marginTop: 6 }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${pct}%`,
                          backgroundColor: stage.id === 'ranking' ? '#ef4444' : t.accentPrimary,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: RESILIENCE LADDER */}
        {activeTab === 'resilience' && (
          <div>
            <div style={{ display: 'flex', gap: SPACING.sm, marginBottom: SPACING.lg, flexWrap: 'wrap' }}>
              {DEGRADATION_LADDER.map((lvl, idx) => (
                <button
                  key={lvl.level}
                  type="button"
                  onClick={() => setSelectedLevelIndex(idx)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: RADIUS.sm,
                    border: `1px solid ${selectedLevelIndex === idx ? t.accentPrimary : t.border}`,
                    backgroundColor: selectedLevelIndex === idx ? t.accentPrimary : t.surfaceAlt,
                    color: selectedLevelIndex === idx ? t.background : t.textPrimary,
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Level {lvl.level}
                </button>
              ))}
            </div>

            <div
              style={{
                padding: SPACING.lg,
                borderRadius: RADIUS.md,
                backgroundColor: t.surfaceAlt,
                border: `2px solid ${t.accentPrimary}`,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm }}>
                <h4 style={{ margin: 0, fontSize: '1.1rem', color: t.textPrimary }}>
                  {currentLevel.name}
                </h4>
                <span
                  style={{
                    fontSize: '0.8rem',
                    padding: '2px 10px',
                    borderRadius: RADIUS.sm,
                    backgroundColor: currentLevel.level === 1 ? '#16a34a' : currentLevel.level === 4 ? '#ef4444' : '#eab308',
                    color: '#ffffff',
                    fontWeight: 700,
                  }}
                >
                  p99 ≤ {currentLevel.expectedP99Ms} ms
                </span>
              </div>

              <div style={{ fontSize: '0.85rem', lineHeight: 1.6, marginBottom: SPACING.md }}>
                <div>
                  <strong style={{ color: t.textPrimary }}>Trigger Condition: </strong>
                  <span style={{ color: t.textSecondary }}>{currentLevel.triggerCondition}</span>
                </div>
                <div>
                  <strong style={{ color: t.textPrimary }}>Active Serving Path: </strong>
                  <span style={{ color: t.textSecondary }}>{currentLevel.activePath}</span>
                </div>
              </div>

              {/* Quality & Catalog Coverage Indicators */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: SPACING.md,
                  paddingTop: SPACING.md,
                  borderTop: `1px dashed ${t.border}`,
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: t.textPrimary }}>
                    <span>Estimated NDCG@10 Quality</span>
                    <strong>{(currentLevel.ndcgQualityEstimate * 100).toFixed(0)}%</strong>
                  </div>
                  <div style={{ height: 8, backgroundColor: t.border, borderRadius: RADIUS.sm, overflow: 'hidden', marginTop: 4 }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${currentLevel.ndcgQualityEstimate * 100}%`,
                        backgroundColor: t.accentPrimary,
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: t.textPrimary }}>
                    <span>Catalog Reach / Personalization</span>
                    <strong>{currentLevel.catalogCoveragePercent}%</strong>
                  </div>
                  <div style={{ height: 8, backgroundColor: t.border, borderRadius: RADIUS.sm, overflow: 'hidden', marginTop: 4 }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${currentLevel.catalogCoveragePercent}%`,
                        backgroundColor: '#16a34a',
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: CAPACITY PLANNER */}
        {activeTab === 'capacity' && (
          <div>
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
                  <label htmlFor="peak-qps" style={{ fontSize: '0.85rem', fontWeight: 600, color: t.textPrimary }}>
                    Peak Query Load (QPS)
                  </label>
                  <span style={{ fontSize: '0.85rem', color: t.accentPrimary, fontFamily: 'monospace' }}>
                    {peakQps.toLocaleString()}
                  </span>
                </div>
                <input
                  id="peak-qps"
                  type="range"
                  min="1000"
                  max="20000"
                  step="1000"
                  value={peakQps}
                  onChange={(e) => setPeakQps(parseInt(e.target.value, 10))}
                  style={{ width: '100%', accentColor: t.accentPrimary }}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: SPACING.xs }}>
                  <label htmlFor="cpu-util" style={{ fontSize: '0.85rem', fontWeight: 600, color: t.textPrimary }}>
                    Target CPU Utilization
                  </label>
                  <span style={{ fontSize: '0.85rem', color: t.accentPrimary, fontFamily: 'monospace' }}>
                    {(cpuUtil * 100).toFixed(0)}%
                  </span>
                </div>
                <input
                  id="cpu-util"
                  type="range"
                  min="0.4"
                  max="0.85"
                  step="0.05"
                  value={cpuUtil}
                  onChange={(e) => setCpuUtil(parseFloat(e.target.value))}
                  style={{ width: '100%', accentColor: t.accentPrimary }}
                />
              </div>
            </div>

            {/* Capacity Result Cards */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: SPACING.md,
              }}
            >
              <div style={{ padding: SPACING.md, borderRadius: RADIUS.md, backgroundColor: t.surfaceAlt, border: `1px solid ${t.border}` }}>
                <span style={{ fontSize: '0.75rem', color: t.textSecondary, textTransform: 'uppercase', fontWeight: 600 }}>
                  Required Compute Cores
                </span>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: t.textPrimary, fontFamily: 'monospace', marginTop: SPACING.xs }}>
                  {capacity.requiredCores} vCPUs
                </div>
                <div style={{ fontSize: '0.75rem', color: t.textSecondary, marginTop: 4 }}>
                  (QPS × Latency) / Utilization
                </div>
              </div>

              <div style={{ padding: SPACING.md, borderRadius: RADIUS.md, backgroundColor: t.surfaceAlt, border: `1px solid ${t.border}` }}>
                <span style={{ fontSize: '0.75rem', color: t.textSecondary, textTransform: 'uppercase', fontWeight: 600 }}>
                  Serving Nodes (16-vCPU)
                </span>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: t.accentPrimary, fontFamily: 'monospace', marginTop: SPACING.xs }}>
                  ~{capacity.recommendedNodes} Nodes
                </div>
                <div style={{ fontSize: '0.75rem', color: t.textSecondary, marginTop: 4 }}>
                  Stateless serving instances
                </div>
              </div>

              <div style={{ padding: SPACING.md, borderRadius: RADIUS.md, backgroundColor: t.surfaceAlt, border: `1px solid ${t.border}` }}>
                <span style={{ fontSize: '0.75rem', color: t.textSecondary, textTransform: 'uppercase', fontWeight: 600 }}>
                  Vector & Catalog RAM
                </span>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: t.textPrimary, fontFamily: 'monospace', marginTop: SPACING.xs }}>
                  ~{capacity.catalogMemoryGb.toFixed(1)} GB
                </div>
                <div style={{ fontSize: '0.75rem', color: t.textSecondary, marginTop: 4 }}>
                  50M items with 256d float32 vectors
                </div>
              </div>
            </div>
          </div>
        )}
      </VisualizationContainer>
    </div>
  );
}
