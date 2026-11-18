import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, useAutoCycle } from '../primitives';
import { FlowDots } from '../primitives/LiveFlow';
import { getConceptColor } from './diagramSystem';

const RUNS = [
  { key: 'a', label: 'run-a (lr=0.01)', color: 'query' as const, final: 0.42 },
  { key: 'b', label: 'run-b (lr=0.001)', color: 'attention' as const, final: 0.31 },
  { key: 'c', label: 'run-c (lr=0.1)', color: 'key' as const, final: 0.68 },
];

function lossCurve(finalLoss: number, noise: number) {
  return Array.from({ length: 30 }, (_, i) => {
    const decay = 2.0 * Math.exp(-i / 8) + finalLoss;
    return decay + Math.sin(i * noise) * 0.02;
  });
}

/** Loss curves for 3 runs, overlaid -- click a run to highlight it. This
 * is the entire point of tracking metrics over TIME, not just a final
 * number. */
export default function RunComparisonChartDiagram() {
  const t = useVizTokens();
  const { value: activeIndex, pick } = useAutoCycle(RUNS.length, 3400, 2);
  const highlighted = RUNS[activeIndex].key;
  const width = 480;
  const height = 130;
  const chartTop = 10;
  const chartBottom = 110;
  const maxLoss = 2.2;
  const xFor = (i: number) => 40 + (i / 29) * (width - 60);
  const yFor = (l: number) => chartBottom - (l / maxLoss) * (chartBottom - chartTop);

  return (
    <VisualizationContainer footer={`${RUNS.find((r) => r.key === highlighted)!.label}: converges to ${RUNS.find((r) => r.key === highlighted)!.final.toFixed(2)} final loss. Comparing curves, not just endpoints, shows HOW each run got there -- run-c's high learning rate overshoots before settling, invisible from the final number alone.`}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
        {RUNS.map((r, idx) => {
          const c = getConceptColor(t, r.color);
          const isActive = highlighted === r.key;
          return (
            <div key={r.key} onClick={() => pick(idx)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(idx); } }} onMouseEnter={() => pick(idx)} style={{ cursor: 'pointer', padding: '4px 10px', borderRadius: 6, fontSize: 10, fontWeight: isActive ? 700 : 500, background: isActive ? `${c}20` : t.surfaceAlt, border: `1.25px solid ${isActive ? c : t.border}`, color: isActive ? c : t.textSecondary, transition: 'all 200ms ease' }}>
              {r.label}
            </div>
          );
        })}
      </div>
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
        <line x1={40} y1={chartBottom} x2={width - 20} y2={chartBottom} stroke={t.border} strokeWidth={1} />
        <line x1={40} y1={chartTop} x2={40} y2={chartBottom} stroke={t.border} strokeWidth={1} />
        {RUNS.map((r) => {
          const c = getConceptColor(t, r.color);
          const isActive = highlighted === r.key;
          const curve = lossCurve(r.final, r.key === 'a' ? 0.5 : r.key === 'b' ? 0.7 : 0.3);
          const path = curve.map((l, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i)},${yFor(l)}`).join(' ');
          return (
            <g key={r.key}>
              <path d={path} fill="none" stroke={c} strokeWidth={isActive ? 2.5 : 1.25} opacity={isActive ? 1 : 0.3} style={{ transition: 'stroke-width 200ms ease, opacity 200ms ease' }} />
              {isActive && <FlowDots d={path} color={c} dur={2.2} count={4} r={3} />}
            </g>
          );
        })}
        <text x={40} y={chartTop - 2} fontSize={8} fill={t.textMuted}>loss</text>
        <text x={width - 20} y={chartBottom + 14} textAnchor="end" fontSize={8} fill={t.textMuted}>epoch →</text>
      </svg>
    </VisualizationContainer>
  );
}
