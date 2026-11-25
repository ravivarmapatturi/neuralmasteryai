export type CapChoice = 'cp' | 'ap';

export interface CapScenarioPreset {
  id: string;
  label: string;
  choice: CapChoice;
  partitioned: boolean;
  newWriteValue: number;
  syncLatencyMs: number;
}

export const CAP_PRESETS: readonly CapScenarioPreset[] = [
  { id: 'split-cp', label: 'Split + CP (safe)', choice: 'cp', partitioned: true, newWriteValue: 250, syncLatencyMs: 60 },
  { id: 'split-ap', label: 'Split + AP (stale)', choice: 'ap', partitioned: true, newWriteValue: 250, syncLatencyMs: 60 },
  { id: 'healthy-cp', label: 'Healthy + CP (sync)', choice: 'cp', partitioned: false, newWriteValue: 250, syncLatencyMs: 60 },
  { id: 'healthy-ap', label: 'Healthy + AP (fast)', choice: 'ap', partitioned: false, newWriteValue: 250, syncLatencyMs: 60 },
];

export interface CapInput {
  choice: CapChoice;
  partitioned: boolean;
  initialValue?: number;
  newWriteValue: number;
  syncLatencyMs: number;
}

export interface CapStepRecord {
  id: 'synced' | 'write' | 'propagate' | 'read';
  title: string;
  explain: string;
}

export interface CapAnalysis {
  choice: CapChoice;
  partitioned: boolean;
  initialValue: number;
  newWriteValue: number;
  syncLatencyMs: number;
  nodeA: {
    version: number;
    value: number;
    status: 'ready';
  };
  nodeB: {
    version: number;
    value: number;
    status: 'synced' | 'stale' | 'rejected';
    returnedValue: number | null;
    isFresh: boolean;
    stalenessDelta: number;
  };
  guarantees: {
    consistent: boolean;
    availableOnB: boolean;
    partitionTolerant: boolean;
  };
  clusterAvailabilityPct: number;
  staleReadPctOnB: number;
  writeLatencyMs: number;
  readLatencyMs: number;
  trace: CapStepRecord[];
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

export const BASE_LOCAL_LATENCY_MS = 10;

/**
 * Computes exact distributed cluster state under Brewer's CAP theorem
 * (Gilbert & Lynch 2002) and Abadi's PACELC extension when the link is healthy.
 */
export function analyzeCapSystem(input: CapInput): CapAnalysis {
  const choice: CapChoice = input.choice === 'ap' ? 'ap' : 'cp';
  const partitioned = Boolean(input.partitioned);
  const initialValue = Math.round(clamp(input.initialValue ?? 100, 0, 9999));
  const newWriteValue = Math.round(clamp(input.newWriteValue, 0, 9999));
  const syncLatencyMs = Math.round(clamp(input.syncLatencyMs, 5, 300));

  const nodeA = {
    version: 2,
    value: newWriteValue,
    status: 'ready' as const,
  };

  const nodeBStale = partitioned && choice === 'ap';
  const nodeBRejected = partitioned && choice === 'cp';

  const nodeBValue = partitioned ? initialValue : newWriteValue;
  const nodeBVersion = partitioned ? 1 : 2;
  const nodeBStatus: 'synced' | 'stale' | 'rejected' = nodeBRejected
    ? 'rejected'
    : nodeBStale
      ? 'stale'
      : 'synced';
  const returnedValue = nodeBRejected ? null : nodeBValue;
  const isFresh = !nodeBRejected && nodeBVersion === nodeA.version && nodeBValue === nodeA.value;
  const stalenessDelta = nodeBRejected ? 0 : Math.abs(nodeA.value - nodeBValue);

  const consistent = !nodeBStale;
  const availableOnB = !nodeBRejected;
  const clusterAvailabilityPct = availableOnB ? 100 : 50;
  const staleReadPctOnB = nodeBStale ? 100 : 0;

  // PACELC: when healthy, CP waits for synchronous replica confirmation; AP acks locally.
  const writeLatencyMs = partitioned
    ? BASE_LOCAL_LATENCY_MS
    : choice === 'cp'
      ? BASE_LOCAL_LATENCY_MS + syncLatencyMs
      : BASE_LOCAL_LATENCY_MS;
  const readLatencyMs = BASE_LOCAL_LATENCY_MS;

  const trace: CapStepRecord[] = [
    {
      id: 'synced',
      title: '1. Both nodes start in sync',
      explain: `Node A and Node B both hold balance $${initialValue} (v1). Either node answers immediately with the exact same value.`,
    },
    {
      id: 'write',
      title: `2. Client writes $${newWriteValue} (v2) to Node A`,
      explain: partitioned
        ? `Node A updates its local copy to $${newWriteValue} (v2) and tries to send v2 across the network to Node B.`
        : choice === 'cp'
          ? `Node A records $${newWriteValue} (v2) and waits ${syncLatencyMs} ms for Node B to confirm before finishing the write (${writeLatencyMs} ms total).`
          : `Node A records $${newWriteValue} (v2) and replies in ${writeLatencyMs} ms, forwarding v2 to Node B in the background.`,
    },
    {
      id: 'propagate',
      title: partitioned ? '3. Network link splits between A and B' : '3. Update crosses the healthy link',
      explain: partitioned
        ? `The link is cut, so the sync message never arrives. Node B is stuck on old $${initialValue} (v1), $${Math.abs(newWriteValue - initialValue)} behind Node A.`
        : `Because the link is healthy, Node B receives v2 ($${newWriteValue}) after ${syncLatencyMs} ms. Both nodes agree again.`,
    },
    {
      id: 'read',
      title: '4. Second client reads from Node B',
      explain: !partitioned
        ? `Node B answers $${newWriteValue} (v2). Healthy links give both Consistency and Availability; CP only pays +${syncLatencyMs} ms extra write latency.`
        : choice === 'cp'
          ? `CP choice: Node B refuses the request (503 error) instead of risking stale data. Consistency holds (0% stale), but Node B availability drops to 0%.`
          : `AP choice: Node B stays up (100% available) and returns its old $${initialValue} (v1)—off by $${stalenessDelta} from Node A until the link heals.`,
    },
  ];

  return {
    choice,
    partitioned,
    initialValue,
    newWriteValue,
    syncLatencyMs,
    nodeA,
    nodeB: {
      version: nodeBVersion,
      value: nodeBValue,
      status: nodeBStatus,
      returnedValue,
      isFresh,
      stalenessDelta,
    },
    guarantees: {
      consistent,
      availableOnB,
      partitionTolerant: true,
    },
    clusterAvailabilityPct,
    staleReadPctOnB,
    writeLatencyMs,
    readLatencyMs,
    trace,
  };
}
