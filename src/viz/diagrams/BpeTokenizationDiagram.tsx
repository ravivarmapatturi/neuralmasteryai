import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

// A tiny corpus, pre-computed BPE merge steps: each step merges the most
// frequent adjacent symbol pair into one new symbol.
const WORD = ['l', 'o', 'w', 'e', 'r'];
const MERGES: { pair: [string, string]; merged: string }[] = [
  { pair: ['l', 'o'], merged: 'lo' },
  { pair: ['lo', 'w'], merged: 'low' },
  { pair: ['e', 'r'], merged: 'er' },
];

function applyMerges(word: string[], upTo: number): string[] {
  let symbols = [...word];
  for (let m = 0; m < upTo; m++) {
    const { pair, merged } = MERGES[m];
    const next: string[] = [];
    for (let i = 0; i < symbols.length; i++) {
      if (symbols[i] === pair[0] && symbols[i + 1] === pair[1]) {
        next.push(merged);
        i++;
      } else {
        next.push(symbols[i]);
      }
    }
    symbols = next;
  }
  return symbols;
}

/** BPE builds its vocabulary bottom-up: start from individual
 * characters/bytes, repeatedly merge the most frequent adjacent PAIR into
 * one new symbol, stop at a target vocab size. Step through the merges on
 * one word to see the vocabulary being built, not just described. */
export default function BpeTokenizationDiagram() {
  const t = useVizTokens();
  const cycle = useAutoCycle(MERGES.length + 1, 2200);
  const step = cycle.value;
  const color = getConceptColor(t, 'token');
  const symbols = applyMerges(WORD, step);

  return (
    <VisualizationContainer footer={step < MERGES.length ? `Step ${step + 1}: merge the most frequent adjacent pair "${MERGES[step].pair[0]}"+"${MERGES[step].pair[1]}" → "${MERGES[step].merged}" -- added to the vocabulary as one new symbol.` : `Done -- "lower" now tokenizes as ${symbols.length} symbol(s) instead of ${WORD.length} raw characters.`}>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 14 }}>
        {symbols.map((s, i) => (
          <div key={i} style={{ padding: '10px 14px', borderRadius: 6, background: `${color}18`, border: `1.5px solid ${color}`, fontSize: 14, fontFamily: 'monospace', fontWeight: 700, color }}>
            {s}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
        {[0, 1, 2, 3].map((s) => (
          <div
            key={s}
            onClick={() => cycle.pick(s)}
            style={{ padding: '6px 12px', borderRadius: 999, fontSize: 11, cursor: 'pointer', background: step === s ? t.accentPrimary : t.surfaceAlt, color: step === s ? t.background : t.textSecondary, fontWeight: step === s ? 700 : 400 }}
          >
            {s === 0 ? 'raw chars' : `merge ${s}`}
          </div>
        ))}
      </div>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 10 }}>
        word: "lower" — click a step to watch its symbol sequence shrink as merges accumulate.
      </div>
    </VisualizationContainer>
  );
}
