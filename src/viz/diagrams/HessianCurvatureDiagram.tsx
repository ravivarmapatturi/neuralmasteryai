import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, PillSelect, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE } from './diagramSystem';
import { symmetricEigenvalues2, type Mat2 } from '../lib/linalg';

type Kind = 'min' | 'max' | 'saddle';
const HESSIANS: Record<Kind, Mat2> = {
  min: [[2, 0], [0, 2]],
  max: [[-2, 0], [0, -2]],
  saddle: [[2, 0], [0, -2]],
};
const LABELS: Record<Kind, string> = { min: 'local minimum', max: 'local maximum', saddle: 'saddle point' };

const KINDS: Kind[] = ['saddle', 'min', 'max'];

export default function HessianCurvatureDiagram() {
  const t = useVizTokens();
  const { value: autoIdx } = useAutoCycle(KINDS.length, 3000);
  const [userKind, setUserKind] = useState<Kind | null>(null);
  const kind = userKind ?? KINDS[autoIdx];
  const H = HESSIANS[kind];
  const [l1, l2] = symmetricEigenvalues2(H);

  const z = (x: number, y: number) => 0.5 * (H[0][0] * x * x + 2 * H[0][1] * x * y + H[1][1] * y * y);
  const maxZ = Math.max(...[-2, -1, 0, 1, 2].flatMap((x) => [-2, -1, 0, 1, 2].map((y) => Math.abs(z(x, y)))), 1);

  return (
    <VisualizationContainer footer={`Real eigenvalues of this Hessian: λ = [${l1.toFixed(1)}, ${l2.toFixed(1)}]. ${l1 > 0 && l2 > 0 ? 'Both positive → positive definite → local MINIMUM.' : l1 < 0 && l2 < 0 ? 'Both negative → negative definite → local MAXIMUM.' : 'Mixed signs → indefinite → SADDLE POINT: a minimum along one axis, a maximum along the other, simultaneously -- flat gradient (∇f=0), but not actually a minimum.'}`}>
      <PillSelect label="Critical point type" value={kind} onChange={(v) => setUserKind(v as Kind)} options={[
        { value: 'min', label: 'Minimum' },
        { value: 'max', label: 'Maximum' },
        { value: 'saddle', label: 'Saddle' },
      ]} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(9, 1fr)', gap: 2, marginTop: 10, maxWidth: 260 }}>
        {Array.from({ length: 9 }, (_, ri) => 4 - ri).map((yy) =>
          Array.from({ length: 9 }, (_, ci) => ci - 4).map((xx) => {
            const v = z(xx * 0.5, yy * 0.5);
            const color = v >= 0 ? t.accentDanger : t.accentPrimary;
            return <div key={`${xx}-${yy}`} style={{ width: 24, height: 24, background: color, opacity: 0.15 + Math.min(1, Math.abs(v) / maxZ) * 0.7, borderRadius: 3 }} />;
          }),
        )}
      </div>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.label.size, fontWeight: 700, color: t.textPrimary, marginTop: 8 }}>{LABELS[kind]}</div>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 4 }}>
        <span style={{ color: t.accentDanger }}>red</span> = value above the critical point, <span style={{ color: t.accentPrimary }}>green</span> = below -- notice the saddle has both colors radiating from the center, in perpendicular directions.
      </div>
    </VisualizationContainer>
  );
}
