import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, PillSelect, useAutoCycle } from '../primitives';
import { getConceptColor } from './diagramSystem';

type Level = 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
const LEVEL_ORDER: Level[] = ['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL'];

const MESSAGES: { level: Level; text: string }[] = [
  { level: 'DEBUG', text: 'batch shape: (32, 512), dtype: float32' },
  { level: 'INFO', text: 'checkpoint saved to s3://models/run-42/step-1000' },
  { level: 'WARNING', text: 'validation loss increased for 3 consecutive epochs' },
  { level: 'ERROR', text: 'failed to connect to feature store after 3 retries' },
  { level: 'CRITICAL', text: 'out of GPU memory -- training process terminated' },
];

export default function LogLevelFilterDiagram() {
  const t = useVizTokens();
  const { value: levelIdx, pick: setLevelIdx, stop } = useAutoCycle(LEVEL_ORDER.length, 3000, 1);
  const threshold = LEVEL_ORDER[levelIdx];
  const thresholdIdx = LEVEL_ORDER.indexOf(threshold);
  const passColor = getConceptColor(t, 'attention');

  const levelColor = (level: Level) =>
    level === 'DEBUG' || level === 'INFO' ? t.textSecondary : level === 'WARNING' ? t.accentWarn : t.accentDanger;

  return (
    <VisualizationContainer footer={`Set to ${threshold}: every message at this level or more severe is emitted; everything below is silently suppressed. Running at WARNING in production and temporarily dropping to DEBUG to investigate an issue is exactly this slider -- no code changes, no redeploying, just reconfiguring the threshold.`}>
      <PillSelect<Level>
        label="Minimum level"
        value={threshold}
        onChange={(val) => {
          const v = typeof val === 'function' ? val(threshold) : val;
          stop();
          setLevelIdx(LEVEL_ORDER.indexOf(v));
        }}
        options={LEVEL_ORDER.map((l) => ({ value: l, label: l }))}
      />
      <div style={{ marginTop: 10 }}>
        {MESSAGES.map((m, i) => {
          const passes = LEVEL_ORDER.indexOf(m.level) >= thresholdIdx;
          return (
            <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '6px 0', opacity: passes ? 1 : 0.3, transition: 'opacity 0.25s ease' }}>
              <div style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700, color: levelColor(m.level), minWidth: 70 }}>{m.level}</div>
              <div style={{ fontFamily: 'monospace', fontSize: 12, color: passes ? t.textPrimary : t.textMuted, textDecoration: passes ? 'none' : 'line-through' }}>{m.text}</div>
              <div style={{ marginLeft: 'auto', color: passes ? passColor : t.textMuted, fontSize: 12, fontWeight: 700 }}>{passes ? 'emitted' : 'suppressed'}</div>
            </div>
          );
        })}
      </div>
    </VisualizationContainer>
  );
}
