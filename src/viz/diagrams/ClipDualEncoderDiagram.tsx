import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, FlowDots } from '../primitives';

/** A separate encoder per modality, trained contrastively so matching
 * pairs land close in one shared embedding space -- what powers
 * zero-shot classification and text-to-image retrieval. */
export default function ClipDualEncoderDiagram() {
  const t = useVizTokens();
  const okColor = t.accentPrimary;

  return (
    <VisualizationContainer footer='Zero-shot classification: compare an image embedding to text embeddings of candidate class names ("a photo of a dog," "a photo of a cat") and pick the closest -- no task-specific training needed.'>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ padding: '0.5rem 0.6rem', borderRadius: 7, background: t.surfaceAlt, border: `1.5px solid ${t.border}`, fontSize: 8.5, textAlign: 'center' }}>image → ViT encoder</div>
          <div style={{ padding: '0.5rem 0.6rem', borderRadius: 7, background: t.surfaceAlt, border: `1.5px solid ${t.border}`, fontSize: 8.5, textAlign: 'center' }}>&ldquo;a photo of a dog&rdquo; → text encoder</div>
        </div>
        <span style={{ color: t.textMuted, fontSize: 14 }}>→</span>
        <div style={{ padding: '0.7rem 0.8rem', borderRadius: 8, background: `${okColor}18`, border: `1.5px solid ${okColor}`, textAlign: 'center' }}>
          <span style={{ fontSize: 9, fontWeight: 700, color: okColor }}>shared embedding space<br />(contrastively aligned)</span>
        </div>
        <svg aria-hidden viewBox="0 0 300 80" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
          <FlowDots d="M 76 22 L 190 40" color={okColor} count={2} dur={2.4} />
          <FlowDots d="M 76 58 L 190 40" color={t.accentSecondary} count={2} dur={2.4} />
        </svg>
      </div>
    </VisualizationContainer>
  );
}
