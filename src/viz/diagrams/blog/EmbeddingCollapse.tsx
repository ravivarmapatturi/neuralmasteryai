import { useState } from 'react';
import { useVizTokens } from '../../../theme/vizTokens';
import { VisualizationContainer, VisualizationHeader } from '../../primitives';
import { usePrefersReducedMotion } from '../../primitives';

// Illustrative toy: 8 images, each with two augmented views, embedded in 2-D.
const START = Array.from({ length: 8 }, (_, i) => {
  const a = (i / 8) * Math.PI * 2;
  return { x: Math.cos(a) * 0.8, y: Math.sin(a) * 0.8, jx: Math.cos(a * 3) * 0.25, jy: Math.sin(a * 5) * 0.25 };
});

/** step in [0, 1]. Invariance pulls the two views together; without a variance term everything also drifts to one point. */
export function positions(step: number, varianceTerm: boolean) {
  return START.map(p => {
    const shrink = varianceTerm ? 1 : 1 - step * 0.97; // collapse: all embeddings converge
    const cx = p.x * shrink, cy = p.y * shrink;
    const gap = 1 - step; // views move together in both cases
    return { a: { x: cx + p.jx * gap, y: cy + p.jy * gap }, b: { x: cx - p.jx * gap, y: cy - p.jy * gap } };
  });
}

export default function EmbeddingCollapse() {
  const t = useVizTokens();
  const reduced = usePrefersReducedMotion();
  const [step, setStep] = useState(0);
  const [variance, setVariance] = useState(false);
  const pts = positions(step, variance);
  const spread = Math.hypot(pts[0].a.x - pts[4].a.x, pts[0].a.y - pts[4].a.y) / 2;
  const S = 120, sx = (v: number) => 140 + v * S, sy = (v: number) => 140 - v * S;
  return (
    <VisualizationContainer title="Collapse" footer={`Illustrative toy, not a trained model. Each colour is one image; the two dots are two augmented views of it. "Make the views match" alone is satisfied by putting every image at the same point: the loss is zero and the embedding says nothing. ${variance ? 'With a variance term (as in VICReg) the images stay apart while each pair of views still meets.' : 'Turn on the variance term to see the fix.'}`}>
      <VisualizationHeader eyebrow="TRY IT" title="Why does “make two views match” need anything else?" description="Train the toy model with the slider. Then switch on the variance term and train again." />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', marginBottom: '0.5rem', color: t.textPrimary }}>
        <label style={{ flex: '1 1 240px' }}>Training: <strong>{Math.round(step * 100)}%</strong>
          <input aria-label="Training progress" type="range" min={0} max={100} value={step * 100} onChange={e => setStep(Number(e.target.value) / 100)} style={{ display: 'block', width: '100%' }} />
        </label>
        <label><input type="checkbox" checked={variance} onChange={e => setVariance(e.target.checked)} /> Variance term</label>
      </div>
      <svg viewBox="0 0 280 280" width="100%" style={{ maxWidth: 360, display: 'block', margin: '0 auto' }} role="img" aria-label={`${variance ? 'With' : 'Without'} a variance term at ${Math.round(step * 100)}% training: images are ${spread < 0.1 ? 'collapsed to one point' : 'spread apart'}.`}>
        <rect x={10} y={10} width={260} height={260} rx={8} fill="none" stroke={t.border} />
        {pts.map((p, i) => {
          const c = [t.accentPrimary, t.accentSecondary, t.accentTeal, t.accentWarn, t.accentDanger, t.accentPrimary, t.accentSecondary, t.accentTeal][i];
          return <g key={i} style={{ transition: reduced ? undefined : 'all 120ms' }}>
            <line x1={sx(p.a.x)} y1={sy(p.a.y)} x2={sx(p.b.x)} y2={sy(p.b.y)} stroke={c} strokeOpacity={0.5} />
            <circle cx={sx(p.a.x)} cy={sy(p.a.y)} r={7} fill={c} />
            <circle cx={sx(p.b.x)} cy={sy(p.b.y)} r={7} fill="none" stroke={c} strokeWidth={2.5} />
          </g>;
        })}
      </svg>
      <p style={{ textAlign: 'center', margin: '0.5rem 0 0', color: spread < 0.1 ? t.accentDanger : t.textPrimary, fontWeight: 600 }}>{spread < 0.1 ? 'Collapsed: every image has the same embedding.' : step > 0.9 ? 'Views match and images stay distinguishable.' : 'Training…'}</p>
    </VisualizationContainer>
  );
}
