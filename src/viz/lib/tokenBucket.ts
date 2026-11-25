// Pure token-bucket admission control simulation (RFC 2697 refill arithmetic).
// Models continuous fractional token refill capped at capacity C, discrete burst
// admissions/rejections, wait refill, and follow-up requests, plus sawtooth plot points.

export interface TokenBucketConfig {
  capacity: number;
  refillRate: number;
  burstCount: number;
  waitSeconds: number;
  followUpCount: number;
}

export type BucketStageId = 'initial' | 'burst' | 'wait' | 'next';

export interface BucketStageState {
  id: BucketStageId;
  buttonLabel: string;
  title: string;
  timeSec: number;
  tokensBefore: number;
  refilledTokens: number;
  tokensAfter: number;
  arrivedHere: number;
  acceptedHere: number;
  rejectedHere: number;
  totalAccepted: number;
  totalRejected: number;
  explain: string;
}

export interface SawtoothPoint {
  timeSec: number;
  tokens: number;
  event: 'start' | 'burst' | 'wait' | 'next';
}

export interface TokenBucketSimulation {
  config: TokenBucketConfig;
  stages: BucketStageState[];
  sawtooth: SawtoothPoint[];
  maxBurstInWindow: number;
  steadyStatePct: number;
}

export const BUCKET_PRESETS = [
  { id: 'lesson', label: 'Lesson default (C=5, r=2/s)', capacity: 5, refillRate: 2, burstCount: 7, waitSeconds: 0.5, followUpCount: 1 },
  { id: 'tight-burst', label: 'Tight burst (C=3, r=2/s)', capacity: 3, refillRate: 2, burstCount: 7, waitSeconds: 1.0, followUpCount: 2 },
  { id: 'slow-refill', label: 'Slow refill (C=5, r=1/s)', capacity: 5, refillRate: 1, burstCount: 7, waitSeconds: 0.5, followUpCount: 1 },
] as const;

export function formatTokenCount(n: number): string {
  const rounded = Math.round(n * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2).replace(/0$/, '');
}

