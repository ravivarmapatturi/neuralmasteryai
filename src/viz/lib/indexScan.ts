export interface IndexScanComparison {
  tableRows: number;
  selectivityPct: number;
  matchingRows: number;
  pages: number;
  scanChecks: number;
  btreeChecks: number;
  speedup: number;
  treeDepth: number;
  distinctHeapPages: number;
  seqIoCost: number;
  indexIoCost: number;
  plannerChoice: 'index' | 'seq-scan';
  plannerReason: string;
}

export interface ToyBtreeBranch {
  id: number;
  label: string;
  keys: readonly [number, number];
  leaves: readonly [number, number, number, number];
}

export const TOY_BTREE_ROOT_KEYS = [5, 9, 13] as const;

export const TOY_BTREE_BRANCHES: readonly ToyBtreeBranch[] = [
  { id: 0, label: '1–4', keys: [1, 3], leaves: [1, 2, 3, 4] },
  { id: 1, label: '5–8', keys: [5, 7], leaves: [5, 6, 7, 8] },
  { id: 2, label: '9–12', keys: [9, 11], leaves: [9, 10, 11, 12] },
  { id: 3, label: '13–16', keys: [13, 15], leaves: [13, 14, 15, 16] },
];

export interface ToySearchTraceStep {
  stepIndex: number;
  stage: 'start' | 'root' | 'branch' | 'found';
  scanVisitedCount: number;
  btreeHops: number;
  activeBranchIdx: number | null;
  foundLeafId: number | null;
  caption: string;
}

/** Build a 4-step live search race comparing a sequential row scan against a 3-level B-tree on ids 1..16. */
export function buildToySearchSteps(rawTargetId: number): ToySearchTraceStep[] {
  const targetId = Math.max(1, Math.min(16, Math.round(Number.isFinite(rawTargetId) ? rawTargetId : 14)));
  const branchIdx = Math.floor((targetId - 1) / 4);
  const branch = TOY_BTREE_BRANCHES[branchIdx];
  const rootRule =
    branchIdx === 0
      ? `${targetId} < 5 → take left link (1–4)`
      : branchIdx === 1
        ? `5 ≤ ${targetId} < 9 → take second link (5–8)`
        : branchIdx === 2
          ? `9 ≤ ${targetId} < 13 → take third link (9–12)`
          : `${targetId} ≥ 13 → take right link (13–16)`;

  const step1Scan = Math.min(targetId, Math.max(1, Math.ceil(targetId / 3)));
  const step2Scan = Math.min(targetId, Math.max(step1Scan, Math.ceil((targetId * 2) / 3)));

  return [
    {
      stepIndex: 0,
      stage: 'start',
      scanVisitedCount: 1,
      btreeHops: 0,
      activeBranchIdx: null,
      foundLeafId: null,
      caption: `Goal: find user id = ${targetId} in 16 rows. Without an index, the database starts checking from row 1.`,
    },
    {
      stepIndex: 1,
      stage: 'root',
      scanVisitedCount: step1Scan,
      btreeHops: 1,
      activeBranchIdx: branchIdx,
      foundLeafId: null,
      caption: `Hop 1 (Root): ${rootRule}. One B-tree check skips 12 rows at once, while full scan checked ${step1Scan} row(s).`,
    },
    {
      stepIndex: 2,
      stage: 'branch',
      scanVisitedCount: step2Scan,
      btreeHops: 2,
      activeBranchIdx: branchIdx,
      foundLeafId: null,
      caption: `Hop 2 (Branch ${branch.label}): narrows down inside [${branch.leaves.join(', ')}]. Full scan is up to ${step2Scan} row checks.`,
    },
    {
      stepIndex: 3,
      stage: 'found',
      scanVisitedCount: targetId,
      btreeHops: 3,
      activeBranchIdx: branchIdx,
      foundLeafId: targetId,
      caption: `Hop 3 (Leaf): B-tree found id = ${targetId} in 3 hops! A sequential full scan needed ${targetId} row checks.`,
    },
  ];
}

/**
 * Compute row comparisons and PostgreSQL-style page I/O cost (seq_page_cost=1, random_page_cost=4)
 * using Yao's formula for distinct heap pages touched.
 */
export function computeIndexScanComparison(
  rawTableRows: number,
  rawSelectivityPct = 0,
  rowsPerPage = 100,
): IndexScanComparison {
  const tableRows = Math.max(10, Math.min(1_000_000, Math.round(Number.isFinite(rawTableRows) ? rawTableRows : 10_000)));
  const selectivityPct = Math.max(0, Math.min(50, Number.isFinite(rawSelectivityPct) ? rawSelectivityPct : 0));

  const scanChecks = tableRows;
  const btreeChecks = Math.max(1, Math.ceil(Math.log2(tableRows)));
  const speedup = scanChecks / btreeChecks;

  const pages = Math.max(1, Math.ceil(tableRows / rowsPerPage));
  const matchingRows = selectivityPct === 0 ? 1 : Math.max(1, Math.round((tableRows * selectivityPct) / 100));

  // Yao (1977) expected distinct pages hit when sampling `matchingRows` uniformly across `pages` blocks.
  const distinctHeapPages = pages <= 1 ? 1 : pages * (1 - (1 - 1 / pages) ** matchingRows);
  const treeDepth = Math.max(1, Math.ceil(Math.log(Math.max(2, tableRows)) / Math.log(100)));

  const seqIoCost = pages;
  const indexIoCost = treeDepth + 4 * distinctHeapPages;

  const plannerChoice: 'index' | 'seq-scan' = indexIoCost < seqIoCost ? 'index' : 'seq-scan';

  let plannerReason: string;
  if (pages <= 4) {
    plannerReason = `Tiny table (${pages} disk page${pages === 1 ? '' : 's'}): reading sequentially once beats chasing an index pointer.`;
  } else if (plannerChoice === 'seq-scan') {
    plannerReason = `Filter matches ${matchingRows.toLocaleString('en-US')} rows (${selectivityPct}%), hitting ~${Math.round(distinctHeapPages).toLocaleString('en-US')} random pages — streaming sequentially is cheaper.`;
  } else {
    plannerReason = `Selective query (${matchingRows.toLocaleString('en-US')} row${matchingRows === 1 ? '' : 's'}) touches ~${Math.round(distinctHeapPages).toLocaleString('en-US')} page(s) via ${treeDepth} tree level(s) — B-tree wins easily.`;
  }

  return {
    tableRows,
    selectivityPct,
    matchingRows,
    pages,
    scanChecks,
    btreeChecks,
    speedup,
    treeDepth,
    distinctHeapPages,
    seqIoCost,
    indexIoCost,
    plannerChoice,
    plannerReason,
  };
}
