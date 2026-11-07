import { useMemo, useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, Slider } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

const R = 55; // torus major radius
const r = 22; // torus minor radius
const N_U = 28;
const N_V = 12;

interface Point3 {
  x: number;
  y: number;
  z: number;
}

function buildTorus(): Point3[] {
  const points: Point3[] = [];
  for (let i = 0; i < N_U; i++) {
    const u = (i / N_U) * Math.PI * 2;
    for (let j = 0; j < N_V; j++) {
      const v = (j / N_V) * Math.PI * 2;
      points.push({
        x: (R + r * Math.cos(v)) * Math.cos(u),
        y: r * Math.sin(v),
        z: (R + r * Math.cos(v)) * Math.sin(u),
      });
    }
  }
  return points;
}
const POINTS = buildTorus();

const WIDTH = 320;
const HEIGHT = 280;

export default function PointCloudDiagram() {
  const t = useVizTokens();
  const [angle, setAngle] = useState(35);

  const projected = useMemo(() => {
    const rad = (angle * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    return POINTS.map((p) => {
      const x1 = p.x * cos + p.z * sin;
      const z1 = -p.x * sin + p.z * cos;
      return { screenX: x1, screenY: p.y, depth: z1 };
    }).sort((a, b) => a.depth - b.depth); // painter's algorithm: far points drawn first
  }, [angle]);

  const color = getConceptColor(t, 'attention');
  const minDepth = Math.min(...projected.map((p) => p.depth));
  const maxDepth = Math.max(...projected.map((p) => p.depth));

  return (
    <VisualizationContainer footer="A LiDAR scan is exactly this: thousands of (x, y, z) points with no grid structure connecting them -- point A has no inherent 'neighbor' the way a pixel does. That's precisely why standard convolution doesn't apply directly, and why point-cloud architectures (PointNet and successors) are built around operations that don't assume any particular point ordering.">
      <Slider label="Rotation" value={angle} onChange={setAngle} min={0} max={360} format={(v) => `${v}°`} />
      <svg width={WIDTH} height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="nm-fit-svg" style={{ display: 'block', marginTop: 8 }}>
        {projected.map((p, i) => {
          const depthT = (p.depth - minDepth) / (maxDepth - minDepth || 1);
          const size = 1.5 + depthT * 2;
          return (
            <circle
              key={i}
              cx={WIDTH / 2 + p.screenX}
              cy={HEIGHT / 2 - p.screenY}
              r={size}
              fill={color}
              opacity={0.35 + depthT * 0.6}
            />
          );
        })}
      </svg>
      <div style={{ fontSize: DIAGRAM_TYPE.secondaryLabel.size, color: t.textMuted, marginTop: 4 }}>
        {POINTS.length} points, rotated live — nearer points drawn larger and more opaque (a simple depth cue, painter's algorithm).
      </div>
    </VisualizationContainer>
  );
}
