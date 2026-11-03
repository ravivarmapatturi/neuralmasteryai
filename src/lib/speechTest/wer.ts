/**
 * Word Error Rate (WER) computation and text normalization
 * for speech recognition accuracy evaluation.
 *
 * WER = (Substitutions + Deletions + Insertions) / TotalReferenceWords
 */

export interface WERResult {
  wer: number; // e.g. 0.125 for 12.5%
  werPercent: number; // e.g. 12.5
  insertions: number;
  deletions: number;
  substitutions: number;
  correct: number;
  referenceWordCount: number;
  hypothesisWordCount: number;
}

/**
 * Normalizes text for speech comparison:
 * - Lowercase
 * - Strips punctuation while preserving apostrophes inside words (e.g. "don't")
 * - Collapses multiple spaces
 */
export function normalizeText(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s']|_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean);
}

/**
 * Computes Word Error Rate using standard dynamic programming Levenshtein distance on words.
 */
export function computeWER(reference: string, hypothesis: string): WERResult {
  const refWords = normalizeText(reference);
  const hypWords = normalizeText(hypothesis);

  const n = refWords.length;
  const m = hypWords.length;

  if (n === 0) {
    const wer = m === 0 ? 0 : 1;
    return {
      wer,
      werPercent: wer * 100,
      insertions: m,
      deletions: 0,
      substitutions: 0,
      correct: 0,
      referenceWordCount: 0,
      hypothesisWordCount: m,
    };
  }

  // dp[i][j] holds edit distance between refWords[0..i-1] and hypWords[0..j-1]
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));

  for (let i = 0; i <= n; i++) dp[i][0] = i;
  for (let j = 0; j <= m; j++) dp[0][j] = j;

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (refWords[i - 1] === hypWords[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        const sub = dp[i - 1][j - 1] + 1;
        const ins = dp[i][j - 1] + 1;
        const del = dp[i - 1][j] + 1;
        dp[i][j] = Math.min(sub, ins, del);
      }
    }
  }

  // Backtrack to count operations
  let i = n;
  let j = m;
  let substitutions = 0;
  let deletions = 0;
  let insertions = 0;
  let correct = 0;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && refWords[i - 1] === hypWords[j - 1]) {
      correct++;
      i--;
      j--;
    } else if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] + 1) {
      substitutions++;
      i--;
      j--;
    } else if (j > 0 && dp[i][j] === dp[i][j - 1] + 1) {
      insertions++;
      j--;
    } else if (i > 0 && dp[i][j] === dp[i - 1][j] + 1) {
      deletions++;
      i--;
    } else {
      break;
    }
  }

  const editCount = substitutions + deletions + insertions;
  const rawWer = editCount / n;
  const wer = Math.round(rawWer * 1000) / 1000;

  return {
    wer,
    werPercent: Math.round(rawWer * 1000) / 10,
    insertions,
    deletions,
    substitutions,
    correct,
    referenceWordCount: n,
    hypothesisWordCount: m,
  };
}
