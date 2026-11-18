import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE } from './diagramSystem';

type Method = 'tree' | 'permutation' | 'shap' | 'lime';
const QUESTIONS: { key: Method; q: string; label: string; why: string; colorKey: 'accentPrimary' | 'accentSecondary' | 'accentWarn' | 'accentDanger' }[] = [
  { key: 'tree', q: 'Is it a tree ensemble, and you just need a fast global "what matters" check?', label: 'Built-in tree importance', why: 'Falls out of training essentially for free -- but remember it\'s biased toward high-cardinality/continuous features.', colorKey: 'accentSecondary' },
  { key: 'permutation', q: 'Any model type, still just a global check, and you want the tree-importance bias fixed?', label: 'Permutation importance', why: 'Model-agnostic and unbiased by feature type -- costs extra prediction passes (one shuffle-and-rescore per feature).', colorKey: 'accentWarn' },
  { key: 'shap', q: 'You need a trustworthy, per-prediction explanation (e.g. compliance/review requirements)?', label: 'SHAP', why: 'Shapley values\' fairness axioms give it a rigorous guarantee LIME and heuristic methods don\'t have.', colorKey: 'accentPrimary' },
  { key: 'lime', q: 'You need a quick local explanation and don\'t need SHAP\'s stronger guarantees (or the model type has no fast SHAP path)?', label: 'LIME', why: 'Faster and more intuitive than SHAP, but its local-linear fit can vary across runs -- less stable, as shown above.', colorKey: 'accentDanger' },
];

export default function InterpretabilityMethodChoiceDiagram() {
  const t = useVizTokens();
  const { value: autoIdx } = useAutoCycle(QUESTIONS.length, 3200);
  const [userSelected, setUserSelected] = useState<Method | null>(null);
  const selected = userSelected ?? QUESTIONS[autoIdx].key;
  const active = QUESTIONS.find((q) => q.key === selected)!;

  return (
    <VisualizationContainer footer={active.why}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {QUESTIONS.map((q) => {
          const isSelected = selected === q.key;
          const color = t[q.colorKey];
          return (
            <div
              key={q.key}
              onClick={() => setUserSelected(q.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', padding: '0.7rem 0.9rem', borderRadius: 8,
                background: isSelected ? `${color}18` : t.surfaceAlt, border: `1.5px solid ${isSelected ? color : t.border}`,
              }}
            >
              <div style={{ flex: 1, fontSize: 13, color: t.textPrimary }}>{q.q}</div>
              <div style={{ flexShrink: 0, fontSize: 11, fontWeight: 700, color, padding: '3px 10px', borderRadius: 999, border: `1px solid ${color}`, whiteSpace: 'nowrap' }}>
                → {q.label}
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 8 }}>
        These aren't mutually exclusive in practice -- a quick tree-importance pass to prioritize, then SHAP on the predictions that actually need a defensible per-instance explanation, is a common real pipeline.
      </div>
    </VisualizationContainer>
  );
}
