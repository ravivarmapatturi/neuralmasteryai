import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, VizButton } from '../primitives';
import { getConceptColor } from './diagramSystem';

const COLD_MS = 200;
const CACHED_MS = 2;
const CONNECT_MS = 30;

export default function DnsResolutionDiagram() {
  const t = useVizTokens();
  const [cached, setCached] = useState(false);
  const color = getConceptColor(t, 'attention');
  const dnsMs = cached ? CACHED_MS : COLD_MS;
  const total = dnsMs + CONNECT_MS;

  return (
    <VisualizationContainer
      footer={
        cached
          ? `Cached: the OS or resolver already has "api.example.com" -> IP mapped, so lookup is ~${CACHED_MS}ms -- total request setup ~${total}ms.`
          : `Cold: resolving "api.example.com" to an IP address takes ~${COLD_MS}ms before the connection can even be attempted -- total request setup ~${total}ms, and that ${COLD_MS}ms is pure overhead on top of the actual request.`
      }
    >
      <div style={{ marginBottom: 12 }}>
        <VizButton variant={!cached ? 'primary' : 'secondary'} onClick={() => setCached(false)}>
          Cold lookup
        </VizButton>{' '}
        <VizButton variant={cached ? 'primary' : 'secondary'} onClick={() => setCached(true)}>
          Cached lookup
        </VizButton>
      </div>
      <svg width={420} height={70} viewBox={`0 0 ${420} ${70}`} className="nm-fit-svg">
        <rect x={0} y={20} width={(dnsMs / total) * 400} height={24} fill={cached ? `${color}55` : color} rx={4} />
        <rect x={(dnsMs / total) * 400} y={20} width={(CONNECT_MS / total) * 400} height={24} fill={t.textMuted} rx={4} />
        <text x={4} y={16} fontSize={10} fill={color}>DNS lookup: {dnsMs}ms</text>
        <text x={(dnsMs / total) * 400 + 4} y={60} fontSize={10} fill={t.textMuted}>connect: {CONNECT_MS}ms</text>
      </svg>
    </VisualizationContainer>
  );
}
