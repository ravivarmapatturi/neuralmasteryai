import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, Slider, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

const DATASET_SIZE = 10_000_000;
const EXACT_LATENCY_MS = 850; // a full linear scan over 10M vectors, for reference

function recallFor(ef: number): number {
  return 100 * (1 - Math.exp(-ef / 35));
}
function latencyFor(ef: number): number {
  return 2 + ef * 0.9; // base overhead + roughly linear cost per candidate examined
}

const WIDTH = 480;
const HEIGHT = 220;
const PAD_L = 45;
const PAD_B = 30;
const MAX_LATENCY = EXACT_LATENCY_MS;

const EF_PRESETS = [40, 10, 150, 80];

export default function AnnVsExactTradeoffDiagram() {
  const t = useVizTokens();
  const { value: autoIdx, stop } = useAutoCycle(EF_PRESETS.length, 3000, 0);
  const [userEf, setUserEf] = useState<number | null>(null);
  const ef = userEf ?? EF_PRESETS[autoIdx];

  const recall = recallFor(ef);
  const latency = latencyFor(ef);
  const annColor = getConceptColor(t, 'attention');
  const exactColor = t.accentDanger;

  const plotW = WIDTH - PAD_L - 20;
  const plotH = HEIGHT - PAD_B - 20;
  const xFor = (lat: number) => PAD_L + (Math.log(lat + 1) / Math.log(MAX_LATENCY + 1)) * plotW;
  const yFor = (rec: number) => 20 + (1 - rec / 100) * plotH;

  const curvePath = Array.from({ length: 60 }, (_, i) => {
    const efSample = 1 + (i / 59) * 300;
    const x = xFor(latencyFor(efSample));
    const y = yFor(recallFor(efSample));
    return `${i === 0 ? 'M' : 'L'} ${x},${y}`;
  }).join(' ');

  return (
    <VisualizationContainer footer={`At ef=${ef}: ~${recall.toFixed(0)}% recall in ~${latency.toFixed(0)}ms. Exact (brute-force) search over ${(DATASET_SIZE / 1_000_000).toFixed(0)}M vectors guarantees 100% recall but costs ~${EXACT_LATENCY_MS}ms per query -- ANN trades a small, tunable amount of recall for roughly 10-100x lower latency, which is the entire reason approximate search exists at this scale.`}>
      <Slider
        label={`ef (candidates examined per search)`}
        value={ef}
        onChange={(v) => {
          stop();
          setUserEf(v);
        }}
        min={1}
        max={300}
        format={(v) => `${v}`}
      />
      <svg width="100%" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} style={{ display: 'block', marginTop: 8 }}>
        <line x1={PAD_L} y1={20} x2={PAD_L} y2={20 + plotH} stroke={t.border} strokeWidth={1} />
        <line x1={PAD_L} y1={20 + plotH} x2={PAD_L + plotW} y2={20 + plotH} stroke={t.border} strokeWidth={1} />
        <text x={10} y={16} fontSize={9} fill={t.textMuted}>recall</text>
        <text x={PAD_L + plotW - 10} y={20 + plotH + 20} textAnchor="end" fontSize={9} fill={t.textMuted}>latency (ms, log scale) →</text>

        <path d={curvePath} fill="none" stroke={t.textMuted} strokeWidth={1.5} strokeDasharray="3 3" opacity={0.6} />

        <circle cx={xFor(EXACT_LATENCY_MS)} cy={yFor(100)} r={6} fill={exactColor} />
        <text x={xFor(EXACT_LATENCY_MS) - 10} y={yFor(100) - 8} textAnchor="end" fontSize={10} fontWeight={700} fill={exactColor}>exact scan</text>

        <circle cx={xFor(latency)} cy={yFor(recall)} r={7} fill={annColor} stroke={t.surface} strokeWidth={2} />
      </svg>
      <div style={{ display: 'flex', gap: 20, fontSize: DIAGRAM_TYPE.secondaryLabel.size, color: t.textMuted, marginTop: 4 }}>
        <span>Recall: <strong style={{ color: annColor }}>{recall.toFixed(0)}%</strong></span>
        <span>Latency: <strong style={{ color: annColor }}>{latency.toFixed(0)}ms</strong></span>
      </div>
    </VisualizationContainer>
  );
}
