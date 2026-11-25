// Pure vector arithmetic, L1/L2 distance scoring, and TransE margin-ranking training steps.
// Follows Bordes et al. (NeurIPS 2013), "Translating Embeddings for Modeling Multi-relational Data" (Fig. 1).

export type TransEMetric = 'l2' | 'l1';
export type TransEScenarioId = 'curie-born' | 'paris-capital' | 'one-to-many';

export type Vec2Tuple = readonly [number, number];

export interface TransECandidate {
  id: string;
  name: string;
  vec: Vec2Tuple;
  isTrue: boolean;
}

export interface TransEScenario {
  id: TransEScenarioId;
  label: string;
  subjectLabel: string;
  subjectVec: Vec2Tuple;
  relationLabel: string;
  relationVec: Vec2Tuple;
  initialCandidates: readonly TransECandidate[];
}

export const TRANSE_SCENARIOS: readonly TransEScenario[] = [
  {
    id: 'curie-born',
    label: 'Curie · born_in → ?',
    subjectLabel: 'Curie',
    subjectVec: [0.4, 0.5],
    relationLabel: 'born_in',
    relationVec: [1.3, 0.35],
    initialCandidates: [
      { id: 'warsaw', name: 'Warsaw (true)', vec: [2.05, 1.35], isTrue: true },
      { id: 'paris', name: 'Paris', vec: [1.45, 0.70], isTrue: false },
      { id: 'stockholm', name: 'Stockholm', vec: [2.25, 1.40], isTrue: false },
    ],
  },
  {
    id: 'paris-capital',
    label: 'Paris · capital_of → ?',
    subjectLabel: 'Paris',
    subjectVec: [0.35, 1.15],
    relationLabel: 'capital_of',
    relationVec: [1.2, -0.45],
    initialCandidates: [
      { id: 'france', name: 'France (true)', vec: [1.95, 0.30], isTrue: true },
      { id: 'germany', name: 'Germany', vec: [1.35, 0.90], isTrue: false },
      { id: 'spain', name: 'Spain', vec: [2.20, 1.25], isTrue: false },
    ],
  },
  {
    id: 'one-to-many',
    label: '1-to-many · won_prize → ?',
    subjectLabel: 'Curie',
    subjectVec: [0.4, 0.5],
    relationLabel: 'won_prize',
    relationVec: [1.2, 0.6],
    initialCandidates: [
      { id: 'physics', name: 'Physics (true)', vec: [1.15, 1.55], isTrue: true },
      { id: 'chemistry', name: 'Chemistry (true)', vec: [2.05, 0.70], isTrue: true },
      { id: 'literature', name: 'Literature', vec: [1.55, 1.00], isTrue: false },
    ],
  },
];

export function addVec2(a: Vec2Tuple, b: Vec2Tuple): [number, number] {
  return [a[0] + b[0], a[1] + b[1]];
}

export function distanceVec2(a: Vec2Tuple, b: Vec2Tuple, metric: TransEMetric): number {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  return metric === 'l1' ? Math.abs(dx) + Math.abs(dy) : Math.hypot(dx, dy);
}

export function marginRankingLoss(dPos: number, dNeg: number, gamma: number): number {
  return Math.max(0, gamma + dPos - dNeg);
}

export interface ScoredTransECandidate extends TransECandidate {
  distance: number;
  rank: number;
}

export interface TransETrainingFrame {
  step: number;
  candidates: TransECandidate[];
  explain: string;
}

function stepVecToward(from: Vec2Tuple, target: Vec2Tuple, rate: number): [number, number] {
  return [
    Number((from[0] + rate * (target[0] - from[0])).toFixed(3)),
    Number((from[1] + rate * (target[1] - from[1])).toFixed(3)),
  ];
}

