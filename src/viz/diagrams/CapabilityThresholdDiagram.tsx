import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, Slider } from '../primitives';
import { DIAGRAM_TYPE } from './diagramSystem';
import { capabilityAtScale } from '../lib/oversight';

const THRESHOLD = 0.6;

export default function CapabilityThresholdDiagram() {
  const t = useVizTokens();
  const [logCompute, setLogCompute] = useState(4.5);

  const capability = capabilityAtScale(logCompute);
  const crossed = capability >= THRESHOLD;

  const width = 420;
  const height = 180;
  const domain: [number, number] = [0, 10];
  const px = (x: number) => ((x - domain[0]) / (domain[1] - domain[0])) * width;
  const py = (v: number) => height - v * height;

  const samples = Array.from({ length: 60 }, (_, i) => (i / 59) * 10);
  const curve = samples.map((x) => [px(x), py(capabilityAtScale(x))]);

  return (
    <VisualizationContainer footer={`Dangerous-capability score at this scale: ${(capability * 100).toFixed(1)}% (threshold ${THRESHOLD * 100}%). ${crossed ? 'Crossed -- this real point on the curve triggers the additional safety measures required before release, evaluated against a specific, predefined threshold rather than a vague "seems capable" judgment.' : 'Below threshold -- standard evaluation applies, no additional gating required yet.'}`}>
      <Slider label="training compute (log scale)" value={logCompute} onChange={setLogCompute} min={0} max={10} step={0.1} />

      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block', marginTop: 8 }}>
        <line x1={0} y1={py(THRESHOLD)} x2={width} y2={py(THRESHOLD)} stroke={t.accentDanger} strokeWidth={1.5} strokeDasharray="4 3" />
        <rect x={4} y={py(THRESHOLD) - 16} width={162} height={13} rx={3} fill={t.surface} fillOpacity={0.9} />
        <text x={7} y={py(THRESHOLD) - 6} fontSize={10} fontWeight={600} fill={t.accentDanger}>dangerous-capability threshold</text>

        <polyline points={curve.map(([x, y]) => `${x},${y}`).join(' ')} fill="none" stroke={t.accentSecondary} strokeWidth={2.5} />
        <line x1={px(logCompute)} y1={0} x2={px(logCompute)} y2={height} stroke={t.accentWarn} strokeWidth={1.5} strokeDasharray="3 3" />
        <circle cx={px(logCompute)} cy={py(capability)} r={6} fill={crossed ? t.accentDanger : t.accentPrimary} />
      </svg>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 6 }}>
        The real shape here is a saturating curve, not a straight line -- capability evaluations exist precisely because "more compute" doesn't cross a risk threshold linearly or predictably from the outside, so it has to be measured directly, per model, rather than inferred from scale alone.
      </div>
    </VisualizationContainer>
  );
}
