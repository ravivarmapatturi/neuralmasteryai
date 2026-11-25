export type RolloutStrategy = 'shadow' | 'canary' | 'ab';
export type ModelHealth = 'healthy' | 'buggy';

export interface RolloutInput {
  strategy: RolloutStrategy;
  totalRequests: number;
  canaryPct: number;
  modelHealth: ModelHealth;
  stickyHashing: boolean;
}

export interface RolloutStepRecord {
  id: 'arrive' | 'route' | 'deliver' | 'measure';
  title: string;
  explain: string;
}

export interface RolloutAnalysis {
  strategy: RolloutStrategy;
  totalRequests: number;
  canaryPct: number;
  modelHealth: ModelHealth;
  stickyHashing: boolean;

  oldCtr: number;
  newCtr: number;
  oldErrorRate: number;
  newErrorRate: number;
  oldLatencyMs: number;
  newLatencyMs: number;

  oldServedCount: number;
  newServedCount: number;
  newMirroredCount: number;
  userFacingPct: number;
  usersHarmedByBug: number;
  loggedErrorsFound: number;
  ctrLiftMeasurable: boolean;
  observedCtrLift: number;
  standardErrorCtr: number;
  zScore: number;
  trace: RolloutStepRecord[];
}

function clamp(v: number, min: number, max: number): number {
  if (!Number.isFinite(v)) return min;
  return Math.max(min, Math.min(max, v));
}

export function analyzeRollout(input: RolloutInput): RolloutAnalysis {
  const totalRequests = Math.round(clamp(input.totalRequests, 100, 20000));
  const canaryPct = Math.round(clamp(input.canaryPct, 1, 50));
  const oldCtr = 0.1;
  const oldErrorRate = 0.005;
  const oldLatencyMs = 42;

  const newCtr = input.modelHealth === 'healthy' ? 0.13 : 0.04;
  const newErrorRate = input.modelHealth === 'healthy' ? 0.004 : 0.085;
  const newLatencyMs = input.modelHealth === 'healthy' ? 46 : 140;

  let oldServedCount: number;
  let newServedCount: number;
  let newMirroredCount: number;
  let userFacingPct: number;

  if (input.strategy === 'shadow') {
    oldServedCount = totalRequests;
    newServedCount = 0;
    newMirroredCount = totalRequests;
    userFacingPct = 0;
  } else if (input.strategy === 'canary') {
    userFacingPct = canaryPct;
    newServedCount = Math.round(totalRequests * (canaryPct / 100));
    oldServedCount = totalRequests - newServedCount;
    newMirroredCount = 0;
  } else {
    userFacingPct = 50;
    newServedCount = Math.round(totalRequests * 0.5);
    oldServedCount = totalRequests - newServedCount;
    newMirroredCount = 0;
  }

  const usersHarmedByBug =
    input.modelHealth === 'buggy' ? Math.round(newServedCount * (newErrorRate - oldErrorRate)) : 0;
  const newObservedTotal = input.strategy === 'shadow' ? newMirroredCount : newServedCount;
  const loggedErrorsFound = Math.round(newObservedTotal * newErrorRate);

  const ctrLiftMeasurable = input.strategy !== 'shadow' && input.stickyHashing;
  const trueLift = newCtr - oldCtr;
  const observedCtrLift =
    input.strategy === 'shadow'
      ? 0
      : input.stickyHashing
        ? trueLift
        : trueLift * 0.45;

  const standardErrorCtr =
    newServedCount > 0 && oldServedCount > 0
      ? Math.sqrt((oldCtr * (1 - oldCtr)) / oldServedCount + (newCtr * (1 - newCtr)) / newServedCount)
      : 0;
  const zScore = standardErrorCtr > 0 ? Math.abs(observedCtrLift) / standardErrorCtr : 0;

  const strategyWord =
    input.strategy === 'shadow'
      ? 'Shadow deployment'
      : input.strategy === 'canary'
        ? `Canary (${canaryPct}%)`
        : 'A/B experiment (50/50)';

  const trace: RolloutStepRecord[] = [
    {
      id: 'arrive',
      title: `${totalRequests.toLocaleString('en-US')} user requests arrive`,
      explain: `Incoming traffic hits the router${input.stickyHashing ? ' with sticky user-ID hashing so each person stays on one model' : ' without sticky hashing, so users can flip models across reloads'}.`,
    },
    {
      id: 'route',
      title: `${strategyWord} routes the calls`,
      explain:
        input.strategy === 'shadow'
          ? `All ${totalRequests.toLocaleString('en-US')} requests go to the old model AND are copied silently to the new model in the background.`
          : `${oldServedCount.toLocaleString('en-US')} requests go to Old (v1) and ${newServedCount.toLocaleString('en-US')} go to New (v2).`,
    },
    {
      id: 'deliver',
      title: 'Who actually answers the user?',
      explain:
        input.strategy === 'shadow'
          ? `0% of users see the new model (0 harmed even if buggy). The ${loggedErrorsFound} new-model errors stay safely in logs.`
          : input.modelHealth === 'buggy'
            ? `${userFacingPct}% of users see New (v2): ${usersHarmedByBug} extra users hit the 8.5% failure bug.`
            : `${userFacingPct}% of users see New (v2), testing real live behavior on ${newServedCount.toLocaleString('en-US')} calls.`,
    },
    {
      id: 'measure',
      title: 'What signal did we learn?',
      explain:
        input.strategy === 'shadow'
          ? `Latency (${newLatencyMs} ms) and ${loggedErrorsFound} errors are measured risk-free, but user CTR lift is invisible because nobody saw New.`
          : !input.stickyHashing
            ? 'Because users flip-flop across models without sticky hashing, measured CTR lift is diluted and noisy.'
            : `Live click lift = ${observedCtrLift >= 0 ? '+' : ''}${(observedCtrLift * 100).toFixed(1)} pp (SE ${(standardErrorCtr * 100).toFixed(2)} pp, z = ${zScore.toFixed(2)}).`,
    },
  ];

  return {
    strategy: input.strategy,
    totalRequests,
    canaryPct,
    modelHealth: input.modelHealth,
    stickyHashing: input.stickyHashing,
    oldCtr,
    newCtr,
    oldErrorRate,
    newErrorRate,
    oldLatencyMs,
    newLatencyMs,
    oldServedCount,
    newServedCount,
    newMirroredCount,
    userFacingPct,
    usersHarmedByBug,
    loggedErrorsFound,
    ctrLiftMeasurable,
    observedCtrLift,
    standardErrorCtr,
    zScore,
    trace,
  };
}