function stepVecAway(from: Vec2Tuple, target: Vec2Tuple, rate: number): [number, number] {
  let dx = from[0] - target[0];
  let dy = from[1] - target[1];
  const mag = Math.hypot(dx, dy);
  if (mag < 1e-6) {
    dx = -0.6;
    dy = -0.3;
  } else {
    dx /= mag;
    dy /= mag;
  }
  return [
    Number(Math.max(0.05, Math.min(2.7, from[0] + rate * dx)).toFixed(3)),
    Number(Math.max(0.05, Math.min(2.1, from[1] + rate * dy)).toFixed(3)),
  ];
}

/** Generate a real step-by-step margin-ranking training trace for any scenario and relation vector. */
export function buildTransETrainingTrace(
  scenario: TransEScenario,
  subjectVec: Vec2Tuple,
  relationVec: Vec2Tuple,
  metric: TransEMetric,
  gamma: number,
  steps = 6,
): TransETrainingFrame[] {
  const predicted = addVec2(subjectVec, relationVec);
  let current: TransECandidate[] = scenario.initialCandidates.map((c) => ({ ...c, vec: [...c.vec] as Vec2Tuple }));

  const frames: TransETrainingFrame[] = [];
  for (let s = 0; s < steps; s++) {
    const trueCands = current.filter((c) => c.isTrue);
    const wrongCands = current.filter((c) => !c.isTrue);
    const worstTrue = trueCands.reduce((a, b) =>
      distanceVec2(predicted, a.vec, metric) >= distanceVec2(predicted, b.vec, metric) ? a : b,
    );
    const closestWrong = wrongCands.reduce((a, b) =>
      distanceVec2(predicted, a.vec, metric) <= distanceVec2(predicted, b.vec, metric) ? a : b,
    );
    const dTrue = distanceVec2(predicted, worstTrue.vec, metric);
    const dWrong = distanceVec2(predicted, closestWrong.vec, metric);
    const loss = marginRankingLoss(dTrue, dWrong, gamma);

    let explain = '';
    if (s === 0) {
      explain = `Before training (step 0): ${closestWrong.name} sits closer (${dWrong.toFixed(2)}) than ${worstTrue.name} (${dTrue.toFixed(2)}), so margin loss L = ${loss.toFixed(2)} > 0.`;
    } else if (loss > 0.001) {
      explain = `Update step ${s}: gradient descent pulls true object${trueCands.length > 1 ? 's' : ''} toward ${scenario.subjectLabel} + ${scenario.relationLabel} and pushes ${closestWrong.name} outside margin γ = ${gamma.toFixed(2)} (L = ${loss.toFixed(2)}).`;
    } else if (scenario.id === 'one-to-many') {
      explain = `Step ${s}: both true prizes (${trueCands.map((t) => t.name.replace(' (true)', '')).join(' & ')}) collapse onto the same point h + r, illustrating TransE's 1-to-many weakness.`;
    } else {
      explain = `Converged at step ${s}: true object ${worstTrue.name} sits closest (${dTrue.toFixed(2)}), and wrong guesses lie past margin γ = ${gamma.toFixed(2)} (L = 0.00).`;
    }

    frames.push({
      step: s,
      candidates: current.map((c) => ({ ...c, vec: [...c.vec] as Vec2Tuple })),
      explain,
    });

    // Apply gradient step on true and violating negative candidates for next frame
    current = current.map((c) => {
      if (c.isTrue) {
        return { ...c, vec: stepVecToward(c.vec, predicted, 0.42) };
      }
      const dNeg = distanceVec2(predicted, c.vec, metric);
      if (gamma + dTrue - dNeg > 0) {
        return { ...c, vec: stepVecAway(c.vec, predicted, 0.28) };
      }
      return c;
    });
  }

  return frames;
}

export function scoreTransECandidates(
  predicted: Vec2Tuple,
  candidates: readonly TransECandidate[],
  metric: TransEMetric,
): ScoredTransECandidate[] {
  return candidates
    .map((c) => ({
      ...c,
      distance: distanceVec2(predicted, c.vec, metric),
      rank: 0,
    }))
    .sort((a, b) => a.distance - b.distance)
    .map((c, idx) => ({ ...c, rank: idx + 1 }));
}
