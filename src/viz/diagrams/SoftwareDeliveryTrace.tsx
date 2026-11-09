import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, VisualizationHeader, PillSelect } from '../primitives';

export default function SoftwareDeliveryTrace() {
  const t = useVizTokens();
  const [dedupe, setDedupe] = useState<'yes'|'no'>('yes');
  const rows = [ ['Broker', 'Worker', 'Deliver event e17'], ['Worker', 'Database', 'Commit effect + e17'], ['Worker', 'Broker', 'ACK lost; worker stops'], ['Broker', 'Worker', 'Redeliver event e17'], ['Worker', 'Database', dedupe === 'yes' ? 'e17 exists: skip effect' : 'Apply effect again'] ];
  return <VisualizationContainer footer="The acknowledgment is lost after the business effect commits. A durable event ID in the same transaction as that effect prevents the redelivery from changing state again.">
    <VisualizationHeader title="A committed effect can still be redelivered" />
    <PillSelect label="Consumer behavior" value={dedupe} onChange={setDedupe} options={[{value:'yes',label:'Atomic deduplication'},{value:'no',label:'No deduplication'}]} />
    <div role="img" aria-label={dedupe === 'yes' ? 'Five-step delivery trace; one business effect' : 'Five-step delivery trace; duplicate business effect'} style={{fontSize:14,color:t.textPrimary}}>
      {rows.map(([from,to,event],i)=><div key={event} style={{padding:'10px 0',borderBottom:`1px solid ${t.border}`}}><strong>{i+1}. {from} → {to}</strong><div>{event}</div></div>)}
    </div><p role="status">Business effects: {dedupe === 'yes' ? 1 : 2}</p>
  </VisualizationContainer>;
}
