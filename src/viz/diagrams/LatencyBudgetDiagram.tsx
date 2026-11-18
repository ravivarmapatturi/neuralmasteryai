import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, Slider, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

interface Zone {
  maxMs: number;
  label: string;
  example: string;
  implication: string;
}

const ZONES: Zone[] = [
  { maxMs: 300, label: 'Real-time, turn-taking', example: 'Voice assistant response, live translation', implication: 'Requires streaming inference (process audio as it arrives, not after the fact) and small, efficient models -- accuracy is traded for speed.' },
  { maxMs: 1000, label: 'Real-time, non-interactive', example: 'Live captioning', implication: 'Still streaming, but a wider window tolerance -- a slightly larger model becomes viable.' },
  { maxMs: 5000, label: 'Near-real-time', example: 'Meeting transcription updating every few seconds', implication: 'Can batch a few seconds of audio at once instead of processing every frame individually -- meaningfully relaxes the architecture constraint.' },
  { maxMs: Infinity, label: 'Offline / batch', example: 'Podcast transcription, audio archive indexing', implication: 'No latency pressure at all -- optimize purely for accuracy and throughput (process many hours in parallel), the largest models are fair game.' },
];

const MAX_SLIDER = 6000;

export default function LatencyBudgetDiagram() {
  const t = useVizTokens();
  const BUDGET_PRESETS = [200, 750, 2500, 6000];
  const { value: autoIdx } = useAutoCycle(BUDGET_PRESETS.length, 3000);
  const [userBudget, setUserBudget] = useState<number | null>(null);
  const budget = userBudget ?? BUDGET_PRESETS[autoIdx];

  const isOffline = budget >= MAX_SLIDER;
  const zone = isOffline ? ZONES[ZONES.length - 1] : ZONES.find((z) => budget <= z.maxMs) ?? ZONES[ZONES.length - 1];
  const color = getConceptColor(t, 'attention');

  return (
    <VisualizationContainer footer={zone.implication}>
      <Slider
        label="Latency budget"
        value={budget}
        onChange={setUserBudget}
        min={50}
        max={MAX_SLIDER}
        step={50}
        format={(v) => (v >= MAX_SLIDER ? 'Offline (no limit)' : `${v}ms`)}
      />
      <div style={{ padding: '12px 16px', borderRadius: 8, background: `${color}18`, border: `1px solid ${color}`, marginTop: 8 }}>
        <div style={{ fontWeight: 700, fontSize: 15, color }}>{zone.label}</div>
        <div style={{ fontSize: 13, color: t.textSecondary, marginTop: 4 }}>{zone.example}</div>
      </div>
      <div style={{ fontSize: DIAGRAM_TYPE.secondaryLabel.size, color: t.textMuted, marginTop: 8 }}>
        The same task (ASR, TTS) gets architected completely differently depending on which of these zones it has to live in.
      </div>
    </VisualizationContainer>
  );
}
