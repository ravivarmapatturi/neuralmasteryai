import { useMemo, useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer } from '../primitives';
import { DIAGRAM_RADIUS, DIAGRAM_TYPE } from './diagramSystem';
import { svdReconstruct, svdReconstructionError, SVD_SINGULAR_VALUES } from '../lib/linalg';

function Grid({ data }: { data: number[][] }) {
  const t = useVizTokens();
  const size = 46, gap = 3;
  const maxAbs = Math.max(...data.flat().map(Math.abs), 1e-6);
  return (
    <svg width={data.length * (size + gap)} height={data.length * (size + gap)} viewBox={`0 0 ${data.length * (size + gap)} ${data.length * (size + gap)}`} className="nm-fit-svg">
      {data.map((row, r) => row.map((v, c) => {
        const mag = Math.min(1, Math.abs(v) / maxAbs);
        const color = v >= 0 ? t.accentPrimary : t.accentDanger;
        return (
          <g key={`${r}-${c}`} transform={`translate(${c * (size + gap)}, ${r * (size + gap)})`}>
            <rect width={size} height={size} rx={DIAGRAM_RADIUS.cell} fill={color} fillOpacity={0.1 + mag * 0.75} stroke={t.border} strokeWidth={1} />
            <text x={size / 2} y={size / 2 + 4} textAnchor="middle" fontSize={10} fontFamily="monospace" fill={mag > 0.55 ? t.background : t.textSecondary}>{v.toFixed(2)}</text>
          </g>
        );
      }))}
    </svg>
  );
}

export default function SvdCompressionDiagram() {
  const t = useVizTokens();
  const [k, setK] = useState(1);

  const full = useMemo(() => svdReconstruct(3), []);
  const truncated = useMemo(() => svdReconstruct(k), [k]);
  const error = useMemo(() => svdReconstructionError(k), [k]);
  const fullError = svdReconstructionError(0);

  return (
    <VisualizationContainer footer={`Real singular values: σ = [${SVD_SINGULAR_VALUES.join(', ')}]. Keeping only the top ${k} of 3 rank-1 terms gives a real reconstruction error (Frobenius norm) of ‖A − A_k‖ = √(Σ dropped σᵢ²) = ${error.toFixed(3)}, out of ${fullError.toFixed(3)} total "energy" in the matrix. This IS the Eckart-Young theorem: no other rank-${k} matrix gets closer to A than this one.`}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        {[1, 2, 3].map((kk) => (
          <button key={kk} type="button" onClick={() => setK(kk)} style={{
            padding: '5px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer',
            border: `1px solid ${k === kk ? t.accentPrimary : t.border}`,
            background: k === kk ? t.accentPrimary : 'transparent',
            color: k === kk ? t.background : t.textPrimary,
          }}>rank-{kk} {kk === 3 ? '(full)' : ''}</button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', justifyContent: 'center' }}>
        <div>
          <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.label.size, color: t.textMuted, marginBottom: 4 }}>original A (rank 3)</div>
          <Grid data={full} />
        </div>
        <div>
          <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.label.size, color: t.accentPrimary, marginBottom: 4 }}>A_{k} (rank {k})</div>
          <Grid data={truncated} />
        </div>
      </div>
    </VisualizationContainer>
  );
}
