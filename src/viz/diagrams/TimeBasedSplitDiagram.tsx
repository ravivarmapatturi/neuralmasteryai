import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, PillSelect, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

type Mode = 'random' | 'time';
const MODES: Mode[] = ['random', 'time'];

/** A random split scatters train/val/test across the same time range --
 * the model can leak future information into training. A time-based
 * split trains on the past, tests on the future, matching how the model
 * will actually be used. */
export default function TimeBasedSplitDiagram() {
  const t = useVizTokens();
  const { value: modeIdx, pick, stop } = useAutoCycle(MODES.length, 3500, 1);
  const mode = MODES[modeIdx];
  const trainColor = getConceptColor(t, 'query');
  const valColor = t.accentWarn;
  const testColor = getConceptColor(t, 'attention');
  const width = 560;

  const randomAssignment = [0, 1, 2, 0, 1, 0, 2, 0, 1, 2, 0, 0, 1, 0, 2]; // scattered
  const timeAssignment = Array.from({ length: 15 }, (_, i) => (i < 9 ? 0 : i < 12 ? 1 : 2));
  const assignment = mode === 'random' ? randomAssignment : timeAssignment;
  const colors = [trainColor, valColor, testColor];

  return (
    <VisualizationContainer footer={mode === 'random' ? 'Random split: train/val/test scattered across the SAME time range. If the target correlates with time (trends, seasonality), the model can effectively "see the future" during training -- offline metrics look better than the model will actually perform in production.' : 'Time-based split: train on the past, validate and test on strictly later periods -- matches how the model will actually be used (predicting forward), so offline evaluation isn\'t artificially optimistic.'}>
      <PillSelect<Mode>
        label="Split strategy"
        value={mode}
        onChange={(val) => {
          const next = typeof val === 'function' ? val(mode) : val;
          const idx = MODES.indexOf(next);
          if (idx >= 0) pick(idx);
          stop();
        }}
        options={[{ value: 'random', label: 'Random split' }, { value: 'time', label: 'Time-based split' }]}
      />
      <svg width="100%" viewBox={`0 0 ${width} 70`} style={{ display: 'block', marginTop: 10 }}>
        <text x={10} y={16} fontSize={9} fill={t.textMuted}>← earlier</text>
        <text x={width - 60} y={16} fontSize={9} fill={t.textMuted}>later →</text>
        {assignment.map((cls, i) => (
          <rect key={i} x={10 + i * ((width - 20) / assignment.length)} y={24} width={(width - 20) / assignment.length - 3} height={30} rx={3} fill={colors[cls]} opacity={0.8} style={{ transition: 'all 0.3s ease' }} />
        ))}
      </svg>
      <div style={{ display: 'flex', gap: 16, justifyContent: 'center', fontSize: DIAGRAM_TYPE.caption.size, marginTop: 4 }}>
        <span style={{ color: trainColor }}>■ train</span>
        <span style={{ color: valColor }}>■ val</span>
        <span style={{ color: testColor }}>■ test</span>
      </div>
    </VisualizationContainer>
  );
}
