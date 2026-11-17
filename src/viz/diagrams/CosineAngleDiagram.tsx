import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, VisualizationHeader, Slider } from '../primitives';
import { SketchRect } from '../../components/notebook/RoughShape';

export function CosineAngleDiagram() {
  const t = useVizTokens();
  const [angleDeg, setAngleDeg] = useState<number>(30);

  const rad = (angleDeg * Math.PI) / 180;
  const cosVal = Math.cos(rad);

  const width = 680;
  const height = 300;
  const ox = 110;
  const oy = 250;
  const len = 200;

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
          ? "Same direction: the score is 1, the highest it can be."
          : angleDeg === 90
          ? "At right angles: the score is 0, no shared words."
          : "The wider the angle, the lower the score, however long the documents are.")
      }
    >
      <VisualizationHeader
        eyebrow="Try it"
        title="The angle between two arrows"
        description="Drag the slider. The score depends only on the angle, not on how long the arrows are."
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
          minWidth: width,
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
        <text x={ox - 24} y={oy + 18} fill={t.textMuted} fontSize={14} fontFamily="'Kalam', cursive">
          (0,0)
        </text>

        {/* Formula & Live Calculation Sketch Box */}
        <g transform="translate(450, 30)">
          <SketchRect x={0} y={0} width={215} height={158} color={t.border} roughness={1.3} strokeWidth={1.4} />
          <text x={14} y={24} fill={t.textPrimary} fontSize={14} fontFamily="'Kalam', cursive" fontWeight={700}>
            Live score
          </text>
          <text x={14} y={58} fill={t.accentSecondary} fontSize={22} fontFamily="'Kalam', cursive" fontWeight={800}>
            cos({angleDeg}°) = {cosVal.toFixed(3)}
          </text>
          <text x={14} y={86} fill={t.textSecondary} fontSize={14} fontFamily="'Kalam', cursive">
            {angleDeg === 0
              ? '★ Same direction: best match'
              : angleDeg === 90
              ? '✕ Right angle: no shared words'
              : angleDeg <= 45
              ? '✔ Close directions: good match'
              : '▲ Far apart: weak match'}
          </text>
          <line x1={14} y1={100} x2={200} y2={100} stroke={t.border} opacity={0.4} />
          <text x={14} y={120} fill={t.textMuted} fontSize={14} fontFamily="'Kalam', cursive">
            The formula:
          </text>
          <text x={14} y={146} fill={t.textPrimary} fontSize={16} fontFamily="'Kalam', cursive">
            cos θ = (q · d) ÷ (|q| × |d|)
          </text>
        </g>
      </svg>
    </VisualizationContainer>
  );
}

export default CosineAngleDiagram;
