import { useMemo, useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, Slider } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

const N_SAMPLES = 24;
const T_MAX = 10;
const T_CENTER = 5;
const SIGMA = 1.1;
const PEAK_DENSITY = 2.2;
const DELTA = T_MAX / N_SAMPLES;

interface Sample {
  t: number;
  density: number;
  alpha: number;
  transmittance: number;
  contribution: number;
}

/** Real, discretized volume rendering along one ray -- the actual equation
 * a NeRF evaluates at inference time (given a queried density/color per
 * point, which here is a synthetic Gaussian "object" instead of a trained
 * network's output). */
function marchRay(offset: number): Sample[] {
  let transmittance = 1;
  const samples: Sample[] = [];
  for (let i = 0; i < N_SAMPLES; i++) {
    const t = (i + 0.5) * DELTA;
    const density = PEAK_DENSITY * Math.exp(-((offset * offset + (t - T_CENTER) ** 2) / (2 * SIGMA * SIGMA)));
    const alpha = 1 - Math.exp(-density * DELTA);
    const contribution = transmittance * alpha;
    samples.push({ t, density, alpha, transmittance, contribution });
    transmittance *= 1 - alpha;
  }
  return samples;
}

const WIDTH = 460;
const RAY_H = 70;
const BAR_H = 90;

export default function NerfRayMarchingDiagram() {
  const t = useVizTokens();
  const [offset, setOffset] = useState(0);

  const samples = useMemo(() => marchRay(offset), [offset]);
  const finalColorWeight = samples.reduce((s, x) => s + x.contribution, 0);
  const bgWeight = 1 - finalColorWeight;
  const objColor = getConceptColor(t, 'attention');
  const maxDensity = PEAK_DENSITY;

  // Blend object color with background per accumulated weight, for the final pixel swatch.
  const bg = t.mode === 'dark' ? [10, 10, 11] : [255, 255, 255];
  const objRgb = [61, 220, 151]; // approx accentPrimary dark value, fine as a fixed swatch color
  const pixelColor = `rgb(${Math.round(objRgb[0] * finalColorWeight + bg[0] * bgWeight)}, ${Math.round(objRgb[1] * finalColorWeight + bg[1] * bgWeight)}, ${Math.round(objRgb[2] * finalColorWeight + bg[2] * bgWeight)})`;

  return (
    <VisualizationContainer footer={`This ray's accumulated color weight from the object is ${finalColorWeight.toFixed(2)} (vs. ${bgWeight.toFixed(2)} background) -- computed by marching along the ray, querying density at each sample point, and accumulating color weighted by how much light survives to reach that point (transmittance) times how much this point itself absorbs (alpha). A ray straight through the object's center accumulates almost entirely object color; a ray that misses picks up almost none -- exactly what the offset slider demonstrates.`}>
      <Slider label="Ray offset from object center" value={offset} onChange={setOffset} min={-3} max={3} step={0.25} format={(v) => v.toFixed(2)} />

      <div style={{ display: 'flex', gap: 20, alignItems: 'center', marginTop: 8, flexWrap: 'wrap' }}>
        <svg width={WIDTH - 100} height={RAY_H} viewBox={`0 0 ${WIDTH - 100} ${RAY_H}`} className="nm-fit-svg">
          <line x1={10} y1={RAY_H / 2} x2={WIDTH - 120} y2={RAY_H / 2} stroke={t.border} strokeWidth={1.5} />
          <circle cx={10} cy={RAY_H / 2} r={6} fill={t.textSecondary} />
          <text x={10} y={RAY_H / 2 + 20} textAnchor="middle" fontSize={9} fill={t.textMuted}>camera</text>
          {samples.map((s, i) => (
            <circle key={i} cx={10 + (s.t / T_MAX) * (WIDTH - 140)} cy={RAY_H / 2} r={2 + s.contribution * 8} fill={objColor} opacity={0.3 + s.contribution * 3} />
          ))}
        </svg>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 44, height: 44, borderRadius: 8, background: pixelColor, border: `1px solid ${t.border}` }} />
          <div style={{ fontSize: 10, color: t.textMuted, marginTop: 4 }}>final pixel</div>
        </div>
      </div>

      <div style={{ fontSize: DIAGRAM_TYPE.secondaryLabel.size, color: t.textMuted, margin: '10px 0 4px' }}>Density along the ray</div>
      <svg width={WIDTH - 20} height={BAR_H} viewBox={`0 0 ${WIDTH - 20} ${BAR_H}`} className="nm-fit-svg">
        {samples.map((s, i) => (
          <rect
            key={i}
            x={(i / N_SAMPLES) * (WIDTH - 20)}
            y={BAR_H - (s.density / maxDensity) * (BAR_H - 10)}
            width={(WIDTH - 20) / N_SAMPLES - 1}
            height={(s.density / maxDensity) * (BAR_H - 10)}
            fill={objColor}
            opacity={0.7}
          />
        ))}
      </svg>
    </VisualizationContainer>
  );
}
