import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, VisualizationMath, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

const SEQUENCE = ['The', 'cat', 'sat', 'on', 'the', 'mat'];
// A toy predicted distribution over 4 candidate next-tokens per position --
// illustrative, not a real model's output, but internally consistent (sums to 1).
const CANDIDATES: Record<number, { token: string; p: number }[]> = {
  1: [{ token: 'cat', p: 0.42 }, { token: 'dog', p: 0.21 }, { token: 'sky', p: 0.05 }, { token: 'is', p: 0.32 }],
  2: [{ token: 'sat', p: 0.55 }, { token: 'ran', p: 0.18 }, { token: 'the', p: 0.02 }, { token: 'purred', p: 0.25 }],
  3: [{ token: 'on', p: 0.61 }, { token: 'near', p: 0.14 }, { token: 'quickly', p: 0.04 }, { token: 'and', p: 0.21 }],
};

/** Next-token prediction, made concrete: at each position the model outputs
 * a full probability distribution over the vocabulary, and the loss is
 * cross-entropy against whichever token actually came next -- click a
 * position to see that distribution and the resulting loss contribution. */
export default function PretrainingObjectiveDiagram() {
  const t = useVizTokens();
  const selectable = Object.keys(CANDIDATES).map(Number);
  const cycle = useAutoCycle(selectable.length, 2800, 1);
  const selected = selectable[cycle.value];
  const setSelected = (index: number) => cycle.pick(selectable.indexOf(index));
  const tokenColor = getConceptColor(t, 'token');
  const predColor = getConceptColor(t, 'attention');
  const candidates = CANDIDATES[selected] ?? CANDIDATES[2];
  const actual = SEQUENCE[selected];
  const actualCand = candidates.find((c) => c.token === actual);
  const pActual = actualCand ? actualCand.p : 0.02;
  const loss = -Math.log(pActual);

  return (
    <VisualizationContainer footer="Click a token -- the model's predicted distribution over candidate next-tokens at that position, and the cross-entropy loss (-log p) for whichever token actually came next. Sharper, more confident correct predictions mean lower loss.">
      <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 14 }}>
        {SEQUENCE.map((tok, i) => (
          <div
            key={i}
            onClick={() => CANDIDATES[i] && setSelected(i)}
            style={{
              padding: '6px 10px', borderRadius: 6, fontSize: 12, fontFamily: 'monospace', cursor: CANDIDATES[i] ? 'pointer' : 'default',
              background: selected === i ? `${tokenColor}30` : t.surfaceAlt, border: `1.5px solid ${selected === i ? tokenColor : t.border}`, color: t.textSecondary, opacity: CANDIDATES[i] ? 1 : 0.4,
            }}
          >
            {tok}
          </div>
        ))}
      </div>
      <div style={{ fontSize: 11, color: t.textMuted, textAlign: 'center', marginBottom: 6 }}>
        predicting token after "{SEQUENCE.slice(0, selected).join(' ')}" — actual next token: <strong style={{ color: predColor }}>{actual}</strong>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {candidates.map((c) => (
          <div key={c.token} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 60, fontSize: 11, fontFamily: 'monospace', color: c.token === actual ? predColor : t.textSecondary, fontWeight: c.token === actual ? 700 : 400 }}>{c.token}</div>
            <div style={{ flex: 1, height: 14, background: t.surfaceAlt, borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ width: `${c.p * 100}%`, height: '100%', background: c.token === actual ? predColor : t.textMuted, opacity: c.token === actual ? 0.85 : 0.4 }} />
            </div>
            <div style={{ width: 36, textAlign: 'right', fontSize: 10, fontFamily: 'monospace', color: t.textMuted }}>{c.p.toFixed(2)}</div>
          </div>
        ))}
      </div>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: predColor, fontWeight: 700, marginTop: 8 }}>
        loss = -log({pActual.toFixed(2)}) = {loss.toFixed(2)}
      </div>
      <div style={{ marginTop: 8, textAlign: 'center' }}>
        <VisualizationMath latex="\mathcal{L} = -\log P(x_t \mid x_{<t})" />
      </div>
    </VisualizationContainer>
  );
}
