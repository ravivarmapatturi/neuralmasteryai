import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, VisualizationHeader, Slider, VisualizationMath } from '../primitives';
import { SketchRect } from '../../components/notebook/RoughShape';

export function CosineAngleDiagram() {
  const t = useVizTokens();
  const [angleDeg, setAngleDeg] = useState<number>(30);

  const rad = (angleDeg * Math.PI) / 180;
  const cosVal = Math.cos(rad);

  const width = 520;
  const height = 300;
  const ox = 110;
  const oy = 230;
  const len = 150;

  // Fixed Query vector along horizontal line
  const qx = ox + len;
  const qy = oy;

  // Document vector rotated by angleDeg counterclockwise
  const dx = ox + len * Math.cos(rad);
  const dy = oy - len * Math.sin(rad);

  // Arc path for angle theta
  const arcRadius = 55;
  const arcX = ox + arcRadius * Math.cos(rad);
  const arcY = oy - arcRadius * Math.sin(rad);
  const arcPath = `M ${ox + arcRadius} ${oy} A ${arcRadius} ${arcRadius} 0 0 0 ${arcX.toFixed(1)} ${arcY.toFixed(1)}`;

  return (
    <VisualizationContainer
      title="Cosine Similarity: Measuring the Angle Between Vector Arrows"
      footer={
        `At angle θ = ${angleDeg}°, cos(θ) = ${cosVal.toFixed(4)}. ` +
        (angleDeg === 0
          ? "When θ = 0°, cos(0°) = 1.000: the two arrows point in the identical direction (maximum possible similarity)."
          : angleDeg === 90
          ? "When θ = 90°, cos(90°) = 0.000: the vectors are orthogonal, meaning they share zero common vocabulary terms."
          : `As the angle widens from 0° to 90°, similarity drops from 1.0 down to 0.0 regardless of how long either document is.`)
      }
    >
      <VisualizationHeader
        eyebrow="Angle-based relevance"
        title="Cosine Angle Between Query &amp; Document Vectors"
        description="Drag the slider to adjust angle θ between the query and document arrows. Observe how cosine similarity depends strictly on direction, not document length."
      />

      <div style={{ marginTop: 8, marginBottom: 12, maxWidth: 360 }}>
        <Slider
          label="Angle θ (degrees)"
          value={angleDeg}
          onChange={setAngleDeg}
          min={0}
          max={90}
          step={5}
          format={(v) => `${v}° (cos = ${Math.cos((v * Math.PI) / 180).toFixed(3)})`}
        />
      </div>

      <svg
        width="100%"
        viewBox={`0 0 ${width} ${height}`}
        style={{
          display: 'block',
          border: `1.5px solid ${t.border}`,
          borderRadius: '255px 15px 225px 15px/15px 225px 15px 255px',
          background: t.surface,
        }}
        role="img"
        aria-label="Cosine angle visualizer showing query vector q and document vector d with angle theta"
      >
        <defs>
          <marker id="arrow-q" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 1 L 10 5 L 0 9 z" fill={t.accentPrimary} />
          </marker>
          <marker id="arrow-d" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 1 L 10 5 L 0 9 z" fill={t.accentSecondary} />
          </marker>
        </defs>

        {/* Faint right-angle guide */}
        <line x1={ox} y1={oy} x2={ox} y2={oy - len - 10} stroke={t.border} strokeDasharray="3 3" opacity={0.4} />
        <line x1={ox} y1={oy} x2={ox + len + 20} y2={oy} stroke={t.border} strokeDasharray="3 3" opacity={0.4} />

        {/* Angle Arc */}
        {angleDeg > 0 && (
          <g>
            <path d={arcPath} fill="none" stroke={t.accentWarn} strokeWidth={2} />
            <text
              x={ox + arcRadius + 10}
              y={oy - 12}
              fill={t.accentWarn}
              fontSize={14}
              fontFamily="'Kalam', cursive"
              fontWeight={700}
            >
              θ = {angleDeg}°
            </text>
          </g>
        )}

        {/* Query Vector q */}
        <line x1={ox} y1={oy} x2={qx} y2={qy} stroke={t.accentPrimary} strokeWidth={3.5} markerEnd="url(#arrow-q)" />
        <circle cx={ox} cy={oy} r={4} fill={t.textPrimary} />
        <text x={qx + 10} y={qy + 5} fill={t.accentPrimary} fontSize={15} fontFamily="'Kalam', cursive" fontWeight={700}>
          q (Query)
        </text>

        {/* Document Vector d */}
        <line x1={ox} y1={oy} x2={dx} y2={dy} stroke={t.accentSecondary} strokeWidth={3.5} markerEnd="url(#arrow-d)" />
        <text x={dx + 8} y={dy - 6} fill={t.accentSecondary} fontSize={15} fontFamily="'Kalam', cursive" fontWeight={700}>
          d (Document)
        </text>

        {/* Origin Label */}
        <text x={ox - 24} y={oy + 18} fill={t.textMuted} fontSize={12} fontFamily="'Kalam', cursive">
          (0,0)
        </text>

        {/* Formula & Live Calculation Sketch Box */}
        <g transform="translate(290, 20)">
          <SketchRect x={0} y={0} width={215} height={145} color={t.border} roughness={1.3} strokeWidth={1.4} />
          <text x={14} y={24} fill={t.textPrimary} fontSize={13} fontFamily="'Kalam', cursive" fontWeight={700}>
            Live Cosine Calculation:
          </text>
          <text x={14} y={50} fill={t.accentSecondary} fontSize={22} fontFamily="'Kalam', cursive" fontWeight={800}>
            cos({angleDeg}°) = {cosVal.toFixed(3)}
          </text>
          <text x={14} y={75} fill={t.textSecondary} fontSize={12} fontFamily="'Kalam', cursive">
            {angleDeg === 0
              ? '★ Perfect match (identical direction)'
              : angleDeg === 90
              ? '✕ Orthogonal (zero shared words)'
              : angleDeg <= 45
              ? '✔ Strong directional overlap'
              : '▲ Weak directional overlap'}
          </text>
          <line x1={14} y1={90} x2={200} y2={90} stroke={t.border} opacity={0.4} />
          <text x={14} y={110} fill={t.textMuted} fontSize={11} fontFamily="'Kalam', cursive">
            Normalized dot product:
          </text>
          <foreignObject x={14} y={115} width={185} height={25}>
            <div style={{ color: t.textPrimary, fontSize: 12 }}>
              <VisualizationMath latex="\cos(\theta) = \frac{\mathbf{q} \cdot \mathbf{d}}{\|\mathbf{q}\| \|\mathbf{d}\|}" display={false} />
            </div>
          </foreignObject>
        </g>
      </svg>
    </VisualizationContainer>
  );
}

export default CosineAngleDiagram;
