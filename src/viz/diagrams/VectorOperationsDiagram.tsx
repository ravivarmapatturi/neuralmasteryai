import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, Slider, VisualizationMath } from '../primitives';
import { DIAGRAM_TYPE } from './diagramSystem';
import { dot, norm, cosineSimilarity, type Vec2 } from '../lib/linalg';

export default function VectorOperationsDiagram() {
  const t = useVizTokens();
  const [a, setA] = useState<Vec2>([3, 1]);
  const [b, setB] = useState<Vec2>([1, 2.5]);

  const dotProduct = dot(a, b);
  const normA = norm(a);
  const normB = norm(b);
  const cos = cosineSimilarity(a, b);
  const angleDeg = (Math.acos(Math.max(-1, Math.min(1, cos))) * 180) / Math.PI;

  const width = 320, height = 280;
  const scale = 40, ox = width / 2, oy = height / 2;
  const px = (x: number) => ox + x * scale;
  const py = (y: number) => oy - y * scale;
  const labelPos = (v: [number, number]) => {
    const len = Math.hypot(v[0], v[1]) || 1;
    const ux = v[0] / len;
    const uy = -v[1] / len;
    return { x: px(v[0]) + ux * 14, y: py(v[1]) + uy * 14 + 4 };
  };

  const aPos = labelPos(a);
  const bPos = labelPos(b);

  return (
    <VisualizationContainer footer={`a·b = (${a[0]})(${b[0]}) + (${a[1]})(${b[1]}) = ${dotProduct.toFixed(2)}. ‖a‖ = ${normA.toFixed(2)}, ‖b‖ = ${normB.toFixed(2)}. cos(θ) = a·b / (‖a‖‖b‖) = ${cos.toFixed(3)} → θ ≈ ${angleDeg.toFixed(1)}°. Every number here is recomputed live from the two vectors you're dragging via the sliders.`}>
      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        <div>
          <Slider label="a.x" value={a[0]} onChange={(v) => setA([v, a[1]])} min={-4} max={4} step={0.1} />
          <Slider label="a.y" value={a[1]} onChange={(v) => setA([a[0], v])} min={-4} max={4} step={0.1} />
        </div>
        <div>
          <Slider label="b.x" value={b[0]} onChange={(v) => setB([v, b[1]])} min={-4} max={4} step={0.1} />
          <Slider label="b.y" value={b[1]} onChange={(v) => setB([b[0], v])} min={-4} max={4} step={0.1} />
        </div>
      </div>

      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block', marginTop: 8, maxWidth: 320, margin: '8px auto 0' }}>
        <defs>
          <marker id="vec-arrow-a" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill={t.accentPrimary} /></marker>
          <marker id="vec-arrow-b" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill={t.accentWarn} /></marker>
        </defs>
        <line x1={0} y1={oy} x2={width} y2={oy} stroke={t.border} strokeWidth={1} />
        <line x1={ox} y1={0} x2={ox} y2={height} stroke={t.border} strokeWidth={1} />

        <line x1={ox} y1={oy} x2={px(a[0])} y2={py(a[1])} stroke={t.accentPrimary} strokeWidth={2.5} markerEnd="url(#vec-arrow-a)" />
        <text x={aPos.x} y={aPos.y} textAnchor="middle" fontSize={12} fontWeight={700} fill={t.accentPrimary}>a</text>

        <line x1={ox} y1={oy} x2={px(b[0])} y2={py(b[1])} stroke={t.accentWarn} strokeWidth={2.5} markerEnd="url(#vec-arrow-b)" />
        <text x={bPos.x} y={bPos.y} textAnchor="middle" fontSize={12} fontWeight={700} fill={t.accentWarn}>b</text>
      </svg>

      <div style={{ textAlign: 'center', marginTop: 8 }}>
        <VisualizationMath latex={`\\cos\\theta = \\frac{a \\cdot b}{\\|a\\|\\|b\\|} = ${cos.toFixed(3)}`} display={false} />
      </div>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 6 }}>
        Drag b to point the same direction as a -- cosine similarity climbs to 1 regardless of length; drag it perpendicular and it hits 0, regardless of how long either vector is. That length-independence is exactly what makes it the right metric for comparing embeddings.
      </div>
    </VisualizationContainer>
  );
}
