import { useMemo } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, Slider, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE } from './diagramSystem';
import { ganRealPdf, ganGenPdf, discriminatorCurve } from '../lib/generativeModels';

const XMIN = -6, XMAX = 8;
const SAMPLES = 80;

/** A real toy 1D GAN: fixed real data distribution, a generator
 * distribution that closes on it as "training progress" increases, and a
 * discriminator decision curve computed fresh at every progress value --
 * flattening toward 0.5 everywhere exactly as the minimax game predicts
 * at its Nash equilibrium (G matches the data, D can't do better than
 * a coin flip). */
export default function GanMinimaxDiagram() {
  const t = useVizTokens();
  const cycle = useAutoCycle(51, 100);
  const progress = cycle.value / 50;
  const setProgress = (value: number) => cycle.pick(Math.round(value * 50));

  const xs = useMemo(() => Array.from({ length: SAMPLES }, (_, i) => XMIN + (i / (SAMPLES - 1)) * (XMAX - XMIN)), []);
  const realPdf = useMemo(() => xs.map(ganRealPdf), [xs]);
  const genPdf = useMemo(() => xs.map((x) => ganGenPdf(x, progress)), [xs, progress]);
  const dCurve = useMemo(() => xs.map((x) => discriminatorCurve(x, progress)), [xs, progress]);

  const width = 420, height = 190;
  const px = (x: number) => ((x - XMIN) / (XMAX - XMIN)) * width;
  const maxPdf = Math.max(...realPdf, ...genPdf, 0.5);
  const pyPdf = (v: number) => height - (v / maxPdf) * (height - 40) - 30;
  const pyD = (v: number) => height - v * (height - 30) - 10;

  const path = (ys: number[], py: (v: number) => number) => xs.map((x, i) => `${px(x)},${py(ys[i])}`).join(' ');

  const converged = progress > 0.92;

  return (
    <VisualizationContainer footer="Real Gaussian PDFs and a real logistic discriminator curve, recomputed at every training-progress value. Push progress to 100%: the generator's distribution lands on the real one, and D(x) flattens to ~0.5 everywhere -- it can no longer tell real from fake, exactly the Nash equilibrium the minimax objective predicts.">
      <Slider label={`training progress = ${(progress * 100).toFixed(0)}%`} value={progress} onChange={setProgress} min={0} max={1} step={0.02} />

      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block', marginTop: 8 }}>
        <line x1={0} y1={height - 10} x2={width} y2={height - 10} stroke={t.border} strokeWidth={1} />
        <polyline points={path(realPdf, pyPdf)} fill="none" stroke={t.accentPrimary} strokeWidth={2.5} />
        <polyline points={path(genPdf, pyPdf)} fill="none" stroke={t.accentSecondary} strokeWidth={2.5} />
        <polyline points={path(dCurve, pyD)} fill="none" stroke={t.accentWarn} strokeWidth={1.5} strokeDasharray="4 3" />
        <line x1={0} y1={pyD(0.5)} x2={width} y2={pyD(0.5)} stroke={t.textMuted} strokeWidth={1} strokeDasharray="2 3" />
      </svg>

      <div style={{ display: 'flex', justifyContent: 'center', gap: 14, flexWrap: 'wrap', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted }}>
        <span><span style={{ color: t.accentPrimary }}>⬤</span> real data p(x)</span>
        <span><span style={{ color: t.accentSecondary }}>⬤</span> generator G(z) dist.</span>
        <span><span style={{ color: t.accentWarn }}>┄</span> discriminator D(x)</span>
      </div>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: converged ? t.accentPrimary : t.textMuted, fontWeight: converged ? 700 : 400, marginTop: 4 }}>
        {converged ? 'converged: distributions overlap, D(x) ≈ 0.5 everywhere' : 'D still separates real from fake -- G has a useful gradient to follow'}
      </div>
    </VisualizationContainer>
  );
}
