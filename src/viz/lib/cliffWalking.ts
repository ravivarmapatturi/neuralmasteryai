// Pure math and simulation for the Cliff Walking Q-learning vs. SARSA playground.
// Follows Sutton & Barto, Reinforcement Learning: An Introduction (2nd ed., Example 6.6, Fig. 6.4):
// 4 x 12 grid, Start at (3, 0), Goal at (3, 11), Cliff across (3, 1)..(3, 10) with -100 reward.

export const CLIFF_GRID_ROWS = 4;
export const CLIFF_GRID_COLS = 12;
export const CLIFF_START_POS: readonly [number, number] = [3, 0];
export const CLIFF_GOAL_POS: readonly [number, number] = [3, 11];

export type CliffAlgo = 'qlearning' | 'sarsa';
export type CliffAction = 0 | 1 | 2 | 3; // 0: Up, 1: Right, 2: Down, 3: Left

export const ACTION_NAMES: readonly string[] = ['Up', 'Right', 'Down', 'Left'];
export const ACTION_ARROWS: readonly string[] = ['↑', '→', '↓', '←'];
const MOVES: readonly [number, number][] = [
  [-1, 0],
  [0, 1],
  [1, 0],
  [0, -1],
];

function mulberry32(seed: number) {
  let state = seed | 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function isCliffCell(r: number, c: number): boolean {
  return r === 3 && c >= 1 && c <= 10;
}

export function stateIndex(r: number, c: number): number {
  return r * CLIFF_GRID_COLS + c;
}

export function stepCliffEnv(
  r: number,
  c: number,
  action: CliffAction,
): { r: number; c: number; reward: number; done: boolean; fell: boolean } {
  const [dr, dc] = MOVES[action];
  const nr = Math.max(0, Math.min(CLIFF_GRID_ROWS - 1, r + dr));
  const nc = Math.max(0, Math.min(CLIFF_GRID_COLS - 1, c + dc));
  if (isCliffCell(nr, nc)) {
    return { r: CLIFF_START_POS[0], c: CLIFF_START_POS[1], reward: -100, done: false, fell: true };
  }
  if (nr === CLIFF_GOAL_POS[0] && nc === CLIFF_GOAL_POS[1]) {
    return { r: nr, c: nc, reward: -1, done: true, fell: false };
  }
  return { r: nr, c: nc, reward: -1, done: false, fell: false };
}

export interface TdUpdateBreakdown {
  algo: CliffAlgo;
  qBefore: number;
  reward: number;
  gamma: number;
  nextValueUsed: number;
  nextActionLabel: string;
  tdTarget: number;
  tdError: number;
  alpha: number;
  qAfter: number;
}

/** Exact single-step tabular TD update used by both Q-learning and SARSA. */
export function computeTdStep(
  algo: CliffAlgo,
  qBefore: number,
  reward: number,
  gamma: number,
  nextRow: readonly number[],
  actualNextAction: CliffAction,
  alpha: number,
): TdUpdateBreakdown {
  let bestIdx = 0;
  for (let a = 1; a < nextRow.length; a++) {
    if (nextRow[a] > nextRow[bestIdx]) bestIdx = a;
  }
  const usedIdx = algo === 'qlearning' ? bestIdx : actualNextAction;
  const nextValueUsed = nextRow[usedIdx] ?? 0;
  const tdTarget = reward + gamma * nextValueUsed;
  const tdError = tdTarget - qBefore;
  const qAfter = qBefore + alpha * tdError;
  return {
    algo,
    qBefore,
    reward,
    gamma,
    nextValueUsed,
    nextActionLabel: ACTION_NAMES[usedIdx] ?? 'Up',
    tdTarget,
    tdError,
    alpha,
    qAfter,
  };
}

function chooseEpsilonGreedy(
  Q: number[][],
  s: number,
  epsilon: number,
  rand: () => number,
): CliffAction {
  if (rand() < epsilon) {
    return Math.floor(rand() * 4) as CliffAction;
  }
  let best: CliffAction = 0;
  for (let a = 1; a < 4; a++) {
    if (Q[s][a] > Q[s][best]) best = a as CliffAction;
  }
  return best;
}

export function rolloutGreedyCliffPolicy(
  Q: number[][],
  maxSteps = 45,
): { path: [number, number][]; reachedGoal: boolean; totalReward: number } {
  let [r, c] = CLIFF_START_POS;
  const path: [number, number][] = [[r, c]];
  let totalReward = 0;
  const visited = new Set<string>([`${r},${c}`]);
  for (let step = 0; step < maxSteps; step++) {
    const s = stateIndex(r, c);
    let best: CliffAction = 0;
    for (let a = 1; a < 4; a++) {
      if (Q[s][a] > Q[s][best]) best = a as CliffAction;
    }
    const next = stepCliffEnv(r, c, best);
    totalReward += next.reward;
    r = next.r;
    c = next.c;
    path.push([r, c]);
    if (next.done) {
      return { path, reachedGoal: true, totalReward };
    }
    const key = `${r},${c}`;
    if (visited.has(key)) {
      return { path, reachedGoal: false, totalReward };
    }
    visited.add(key);
  }
  return { path, reachedGoal: false, totalReward };
}

export interface CliffEpisodePoint {
  episode: number;
  qReturn: number;
  sReturn: number;
  qSmooth: number;
  sSmooth: number;
}

export interface CliffCheckpoint {
  episode: number;
  qPath: [number, number][];
  sPath: [number, number][];
  qReachedGoal: boolean;
  sReachedGoal: boolean;
  qGreedyReward: number;
  sGreedyReward: number;
  qTrainAvg: number;
  sTrainAvg: number;
  qFallsTotal: number;
  sFallsTotal: number;
  qTable: number[][];
  sTable: number[][];
  caption: string;
}

export interface CliffTrainingSimulation {
  episodes: number;
  alpha: number;
  epsilon: number;
  curve: CliffEpisodePoint[];
  checkpoints: CliffCheckpoint[];
}

function cloneTable(Q: number[][]): number[][] {
  return Q.map((row) => row.slice());
}

function checkpointNumbers(totalEpisodes: number): number[] {
  const candidates = [
    1,
    Math.max(2, Math.round(totalEpisodes * 0.05)),
    Math.max(4, Math.round(totalEpisodes * 0.15)),
    Math.max(8, Math.round(totalEpisodes * 0.35)),
    Math.max(12, Math.round(totalEpisodes * 0.65)),
    totalEpisodes,
  ];
  const unique: number[] = [];
  for (const ep of candidates) {
    const clamped = Math.max(1, Math.min(totalEpisodes, ep));
    if (!unique.includes(clamped)) unique.push(clamped);
  }
  return unique;
}

function trainSingleRun(
  algo: CliffAlgo,
  episodes: number,
  alpha: number,
  epsilon: number,
  seed: number,
  milestones: Set<number>,
) {
  const nStates = CLIFF_GRID_ROWS * CLIFF_GRID_COLS;
  const Q: number[][] = Array.from({ length: nStates }, () => [0, 0, 0, 0]);
  const rand = mulberry32(seed);
  const gamma = 1.0;

  const returns: number[] = [];
  const snapshots = new Map<number, { table: number[][]; fallsTotal: number }>();
  let fallsTotal = 0;

  for (let ep = 1; ep <= episodes; ep++) {
    let [r, c] = CLIFF_START_POS;
    let s = stateIndex(r, c);
    let a = chooseEpsilonGreedy(Q, s, epsilon, rand);
    let epReturn = 0;

    for (let t = 0; t < 200; t++) {
      const next = stepCliffEnv(r, c, a);
      epReturn += next.reward;
      if (next.fell) fallsTotal += 1;
      const sNext = stateIndex(next.r, next.c);
      const aNext = chooseEpsilonGreedy(Q, sNext, epsilon, rand);

      if (next.done) {
        const update = computeTdStep(algo, Q[s][a], next.reward, gamma, [0, 0, 0, 0], 0, alpha);
        Q[s][a] = update.qAfter;
        break;
      }

      const update = computeTdStep(algo, Q[s][a], next.reward, gamma, Q[sNext], aNext, alpha);
      Q[s][a] = update.qAfter;
      r = next.r;
      c = next.c;
      s = sNext;
      a = algo === 'sarsa' ? aNext : chooseEpsilonGreedy(Q, s, epsilon, rand);
    }

    returns.push(Math.max(-150, epReturn));
    if (milestones.has(ep)) {
      snapshots.set(ep, { table: cloneTable(Q), fallsTotal });
    }
  }

  return { returns, snapshots };
}

/** Run real tabular Q-learning and SARSA side-by-side on the 4x12 Cliff Walking grid. */
export function simulateCliffTraining({
  episodes = 300,
  alpha = 0.5,
  epsilon = 0.1,
  seed = 11,
}: {
  episodes?: number;
  alpha?: number;
  epsilon?: number;
  seed?: number;
} = {}): CliffTrainingSimulation {
  const safeEpisodes = Math.max(10, Math.min(500, Math.round(episodes)));
  const safeAlpha = Math.max(0.05, Math.min(1.0, alpha));
  const safeEpsilon = Math.max(0, Math.min(0.35, epsilon));

  const milestoneList = checkpointNumbers(safeEpisodes);
  const milestoneSet = new Set(milestoneList);

  const qRun = trainSingleRun('qlearning', safeEpisodes, safeAlpha, safeEpsilon, seed, milestoneSet);
  const sRun = trainSingleRun('sarsa', safeEpisodes, safeAlpha, safeEpsilon, seed, milestoneSet);

  const windowSize = 20;
  const curve: CliffEpisodePoint[] = [];
  for (let i = 0; i < safeEpisodes; i++) {
    const startIdx = Math.max(0, i - windowSize + 1);
    let qSum = 0;
    let sSum = 0;
    const count = i - startIdx + 1;
    for (let j = startIdx; j <= i; j++) {
      qSum += qRun.returns[j];
      sSum += sRun.returns[j];
    }
    curve.push({
      episode: i + 1,
      qReturn: qRun.returns[i],
      sReturn: sRun.returns[i],
      qSmooth: qSum / count,
      sSmooth: sSum / count,
    });
  }

  const checkpoints: CliffCheckpoint[] = milestoneList.map((ep) => {
    const qSnap = qRun.snapshots.get(ep)!;
    const sSnap = sRun.snapshots.get(ep)!;
    const qRoll = rolloutGreedyCliffPolicy(qSnap.table);
    const sRoll = rolloutGreedyCliffPolicy(sSnap.table);
    const pt = curve[ep - 1];
    const qSteps = qRoll.path.length - 1;
    const sSteps = sRoll.path.length - 1;

    let caption = '';
    if (ep === 1) {
      caption = `Episode 1: both agents just started with empty Q-tables, so greedy paths wander before reaching Goal G.`;
    } else if (safeEpsilon === 0 && qRoll.reachedGoal && sRoll.reachedGoal) {
      caption = `Episode ${ep} (ε = 0.00): with zero random slips, SARSA takes ${sSteps} steps and Q-learning takes ${qSteps} steps — both hug the optimal edge.`;
    } else if (qRoll.reachedGoal && sRoll.reachedGoal && sSteps > qSteps) {
      caption = `Episode ${ep}: Q-learning walks the cliff edge in ${qSteps} steps (${qSnap.fallsTotal} training slips), while SARSA detours along the safer top path in ${sSteps} steps (${sSnap.fallsTotal} slips, higher training reward ${pt.sSmooth.toFixed(1)} vs ${pt.qSmooth.toFixed(1)}).`;
    } else {
      caption = `Episode ${ep}: Q-learning avg training reward = ${pt.qSmooth.toFixed(1)} (${qSnap.fallsTotal} cliff falls), SARSA avg = ${pt.sSmooth.toFixed(1)} (${sSnap.fallsTotal} falls).`;
    }

    return {
      episode: ep,
      qPath: qRoll.path,
      sPath: sRoll.path,
      qReachedGoal: qRoll.reachedGoal,
      sReachedGoal: sRoll.reachedGoal,
      qGreedyReward: qRoll.totalReward,
      sGreedyReward: sRoll.totalReward,
      qTrainAvg: pt.qSmooth,
      sTrainAvg: pt.sSmooth,
      qFallsTotal: qSnap.fallsTotal,
      sFallsTotal: sSnap.fallsTotal,
      qTable: qSnap.table,
      sTable: sSnap.table,
      caption,
    };
  });

  return {
    episodes: safeEpisodes,
    alpha: safeAlpha,
    epsilon: safeEpsilon,
    curve,
    checkpoints,
  };
}
