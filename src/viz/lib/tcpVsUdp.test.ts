import { describe, expect, it } from 'vitest';
import { simulateTransports } from './tcpVsUdp';

const base = {
  packetCount: 3,
  lossRate: 0,
  sendGapMs: 10,
  oneWayMs: 50,
  jitterMs: 0,
  retransmitTimeoutMs: 100,
  seed: 1,
};

describe('TCP vs UDP teaching simulation', () => {
  it('matches a hand-checked loss and head-of-line wait', () => {
    const result = simulateTransports(base, [false, true, false]);
    // First arrivals: p1=50, p2 lost, p3=70. TCP retries p2 at 110 and it arrives at 160.
    expect(result.udpArrivalOrder).toEqual([1, 3]);
    expect(result.udpDelivered).toBe(2);
    expect(result.tcpRetransmissions).toBe(1);
    expect(result.packets.map((packet) => packet.tcpDeliveryMs)).toEqual([50, 160, 160]);
    expect(result.tcpCompleteMs).toBe(160);
  });

  it('delivers every packet without retransmission when loss is zero', () => {
    const result = simulateTransports(base, [false, false, false]);
    expect(result.udpArrivalOrder).toEqual([1, 2, 3]);
    expect(result.tcpRetransmissions).toBe(0);
    expect(result.tcpCompleteMs).toBe(70);
  });
});
