export type TokenizerMethod = 'whitespace' | 'punctuation' | 'language-aware';

export interface TokenSpan {
  text: string;
  start: number;
  end: number;
  kind: 'word' | 'punctuation' | 'abbreviation' | 'whitespace-chunk';
}

export interface TokenizerOptions {
  method: TokenizerMethod;
  keepContractions: boolean;
  keepAbbreviations: boolean;
  lowercase: boolean;
}

const ABBREVIATIONS = ['dr.', 'mr.', 'mrs.', 'ms.', 'prof.', 'p.m.', 'a.m.'] as const;
const WORD_CHAR = /[\p{L}\p{N}]/u;

function visibleText(text: string, lowercase: boolean): string {
  return lowercase ? text.toLocaleLowerCase() : text;
}

function whitespaceTokens(text: string, lowercase: boolean): TokenSpan[] {
  return Array.from(text.matchAll(/\S+/gu), (match) => ({
    text: visibleText(match[0], lowercase),
    start: match.index,
    end: match.index + match[0].length,
    kind: 'whitespace-chunk' as const,
  }));
}

function abbreviationAt(text: string, index: number): string | null {
  const rest = text.slice(index).toLocaleLowerCase();
  return ABBREVIATIONS.find((abbr) => rest.startsWith(abbr)) ?? null;
}

export function tokenizeWithRules(text: string, options: TokenizerOptions): TokenSpan[] {
  if (options.method === 'whitespace') return whitespaceTokens(text, options.lowercase);

  const tokens: TokenSpan[] = [];
  let index = 0;
  while (index < text.length) {
    const char = text[index];
    if (/\s/u.test(char)) {
      index += 1;
      continue;
    }

    const abbreviation = options.method === 'language-aware' && options.keepAbbreviations
      ? abbreviationAt(text, index)
      : null;
    if (abbreviation) {
      const original = text.slice(index, index + abbreviation.length);
      tokens.push({
        text: visibleText(original, options.lowercase),
        start: index,
        end: index + abbreviation.length,
        kind: 'abbreviation',
      });
      index += abbreviation.length;
      continue;
    }

    if (WORD_CHAR.test(char)) {
      const start = index;
      index += 1;
      while (index < text.length && WORD_CHAR.test(text[index])) index += 1;
      if (
        options.keepContractions
        && index < text.length
        && /['’]/u.test(text[index])
        && index + 1 < text.length
        && WORD_CHAR.test(text[index + 1])
      ) {
        index += 1;
        while (index < text.length && WORD_CHAR.test(text[index])) index += 1;
      }
      const original = text.slice(start, index);
      tokens.push({ text: visibleText(original, options.lowercase), start, end: index, kind: 'word' });
      continue;
    }

    tokens.push({
      text: visibleText(char, options.lowercase),
      start: index,
      end: index + 1,
      kind: 'punctuation',
    });
    index += 1;
  }
  return tokens;
}

export function compareTokenizers(
  text: string,
  options: Omit<TokenizerOptions, 'method'>,
): Record<TokenizerMethod, TokenSpan[]> {
  return {
    whitespace: tokenizeWithRules(text, { ...options, method: 'whitespace' }),
    punctuation: tokenizeWithRules(text, { ...options, method: 'punctuation' }),
    'language-aware': tokenizeWithRules(text, { ...options, method: 'language-aware' }),
  };
}

export function explainTokenizationStep(
  text: string,
  tokens: readonly TokenSpan[],
  method: TokenizerMethod,
  step: number,
): string {
  if (step === 0) return `Step 1: Read all ${text.length} characters exactly as typed; spaces and punctuation are still part of the raw text.`;
  if (step === 1) return 'Step 2: Mark every possible boundary at whitespace and punctuation before deciding which marks belong inside a token.';
  if (step === 2) return `Step 3: Apply the ${method.replace('-', ' ')} policy to contractions and abbreviations.`;
  return `Step 4: The chosen policy returns ${tokens.length} tokens; every later NLP step receives this exact list.`;
}
