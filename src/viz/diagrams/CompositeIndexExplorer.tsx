import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, VisualizationHeader, PillSelect } from '../primitives';
export default function CompositeIndexExplorer() {
  const t=useVizTokens();
  const [order,setOrder]=useState<'customer'|'time'>('time');
  const rows=Array.from({length:12},(_,i)=>({customer:Math.floor(i/3)+1,time:i%3+1}));
  rows.sort((a,b)=>order==='customer'?a.customer-b.customer||b.time-a.time:b.time-a.time||a.customer-b.customer);
  return <VisualizationContainer footer="The calculated dataset has four customers with three orders each. For customer 2's latest two, customer-first ordering reads two adjacent entries after seeking; the illustrated time-first scan inspects six entries before finding both.">
    <VisualizationHeader title="The same columns, a different scan" description="Read cells left to right, then down. Highlighted matches are customer 2 at times 3 and 2; shaded cells are inspected by the modeled scan."/>
    <PillSelect label="Composite key order" value={order} onChange={setOrder} options={[{value:'customer',label:'Customer, newest time'},{value:'time',label:'Newest time, customer'}]}/>
    <svg viewBox="0 0 300 205" width="100%" role="img" aria-label={`${order==='customer'?'Two':'Six'} entries inspected after the modeled starting point; result customer 2 times 3 and 2`}>
      {rows.map((r,i)=>{
        const inspected=order==='time'?i<6:i>=3&&i<5;
        const match=inspected&&r.customer===2&&r.time>=2;
        return <g key={`${r.customer}-${r.time}`}>
          <rect x={8+i%3*95} y={8+Math.floor(i/3)*42} width={88} height={32} fill={match?t.accentPrimary:inspected?t.surfaceAlt:t.surface} stroke={t.border}/>
          <text x={52+i%3*95} y={29+Math.floor(i/3)*42} textAnchor="middle" fill={match?t.background:t.textPrimary} fontSize={14}>c{r.customer}, t{r.time}</text>
        </g>;
      })}
      <text x={8} y={194} fill={t.textSecondary} fontSize={12}>c = customer; t = creation time</text>
    </svg>
    <p role="status">{order==='customer'?'Seek to customer 2, then read 2 entries.':'Scan 6 entries in time order to find 2 matches.'}</p>
  </VisualizationContainer>;
}
