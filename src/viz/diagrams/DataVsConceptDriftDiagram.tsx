import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { SelectableRow, VisualizationContainer } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

type Kind = 'data' | 'concept';

/** Same input X, click either drift type -- data drift moves WHERE the
 * input lands, concept drift moves what the SAME input should predict. */
export default function DataVsConceptDriftDiagram() {
  const t = useVizTokens();
  const [kind, setKind] = useState<Kind>('concept');
  const dataColor = getConceptColor(t, 'query');
  const conceptColor = getConceptColor(t, 'attention');
  const color = kind === 'data' ? dataColor : conceptColor;

  return (
    <VisualizationContainer
      footer={kind === 'data'
        ? 'Data drift: the INPUT distribution shifts (different customers, different demographics) -- but a given input still means the same thing. Retraining on recent data with the same labeling logic usually fixes it.'
        : 'Concept drift: the SAME input now genuinely warrants a DIFFERENT prediction (fraudsters adapt their behavior) -- the target definition itself moved. Retraining on stale labels won\'t help; the labeling/evaluation process needs revisiting.'}
    >
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <SelectableRow selected={kind === 'data'} label="Data drift" onSelect={() => setKind('data')} onMouseEnter={() => setKind('data')} style={{ flex: 1, padding: '0.6rem', borderRadius: 8, background: kind === 'data' ? `${dataColor}18` : t.surfaceAlt, border: `1.5px solid ${kind === 'data' ? dataColor : t.border}`, textAlign: 'center' }}>
          <span style={{ fontSize: 11.5, fontWeight: 700, color: kind === 'data' ? dataColor : t.textPrimary }}>Data drift</span>
        </SelectableRow>
        <SelectableRow selected={kind === 'concept'} label="Concept drift" onSelect={() => setKind('concept')} onMouseEnter={() => setKind('concept')} style={{ flex: 1, padding: '0.6rem', borderRadius: 8, background: kind === 'concept' ? `${conceptColor}18` : t.surfaceAlt, border: `1.5px solid ${kind === 'concept' ? conceptColor : t.border}`, textAlign: 'center' }}>
          <span style={{ fontSize: 11.5, fontWeight: 700, color: kind === 'concept' ? conceptColor : t.textPrimary }}>Concept drift</span>
        </SelectableRow>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0.8rem', borderRadius: 9, background: `${color}12` }}>
        <div style={{ fontSize: 11, color: t.textSecondary }}>Input X</div>
        <div style={{ fontSize: 14, color }}>→</div>
        {kind === 'data' ? (
          <div style={{ fontSize: 11, color: t.textSecondary }}>P(X) shifts, <strong style={{ color }}>P(Y|X) unchanged</strong></div>
        ) : (
          <div style={{ fontSize: 11, color: t.textSecondary }}>P(X) unchanged, <strong style={{ color }}>P(Y|X) shifts</strong></div>
        )}
      </div>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 8 }}>
        The distinction that determines whether "retrain on recent data" is actually the right fix.
      </div>
    </VisualizationContainer>
  );
}