export function simulateTokenBucket(input: Partial<TokenBucketConfig> = {}): TokenBucketSimulation {
  const capacity = Math.max(1, Math.min(12, Math.round(input.capacity ?? 5)));
  const refillRate = Math.max(0.5, Math.min(6, Math.round((input.refillRate ?? 2) * 2) / 2));
  const burstCount = Math.max(1, Math.min(12, Math.round(input.burstCount ?? 7)));
  const waitSeconds = Math.max(0, Math.min(3, Math.round((input.waitSeconds ?? 0.5) * 4) / 4));
  const followUpCount = Math.max(1, Math.min(6, Math.round(input.followUpCount ?? 1)));

  // Stage 0: Full bucket at t = 0 before requests arrive
  const s0Tokens = capacity;

  // Stage 1: Burst arrivals at t = 0
  const burstAccepted = Math.min(s0Tokens, burstCount);
  const burstRejected = burstCount - burstAccepted;
  const s1Tokens = s0Tokens - burstAccepted;

  // Stage 2: Wait elapsed seconds with continuous refill capped at capacity
  const rawAdded = waitSeconds * refillRate;
  const s2Tokens = Math.min(capacity, s1Tokens + rawAdded);
  const actualRefilled = s2Tokens - s1Tokens;

  // Stage 3: Follow-up arrivals at t = waitSeconds (need >= 1 whole token per request)
  const nextAccepted = Math.min(Math.floor(s2Tokens + 1e-9), followUpCount);
  const nextRejected = followUpCount - nextAccepted;
  const s3Tokens = Number((s2Tokens - nextAccepted).toFixed(4));

  const totalAfterNextAcc = burstAccepted + nextAccepted;
  const totalAfterNextRej = burstRejected + nextRejected;

  const waitLabel =
    Math.abs(waitSeconds - 0.5) < 1e-6
      ? 'Wait 0.5 seconds'
      : `Wait ${formatTokenCount(waitSeconds)}s`;
  const burstLabel = burstCount === 7 ? 'Seven arrivals' : `${burstCount} arrivals`;
  const nextLabel = followUpCount === 1 ? 'Next request' : `+${followUpCount} requests`;

  const stages: BucketStageState[] = [
    {
      id: 'initial',
      buttonLabel: 'Full bucket',
      title: `Full bucket at t = 0.0 s (${capacity}/${capacity} tokens)`,
      timeSec: 0,
      tokensBefore: capacity,
      refilledTokens: 0,
      tokensAfter: s0Tokens,
      arrivedHere: 0,
      acceptedHere: 0,
      rejectedHere: 0,
      totalAccepted: 0,
      totalRejected: 0,
      explain: `Idle time filled the bucket up to its cap C = ${capacity}. Each whole token is permission for one incoming request.`,
    },
    {
      id: 'burst',
      buttonLabel: burstLabel,
      title: `${burstCount} burst arrivals at t = 0.0 s`,
      timeSec: 0,
      tokensBefore: s0Tokens,
      refilledTokens: 0,
      tokensAfter: s1Tokens,
      arrivedHere: burstCount,
      acceptedHere: burstAccepted,
      rejectedHere: burstRejected,
      totalAccepted: burstAccepted,
      totalRejected: burstRejected,
      explain:
        burstRejected > 0
          ? `${burstCount} requests arrive at once: ${burstAccepted} spend stored tokens and pass immediately; ${burstRejected} overflow and are rejected right away (HTTP 429).`
          : `All ${burstCount} burst requests fit inside capacity C = ${capacity}, leaving ${formatTokenCount(s1Tokens)} token(s) in reserve.`,
    },
    {
      id: 'wait',
      buttonLabel: waitLabel,
      title: `Refill after ${formatTokenCount(waitSeconds)} s (rate ${formatTokenCount(refillRate)}/s)`,
      timeSec: waitSeconds,
      tokensBefore: s1Tokens,
      refilledTokens: actualRefilled,
      tokensAfter: s2Tokens,
      arrivedHere: 0,
      acceptedHere: 0,
      rejectedHere: 0,
      totalAccepted: burstAccepted,
      totalRejected: burstRejected,
      explain: `Over ${formatTokenCount(waitSeconds)} s at ${formatTokenCount(refillRate)} tokens/s, the faucet adds min(${capacity}, ${formatTokenCount(s1Tokens)} + ${formatTokenCount(rawAdded)}) → ${formatTokenCount(s2Tokens)} available token(s). Dropped requests do not queue or replay.`,
    },
    {
      id: 'next',
      buttonLabel: nextLabel,
      title: `${followUpCount} follow-up request${followUpCount === 1 ? '' : 's'} at t = ${formatTokenCount(waitSeconds)} s`,
      timeSec: waitSeconds,
      tokensBefore: s2Tokens,
      refilledTokens: 0,
      tokensAfter: s3Tokens,
      arrivedHere: followUpCount,
      acceptedHere: nextAccepted,
      rejectedHere: nextRejected,
      totalAccepted: totalAfterNextAcc,
      totalRejected: totalAfterNextRej,
      explain:
        nextAccepted > 0 && nextRejected === 0
          ? `${nextAccepted} new arrival spends ${nextAccepted} refilled token(s), leaving ${formatTokenCount(s3Tokens)} token(s). Total: ${totalAfterNextAcc} accepted, ${totalAfterNextRej} rejected.`
          : nextAccepted === 0
            ? `Only ${formatTokenCount(s2Tokens)} token(s) exist (< 1.0 needed), so the follow-up request is rejected immediately.`
            : `${nextAccepted} follow-up passes and ${nextRejected} rejects because only ${Math.floor(s2Tokens + 1e-9)} whole token(s) had refilled.`,
    },
  ];

  const sawtooth: SawtoothPoint[] = [
    { timeSec: 0, tokens: s0Tokens, event: 'start' },
    { timeSec: 0, tokens: s1Tokens, event: 'burst' },
    { timeSec: waitSeconds, tokens: s2Tokens, event: 'wait' },
    { timeSec: waitSeconds, tokens: s3Tokens, event: 'next' },
  ];

  const maxBurstInWindow = capacity + Math.floor(refillRate * waitSeconds + 1e-9);
  const totalArrivals = burstCount + followUpCount;
  const steadyStatePct = totalArrivals > 0 ? (totalAfterNextAcc / totalArrivals) * 100 : 100;

  return {
    config: { capacity, refillRate, burstCount, waitSeconds, followUpCount },
    stages,
    sawtooth,
    maxBurstInWindow,
    steadyStatePct,
  };
}
