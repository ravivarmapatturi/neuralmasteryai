import { useId, useMemo, useState } from 'react';
import { FONT_FAMILY, useVizTokens } from '../../theme/vizTokens';
import { PillSelect, StickyNote, StickyRow, VisualizationContainer, VisualizationHeader, VizButton, useVizVisible } from '../primitives';
import { explainTransportStep, simulateTransports } from '../lib/tcpVsUdp';
import { NumericField, PredictChallenge } from './playgroundPrimitives';
import { useStepPlayback } from './useStepPlayback';

type Protocol = 'udp' | 'tcp';

const PREDICT_OPTIONS = [
  'TCP delivers all packets, but later',
  'UDP retransmits the missing packet',
  'Both stop after the first loss',
] as const;

function TcpVsUdpPlayground({ compact, outerVisible }: { compact: boolean; outerVisible: boolean }) {
  const t = useVizTokens();
  const udpClip = useId();
  const tcpClip = useId();
  const [protocol, setProtocol] = useState<Protocol>('tcp');
  const [packetCount, setPacketCount] = useState(6);
  const [lossPercent, setLossPercent] = useState(30);
  const [oneWayMs, setOneWayMs] = useState(45);
  const [jitterMs, setJitterMs] = useState(35);
  const [timeoutMs, setTimeoutMs] = useState(100);
  const [seed, setSeed] = useState(7);
  const [prediction, setPrediction] = useState<number | null>(null);
  const result = useMemo(() => simulateTransports({
    packetCount,
    lossRate: lossPercent / 100,
    sendGapMs: 10,
    oneWayMs,
    jitterMs,
    retransmitTimeoutMs: timeoutMs,
    seed,
  }), [jitterMs, lossPercent, oneWayMs, packetCount, seed, timeoutMs]);
  const playback = useStepPlayback(packetCount, 1150, 1, outerVisible);
  const currentPacket = result.packets[playback.step] ?? result.packets[0];
  const caption = explainTransportStep(currentPacket, packetCount);

  const udpColor = t.accentSecondary;
  const tcpColor = t.accentPrimary;
  const lossColor = t.accentDanger;
  const waitColor = t.accentPurple;
  const senderX = 66;
  const receiverX = 326;
  const rowGap = 36;

  const update = (setter: (value: number) => void, value: number) => {
    playback.stop();
    setter(value);
    setPrediction(null);
  };

  const renderPanel = (offsetX: number, kind: Protocol) => (
    <g transform={`translate(${offsetX} 0)`} opacity={protocol === kind ? 1 : 0.72}>
      <text x={14} y={22} fontSize={16} fontWeight={700} fill={kind === 'tcp' ? tcpColor : udpColor}>
        {kind === 'tcp' ? 'TCP: sequence + retry + ordered app delivery' : 'UDP: one datagram send, then move on'}
      </text>
      <text x={senderX} y={48} textAnchor="middle" fontSize={14} fontWeight={700} fill={t.textPrimary}>Sender</text>
      <text x={receiverX} y={48} textAnchor="middle" fontSize={14} fontWeight={700} fill={t.textPrimary}>Receiver</text>
      <line x1={senderX} y1={55} x2={senderX} y2={280} stroke={t.border} strokeDasharray="4 4" />
      <line x1={receiverX} y1={55} x2={receiverX} y2={280} stroke={t.border} strokeDasharray="4 4" />
      <g clipPath={`url(#${kind === 'tcp' ? tcpClip : udpClip})`}>
        {result.packets.map((packet, index) => {
          const y = 69 + index * rowGap;
          const shown = index <= playback.step;
          const current = index === playback.step;
          const color = kind === 'tcp' ? tcpColor : udpColor;
          const endpoint = packet.firstLost ? 215 : receiverX;
          return (
            <g key={packet.sequence} opacity={shown ? 1 : 0.2}>
              {current && <rect x={8} y={y - 16} width={338} height={31} rx={5} fill={waitColor} fillOpacity={0.1} />}
              <text x={14} y={y + 5} fontSize={14} fontWeight={current ? 700 : 400} fill={current ? waitColor : t.textSecondary}>#{packet.sequence}</text>
              <line x1={senderX} y1={y} x2={endpoint} y2={y} stroke={packet.firstLost ? lossColor : color} strokeWidth={2} />
              <path d={`M${endpoint - 7} ${y - 4} L${endpoint} ${y} L${endpoint - 7} ${y + 4}`} fill="none" stroke={packet.firstLost && kind === 'udp' ? lossColor : color} strokeWidth={2} />
              {packet.firstLost && (
                <>
                  <line x1={207} y1={y - 6} x2={219} y2={y + 6} stroke={lossColor} strokeWidth={2} />
                  <line x1={219} y1={y - 6} x2={207} y2={y + 6} stroke={lossColor} strokeWidth={2} />
                </>
              )}
              {packet.firstLost && kind === 'tcp' && (
                <>
                  <line x1={senderX} y1={y + 11} x2={receiverX} y2={y + 11} stroke={tcpColor} strokeWidth={2} strokeDasharray="5 3" />
                  <path d={`M${receiverX - 7} ${y + 7} L${receiverX} ${y + 11} L${receiverX - 7} ${y + 15}`} fill="none" stroke={tcpColor} strokeWidth={2} />
                </>
              )}
              <text x={receiverX - 5} y={y - 7} textAnchor="end" fontSize={14} fill={packet.firstLost && kind === 'udp' ? lossColor : color}>
                {kind === 'udp'
                  ? packet.firstArrivalMs === null ? 'lost' : `${packet.firstArrivalMs} ms`
                  : `${packet.tcpDeliveryMs} ms${packet.firstLost ? ' after retry' : ''}`}
              </text>
            </g>
          );
        })}
      </g>
      <text x={14} y={306} fontSize={14} fontWeight={700} fill={kind === 'tcp' ? tcpColor : udpColor}>
        {kind === 'tcp'
          ? `${packetCount}/${packetCount} delivered · ${result.tcpRetransmissions} retries · complete at ${result.tcpCompleteMs} ms`
          : `${result.udpDelivered}/${packetCount} delivered · order ${result.udpArrivalOrder.join(', ') || 'none'} · last at ${result.udpLastArrivalMs} ms`}
      </text>
    </g>
  );

  return (
    <>
      {!compact && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 360px', minWidth: 0 }}>
              <VisualizationHeader
                eyebrow="Live playground"
                title="Choose completeness or the freshest packet"
                description="TCP solves missing and out-of-order data for the application, while UDP avoids waiting when a late packet would no longer help."
              />
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', paddingTop: 2 }}>
              <VizButton onClick={playback.toggle}>{playback.playing ? 'Pause' : 'Play'}</VizButton>
              <VizButton variant="secondary" onClick={playback.next}>Step</VizButton>
              <VizButton variant="secondary" onClick={playback.reset}>Reset</VizButton>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(135px, 1fr))', gap: 10, alignItems: 'end' }}>
            <div style={{ alignSelf: 'end' }}>
              <PillSelect<Protocol> label="Protocol to inspect" value={protocol} onChange={(value) => setProtocol(typeof value === 'function' ? value(protocol) : value)} options={[{ value: 'tcp', label: 'TCP' }, { value: 'udp', label: 'UDP' }]} />
            </div>
            <NumericField label="Packets N" hint="numbered messages" value={packetCount} min={3} max={6} onChange={(value) => update(setPacketCount, value)} />
            <NumericField label="First-send loss (%)" hint="seeded, repeatable pattern" value={lossPercent} min={0} max={100} onChange={(value) => update(setLossPercent, value)} />
            <NumericField label="One-way delay (ms)" hint="base network time" value={oneWayMs} min={1} max={300} onChange={(value) => update(setOneWayMs, value)} />
            <NumericField label="Delay spread (ms)" hint="can reorder arrivals" value={jitterMs} min={0} max={200} onChange={(value) => update(setJitterMs, value)} />
            <NumericField label="Retry timeout (ms)" hint="TCP waits before retry" value={timeoutMs} min={10} max={500} onChange={(value) => update(setTimeoutMs, value)} />
            <NumericField label="Network pattern seed" hint="same seed, same losses" value={seed} min={0} max={999} onChange={(value) => update(setSeed, value)} />
          </div>
        </>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px 18px', fontSize: 15, margin: '6px 0 2px' }} aria-label="Transport legend">
        {[
          ['UDP first send', udpColor],
          ['TCP delivered stream', tcpColor],
          ['Lost first send', lossColor],
          ['Current packet', waitColor],
        ].map(([label, color]) => <span key={label} style={{ color }}><span style={{ display: 'inline-block', width: 18, height: 4, background: color, marginRight: 6, verticalAlign: 'middle' }} />{label}</span>)}
      </div>

      <svg width="100%" viewBox="0 0 760 326" role="img" aria-label={caption} style={{ display: 'block', fontFamily: FONT_FAMILY }}>
        <defs>
          <clipPath id={udpClip}><rect x={0} y={54} width={365} height={228} /></clipPath>
          <clipPath id={tcpClip}><rect x={0} y={54} width={365} height={228} /></clipPath>
        </defs>
        {renderPanel(0, 'udp')}
        <line x1={378} y1={10} x2={378} y2={316} stroke={t.border} strokeDasharray="5 4" />
        {renderPanel(390, 'tcp')}
      </svg>

      {compact ? (
        <StickyRow>
          <StickyNote
            title={protocol === 'tcp' ? 'TCP ordered delivery' : 'UDP delivered datagrams'}
            latex={protocol === 'tcp' ? String.raw`t_i^{app}=\max(t_i^{arrival},\,t_{i-1}^{app})` : String.raw`D_{UDP}=N-\sum_i \mathbf{1}[\text{lost}_i]`}
            color="yellow"
            tilt={-1}
          ><p style={{ textAlign: 'center' }}>{protocol === 'tcp' ? `${packetCount}/${packetCount} at ${result.tcpCompleteMs} ms` : `${result.udpDelivered}/${packetCount} delivered`}</p></StickyNote>
          <StickyNote title={`What just happened · packet ${currentPacket.sequence}`} color="blue" tilt={1} live><p>{caption}</p></StickyNote>
        </StickyRow>
      ) : (
        <>
          <StickyRow>
            <StickyNote title="UDP: send each datagram once" latex={String.raw`D_{UDP}=N-\sum_i \mathbf{1}[\text{lost}_i]`} color="yellow" tilt={-1} active={protocol === 'udp'} onSelect={() => setProtocol('udp')}>
              <p>No built-in retransmission or reordering: the application gets whichever datagrams arrive.</p>
            </StickyNote>
            <StickyNote title="TCP: release bytes in sequence" latex={String.raw`t_i^{app}=\max(t_i^{arrival},\,t_{i-1}^{app})`} color="pink" tilt={1} active={protocol === 'tcp'} onSelect={() => setProtocol('tcp')}>
              <p>Packet i waits for every earlier sequence number; a missing packet is retransmitted.</p>
            </StickyNote>
          </StickyRow>
          <StickyRow>
            <StickyNote title="Worked numbers" color="green" tilt={-1}>
              <p style={{ fontVariantNumeric: 'tabular-nums' }}>UDP: {packetCount} − {packetCount - result.udpDelivered} lost = <strong>{result.udpDelivered} delivered</strong>; arrival order [{result.udpArrivalOrder.join(', ') || 'none'}].</p>
              <p style={{ fontVariantNumeric: 'tabular-nums' }}>TCP: {result.tcpRetransmissions} retries, <strong>{result.tcpCompleteMs} ms</strong> until all {packetCount} are available in order.</p>
            </StickyNote>
            <StickyNote title={`What just happened · packet ${currentPacket.sequence} of ${packetCount}`} color="blue" tilt={1} live><p>{caption}</p></StickyNote>
          </StickyRow>
          <PredictChallenge
            prompt="If one first send is lost, what does this teaching trace show?"
            options={PREDICT_OPTIONS}
            correctIndex={0}
            selected={prediction}
            onSelect={setPrediction}
            explanation="UDP leaves the gap. TCP waits for its timeout, retransmits, then releases the complete ordered stream."
            actionLabel="Run a 35% loss trace now"
            onAction={() => {
              setPacketCount(6);
              setLossPercent(35);
              setOneWayMs(45);
              setJitterMs(35);
              setTimeoutMs(100);
              setSeed(7);
              setProtocol('tcp');
              playback.playFromStart();
            }}
          />
        </>
      )}
    </>
  );
}

export default function TcpVsUdpDiagram({ compact = false }: { compact?: boolean } = {}) {
  const outerVisible = useVizVisible();
  return (
    <VisualizationContainer
      title="TCP versus UDP playground"
      footer={compact ? undefined : 'This deterministic teaching trace models independent first-send loss, variable one-way delay, one successful TCP retry, and in-order application delivery. It illustrates the transport guarantees; it is not a congestion-control benchmark.'}
    >
      <TcpVsUdpPlayground compact={compact} outerVisible={outerVisible} />
    </VisualizationContainer>
  );
}
