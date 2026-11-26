export interface RewardStrategy {
  name: string;
  interval: number;
  reward: number;
}

export interface RewardTracePoint {
  step: number;
  intendedTotal: number;
  proxyTotal: number;
}

export function strategyTotal(step: number, strategy: RewardStrategy): number {
  const safeStep = Math.max(0, Math.floor(step));
  const interval = Math.max(1, Math.round(strategy.interval));
  return Math.floor(safeStep / interval) * strategy.reward;
}

export function buildRewardTrace(
  horizon: number,
  intended: RewardStrategy,
  proxy: RewardStrategy,
): RewardTracePoint[] {
  return Array.from({ length: Math.max(1, Math.round(horizon)) + 1 }, (_, step) => ({
    step,
    intendedTotal: strategyTotal(step, intended),
    proxyTotal: strategyTotal(step, proxy),
  }));
}

export function buildRewardCheckpoints(horizon: number, frameCount = 21): number[] {
  const last = Math.max(1, Math.round(horizon));
  const count = Math.max(2, Math.min(last + 1, Math.round(frameCount)));
  return Array.from(new Set(Array.from({ length: count }, (_, index) => Math.round((index / (count - 1)) * last))));
}

export function firstProxyLead(trace: readonly RewardTracePoint[]): number | null {
  return trace.find((point) => point.proxyTotal > point.intendedTotal)?.step ?? null;
}

export function explainRewardStep(
  point: RewardTracePoint,
  horizon: number,
  intended: RewardStrategy,
  proxy: RewardStrategy,
): string {
  const winner = point.proxyTotal > point.intendedTotal
    ? `${proxy.name} is ahead on the measured score`
    : point.proxyTotal < point.intendedTotal
      ? `${intended.name} is ahead on the measured score`
      : 'the measured scores are tied';
  return `Step ${point.step} of ${horizon}: ${intended.name} has ${point.intendedTotal.toFixed(1)} points and ${proxy.name} has ${point.proxyTotal.toFixed(1)}; ${winner}.`;
}
