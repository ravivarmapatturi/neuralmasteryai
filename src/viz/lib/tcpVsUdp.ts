export interface TransportConfig {
  packetCount: number;
  lossRate: number;
  sendGapMs: number;
  oneWayMs: number;
  jitterMs: number;
  retransmitTimeoutMs: number;
  seed: number;
}

export interface PacketResult {
  sequence: number;
  sendMs: number;
  firstLost: boolean;
  firstArrivalMs: number | null;
  tcpArrivalMs: number;
  tcpDeliveryMs: number;
  retransmissions: number;
}

export interface TransportResult {
  packets: PacketResult[];
  udpArrivalOrder: number[];
  udpDelivered: number;
  udpLastArrivalMs: number;
  tcpRetransmissions: number;
  tcpCompleteMs: number;
}

function unit(seed: number, packetIndex: number, salt: number): number {
  let x = (seed + 1) * 0x9e3779b1 + (packetIndex + 1) * 0x85ebca6b + salt * 0xc2b2ae35;
  x = Math.imul(x ^ (x >>> 16), 0x7feb352d);
  x = Math.imul(x ^ (x >>> 15), 0x846ca68b);
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
}

export function simulateTransports(
  config: TransportConfig,
  firstLossPattern?: readonly boolean[],
): TransportResult {
  const packetCount = Math.max(1, Math.round(config.packetCount));
  const lossRate = Math.max(0, Math.min(1, config.lossRate));
  const packets: PacketResult[] = [];
  let priorTcpDelivery = 0;

  for (let index = 0; index < packetCount; index++) {
    const sequence = index + 1;
    const sendMs = index * Math.max(0, config.sendGapMs);
    const firstLost = firstLossPattern?.[index] ?? unit(config.seed, index, 17) < lossRate;
    const firstJitter = Math.round(unit(config.seed, index, 29) * Math.max(0, config.jitterMs));
    const retryJitter = Math.round(unit(config.seed, index, 43) * Math.max(0, config.jitterMs));
    const firstArrivalMs = firstLost ? null : sendMs + config.oneWayMs + firstJitter;
    // This teaching model permits one first-attempt loss per packet. TCP's retry succeeds.
    const tcpArrivalMs = firstLost
      ? sendMs + config.retransmitTimeoutMs + config.oneWayMs + retryJitter
      : (firstArrivalMs as number);
    const tcpDeliveryMs = Math.max(priorTcpDelivery, tcpArrivalMs);
    priorTcpDelivery = tcpDeliveryMs;
    packets.push({
      sequence,
      sendMs,
      firstLost,
      firstArrivalMs,
      tcpArrivalMs,
      tcpDeliveryMs,
      retransmissions: firstLost ? 1 : 0,
    });
  }

  const udpArrivals = packets
    .filter((packet) => packet.firstArrivalMs !== null)
    .sort((a, b) => (a.firstArrivalMs as number) - (b.firstArrivalMs as number));
  return {
    packets,
    udpArrivalOrder: udpArrivals.map((packet) => packet.sequence),
    udpDelivered: udpArrivals.length,
    udpLastArrivalMs: Math.max(0, ...udpArrivals.map((packet) => packet.firstArrivalMs as number)),
    tcpRetransmissions: packets.reduce((sum, packet) => sum + packet.retransmissions, 0),
    tcpCompleteMs: packets.at(-1)?.tcpDeliveryMs ?? 0,
  };
}

export function explainTransportStep(packet: PacketResult, totalPackets: number): string {
  if (packet.firstLost) {
    return `Packet ${packet.sequence} of ${totalPackets}: UDP loses this first send. TCP notices the gap, retransmits once, and can deliver it in order at ${packet.tcpDeliveryMs} ms.`;
  }
  return `Packet ${packet.sequence} of ${totalPackets}: this first send reaches the receiver at ${packet.firstArrivalMs} ms; TCP releases it to the app at ${packet.tcpDeliveryMs} ms after preserving sequence order.`;
}
