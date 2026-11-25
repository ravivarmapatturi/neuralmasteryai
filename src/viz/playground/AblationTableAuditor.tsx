import { useMemo, useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { PillSelect, VisualizationContainer, VisualizationHeader, usePrefersReducedMotion } from '../primitives';
import {
  auditPaperScenario,
  PAPER_AUDIT_SCENARIOS,
} from './ablationAuditor';
import './playgroundTools.css';

export default function AblationTableAuditor() {
  const t = useVizTokens();
  const reducedMotion = usePrefersReducedMotion();

  const [scenarioId, setScenarioId] = useState(PAPER_AUDIT_SCENARIOS[0].id);
  const [normalizeCompute, setNormalizeCompute] = useState(false);
  const [showConfidenceIntervals, setShowConfidenceIntervals] = useState(true);
  const [matchBaselineTuning, setMatchBaselineTuning] = useState(false);
  const [deduplicateLeakage, setDeduplicateLeakage] = useState(false);

  const scenario = PAPER_AUDIT_SCENARIOS.find((s) => s.id === scenarioId) ?? PAPER_AUDIT_SCENARIOS[0];
  const [enabledComponents, setEnabledComponents] = useState<string[]>(
    scenario.variants.map((v) => v.id),
  );

  const handleScenarioChange = (nextId: string) => {
    const next = PAPER_AUDIT_SCENARIOS.find((s) => s.id === nextId) ?? PAPER_AUDIT_SCENARIOS[0];
    setScenarioId(next.id);
    setEnabledComponents(next.variants.map((v) => v.id));
  };

  const toggleComponent = (id: string) => {
    setEnabledComponents((prev) => {
      if (prev.includes(id)) {
        return prev.length > 1 ? prev.filter((item) => item !== id) : prev;
      }
      return [...prev, id];
    });
  };

  const result = useMemo(
    () =>
      auditPaperScenario(scenario, {
        normalizeCompute,
        showConfidenceIntervals,
        matchBaselineTuning,
        deduplicateLeakage,
        enabledComponents,
      }),
    [scenario, normalizeCompute, showConfidenceIntervals, matchBaselineTuning, deduplicateLeakage, enabledComponents],
  );

  const allScores = [result.adjustedBaselineScore, ...result.rows.map((r) => r.adjustedScore)];
  const minAxis = Math.floor(Math.min(...allScores) - 4);
  const maxAxis = Math.ceil(Math.max(...allScores) + 4);
  const scaleX = (val: number) => 190 + ((val - minAxis) / Math.max(1, maxAxis - minAxis)) * 430;

  return (
    <VisualizationContainer
      title="Paper Reading & Ablation Table Auditor"
      footer={`Illustrative paper audit (${scenario.title}): Verdict is ${result.verdict}. Adjusted best delta over baseline: ${result.bestVariantDelta >= 0 ? '+' : ''}${result.bestVariantDelta.toFixed(1)} pts.`}
    >
      <div className={`nm-pg${reducedMotion ? ' nm-pg--reduced-motion' : ''}`}>
        <VisualizationHeader
          eyebrow="Illustrative paper ablation audit"
          title="Test whether a headline gain survives equal compute and error bars"
          description="Toggle fairness checks and ablate proposed additions to separate genuine method improvements from compute gaps, overlapping seeds, and weak baselines."
        />

        <div className="nm-pg__controls" style={{ marginBottom: '1rem' }}>
          <PillSelect<string>
            label="Illustrative paper scenario"
            value={scenarioId}
            onChange={handleScenarioChange}
            options={PAPER_AUDIT_SCENARIOS.map((s) => ({ value: s.id, label: s.title }))}
          />

          <div>
            <div style={{ fontSize: 14, color: t.textSecondary, marginBottom: 6 }}>
              Reviewer audit controls
            </div>
            <div className="nm-pg__checks" role="group" aria-label="Audit fairness controls">
              <button type="button" className="nm-pg__chip-btn" aria-pressed={normalizeCompute} onClick={() => setNormalizeCompute((v) => !v)}>
                Normalize compute to 1.0×
              </button>
              <button type="button" className="nm-pg__chip-btn" aria-pressed={showConfidenceIntervals} onClick={() => setShowConfidenceIntervals((v) => !v)}>
                Show 95% confidence intervals
              </button>
              <button type="button" className="nm-pg__chip-btn" aria-pressed={matchBaselineTuning} onClick={() => setMatchBaselineTuning((v) => !v)}>
                Match baseline LR tuning
              </button>
              <button type="button" className="nm-pg__chip-btn" aria-pressed={deduplicateLeakage} onClick={() => setDeduplicateLeakage((v) => !v)}>
                Deduplicate eval leakage
              </button>
            </div>
          </div>

          {scenario.variants.length > 1 && (
            <div>
              <div style={{ fontSize: 14, color: t.textSecondary, marginBottom: 6 }}>
                Include ablation rows
              </div>
              <div className="nm-pg__checks">
                {scenario.variants.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    className="nm-pg__chip-btn"
                    aria-pressed={enabledComponents.includes(v.id)}
                    onClick={() => toggleComponent(v.id)}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="nm-pg__kpis" aria-label="Audit verdict summary">
          <div className="nm-pg__kpi">
            Paper headline
            <strong>{scenario.claimedHeadline}</strong>
          </div>
          <div className="nm-pg__kpi">
            Audited net delta
            <strong>{result.bestVariantDelta >= 0 ? '+' : ''}{result.bestVariantDelta.toFixed(1)} pts</strong>
          </div>
          <div
            className={`nm-pg__kpi ${
              result.verdict === 'Supported'
                ? 'nm-pg__kpi--good'
                : result.verdict.startsWith('Inconclusive')
                  ? 'nm-pg__kpi--warn'
                  : 'nm-pg__kpi--bad'
            }`}
          >
            Audit verdict
            <strong>{result.verdict}</strong>
          </div>
        </div>

        <p className="nm-pg__sub" style={{ fontWeight: 600 }}>{result.explanation}</p>

        <div className="nm-pg__panel" style={{ marginBottom: '1rem' }}>
          <h3 className="nm-pg__panel-title">Score comparison & confidence intervals ({scenario.metricName})</h3>
          <svg
            viewBox="0 0 680 185"
            width="100%"
            role="img"
            aria-label={`Interval chart for ${scenario.title} showing baseline ${result.adjustedBaselineScore.toFixed(1)} and audited variants`}
          >
            <line x1={190} y1={145} x2={620} y2={145} stroke={t.border} strokeWidth={1.5} />
            {[minAxis, Math.round((minAxis + maxAxis) / 2), maxAxis].map((tick) => (
              <g key={tick}>
                <line x1={scaleX(tick)} y1={140} x2={scaleX(tick)} y2={150} stroke={t.border} />
                <text x={scaleX(tick)} y={168} textAnchor="middle" fontSize={13} fill={t.textSecondary}>
                  {tick}%
                </text>
              </g>
            ))}

            {/* Baseline row */}
            <g>
              <text x={180} y={42} textAnchor="end" fontSize={13} fontWeight={700} fill={t.textPrimary}>
                Baseline
              </text>
              {showConfidenceIntervals && (
                <line
                  x1={scaleX(result.adjustedBaselineScore - scenario.baseline.ciHalfWidth)}
                  y1={37}
                  x2={scaleX(result.adjustedBaselineScore + scenario.baseline.ciHalfWidth)}
                  y2={37}
                  stroke={t.textMuted}
                  strokeWidth={3}
                />
              )}
              <circle cx={scaleX(result.adjustedBaselineScore)} cy={37} r={6} fill={t.textPrimary} />
              <text x={scaleX(result.adjustedBaselineScore) + 12} y={42} fontSize={13} fill={t.textPrimary}>
                {result.adjustedBaselineScore.toFixed(1)}%
              </text>
            </g>

            {/* Variant rows */}
            {result.rows.map((row, idx) => {
              const y = 78 + idx * 34;
              const cx = scaleX(row.adjustedScore);
              const color = row.overlapsBaselineCI ? t.accentWarn : t.accentPrimary;
              return (
                <g key={row.variant.id}>
                  <text x={180} y={y + 5} textAnchor="end" fontSize={13} fontWeight={600} fill={t.textPrimary}>
                    {row.variant.label.slice(0, 24)}
                  </text>
                  {showConfidenceIntervals && (
                    <line
                      x1={scaleX(row.adjustedScore - row.variant.ciHalfWidth)}
                      y1={y}
                      x2={scaleX(row.adjustedScore + row.variant.ciHalfWidth)}
                      y2={y}
                      stroke={color}
                      strokeWidth={3}
                    />
                  )}
                  <circle cx={cx} cy={y} r={6} fill={color} />
                  <text x={cx + 12} y={y + 5} fontSize={13} fontWeight={700} fill={color}>
                    {row.adjustedScore.toFixed(1)}% ({row.deltaFromBaseline >= 0 ? '+' : ''}{row.deltaFromBaseline.toFixed(1)})
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        <div className="nm-pg__table-wrap">
          <table className="nm-pg__table">
            <thead>
              <tr>
                <th>Configuration</th>
                <th>Reported</th>
                <th>Audited</th>
                <th>Compute</th>
                <th>Review note</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>{scenario.baseline.label}</strong></td>
                <td>{scenario.baseline.score.toFixed(1)}%</td>
                <td>{result.adjustedBaselineScore.toFixed(1)}%</td>
                <td>{scenario.baseline.computeRatio.toFixed(1)}×</td>
                <td>{scenario.baseline.note}</td>
              </tr>
              {result.rows.map((r) => (
                <tr key={r.variant.id}>
                  <td><strong>{r.variant.label}</strong></td>
                  <td>{r.variant.score.toFixed(1)}%</td>
                  <td>{r.adjustedScore.toFixed(1)}% ({r.deltaFromBaseline >= 0 ? '+' : ''}{r.deltaFromBaseline.toFixed(1)})</td>
                  <td>{r.variant.computeRatio.toFixed(1)}×</td>
                  <td>{r.variant.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </VisualizationContainer>
  );
}
