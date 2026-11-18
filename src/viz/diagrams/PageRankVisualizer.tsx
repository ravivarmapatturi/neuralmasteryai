import { useState } from 'react';
import { useVizTokens, RADIUS, SPACING } from '../../theme/vizTokens';
import { VisualizationContainer, VisualizationHeader, PillSelect, useAutoCycle } from '../primitives';
import {
  WORKED_PAGERANK_GRAPH,
  getInNeighbors,
  getOutDegrees,
  runPageRank,
} from '../lib/pageRank';

const DAMPING_OPTIONS = [
  { label: 'd = 0.85 (Standard)', value: 0.85 },
  { label: 'd = 0.50 (High Teleport)', value: 0.50 },
  { label: 'd = 1.00 (No Teleport Trap)', value: 1.00 },
];

const NODE_COORDINATES: Record<string, { x: number; y: number }> = {
  A: { x: 140, y: 65 },
  B: { x: 340, y: 65 },
  C: { x: 240, y: 195 },
  D: { x: 55, y: 195 },
};

export default function PageRankVisualizer() {
  const t = useVizTokens();
  const [damping, setDamping] = useState<number>(0.85);
  const stepCycle = useAutoCycle(6, 1800);
  const stepIndex = stepCycle.value === 5 ? 99 : stepCycle.value;

  const { history, converged } = runPageRank(WORKED_PAGERANK_GRAPH, damping, 30);
  const maxStep = Math.min(history.length - 1, 5);
  const isConvergedView = stepIndex > maxStep;

  const currentScores = isConvergedView
    ? converged
    : history[Math.min(stepIndex, history.length - 1)];

  const outDegrees = getOutDegrees(WORKED_PAGERANK_GRAPH);
  const inNeighbors = getInNeighbors(WORKED_PAGERANK_GRAPH);
  const baseTeleport = (1 - damping) / 4;

  return (
    <VisualizationContainer
      footer="PageRank computes the stationary probability distribution of a random surfer over directed hyperlink graphs. Stepping through power iteration reveals how link mass concentrates in central hubs while dangling nodes lose probability."
    >
      <div role="group" aria-label="PageRank Power Iteration Simulator">
        <VisualizationHeader
          title="PageRank Graph & Power Iteration Visualizer"
          description="Inspect step-by-step probability mass propagation, damping teleports, and steady-state convergence"
        />

        {/* Controls */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: SPACING.md,
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: SPACING.md,
            padding: SPACING.sm,
            background: t.surfaceAlt,
            borderRadius: RADIUS.md,
            border: `1px solid ${t.border}`,
          }}
        >
          {/* Step Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: t.textSecondary }}>
              Iteration:
            </span>
            {[0, 1, 2, 3, 4].map((step) => (
              <button
                key={step}
                type="button"
                onClick={() => stepCycle.pick(step)}
                style={{
                  padding: '4px 10px',
                  borderRadius: RADIUS.sm,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: `1px solid ${stepIndex === step ? t.accentPrimary : t.border}`,
                  background: stepIndex === step ? t.accentPrimary : t.surface,
                  color: stepIndex === step ? t.background : t.textPrimary,
                  transition: 'all 0.15s ease',
                }}
              >
                Step {step}
              </button>
            ))}
            <button
              type="button"
              onClick={() => stepCycle.pick(5)}
              style={{
                padding: '4px 10px',
                borderRadius: RADIUS.sm,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                border: `1px solid ${isConvergedView ? t.accentPrimary : t.border}`,
                background: isConvergedView ? t.accentPrimary : t.surface,
                color: isConvergedView ? t.background : t.textPrimary,
                transition: 'all 0.15s ease',
              }}
            >
              Converged
            </button>
          </div>

          {/* Damping Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: t.textSecondary }}>
              Damping d:
            </span>
            <PillSelect
              options={DAMPING_OPTIONS.map((opt) => ({ value: opt.value, label: opt.label }))}
              value={damping}
              onChange={(val) => {
                setDamping(val as number);
              }}
            />
          </div>
        </div>

        {/* Status Banner */}
        <div
          style={{
            padding: '6px 12px',
            background: t.surface,
            borderRadius: RADIUS.sm,
            border: `1px solid ${t.border}`,
            marginBottom: SPACING.md,
            fontSize: 12,
            fontFamily: 'monospace',
            display: 'flex',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 8,
          }}
        >
          <span>
            Current: <strong>{isConvergedView ? 'Converged Steady-State' : `Power Iteration Step ${stepIndex}`}</strong>
          </span>
          <span>
            Teleport Base (1-d)/N = <strong>{baseTeleport.toFixed(4)}</strong>
          </span>
          <span>
            Sum = <strong>{Object.values(currentScores).reduce((a, b) => a + b, 0).toFixed(4)}</strong>
          </span>
        </div>

        {/* SVG Directed Graph */}
        <div
          style={{
            background: t.surfaceAlt,
            borderRadius: RADIUS.md,
            border: `1px solid ${t.border}`,
            padding: SPACING.sm,
            marginBottom: SPACING.md,
            position: 'relative',
          }}
        >
          <svg
            viewBox="0 0 420 260"
            style={{ width: '100%', height: 'auto', display: 'block', maxHeight: 320 }}
          >
            <defs>
              <marker
                id="pr-arrowhead"
                markerWidth="8"
                markerHeight="6"
                refX="7"
                refY="3"
                orient="auto"
              >
                <polygon points="0 0, 8 3, 0 6" fill={t.textMuted} />
              </marker>
              <marker
                id="pr-arrowhead-active"
                markerWidth="8"
                markerHeight="6"
                refX="7"
                refY="3"
                orient="auto"
              >
                <polygon points="0 0, 8 3, 0 6" fill={t.accentPrimary} />
              </marker>
            </defs>

            {/* Edges */}
            {/* A -> B (Out of A: 1/2) */}
            <path
              d="M 175 65 L 305 65"
              stroke={t.border}
              strokeWidth="2"
              markerEnd="url(#pr-arrowhead)"
            />
            <text x="240" y="55" fill={t.textMuted} fontSize="11" textAnchor="middle" fontFamily="monospace">
              1/2
            </text>

            {/* A -> C (Out of A: 1/2) */}
            <path
              d="M 160 88 L 220 170"
              stroke={t.border}
              strokeWidth="2"
              markerEnd="url(#pr-arrowhead)"
            />
            <text x="175" y="140" fill={t.textMuted} fontSize="11" textAnchor="middle" fontFamily="monospace">
              1/2
            </text>

            {/* B -> C (Out of B: 1/1) */}
            <path
              d="M 320 88 L 260 170"
              stroke={t.border}
              strokeWidth="2"
              markerEnd="url(#pr-arrowhead)"
            />
            <text x="305" y="140" fill={t.textMuted} fontSize="11" textAnchor="middle" fontFamily="monospace">
              1
            </text>

            {/* C -> A (Out of C: 1/1, curved left) */}
            <path
              d="M 215 180 C 130 180, 100 120, 125 90"
              fill="none"
              stroke={t.accentPrimary}
              strokeWidth="2"
              markerEnd="url(#pr-arrowhead-active)"
            />
            <text x="110" y="150" fill={t.accentPrimary} fontSize="11" textAnchor="middle" fontFamily="monospace" fontWeight="bold">
              1
            </text>

            {/* D -> C (Out of D: 1/1) */}
            <path
              d="M 90 195 L 200 195"
              stroke={t.border}
              strokeWidth="2"
              markerEnd="url(#pr-arrowhead)"
            />
            <text x="145" y="188" fill={t.textMuted} fontSize="11" textAnchor="middle" fontFamily="monospace">
              1
            </text>

            {/* Nodes */}
            {WORKED_PAGERANK_GRAPH.nodes.map((node) => {
              const { x, y } = NODE_COORDINATES[node];
              const score = currentScores[node] || 0;
              // Scale radius between 22 and 36 based on score
              const radius = Math.max(22, Math.min(36, 20 + score * 40));
              const isHighlight = score >= 0.3;

              return (
                <g key={node} style={{ transition: 'all 0.2s ease' }}>
                  <circle
                    cx={x}
                    cy={y}
                    r={radius}
                    fill={isHighlight ? `${t.accentPrimary}25` : t.surface}
                    stroke={isHighlight ? t.accentPrimary : t.border}
                    strokeWidth={isHighlight ? 2.5 : 1.5}
                  />
                  <text
                    x={x}
                    y={y - 4}
                    fill={isHighlight ? t.accentPrimary : t.textPrimary}
                    fontSize="14"
                    fontWeight="800"
                    textAnchor="middle"
                  >
                    Node {node}
                  </text>
                  <text
                    x={x}
                    y={y + 12}
                    fill={t.textSecondary}
                    fontSize="11"
                    fontFamily="monospace"
                    fontWeight="600"
                    textAnchor="middle"
                  >
                    {score.toFixed(4)}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Numerical Breakdown Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: SPACING.sm,
          }}
        >
          {WORKED_PAGERANK_GRAPH.nodes.map((node) => {
            const score = currentScores[node] || 0;
            const inList = inNeighbors[node] || [];
            return (
              <div
                key={node}
                style={{
                  background: t.surface,
                  borderRadius: RADIUS.sm,
                  border: `1px solid ${t.border}`,
                  padding: SPACING.sm,
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 700, color: t.textPrimary }}>
                  Page {node}
                </div>
                <div
                  style={{
                    fontSize: 16,
                    fontFamily: 'monospace',
                    fontWeight: 800,
                    color: t.accentPrimary,
                    margin: '4px 0',
                  }}
                >
                  {score.toFixed(4)}
                </div>
                <div style={{ fontSize: 10, color: t.textMuted }}>
                  In: {inList.length > 0 ? inList.join(', ') : 'None'} (L_out={outDegrees[node]})
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </VisualizationContainer>
  );
}
