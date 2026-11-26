export type AgentArchitecture = 'react' | 'plan-execute' | 'reflection';
export type AgentStepKind = 'thought' | 'action' | 'observation' | 'answer';

export interface AgentExecutionConfig {
  architecture: AgentArchitecture;
  goal: string;
  toolCalls: number;
  failAtCall: number;
  retryBudget: number;
  modelStepMs: number;
  toolStepMs: number;
}

export interface AgentExecutionStep {
  id: string;
  kind: AgentStepKind;
  phase: string;
  detail: string;
  durationMs: number;
  elapsedMs: number;
  failed?: boolean;
}

export interface AgentExecutionResult {
  steps: AgentExecutionStep[];
  totalMs: number;
  toolAttempts: number;
  retriesUsed: number;
  completed: boolean;
}

function wholeBetween(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, Math.round(Number.isFinite(value) ? value : minimum)));
}

/**
 * Builds a transparent execution trace for three common agent control loops.
 * It does not call a model: every step and elapsed-time total follows directly
 * from the learner's architecture, tool, failure, retry, and duration inputs.
 */
export function buildAgentExecution(input: AgentExecutionConfig): AgentExecutionResult {
  const toolCalls = wholeBetween(input.toolCalls, 1, 5);
  const failAtCall = wholeBetween(input.failAtCall, 0, toolCalls);
  const retryBudget = wholeBetween(input.retryBudget, 0, 3);
  const modelStepMs = Math.max(0, input.modelStepMs);
  const toolStepMs = Math.max(0, input.toolStepMs);
  const goal = input.goal.trim() || 'Finish the task';
  const steps: AgentExecutionStep[] = [];
  let elapsedMs = 0;
  let toolAttempts = 0;
  let retriesUsed = 0;
  let completed = true;

  const add = (kind: AgentStepKind, phase: string, detail: string, durationMs: number, failed = false) => {
    elapsedMs += durationMs;
    steps.push({ id: `${steps.length}-${kind}`, kind, phase, detail, durationMs, elapsedMs, failed });
  };

  if (input.architecture === 'plan-execute') {
    add('thought', 'Make a plan', `Split “${goal}” into ${toolCalls} tool-backed task${toolCalls === 1 ? '' : 's'}.`, modelStepMs);
  } else if (input.architecture === 'reflection') {
    add('thought', 'Draft', `Write a first approach for “${goal}” before checking it.`, modelStepMs);
  } else {
    add('thought', 'Think', `Choose the first useful action for “${goal}”.`, modelStepMs);
  }

  for (let call = 1; call <= toolCalls; call += 1) {
    add('action', input.architecture === 'plan-execute' ? `Run task ${call}` : `Call tool ${call}`, `Send the arguments for tool call ${call}.`, 0);
    toolAttempts += 1;
    const failed = call === failAtCall;
    add('observation', failed ? 'Read tool error' : 'Read tool result', failed ? `Tool call ${call} returned an error.` : `Tool call ${call} returned usable evidence.`, toolStepMs, failed);

    if (failed) {
      if (retriesUsed < retryBudget) {
        retriesUsed += 1;
        add('thought', 'Repair', `Inspect the error and change the arguments for retry ${retriesUsed}.`, modelStepMs);
        add('action', 'Retry tool', `Run tool call ${call} again with corrected arguments.`, 0);
        toolAttempts += 1;
        add('observation', 'Read retry result', `Retry ${retriesUsed} returned usable evidence.`, toolStepMs);
      } else {
        completed = false;
        add('answer', 'Stop safely', 'Report that the tool failed and that no retry budget remains.', modelStepMs, true);
        break;
      }
    }

    if (input.architecture === 'plan-execute') {
      add('thought', 'Check task', `Mark planned task ${call} complete and select the next one.`, modelStepMs);
    }
  }

  if (completed) {
    if (input.architecture === 'reflection') {
      add('thought', 'Critique', 'Compare the draft with the tool evidence and name one weakness.', modelStepMs);
      add('thought', 'Revise', 'Repair the named weakness before returning the answer.', modelStepMs);
    } else if (input.architecture === 'react') {
      add('thought', 'Decide', 'The observations now contain enough evidence to stop the loop.', modelStepMs);
    }
    add('answer', 'Final answer', `Return the result for “${goal}”.`, modelStepMs);
  }

  return { steps, totalMs: elapsedMs, toolAttempts, retriesUsed, completed };
}
