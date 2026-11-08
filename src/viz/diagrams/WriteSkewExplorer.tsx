import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, VisualizationHeader, PillSelect } from '../primitives';
export default function WriteSkewExplorer() {
  const t=useVizTokens();
  const [schedule,setSchedule]=useState<'snapshot'|'serial'>('snapshot');
  const bobStays=schedule==='serial';
  return <VisualizationContainer footer="The roster starts with Alice and Bob present and requires at least one to remain. Concurrent snapshot decisions can each see the other present and leave zero; a serial decision makes the second clinician observe the first departure and stay.">
    <VisualizationHeader title="Two locally valid decisions, one invalid roster" description="Compare both decisions using the initial snapshot with a serial order that recomputes the second decision."/>
    <PillSelect label="Transaction schedule" value={schedule} onChange={setSchedule} options={[{value:'snapshot',label:'Both read initial snapshot'},{value:'serial',label:'Serial decision order'}]}/>
    <svg viewBox="0 0 300 235" width="100%" role="img" aria-label={bobStays?'Alice leaves; Bob sees Alice absent and stays; one remains':'Both see the other present and leave; zero remain'}>
      <text x={8} y={22} fill={t.textPrimary} fontSize={14}>Initial roster: Alice + Bob on call</text>
      <rect x={8} y={42} width={280} height={60} fill={t.surfaceAlt} stroke={t.border}/>
      <text x={20} y={67} fill={t.textPrimary} fontSize={14}>Alice sees Bob present.</text>
      <text x={20} y={89} fill={t.textSecondary} fontSize={13}>Alice goes off duty.</text>
      <path d="M150 106 V126 M145 119 L150 126 L155 119" fill="none" stroke={t.accentPrimary}/>
      <rect x={8} y={130} width={280} height={60} fill={t.surfaceAlt} stroke={t.border}/>
      <text x={20} y={155} fill={t.textPrimary} fontSize={14}>Bob sees Alice {bobStays?'absent':'present'}.</text>
      <text x={20} y={177} fill={t.textSecondary} fontSize={13}>Bob {bobStays?'stays on call':'goes off duty'}.</text>
      <text x={8} y={220} fill={t.textPrimary} fontSize={14}>Final on-call count: {bobStays?1:0}</text>
    </svg>
    <p role="status">{bobStays?'Invariant preserved: one clinician remains.':'Write skew: both row updates commit, roster invariant fails.'}</p>
  </VisualizationContainer>;
}
