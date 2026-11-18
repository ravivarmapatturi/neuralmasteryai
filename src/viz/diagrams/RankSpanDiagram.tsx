import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, Slider, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE } from './diagramSystem';
import { rank2, type Vec2 } from '../lib/linalg';

const V2_PRESETS: Vec2[] = [
  [-1, 2],
  [2, 1], // rank 1 collinear collapse!
  [-2, -1],
  [0.5, 2.5],
];

export default function RankSpanDiagram() {
  const t = useVizTokens();
  const v1: Vec2 = [2, 1];
  const { value: autoIdx } = useAutoCycle(V2_PRESETS.length, 2800);
  const [userV2, setUserV2] = useState<Vec2 | null>(null);
  const v2 = userV2 ?? V2_PRESETS[autoIdx];
  const [v2x, v2y] = v2;

  const rank = rank2(v1, v2);

  const width = 300, height = 300, scale = 34, ox = width / 2, oy = height / 2;
  const px = (x: number) => ox + x * scale;
  const py = (y: number) => oy - y * scale;

  return (
    <VisualizationContainer footer={`rank([v1, v2]) = ${rank}, computed from the real determinant of the 2×2 matrix these vectors form (nonzero ⟺ independent ⟺ rank 2). Drag v2 onto the same line as v1 and watch it drop to rank 1 -- the span collapses from the whole plane down to a single line, and the "real information" in the matrix drops with it.`}>
      <div style={{ display: 'flex', gap: 16 }}>
        <Slider label="v2.x" value={v2x} onChange={(x) => setUserV2([x, v2y])} min={-3} max={3} step={0.1} />
        <Slider label="v2.y" value={v2y} onChange={(y) => setUserV2([v2x, y])} min={-3} max={3} step={0.1} />
      </div>

      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block', marginTop: 8, maxWidth: 300, margin: '8px auto 0' }}>
        {rank === 2 && (
          <polygon points={`${ox},${oy} ${px(v1[0])},${py(v1[1])} ${px(v1[0] + v2[0])},${py(v1[1] + v2[1])} ${px(v2[0])},${py(v2[1])}`} fill={t.accentPrimary} fillOpacity={0.08} />
        )}
        {rank === 1 && <line x1={px(-v1[0] * 3)} y1={py(-v1[1] * 3)} x2={px(v1[0] * 3)} y2={py(v1[1] * 3)} stroke={t.accentPrimary} strokeWidth={1} strokeOpacity={0.3} strokeDasharray="4 3" />}
        <defs>
          <marker id="rs-arrow1" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0,0 L7,3.5 L0,7 Z" fill={t.accentSecondary} /></marker>
          <marker id="rs-arrow2" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0,0 L7,3.5 L0,7 Z" fill={t.accentWarn} /></marker>
        </defs>
        <line x1={ox} y1={oy} x2={px(v1[0])} y2={py(v1[1])} stroke={t.accentSecondary} strokeWidth={2.5} markerEnd="url(#rs-arrow1)" />
        <text x={px(v1[0]) + 6} y={py(v1[1])} fontSize={11} fontWeight={700} fill={t.accentSecondary}>v1</text>
        <line x1={ox} y1={oy} x2={px(v2[0])} y2={py(v2[1])} stroke={t.accentWarn} strokeWidth={2.5} markerEnd="url(#rs-arrow2)" />
        <text x={px(v2[0]) + 6} y={py(v2[1])} fontSize={11} fontWeight={700} fill={t.accentWarn}>v2</text>
      </svg>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted }}>
        Shaded area = span of the two vectors (the whole plane, when independent) -- a real, non-zero region only when rank is full.
      </div>
    </VisualizationContainer>
  );
}
