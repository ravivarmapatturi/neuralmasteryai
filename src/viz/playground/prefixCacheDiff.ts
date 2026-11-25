export interface InspectedToken {
  id: number | null;
  text: string;
}

export interface PrefixCacheDiffResult {
  commonPrefixTokens: number;
  cachedPrefixTokens: number;
  recomputedTurn2Tokens: number;
  breakIndex: number | null;
  hitRatePercent: number;
  blockSize: number;
}

/**
 * Deterministic pre-tokenizer preview used before the learner clicks to
 * download the real Xenova/gpt2 BPE vocabulary. Splits leading spaces onto
 * words (matching GPT-2 pre-tokenization boundaries), punctuation, digits,
 * and newlines without touching the network.
 */
export function preTokenizePreview(text: string): InspectedToken[] {
  if (!text) return [];
  const matches = text.match(/ ?[A-Za-z]+| ?[0-9]{1,3}| ?[^\sA-Za-z0-9]+|\s+/g);
  if (!matches) return [];
  return matches.map((chunk) => ({
    id: null,
    text: chunk,
  }));
}

/**
 * Computes exact token-level longest common prefix and KV-block-aligned
 * prefix cache hits between Turn 1 and Turn 2 prompts.
 */
export function computePrefixCacheDiff(
  turn1Tokens: readonly InspectedToken[],
  turn2Tokens: readonly InspectedToken[],
  blockSize = 16,
): PrefixCacheDiffResult {
  const safeBlock = Math.max(1, Math.floor(blockSize));
  const minLen = Math.min(turn1Tokens.length, turn2Tokens.length);
  let common = 0;

  while (common < minLen) {
    const a = turn1Tokens[common];
    const b = turn2Tokens[common];
    const idsPresent = a.id !== null && b.id !== null;
    const same = idsPresent ? a.id === b.id : a.text === b.text;
    if (!same) break;
    common += 1;
  }

  const cachedPrefixTokens = Math.floor(common / safeBlock) * safeBlock;
  const recomputedTurn2Tokens = Math.max(0, turn2Tokens.length - cachedPrefixTokens);
  const breakIndex = common < turn1Tokens.length || common < turn2Tokens.length ? common : null;
  const hitRatePercent =
    turn2Tokens.length > 0 ? (cachedPrefixTokens / turn2Tokens.length) * 100 : 0;

  return {
    commonPrefixTokens: common,
    cachedPrefixTokens,
    recomputedTurn2Tokens,
    breakIndex,
    hitRatePercent,
    blockSize: safeBlock,
  };
}

export function formatVisibleTokenText(text: string): string {
  return text.replace(/ /g, '·').replace(/\n/g, '↵').replace(/\t/g, '⇥');
}
