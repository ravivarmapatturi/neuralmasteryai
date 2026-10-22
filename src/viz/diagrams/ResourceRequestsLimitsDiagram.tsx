import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, Slider } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

/** Drag actual memory usage against fixed request/limit lines -- see
 * exactly when a Pod is fine, when it's fine but wasting scheduled
 * capacity, and when it crosses into OOM-kill territory. */
export default function ResourceRequestsLimitsDiagram() {
  const t = useVizTokens();
  const [usageMB, setUsageMB] = useState(700);
  const requestMB = 512;
  const limitMB = 1024;
  const color = getConceptColor(t, 'attention');
  const dangerColor = t.accentDanger;
  const oomKilled = usageMB > limitMB;

  const width = 560;
  const maxMB = 1300;
  const xFor = (mb: number) => 20 + (mb / maxMB) * (width - 40);

  return (
    <VisualizationContainer footer={oomKilled ? `Usage (${usageMB}MB) exceeds the limit (${limitMB}MB) -- the Pod gets OOM-killed, a hard ceiling it cannot exceed.` : usageMB < requestMB ? `Usage (${usageMB}MB) is under the request (${requestMB}MB) -- the scheduler reserved ${requestMB}MB for this Pod based on the request, so some of that reservation sits unused.` : `Usage (${usageMB}MB) is between the request and limit -- normal operation, using more than initially requested but under the hard ceiling.`}>
      <Slider label={`Actual memory usage: ${usageMB} MB`} min={100} max={maxMB} step={20} value={usageMB} onChange={setUsageMB} />
      <svg width="100%" viewBox={`0 0 ${width} 90`} style={{ display: 'block', marginTop: 8 }}>
        <line x1={20} y1={50} x2={width - 20} y2={50} stroke={t.border} strokeWidth={2} />
        <rect x={20} y={40} width={xFor(Math.min(usageMB, limitMB)) - 20} height={20} fill={oomKilled ? dangerColor : color} opacity={0.7} rx={3} />
        <line x1={xFor(requestMB)} y1={30} x2={xFor(requestMB)} y2={70} stroke={t.textPrimary} strokeWidth={2} strokeDasharray="3 2" />
        <text x={xFor(requestMB)} y={24} textAnchor="middle" fontSize={9} fill={t.textPrimary}>request ({requestMB}MB)</text>
        <line x1={xFor(limitMB)} y1={30} x2={xFor(limitMB)} y2={70} stroke={dangerColor} strokeWidth={2} />
        <text x={xFor(limitMB)} y={84} textAnchor="middle" fontSize={9} fill={dangerColor}>limit ({limitMB}MB)</text>
      </svg>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: oomKilled ? dangerColor : t.textMuted, fontWeight: oomKilled ? 700 : 400, marginTop: 4 }}>
        {oomKilled ? 'OOM-killed' : 'Running normally'}
      </div>
    </VisualizationContainer>
  );
}
