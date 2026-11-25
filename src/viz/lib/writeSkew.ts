// Pure concurrency & write-skew simulation over an N-clinician on-call roster.
// Compares Snapshot Isolation (disjoint writes commit despite shared read dependency),
// Serializable SSI (detects rw-cycle, aborts and retries on fresh state), and
// Shared Predicate/Table Lock (blocks later transactions until earlier commit).

export type IsolationMode = 'snapshot' | 'serial' | 'row-lock';

export interface WriteSkewConfig {
  mode: IsolationMode;
  totalClinicians: number;
  minOnCall: number;
  leaversCount: number;
  firstActor?: 'alice' | 'bob';
}

export interface ClinicianOutcome {
  id: string;
  name: string;
  attemptedLeave: boolean;
  sawOnCallCount: number;
  decision: 'left' | 'stayed' | 'idle';
  abortedFirstAttempt: boolean;
  finalOnCall: boolean;
}

export interface WriteSkewTraceStep {
  step: number;
  label: string;
  onCallCount: number;
  invariantHolds: boolean;
  actorsDone: number;
  explain: string;
}

export interface WriteSkewSimulation {
  config: WriteSkewConfig;
  clinicians: ClinicianOutcome[];
  finalOnCallCount: number;
  invariantHolds: boolean;
  writeSkewOccurred: boolean;
  writeOverlap: boolean;
  readWriteConflict: boolean;
  trace: WriteSkewTraceStep[];
}

const NAMES = ['Alice', 'Bob', 'Carol', 'Dave', 'Eve'] as const;

export const ISOLATION_META: Record<IsolationMode, { label: string; shortLabel: string }> = {
  snapshot: { label: 'Both read initial snapshot', shortLabel: 'Snapshot isolation' },
  serial: { label: 'Serial decision order', shortLabel: 'Serializable (SSI + retry)' },
  'row-lock': { label: 'Lock all read rows', shortLabel: 'Predicate / table lock' },
};

