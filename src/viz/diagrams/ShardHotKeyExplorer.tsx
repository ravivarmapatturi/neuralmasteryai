import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, VisualizationHeader, Slider } from '../primitives';
export default function ShardHotKeyExplorer() {
  const t=useVizTokens();
  const [count,setCount]=useState(3);
  const groups=Array.from({length:count},(_,shard)=>Array.from({length:12},(_,key)=>key).filter(key=>key%count===shard));
  const loads=groups.map(keys=>keys.reduce((n,key)=>n+(key===0?6000:100),0));
  return <VisualizationContainer footer="This calculated modulo assignment spreads twelve records over owners. Key 0 alone receives 6,000 operations/s; every other key receives 100. Increasing from three to six shards halves record count per owner but barely reduces the hot owner's work.">
    <VisualizationHeader title="Balanced records can hide an overloaded owner" description="Add shards while keeping the same per-key traffic. The hot key remains indivisible in this model."/>
    <Slider label="Shard owners" value={count} onChange={setCount} min={3} max={6}/>
    <svg viewBox={`0 0 300 ${count*65+25}`} width="100%" role="img" aria-label={`${count} shards; hottest owner ${Math.max(...loads)} operations per second`}>
      {groups.map((keys,i)=><g key={i}>
        <text x={8} y={18+i*65} fill={t.textPrimary} fontSize={13}>Shard {i}: keys {keys.join(', ')}</text>
        <text x={8} y={37+i*65} fill={t.textSecondary} fontSize={13}>{loads[i].toLocaleString()} operations/s</text>
        <rect x={8} y={43+i*65} width={280} height={12} fill={t.surfaceAlt} stroke={t.border}/>
        <rect x={8} y={43+i*65} width={280*loads[i]/7100} height={12} fill={t.accentPrimary}/>
      </g>)}
      <text x={8} y={count*65+18} fill={t.textSecondary} fontSize={12}>Common axis: 0–7,100 operations/s</text>
    </svg>
    <p role="status">Hottest owner: {Math.max(...loads).toLocaleString()} operations/s; total remains 7,100.</p>
  </VisualizationContainer>;
}
