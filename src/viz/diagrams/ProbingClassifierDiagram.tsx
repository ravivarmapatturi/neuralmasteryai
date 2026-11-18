import { useMemo, useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, PillSelect, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE } from './diagramSystem';
import { generateProbeLayer, fitLogisticProbe } from '../lib/deepInterp';

// Three synthetic "layers" of 2D activations for a binary property (say,
// singular vs. plural). Only `separation` differs between them -- a real,
// literal stand-in for "later layers encode more of this property more
// linearly." Each layer gets a REAL logistic-regression probe fit to it
// (batch gradient descent, 400 iterations) and scored for real accuracy.
const LAYERS = [
  { name: 'layer 2 (early)', separation: 0.3, seed: 1 },
  { name: 'layer 6 (mid)', separation: 1.1, seed: 2 },
  { name: 'layer 11 (late)', separation: 2.4, seed: 3 },
];

export default function ProbingClassifierDiagram() {
  const t = useVizTokens();
  const { value: autoIdx } = useAutoCycle(LAYERS.length, 3000);
  const [userLayerIdx, setUserLayerIdx] = useState<number | null>(null);
  const layerIdx = userLayerIdx ?? autoIdx;

  const results = useMemo(() => LAYERS.map((l) => {
    const points = generateProbeLayer(l.seed, l.separation);
    const probe = fitLogisticProbe(points);
    return { ...l, points, probe };
  }), []);

  const active = results[layerIdx];
  const { w1, w2, b } = active.probe;

  const width = 320;
  const height = 320;
  const domain: [number, number] = [-2.6, 2.6];
  const scale = width / (domain[1] - domain[0]);
  const px = (x: number) => (x - domain[0]) * scale;
  const py = (y: number) => height - (y - domain[0]) * scale;
  // decision boundary: w1*x + w2*y + b = 0  ->  y = -(w1*x+b)/w2
  const boundaryY = (x: number) => -(w1 * x + b) / w2;

  return (
    <VisualizationContainer footer={`A real linear probe fit to this layer's activations reaches ${(active.probe.accuracy * 100).toFixed(0)}% accuracy at predicting the property -- not asserted, computed from the actual fitted line's predictions on every point shown.`}>
      <PillSelect label="Probe this layer" value={layerIdx} onChange={(v) => setUserLayerIdx(v as number)} options={LAYERS.map((l, i) => ({ value: i, label: l.name }))} />

      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'flex-start', marginTop: 8 }}>
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ flexShrink: 0 }}>
          <rect x={0} y={0} width={width} height={height} fill={t.surfaceAlt} rx={8} />
          <line x1={px(-2.6)} y1={py(boundaryY(-2.6))} x2={px(2.6)} y2={py(boundaryY(2.6))} stroke={t.accentWarn} strokeWidth={2} strokeDasharray="5 3" />
          {active.points.map((p, i) => (
            <circle key={i} cx={px(p.x)} cy={py(p.y)} r={5} fill={p.label === 1 ? t.accentPrimary : t.accentSecondary} fillOpacity={0.8} stroke={t.surface} strokeWidth={1} />
          ))}
        </svg>

        <div style={{ flex: 1, minWidth: 180, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: DIAGRAM_TYPE.label.size, fontWeight: 700, color: t.textPrimary }}>Probe accuracy by depth</div>
          {results.map((r, i) => (
            <div key={r.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 90, fontSize: 11, color: i === layerIdx ? t.accentWarn : t.textMuted, fontWeight: i === layerIdx ? 700 : 400 }}>{r.name}</div>
              <div style={{ flex: 1, background: t.surfaceAlt, borderRadius: 4, height: 14 }}>
                <div style={{ width: `${r.probe.accuracy * 100}%`, height: '100%', background: i === layerIdx ? t.accentWarn : t.textMuted, borderRadius: 4 }} />
              </div>
              <div style={{ width: 34, fontSize: 11, textAlign: 'right', color: t.textSecondary }}>{(r.probe.accuracy * 100).toFixed(0)}%</div>
            </div>
          ))}
          <div style={{ fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 4 }}>
            <span style={{ color: t.accentPrimary }}>⬤</span> label = 1 &nbsp; <span style={{ color: t.accentSecondary }}>⬤</span> label = 0 &nbsp; <span style={{ color: t.accentWarn }}>┈</span> fitted probe boundary
          </div>
        </div>
      </div>
    </VisualizationContainer>
  );
}
