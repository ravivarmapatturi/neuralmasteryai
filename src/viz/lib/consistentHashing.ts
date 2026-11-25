// Pure consistent-hashing ring & naive-modulo comparison math.
// Evaluates clockwise successor lookup on a [0, 100) ring with optional virtual
// nodes, stolen interval calculation when node D joins, and side-by-side modulo remapping.

export type RingMembership = 'before' | 'after';
export type HashRuleMode = 'ring' | 'modulo';

export interface RingToken {
  position: number;
  owner: 'A' | 'B' | 'C' | 'D';
  label: string;
}

export interface KeyAssignment {
  key: number;
  beforeOwner: string;
  afterOwner: string;
  movedRing: boolean;
  moduloBefore: string;
  moduloAfter: string;
  movedModulo: boolean;
  wrapsAroundZero: boolean;
}

export interface ConsistentHashAnalysis {
  membership: RingMembership;
  dPosition: number;
  vnodes: number;
  keys: number[];
  beforeTokens: RingToken[];
  afterTokens: RingToken[];
  activeTokens: RingToken[];
  stolenIntervals: { from: number; to: number; previousOwner: string }[];
  assignments: KeyAssignment[];
  movedRingCount: number;
  movedRingPct: number;
  movedModuloCount: number;
  movedModuloPct: number;
  expectedMovePct: number;
  ownerGroupsBefore: Record<string, number[]>;
  ownerGroupsAfter: Record<string, number[]>;
}

const BASE_SERVERS: { owner: 'A' | 'B' | 'C'; positions: [number, number, number] }[] = [
  { owner: 'A', positions: [20, 65, 92] },
  { owner: 'B', positions: [50, 5, 72] },
  { owner: 'C', positions: [80, 42, 14] },
];

export const DEFAULT_KEYS = [10, 30, 45, 60, 90] as const;

export function parseKeyList(raw: string): number[] {
  const nums = raw
    .split(/[,\s]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => Number(s))
    .filter((n) => Number.isFinite(n))
    .map((n) => ((Math.round(n) % 100) + 100) % 100);
  const unique = Array.from(new Set(nums));
  return unique.length > 0 ? unique.slice(0, 8) : [...DEFAULT_KEYS];
}

export function buildRingTokens(includeD: boolean, dPosition: number, vnodes: number): RingToken[] {
  const v = Math.max(1, Math.min(3, Math.round(vnodes)));
  const dPos = ((Math.round(dPosition) % 100) + 100) % 100;
  const tokens: RingToken[] = [];

  for (const s of BASE_SERVERS) {
    for (let i = 0; i < v; i++) {
      tokens.push({
        position: s.positions[i],
        owner: s.owner,
        label: v === 1 ? s.owner : `${s.owner}${i + 1}`,
      });
    }
  }

  if (includeD) {
    // Deterministic spaced virtual offsets for D if v > 1, avoiding exact base collisions
    const dOffsets = [0, 33, 66];
    const used = new Set(tokens.map((t) => t.position));
    for (let i = 0; i < v; i++) {
      let pos = (dPos + dOffsets[i]) % 100;
      while (used.has(pos)) pos = (pos + 1) % 100;
      used.add(pos);
      tokens.push({
        position: pos,
        owner: 'D',
        label: v === 1 ? 'D' : `D${i + 1}`,
      });
    }
  }

  return tokens.sort((a, b) => a.position - b.position);
}

export function findClockwiseOwner(key: number, sortedTokens: readonly RingToken[]): { token: RingToken; wraps: boolean } {
  const found = sortedTokens.find((tok) => tok.position >= key);
  if (found) return { token: found, wraps: false };
  return { token: sortedTokens[0], wraps: true };
}

export function moduloOwner(key: number, nodeCount: number): 'A' | 'B' | 'C' | 'D' {
  const names: ('A' | 'B' | 'C' | 'D')[] = ['A', 'B', 'C', 'D'];
  return names[key % nodeCount];
}

export function analyzeConsistentHashing({
  membership = 'after',
  dPosition = 35,
  vnodes = 1,
  keys = [...DEFAULT_KEYS],
}: {
  membership?: RingMembership;
  dPosition?: number;
  vnodes?: number;
  keys?: readonly number[];
} = {}): ConsistentHashAnalysis {
  const clampedD = Math.max(1, Math.min(99, Math.round(dPosition)));
  const clampedV = Math.max(1, Math.min(3, Math.round(vnodes)));
  const cleanKeys = keys.length > 0 ? [...keys] : [...DEFAULT_KEYS];

  const beforeTokens = buildRingTokens(false, clampedD, clampedV);
  const afterTokens = buildRingTokens(true, clampedD, clampedV);
  const activeTokens = membership === 'after' ? afterTokens : beforeTokens;

  // Stolen intervals are the arcs (predecessor, dTok] taken from each D token's clockwise successor in beforeTokens
  const stolenIntervals = afterTokens
    .filter((tok) => tok.owner === 'D')
    .map((dTok) => {
      const idx = afterTokens.findIndex((t) => t.position === dTok.position && t.owner === 'D');
      const pred = afterTokens[(idx - 1 + afterTokens.length) % afterTokens.length];
      const prevOwner = findClockwiseOwner(dTok.position, beforeTokens).token.owner;
      return { from: pred.position, to: dTok.position, previousOwner: prevOwner };
    });

  const assignments: KeyAssignment[] = cleanKeys.map((key) => {
    const b = findClockwiseOwner(key, beforeTokens);
    const a = findClockwiseOwner(key, afterTokens);
    const modB = moduloOwner(key, 3);
    const modA = moduloOwner(key, 4);
    const activeMatch = membership === 'after' ? a : b;
    return {
      key,
      beforeOwner: b.token.owner,
      afterOwner: a.token.owner,
      movedRing: b.token.owner !== a.token.owner,
      moduloBefore: modB,
      moduloAfter: modA,
      movedModulo: modB !== modA,
      wrapsAroundZero: activeMatch.wraps,
    };
  });

  const movedRingCount = assignments.filter((a) => a.movedRing).length;
  const movedModuloCount = assignments.filter((a) => a.movedModulo).length;
  const n = assignments.length || 1;

  const ownerGroupsBefore: Record<string, number[]> = { A: [], B: [], C: [] };
  const ownerGroupsAfter: Record<string, number[]> = { A: [], B: [], C: [], D: [] };
  for (const a of assignments) {
    (ownerGroupsBefore[a.beforeOwner] ??= []).push(a.key);
    (ownerGroupsAfter[a.afterOwner] ??= []).push(a.key);
  }

  return {
    membership,
    dPosition: clampedD,
    vnodes: clampedV,
    keys: cleanKeys,
    beforeTokens,
    afterTokens,
    activeTokens,
    stolenIntervals,
    assignments,
    movedRingCount,
    movedRingPct: (movedRingCount / n) * 100,
    movedModuloCount,
    movedModuloPct: (movedModuloCount / n) * 100,
    expectedMovePct: (1 / 4) * 100,
    ownerGroupsBefore,
    ownerGroupsAfter,
  };
}
