import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, VisualizationHeader, PillSelect } from '../primitives';
const states = {initial:{tokens:5,accepted:0,rejected:0,label:'Full bucket at second 0'},burst:{tokens:0,accepted:5,rejected:2,label:'Seven arrivals at second 0'},wait:{tokens:1,accepted:5,rejected:2,label:'Half a second of refill'},next:{tokens:0,accepted:6,rejected:2,label:'One arrival at second 0.5'}};
export default function TokenBucketAdmissionExplorer() {
  const t = useVizTokens();
  const [step,setStep]=useState<keyof typeof states>('burst');
  const s=states[step];
  return <VisualizationContainer footer="The calculated bucket holds five tokens and refills two tokens/s. Seven simultaneous arrivals spend five and reject two; half a second restores one permission, which one later request can spend.">
    <VisualizationHeader title="Burst allowance is stored permission" description="Step through the initial bucket, seven simultaneous requests, refill, and the next accepted request."/>
    <PillSelect label="Admission step" value={step} onChange={setStep} options={[{value:'initial',label:'Full bucket'},{value:'burst',label:'Seven arrivals'},{value:'wait',label:'Wait 0.5 seconds'},{value:'next',label:'Next request'}]}/>
    <svg viewBox="0 0 300 155" width="100%" role="img" aria-label={`${s.label}; ${s.tokens} tokens; ${s.accepted} accepted and ${s.rejected} rejected`}>
      <text x={8} y={22} fill={t.textPrimary} fontSize={14}>{s.label}</text>
      {Array.from({length:5},(_,i)=><rect key={i} x={8+i*57} y={40} width={45} height={38} fill={i<s.tokens?t.accentPrimary:t.surfaceAlt} stroke={t.border}/>)}
      <text x={8} y={107} fill={t.textPrimary} fontSize={14}>Available tokens: {s.tokens} / 5</text>
      <text x={8} y={140} fill={t.textSecondary} fontSize={13}>Refill rate: 2 tokens per second</text>
    </svg>
    <p role="status">Accepted {s.accepted} · rejected {s.rejected} · tokens {s.tokens}</p>
  </VisualizationContainer>;
}
