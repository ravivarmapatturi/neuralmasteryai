import { describe, expect, it } from 'vitest';
import { analyzeCapSystem, BASE_LOCAL_LATENCY_MS } from './capTheorem';

describe('capTheorem pure calculations', () => {
  it('hand-checks Split + CP: Node B rejects read with 0% stale reads and 50% cluster availability', () => {
    const res = analyzeCapSystem({
      choice: 'cp',
      partitioned: true,
      initialValue: 100,
      newWriteValue: 250,
      syncLatencyMs: 60,
    });

    expect(res.nodeA.value).toBe(250);
    expect(res.nodeA.version).toBe(2);
    expect(res.nodeB.status).toBe('rejected');
    expect(res.nodeB.returnedValue).toBeNull();
    expect(res.guarantees.consistent).toBe(true);
    expect(res.guarantees.availableOnB).toBe(false);
    // 1 of 2 nodes can answer reads = 50%
    expect(res.clusterAvailabilityPct).toBe(50);
    expect(res.staleReadPctOnB).toBe(0);
    expect(res.writeLatencyMs).toBe(BASE_LOCAL_LATENCY_MS);
  });

  it('hand-checks Split + AP: Node B answers stale $100 with $150 staleness gap and 100% availability', () => {
    const res = analyzeCapSystem({
      choice: 'ap',
      partitioned: true,
      initialValue: 100,
      newWriteValue: 250,
      syncLatencyMs: 60,
    });

    expect(res.nodeB.status).toBe('stale');
    expect(res.nodeB.returnedValue).toBe(100);
    expect(res.nodeB.isFresh).toBe(false);
    // Hand-checked staleness: |250 - 100| = 150
    expect(res.nodeB.stalenessDelta).toBe(150);
    expect(res.guarantees.consistent).toBe(false);
    expect(res.guarantees.availableOnB).toBe(true);
    expect(res.clusterAvailabilityPct).toBe(100);
    expect(res.staleReadPctOnB).toBe(100);
  });

  it('hand-checks PACELC latency trade-off when healthy link connects nodes', () => {
    const cpHealthy = analyzeCapSystem({
      choice: 'cp',
      partitioned: false,
      initialValue: 100,
      newWriteValue: 420,
      syncLatencyMs: 85,
    });
    const apHealthy = analyzeCapSystem({
      choice: 'ap',
      partitioned: false,
      initialValue: 100,
      newWriteValue: 420,
      syncLatencyMs: 85,
    });

    expect(cpHealthy.nodeB.returnedValue).toBe(420);
    expect(cpHealthy.nodeB.isFresh).toBe(true);
    // Synchronous ack adds 85 ms to local 10 ms = 95 ms
    expect(cpHealthy.writeLatencyMs).toBe(95);
    expect(apHealthy.writeLatencyMs).toBe(10);
  });
});
