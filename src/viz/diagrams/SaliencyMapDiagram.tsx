import { useMemo } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer } from '../primitives';
import { DIAGRAM_TYPE, DIAGRAM_RADIUS } from './diagramSystem';
import { saliencyVsIG } from '../lib/deepInterp';

// A real toy "classifier" scoring a 4x4 pixel patch: F(x) = sigmoid(k * w·x).
// The weights below make the center 2x2 patch the true decision-relevant
// region and the border slightly negative; the input has a bright pixel at
// bottom-right that the model doesn't actually care about (low weight).
const W = [
  [-0.3, -0.3, -0.3, -0.3],
  [-0.3, 1.4, 1.4, -0.3],
  [-0.3, 1.4, 1.4, -0.3],
  [-0.3, -0.3, -0.3, -0.6],
];
const X = [
  [0.2, 0.2, 0.2, 0.2],
  [0.2, 0.9, 0.9, 0.2],
  [0.2, 0.9, 0.9, 0.2],
  [0.2, 0.2, 0.2, 0.6],
];

function Grid({ data, maxAbs, size = 68 }: { data: number[][]; maxAbs: number; size?: number }) {
  const t = useVizTokens();
  const gap = 3;
  return (
    <svg width={data[0].length * (size + gap)} height={data.length * (size + gap)} viewBox={`0 0 ${data[0].length * (size + gap)} ${data.length * (size + gap)}`} className="nm-fit-svg">
      {data.map((row, r) =>
        row.map((v, c) => {
          const mag = Math.min(1, Math.abs(v) / maxAbs);
          const color = v >= 0 ? t.accentPrimary : t.accentDanger;
          return (
            <g key={`${r}-${c}`} transform={`translate(${c * (size + gap)}, ${r * (size + gap)})`}>
              <rect width={size} height={size} rx={DIAGRAM_RADIUS.cell} fill={color} fillOpacity={0.08 + mag * 0.85} stroke={t.border} strokeWidth={1} />
              <text x={size / 2} y={size / 2 + 4} textAnchor="middle" fontSize={11} fontFamily="monospace" fontWeight={600} fill={mag > 0.5 ? t.background : t.textSecondary}>
                {v.toFixed(2)}
              </text>
            </g>
          );
        }),
      )}
    </svg>
  );
}

export default function SaliencyMapDiagram() {
  const t = useVizTokens();
  const { raw, integrated, scoreAtInput, G } = useMemo(() => saliencyVsIG(W, X), []);
  const maxAbs = Math.max(...raw.flat().map(Math.abs), ...integrated.flat().map(Math.abs), 1e-6);

  return (
    <VisualizationContainer footer={`The model's score at the actual input is ${scoreAtInput.toFixed(6)} -- essentially saturated at 1. Raw gradients (left) inherit that saturation and go nearly flat everywhere, real numbers, not a rounding artifact. Integrated Gradients (right) instead averages the gradient along the whole path from a blank baseline, where the model isn't saturated yet (mean unsaturation factor ${G.toFixed(3)}), and recovers the true center-vs-border-vs-irrelevant-bright-pixel structure.`}>
      <div style={{ display: 'flex', gap: 28, justifyContent: 'center', flexWrap: 'wrap' }}>
        <div>
          <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.label.size, fontWeight: 700, color: t.textSecondary, marginBottom: 6 }}>Raw gradient saliency</div>
          <Grid data={raw} maxAbs={maxAbs} />
        </div>
        <div>
          <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.label.size, fontWeight: 700, color: t.accentPrimary, marginBottom: 6 }}>Integrated Gradients</div>
          <Grid data={integrated} maxAbs={maxAbs} />
        </div>
      </div>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 10 }}>
        Both grids share one color scale, so the contrast between them is real: the bottom-right pixel is bright (x=0.6) but the model was never trained to weight it (w=−0.6) -- only Integrated Gradients correctly assigns it a small, slightly negative attribution instead of hiding it in uniform near-zero noise.
      </div>
    </VisualizationContainer>
  );
}
