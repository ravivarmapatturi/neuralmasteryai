import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, VizButton, useAutoCycle } from '../primitives';
import { getConceptColor } from './diagramSystem';

interface Track {
  id: string;
  color: 'query' | 'attention';
  positions: { x: number; y: number }[]; // one per frame
}

// Two objects on paths that cross near frame 2 -- deliberately, so the
// association step has a real ambiguity to resolve (nearest-detection
// matching alone could swap identities here without motion prediction).
const TRACKS: Track[] = [
  { id: 'A', color: 'query', positions: [{ x: 60, y: 40 }, { x: 160, y: 90 }, { x: 260, y: 140 }] },
  { id: 'B', color: 'attention', positions: [{ x: 260, y: 40 }, { x: 190, y: 85 }, { x: 120, y: 130 }] },
];

const WIDTH = 380;
const HEIGHT = 170;

const FRAMES = [0, 1, 2];

function predict(track: Track, frame: number) {
  const prev = track.positions[frame - 1];
  const prevPrev = track.positions[frame - 2];
  return { x: prev.x + (prev.x - prevPrev.x), y: prev.y + (prev.y - prevPrev.y) };
}

export default function TrackingAssociationDiagram() {
  const t = useVizTokens();
  const { value: autoIdx } = useAutoCycle(FRAMES.length, 2600);
  const [userFrame, setUserFrame] = useState<number | null>(null);
  const frame = userFrame ?? FRAMES[autoIdx];

  return (
    <VisualizationContainer
      footer={
        frame === 0
          ? 'Frame 1: two objects are detected. Each gets a new track ID -- nothing to associate yet.'
          : `Frame ${frame + 1}: a Kalman filter predicts each track's expected position (dashed ghost) from its velocity in prior frames, then matches it to the nearest actual detection. The two objects' paths cross right around here -- position-only nearest-neighbor matching without a motion prediction would risk swapping A and B's identities at exactly this point.`
      }
    >
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {[0, 1, 2].map((f) => (
          <VizButton key={f} variant={frame === f ? 'primary' : 'secondary'} onClick={() => setUserFrame(f)}>
            Frame {f + 1}
          </VizButton>
        ))}
      </div>
      <svg width="100%" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} style={{ display: 'block', border: `1px solid ${t.border}`, borderRadius: 8 }}>
        {TRACKS.map((track) => {
          const color = getConceptColor(t, track.color);
          const pos = track.positions[frame];
          const trail = track.positions.slice(0, frame + 1);
          return (
            <g key={track.id}>
              <path d={trail.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x},${p.y}`).join(' ')} fill="none" stroke={color} strokeWidth={1.5} opacity={0.4} />
              {frame >= 2 && (
                <>
                  {(() => {
                    const pred = predict(track, frame);
                    return (
                      <>
                        <circle cx={pred.x} cy={pred.y} r={9} fill="none" stroke={color} strokeWidth={1.5} strokeDasharray="3 3" opacity={0.7} />
                        <line x1={pred.x} y1={pred.y} x2={pos.x} y2={pos.y} stroke={t.textMuted} strokeWidth={1} strokeDasharray="2 2" />
                      </>
                    );
                  })()}
                </>
              )}
              <circle cx={pos.x} cy={pos.y} r={9} fill={`${color}33`} stroke={color} strokeWidth={2} />
              <text x={pos.x} y={pos.y + 4} textAnchor="middle" fontSize={11} fontWeight={700} fill={color}>
                {track.id}
              </text>
            </g>
          );
        })}
      </svg>
    </VisualizationContainer>
  );
}
