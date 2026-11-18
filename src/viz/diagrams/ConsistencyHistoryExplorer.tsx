import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, VisualizationHeader, PillSelect, useAutoCycle, FlowDots } from '../primitives';

const histories = {
  own: { events: ['Client writes 8', 'Write succeeds', 'Same client reads 7'], ryw: false, monotonic: true, linearizable: false },
  backward: { events: ['Client reads 8', 'No later writes', 'Same client reads 7'], ryw: true, monotonic: false, linearizable: false },
  other: { events: ['Alice writes 8', 'Write succeeds', 'Bob later reads 7'], ryw: true, monotonic: true, linearizable: false },
  valid: { events: ['Client writes 8', 'Write succeeds', 'Same client reads 8'], ryw: true, monotonic: true, linearizable: true },
};

type HistoryKey = keyof typeof histories;
const HISTORY_KEYS: HistoryKey[] = ['own', 'backward', 'other', 'valid'];

export default function ConsistencyHistoryExplorer() {
  const t = useVizTokens();
  const { value: histIdx, pick, stop } = useAutoCycle(HISTORY_KEYS.length, 3000, 1);
  const history = HISTORY_KEYS[histIdx];
  const [guarantee, setGuarantee] = useState<'ryw' | 'monotonic' | 'linearizable'>('monotonic');
  const h = histories[history];
  const allowed = h[guarantee];

  return (
    <VisualizationContainer footer="The examples use one register changing from version 7 to 8 with no subsequent writes. The verdict tests only the selected guarantee on these chosen histories; read-your-writes and monotonic reads constrain different session relationships.">
      <VisualizationHeader title="Which promise rules out this history?" description="Change the request history and the guarantee independently. Events run from top to bottom." />
      <PillSelect<HistoryKey>
        label="Request history"
        value={history}
        onChange={(val) => {
          const next = typeof val === 'function' ? val(history) : val;
          const idx = HISTORY_KEYS.indexOf(next);
          if (idx >= 0) pick(idx);
          stop();
        }}
        options={[
          { value: 'own', label: 'Own write' },
          { value: 'backward', label: 'Backward read' },
          { value: 'other', label: 'Other client' },
          { value: 'valid', label: 'Current read' },
        ]}
      />
      <PillSelect<'ryw' | 'monotonic' | 'linearizable'>
        label="Guarantee to check"
        value={guarantee}
        onChange={(val) => {
          const next = typeof val === 'function' ? val(guarantee) : val;
          setGuarantee(next);
          stop();
        }}
        options={[
          { value: 'ryw', label: 'Read your writes' },
          { value: 'monotonic', label: 'Monotonic reads' },
          { value: 'linearizable', label: 'Linearizable' },
        ]}
      />
      <svg viewBox="0 0 300 230" width="100%" role="img" aria-label={`${h.events.join('; ')}; ${allowed ? 'not ruled out' : 'forbidden'} by ${guarantee}`}>
        <FlowDots d="M 148 59 V 160" color={t.accentPrimary} dur={2.4} />
        {h.events.map((event, i) => (
          <g key={i}>
            <rect x={8} y={8 + i * 75} width={280} height={48} fill={t.surfaceAlt} stroke={t.border} />
            <text x={148} y={38 + i * 75} textAnchor="middle" fill={t.textPrimary} fontSize={14}>{event}</text>
            {i < 2 && <path d={`M148 ${59 + i * 75} V${80 + i * 75} M143 ${73 + i * 75} L148 ${80 + i * 75} L153 ${73 + i * 75}`} fill="none" stroke={t.accentPrimary} />}
          </g>
        ))}
      </svg>
      <p role="status">{allowed ? 'Not ruled out by this guarantee alone.' : 'This history violates the selected guarantee.'}</p>
    </VisualizationContainer>
  );
}
