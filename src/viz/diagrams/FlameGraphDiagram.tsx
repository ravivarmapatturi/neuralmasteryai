import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer } from '../primitives';
import { getConceptColor } from './diagramSystem';

interface Frame {
  name: string;
  depth: number;
  start: number; // 0-100, fraction of total width
  width: number;
  surprising?: boolean;
}

// Widths are proportional to time spent -- the "surprising" JSON parsing
// call genuinely dominates, exactly the flame-graph payoff the prose
// describes: width immediately reveals what actually dominates runtime.
const FRAMES: Frame[] = [
  { name: 'train_step()', depth: 0, start: 0, width: 100 },
  { name: 'load_batch()', depth: 1, start: 0, width: 78 },
  { name: 'forward()', depth: 1, start: 78, width: 12 },
  { name: 'backward()', depth: 1, start: 90, width: 10 },
  { name: 'parse_json(example)', depth: 2, start: 0, width: 65, surprising: true },
  { name: 'augment(image)', depth: 2, start: 65, width: 13 },
  { name: 'json.loads()', depth: 3, start: 0, width: 65, surprising: true },
];

const CELL_H = 26;
const WIDTH = 460;

export default function FlameGraphDiagram() {
  const t = useVizTokens();
  const [hovered, setHovered] = useState<string | null>('parse_json(example)');
  const frame = FRAMES.find((f) => f.name === hovered);
  const color = getConceptColor(t, 'attention');
  const warnColor = t.accentDanger;

  return (
    <VisualizationContainer footer={frame ? `${frame.name}: ${frame.width}% of total runtime.${frame.surprising ? ' Nobody expected JSON parsing to be the hot path -- but width in a flame graph doesn\'t lie about where time actually goes, regardless of intuition.' : ''}` : 'Hover a frame to see its share of total runtime.'}>
      <svg width={WIDTH} height={4 * CELL_H + 10} viewBox={`0 0 ${WIDTH} ${4 * CELL_H + 10}`} className="nm-fit-svg">
        {FRAMES.map((f) => {
          const x = (f.start / 100) * WIDTH;
          const w = (f.width / 100) * WIDTH;
          const isHovered = hovered === f.name;
          return (
            <g key={f.name} onMouseEnter={() => setHovered(f.name)} style={{ cursor: 'pointer' }}>
              <rect
                x={x}
                y={f.depth * CELL_H}
                width={Math.max(1, w - 1)}
                height={CELL_H - 2}
                fill={f.surprising ? warnColor : color}
                opacity={isHovered ? 0.9 : 0.5}
                stroke={isHovered ? (f.surprising ? warnColor : color) : 'transparent'}
                strokeWidth={2}
                rx={2}
              />
              {w > 40 && (
                <text x={x + 6} y={f.depth * CELL_H + CELL_H / 2 + 4} fontSize={10} fontFamily="monospace" fill={t.textPrimary}>
                  {f.name}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </VisualizationContainer>
  );
}
