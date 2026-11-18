import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, useAutoCycle } from '../primitives';
import { getConceptColor } from './diagramSystem';

/** Two SSL strategies for constructing a training signal with no
 * human labels -- click to compare augmented-view contrast against
 * masked-portion prediction. */
export default function SslMethodsDiagram() {
  const t = useVizTokens();
  const cycle = useAutoCycle(2, 2600);
  const masked = cycle.value === 1;
  const setMasked = (value: boolean) => cycle.pick(value ? 1 : 0);
  const color = getConceptColor(t, 'attention');

  return (
    <VisualizationContainer footer={masked ? 'BERT (text) / MAE (images): mask out part of the input, train the model to reconstruct or predict the missing part -- the same underlying principle applied to different modalities.' : 'SimCLR/MoCo: create two augmented views of the same image, pull their embeddings together while pushing apart embeddings of different images -- reuses the contrastive/triplet-loss idea at pretraining scale.'}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        <button type="button" onClick={() => setMasked(false)} style={{ flex: 1, padding: '6px 10px', borderRadius: 6, fontSize: 10.5, fontWeight: !masked ? 700 : 500, background: !masked ? `${color}20` : t.surfaceAlt, border: `1.25px solid ${!masked ? color : t.border}`, color: !masked ? color : t.textSecondary, cursor: 'pointer' }}>
          Contrastive (SimCLR/MoCo)
        </button>
        <button type="button" onClick={() => setMasked(true)} style={{ flex: 1, padding: '6px 10px', borderRadius: 6, fontSize: 10.5, fontWeight: masked ? 700 : 500, background: masked ? `${color}20` : t.surfaceAlt, border: `1.25px solid ${masked ? color : t.border}`, color: masked ? color : t.textSecondary, cursor: 'pointer' }}>
          Masked prediction (BERT/MAE)
        </button>
      </div>
      {masked ? (
        <div style={{ display: 'flex', gap: 3 }}>
          {['The', 'cat', '[MASK]', 'on', 'the', 'mat'].map((w, i) => (
            <div key={i} style={{ flex: 1, padding: '0.4rem 0.2rem', borderRadius: 6, textAlign: 'center', background: w === '[MASK]' ? `${t.accentWarn}20` : `${color}10`, border: `1px solid ${w === '[MASK]' ? t.accentWarn : color}40` }}>
              <span style={{ fontSize: 8.5, fontWeight: w === '[MASK]' ? 700 : 400, color: w === '[MASK]' ? t.accentWarn : t.textSecondary }}>{w}</span>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <div style={{ padding: '0.6rem 0.7rem', borderRadius: 7, background: `${color}18`, border: `1.5px solid ${color}`, textAlign: 'center' }}>
            <span style={{ fontSize: 9, color }}>view A (augmented)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', color: t.accentPrimary, fontSize: 10, fontWeight: 700 }}>pull together</div>
          <div style={{ padding: '0.6rem 0.7rem', borderRadius: 7, background: `${color}18`, border: `1.5px solid ${color}`, textAlign: 'center' }}>
            <span style={{ fontSize: 9, color }}>view B (augmented)</span>
          </div>
        </div>
      )}
    </VisualizationContainer>
  );
}
