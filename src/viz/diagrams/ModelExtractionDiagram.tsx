import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, Slider, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE } from './diagramSystem';
import { surrogateFidelity } from '../lib/aisecurity';

const QUERY_PRESETS = [2000, 500, 8000, 15000];

export default function ModelExtractionDiagram() {
  const t = useVizTokens();
  const { value: autoIdx, stop } = useAutoCycle(QUERY_PRESETS.length, 3000, 0);
  const [userLimit, setUserLimit] = useState<number | null>(null);
  const queryLimit = userLimit ?? QUERY_PRESETS[autoIdx];

  const fidelity = surrogateFidelity(queryLimit);

  const width = 420;
  const height = 160;
  const samples = Array.from({ length: 60 }, (_, i) => (i / 59) * 20000);
  const px = (q: number) => (q / 20000) * width;
  const py = (v: number) => height - v * height;
  const curve = samples.map((q) => [px(q), py(surrogateFidelity(q))]);

  const costPerQuery = 0.002; // illustrative $ per API call
  const attackerCost = queryLimit * costPerQuery;

  return (
    <VisualizationContainer footer={`A real saturating fidelity curve: 1 − e^(−queries/4000) -- at ${queryLimit.toLocaleString()} queries, a surrogate model trained purely on input/output pairs reaches ${(fidelity * 100).toFixed(1)}% agreement with the real model, at an illustrative attacker cost of $${attackerCost.toFixed(2)}. Rate limiting doesn't need to hit zero queries to work -- it needs to push this cost past what stealing the model is worth.`}>
      <Slider label="attacker's query budget" value={queryLimit} onChange={(v) => { stop(); setUserLimit(v); }} min={100} max={20000} step={100} />

      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block', marginTop: 8 }}>
        <line x1={0} y1={py(0.9)} x2={width} y2={py(0.9)} stroke={t.textMuted} strokeWidth={1} strokeDasharray="3 3" />
        <text x={4} y={py(0.9) - 4} fontSize={10} fill={t.textMuted}>90% fidelity</text>
        <polyline points={curve.map(([x, y]) => `${x},${y}`).join(' ')} fill="none" stroke={t.accentDanger} strokeWidth={2.5} />
        <line x1={px(queryLimit)} y1={0} x2={px(queryLimit)} y2={height} stroke={t.accentWarn} strokeWidth={1.5} strokeDasharray="3 3" />
        <circle cx={px(queryLimit)} cy={py(fidelity)} r={5} fill={t.accentWarn} />
      </svg>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted }}>
        Output randomization and query-pattern monitoring push this curve further right (more queries needed for the same fidelity) rather than trying to block extraction outright.
      </div>
    </VisualizationContainer>
  );
}
