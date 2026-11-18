import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, Slider, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

const N_PACKETS = 10;
const LOSS_PRESETS = [0.2, 0.05, 0.4, 0.1];

// Deterministic "lost" pattern driven by loss rate -- packet i is lost if
// its position falls within the fraction determined by lossRate, not
// actual randomness (reproducible on every render).
function isLost(i: number, lossRate: number): boolean {
  return (i * 37) % 100 < lossRate * 100;
}

export default function TcpVsUdpDiagram() {
  const t = useVizTokens();
  const { value: autoIdx, stop } = useAutoCycle(LOSS_PRESETS.length, 3000, 0);
  const [userLoss, setUserLoss] = useState<number | null>(null);
  const lossRate = userLoss ?? LOSS_PRESETS[autoIdx];
  const tcpColor = getConceptColor(t, 'attention');
  const udpColor = t.accentWarn;
  const lostColor = t.accentDanger;

  const lost = Array.from({ length: N_PACKETS }, (_, i) => isLost(i, lossRate));
  const nLost = lost.filter(Boolean).length;

  return (
    <VisualizationContainer footer={`At ${(lossRate * 100).toFixed(0)}% loss: UDP delivers ${N_PACKETS - nLost} of ${N_PACKETS} packets and moves on -- the missing ${nLost} are just gone, with lower overhead and no retransmission delay. TCP detects every gap and retransmits until all ${N_PACKETS} arrive, in order -- guaranteed complete and correctly ordered, at the cost of retransmission latency. This is exactly why real-time audio/video (where a stale retransmitted packet is worse than a dropped one) reaches for UDP, and virtually every API call reaches for TCP.`}>
      <Slider label="Simulated packet loss" value={lossRate} onChange={(v) => { stop(); setUserLoss(v); }} min={0} max={0.6} step={0.05} format={(v) => `${(v * 100).toFixed(0)}%`} />

      <div style={{ fontSize: DIAGRAM_TYPE.secondaryLabel.size, color: t.textMuted, margin: '10px 0 2px' }}>UDP: sent once, no retransmission</div>
      <div style={{ display: 'flex', gap: 4 }}>
        {lost.map((l, i) => (
          <div key={i} style={{ width: 28, height: 24, borderRadius: 4, background: l ? `${lostColor}22` : `${udpColor}33`, border: `1.5px solid ${l ? lostColor : udpColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: l ? lostColor : udpColor }}>
            {l ? '✗' : i}
          </div>
        ))}
      </div>

      <div style={{ fontSize: DIAGRAM_TYPE.secondaryLabel.size, color: t.textMuted, margin: '10px 0 2px' }}>TCP: lost packets retransmitted until all arrive, in order</div>
      <div style={{ display: 'flex', gap: 4 }}>
        {Array.from({ length: N_PACKETS }, (_, i) => (
          <div key={i} style={{ width: 28, height: 24, borderRadius: 4, background: `${tcpColor}33`, border: `1.5px solid ${tcpColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: tcpColor }}>
            {i}
          </div>
        ))}
      </div>
    </VisualizationContainer>
  );
}
