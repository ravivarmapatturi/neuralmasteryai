import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, VisualizationHeader, PillSelect, useAutoCycle, FlowDots } from '../primitives';

type PhaseKey = 'before' | 'lag' | 'caught';
const PHASES: PhaseKey[] = ['before', 'lag', 'caught'];

export default function SoftwareReplicationExplorer() {
  const t = useVizTokens();
  const { value: phaseIdx, pick, stop } = useAutoCycle(PHASES.length, 3000, 1);
  const phase = PHASES[phaseIdx];
  const primary = phase === 'before' ? 7 : 8;
  const replica = phase === 'caught' ? 8 : 7;

  return (
    <VisualizationContainer footer="Illustrative record versions: after acknowledging version 8 at the primary, an asynchronous replica can still return version 7. A primary read or a session version barrier is needed for read-your-writes.">
      <VisualizationHeader title="What can the next read observe?" />
      <PillSelect<PhaseKey>
        value={phase}
        onChange={(val) => {
          const next = typeof val === 'function' ? val(phase) : val;
          const idx = PHASES.indexOf(next);
          if (idx >= 0) pick(idx);
          stop();
        }}
        options={[
          { value: 'before', label: 'Before write' },
          { value: 'lag', label: 'Write acknowledged' },
          { value: 'caught', label: 'Replica catches up' },
        ]}
      />
      <svg viewBox="0 0 300 120" width="100%" role="img" aria-label={`Primary version ${primary}, replica version ${replica}`}>
        <defs>
          <marker id="software-replication-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M0 0L10 5L0 10z" fill={t.edge} />
          </marker>
        </defs>
        <rect x="5" y="20" width="110" height="60" rx="6" fill={t.surfaceAlt} stroke={t.border} />
        <rect x="185" y="20" width="110" height="60" rx="6" fill={t.surfaceAlt} stroke={t.border} />
        <path d="M116 50H182" stroke={t.edge} markerEnd="url(#software-replication-arrow)" />
        <FlowDots d="M 116 50 H 182" color={t.accentPrimary} dur={2} />
        <text x="60" y="43" textAnchor="middle" fill={t.textPrimary} fontSize="14">Primary</text>
        <text x="60" y="66" textAnchor="middle" fill={t.textPrimary} fontSize="14">Version {primary}</text>
        <text x="240" y="43" textAnchor="middle" fill={t.textPrimary} fontSize="14">Replica</text>
        <text x="240" y="66" textAnchor="middle" fill={t.textPrimary} fontSize="14">Version {replica}</text>
        <text x="150" y="108" textAnchor="middle" fill={t.textPrimary} fontSize="13">
          {replica < primary ? 'A replica read is stale' : 'Both return the same version'}
        </text>
      </svg>
    </VisualizationContainer>
  );
}
