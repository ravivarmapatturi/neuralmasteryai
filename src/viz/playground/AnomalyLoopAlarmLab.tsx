import { useMemo, useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { Slider, VisualizationContainer, VisualizationHeader, usePrefersReducedMotion } from '../primitives';
import {
  evaluateAgentSuite,
  SAMPLE_AGENT_TRACES,
  type DetectorConfig,
} from './anomalyLoopDetector';
import './playgroundTools.css';

export default function AnomalyLoopAlarmLab() {
  const t = useVizTokens();
  const reducedMotion = usePrefersReducedMotion();

  const [maxRepeatFailures, setMaxRepeatFailures] = useState(3);
  const [pingPongEnabled, setPingPongEnabled] = useState(true);
  const [costSpikeZScore, setCostSpikeZScore] = useState(2.5);
  const [windowSize, setWindowSize] = useState(6);
  const [selectedTraceId, setSelectedTraceId] = useState(SAMPLE_AGENT_TRACES[0].id);

  const config = useMemo<DetectorConfig>(
    () => ({ maxRepeatFailures, pingPongEnabled, costSpikeZScore, windowSize }),
    [maxRepeatFailures, pingPongEnabled, costSpikeZScore, windowSize],
  );

  const suite = useMemo(() => evaluateAgentSuite(SAMPLE_AGENT_TRACES, config), [config]);
  const selectedEval =
    suite.evaluations.find((e) => e.trace.id === selectedTraceId) ?? suite.evaluations[0];

  return (
    <VisualizationContainer
      title="Anomaly & Loop Alarm Threshold Lab"
      footer={`Evaluating 12 agent traces (6 failure loops, 6 healthy runs): Precision ${(suite.precision * 100).toFixed(0)}%, Recall ${(suite.recall * 100).toFixed(0)}%, F1 ${(suite.f1 * 100).toFixed(0)}% — ${suite.totalTokensSaved.toLocaleString()} runaway tokens prevented vs. ${suite.falseAlarmTokensLost.toLocaleString()} healthy tokens interrupted.`}
    >
      <div className={`nm-pg${reducedMotion ? ' nm-pg--reduced-motion' : ''}`}>
        <VisualizationHeader
          eyebrow="Agent sentinel calibration"
          title="Tune loop bounds and cost-spike z-scores against real traces"
          description="Too strict breaks healthy retries and multi-file edits; too loose lets runaway failure loops drain token budgets."
        />

        <div className="nm-pg__grid-equal" style={{ marginBottom: '1rem' }}>
          <div className="nm-pg__panel">
            <h3 className="nm-pg__panel-title">Sentinel thresholds</h3>
            <Slider
              label="Consecutive identical failing calls (K)"
              value={maxRepeatFailures}
              onChange={setMaxRepeatFailures}
              min={2}
              max={6}
              step={1}
              format={(v) => `${v} failures`}
            />
            <Slider
              label="Cost-spike z-score threshold"
              value={costSpikeZScore}
              onChange={setCostSpikeZScore}
              min={1.0}
              max={4.5}
              step={0.25}
              format={(v) => `${v.toFixed(2)} σ`}
            />
            <Slider
              label="Baseline sliding window (turns)"
              value={windowSize}
              onChange={setWindowSize}
              min={3}
              max={10}
              step={1}
              format={(v) => `${v} turns`}
            />
            <div className="nm-pg__checks" style={{ marginTop: '0.5rem' }}>
              <button
                type="button"
                className="nm-pg__chip-btn"
                aria-pressed={pingPongEnabled}
                onClick={() => setPingPongEnabled((v) => !v)}
              >
                Ping-pong A↔B cycle detector: {pingPongEnabled ? 'On' : 'Off'}
              </button>
            </div>
          </div>

          <div className="nm-pg__panel">
            <h3 className="nm-pg__panel-title">Detection scorecard (12 benchmark traces)</h3>
            <div className="nm-pg__kpis" style={{ marginBottom: '0.6rem' }}>
              <div className={`nm-pg__kpi ${suite.precision >= 0.9 ? 'nm-pg__kpi--good' : 'nm-pg__kpi--warn'}`}>
                Precision (TP / (TP+FP))
                <strong>{(suite.precision * 100).toFixed(1)}%</strong>
              </div>
              <div className={`nm-pg__kpi ${suite.recall >= 0.9 ? 'nm-pg__kpi--good' : 'nm-pg__kpi--bad'}`}>
                Recall (TP / (TP+FN))
                <strong>{(suite.recall * 100).toFixed(1)}%</strong>
              </div>
              <div className="nm-pg__kpi">
                TP / FP / FN / TN
                <strong>{suite.tp} / {suite.fp} / {suite.fn} / {suite.tn}</strong>
              </div>
            </div>
            <div className="nm-pg__formula">
              z = (cost_t - mean_window) / std_window · LoopTrigger(t) = all(sig_i == sig_t and exit_i != 0 for last K turns)
            </div>
            <p className="nm-pg__sub" style={{ margin: 0 }}>
              Saved on true alarms: <strong>{suite.totalTokensSaved.toLocaleString()}</strong> tokens · Interrupted on false alarms: <strong>{suite.falseAlarmTokensLost.toLocaleString()}</strong> tokens.
            </p>
          </div>
        </div>

        <div className="nm-pg__grid-2">
          <div className="nm-pg__panel">
            <h3 className="nm-pg__panel-title">Select a trace to inspect</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
              {suite.evaluations.map((ev) => {
                const isSelected = ev.trace.id === selectedEval.trace.id;
                const statusLabel = ev.trace.isAnomaly
                  ? ev.flagged
                    ? `TP · stopped @T${ev.triggeredTurn}`
                    : 'FN · missed loop'
                  : ev.flagged
                    ? `FP · false alarm @T${ev.triggeredTurn}`
                    : 'TN · allowed';
                const badgeClass =
                  (ev.trace.isAnomaly && ev.flagged) || (!ev.trace.isAnomaly && !ev.flagged)
                    ? 'nm-pg__badge--good'
                    : ev.flagged
                      ? 'nm-pg__badge--warn'
                      : 'nm-pg__badge--bad';
                return (
                  <button
                    key={ev.trace.id}
                    type="button"
                    className="nm-pg__chip-btn"
                    aria-pressed={isSelected}
                    onClick={() => setSelectedTraceId(ev.trace.id)}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '0.5rem',
                      textAlign: 'left',
                      borderRadius: '10px 4px 12px 3px / 3px 12px 4px 10px',
                    }}
                  >
                    <span>
                      {ev.trace.title}{' '}
                      <span style={{ color: t.textMuted, fontSize: 13 }}>({ev.trace.category})</span>
                    </span>
                    <span className={`nm-pg__badge ${badgeClass}`}>{statusLabel}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="nm-pg__panel">
            <h3 className="nm-pg__panel-title">{selectedEval.trace.title}</h3>
            <p className="nm-pg__sub">{selectedEval.trace.summary}</p>
            <p className="nm-pg__sub" style={{ fontWeight: 600, color: selectedEval.flagged ? t.accentDanger : t.accentPrimary }}>
              {selectedEval.triggerReason
                ? `Sentinel tripped at Turn ${selectedEval.triggeredTurn}: ${selectedEval.triggerReason}`
                : 'No sentinel alarm triggered across all turns.'}
            </p>

            <div className="nm-pg__table-wrap">
              <table className="nm-pg__table">
                <thead>
                  <tr>
                    <th>Turn</th>
                    <th>Tool & sorted hash</th>
                    <th>Exit</th>
                    <th>Tokens / Cost</th>
                    <th>z-score</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedEval.trace.turns.map((turn, idx) => {
                    const diag = selectedEval.turnDiagnostics[idx];
                    const trippedHere = selectedEval.triggeredTurn === turn.turn;
                    return (
                      <tr
                        key={turn.turn}
                        style={trippedHere ? { background: t.surfaceAlt, fontWeight: 700 } : undefined}
                      >
                        <td>T{turn.turn}</td>
                        <td>
                          <code>{diag.signature}</code>
                          {diag.alarm && (
                            <div style={{ fontSize: 13, color: t.accentDanger }}>{diag.alarm}</div>
                          )}
                        </td>
                        <td style={{ color: turn.exitCode === 0 ? t.accentPrimary : t.accentDanger }}>
                          {turn.exitCode}
                        </td>
                        <td>
                          {turn.tokens.toLocaleString()} / ${turn.costUsd.toFixed(3)}
                        </td>
                        <td>{diag.zScore.toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </VisualizationContainer>
  );
}
