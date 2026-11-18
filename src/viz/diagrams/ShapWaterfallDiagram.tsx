import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE } from './diagramSystem';

// The same Shapley values from ShapleyCoalitionDiagram (baseline 50,
// income +23, credit_score +11.5, age +5.5, final 90), presented the way
// a real SHAP library actually renders them: a per-prediction waterfall,
// each feature's contribution stacked in order of |contribution|.
const BASELINE = 50;
const CONTRIBUTIONS = [
  { feature: 'income', value: 23, colorKey: 'accentPrimary' as const },
  { feature: 'credit_score', value: 11.5, colorKey: 'accentWarn' as const },
  { feature: 'age', value: 5.5, colorKey: 'accentSecondary' as const },
];

export default function ShapWaterfallDiagram() {
  const t = useVizTokens();
  const { value: autoIdx } = useAutoCycle(CONTRIBUTIONS.length, 2400);
  const [userHovered, setUserHovered] = useState<number | null>(null);
  const hovered = userHovered ?? autoIdx;
  const final = BASELINE + CONTRIBUTIONS.reduce((a, c) => a + c.value, 0);

  const width = 560;
  const height = 200;
  const scaleMin = 40;
  const scaleMax = 95;
  const plotLeft = 20;
  const plotRight = width - 20;
  const xFor = (val: number) => plotLeft + ((val - scaleMin) / (scaleMax - scaleMin)) * (plotRight - plotLeft);

  let cursor = BASELINE;
  const bars = CONTRIBUTIONS.map((c, i) => {
    const start = cursor;
    cursor += c.value;
    return { ...c, start, end: cursor, index: i };
  });

  const barY = 60;
  const barH = 34;

  return (
    <VisualizationContainer footer="Every bar's width is a real Shapley value from the coalition-averaging diagram above -- baseline (average prediction) plus each feature's signed contribution lands exactly on this instance's actual prediction, 90.">
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
        {/* axis */}
        <line x1={plotLeft} y1={height - 30} x2={plotRight} y2={height - 30} stroke={t.border} strokeWidth={1} />
        {[40, 50, 60, 70, 80, 90].map((tick) => (
          <g key={tick}>
            <line x1={xFor(tick)} y1={height - 34} x2={xFor(tick)} y2={height - 26} stroke={t.border} strokeWidth={1} />
            <text x={xFor(tick)} y={height - 12} textAnchor="middle" fontSize={10} fill={t.textMuted}>{tick}</text>
          </g>
        ))}

        {/* baseline marker */}
        <line x1={xFor(BASELINE)} y1={20} x2={xFor(BASELINE)} y2={height - 30} stroke={t.textMuted} strokeWidth={1.5} strokeDasharray="4 3" />
        <text x={xFor(BASELINE)} y={16} textAnchor="middle" fontSize={11} fill={t.textMuted}>baseline {BASELINE}</text>

        {/* final marker */}
        <line x1={xFor(final)} y1={20} x2={xFor(final)} y2={height - 30} stroke={t.accentPrimary} strokeWidth={1.5} strokeDasharray="4 3" />
        <text x={xFor(final)} y={16} textAnchor="middle" fontSize={11} fontWeight={700} fill={t.accentPrimary}>prediction {final}</text>

        {bars.map((b) => {
          const isHovered = hovered === b.index;
          const color = t[b.colorKey];
          const x1 = xFor(b.start);
          const x2 = xFor(b.end);
          return (
            <g key={b.feature} onMouseEnter={() => setUserHovered(b.index)} onMouseLeave={() => setUserHovered(null)} style={{ cursor: 'pointer' }}>
              <rect x={Math.min(x1, x2)} y={barY} width={Math.abs(x2 - x1)} height={barH} fill={color} fillOpacity={isHovered ? 0.95 : 0.75} stroke={color} strokeWidth={isHovered ? 2 : 1} />
              <text x={(x1 + x2) / 2} y={barY + barH / 2 + 4} textAnchor="middle" fontSize={11} fontWeight={700} fill={t.background}>
                {b.value > 0 ? '+' : ''}{b.value}
              </text>
              <text x={(x1 + x2) / 2} y={barY - 8} textAnchor="middle" fontSize={10} fill={isHovered ? color : t.textMuted} fontWeight={isHovered ? 700 : 400}>
                {b.feature}
              </text>
            </g>
          );
        })}
      </svg>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted }}>
        {BASELINE} + 23 (income) + 11.5 (credit_score) + 5.5 (age) = {final} — this is what a SHAP waterfall/force plot shows for one specific prediction, not the model overall.
      </div>
    </VisualizationContainer>
  );
}
