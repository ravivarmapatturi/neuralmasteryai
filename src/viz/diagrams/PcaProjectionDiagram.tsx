import { useMemo, useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, Slider, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE } from './diagramSystem';
import { generatePcaPoints, pcaFit, projectOntoPc1 } from '../lib/dimreduction';

export default function PcaProjectionDiagram() {
  const t = useVizTokens();
  const [correlation, setCorrelation] = useState(0.85);

  const points = useMemo(() => generatePcaPoints(6, correlation), [correlation]);
  const { mean, pc1, pc2, varianceExplained } = useMemo(() => pcaFit(points), [points]);
  const projected = useMemo(() => projectOntoPc1(points, mean, pc1), [points, mean, pc1]);
  const pointCursor = useAutoCycle(points.length, 140);
  const activePoint = points[pointCursor.value];
  const activeProjection = [mean[0] + pc1[0] * projected[pointCursor.value], mean[1] + pc1[1] * projected[pointCursor.value]];

  const width = 300, height = 260, scale = 55, ox = width / 2, oy = height / 2;
  const px = (x: number) => ox + x * scale;
  const py = (y: number) => oy - y * scale;

  return (
    <VisualizationContainer footer={`Real covariance matrix computed from these 80 points, real eigendecomposition (reusing the same closed-form 2x2 eigensolver from Linear Algebra). PC1 (green) captures ${(varianceExplained * 100).toFixed(1)}% of the real total variance; PC2 (amber, perpendicular by construction) gets the rest. Projecting onto PC1 alone (the 1D strip below) keeps almost everything that matters.`}>
      <Slider label="feature correlation" value={correlation} onChange={setCorrelation} min={0} max={0.97} step={0.02} />

      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block', marginTop: 8, maxWidth: 300, margin: '8px auto 0' }}>
        {points.map((p, i) => (
          <circle key={i} cx={px(p.x)} cy={py(p.y)} r={3} fill={t.textSecondary} fillOpacity={0.6} />
        ))}
        <line x1={px(mean[0] - pc1[0] * 3)} y1={py(mean[1] - pc1[1] * 3)} x2={px(mean[0] + pc1[0] * 3)} y2={py(mean[1] + pc1[1] * 3)} stroke={t.accentPrimary} strokeWidth={2.5} />
        <line x1={px(mean[0] - pc2[0] * 1.2)} y1={py(mean[1] - pc2[1] * 1.2)} x2={px(mean[0] + pc2[0] * 1.2)} y2={py(mean[1] + pc2[1] * 1.2)} stroke={t.accentWarn} strokeWidth={2} />
        <line x1={px(activePoint.x)} y1={py(activePoint.y)} x2={px(activeProjection[0])} y2={py(activeProjection[1])} stroke={t.accentPrimary} strokeWidth={1.5} strokeDasharray="3 3" />
        <circle cx={px(activePoint.x)} cy={py(activePoint.y)} r={5} fill={t.textSecondary} />
        <circle cx={px(activeProjection[0])} cy={py(activeProjection[1])} r={5} fill={t.accentPrimary} />
      </svg>

      <div style={{ marginTop: 8 }}>
        <div style={{ fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginBottom: 4 }}>Real 1D projection onto PC1:</div>
        <svg width="100%" viewBox={`0 0 ${width} 30`} style={{ display: 'block' }}>
          <line x1={10} y1={15} x2={width - 10} y2={15} stroke={t.border} strokeWidth={1} />
          {projected.map((v, i) => (
            <circle key={i} cx={width / 2 + v * 20} cy={15} r={pointCursor.value === i ? 5 : 2.5} fill={t.accentPrimary} fillOpacity={pointCursor.value === i ? 1 : 0.5} />
          ))}
        </svg>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 20, fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 4 }}>
        <span><span style={{ color: t.accentPrimary }}>⬤</span> PC1 (max variance)</span>
        <span><span style={{ color: t.accentWarn }}>⬤</span> PC2</span>
      </div>
    </VisualizationContainer>
  );
}
