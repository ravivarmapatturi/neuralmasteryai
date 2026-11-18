import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, Slider, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

const PER_PERSON_COST = 12; // ms, running the pose model once per detected person
const DETECTION_COST = 8; // ms, one detection pass regardless of person count
const GROUPING_BASE = 6; // ms, base cost of the bottom-up keypoint-grouping step
const GROUPING_PER_PERSON = 1.5; // ms, grouping cost grows slowly with people count

function topDownCost(n: number): number {
  return DETECTION_COST + n * PER_PERSON_COST;
}
function bottomUpCost(n: number): number {
  return GROUPING_BASE + n * GROUPING_PER_PERSON + 15; // +15 flat cost of the one whole-image keypoint pass
}

const WIDTH = 480;
const HEIGHT = 200;
const PAD_L = 45;
const PAD_B = 30;
const MAX_N = 15;

const PEOPLE_PRESETS = [2, 5, 9, 14];

export default function PoseEstimationApproachDiagram() {
  const t = useVizTokens();
  const { value: autoIdx } = useAutoCycle(PEOPLE_PRESETS.length, 2800);
  const [userN, setUserN] = useState<number | null>(null);
  const n = userN ?? PEOPLE_PRESETS[autoIdx];

  const topColor = getConceptColor(t, 'query');
  const bottomColor = getConceptColor(t, 'attention');
  const maxCost = topDownCost(MAX_N);
  const plotW = WIDTH - PAD_L - 20;
  const plotH = HEIGHT - PAD_B - 20;

  const xFor = (i: number) => PAD_L + (i / MAX_N) * plotW;
  const yFor = (cost: number) => 20 + plotH - (cost / maxCost) * plotH;

  const pathFor = (fn: (n: number) => number) =>
    Array.from({ length: MAX_N + 1 }, (_, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i)},${yFor(fn(i))}`).join(' ');

  return (
    <VisualizationContainer
      footer={`At ${n} people: top-down costs ~${topDownCost(n).toFixed(0)}ms (one detection pass + ${n} separate pose-model runs), bottom-up costs ~${bottomUpCost(n).toFixed(0)}ms (one whole-image pass, plus a grouping step that grows slowly with crowd size). Top-down is simpler and often more per-person-accurate at low counts; bottom-up's near-flat cost curve is why it's the standard choice for genuinely crowded scenes.`}
    >
      <Slider label="People in frame" value={n} onChange={setUserN} min={0} max={MAX_N} format={(v) => `${v}`} />
      <svg width="100%" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} style={{ display: 'block', marginTop: 8 }}>
        <line x1={PAD_L} y1={20} x2={PAD_L} y2={20 + plotH} stroke={t.border} strokeWidth={1} />
        <line x1={PAD_L} y1={20 + plotH} x2={PAD_L + plotW} y2={20 + plotH} stroke={t.border} strokeWidth={1} />
        <text x={8} y={16} fontSize={9} fill={t.textMuted}>cost (ms)</text>
        <text x={PAD_L + plotW} y={20 + plotH + 20} textAnchor="end" fontSize={9} fill={t.textMuted}>people →</text>

        <path d={pathFor(topDownCost)} fill="none" stroke={topColor} strokeWidth={2} />
        <path d={pathFor(bottomUpCost)} fill="none" stroke={bottomColor} strokeWidth={2} />

        <line x1={xFor(n)} y1={20} x2={xFor(n)} y2={20 + plotH} stroke={t.textMuted} strokeWidth={1} strokeDasharray="3 3" />
        <circle cx={xFor(n)} cy={yFor(topDownCost(n))} r={5} fill={topColor} />
        <circle cx={xFor(n)} cy={yFor(bottomUpCost(n))} r={5} fill={bottomColor} />
      </svg>
      <div style={{ display: 'flex', gap: 16, fontSize: DIAGRAM_TYPE.secondaryLabel.size, marginTop: 4 }}>
        <span style={{ color: topColor }}>■ Top-down</span>
        <span style={{ color: bottomColor }}>■ Bottom-up</span>
      </div>
    </VisualizationContainer>
  );
}
