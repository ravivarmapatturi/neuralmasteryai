import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, VisualizationHeader, PillSelect } from '../primitives';
export default function StorageOwnershipExplorer() {
  const t = useVizTokens();
  const [model,setModel]=useState<'reference'|'embedded'>('embedded');
  const [step,setStep]=useState<'before'|'one'|'all'>('one');
  const names=step==='before'?['Alice','Alice']:model==='reference'||step==='all'?['Alicia','Alicia']:['Alicia','Alice'];
  const updates=step==='before'?0:model==='reference'?1:step==='all'?2:1;
  return <VisualizationContainer footer="The example requires orders to display the current customer name, not an immutable billing snapshot. One authoritative profile update changes referenced reads; duplicated current names require both order copies to be updated or an explicit staleness policy.">
    <VisualizationHeader title="How many copies must a rename change?" description="Compare a referenced customer profile with duplicated current names across two orders."/>
    <PillSelect label="Ownership model" value={model} onChange={setModel} options={[{value:'reference',label:'Referenced profile'},{value:'embedded',label:'Duplicated name'}]}/>
    <PillSelect label="Rename progress" value={step} onChange={setStep} options={[{value:'before',label:'Before rename'},{value:'one',label:'One update'},{value:'all',label:'All copies updated'}]}/>
    <svg viewBox="0 0 300 180" width="100%" role="img" aria-label={`Order 1 shows ${names[0]}, order 2 shows ${names[1]}; ${updates} updates`}>
      <text x={8} y={22} fill={t.textPrimary} fontSize={14}>Current profile: {step==='before'?'Alice':'Alicia'}</text>
      {names.map((name,i)=><g key={i}>
        <rect x={8} y={42+i*56} width={280} height={40} fill={t.surfaceAlt} stroke={t.border}/>
        <text x={148} y={67+i*56} textAnchor="middle" fill={t.textPrimary} fontSize={14}>Order {i+1} displays: {name}</text>
      </g>)}
      <text x={8} y={168} fill={t.textSecondary} fontSize={13}>Writes to update the modeled names: {updates}</text>
    </svg>
    <p role="status">{names[0]===names[1]?'Both reads agree.':'A partial multi-copy update exposes mixed current names.'}</p>
  </VisualizationContainer>;
}
