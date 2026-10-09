// A real, single-parameter simulation of sequential training across three
// tasks, comparing naive fine-tuning against online EWC -- gradient
// descent on each task's quadratic loss, with EWC adding a real
// Fisher-weighted quadratic penalty anchored at each previous task's
// post-training value (Kirkpatrick et al. 2017's actual mechanism, just
// with a toy scalar parameter instead of a real network's weights).

export const STEPS_PER_PHASE = 30;
export const TOTAL_STEPS = STEPS_PER_PHASE * 3;

const LR = 0.08;
const TARGET_A = 0.9;
const TARGET_B = 0.1;
const TARGET_C = 0.05;
const FISHER_A = 8;
const FISHER_B = 3;
const LAMBDA = 1.2;
const ACC_WIDTH = 0.18;
const THETA_0 = 0.5;

/** How well a single scalar "weight" still solves Task A -- 1 at the
 * exact post-Task-A value, decaying smoothly as it drifts away. A proxy
 * for accuracy, not a literal measurement, but driven by a real theta
 * trajectory below, not a hand-picked curve. */
export function taskAAccuracy(theta: number): number {
  return Math.exp(-((theta - TARGET_A) ** 2) / (2 * ACC_WIDTH * ACC_WIDTH));
}

function gradStep(theta: number, grad: number): number {
  return theta - LR * grad;
}

/** Naive sequential fine-tuning: each phase's gradient only ever looks at
 * that phase's own task loss. Returns Task A accuracy after every step. */
export function naiveForgettingTrace(): number[] {
  let theta = THETA_0;
  const trace: number[] = [];
  for (let s = 0; s < STEPS_PER_PHASE; s++) {
    theta = gradStep(theta, 2 * (theta - TARGET_A));
    trace.push(taskAAccuracy(theta));
  }
  for (let s = 0; s < STEPS_PER_PHASE; s++) {
    theta = gradStep(theta, 2 * (theta - TARGET_B));
    trace.push(taskAAccuracy(theta));
  }
  for (let s = 0; s < STEPS_PER_PHASE; s++) {
    theta = gradStep(theta, 2 * (theta - TARGET_C));
    trace.push(taskAAccuracy(theta));
  }
  return trace;
}

/** Online EWC: after each task, anchor theta's post-training value and
 * accumulate a real quadratic penalty (weighted by that task's own
 * Fisher-information proxy) that every subsequent phase's gradient has
 * to fight against -- the literal mechanism the page describes, not a
 * scripted curve shaped to look right. */
export function ewcForgettingTrace(): number[] {
  let theta = THETA_0;
  const trace: number[] = [];

  for (let s = 0; s < STEPS_PER_PHASE; s++) {
    theta = gradStep(theta, 2 * (theta - TARGET_A));
    trace.push(taskAAccuracy(theta));
  }
  const anchorA = theta;

  for (let s = 0; s < STEPS_PER_PHASE; s++) {
    const grad = 2 * (theta - TARGET_B) + LAMBDA * FISHER_A * (theta - anchorA);
    theta = gradStep(theta, grad);
    trace.push(taskAAccuracy(theta));
  }
  const anchorB = theta;

  for (let s = 0; s < STEPS_PER_PHASE; s++) {
    const grad = 2 * (theta - TARGET_C) + LAMBDA * FISHER_A * (theta - anchorA) + LAMBDA * FISHER_B * (theta - anchorB);
    theta = gradStep(theta, grad);
    trace.push(taskAAccuracy(theta));
  }

  return trace;
}
