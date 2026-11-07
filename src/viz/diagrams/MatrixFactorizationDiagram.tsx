import { useMemo, useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, Slider } from '../primitives';
import { DIAGRAM_TYPE, DIAGRAM_RADIUS } from './diagramSystem';
import { RATINGS, trainMatrixFactorization } from '../lib/specializedSupervised';

function Grid({ data, observedMask }: { data: number[][]; observedMask: (number | null)[][] }) {
  const t = useVizTokens();
  const size = 42, gap = 3;
  return (
    <svg width={data[0].length * (size + gap)} height={data.length * (size + gap)} viewBox={`0 0 ${data[0].length * (size + gap)} ${data.length * (size + gap)}`} className="nm-fit-svg">
      {data.map((row, r) => row.map((v, c) => {
        const isObserved = observedMask[r][c] !== null;
        const mag = Math.min(1, Math.max(0, v / 5));
        return (
          <g key={`${r}-${c}`} transform={`translate(${c * (size + gap)}, ${r * (size + gap)})`}>
            <rect width={size} height={size} rx={DIAGRAM_RADIUS.cell} fill={t.accentPrimary} fillOpacity={0.1 + mag * 0.7} stroke={isObserved ? t.accentWarn : t.border} strokeWidth={isObserved ? 2 : 1} />
            <text x={size / 2} y={size / 2 + 4} textAnchor="middle" fontSize={11} fontFamily="monospace" fill={mag > 0.55 ? t.background : t.textSecondary}>{v.toFixed(1)}</text>
          </g>
        );
      }))}
    </svg>
  );
}

export default function MatrixFactorizationDiagram() {
  const t = useVizTokens();
  const [epochs, setEpochs] = useState(200);

  const { reconstructed, mse } = useMemo(() => trainMatrixFactorization(2, epochs, 0.05, 0.02, 3), [epochs]);

  return (
    <VisualizationContainer footer={`Real 2D latent factors, trained via real gradient descent for ${epochs} epochs on ONLY the amber-bordered observed cells. Real MSE on those observed cells = ${mse.toFixed(4)}. Every other cell (thin border) is what U·Vᵀ predicts despite never being trained on directly -- filled in purely from the learned latent structure shared with the cells that WERE observed.`}>
      <Slider label="training epochs" value={epochs} onChange={setEpochs} min={0} max={500} step={10} />

      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 10 }}>
        <Grid data={reconstructed} observedMask={RATINGS} />
      </div>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 8 }}>
        At epochs=0 the reconstruction is just random noise; watch the amber-bordered (observed) cells snap toward their real target values first, then the unobserved cells settle into plausible values inferred from the learned 2D factors.
      </div>
    </VisualizationContainer>
  );
}
