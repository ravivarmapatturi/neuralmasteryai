import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, PillSelect, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

type Metric = 'cosine' | 'euclidean' | 'dot';
const METRICS: Metric[] = ['cosine', 'euclidean', 'dot'];
const K = 3;

// Fixed synthetic 2D "embeddings" (toy stand-ins for high-dimensional
// vectors) -- deliberately spread so cosine (angle from origin) and
// euclidean (straight-line) rankings genuinely diverge for most query
// positions, the actual point being made.
const POINTS = [
  { id: 'doc1', x: 80, y: 60 },
  { id: 'doc2', x: 160, y: 40 },
  { id: 'doc3', x: 260, y: 90 },
  { id: 'doc4', x: 340, y: 50 },
  { id: 'doc5', x: 120, y: 160 },
  { id: 'doc6', x: 220, y: 190 },
  { id: 'doc7', x: 320, y: 170 },
  { id: 'doc8', x: 400, y: 130 },
  { id: 'doc9', x: 60, y: 220 },
  { id: 'doc10', x: 380, y: 230 },
];

const WIDTH = 480;
const HEIGHT = 280;

function dist(ax: number, ay: number, bx: number, by: number, metric: Metric): number {
  if (metric === 'euclidean') return Math.hypot(ax - bx, ay - by);
  const dot = ax * bx + ay * by;
  if (metric === 'dot') return -dot; // rank descending dot product == ascending -dot
  const magA = Math.hypot(ax, ay) || 1e-6;
  const magB = Math.hypot(bx, by) || 1e-6;
  return 1 - dot / (magA * magB); // cosine distance
}

export default function EmbeddingSimilaritySearchDiagram() {
  const t = useVizTokens();
  const { value: metIdx, pick: setMetricIdx, stop } = useAutoCycle(METRICS.length, 3500, 0);
  const metric = METRICS[metIdx];
  const [query, setQuery] = useState({ x: 240, y: 130 });

  const ranked = POINTS.map((p) => ({ ...p, d: dist(query.x, query.y, p.x, p.y, metric) })).sort((a, b) => a.d - b.d);
  const nearestIds = new Set(ranked.slice(0, K).map((p) => p.id));

  const queryColor = getConceptColor(t, 'query');
  const nearColor = getConceptColor(t, 'attention');

  return (
    <VisualizationContainer
      footer={
        <>
          Nearest {K} to the query under <strong>{metric}</strong> distance: {ranked.slice(0, K).map((p) => p.id).join(', ')}. Click anywhere on the canvas to move the query point, or switch metrics with the same query position — the ranking changes because each metric answers a genuinely different question ("closest in a straight line" isn't "most similar in direction," and isn't "highest raw dot product" either).
        </>
      }
    >
      <PillSelect<Metric>
        label="Distance metric"
        value={metric}
        onChange={(val) => {
          const v = typeof val === 'function' ? val(metric) : val;
          stop();
          setMetricIdx(METRICS.indexOf(v));
        }}
        options={[
          { value: 'cosine', label: 'Cosine' },
          { value: 'euclidean', label: 'Euclidean' },
          { value: 'dot', label: 'Dot product' },
        ]}
      />
      <svg
        width="100%"
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        style={{ display: 'block', marginTop: 8, cursor: 'crosshair', border: `1px solid ${t.border}`, borderRadius: 8 }}
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const x = ((e.clientX - rect.left) / rect.width) * WIDTH;
          const y = ((e.clientY - rect.top) / rect.height) * HEIGHT;
          setQuery({ x: Math.max(10, Math.min(WIDTH - 10, x)), y: Math.max(10, Math.min(HEIGHT - 10, y)) });
        }}
      >
        {ranked.map((p) => {
          const near = nearestIds.has(p.id);
          return (
            <g key={p.id}>
              {near && <line x1={query.x} y1={query.y} x2={p.x} y2={p.y} stroke={nearColor} strokeWidth={1.5} strokeDasharray="4 3" opacity={0.6} />}
              <circle cx={p.x} cy={p.y} r={near ? 9 : 7} fill={near ? nearColor : t.surfaceAlt} stroke={near ? nearColor : t.border} strokeWidth={1.5} />
              <text x={p.x} y={p.y - 12} textAnchor="middle" fontSize={9} fontFamily="monospace" fill={near ? nearColor : t.textMuted}>
                {p.id}
              </text>
            </g>
          );
        })}
        <circle cx={query.x} cy={query.y} r={11} fill={`${queryColor}33`} stroke={queryColor} strokeWidth={2.5} />
        <text x={query.x} y={query.y + 4} textAnchor="middle" fontSize={11} fontWeight={700} fill={queryColor}>
          Q
        </text>
      </svg>
      <div style={{ fontSize: DIAGRAM_TYPE.secondaryLabel.size, color: t.textMuted, textAlign: 'center', marginTop: 4 }}>
        Each point is a toy 2D stand-in for a high-dimensional embedding — click to reposition the query.
      </div>
    </VisualizationContainer>
  );
}
