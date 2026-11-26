/**
 * Majority quorum and Raft commit simulation:
 *   Q = floor(N / 2) + 1
 *   F = N - Q = floor((N - 1) / 2)
 *   minOverlap = 2 * Q - N >= 1
 */

export type QuorumScenario = 'crash' | 'partition';

export interface ClusterNodeState {
  index: number;
  label: string;
  role: 'leader' | 'follower';
  group: 'A' | 'B';
  reachable: boolean;
}

export interface ConsensusStep {
  step: number;
  title: string;
  explain: string;
}

export interface ConsensusAnalysis {
  n: number;
  unreachable: number;
  reachable: number;
  quorum: number;
  maxFailures: number;
  minOverlap: number;
  committed: boolean;
  groupBCanCommit: boolean;
  scenario: QuorumScenario;
  proposal: string;
  nodes: ClusterNodeState[];
  steps: ConsensusStep[];
}

export function quorumThreshold(n: number): number {
  return Math.floor(n / 2) + 1;
}

export function maxTolerableFailures(n: number): number {
  return n - quorumThreshold(n);
}

export function analyzeConsensus({
  n,
  unreachableMask,
  scenario,
  proposal,
}: {
  n: number;
  unreachableMask: boolean[];
  scenario: QuorumScenario;
  proposal: string;
}): ConsensusAnalysis {
  const safeN = Math.max(3, Math.min(9, Math.round(n)));
  const cleanProposal = proposal.trim() || 'set x = 42';
  const quorum = quorumThreshold(safeN);
  const maxFailures = maxTolerableFailures(safeN);
  const minOverlap = 2 * quorum - safeN;

  // Keep S1 (index 0) as the proposing leader in Group A so the vote flow is always concrete
  const nodes: ClusterNodeState[] = Array.from({ length: safeN }, (_, i) => {
    const isUnreachable = i === 0 ? false : Boolean(unreachableMask[i]);
    return {
      index: i,
      label: `S${i + 1}`,
      role: i === 0 ? 'leader' : 'follower',
      group: isUnreachable ? 'B' : 'A',
      reachable: !isUnreachable,
    };
  });

  const reachable = nodes.filter((node) => node.reachable).length;
  const unreachable = safeN - reachable;
  const committed = reachable >= quorum;
  const groupBCanCommit = scenario === 'partition' && unreachable >= quorum;

  const steps: ConsensusStep[] = [
    {
      step: 1,
      title: 'Client proposes write',
      explain: `Client sends "${cleanProposal}" to leader S1 in Group A. Before replying OK, S1 needs at least ${quorum} of ${safeN} votes (including itself).`,
    },
    {
      step: 2,
      title: 'Leader sends AppendEntries',
      explain:
        scenario === 'partition'
          ? `Leader S1 sends the write to followers. The network split blocks ${unreachable} server(s) in Group B from hearing S1.`
          : `Leader S1 sends the write to all followers; ${unreachable} crashed server(s) cannot reply.`,
    },
    {
      step: 3,
      title: 'Votes counted',
      explain: `Group A gathers ${reachable} vote(s) (${nodes.filter((nd) => nd.reachable).map((nd) => nd.label).join(', ')}). Majority needed: ⌊${safeN}/2⌋ + 1 = ${quorum}.`,
    },
    {
      step: 4,
      title: committed ? 'Quorum reached — committed' : 'No quorum — write blocked',
      explain: committed
        ? `${reachable} ≥ ${quorum}: write "${cleanProposal}" commits safely! Any future majority quorum shares ≥ ${minOverlap} witness server(s) that already saw it.`
        : groupBCanCommit
          ? `Group A has only ${reachable} (< ${quorum}), so it refuses to commit. Meanwhile Group B has ${unreachable} ≥ ${quorum} and can elect a leader safely without split-brain!`
          : `Only ${reachable} < ${quorum} servers reachable: Group A halts writes instead of risking two halves committing conflicting values.`,
    },
  ];

  return {
    n: safeN,
    unreachable,
    reachable,
    quorum,
    maxFailures,
    minOverlap,
    committed,
    groupBCanCommit,
    scenario,
    proposal: cleanProposal,
    nodes,
    steps,
  };
}
