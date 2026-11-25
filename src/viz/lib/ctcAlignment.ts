export const CTC_BLANK = '-';

export interface CtcPreset {
  id: string;
  label: string;
  framesText: string;
  target: string;
}

export const CTC_PRESETS: readonly CtcPreset[] = [
  {
    id: 'hello',
    label: '"HELLO" (blank keeps LL)',
    framesText: 'H H - E E - - L L - L L - O O -',
    target: 'HELLO',
  },
  {
    id: 'helo-trap',
    label: '"HELLO" missing blank trap',
    framesText: 'H H - E E - L L L L - O O -',
    target: 'HELLO',
  },
  {
    id: 'speed',
    label: '"SPEED" (blank keeps EE)',
    framesText: 'S - P P - E E - - E E - D D -',
    target: 'SPEED',
  },
  {
    id: 'book',
    label: '"BOOK" (double OO)',
    framesText: 'B B - O O - O O - K -',
    target: 'BOOK',
  },
];

export interface CtcStepRecord {
  id: 'frames' | 'step1' | 'step2' | 'lattice';
  title: string;
  explain: string;
}

export interface CtcAnalysis {
  frames: string[];
  target: string;
  extendedTarget: string[];
  afterStep1: string[];
  afterStep2: string[];
  decoded: string;
  dropBlanksFirst: boolean;
  matchesTarget: boolean;
  blankCount: number;
  separatorBlanks: number;
  validPathCount: number;
  alignedPathStates: number[] | null;
  trace: CtcStepRecord[];
}

/**
 * Parses free user text into normalized frame symbols (uppercase A-Z or '-').
 * Accepts space-separated tokens ("H H - E") or compact strings ("HH-E"),
 * mapping '_' to '-' and capping at 20 frames so diagrams stay legible.
 */
export function parseCtcFrames(raw: string): string[] {
  const cleaned = raw
    .toUpperCase()
    .replace(/_/g, CTC_BLANK)
    .replace(/[^A-Z-]/g, '');
  const tokens = Array.from(cleaned).slice(0, 20);
  return tokens.length > 0 ? tokens : ['H', CTC_BLANK, 'I'];
}

export function normalizeTargetWord(raw: string): string {
  const letters = raw.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 8);
  return letters.length > 0 ? letters : 'HELLO';
}

/** Builds Graves (2006) blank-interleaved label sequence: - c0 - c1 - ... - */
export function buildExtendedTarget(target: string): string[] {
  const out: string[] = [CTC_BLANK];
  for (const ch of target) {
    out.push(ch, CTC_BLANK);
  }
  return out;
}

function mergeConsecutive(seq: readonly string[]): string[] {
  const merged: string[] = [];
  for (const symbol of seq) {
    if (merged.length === 0 || merged[merged.length - 1] !== symbol) {
      merged.push(symbol);
    }
  }
  return merged;
}

/**
 * Exact Graves (2006) CTC forward path count over T frames and extended sequence l'.
 * Counts every frame-level path pi of length T whose collapse B(pi) equals target.
 */
export function countCtcAlignments(numFrames: number, target: string): number {
  const T = Math.max(0, Math.round(numFrames));
  const cleanTarget = target.toUpperCase().replace(/[^A-Z]/g, '');
  if (T === 0 || cleanTarget.length === 0) return 0;

  const lPrime = buildExtendedTarget(cleanTarget);
  const S = lPrime.length;
  let prev = new Array<number>(S).fill(0);
  prev[0] = 1;
  if (S > 1) prev[1] = 1;

  for (let t = 1; t < T; t++) {
    const next = new Array<number>(S).fill(0);
    for (let s = 0; s < S; s++) {
      let ways = prev[s];
      if (s - 1 >= 0) ways += prev[s - 1];
      if (s - 2 >= 0 && lPrime[s] !== CTC_BLANK && lPrime[s] !== lPrime[s - 2]) {
        ways += prev[s - 2];
      }
      next[s] = ways;
    }
    prev = next;
  }

  return prev[S - 1] + (S >= 2 ? prev[S - 2] : 0);
}

/**
 * Traces the concrete state index inside extendedTarget for a frame sequence
 * if the sequence is a valid CTC alignment for `target`, or null otherwise.
 */
