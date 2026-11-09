import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, VisualizationHeader, PillSelect } from '../primitives';

type Row = { label: string; value: number };
/** Common axis and accessible numeric bars; each exported experiment owns its calculation. */
function Bars({title,description,footer,rows,max,unit,status,control}:{title:string;description:string;footer:string;rows:Row[];max:number;unit:string;status:string;control:React.ReactNode}) {
  const t=useVizTokens();
  return <VisualizationContainer footer={footer}><VisualizationHeader title={title} description={description}/>{control}
    <svg viewBox={`0 0 300 ${rows.length*62+35}`} width="100%" role="img" aria-label={rows.map(r=>`${r.label}: ${r.value} ${unit}`).join('; ')}>
      {rows.map((r,i)=><g key={r.label}><text x={8} y={20+i*62} fill={t.textPrimary} fontSize={13}>{r.label}: {r.value} {unit}</text><rect x={8} y={30+i*62} width={280} height={16} fill={t.surfaceAlt} stroke={t.border}/><rect x={8} y={30+i*62} width={280*Math.min(1,r.value/max)} height={16} fill={t.accentPrimary}/></g>)}
      <text x={8} y={rows.length*62+20} fill={t.textSecondary} fontSize={12}>Common axis: 0–{max} {unit}</text>
    </svg><p role="status">{status}</p></VisualizationContainer>;
}
export function RestConditionalWrite() {
  const [mode,setMode]=useState<'blind'|'guarded'>('blind');
  const guarded=mode==='guarded';
  return <Bars title="Which stale edit may replace version 8?" description="Both editors start at version 7. A commits price 12; B later submits its old full representation with price 10." footer="The calculated example compares blind replacement with an atomic If-Match check. A rejected second replacement preserves price 12; HTTP idempotence alone does not prevent a stale client overwriting another edit." rows={[{label:'Initial price',value:10},{label:'After A',value:12},{label:'After B attempt',value:guarded?12:10}]} max={14} unit="price units" status={guarded?'B receives 412; version 8 and price 12 survive.':'B overwrites price 12 with its stale price 10.'} control={<PillSelect label="Write policy" value={mode} onChange={setMode} options={[{value:'blind',label:'Blind replacement'},{value:'guarded',label:'If-Match version 7'}]}/>}/>;
}
export function GrpcDeadlineBudget() {
  const [mode,setMode]=useState<'fresh'|'remaining'>('fresh');
  const remaining=mode==='remaining';
  return <Bars title="A timeout does not restart the user's clock" description="A 200 ms request spends 30 ms at the gateway and 50 ms before the downstream call." footer="These illustrative allocations leave 120 ms for downstream work and return. A fresh 200 ms downstream timeout can extend the total path to 280 ms; propagating remaining time preserves the original 200 ms boundary." rows={[{label:'Already spent',value:80},{label:'Downstream allowance',value:remaining?120:200},{label:'Possible total',value:remaining?200:280}]} max={280} unit="ms" status={remaining?'120 ms remains; all work shares one deadline.':'Fresh timeout permits 80 ms beyond the original deadline.'} control={<PillSelect label="Propagation" value={mode} onChange={setMode} options={[{value:'fresh',label:'Fresh timeout'},{value:'remaining',label:'Remaining deadline'}]}/>}/>;
}
