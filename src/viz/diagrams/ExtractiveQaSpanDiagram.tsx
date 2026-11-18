import { useState, useMemo } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, VisualizationMath, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE } from './diagramSystem';
import { softmax, argmax } from '../lib/nlpTasks';

const PASSAGE = ['The', 'Eiffel', 'Tower', 'was', 'completed', 'in', '1889', 'in', 'Paris', '.'];
// Toy start/end logits -- a real model outputs one such vector per
// position; these are hand-set to peak at the real answer span "1889"
// but with a plausible secondary peak at the wrong span "Paris" to keep
// the softmax genuinely competitive rather than a giveaway.
const QA_PRESETS = [
  { question: "When was the Eiffel Tower completed?", startLogits: [-2, -3, -3, -2, -1, 0.5, 4.2, -1, 1.8, -3], endLogits: [-3, -3, -2, -2, -1, -0.5, 4.5, -1, 1.5, -3] },
  { question: "Where was it built?", startLogits: [-3, -3, -3, -2, -2, -1, 0.5, 1.0, 4.8, -3], endLogits: [-3, -3, -3, -2, -2, -1, 0.2, 0.8, 5.0, -3] },
  { question: "What structure was completed?", startLogits: [4.6, 1.2, 0.8, -2, -2, -2, -1, -2, -2, -3], endLogits: [-2, 1.0, 4.4, -2, -2, -2, -1, -2, -2, -3] },
];

export default function ExtractiveQaSpanDiagram() {
  const t = useVizTokens();
  const { value: autoIdx } = useAutoCycle(QA_PRESETS.length, 3200);
  const [userQIdx, setUserQIdx] = useState<number | null>(null);
  const qIdx = userQIdx ?? autoIdx;
  const currentQA = QA_PRESETS[qIdx];

  const { startProbs, endProbs, startIdx, endIdx } = useMemo(() => {
    const startProbs = softmax(currentQA.startLogits);
    const endProbs = softmax(currentQA.endLogits);
    return { startProbs, endProbs, startIdx: argmax(startProbs), endIdx: argmax(endProbs) };
  }, [currentQA]);

  const answer = PASSAGE.slice(startIdx, endIdx + 1).join(' ');

  return (
    <VisualizationContainer footer={`Real softmax over start/end logits, then real argmax: predicted span = "${answer}" (position ${startIdx} to ${endIdx}), with start probability ${(startProbs[startIdx] * 100).toFixed(1)}% and end probability ${(endProbs[endIdx] * 100).toFixed(1)}%. This is the entire extractive-QA mechanism -- two independent per-token classification heads over the passage, not free-form generation.`}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
        {QA_PRESETS.map((qa, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setUserQIdx(i)}
            style={{
              padding: "4px 10px",
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 600,
              cursor: "pointer",
              border: `1px solid ${qIdx === i ? t.accentPrimary : t.border}`,
              background: qIdx === i ? `${t.accentPrimary}20` : "transparent",
              color: qIdx === i ? t.accentPrimary : t.textSecondary,
            }}
          >
            {qa.question}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {PASSAGE.map((word, i) => {
          const isAnswer = i >= startIdx && i <= endIdx;
          const startP = startProbs[i];
          const endP = endProbs[i];
          return (
            <div key={i} style={{ textAlign: 'center' }}>
              <div style={{ padding: '4px 8px', borderRadius: 6, fontFamily: 'monospace', fontSize: 13, background: isAnswer ? `${t.accentPrimary}25` : t.surfaceAlt, border: `1.5px solid ${isAnswer ? t.accentPrimary : t.border}`, color: t.textPrimary }}>
                {word}
              </div>
              <div style={{ fontSize: 8, color: t.accentSecondary, marginTop: 2 }}>{i === startIdx ? `start ${(startP * 100).toFixed(0)}%` : ' '}</div>
              <div style={{ fontSize: 8, color: t.accentWarn }}>{i === endIdx ? `end ${(endP * 100).toFixed(0)}%` : ' '}</div>
            </div>
          );
        })}
      </div>
      <div style={{ textAlign: 'center', marginTop: 10 }}>
        <VisualizationMath latex={`\\text{span} = [\\arg\\max(\\text{start probs}),\\ \\arg\\max(\\text{end probs})] = [${startIdx}, ${endIdx}]`} display={false} />
      </div>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 8 }}>
        A structurally simpler, more constrained task than free-form generation -- the model can only ever point at something already in the passage, which is exactly why it can't hallucinate an answer not present in the source.
      </div>
    </VisualizationContainer>
  );
}
