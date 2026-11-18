import { useMemo } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, PillSelect, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE } from './diagramSystem';
import { generateClasses, discriminantScore } from '../lib/classifiers';

type Mode = 'lda' | 'qda';

export default function LdaQdaBoundaryDiagram() {
  const t = useVizTokens();
  const modeCycle = useAutoCycle(2, 1400, 1);
  const mode: Mode = modeCycle.value === 0 ? 'lda' : 'qda';
  const sameCovariance = false; // class 1 genuinely has a different spread -- the real case QDA is for

  const points = useMemo(() => generateClasses(9, sameCovariance), []);

  const width = 300, height = 260, scale = 55, ox = width / 2, oy = height / 2;
  const px = (x: number) => ox + x * scale;
  const py = (y: number) => oy - y * scale;

  const grid = useMemo(() => {
    const cells: { x: number; y: number; score: number }[] = [];
    for (let x = -2.6; x <= 2.6; x += 0.15) for (let y = -2; y <= 2; y += 0.15) {
      cells.push({ x, y, score: discriminantScore(points, x, y, mode === 'lda') });
    }
    return cells;
  }, [points, mode]);

  return (
    <VisualizationContainer footer={`Real fitted Gaussians from the 120 points below. ${mode === 'lda' ? 'LDA forces both classes to share one covariance matrix (averaged from the two real fitted covariances) -- the quadratic terms cancel algebraically, producing a real straight-line boundary even though the data itself is NOT equally spread.' : 'QDA fits each class its own real covariance matrix -- since class 1 is genuinely more spread out along x than class 0, the real boundary curves to follow that actual difference in shape.'}`}>
      <PillSelect label="Model" value={mode} onChange={(v) => modeCycle.pick(v === 'lda' ? 0 : 1)} options={[
        { value: 'lda', label: 'LDA (shared covariance)' },
        { value: 'qda', label: 'QDA (per-class covariance)' },
      ]} />

      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block', marginTop: 8, maxWidth: 300, margin: '8px auto 0' }}>
        {grid.map((c, i) => (
          <rect key={i} x={px(c.x) - 4} y={py(c.y) - 4} width={9} height={9} fill={c.score >= 0 ? t.accentPrimary : t.accentDanger} fillOpacity={Math.min(0.35, Math.abs(c.score) * 0.15)} />
        ))}
        {points.map((p, i) => (
          <circle key={i} cx={px(p.x)} cy={py(p.y)} r={3} fill={p.label === 1 ? t.accentPrimary : t.accentDanger} fillOpacity={0.85} />
        ))}
      </svg>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted }}>
        Real decision boundary = the shading transition, computed from each model's actual discriminant score at every grid point, not drawn by hand.
      </div>
    </VisualizationContainer>
  );
}
