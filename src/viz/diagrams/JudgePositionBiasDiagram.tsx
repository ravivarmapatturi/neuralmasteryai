import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, Slider, PillSelect, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE } from './diagramSystem';
import { RESPONSE_A_QUALITY, RESPONSE_B_QUALITY, judgeScoreWithPositionBias } from '../lib/llmEval';

type Order = 'AB' | 'BA';

export default function JudgePositionBiasDiagram() {
  const t = useVizTokens();
  const cycle = useAutoCycle(2, 2600);
  const order: Order = cycle.value === 0 ? 'AB' : 'BA';
  const setOrder = (value: Order) => cycle.pick(value === 'AB' ? 0 : 1);
  const [bias, setBias] = useState(0.5);

  const aFirst = order === 'AB';
  const scoreA = judgeScoreWithPositionBias(RESPONSE_A_QUALITY, aFirst, bias);
  const scoreB = judgeScoreWithPositionBias(RESPONSE_B_QUALITY, !aFirst, bias);
  const winner = scoreA >= scoreB ? 'A' : 'B';
  const trueWinner = RESPONSE_A_QUALITY >= RESPONSE_B_QUALITY ? 'A' : 'B';

  return (
    <VisualizationContainer footer={`Real quality: A=${RESPONSE_A_QUALITY}, B=${RESPONSE_B_QUALITY} -- A is genuinely (barely) better, always. Judge score with a real +${bias.toFixed(2)} first-position bonus: A=${scoreA.toFixed(2)}, B=${scoreB.toFixed(2)}. Judge's verdict: "${winner} wins." ${winner !== trueWinner ? 'That\'s the WRONG answer, purely from ordering -- flip which response is shown first and it flips back.' : 'Correct this time, but only because A happened to also be first -- try the other order.'}`}>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <PillSelect label="Display order" value={order} onChange={(v) => setOrder(v as Order)} options={[
          { value: 'AB', label: 'A shown first' },
          { value: 'BA', label: 'B shown first' },
        ]} />
        <Slider label="judge's position bias" value={bias} onChange={setBias} min={0} max={1.5} step={0.05} />
      </div>

      <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
        {[{ label: 'Response A', score: scoreA, isFirst: aFirst }, { label: 'Response B', score: scoreB, isFirst: !aFirst }].map((r) => (
          <div key={r.label} style={{ flex: 1, padding: 10, borderRadius: 8, background: winner === r.label.slice(-1) ? `${t.accentPrimary}18` : t.surfaceAlt, border: `1.5px solid ${winner === r.label.slice(-1) ? t.accentPrimary : t.border}` }}>
            <div style={{ fontSize: DIAGRAM_TYPE.label.size, fontWeight: 700, color: t.textPrimary }}>{r.label} {r.isFirst && <span style={{ fontSize: 10, color: t.accentWarn }}>(shown first)</span>}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: t.accentPrimary, fontFamily: 'monospace', marginTop: 4 }}>{r.score.toFixed(2)}</div>
          </div>
        ))}
      </div>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 8 }}>
        Standard mitigation: evaluate both orderings and check the verdict is consistent -- exactly what toggling the pill above simulates.
      </div>
    </VisualizationContainer>
  );
}
