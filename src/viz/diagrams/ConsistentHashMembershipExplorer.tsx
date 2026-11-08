import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, VisualizationHeader, PillSelect } from '../primitives';
export default function ConsistentHashMembershipExplorer() {
  const t=useVizTokens();
  const [membership,setMembership]=useState<'before'|'after'>('after');
  const nodes=membership==='after'?[[20,'A'],[35,'D'],[50,'B'],[80,'C']]:[[20,'A'],[50,'B'],[80,'C']];
  const x=(position:number)=>20+position*2.6;
  return <VisualizationContainer footer="This calculated ring uses chosen positions, not measured hash outputs. Adding D at 35 transfers the interval (20,35] from B to D, moving key 30 while keys 10,45,60,90 keep their original owners.">
    <VisualizationHeader title="One joining token changes one interval" description="The ring is cut at zero and drawn left to right; the lower arrow wraps its end back to the beginning."/>
    <PillSelect label="Ring membership" value={membership} onChange={setMembership} options={[{value:'before',label:'A, B, C'},{value:'after',label:'Add D at 35'}]}/>
    <svg viewBox="0 0 300 235" width="100%" role="img" aria-label={membership==='after'?'Key 30 moves from B to D; four keys retain owners':'Key 10 and 90 to A; 30 and 45 to B; 60 to C'}>
      <text x={8} y={20} fill={t.textPrimary} fontSize={13}>Clockwise positions: 0 → 100</text>
      {membership==='after'&&<rect x={x(20)} y={94} width={x(35)-x(20)} height={12} fill={t.accentPrimary}/>}
      <path d="M20 100 H280 V200 H20 V100 M15 107 L20 100 L25 107" fill="none" stroke={t.border}/>
      {nodes.map(([position,name])=><g key={name}>
        <circle cx={x(Number(position))} cy={100} r={5} fill={t.accentPrimary}/>
        <text x={x(Number(position))} y={name==='D'?55:78} textAnchor="middle" fill={t.textPrimary} fontSize={13}>{name}: {position}</text>
      </g>)}
      {[10,30,45,60,90].map((position,i)=><g key={position}>
        <path d={`M${x(position)} 113 V${i%2?155:135}`} stroke={t.edge}/>
        <text x={x(position)} y={i%2?174:154} textAnchor="middle" fill={t.textPrimary} fontSize={13}>{position}</text>
      </g>)}
      <text x={150} y={224} textAnchor="middle" fill={t.textSecondary} fontSize={12}>Keys are labelled below the ring.</text>
    </svg>
    <p role="status">{membership==='after'?'Moved: key 30, B → D. One of five example keys moves.':'A: 10,90 · B: 30,45 · C: 60'}</p>
  </VisualizationContainer>;
}
