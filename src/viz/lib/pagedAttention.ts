export type AllocationMode = 'paged' | 'contiguous';

export interface RequestAllocSummary {
  id: 'A' | 'B' | 'C';
  label: string;
  usedTokens: number;
  admitted: boolean;
  allocatedBlocks: number;
  allocatedSlots: number;
  wastedSlots: number;
  physicalBlocks: number[];
}

export interface PhysicalBlockCell {
  blockId: number;
  ownerId: 'A' | 'B' | 'C' | null;
  state: 'used' | 'tail-waste' | 'reserved-idle' | 'free';
  tokensInBlock: number;
}

export interface PagedAttentionAnalysis {
  mode: AllocationMode;
  totalBlocks: number;
  blockSize: number;
  totalPoolTokens: number;
  maxSeqLen: number;
  contiguousBlocksPerReq: number;
  requests: RequestAllocSummary[];
  cells: PhysicalBlockCell[];
  admittedCount: number;
  rejectedCount: number;
  allocatedBlocksTotal: number;
  freeBlocksTotal: number;
  allocatedSlotsTotal: number;
  usedTokensAdmitted: number;
  wastedSlotsAdmitted: number;
  wastePct: number;
  utilizationPct: number;
  explain: string;
}

// Deterministic non-contiguous physical page placement matching vLLM Figure 2 intuition
const SCATTERED_ORDER = [
  0, 5, 11, 18, 2, 9, 14, 21, 1, 7, 13, 20, 4, 16, 23, 27,
  3, 8, 12, 19, 6, 15, 22, 26, 10, 17, 24, 29, 25, 28, 30, 31,
  32, 33, 34, 35, 36, 37, 38, 39,
];

export const DEFAULT_BASE_TOKENS: readonly [number, number, number] = [60, 46, 78];
export const STEP_INCREMENTS: readonly [number, number, number] = [8, 6, 10];
export const TOTAL_STEPS = 5;

function clampInt(v: number, min: number, max: number): number {
  if (!Number.isFinite(v)) return min;
  return Math.max(min, Math.min(max, Math.round(v)));
}

export function tokensAtStep(base: readonly [number, number, number], step: number): [number, number, number] {
  const s = clampInt(step, 0, TOTAL_STEPS - 1);
  return [
    clampInt(base[0] + s * STEP_INCREMENTS[0], 1, 240),
    clampInt(base[1] + s * STEP_INCREMENTS[1], 1, 240),
    clampInt(base[2] + s * STEP_INCREMENTS[2], 1, 240),
  ];
}

/**
 * Computes exact physical block allocation, logical-to-physical block tables,
 * and internal/reservation memory waste for PagedAttention vs Contiguous KV caching.
 */
