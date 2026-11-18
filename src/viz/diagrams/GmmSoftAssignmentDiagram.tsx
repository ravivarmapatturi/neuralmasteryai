import { useMemo } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, Slider, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE } from './diagramSystem';
import { generateGmmPoints, trainGmm } from '../lib/clustering';

const POINTS = generateGmmPoints(5);

export default function GmmSoftAssignmentDiagram() {
  const t = useVizTokens();
  const iterationCycle = useAutoCycle(21, 350, 10);
  const iterations = iterationCycle.value;

  const { comps, responsibilities } = useMemo(() => trainGmm(POINTS, iterations, 2), [iterations]);

  const width = 320, height = 220, scale = 65, ox = width / 2, oy = height / 2;
  const px = (x: number) => ox + x * scale;
  const py = (y: number) => oy - y * scale;

  // find the point closest to 50/50 -- the honestly-ambiguous one
  const ambiguousIdx = responsibilities.reduce((best, r, i) => (Math.abs(r[0] - 0.5) < Math.abs(responsibilities[best][0] - 0.5) ? i : best), 0);
  const ambiguous = responsibilities[ambiguousIdx];

  return (
    <VisualizationContainer footer={`Real EM, ${iterations} iterations: component means at (${comps[0].mu[0].toFixed(2)}, ${comps[0].mu[1].toFixed(2)}) and (${comps[1].mu[0].toFixed(2)}, ${comps[1].mu[1].toFixed(2)}). The point sitting closest to the boundary gets real soft membership (${(ambiguous[0] * 100).toFixed(0)}%, ${(ambiguous[1] * 100).toFixed(0)}%) -- honestly reflecting genuine ambiguity, something K-Means' hard 0%/100% assignment structurally can't express.`}>
      <Slider label="EM iterations" value={iterations} onChange={iterationCycle.pick} min={0} max={20} step={1} />

      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block', marginTop: 8, maxWidth: 320, margin: '8px auto 0' }}>
        {POINTS.map((p, i) => {
          const r = responsibilities[i];
          const mix = `color-mix(in srgb, ${t.accentSecondary} ${(r[0] * 100).toFixed(0)}%, ${t.accentWarn})`;
          return <circle key={i} cx={px(p.x)} cy={py(p.y)} r={i === ambiguousIdx ? 7 : 4.5} fill={mix} stroke={i === ambiguousIdx ? t.textPrimary : 'none'} strokeWidth={2} />;
        })}
        {comps.map((c, j) => (
          <circle key={j} cx={px(c.mu[0])} cy={py(c.mu[1])} r={7} fill="none" stroke={j === 0 ? t.accentSecondary : t.accentWarn} strokeWidth={2.5} />
        ))}
      </svg>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 20, fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted }}>
        <span><span style={{ color: t.accentSecondary }}>⬤</span> mostly component 1</span>
        <span><span style={{ color: t.accentWarn }}>⬤</span> mostly component 2</span>
        <span>color blend = real soft membership mix</span>
      </div>
    </VisualizationContainer>
  );
}
