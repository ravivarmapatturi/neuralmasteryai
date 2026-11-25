export type BudgetAlertLevel = 'none' | 'sustainable' | 'slow-burn' | 'fast-burn-page';

export interface ErrorBudgetInput {
  sloPercent: number;
  observedErrorPercent: number;
  windowDays: number;
  rps: number;
}

export interface ErrorBudgetAnalysis {
  sloPercent: number;
  observedErrorPercent: number;
  windowDays: number;
  rps: number;
  windowHours: number;
  allowedBadPercent: number;
  allowedBadFraction: number;
  observedBadFraction: number;
  burnRate: number;
  oneHourBudgetPercent: number;
  exhaustionHours: number;
  timeBudgetMinutes: number;
  totalRequestsWindow: number;
  allowedBadRequests: number;
  failedRequestsPerHour: number;
  alertLevel: BudgetAlertLevel;
}

export interface BudgetSimulationPoint {
  hoursElapsed: number;
  budgetConsumedPercent: number;
  budgetRemainingPercent: number;
  sustainableRemainingPercent: number;
  failedRequestsSoFar: number;
  exhausted: boolean;
}

export const SLO_PRESETS = [99.0, 99.9, 99.95, 99.99] as const;

export function analyzeErrorBudget(input: ErrorBudgetInput): ErrorBudgetAnalysis {
  const sloPercent = Math.max(90, Math.min(99.999, Number.isFinite(input.sloPercent) ? input.sloPercent : 99.9));
  const observedErrorPercent = Math.max(0, Math.min(100, Number.isFinite(input.observedErrorPercent) ? input.observedErrorPercent : 0));
  const windowDays = Math.max(1, Math.min(90, Math.round(Number.isFinite(input.windowDays) ? input.windowDays : 30)));
  const rps = Math.max(1, Math.min(1_000_000, Number.isFinite(input.rps) ? input.rps : 1000));

  const windowHours = windowDays * 24;
  // Round decimal subtraction so 100 - 99.9 is exact 0.1 instead of 0.09999999999999432.
  const allowedBadPercent = Math.max(1e-6, Math.round((100 - sloPercent) * 1e9) / 1e9);
  const allowedBadFraction = allowedBadPercent / 100;
  const observedBadFraction = observedErrorPercent / 100;
  const burnRate = observedBadFraction / allowedBadFraction;
  const oneHourBudgetPercent = (burnRate / windowHours) * 100;
  const exhaustionHours = burnRate > 0 ? windowHours / burnRate : Infinity;
  const timeBudgetMinutes = windowHours * 60 * allowedBadFraction;

  const totalRequestsWindow = rps * 3600 * windowHours;
  const allowedBadRequests = totalRequestsWindow * allowedBadFraction;
  const failedRequestsPerHour = rps * 3600 * observedBadFraction;

  let alertLevel: BudgetAlertLevel = 'none';
  if (burnRate > 0) {
    if (oneHourBudgetPercent >= 2) alertLevel = 'fast-burn-page';
    else if (burnRate > 1) alertLevel = 'slow-burn';
    else alertLevel = 'sustainable';
  }

  return {
    sloPercent,
    observedErrorPercent,
    windowDays,
    rps,
    windowHours,
    allowedBadPercent,
    allowedBadFraction,
    observedBadFraction,
    burnRate,
    oneHourBudgetPercent,
    exhaustionHours,
    timeBudgetMinutes,
    totalRequestsWindow,
    allowedBadRequests,
    failedRequestsPerHour,
    alertLevel,
  };
}

export function simulateBudgetAtHour(
  analysis: ErrorBudgetAnalysis,
  hoursElapsed: number,
): BudgetSimulationPoint {
  const consumed = Math.min(100, Math.max(0, hoursElapsed * analysis.oneHourBudgetPercent));
  const remaining = Math.max(0, 100 - consumed);
  const sustainableRemaining = Math.max(0, 100 - (hoursElapsed / analysis.windowHours) * 100);
  const failedRequestsSoFar = Math.round(hoursElapsed * analysis.failedRequestsPerHour);

  return {
    hoursElapsed,
    budgetConsumedPercent: consumed,
    budgetRemainingPercent: remaining,
    sustainableRemainingPercent: sustainableRemaining,
    failedRequestsSoFar,
    exhausted: consumed >= 99.999,
  };
}

export function buildSimulationHours(analysis: ErrorBudgetAnalysis): number[] {
  const span = Number.isFinite(analysis.exhaustionHours)
    ? Math.min(analysis.windowHours, Math.max(4, Math.ceil(analysis.exhaustionHours * 1.1)))
    : Math.min(analysis.windowHours, 48);

  const fractions = [0, 1 / span, 0.25, 0.5, 0.75, 1.0];
  const raw = fractions.map((f, idx) => (idx === 1 ? 1 : Math.round(f * span * 10) / 10));
  const unique = Array.from(new Set(raw.map((h) => Math.max(0, Math.min(analysis.windowHours, h)))));
  return unique.sort((a, b) => a - b);
}

export function explainErrorBudgetStep(
  analysis: ErrorBudgetAnalysis,
  point: BudgetSimulationPoint,
): string {
  if (analysis.burnRate === 0) {
    return `At 0.0% failures over ${point.hoursElapsed}h: zero error budget is spent, so 100.0% of the ${analysis.windowDays}-day allowance stays untouched.`;
  }
  if (point.hoursElapsed === 0) {
    return `Hour 0: the ${analysis.windowDays}-day tank starts 100% full (allowing ${Math.round(analysis.allowedBadRequests).toLocaleString('en-US')} failed requests out of ${(analysis.totalRequestsWindow / 1e6).toFixed(0)}M total at ${analysis.rps.toLocaleString('en-US')} req/s).`;
  }
  if (point.exhausted) {
    return `After ${point.hoursElapsed}h at ${analysis.burnRate.toFixed(1)}× speed, the whole ${analysis.windowDays}-day error budget hits 0% — stop risky launches and fix the outage.`;
  }
  return `After ${point.hoursElapsed}h at ${analysis.burnRate.toFixed(1)}× speed, ${point.budgetConsumedPercent.toFixed(1)}% of the ${analysis.windowDays}-day allowance is used (${point.budgetRemainingPercent.toFixed(1)}% left).`;
}
