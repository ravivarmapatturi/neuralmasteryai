import { useMemo, useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, PillSelect, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE } from './diagramSystem';
import { ngramPrecision, simpleBleu } from '../lib/nlpTasks';

const REFERENCE = 'the cat sat on the mat';
const CANDIDATES = [
  { label: 'Exact match', text: 'the cat sat on the mat' },
  { label: 'Valid paraphrase', text: 'a cat was sitting on the mat' },
  { label: 'Word salad (high overlap, wrong meaning)', text: 'the mat sat on the cat' },
];

export default function BleuScoreDiagram() {
  const t = useVizTokens();
  const { value: autoIdx } = useAutoCycle(CANDIDATES.length, 3200);
  const [userIdx, setUserIdx] = useState<number | null>(null);
  const idx = userIdx ?? autoIdx;
  const candidate = CANDIDATES[idx];

  const { p1, p2, bleu } = useMemo(() => ({
    p1: ngramPrecision(candidate.text, REFERENCE, 1),
    p2: ngramPrecision(candidate.text, REFERENCE, 2),
    bleu: simpleBleu(candidate.text, REFERENCE),
  }), [candidate.text]);

  return (
    <VisualizationContainer footer={`Real unigram precision (fraction of candidate words found in the reference) = ${(p1 * 100).toFixed(0)}%; real bigram precision = ${(p2 * 100).toFixed(0)}%; BLEU-style score (geometric mean) = ${(bleu * 100).toFixed(1)}%. ${idx === 1 ? 'A genuinely valid paraphrase still scores well below 100% -- BLEU rewards n-gram overlap with ONE specific reference wording, not meaning.' : idx === 2 ? 'Rearranged words score deceptively high on unigram overlap alone -- bigram precision is what catches the reordering, which is exactly why BLEU uses multiple n-gram orders, not just unigrams.' : ''}`}>
      <PillSelect label="Candidate translation" value={idx} onChange={(v) => setUserIdx(v as number)} options={CANDIDATES.map((c, i) => ({ value: i, label: c.label }))} />

      <div style={{ marginTop: 10, fontFamily: 'monospace', fontSize: 13 }}>
        <div style={{ color: t.textMuted }}>reference: <span style={{ color: t.textPrimary }}>{REFERENCE}</span></div>
        <div style={{ color: t.textMuted, marginTop: 4 }}>candidate: <span style={{ color: t.accentPrimary }}>{candidate.text}</span></div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: 14 }}>
        {[{ label: 'unigram precision', value: p1 }, { label: 'bigram precision', value: p2 }, { label: 'BLEU (geo. mean)', value: bleu }].map((m) => (
          <div key={m.label} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: t.accentPrimary, fontFamily: 'monospace' }}>{(m.value * 100).toFixed(0)}%</div>
            <div style={{ fontSize: 10, color: t.textMuted }}>{m.label}</div>
          </div>
        ))}
      </div>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 8 }}>
        This is the exact well-known limitation the prose warns about, made concrete with a real, computed number instead of an assertion.
      </div>
    </VisualizationContainer>
  );
}
