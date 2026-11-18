import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE } from './diagramSystem';

const STAGES = [
  { id: 'abstract', label: 'Abstract', detail: 'Read first AND last -- first for the claim before the detail, last to check whether your understanding matches what was actually claimed.' },
  { id: 'problem', label: 'Problem', detail: 'State it in one sentence before going further -- everything downstream only makes sense relative to the specific gap being addressed.' },
  { id: 'prior', label: 'Prior Work', detail: 'The actual baseline the paper\'s claimed improvement is measured against -- not a citation list to skim past.' },
  { id: 'method', label: 'Method', detail: 'Try to state the core idea in your own words before reading the formal treatment -- if you can\'t, you may be missing prior-work context.' },
  { id: 'architecture', label: 'Architecture', detail: 'Trace data flow through the diagram explicitly -- worth more time than the surrounding prose.' },
  { id: 'dataset', label: 'Dataset', detail: 'What was actually trained/evaluated on -- critical for judging how far the claims generalize.' },
  { id: 'experiment', label: 'Experiment', detail: 'Read the tables before the prose explaining them. Check: is the baseline fair, or a strawman?' },
  { id: 'ablation', label: 'Ablation', detail: 'What\'s load-bearing vs. incidental -- skipping this is the most common way to walk away with a wrong mental model of why it works.' },
  { id: 'limitations', label: 'Limitations', detail: 'Where the honest caveats live, if the paper has this section at all.' },
  { id: 'reproduce', label: 'Reproduce', detail: 'Could you re-implement this from the paper alone, or does it depend on unstated details?' },
  { id: 'extend', label: 'Extend', detail: 'The natural next question -- usually exactly where the next influential paper in the lineage comes from.' },
];

export default function PaperStructureDiagram() {
  const t = useVizTokens();
  const { value: autoIdx } = useAutoCycle(STAGES.length, 2800);
  const [userSelected, setUserSelected] = useState<string | null>(null);
  const selected = userSelected ?? STAGES[autoIdx].id;
  const active = STAGES.find((s) => s.id === selected)!;

  return (
    <VisualizationContainer footer={active.detail}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
        {STAGES.map((s, i) => (
          <div key={s.id} style={{ display: 'flex', alignItems: 'center' }}>
            <div
              onClick={() => setUserSelected(s.id)}
              style={{
                padding: '6px 10px', borderRadius: 6, fontSize: 12, cursor: 'pointer', fontWeight: selected === s.id ? 700 : 500,
                background: selected === s.id ? `${t.accentPrimary}20` : t.surfaceAlt,
                border: `1.5px solid ${selected === s.id ? t.accentPrimary : t.border}`,
                color: selected === s.id ? t.accentPrimary : t.textPrimary,
              }}
            >
              {s.label}
            </div>
            {i < STAGES.length - 1 && <span style={{ color: t.textMuted, margin: '0 3px', fontSize: 11 }}>→</span>}
          </div>
        ))}
      </div>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 10 }}>
        Click any stage to see what to actually extract from it.
      </div>
    </VisualizationContainer>
  );
}