export function analyzePagedAttention({
  mode,
  blockSize = 16,
  maxSeqLen = 256,
  totalBlocks = 32,
  requestTokens = [60, 46, 78],
}: {
  mode: AllocationMode;
  blockSize?: number;
  maxSeqLen?: number;
  totalBlocks?: number;
  requestTokens?: readonly [number, number, number];
}): PagedAttentionAnalysis {
  const cleanMode: AllocationMode = mode === 'contiguous' ? 'contiguous' : 'paged';
  const B = clampInt(blockSize, 4, 32);
  const Lmax = clampInt(maxSeqLen, 64, 256);
  const poolBlocks = clampInt(totalBlocks, 16, 40);
  const poolTokens = poolBlocks * B;

  const reqSpecs: { id: 'A' | 'B' | 'C'; label: string; tokens: number }[] = [
    { id: 'A', label: 'Req A', tokens: clampInt(requestTokens[0], 1, Lmax) },
    { id: 'B', label: 'Req B', tokens: clampInt(requestTokens[1], 1, Lmax) },
    { id: 'C', label: 'Req C', tokens: clampInt(requestTokens[2], 1, Lmax) },
  ];

  const cells: PhysicalBlockCell[] = Array.from({ length: poolBlocks }, (_, idx) => ({
    blockId: idx,
    ownerId: null,
    state: 'free',
    tokensInBlock: 0,
  }));

  const contiguousBlocksPerReq = Math.ceil(Lmax / B);
  const requests: RequestAllocSummary[] = [];

  if (cleanMode === 'contiguous') {
    let cursor = 0;
    for (const req of reqSpecs) {
      const fits = cursor + contiguousBlocksPerReq <= poolBlocks;
      if (!fits) {
        requests.push({
          id: req.id,
          label: req.label,
          usedTokens: req.tokens,
          admitted: false,
          allocatedBlocks: 0,
          allocatedSlots: 0,
          wastedSlots: 0,
          physicalBlocks: [],
        });
        continue;
      }
      const neededActiveBlocks = Math.ceil(req.tokens / B);
      const assigned: number[] = [];
      for (let i = 0; i < contiguousBlocksPerReq; i++) {
        const pid = cursor + i;
        assigned.push(pid);
        if (i < neededActiveBlocks) {
          const isLast = i === neededActiveBlocks - 1;
          const rem = req.tokens % B;
          const usedInBlock = isLast && rem !== 0 ? rem : B;
          cells[pid] = {
            blockId: pid,
            ownerId: req.id,
            state: usedInBlock < B ? 'tail-waste' : 'used',
            tokensInBlock: usedInBlock,
          };
        } else {
          cells[pid] = {
            blockId: pid,
            ownerId: req.id,
            state: 'reserved-idle',
            tokensInBlock: 0,
          };
        }
      }
      cursor += contiguousBlocksPerReq;
      const allocatedSlots = contiguousBlocksPerReq * B;
      requests.push({
        id: req.id,
        label: req.label,
        usedTokens: req.tokens,
        admitted: true,
        allocatedBlocks: contiguousBlocksPerReq,
        allocatedSlots,
        wastedSlots: allocatedSlots - req.tokens,
        physicalBlocks: assigned,
      });
    }
  } else {
    // Interleave physical page allocation round-robin across active requests to show non-contiguous paging
    const freeIds = SCATTERED_ORDER.filter((id) => id < poolBlocks);
    let freePtr = 0;
    const neededPerReq = reqSpecs.map((r) => Math.ceil(r.tokens / B));
    const assignedPerReq: number[][] = [[], [], []];
    const admitted = [true, true, true];

    // Check admission sequentially or round-robin; here admit a request if its needed blocks are free
    const remainingFree = () => freeIds.length - freePtr;
    const maxNeeded = Math.max(...neededPerReq);
    // Reserve blocks request by request only up to available pool, interleaved for admitted requests
    let available = remainingFree();
    for (let idx = 0; idx < reqSpecs.length; idx++) {
      if (neededPerReq[idx] <= available) {
        available -= neededPerReq[idx];
      } else {
        admitted[idx] = false;
      }
    }

    for (let layer = 0; layer < maxNeeded; layer++) {
      for (let rIdx = 0; rIdx < reqSpecs.length; rIdx++) {
        if (!admitted[rIdx] || layer >= neededPerReq[rIdx]) continue;
        const pid = freeIds[freePtr++];
        assignedPerReq[rIdx].push(pid);
        const tokens = reqSpecs[rIdx].tokens;
        const isLast = layer === neededPerReq[rIdx] - 1;
        const rem = tokens % B;
        const usedInBlock = isLast && rem !== 0 ? rem : B;
        cells[pid] = {
          blockId: pid,
          ownerId: reqSpecs[rIdx].id,
          state: usedInBlock < B ? 'tail-waste' : 'used',
          tokensInBlock: usedInBlock,
        };
      }
    }

    for (let rIdx = 0; rIdx < reqSpecs.length; rIdx++) {
      const req = reqSpecs[rIdx];
      const phys = assignedPerReq[rIdx];
      const allocSlots = phys.length * B;
      requests.push({
        id: req.id,
        label: req.label,
        usedTokens: req.tokens,
        admitted: admitted[rIdx],
        allocatedBlocks: phys.length,
        allocatedSlots: allocSlots,
        wastedSlots: admitted[rIdx] ? allocSlots - req.tokens : 0,
        physicalBlocks: phys,
      });
    }
  }

  const admittedReqs = requests.filter((r) => r.admitted);
  const admittedCount = admittedReqs.length;
  const rejectedCount = requests.length - admittedCount;
  const allocatedBlocksTotal = admittedReqs.reduce((acc, r) => acc + r.allocatedBlocks, 0);
  const freeBlocksTotal = poolBlocks - allocatedBlocksTotal;
  const allocatedSlotsTotal = allocatedBlocksTotal * B;
  const usedTokensAdmitted = admittedReqs.reduce((acc, r) => acc + r.usedTokens, 0);
  const wastedSlotsAdmitted = allocatedSlotsTotal - usedTokensAdmitted;
  const wastePct = allocatedSlotsTotal > 0 ? (wastedSlotsAdmitted / allocatedSlotsTotal) * 100 : 0;
  const utilizationPct = poolTokens > 0 ? (usedTokensAdmitted / poolTokens) * 100 : 0;

  let explain = '';
  if (cleanMode === 'contiguous') {
    const blockedNames = requests.filter((r) => !r.admitted).map((r) => r.label).join(', ');
    explain =
      rejectedCount > 0
        ? `Contiguous mode pre-reserves ${contiguousBlocksPerReq} blocks (${Lmax} slots) per request. Only ${admittedCount} of 3 fit — ${blockedNames} gets blocked (OOM), while ${wastedSlotsAdmitted} reserved slots (${wastePct.toFixed(1)}%) sit empty!`
        : `Contiguous mode pre-reserves ${contiguousBlocksPerReq} blocks (${Lmax} slots) for all 3 requests, locking ${allocatedSlotsTotal} slots while only ${usedTokensAdmitted} are used (${wastePct.toFixed(1)}% idle waste).`;
  } else {
    explain =
      rejectedCount === 0
        ? `PagedAttention gives each request only the ${B}-token pages it needs right now (${allocatedBlocksTotal} of ${poolBlocks} blocks). All 3 fit, ${freeBlocksTotal} blocks remain free, and only ${wastedSlotsAdmitted} tail slots (${wastePct.toFixed(1)}%) go unused.`
        : `PagedAttention packs ${allocatedBlocksTotal} of ${poolBlocks} blocks with only ${wastePct.toFixed(1)}% tail waste, though pool size ${poolBlocks} blocks cannot fit all ${reqSpecs.map((r) => Math.ceil(r.tokens / B)).reduce((a, b) => a + b, 0)} requested pages.`;
  }

  return {
    mode: cleanMode,
    totalBlocks: poolBlocks,
    blockSize: B,
    totalPoolTokens: poolTokens,
    maxSeqLen: Lmax,
    contiguousBlocksPerReq,
    requests,
    cells,
    admittedCount,
    rejectedCount,
    allocatedBlocksTotal,
    freeBlocksTotal,
    allocatedSlotsTotal,
    usedTokensAdmitted,
    wastedSlotsAdmitted,
    wastePct,
    utilizationPct,
    explain,
  };
}
