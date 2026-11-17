import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, VisualizationHeader, PillSelect } from '../primitives';
import { SketchRect } from '../../components/notebook/RoughShape';

export function VectorSpaceArrowsDiagram() {
  const t = useVizTokens();
  const [highlighted, setHighlighted] = useState<string>('all');

  const width = 680;
  const height = 340;
  const originX = 110;
  const originY = 275;
  const scaleX = 850;
  const scaleY = 750;

  const toSvg = (x: number, y: number) => ({
    x: originX + x * scaleX,
    y: originY - y * scaleY,
  });

  return (
    <VisualizationContainer
      title="The Vector Space Model: Documents as Directional Arrows"
      footer={"D1 and D3 point the same way because each spends a quarter of its words on \"machine\" and a quarter on \"learning\". D2 leans up: it says \"learning\" twice."}
    >
      <VisualizationHeader
        eyebrow="Picture it"
        title="Each document is an arrow"
        description="Pick a document to highlight its arrow. Direction shows which words it uses most."
      />

      <div style={{ marginTop: 8, marginBottom: 12 }}>
        <PillSelect
          label="Highlight document"
          value={highlighted}
          onChange={setHighlighted}
          options={[
            { value: 'all', label: 'All documents' },
            { value: 'd1', label: 'D1 ("machine learning...")' },
            { value: 'd3', label: 'D3 ("improves search")' },
            { value: 'd2', label: 'D2 ("deep learning...")' },
            { value: 'd4', label: 'D4 ("cooking food...")' },
          ]}
        />
      </div>

      <svg
        width="100%"
        viewBox={`0 0 ${width} ${height}`}
        style={{
          minWidth: width,
          display: 'block',
          border: `1.5px solid ${t.border}`,
          borderRadius: '255px 15px 225px 15px/15px 225px 15px 255px',
          background: t.surface,
        }}
        role="img"
        aria-label="Vector Space Diagram showing document arrows plotted against Term Frequency axes for machine and learning"
      >
        <defs>
          <marker id="arrow-d1" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 1 L 10 5 L 0 9 z" fill={t.accentPrimary} />
          </marker>
          <marker id="arrow-d3" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 1 L 10 5 L 0 9 z" fill={t.accentSecondary} />
          </marker>
          <marker id="arrow-d2" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 1 L 10 5 L 0 9 z" fill={t.accentPurple} />
          </marker>
          <marker id="arrow-axis" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 1 L 10 5 L 0 9 z" fill={t.textPrimary} />
          </marker>
        </defs>

        {/* Grid lines */}
        {[0.1, 0.2, 0.3].map((val) => {
          const ptX = toSvg(val, 0);
          const ptY = toSvg(0, val);
          return (
            <g key={val} opacity={0.35}>
              <line x1={ptX.x} y1={originY} x2={ptX.x} y2={originY - 0.35 * scaleY} stroke={t.border} strokeDasharray="3 3" />
              <line x1={originX} y1={ptY.y} x2={originX + 0.38 * scaleX} y2={ptY.y} stroke={t.border} strokeDasharray="3 3" />
              <text x={ptX.x} y={originY + 16} fill={t.textMuted} fontSize={14} fontFamily="'Kalam', cursive" textAnchor="middle">
                {val.toFixed(1)}
              </text>
              <text x={originX - 10} y={ptY.y + 4} fill={t.textMuted} fontSize={14} fontFamily="'Kalam', cursive" textAnchor="end">
                {val.toFixed(1)}
              </text>
            </g>
          );
        })}

        {/* Coordinate Axes */}
        <line x1={originX} y1={originY} x2={originX + 340} y2={originY} stroke={t.textPrimary} strokeWidth={2} markerEnd="url(#arrow-axis)" />
        <line x1={originX} y1={originY} x2={originX} y2={originY - 245} stroke={t.textPrimary} strokeWidth={2} markerEnd="url(#arrow-axis)" />

        {/* Axis Labels */}
        <text x={originX + 340} y={originY + 48} fill={t.textPrimary} fontSize={14} fontFamily="'Kalam', cursive" fontWeight={700} textAnchor="end">
          TF("machine", d) →
        </text>
        <text x={34} y={originY - 120} transform={`rotate(-90 34 ${originY - 120})`} fill={t.textPrimary} fontSize={14} fontFamily="'Kalam', cursive" fontWeight={700} textAnchor="middle">
          TF("learning", d) →
        </text>


        {/* Document Arrows */}
        {/* D4 dot at origin */}
        {(highlighted === 'all' || highlighted === 'd4') && (
          <g opacity={highlighted === 'all' || highlighted === 'd4' ? 1 : 0.2}>
            <circle cx={originX} cy={originY} r={6} fill={t.textMuted} />
            <text x={originX + 8} y={originY + 34} fill={t.textMuted} fontSize={14} fontFamily="'Kalam', cursive" fontWeight={700}>
              D4 at (0, 0)
            </text>
          </g>
        )}

        {/* D2 Arrow */}
        {(() => {
          const pt = toSvg(0.143, 0.286);
          const isDim = highlighted !== 'all' && highlighted !== 'd2';
          return (
            <g style={{ opacity: isDim ? 0.15 : 1, transition: 'opacity 0.2s' }}>
              <line x1={originX} y1={originY} x2={pt.x} y2={pt.y} stroke={t.accentPurple} strokeWidth={3} markerEnd="url(#arrow-d2)" />
              <circle cx={pt.x} cy={pt.y} r={4} fill={t.accentPurple} />
              <text x={pt.x - 8} y={pt.y - 10} fill={t.accentPurple} fontSize={14} fontFamily="'Kalam', cursive" fontWeight={700}>
                D2 (0.14, 0.29)
              </text>
            </g>
          );
        })()}

        {/* D1 Arrow */}
        {(() => {
          const pt = toSvg(0.25, 0.25);
          const isDim = highlighted !== 'all' && highlighted !== 'd1' && highlighted !== 'd3';
          return (
            <g style={{ opacity: isDim ? 0.15 : 1, transition: 'opacity 0.2s' }}>
              <line x1={originX} y1={originY} x2={pt.x} y2={pt.y} stroke={t.accentPrimary} strokeWidth={3} markerEnd="url(#arrow-d1)" />
              <circle cx={pt.x} cy={pt.y} r={4} fill={t.accentPrimary} />
              <text x={pt.x + 12} y={pt.y + 4} fill={t.accentPrimary} fontSize={14} fontFamily="'Kalam', cursive" fontWeight={700}>
                D1 &amp; D3 (0.25, 0.25)
              </text>
              <text x={pt.x + 12} y={pt.y + 24} fill={t.textSecondary} fontSize={14} fontFamily="'Kalam', cursive">
                same direction (45°)
              </text>
            </g>
          );
        })()}

        {/* Diagonal 45 deg guide */}
        <line x1={originX} y1={originY} x2={originX + 0.32 * scaleX} y2={originY - 0.32 * scaleY} stroke={t.accentWarn} strokeDasharray="4 4" strokeWidth={1} opacity={0.6} />
        <text x={originX + 0.32 * scaleX + 8} y={originY - 0.32 * scaleY + 4} fill={t.accentWarn} fontSize={14} fontFamily="'Kalam', cursive">
          45° line of balance
        </text>

        {/* Notes callout card in top right */}
        <g transform="translate(452, 150)">
          <SketchRect x={0} y={0} width={218} height={96} color={t.border} roughness={1.2} strokeWidth={1.2} />
          <text x={12} y={22} fill={t.textPrimary} fontSize={14} fontFamily="'Kalam', cursive" fontWeight={700}>
            What to notice:
          </text>
          <text x={12} y={40} fill={t.textSecondary} fontSize={14} fontFamily="'Kalam', cursive">
            • Direction = topic balance
          </text>
          <text x={12} y={58} fill={t.textSecondary} fontSize={14} fontFamily="'Kalam', cursive">
            • D1 and D3 overlap perfectly
          </text>
          <text x={12} y={76} fill={t.textSecondary} fontSize={14} fontFamily="'Kalam', cursive">
            • Length = how often
          </text>
        </g>
      </svg>
    </VisualizationContainer>
  );
}

export default VectorSpaceArrowsDiagram;
