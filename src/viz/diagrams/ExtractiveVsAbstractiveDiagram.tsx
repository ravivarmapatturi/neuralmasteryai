import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, PillSelect, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE } from './diagramSystem';

const SOURCE_SENTENCES = [
  'The company reported quarterly revenue of $4.2 million, up 12% year over year.',
  'Growth was driven primarily by strong demand in the enterprise segment.',
  'The CEO said the company plans to expand into two new markets next year.',
  'Operating costs also rose slightly due to increased hiring.',
];
const EXTRACTED_IDXS = [0, 2];
const ABSTRACTIVE_SUMMARY = 'Revenue grew to $4.2M (+12% YoY) thanks to enterprise demand, and the company will expand into three new markets next year.';
// Note the "three" -- a real, deliberate hallucination relative to the source's "two."

type Mode = 'extractive' | 'abstractive';

export default function ExtractiveVsAbstractiveDiagram() {
  const t = useVizTokens();
  const MODES: Mode[] = ['extractive', 'abstractive'];
  const { value: autoIdx } = useAutoCycle(MODES.length, 3500);
  const [userMode, setUserMode] = useState<Mode | null>(null);
  const mode = userMode ?? MODES[autoIdx];

  return (
    <VisualizationContainer footer={
      mode === 'extractive'
        ? 'Every word in the summary came directly from the highlighted source sentences -- guaranteed factually grounded (it\'s literally a subset of the source), but reads as two disconnected facts rather than a composed narrative.'
        : 'Reads fluently as one composed sentence -- but check it against the source: it says "three new markets," the source said "two." A real, planted hallucination, exactly the faithfulness risk abstractive summarization structurally can\'t rule out the way extractive summarization can.'
    }>
      <PillSelect label="Summary type" value={mode} onChange={(v) => setUserMode(v as Mode)} options={[
        { value: 'extractive', label: 'Extractive' },
        { value: 'abstractive', label: 'Abstractive' },
      ]} />

      <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {SOURCE_SENTENCES.map((s, i) => {
          const isExtracted = mode === 'extractive' && EXTRACTED_IDXS.includes(i);
          return (
            <div key={i} style={{ fontSize: 12, padding: '5px 8px', borderRadius: 6, background: isExtracted ? `${t.accentPrimary}18` : 'transparent', border: `1px solid ${isExtracted ? t.accentPrimary : 'transparent'}`, color: isExtracted ? t.textPrimary : t.textMuted }}>
              {s}
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 12, padding: 10, borderRadius: 8, background: t.surfaceAlt, border: `1.5px solid ${t.border}` }}>
        <div style={{ fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginBottom: 4 }}>Summary:</div>
        <div style={{ fontSize: 13, color: t.textPrimary }}>
          {mode === 'extractive'
            ? EXTRACTED_IDXS.map((i) => SOURCE_SENTENCES[i]).join(' ')
            : ABSTRACTIVE_SUMMARY.split('three new markets').map((part, i, arr) => i < arr.length - 1
              ? <span key={i}>{part}<span style={{ color: t.accentDanger, fontWeight: 700, textDecoration: 'underline' }}>three new markets</span></span>
              : <span key={i}>{part}</span>)}
        </div>
      </div>
    </VisualizationContainer>
  );
}
