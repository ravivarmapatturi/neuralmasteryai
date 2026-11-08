import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, VisualizationHeader, PillSelect } from '../primitives';

export default function StatelessSessionExplorer() {
  const t = useVizTokens();
  const [storage, setStorage] = useState<'local'|'shared'>('local');
  const [route, setRoute] = useState<'A'|'B'|'restart'>('B');
  const found = storage==='shared' || route==='A';
  return <VisualizationContainer footer="Session s7 initially exists only in replica A's memory. Routing to B or restarting A loses access to it; an external authoritative session record lets either replacement resolve it, while introducing an explicit storage dependency.">
    <VisualizationHeader title="Does Alice's session survive rerouting?" description="Change state ownership, then route the same session to another instance or replace its original owner."/>
    <PillSelect label="Authoritative session location" value={storage} onChange={setStorage} options={[{value:'local',label:'Local to A'},{value:'shared',label:'Shared store'}]}/>
    <PillSelect label="Destination" value={route} onChange={setRoute} options={[{value:'A',label:'Replica A'},{value:'B',label:'Replica B'},{value:'restart',label:'Restart A'}]}/>
    <svg viewBox="0 0 300 185" width="100%" role="img" aria-label={`Session s7 on ${route}: ${found?'Alice found':'session missing'}`}>
      <text x={8} y={22} fill={t.textPrimary} fontSize={14}>Request: session s7</text>
      <path d="M40 30 V57 M35 50 L40 57 L45 50" fill="none" stroke={t.accentPrimary}/>
      <rect x={8} y={62} width={280} height={40} fill={t.surfaceAlt} stroke={t.border}/>
      <text x={148} y={87} textAnchor="middle" fill={t.textPrimary} fontSize={14}>{route==='restart'?'Replacement A':`Replica ${route}`}</text>
      <text x={8} y={132} fill={t.textSecondary} fontSize={13}>{storage==='shared'?'Lookup shared record: s7 → alice':route==='A'?'Local record: s7 → alice':'Local record: absent'}</text>
      <text x={8} y={165} fill={t.textPrimary} fontSize={14}>{found?'Resolve user: Alice':'Cannot resolve session'}</text>
    </svg>
    <p role="status">{found?'Session survives this destination.':'Routing succeeded; application state is missing.'}</p>
  </VisualizationContainer>;
}
