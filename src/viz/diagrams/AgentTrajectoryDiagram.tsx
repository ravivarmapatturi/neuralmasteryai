import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE } from './diagramSystem';
import { TRAJECTORY, trajectoryQualityScore } from '../lib/llmEval';

export default function AgentTrajectoryDiagram() {
  const t = useVizTokens();
  const { value: selected, pick, stop } = useAutoCycle(TRAJECTORY.length, 2500, 0);
  const step = TRAJECTORY[selected];
  const quality = trajectoryQualityScore(TRAJECTORY);
  const taskSucceeded = true; // the final refund was issued correctly

  return (
    <VisualizationContainer footer={step.note}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {TRAJECTORY.map((s, i) => (
          <div
            key={i}
            onClick={() => { stop(); pick(i); }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); stop(); pick(i); } }}
            onMouseEnter={() => { stop(); pick(i); }}
            style={{
              flex: '1 1 140px', cursor: 'pointer', padding: '0.6rem 0.7rem', borderRadius: 8,
              background: selected === i ? `${t.accentPrimary}18` : t.surfaceAlt,
              border: `1.5px solid ${selected === i ? t.accentPrimary : s.good ? t.border : t.accentDanger}`,
              transition: 'all 0.25s ease',
            }}
          >
            <div style={{ fontSize: 9, color: t.textMuted }}>step {i + 1}</div>
            <div style={{ fontSize: 12, fontWeight: 700, fontFamily: 'monospace', color: t.textPrimary }}>{s.tool}</div>
            <div style={{ fontSize: 10, color: t.textMuted, marginTop: 2, wordBreak: 'break-all' }}>{s.args}</div>
            <div style={{ marginTop: 4, fontSize: 10, fontWeight: 700, color: s.good ? t.accentPrimary : t.accentDanger }}>{s.good ? 'sound' : 'wasted step'}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 20, marginTop: 12, justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: taskSucceeded ? t.accentPrimary : t.accentDanger, fontFamily: 'monospace' }}>{taskSucceeded ? 'PASS' : 'FAIL'}</div>
          <div style={{ fontSize: 11, color: t.textMuted }}>task success rate</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: t.accentWarn, fontFamily: 'monospace' }}>{(quality * 100).toFixed(0)}%</div>
          <div style={{ fontSize: 11, color: t.textMuted }}>real trajectory quality ({TRAJECTORY.filter((s) => s.good).length}/{TRAJECTORY.length} sound steps)</div>
        </div>
      </div>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 8 }}>
        Task success alone would report this run as a clean PASS -- trajectory analysis is what catches the wasted step 2, real signal a coarser metric completely misses.
      </div>
    </VisualizationContainer>
  );
}
