import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, Slider, VisualizationMath } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';
import { BM25_DEFAULT_K1 as K1, bm25TermFrequencySaturation } from '../lib/bm25';
import { SketchArrow, SketchEllipse, SketchPath } from '../../components/notebook/RoughShape';

/** BM25's saturation curve, made draggable: raw term frequency keeps
 * climbing, but the (k1+1)*tf / (k1+tf) term it's wrapped in flattens out
 * fast -- the 5th occurrence barely moves the score above the 1st few.
 * See src/viz/lib/bm25.ts for the computation and its unit tests. */
export default function Bm25ScoringDiagram() {
  const t = useVizTokens();
  const [tf, setTf] = useState(5);
  const color = getConceptColor(t, 'attention');
  const saturated = bm25TermFrequencySaturation(tf, K1);
  const maxSaturated = K1 + 1;

  const width = 560;
  const height = 160;
  const chartLeft = 40;
  const chartRight = width - 20;
  const chartTop = 15;
  const chartBottom = 120;
  const maxTf = 15;
  const xFor = (v: number) => chartLeft + (v / maxTf) * (chartRight - chartLeft);
  const yForRaw = (v: number) => chartBottom - (v / maxTf) * (chartBottom - chartTop);
  const yForSat = (v: number) => chartBottom - (v / maxSaturated) * (chartBottom - chartTop);

  const rawPath = Array.from({ length: maxTf + 1 }, (_, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i)},${yForRaw(i)}`).join(' ');
  const satPath = Array.from({ length: maxTf + 1 }, (_, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i)},${yForSat(bm25TermFrequencySaturation(i, K1))}`).join(' ');

  return (
    <VisualizationContainer footer="Raw term frequency (dashed) keeps climbing linearly. BM25's saturated term (solid) flattens fast toward k1+1 -- exactly the correction that stops a document from scoring 10x higher just for repeating a word 10x.">
      <Slider label={`term frequency (tf) = ${tf}`} min={0} max={maxTf} step={1} value={tf} onChange={setTf} />
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block', marginTop: 6 }}>
        <SketchArrow points={[[chartLeft, chartBottom], [chartRight, chartBottom]]} color={t.border} strokeWidth={1} arrowhead={false} roughness={1.2} id="bm25-axis-x" />
        <SketchArrow points={[[chartLeft, chartTop], [chartLeft, chartBottom]]} color={t.border} strokeWidth={1} arrowhead={false} roughness={1.2} id="bm25-axis-y" />
        <SketchPath d={rawPath} color={t.textMuted} strokeWidth={1.5} roughness={1.3} id="bm25-raw-curve" />
        <SketchPath d={satPath} color={color} strokeWidth={2.5} roughness={1.3} id="bm25-sat-curve" />
        <SketchArrow points={[[xFor(tf), chartTop], [xFor(tf), chartBottom]]} color={t.textMuted} strokeWidth={1} arrowhead={false} roughness={1.4} id="bm25-guide" />
        <SketchEllipse cx={xFor(tf)} cy={yForSat(saturated)} width={9} height={9} color={color} fillColor={color} roughness={1} id="bm25-dot" />
        <text x={chartLeft} y={chartTop - 4} fontSize={9} fill={t.textMuted}>score contribution</text>
        <text x={chartRight} y={chartBottom + 16} textAnchor="end" fontSize={9} fill={t.textMuted}>tf →</text>
      </svg>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color, fontWeight: 700, marginTop: 4 }}>
        (k1+1)·tf / (k1+tf) = {saturated.toFixed(2)} — approaching the ceiling of k1+1 = {maxSaturated.toFixed(1)}
      </div>
      <div style={{ marginTop: 8, textAlign: 'center' }}>
        <VisualizationMath latex="\text{score}(t,d) = \text{IDF}(t) \cdot \frac{(k_1+1)\, \text{tf}}{k_1 + \text{tf}}" />
      </div>
    </VisualizationContainer>
  );
}
