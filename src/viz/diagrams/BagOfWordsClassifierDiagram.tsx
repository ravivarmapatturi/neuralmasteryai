import { useMemo, useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, PillSelect, VisualizationMath, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE } from './diagramSystem';
import { bagOfWordsScore } from '../lib/nlpTasks';

const EXAMPLES = [
  'the movie was great and amazing',
  'the movie was not good but not terrible',
  'a boring and awful experience',
];

export default function BagOfWordsClassifierDiagram() {
  const t = useVizTokens();
  const { value: autoIdx } = useAutoCycle(EXAMPLES.length, 3200);
  const [userIdx, setUserIdx] = useState<number | null>(null);
  const idx = userIdx ?? autoIdx;
  const { score, probability, contributions } = useMemo(() => bagOfWordsScore(EXAMPLES[idx]), [idx]);

  return (
    <VisualizationContainer footer={`Real sum of per-word sentiment weights = ${score.toFixed(2)}, passed through a real sigmoid = ${(probability * 100).toFixed(1)}% positive. This entire classifier is one dot product between a bag-of-words vector and a learned weight vector -- exactly what a real logistic-regression sentiment classifier computes, just with hand-set weights here instead of ones learned from data.`}>
      <PillSelect label="Sentence" value={idx} onChange={(v) => setUserIdx(v as number)} options={EXAMPLES.map((_, i) => ({ value: i, label: `Example ${i + 1}` }))} />

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
        {contributions.map((c, i) => (
          <div key={i} style={{
            padding: '4px 9px', borderRadius: 6, fontSize: 12, fontFamily: 'monospace',
            background: c.weight === 0 ? t.surfaceAlt : c.weight > 0 ? `${t.accentPrimary}22` : `${t.accentDanger}22`,
            border: `1px solid ${c.weight === 0 ? t.border : c.weight > 0 ? t.accentPrimary : t.accentDanger}`,
            color: c.weight === 0 ? t.textMuted : c.weight > 0 ? t.accentPrimary : t.accentDanger,
          }}>
            {c.word}{c.weight !== 0 && <span style={{ fontWeight: 700 }}> ({c.weight > 0 ? '+' : ''}{c.weight})</span>}
          </div>
        ))}
      </div>

      <div style={{ textAlign: 'center', marginTop: 12 }}>
        <VisualizationMath latex={`P(\\text{positive}) = \\sigma\\left(\\sum_i w_i\\right) = \\sigma(${score.toFixed(2)}) = ${probability.toFixed(3)}`} />
      </div>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 4 }}>
        Watch example 2 -- "not good" and "not terrible" both contain sentiment words, but bag-of-words has no notion of negation scope, so it just sums every word's weight independently, "not" included as its own small negative nudge. This is exactly the structural limitation modern contextual models fix.
      </div>
    </VisualizationContainer>
  );
}
