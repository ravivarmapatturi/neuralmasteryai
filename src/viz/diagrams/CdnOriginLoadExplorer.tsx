import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, VisualizationHeader, Slider } from '../primitives';
export default function CdnOriginLoadExplorer() {
  const t = useVizTokens();
  const [hit,setHit]=useState(95);
  const misses=Math.round(6000*(1-hit/100));
  return <VisualizationContainer footer="The calculated model sends 6,000 requests/s to the edge and one origin request per miss. At 95% hits the origin receives 300 requests/s; at 50% it receives 3,000, ten times as much despite unchanged client traffic.">
    <VisualizationHeader title="What load does the origin actually see?" description="Lower the cache hit percentage to model expiry, a new version, or a less reusable cache key."/>
    <Slider label="Edge cache hits (%)" value={hit} onChange={setHit} min={0} max={100}/>
    <svg viewBox="0 0 300 170" width="100%" role="img" aria-label={`${hit}% hits; ${misses} origin requests per second`}>
      <text x={8} y={22} fill={t.textPrimary} fontSize={14}>Edge arrivals: 6,000 requests/s</text>
      <text x={8} y={60} fill={t.textPrimary} fontSize={14}>Edge hits: {6000-misses} requests/s</text>
      <rect x={8} y={70} width={280*(hit/100)} height={18} fill={t.accentPrimary}/>
      <text x={8} y={119} fill={t.textPrimary} fontSize={14}>Origin misses: {misses} requests/s</text>
      <rect x={8} y={129} width={280*(1-hit/100)} height={18} fill={t.accentPrimary}/>
      <text x={8} y={168} fill={t.textSecondary} fontSize={12}>Common axis: 0–6,000 requests/s</text>
    </svg>
    <p role="status">{misses.toLocaleString()} requests/s reach the origin in this one-miss/one-fetch model.</p>
  </VisualizationContainer>;
}
