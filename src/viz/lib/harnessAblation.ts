export type HarnessVariantId = 'prompt' | 'verify' | 'retry' | 'full';
export type HarnessPart = 'verifier' | 'retries' | 'state' | 'sandbox';

export interface HarnessInputs {
  requiredSteps: number;
  baseStepAccuracy: number;
  verifierCoverage: number;
  maxAttempts: number;
  regressionRisk: number;
  trackingBoost: number;
}

export interface HarnessVariant {
  id: HarnessVariantId;
  label: string;
  plainMeaning: string;
  stepSuccess: number;
  shipReady: number;
  falseVictory: number;
  expectedAttempts: number;
}

export interface HarnessAblation {
  part: HarnessPart;
  label: string;
  shipReadyDrop: number;
}

function clampProbability(value: number): number {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}

function positiveInteger(value: number, fallback: number): number {
  return Math.max(1, Math.round(Number.isFinite(value) ? value : fallback));
}

/**
 * A wrong answer triggers another attempt only when the verifier catches it.
 * r = (1 - p) c is therefore the chance that the next attempt is reached.
 */
export function calculateHarnessOutcome({
  requiredSteps,
  stepAccuracy,
  coverage,
  attempts,
  regressionRisk,
}: {
  requiredSteps: number;
  stepAccuracy: number;
  coverage: number;
  attempts: number;
  regressionRisk: number;
}): Omit<HarnessVariant, 'id' | 'label' | 'plainMeaning'> {
  const n = positiveInteger(requiredSteps, 1);
  const a = positiveInteger(attempts, 1);
  const p = clampProbability(stepAccuracy);
  const c = clampProbability(coverage);
  const g = clampProbability(regressionRisk);
  const retryChance = (1 - p) * c;
  const geometric = retryChance === 1
    ? a
    : (1 - retryChance ** a) / (1 - retryChance);
  const stepSuccess = p * geometric;
  const undetectedWrongPerStep = (1 - p) * (1 - c) * geometric;

  return {
    stepSuccess,
    shipReady: stepSuccess ** n * (1 - g),
    falseVictory: 1 - (1 - undetectedWrongPerStep) ** n,
    expectedAttempts: n * geometric,
  };
}

function makeVariant(
  id: HarnessVariantId,
  label: string,
  plainMeaning: string,
  inputs: HarnessInputs,
  options: { verifier: boolean; retries: boolean; state: boolean; sandbox: boolean },
): HarnessVariant {
  const trackedAccuracy = options.state
    ? inputs.baseStepAccuracy + (1 - inputs.baseStepAccuracy) * inputs.trackingBoost
    : inputs.baseStepAccuracy;
  const outcome = calculateHarnessOutcome({
    requiredSteps: inputs.requiredSteps,
    stepAccuracy: trackedAccuracy,
    coverage: options.verifier ? inputs.verifierCoverage : 0,
    attempts: options.retries ? inputs.maxAttempts : 1,
    regressionRisk: options.sandbox ? inputs.regressionRisk * 0.2 : inputs.regressionRisk,
  });
  return { id, label, plainMeaning, ...outcome };
}

export function compareHarnesses(inputs: HarnessInputs): HarnessVariant[] {
  return [
    makeVariant('prompt', 'Prompt only', 'One attempt, with no check or repair loop.', inputs, {
      verifier: false,
      retries: false,
      state: false,
      sandbox: false,
    }),
    makeVariant('verify', 'Add a verifier', 'A check can catch an error, but there is still only one attempt.', inputs, {
      verifier: true,
      retries: false,
      state: false,
      sandbox: false,
    }),
    makeVariant('retry', 'Verifier + repair', 'Caught errors can trigger another independent attempt.', inputs, {
      verifier: true,
      retries: true,
      state: false,
      sandbox: false,
    }),
    makeVariant('full', 'Full harness', 'State tracking improves each step; a sandbox reduces regression risk.', inputs, {
      verifier: true,
      retries: true,
      state: true,
      sandbox: true,
    }),
  ];
}

function fullWithPartRemoved(inputs: HarnessInputs, part: HarnessPart): HarnessVariant {
  return makeVariant('full', 'Full harness', 'One part removed for comparison.', inputs, {
    verifier: part !== 'verifier',
    retries: part !== 'retries',
    state: part !== 'state',
    sandbox: part !== 'sandbox',
  });
}

export function calculateAblations(inputs: HarnessInputs): HarnessAblation[] {
  const full = compareHarnesses(inputs).at(-1)!;
  const labels: Record<HarnessPart, string> = {
    verifier: 'Verifier',
    retries: 'Repair attempts',
    state: 'State tracking',
    sandbox: 'Sandbox',
  };
  return (Object.keys(labels) as HarnessPart[])
    .map((part) => ({
      part,
      label: labels[part],
      shipReadyDrop: Math.max(0, full.shipReady - fullWithPartRemoved(inputs, part).shipReady),
    }))
    .sort((a, b) => b.shipReadyDrop - a.shipReadyDrop);
}
