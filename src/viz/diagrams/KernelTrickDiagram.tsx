import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE } from './diagramSystem';
import { KERNEL_1D_DATA, polyFeatureMap } from '../lib/classifiers';

export default function KernelTrickDiagram() {
  const t = useVizTokens();
  const lift = useAutoCycle(2, 2600, 1);
  const lifted = lift.value === 1;

  const width1D = 320, height1D = 60;
  const px1D = (x: number) => ((x + 3.5) / 7) * width1D;

  const width2D = 320, height2D = 220, scale = 34, ox = width2D / 2, oy = height2D - 20;
  const px2D = (x: number) => ox + x * scale;
  const py2D = (y: number) => oy - y * scale * 1.6;

  return (
    <VisualizationContainer footer="No 1D threshold can separate these two classes -- the positive class sits on both ends. Map every point x to (x, x²) -- a real, explicit feature map -- and a single straight line separates them perfectly in 2D. A kernel computes the DOT PRODUCT this mapping would produce, without ever materializing the higher-dimensional coordinates, which is what makes this trick work even when the implied space is infinite-dimensional (RBF kernel).">
      <div style={{ fontSize: DIAGRAM_TYPE.label.size, fontWeight: 700, color: t.textPrimary, marginBottom: 4 }}>1D: not linearly separable</div>
      <svg width="100%" viewBox={`0 0 ${width1D} ${height1D}`} style={{ display: 'block' }}>
        <line x1={0} y1={height1D / 2} x2={width1D} y2={height1D / 2} stroke={t.border} strokeWidth={1} />
        {KERNEL_1D_DATA.map((p, i) => (
          <circle key={i} cx={px1D(p.x)} cy={height1D / 2} r={6} fill={p.label === 1 ? t.accentPrimary : t.accentDanger} />
        ))}
      </svg>

      <div style={{ fontSize: DIAGRAM_TYPE.label.size, fontWeight: 700, color: t.textPrimary, marginTop: 12, marginBottom: 4 }}>2D via φ(x) = (x, x²): linearly separable</div>
      <svg width="100%" viewBox={`0 0 ${width2D} ${height2D}`} style={{ display: 'block', maxWidth: 320, margin: '0 auto' }} onPointerDown={lift.stop}>
        <line x1={px2D(-3.5)} y1={py2D(1.7)} x2={px2D(3.5)} y2={py2D(1.7)} stroke={t.accentWarn} strokeWidth={2} strokeDasharray="5 3" />
        {KERNEL_1D_DATA.map((p, i) => {
          const [fx, fy] = polyFeatureMap(p.x);
          return <circle key={i} cx={px2D(fx)} cy={lifted ? py2D(fy) : py2D(0)} r={6} fill={p.label === 1 ? t.accentPrimary : t.accentDanger} style={{ transition: lift.auto ? 'cy 700ms ease' : undefined }} />;
        })}
      </svg>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 4 }}>
        Real x² values plotted, real separating line drawn where the classes actually split (y=1.7) -- not illustrative placeholders.
      </div>
    </VisualizationContainer>
  );
}