export function traceFrameStatesInExtended(frames: readonly string[], extendedTarget: readonly string[]): number[] | null {
  if (frames.length === 0 || extendedTarget.length < 3) return null;
  // Use DP over (t, s) to recover a matching path when frames collapse to target
  const T = frames.length;
  const S = extendedTarget.length;
  const parent: number[][] = Array.from({ length: T }, () => new Array<number>(S).fill(-1));
  const reachable: boolean[][] = Array.from({ length: T }, () => new Array<boolean>(S).fill(false));

  if (frames[0] === extendedTarget[0]) {
    reachable[0][0] = true;
    parent[0][0] = 0;
  }
  if (frames[0] === extendedTarget[1]) {
    reachable[0][1] = true;
    parent[0][1] = 1;
  }

  for (let t = 1; t < T; t++) {
    for (let s = 0; s < S; s++) {
      if (frames[t] !== extendedTarget[s]) continue;
      if (reachable[t - 1][s]) {
        reachable[t][s] = true;
        parent[t][s] = s;
      } else if (s - 1 >= 0 && reachable[t - 1][s - 1]) {
        reachable[t][s] = true;
        parent[t][s] = s - 1;
      } else if (
        s - 2 >= 0 &&
        extendedTarget[s] !== CTC_BLANK &&
        extendedTarget[s] !== extendedTarget[s - 2] &&
        reachable[t - 1][s - 2]
      ) {
        reachable[t][s] = true;
        parent[t][s] = s - 2;
      }
    }
  }

  let endState = -1;
  if (reachable[T - 1][S - 1]) endState = S - 1;
  else if (reachable[T - 1][S - 2]) endState = S - 2;
  if (endState === -1) return null;

  const states = new Array<number>(T);
  let cur = endState;
  for (let t = T - 1; t >= 0; t--) {
    states[t] = cur;
    cur = parent[t][cur];
  }
  return states;
}

export function analyzeCtcAlignment({
  framesText,
  targetWord,
  dropBlanksFirst,
}: {
  framesText: string;
  targetWord: string;
  dropBlanksFirst: boolean;
}): CtcAnalysis {
  const frames = parseCtcFrames(framesText);
  const target = normalizeTargetWord(targetWord);
  const extendedTarget = buildExtendedTarget(target);

  const afterStep1 = dropBlanksFirst
    ? frames.filter((symbol) => symbol !== CTC_BLANK)
    : mergeConsecutive(frames);

  const afterStep2 = dropBlanksFirst
    ? mergeConsecutive(afterStep1)
    : afterStep1.filter((symbol) => symbol !== CTC_BLANK);

  const decoded = afterStep2.join('');
  const matchesTarget = decoded === target;
  const blankCount = frames.filter((symbol) => symbol === CTC_BLANK).length;

  // Count blanks separating identical adjacent letter runs (critical for double letters)
  let separatorBlanks = 0;
  const mergedForCheck = mergeConsecutive(frames);
  for (let i = 1; i < mergedForCheck.length - 1; i++) {
    if (
      mergedForCheck[i] === CTC_BLANK &&
      mergedForCheck[i - 1] !== CTC_BLANK &&
      mergedForCheck[i - 1] === mergedForCheck[i + 1]
    ) {
      separatorBlanks += 1;
    }
  }

  const validPathCount = countCtcAlignments(frames.length, target);
  const alignedPathStates = traceFrameStatesInExtended(frames, extendedTarget);

  const trace: CtcStepRecord[] = [
    {
      id: 'frames',
      title: '1. Read frame-by-frame predictions',
      explain: `The audio model outputs ${frames.length} time slices (${frames.length - blankCount} letter slices and ${blankCount} blank '-' slices).`,
    },
    {
      id: 'step1',
      title: dropBlanksFirst ? '2. Broken step: delete blanks first' : '2. Real CTC step 1: merge consecutive repeats',
      explain: dropBlanksFirst
        ? `Deleting all ${blankCount} blanks first leaves ${afterStep1.length} raw letters—any doubled letters touch directly.`
        : `Merging adjacent duplicates shrinks ${frames.length} frames to ${afterStep1.length} symbols while keeping '-' blanks between repeated letters.`,
    },
    {
      id: 'step2',
      title: dropBlanksFirst ? '3. Broken step: merge touching letters' : '3. Real CTC step 2: drop all blanks',
      explain: dropBlanksFirst
        ? `Now merging adjacent letters collapses any separated pair too, producing "${decoded}"${matchesTarget ? '.' : ` instead of "${target}"!`}`
        : `Dropping the blanks leaves "${decoded}" (${afterStep2.length} letters). ${separatorBlanks > 0 ? `${separatorBlanks} separator blank kept double letters apart.` : matchesTarget ? 'Matches target cleanly.' : `Target is "${target}".`}`,
    },
    {
      id: 'lattice',
      title: '4. Count all valid frame alignments',
      explain: `Across ${frames.length} audio frames, the blank-interleaved CTC lattice ${extendedTarget.join('')} admits ${validPathCount.toLocaleString('en-US')} valid alignments for "${target}".`,
    },
  ];

  return {
    frames,
    target,
    extendedTarget,
    afterStep1,
    afterStep2,
    decoded,
    dropBlanksFirst,
    matchesTarget,
    blankCount,
    separatorBlanks,
    validPathCount,
    alignedPathStates,
    trace,
  };
}
