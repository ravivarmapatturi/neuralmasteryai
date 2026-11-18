import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE } from './diagramSystem';

const RUNGS = [
  { id: 'saliency', label: 'Saliency / activation viz', tells: 'Which inputs/neurons correlate with an output.', not: 'Not causal -- correlation with output, not proof of mechanism.' },
  { id: 'attention', label: 'Attention analysis', tells: 'Qualitative patterns a head attends to (previous-token, induction, ...).', not: 'High attention weight ≠ causally important -- a hypothesis, not a conclusion.' },
  { id: 'probing', label: 'Probing classifiers', tells: 'Whether a property is linearly decodable from a layer\'s activations.', not: 'Decodable ≠ used -- the model may never actually read that information out.' },
  { id: 'sae', label: 'Sparse autoencoders', tells: 'A cleaner, less-superposed basis of individually interpretable features.', not: 'Still a representational tool -- doesn\'t by itself explain how features combine.' },
  { id: 'circuits', label: 'Circuits', tells: 'A specific, verified subgraph that causally implements one behavior.', not: 'Labor-intensive to find and verify -- doesn\'t scale to "explain the whole model" alone.' },
  { id: 'mechinterp', label: 'Mechanistic interpretability', tells: 'The overarching program: compose circuits + SAE features into a full causal account.', not: 'The most rigorous tier on this ladder, and the most expensive to reach.' },
];

export default function InterpretabilityRigorLadderDiagram() {
  const t = useVizTokens();
  const { value: autoIdx } = useAutoCycle(RUNGS.length, 2800);
  const [userSelected, setUserSelected] = useState<string | null>(null);
  const selected = userSelected ?? RUNGS[autoIdx].id;
  const active = RUNGS.find((r) => r.id === selected)!;

  return (
    <VisualizationContainer footer={`Rung ${RUNGS.indexOf(active) + 1} (${active.label}) -- tells you: ${active.tells} Doesn't: ${active.not} Rungs going up cost more effort and buy more causal certainty -- not a strict pipeline every project must climb in full. Which rung is "enough" depends entirely on what the answer is being used for.`}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {RUNGS.map((r, i) => {
          const isSelected = selected === r.id;
          return (
            <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 20, textAlign: 'right', fontSize: 11, color: t.textMuted, fontFamily: 'monospace' }}>{i + 1}</div>
              <div
                onClick={() => setUserSelected(r.id)}
                style={{
                  flex: 1, cursor: 'pointer', padding: '0.55rem 0.9rem', borderRadius: 8,
                  background: isSelected ? `${t.accentPrimary}18` : t.surfaceAlt,
                  border: `1.5px solid ${isSelected ? t.accentPrimary : t.border}`,
                  fontSize: 13, fontWeight: isSelected ? 700 : 500,
                  color: isSelected ? t.accentPrimary : t.textPrimary,
                }}
              >
                {r.label}
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 12, padding: '0.7rem 0.9rem', borderRadius: 8, background: t.surfaceAlt, border: `1px solid ${t.border}` }}>
        <div style={{ fontSize: DIAGRAM_TYPE.caption.size, color: t.textPrimary, marginBottom: 4 }}><strong>Tells you:</strong> {active.tells}</div>
        <div style={{ fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted }}><strong>Doesn't:</strong> {active.not}</div>
      </div>
    </VisualizationContainer>
  );
}
