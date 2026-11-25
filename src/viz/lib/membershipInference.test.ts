import { describe, expect, it } from 'vitest';
import { auditKnownConfidenceArrays, computeMembershipAudit } from './membershipInference';

describe('membershipInference computation', () => {
  it('matches hand-checked TPR, FPR, advantage, and balanced accuracy on known arrays', () => {
    const members = [0.4, 0.6, 0.7, 0.8, 0.9]; // 4 >= 0.6 => TPR = 0.8
    const nonMembers = [0.2, 0.3, 0.4, 0.5, 0.7]; // 1 >= 0.6 => FPR = 0.2
    const stats = auditKnownConfidenceArrays(members, nonMembers, 0.6);

    expect(stats.tpCount).toBe(4);
    expect(stats.fpCount).toBe(1);
    expect(stats.tpr).toBeCloseTo(0.8, 12);
    expect(stats.fpr).toBeCloseTo(0.2, 12);
    expect(stats.advantage).toBeCloseTo(0.6, 12);
    expect(stats.balancedAccuracy).toBeCloseTo(0.8, 12);
  });

  it('shows DP noise collapsing attacker advantage toward coin-flip guessing', () => {
    const leaky = computeMembershipAudit({ gap: 0.35, noise: 0, threshold: 0.55 });
    const protectedRun = computeMembershipAudit({ gap: 0.35, noise: 0.35, threshold: 0.55 });

    expect(leaky.tpCount + leaky.fnCount).toBe(200);
    expect(leaky.fpCount + leaky.tnCount).toBe(200);
    expect(leaky.advantage).toBeGreaterThan(0.5);
    expect(protectedRun.advantage).toBeLessThan(leaky.advantage - 0.25);
    expect(protectedRun.balancedAccuracy).toBeLessThan(leaky.balancedAccuracy);
  });

  it('keeps histogram bin sums equal to sample counts', () => {
    const audit = computeMembershipAudit({ sampleCount: 200, gap: 0.35, noise: 0.1, bins: 20 });
    expect(audit.memberHist.reduce((a, b) => a + b, 0)).toBe(200);
    expect(audit.nonMemberHist.reduce((a, b) => a + b, 0)).toBe(200);
  });
});
