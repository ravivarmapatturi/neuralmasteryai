export type ControlNodeId = 'START' | 'PLAN' | 'ACT' | 'CHECK' | 'HUMAN' | 'END';

export interface AgentControlFlowConfig {
  goal: string;
  threshold: number;
  decayFactor: number;
  maxAttempts: number;
  requireApproval: boolean;
}

export interface AgentFlowStep {
  stepIndex: number;
  node: ControlNodeId;
  fromNode: ControlNodeId | null;
  attempts: number;
  confidence: number;
  branchReason: string;
  budgetCapped: boolean;
}

export interface AgentControlFlowResult {
  config: AgentControlFlowConfig;
  steps: AgentFlowStep[];
  attemptCurve: { attempt: number; confidence: number }[];
  totalTransitions: number;
  attemptsTaken: number;
  loopCount: number;
  finalConfidence: number;
  clearedThreshold: boolean;
  cappedOut: boolean;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export function confidenceAfterAttempts(attempts: number, decayFactor: number): number {
  const k = Math.max(0, Math.round(attempts));
  const r = clamp(decayFactor, 0.2, 0.9);
  return 1 - Math.pow(r, k);
}

export function simulateAgentControlFlow(input: AgentControlFlowConfig): AgentControlFlowResult {
  const config: AgentControlFlowConfig = {
    goal: input.goal.trim() || 'Inspect ticket and issue safe refund',
    threshold: clamp(Number.isFinite(input.threshold) ? input.threshold : 0.75, 0.4, 0.95),
    decayFactor: clamp(Number.isFinite(input.decayFactor) ? input.decayFactor : 0.55, 0.25, 0.85),
    maxAttempts: Math.max(1, Math.min(6, Math.round(Number.isFinite(input.maxAttempts) ? input.maxAttempts : 4))),
    requireApproval: input.requireApproval,
  };

  const steps: AgentFlowStep[] = [
    {
      stepIndex: 0,
      node: 'START',
      fromNode: null,
      attempts: 0,
      confidence: 0,
      branchReason: `Received task “${config.goal}” with confidence c₀ = 0.000 and attempt cap M = ${config.maxAttempts}.`,
      budgetCapped: false,
    },
  ];

  let current: ControlNodeId = 'START';
  let attempts = 0;
  let loopCount = 0;
  let clearedThreshold = false;
  let cappedOut = false;
  let safety = 0;

  while (current !== 'END' && safety < 32) {
    safety++;
    const from = current;
    let next: ControlNodeId;
    let reason = '';
    let cappedHere = false;

    if (current === 'START') {
      next = 'PLAN';
      reason = `Plan step breaks “${config.goal}” into a tool-call plan before acting.`;
    } else if (current === 'PLAN') {
      next = 'ACT';
      reason = 'Plan ready: entering Act to run tool call #1.';
    } else if (current === 'ACT') {
      attempts++;
      const conf = confidenceAfterAttempts(attempts, config.decayFactor);
      next = 'CHECK';
      reason = `Act #${attempts} finished: confidence rose to c_${attempts} = 1 − ${config.decayFactor.toFixed(2)}^${attempts} = ${conf.toFixed(3)}. Moving to Check.`;
    } else if (current === 'CHECK') {
      const conf = confidenceAfterAttempts(attempts, config.decayFactor);
      if (conf >= config.threshold) {
        clearedThreshold = true;
        if (config.requireApproval) {
          next = 'HUMAN';
          reason = `Check passed (${conf.toFixed(3)} ≥ τ ${config.threshold.toFixed(2)}): taking conditional edge to Human review.`;
        } else {
          next = 'END';
          reason = `Check passed (${conf.toFixed(3)} ≥ τ ${config.threshold.toFixed(2)}) with approval off: finishing at End.`;
        }
      } else if (attempts >= config.maxAttempts) {
        cappedOut = true;
        cappedHere = true;
        next = 'END';
        reason = `Confidence ${conf.toFixed(3)} < τ ${config.threshold.toFixed(2)}, but attempts reached cap M = ${config.maxAttempts} — stopping safely at End instead of looping forever.`;
      } else {
        loopCount++;
        next = 'ACT';
        reason = `Check failed (${conf.toFixed(3)} < τ ${config.threshold.toFixed(2)}): taking back-edge loop #${loopCount} to Act for attempt #${attempts + 1}.`;
      }
    } else {
      next = 'END';
      reason = 'Human reviewer approved the plan and evidence: advancing to End.';
    }

    current = next;
    steps.push({
      stepIndex: steps.length,
      node: current,
      fromNode: from,
      attempts,
      confidence: confidenceAfterAttempts(attempts, config.decayFactor),
      branchReason: reason,
      budgetCapped: cappedHere,
    });
  }

  const attemptCurve = Array.from({ length: config.maxAttempts + 1 }, (_, k) => ({
    attempt: k,
    confidence: confidenceAfterAttempts(k, config.decayFactor),
  }));

  return {
    config,
    steps,
    attemptCurve,
    totalTransitions: steps.length - 1,
    attemptsTaken: attempts,
    loopCount,
    finalConfidence: confidenceAfterAttempts(attempts, config.decayFactor),
    clearedThreshold,
    cappedOut,
  };
}
