import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, Slider } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

// Toy 2D speaker-embedding space (real embeddings are far higher-
// dimensional, but the accept/reject-by-threshold mechanism is identical).
const ENROLLED = { x: 200, y: 140 };
const CANDIDATES = [
  { id: 'audio A', x: 220, y: 155 }, // close -- same speaker
  { id: 'audio B', x: 320, y: 90 }, // far -- different speaker
  { id: 'audio C', x: 240, y: 175 }, // moderately close
];

const WIDTH = 420;
const HEIGHT = 240;

export default function SpeakerVerificationDiagram() {
  const t = useVizTokens();
  const [threshold, setThreshold] = useState(60);

  const enrolledColor = getConceptColor(t, 'query');
  const acceptColor = t.accentPrimary;
  const rejectColor = t.accentDanger;

  const results = CANDIDATES.map((c) => ({ ...c, dist: Math.hypot(c.x - ENROLLED.x, c.y - ENROLLED.y) }));

  return (
    <VisualizationContainer footer={`Threshold = ${threshold}: a candidate is verified as the enrolled speaker only if its embedding distance is below this cutoff. ${results.filter((r) => r.dist < threshold).map((r) => r.id).join(', ') || 'none'} accepted; ${results.filter((r) => r.dist >= threshold).map((r) => r.id).join(', ') || 'none'} rejected. Set the threshold too low and real matches get rejected (false rejects); too high and impostors get accepted (false accepts) -- the same precision/recall tradeoff any threshold-based binary decision faces.`}>
      <Slider label="Acceptance threshold" value={threshold} onChange={setThreshold} min={10} max={150} format={(v) => `${v}`} />
      <svg width={WIDTH} height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="nm-fit-svg" style={{ display: 'block', marginTop: 8 }}>
        <circle cx={ENROLLED.x} cy={ENROLLED.y} r={threshold} fill={`${enrolledColor}12`} stroke={enrolledColor} strokeWidth={1} strokeDasharray="4 3" />
        <circle cx={ENROLLED.x} cy={ENROLLED.y} r={8} fill={enrolledColor} />
        <text x={ENROLLED.x} y={ENROLLED.y - 14} textAnchor="middle" fontSize={10} fontWeight={700} fill={enrolledColor}>enrolled speaker</text>

        {results.map((r) => {
          const accepted = r.dist < threshold;
          const color = accepted ? acceptColor : rejectColor;
          return (
            <g key={r.id}>
              <line x1={ENROLLED.x} y1={ENROLLED.y} x2={r.x} y2={r.y} stroke={color} strokeWidth={1} opacity={0.4} />
              <circle cx={r.x} cy={r.y} r={7} fill={`${color}33`} stroke={color} strokeWidth={2} />
              <text x={r.x} y={r.y - 12} textAnchor="middle" fontSize={10} fontWeight={700} fill={color}>
                {r.id} {accepted ? '✓' : '✗'}
              </text>
            </g>
          );
        })}
      </svg>
      <div style={{ fontSize: DIAGRAM_TYPE.secondaryLabel.size, color: t.textMuted, marginTop: 4 }}>
        Toy 2D embedding space — real speaker embeddings are far higher-dimensional, but "distance from enrolled embedding, cut off by a threshold" is the exact same mechanism.
      </div>
    </VisualizationContainer>
  );
}
