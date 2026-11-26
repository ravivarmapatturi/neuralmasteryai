export interface RewardEvent {
  step: number;
  reward: number;
}

export interface DiscountedRewardTerm extends RewardEvent {
  discount: number;
  contribution: number;
  cumulative: number;
}

/** Exact finite-horizon discounted return G_0 = sum_k gamma^k r_k. */
export function calculateDiscountedReturn(
  rewards: readonly RewardEvent[],
  gamma: number,
): { terms: DiscountedRewardTerm[]; total: number } {
  const safeGamma = Math.max(0, Math.min(1, gamma));
  let cumulative = 0;
  const terms = [...rewards]
    .sort((a, b) => a.step - b.step)
    .map((event) => {
      const discount = safeGamma ** Math.max(0, event.step);
      const contribution = discount * event.reward;
      cumulative += contribution;
      return { ...event, discount, contribution, cumulative };
    });
  return { terms, total: cumulative };
}

/** Number of steps until gamma^k = 1/2. */
export function discountHalfLife(gamma: number): number {
  if (gamma <= 0) return 0;
  if (gamma >= 1) return Infinity;
  return Math.log(0.5) / Math.log(gamma);
}

export function buildDiscountSteps(lastStep: number): number[] {
  return Array.from({ length: Math.max(1, Math.round(lastStep) + 1) }, (_, step) => step);
}

export function explainDiscountStep(
  step: number,
  lastStep: number,
  gamma: number,
  rewards: readonly RewardEvent[],
): string {
  const event = rewards.find((item) => item.step === step);
  const weight = Math.max(0, Math.min(1, gamma)) ** step;
  if (event) {
    return `Step ${step} of ${lastStep}: reward ${event.reward.toFixed(1)} is worth ${weight.toFixed(3)} × ${event.reward.toFixed(1)} = ${(weight * event.reward).toFixed(3)} at step 0.`;
  }
  return `Step ${step} of ${lastStep}: there is no reward here, but the future-weight multiplier has fallen to γ^${step} = ${weight.toFixed(3)}.`;
}