export function simulateWriteSkew(input: Partial<WriteSkewConfig> = {}): WriteSkewSimulation {
  const totalClinicians = Math.max(2, Math.min(5, Math.round(input.totalClinicians ?? 2)));
  const minOnCall = Math.max(1, Math.min(totalClinicians - 1, Math.round(input.minOnCall ?? 1)));
  const leaversCount = Math.max(2, Math.min(totalClinicians, Math.round(input.leaversCount ?? 2)));
  const mode: IsolationMode = input.mode ?? 'snapshot';
  const firstActor: 'alice' | 'bob' = input.firstActor ?? 'alice';

  const baseOrder = NAMES.slice(0, totalClinicians).map((name, idx) => ({
    id: name.toLowerCase(),
    name,
    idx,
  }));
  const ordered =
    firstActor === 'bob'
      ? [baseOrder[1], baseOrder[0], ...baseOrder.slice(2)]
      : baseOrder;

  let liveOnCall = totalClinicians;
  const outcomesByIdx: ClinicianOutcome[] = Array.from({ length: totalClinicians });

  for (let orderPos = 0; orderPos < ordered.length; orderPos++) {
    const actor = ordered[orderPos];
    const attemptedLeave = orderPos < leaversCount;

    if (!attemptedLeave) {
      outcomesByIdx[actor.idx] = {
        id: actor.id,
        name: actor.name,
        attemptedLeave: false,
        sawOnCallCount: totalClinicians,
        decision: 'idle',
        abortedFirstAttempt: false,
        finalOnCall: true,
      };
      continue;
    }

    if (mode === 'snapshot') {
      // Every concurrent transaction reads the t0 snapshot before any write commits.
      const saw = totalClinicians;
      const canLeave = saw - 1 >= minOnCall;
      if (canLeave) {
        liveOnCall -= 1;
      }
      outcomesByIdx[actor.idx] = {
        id: actor.id,
        name: actor.name,
        attemptedLeave: true,
        sawOnCallCount: saw,
        decision: canLeave ? 'left' : 'stayed',
        abortedFirstAttempt: false,
        finalOnCall: !canLeave,
      };
    } else {
      // Serial (SSI retry) or predicate lock: later actors observe prior committed departures.
      const saw = liveOnCall;
      const canLeave = saw - 1 >= minOnCall;
      const abortedFirstAttempt = mode === 'serial' && orderPos > 0;
      if (canLeave) {
        liveOnCall -= 1;
      }
      outcomesByIdx[actor.idx] = {
        id: actor.id,
        name: actor.name,
        attemptedLeave: true,
        sawOnCallCount: saw,
        decision: canLeave ? 'left' : 'stayed',
        abortedFirstAttempt,
        finalOnCall: !canLeave,
      };
    }
  }

  const finalOnCallCount = outcomesByIdx.filter((c) => c.finalOnCall).length;
  const invariantHolds = finalOnCallCount >= minOnCall;
  const writeSkewOccurred = mode === 'snapshot' && !invariantHolds;
  const firstLeaver = ordered[0].name;
  const secondLeaver = ordered[1].name;
  const leavers = ordered.slice(0, leaversCount);
  const leftCount = outcomesByIdx.filter((c) => c.decision === 'left').length;

  const trace: WriteSkewTraceStep[] = [
    {
      step: 0,
      label: 'Read roster',
      onCallCount: totalClinicians,
      invariantHolds: totalClinicians >= minOnCall,
      actorsDone: 0,
      explain:
        mode === 'snapshot'
          ? `${totalClinicians} doctors start on call (need ≥ ${minOnCall}). Both ${firstLeaver} and ${secondLeaver} take the same t₀ snapshot showing ${totalClinicians} on duty.`
          : mode === 'serial'
            ? `${totalClinicians} doctors start on call (need ≥ ${minOnCall}). ${firstLeaver} reads ${totalClinicians} first; ${secondLeaver} starts concurrently on the old snapshot.`
            : `${totalClinicians} doctors start on call (need ≥ ${minOnCall}). ${firstLeaver} acquires a shared lock on all ${totalClinicians} rows while ${secondLeaver} waits.`,
    },
    {
      step: 1,
      label: `${firstLeaver} writes`,
      onCallCount: Math.max(0, totalClinicians - 1),
      invariantHolds: totalClinicians - 1 >= minOnCall,
      actorsDone: 1,
      explain: `${firstLeaver} checks (${totalClinicians} − 1 ≥ ${minOnCall}), updates only ${firstLeaver}'s own row to OFF, and commits—leaving ${totalClinicians - 1} on call.`,
    },
    {
      step: 2,
      label: `${secondLeaver} acts`,
      onCallCount:
        mode === 'snapshot'
          ? Math.max(0, totalClinicians - Math.min(2, leaversCount))
          : outcomesByIdx[ordered[1].idx].decision === 'left'
            ? Math.max(0, totalClinicians - 2)
            : Math.max(0, totalClinicians - 1),
      invariantHolds:
        (mode === 'snapshot'
          ? totalClinicians - Math.min(2, leaversCount)
          : outcomesByIdx[ordered[1].idx].decision === 'left'
            ? totalClinicians - 2
            : totalClinicians - 1) >= minOnCall,
      actorsDone: 2,
      explain:
        mode === 'snapshot'
          ? `${secondLeaver} still sees ${totalClinicians} in the t₀ snapshot and updates ${secondLeaver}'s separate row. Write sets don't overlap, so the engine lets both commit!`
          : mode === 'serial'
            ? outcomesByIdx[ordered[1].idx].decision === 'stayed'
              ? `Serializable isolation detects the read-write cycle, aborts ${secondLeaver}'s stale run, and retries: ${secondLeaver} now sees ${firstLeaver} absent and stays on call.`
              : `After serializing behind ${firstLeaver}, ${secondLeaver} re-reads ${totalClinicians - 1} on duty (still > ${minOnCall}), so ${secondLeaver} safely leaves.`
            : outcomesByIdx[ordered[1].idx].decision === 'stayed'
              ? `Once ${firstLeaver} releases the lock, ${secondLeaver} reads the committed count (${totalClinicians - 1}) and stays on duty to preserve ≥ ${minOnCall}.`
              : `After waiting for ${firstLeaver}'s lock, ${secondLeaver} sees ${totalClinicians - 1} remaining and safely leaves.`,
    },
    {
      step: 3,
      label: 'Commit check',
      onCallCount: finalOnCallCount,
      invariantHolds,
      actorsDone: leavers.length,
      explain: writeSkewOccurred
        ? `Write skew! ${leftCount} disjoint row updates all committed from t₀ snapshots, dropping on-call doctors to ${finalOnCallCount} (below required ≥ ${minOnCall}).`
        : mode === 'snapshot'
          ? `By luck, starting slack was large enough: ${leftCount} left from ${totalClinicians}, leaving ${finalOnCallCount} ≥ ${minOnCall}. Try lowering N or raising M to trigger write skew.`
          : `Final roster has ${finalOnCallCount} on call (need ≥ ${minOnCall}). Protecting the shared read set prevented write skew.`,
    },
  ];

  return {
    config: { mode, totalClinicians, minOnCall, leaversCount, firstActor },
    clinicians: outcomesByIdx,
    finalOnCallCount,
    invariantHolds,
    writeSkewOccurred,
    writeOverlap: false,
    readWriteConflict: mode === 'snapshot' && leaversCount >= 2,
    trace,
  };
}
