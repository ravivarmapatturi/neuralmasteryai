import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, VisualizationHeader, PillSelect, useAutoCycle, FlowDots } from '../primitives';

const POLICIES: ('delete' | 'fenced')[] = ['delete', 'fenced'];

export default function CacheInvalidationRaceExplorer() {
  const t = useVizTokens();
  const { value: policyIdx, pick, stop } = useAutoCycle(POLICIES.length, 3500, 0);
  const policy = POLICIES[policyIdx];
  const events = [
    'Reader fetches version 7',
    'Writer commits version 8',
    policy === 'delete' ? 'Writer deletes cached payload' : 'Writer retains version floor 8',
    policy === 'delete' ? 'Delayed fill stores version 7' : 'Delayed fill of 7 is rejected',
  ];

  return (
    <VisualizationContainer footer="The reader fetched version 7 before the writer committed version 8 but fills afterward. Ordinary deletion cannot recall that old result. The fenced model rejects it only if the minimum version survives and the comparison and fill occur atomically.">
      <VisualizationHeader title="A stale fill can arrive after a correct invalidation" description="The event order stays fixed. Change only whether invalidation retains a version floor for later fills." />
      <PillSelect<'delete' | 'fenced'>
        label="Fill policy"
        value={policy}
        onChange={(val) => {
          const next = typeof val === 'function' ? val(policy) : val;
          const idx = POLICIES.indexOf(next);
          if (idx >= 0) pick(idx);
          stop();
        }}
        options={[
          { value: 'delete', label: 'Delete only' },
          { value: 'fenced', label: 'Retain version fence' },
        ]}
      />
      <svg viewBox="0 0 300 285" width="100%" role="img" aria-label={policy === 'delete' ? 'Delayed version 7 refills after version 8 commits' : 'Retained floor 8 rejects delayed version 7 fill'}>
        <FlowDots d="M 148 56 V 215" color={t.accentPrimary} dur={2.8} />
        {events.map((event, i) => (
          <g key={i}>
            <rect x={8} y={8 + i * 70} width={280} height={45} fill={t.surfaceAlt} stroke={t.border} />
            <text x={148} y={36 + i * 70} textAnchor="middle" fill={t.textPrimary} fontSize={14}>{event}</text>
            {i < 3 && <path d={`M148 ${56 + i * 70} V${75 + i * 70} M143 ${68 + i * 70} L148 ${75 + i * 70} L153 ${68 + i * 70}`} fill="none" stroke={t.accentPrimary} />}
          </g>
        ))}
      </svg>
      <p role="status">{policy === 'delete' ? 'Next hit returns stale version 7.' : 'Payload remains absent; a current fetch is still required.'}</p>
    </VisualizationContainer>
  );
}
