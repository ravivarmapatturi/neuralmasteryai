import { classificationRatesAtThreshold, memberConfidenceSamples } from './aisecurity';

export interface MembershipAuditResult {
  member: number[];
  nonMember: number[];
  bins: number;
  memberHist: number[];
  nonMemberHist: number[];
  maxBinCount: number;
  tpCount: number;
  fpCount: number;
  fnCount: number;
  tnCount: number;
  tpr: number;
  fpr: number;
  advantage: number;
  balancedAccuracy: number;
  testConfidence: number;
  testFlaggedAsMember: boolean;
  localMemberShare: number;
}

export interface MembershipPlaybackStep {
  title: string;
  gap: number;
  noise: number;
  threshold: number;
  testConfidence: number;
  explain: string;
}

export const MEMBERSHIP_PLAYBACK_STEPS: readonly MembershipPlaybackStep[] = [
  {
    title: 'Memorized model (noise σ = 0.00)',
    gap: 0.35,
    noise: 0.0,
    threshold: 0.55,
    testConfidence: 0.72,
    explain: 'With zero privacy noise, the model is noticeably more confident on records it trained on (red) than unseen records (blue). Threshold 55% catches most members.',
  },
  {
    title: 'Attacker raises cutoff (τ = 0.72)',
    gap: 0.35,
    noise: 0.0,
    threshold: 0.72,
    testConfidence: 0.72,
    explain: 'Raising the cutoff τ slashes false alarms on non-members close to 0%, letting the attacker pinpoint memorized training records with high precision.',
  },
  {
    title: 'Differential privacy noise added (σ = 0.18)',
    gap: 0.35,
    noise: 0.18,
    threshold: 0.55,
    testConfidence: 0.72,
    explain: 'Adding calibrated noise during training widens both curves so non-members start crossing the cutoff too, shrinking the attacker advantage.',
  },
  {
    title: 'Strong privacy budget (σ = 0.35)',
    gap: 0.35,
    noise: 0.35,
    threshold: 0.55,
    testConfidence: 0.72,
    explain: 'At σ = 0.35 the two curves heavily overlap: TPR minus FPR collapses toward zero, leaving the attacker little better than flipping a coin.',
  },
];

/**
 * Compute exact histogram counts, TPR, FPR, membership advantage (TPR - FPR),
 * balanced attack accuracy, and local posterior odds for a single probed confidence score.
 */
export function computeMembershipAudit({
  sampleCount = 200,
  seed = 5,
  gap = 0.35,
  noise = 0,
  threshold = 0.55,
  testConfidence = 0.72,
  bins = 20,
}: {
  sampleCount?: number;
  seed?: number;
  gap?: number;
  noise?: number;
  threshold?: number;
  testConfidence?: number;
  bins?: number;
}): MembershipAuditResult {
  const safeGap = Math.max(0.02, Math.min(0.7, Number.isFinite(gap) ? gap : 0.35));
  const safeNoise = Math.max(0, Math.min(0.45, Number.isFinite(noise) ? noise : 0));
  const safeThreshold = Math.max(0.05, Math.min(0.95, Number.isFinite(threshold) ? threshold : 0.55));
  const safeTest = Math.max(0, Math.min(1, Number.isFinite(testConfidence) ? testConfidence : 0.72));

  const { member, nonMember } = memberConfidenceSamples(sampleCount, seed, safeGap, safeNoise);
  const { tpr, fpr } = classificationRatesAtThreshold(member, nonMember, safeThreshold);

  const tpCount = member.filter((v) => v >= safeThreshold).length;
  const fpCount = nonMember.filter((v) => v >= safeThreshold).length;
  const fnCount = member.length - tpCount;
  const tnCount = nonMember.length - fpCount;

  const memberHist = Array<number>(bins).fill(0);
  const nonMemberHist = Array<number>(bins).fill(0);
  for (const v of member) {
    memberHist[Math.min(bins - 1, Math.max(0, Math.floor(v * bins)))]++;
  }
  for (const v of nonMember) {
    nonMemberHist[Math.min(bins - 1, Math.max(0, Math.floor(v * bins)))]++;
  }
  const maxBinCount = Math.max(1, ...memberHist, ...nonMemberHist);

  // Empirical local posterior P(member | confidence within ±0.06 of probe)
  const nearMember = member.filter((v) => Math.abs(v - safeTest) <= 0.06).length;
  const nearNon = nonMember.filter((v) => Math.abs(v - safeTest) <= 0.06).length;
  const nearTotal = nearMember + nearNon;
  const localMemberShare = nearTotal > 0 ? nearMember / nearTotal : safeTest >= safeThreshold ? 0.5 : 0.5;

  return {
    member,
    nonMember,
    bins,
    memberHist,
    nonMemberHist,
    maxBinCount,
    tpCount,
    fpCount,
    fnCount,
    tnCount,
    tpr,
    fpr,
    advantage: tpr - fpr,
    balancedAccuracy: 0.5 * (tpr + (1 - fpr)),
    testConfidence: safeTest,
    testFlaggedAsMember: safeTest >= safeThreshold,
    localMemberShare,
  };
}

/** Pure exact helper for hand-checked rates on arbitrary confidence arrays. */
export function auditKnownConfidenceArrays(
  member: readonly number[],
  nonMember: readonly number[],
  threshold: number,
) {
  const tpCount = member.filter((v) => v >= threshold).length;
  const fpCount = nonMember.filter((v) => v >= threshold).length;
  const tpr = member.length > 0 ? tpCount / member.length : 0;
  const fpr = nonMember.length > 0 ? fpCount / nonMember.length : 0;
  const advantage = tpr - fpr;
  const balancedAccuracy = 0.5 * (tpr + (1 - fpr));
  return { tpCount, fpCount, tpr, fpr, advantage, balancedAccuracy };
}
