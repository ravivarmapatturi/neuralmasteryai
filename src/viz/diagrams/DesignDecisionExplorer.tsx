import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, VisualizationHeader, PillSelect } from '../primitives';

/** Illustrative design review: a 60-second revocation promise and a 300-second cache. */
export default function DesignDecisionExplorer() {
  const t = useVizTokens();
  const [mode, setMode] = useState<'fresh' | 'cached' | 'expired'>('cached');
  const age = mode === 'fresh' ? 0 : mode === 'cached' ? 61 : 300;
  return <VisualizationContainer footer="The illustrative cache retains a redirect for 300 seconds. At second 61 it still serves the old destination, violating a 60-second revocation promise even though the origin has already removed the link.">
    <VisualizationHeader title="Does a successful response keep the promise?" description="Step from revocation to the first forbidden response, then to cache expiry." />
    <PillSelect label="Time after revocation" value={mode} onChange={setMode} options={[{value:'fresh',label:'0 seconds'},{value:'cached',label:'61 seconds'},{value:'expired',label:'300 seconds'}]} />
    <svg viewBox="0 0 300 230" width="100%" role="img" aria-label={`At ${age} seconds, origin says revoked; cache ${mode === 'expired' ? 'expires' : 'still redirects'}.`}>
      <text x={10} y={20} fill={t.textPrimary} fontSize={14}>Origin: revoked at second 0</text>
      <rect x={10} y={35} width={280} height={35} fill={t.surfaceAlt} stroke={t.border} />
      <text x={150} y={58} textAnchor="middle" fill={t.textPrimary} fontSize={14}>Durable record: revoked</text>
      <path d="M150 73 V100 M145 93 L150 100 L155 93" fill="none" stroke={t.accentPrimary} />
      <text x={160} y={91} fill={t.textSecondary} fontSize={12}>No purge</text>
      <rect x={10} y={105} width={280} height={40} fill={t.surfaceAlt} stroke={t.border} />
      <text x={150} y={130} textAnchor="middle" fill={t.textPrimary} fontSize={14}>Edge: {mode === 'expired' ? 'refreshes → rejects' : 'cached → redirects'}</text>
      <text x={10} y={173} fill={t.textSecondary} fontSize={13}>Promise: stop by second 60</text>
      <text x={10} y={198} fill={t.textPrimary} fontSize={14}>{mode === 'cached' ? 'Violation: response is too stale' : mode === 'expired' ? 'Correct now; earlier breach remains' : 'Propagation window begins'}</text>
      <text x={10} y={222} fill={t.textSecondary} fontSize={12}>Cache lifetime: 300 seconds</text>
    </svg>
    <p role="status">{mode === 'cached' ? 'A fast HTTP response can still be incorrect.' : mode === 'expired' ? 'Eventual expiry does not satisfy a shorter deadline.' : 'The write alone does not clear remote caches.'}</p>
  </VisualizationContainer>;
}
