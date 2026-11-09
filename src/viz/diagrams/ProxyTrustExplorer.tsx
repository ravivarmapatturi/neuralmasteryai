import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, VisualizationHeader, PillSelect } from '../primitives';
export default function ProxyTrustExplorer() {
  const t = useVizTokens();
  const [policy,setPolicy] = useState<'pass'|'sanitize'>('pass');
  const interpreted=policy==='sanitize'?'203.0.113.9':'198.51.100.7';
  return <VisualizationContainer footer="The example client at 203.0.113.9 supplies a false forwarding address, 198.51.100.7. A first-ingress proxy must establish its own metadata, and the backend must trust it only over the verified ingress path.">
    <VisualizationHeader title="Who actually supplied the client address?" description="Compare forwarding the client claim with replacing it at a single public ingress."/>
    <PillSelect label="Ingress policy" value={policy} onChange={setPolicy} options={[{value:'pass',label:'Pass client header'},{value:'sanitize',label:'Replace untrusted header'}]}/>
    <svg viewBox="0 0 300 245" width="100%" role="img" aria-label={`Backend interprets client as ${interpreted}; ${policy==='sanitize'?'observed peer':'forged claim'}`}>
      {[['Client: 203.0.113.9','Claims: 198.51.100.7'],['Ingress: 10.0.0.5',policy==='sanitize'?'Writes observed peer':'Passes unverified claim'],['Backend interprets',interpreted]].map(([a,b],i)=><g key={a}>
        <rect x={8} y={5+i*85} width={280} height={60} fill={t.surfaceAlt} stroke={t.border}/>
        <text x={148} y={28+i*85} textAnchor="middle" fill={t.textPrimary} fontSize={14}>{a}</text>
        <text x={148} y={49+i*85} textAnchor="middle" fill={t.textSecondary} fontSize={13}>{b}</text>
        {i<2 && <path d={`M148 ${68+i*85} V${86+i*85} M143 ${79+i*85} L148 ${86+i*85} L153 ${79+i*85}`} fill="none" stroke={t.accentPrimary}/>}
      </g>)}
    </svg>
    <p role="status">{policy==='sanitize'?'Verified path conveys the observed peer.':'Backend trusts a value chosen by the client.'}</p>
  </VisualizationContainer>;
}
