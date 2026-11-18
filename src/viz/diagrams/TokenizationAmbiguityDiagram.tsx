import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, PillSelect, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE, DIAGRAM_RADIUS } from './diagramSystem';
import { naiveWhitespaceTokenize, ruleBasedTokenize } from '../lib/classicalNlp';

const EXAMPLES = [
  "Dr. Smith didn't arrive.",
  "I can't believe it's already 3 p.m.",
];

function TokenRow({ tokens, color }: { tokens: string[]; color: string }) {
  const t = useVizTokens();
  return (
    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
      {tokens.map((tok, i) => (
        <span key={i} style={{ padding: '3px 8px', borderRadius: DIAGRAM_RADIUS.chip, background: `${color}18`, border: `1px solid ${color}`, fontSize: 12, fontFamily: 'monospace', color: t.textPrimary }}>
          {tok}
        </span>
      ))}
    </div>
  );
}

export default function TokenizationAmbiguityDiagram() {
  const t = useVizTokens();
  const { value: autoIdx } = useAutoCycle(EXAMPLES.length, 3400);
  const [userExampleIdx, setUserExampleIdx] = useState<number | null>(null);
  const exampleIdx = userExampleIdx ?? autoIdx;
  const text = EXAMPLES[exampleIdx];

  const naive = naiveWhitespaceTokenize(text);
  const ruled = ruleBasedTokenize(text);

  return (
    <VisualizationContainer footer={`Naive whitespace split produces ${naive.length} tokens; the rule-based tokenizer produces ${ruled.length} -- it correctly keeps "Dr." intact (not splitting the abbreviation's period as a separate sentence-ending token) while still separating the trailing period after "arrive" and the contraction "didn't"/"can't" as single tokens. Real string processing, not a picture of the concept.`}>
      <PillSelect label="Example" value={exampleIdx} onChange={(v) => setUserExampleIdx(v as number)} options={EXAMPLES.map((_, i) => ({ value: i, label: `Example ${i + 1}` }))} />

      <div style={{ fontFamily: 'monospace', fontSize: 13, color: t.textSecondary, margin: '8px 0' }}>"{text}"</div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
        <div>
          <div style={{ fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginBottom: 4 }}>naive whitespace split ({naive.length} tokens)</div>
          <TokenRow tokens={naive} color={t.accentDanger} />
        </div>
        <div>
          <div style={{ fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginBottom: 4 }}>rule-based tokenizer ({ruled.length} tokens)</div>
          <TokenRow tokens={ruled} color={t.accentPrimary} />
        </div>
      </div>
    </VisualizationContainer>
  );
}
