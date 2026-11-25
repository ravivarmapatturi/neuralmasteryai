export type PsiZone = 'stable' | 'moderate' | 'significant';

export interface PsiBinRow {
  label: string;
  refShare: number;
  curShare: number;
  delta: number;
  logRatio: number;
  psiTerm: number;
  klCurToRefTerm: number;
  klRefToCurTerm: number;
}

export interface PsiBreakdown {
  rows: PsiBinRow[];
  psi: number;
  klCurToRef: number;
  klRefToCur: number;
  zone: PsiZone;
  zoneLabel: string;
  biggestBinIndex: number;
}

export const PSI_BUCKET_LABELS = ['$0–20', '$20–50', '$50–100', '$100–250', '$250+'] as const;
export const DEFAULT_PSI_REFERENCE = [10, 25, 35, 20, 10] as const;

export interface PsiPreset {
  id: string;
  label: string;
  currentWeights: readonly [number, number, number, number, number];
  explain: string;
}

export const PSI_PLAYBACK_STEPS: readonly PsiPreset[] = [
  {
    id: 'stable',
    label: 'Normal week',
    currentWeights: [11, 24, 34, 21, 10],
    explain: 'Today matches training closely (every bucket within ~1%). PSI stays near zero — no drift alarm.',
  },
  {
    id: 'moderate',
    label: 'Moderate shift',
    currentWeights: [4, 21, 35, 24, 16],
    explain: 'Fewer tiny orders and more $250+ orders push PSI into 0.10–0.25 (moderate watch zone): inspect before retraining.',
  },
  {
    id: 'tail-spike',
    label: 'Tail spike',
    currentWeights: [10, 10, 35, 20, 25],
    explain: 'Shifting 15% from $20–50 into the rare 10% $250+ bucket spikes PSI past 0.25 because ln(25%/10%) multiplies the shift.',
  },
  {
    id: 'unit-bug',
    label: 'Pipeline bug ($→¢)',
    currentWeights: [1, 2, 7, 25, 65],
    explain: 'A broken pipeline sending cents instead of dollars dumps 65% of traffic into $250+, blowing PSI past 1.0!',
  },
];

const SHARE_FLOOR = 1e-4;

function normalizeShares(weights: readonly number[]): number[] {
  const cleaned = weights.map((w) => (Number.isFinite(w) && w > 0 ? w : 0));
  const sum = cleaned.reduce((acc, v) => acc + v, 0);
  if (sum <= 0) return weights.map(() => 1 / Math.max(1, weights.length));
  const raw = cleaned.map((v) => v / sum);
  if (raw.every((v) => v >= SHARE_FLOOR)) return raw;
  const floored = raw.map((v) => Math.max(SHARE_FLOOR, v));
  const fSum = floored.reduce((acc, v) => acc + v, 0);
  return floored.map((v) => v / fSum);
}

/** Shift `shiftPct` percentage points from `fromBin` to `toBin` while keeping shares valid. */
export function buildShiftedCurrentWeights(
  referenceWeights: readonly number[],
  shiftPct: number,
  fromBin = 1,
  toBin = 4,
): number[] {
  const shares = normalizeShares(referenceWeights);
  const clamped = Math.max(0, Math.min((shares[fromBin] ?? 0) * 100 - 0.5, shiftPct));
  return shares.map((s, idx) => {
    const pct = s * 100;
    if (idx === fromBin) return Number((pct - clamped).toFixed(1));
    if (idx === toBin) return Number((pct + clamped).toFixed(1));
    return Number(pct.toFixed(1));
  });
}

/**
 * Compute exact Population Stability Index (PSI) across bins:
 * PSI = sum((c_i - r_i) * ln(c_i / r_i)) = KL(C || R) + KL(R || C).
 */
export function computePsiBreakdown(
  referenceWeights: readonly number[],
  currentWeights: readonly number[],
  labels: readonly string[] = PSI_BUCKET_LABELS,
): PsiBreakdown {
  const r = normalizeShares(referenceWeights);
  const c = normalizeShares(currentWeights);

  const rows: PsiBinRow[] = r.map((refShare, i) => {
    const curShare = c[i] ?? SHARE_FLOOR;
    const delta = curShare - refShare;
    const logRatio = Math.log(curShare / refShare);
    const psiTerm = delta * logRatio;
    return {
      label: labels[i] ?? `Bin ${i + 1}`,
      refShare,
      curShare,
      delta,
      logRatio,
      psiTerm,
      klCurToRefTerm: curShare * logRatio,
      klRefToCurTerm: refShare * Math.log(refShare / curShare),
    };
  });

  const psi = rows.reduce((sum, row) => sum + row.psiTerm, 0);
  const klCurToRef = rows.reduce((sum, row) => sum + row.klCurToRefTerm, 0);
  const klRefToCur = rows.reduce((sum, row) => sum + row.klRefToCurTerm, 0);

  const zone: PsiZone = psi < 0.1 ? 'stable' : psi < 0.25 ? 'moderate' : 'significant';
  const zoneLabel =
    zone === 'stable'
      ? 'Stable (< 0.10)'
      : zone === 'moderate'
        ? 'Moderate shift (0.10–0.25)'
        : 'Significant drift (≥ 0.25)';

  let biggestBinIndex = 0;
  for (let i = 1; i < rows.length; i++) {
    if (rows[i].psiTerm > rows[biggestBinIndex].psiTerm) biggestBinIndex = i;
  }

  return {
    rows,
    psi,
    klCurToRef,
    klRefToCur,
    zone,
    zoneLabel,
    biggestBinIndex,
  };
}
