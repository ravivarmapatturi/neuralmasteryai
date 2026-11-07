import { useMemo, useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, Slider } from '../primitives';
import { DIAGRAM_TYPE, DIAGRAM_RADIUS } from './diagramSystem';
import { featureGeometry } from '../lib/deepInterp';

function GramGrid({ gram, size = 34 }: { gram: number[][]; size?: number }) {
  const t = useVizTokens();
  const gap = 2;
  return (
    <svg width={gram.length * (size + gap)} height={gram.length * (size + gap)} viewBox={`0 0 ${gram.length * (size + gap)} ${gram.length * (size + gap)}`} className="nm-fit-svg">
      {gram.map((row, r) =>
        row.map((v, c) => {
          const mag = Math.min(1, Math.abs(v));
          const color = v >= 0 ? t.accentPrimary : t.accentDanger;
          return (
            <rect key={`${r}-${c}`} x={c * (size + gap)} y={r * (size + gap)} width={size} height={size} rx={DIAGRAM_RADIUS.cell}
              fill={r === c ? t.textSecondary : color} fillOpacity={r === c ? 0.9 : 0.15 + mag * 0.8} />
          );
        }),
      )}
    </svg>
  );
}

export default function SuperpositionDiagram() {
  const t = useVizTokens();
  const [n, setN] = useState(6);

  const superposed = useMemo(() => featureGeometry(n, 2), [n]);
  const unmixed = useMemo(() => featureGeometry(n, n), [n]);

  return (
    <VisualizationContainer footer={`${n} real feature directions packed into a 2-neuron space average |cosine similarity| ${superposed.interference.toFixed(3)} between features that should be independent -- real interference, not illustrative. The same ${n} features given ${n} dimensions to live in (what a sparse autoencoder's wide hidden layer provides) average interference ${unmixed.interference.toFixed(3)}, close to the near-zero a truly disentangled basis would have.`}>
      <Slider label="number of features" value={n} onChange={setN} min={3} max={10} step={1} />

      <div style={{ display: 'flex', gap: 28, justifyContent: 'center', flexWrap: 'wrap', marginTop: 12 }}>
        <div>
          <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.label.size, fontWeight: 700, color: t.accentDanger, marginBottom: 6 }}>Superposed (2 neurons)</div>
          <GramGrid gram={superposed.gram} />
          <div style={{ textAlign: 'center', fontSize: 11, color: t.textMuted, marginTop: 4 }}>mean interference {superposed.interference.toFixed(3)}</div>
        </div>
        <div>
          <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.label.size, fontWeight: 700, color: t.accentPrimary, marginBottom: 6 }}>SAE-unmixed ({n} dims)</div>
          <GramGrid gram={unmixed.gram} />
          <div style={{ textAlign: 'center', fontSize: 11, color: t.textMuted, marginTop: 4 }}>mean interference {unmixed.interference.toFixed(3)}</div>
        </div>
      </div>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 10 }}>
        Each grid is the real pairwise-similarity (Gram) matrix of {n} feature directions -- diagonal is always 1 (a feature's similarity to itself). Drag the slider up: superposition's off-diagonal interference has nowhere to go but up once feature count exceeds neuron count; the wider space barely moves.
      </div>
    </VisualizationContainer>
  );
}
