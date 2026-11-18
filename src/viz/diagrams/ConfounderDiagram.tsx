import { useMemo, useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, PillSelect, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE } from './diagramSystem';
import { confounderSimulation, pearsonR } from '../lib/probstat';

type Mode = 'obs' | 'rct';
const MODES: Mode[] = ['obs', 'rct'];

export default function ConfounderDiagram() {
  const t = useVizTokens();
  const { value: autoIdx } = useAutoCycle(MODES.length, 3400);
  const [userMode, setUserMode] = useState<Mode | null>(null);
  const mode = userMode ?? MODES[autoIdx];

  const { obs, rct } = useMemo(() => confounderSimulation(5, 120), []);
  const data = mode === 'obs' ? obs : rct;
  const r = useMemo(() => pearsonR(data.map((d) => d.x), data.map((d) => d.y)), [data]);

  const width = 300, height = 260, scale = 40, ox = width / 2, oy = height / 2;
  const px = (x: number) => ox + x * scale;
  const py = (y: number) => oy - y * scale;

  return (
    <VisualizationContainer footer={
      mode === 'obs'
        ? `Observational data: real Pearson r = ${r.toFixed(3)} between X and Y -- looks like a real relationship. But both X and Y were secretly generated from a shared confounder Z, with NO direct causal link between them at all. This is the ice-cream-sales-and-drownings pattern, made numeric.`
        : `Same underlying confounder Z still present, but X is now randomly assigned (a real RCT) -- real Pearson r = ${r.toFixed(3)}, collapsed toward the tiny real causal effect (0.1) that's actually there. Randomization breaks Z's influence on X, which is precisely what makes an RCT's correlation trustworthy as causation where the observational one wasn't.`
    }>
      <PillSelect label="Data source" value={mode} onChange={(v) => setUserMode(v as Mode)} options={[
        { value: 'obs', label: 'Observational (confounded)' },
        { value: 'rct', label: 'RCT (randomized)' },
      ]} />

      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block', marginTop: 8, maxWidth: 300, margin: '8px auto 0' }}>
        <line x1={0} y1={oy} x2={width} y2={oy} stroke={t.border} strokeWidth={1} />
        <line x1={ox} y1={0} x2={ox} y2={height} stroke={t.border} strokeWidth={1} />
        {data.map((d, i) => (
          <circle key={i} cx={px(d.x)} cy={py(d.y)} r={3.5} fill={t.accentPrimary} fillOpacity={0.6} />
        ))}
      </svg>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted }}>
        Real |r|={Math.abs(r).toFixed(3)} -- same plotting code, same confounder Z in the background, only how X got its value differs.
      </div>
    </VisualizationContainer>
  );
}
