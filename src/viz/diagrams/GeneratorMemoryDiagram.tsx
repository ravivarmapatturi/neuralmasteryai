import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, Slider, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

const ITEM_SIZE_KB = 50; // one example's memory footprint

function listMemoryKb(n: number): number {
  return n * ITEM_SIZE_KB; // every item held in memory simultaneously
}
function generatorMemoryKb(): number {
  return ITEM_SIZE_KB; // only ever the current item
}

const WIDTH = 460;
const HEIGHT = 190;
const PAD_L = 60;
const PAD_B = 30;

const N_PRESETS = [2000, 500, 15000, 8000];

export default function GeneratorMemoryDiagram() {
  const t = useVizTokens();
  const { value: autoIdx, stop } = useAutoCycle(N_PRESETS.length, 3000, 0);
  const [userN, setUserN] = useState<number | null>(null);
  const n = userN ?? N_PRESETS[autoIdx];

  const listColor = t.accentDanger;
  const genColor = getConceptColor(t, 'attention');
  const listKb = listMemoryKb(n);
  const genKb = generatorMemoryKb();
  const maxKb = listMemoryKb(20000);

  const plotW = WIDTH - PAD_L - 20;
  const plotH = HEIGHT - PAD_B - 20;
  const xFor = (i: number) => PAD_L + (i / 20000) * plotW;
  const yFor = (kb: number) => 20 + plotH - (Math.log(kb + 1) / Math.log(maxKb + 1)) * plotH;

  const listPath = Array.from({ length: 40 }, (_, i) => {
    const nn = (i / 39) * 20000;
    return `${i === 0 ? 'M' : 'L'} ${xFor(nn)},${yFor(listMemoryKb(nn))}`;
  }).join(' ');

  return (
    <VisualizationContainer footer={`At ${n.toLocaleString()} examples: a list-based pipeline holds ~${(listKb / 1024).toFixed(1)}MB in memory simultaneously (every example loaded at once); a generator-based pipeline holds ~${(genKb / 1024).toFixed(3)}MB regardless (only the current example). The list line keeps climbing linearly with dataset size and eventually exceeds available RAM; the generator line never moves.`}>
      <Slider label="Dataset size" value={n} onChange={(val) => { stop(); setUserN(val); }} min={100} max={20000} step={100} format={(v) => v.toLocaleString()} />
      <svg width="100%" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} style={{ display: 'block', marginTop: 8 }}>
        <line x1={PAD_L} y1={20} x2={PAD_L} y2={20 + plotH} stroke={t.border} strokeWidth={1} />
        <line x1={PAD_L} y1={20 + plotH} x2={PAD_L + plotW} y2={20 + plotH} stroke={t.border} strokeWidth={1} />
        <text x={4} y={16} fontSize={9} fill={t.textMuted}>memory (log scale)</text>
        <text x={PAD_L + plotW} y={20 + plotH + 20} textAnchor="end" fontSize={9} fill={t.textMuted}>dataset size →</text>

        <path d={listPath} fill="none" stroke={listColor} strokeWidth={2} />
        <line x1={PAD_L} y1={yFor(genKb)} x2={PAD_L + plotW} y2={yFor(genKb)} stroke={genColor} strokeWidth={2} />

        <line x1={xFor(n)} y1={20} x2={xFor(n)} y2={20 + plotH} stroke={t.textMuted} strokeWidth={1} strokeDasharray="3 3" style={{ transition: 'x1 0.25s ease, x2 0.25s ease' }} />
        <circle cx={xFor(n)} cy={yFor(listKb)} r={5} fill={listColor} style={{ transition: 'cx 0.25s ease, cy 0.25s ease' }} />
        <circle cx={xFor(n)} cy={yFor(genKb)} r={5} fill={genColor} style={{ transition: 'cx 0.25s ease, cy 0.25s ease' }} />
      </svg>
      <div style={{ display: 'flex', gap: 16, fontSize: DIAGRAM_TYPE.secondaryLabel.size, marginTop: 4 }}>
        <span style={{ color: listColor }}>■ List-based (load everything)</span>
        <span style={{ color: genColor }}>■ Generator-based (yield one at a time)</span>
      </div>
    </VisualizationContainer>
  );
}
