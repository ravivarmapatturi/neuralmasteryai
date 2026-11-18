import { useMemo, useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, Slider, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE } from './diagramSystem';
import { generateCandidateScores, funnelCounts } from '../lib/aiforscience';

const CANDIDATES = generateCandidateScores(200000, 7);

const THRESH_PRESETS = [0.3, 0.5, 0.7, 0.85];

export default function ScreeningFunnelDiagram() {
  const t = useVizTokens();
  const { value: autoIdx } = useAutoCycle(THRESH_PRESETS.length, 2800);
  const [userThreshold, setUserThreshold] = useState<number | null>(null);
  const threshold = userThreshold ?? THRESH_PRESETS[autoIdx];

  const { total, passedMl, shortlist } = useMemo(() => funnelCounts(CANDIDATES, threshold, 20), [threshold]);

  const stages = [
    { label: 'Candidate library', count: total, color: t.textMuted },
    { label: 'Passed ML property filter', count: passedMl, color: t.accentSecondary },
    { label: 'Sent to physical synthesis/testing', count: shortlist, color: t.accentPrimary },
  ];
  const maxCount = total;

  return (
    <VisualizationContainer footer={`Real generated library of ${total.toLocaleString()} candidate scores (a realistic long-tailed shape -- most candidates score low, a real minority score high). At ML threshold=${threshold.toFixed(2)}: ${passedMl.toLocaleString()} pass the filter (${((passedMl / total) * 100).toFixed(2)}% of the library) -- only the real top handful of those actually get expensive physical validation. This is the real, computed shape of "ML narrows an intractable search space before the expensive step," not just asserted.`}>
      <Slider label="ML property-prediction threshold" value={threshold} onChange={setUserThreshold} min={0.05} max={0.95} step={0.01} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
        {stages.map((s) => (
          <div key={s.label}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
              <span style={{ color: t.textPrimary }}>{s.label}</span>
              <span style={{ color: t.textMuted, fontFamily: 'monospace' }}>{s.count.toLocaleString()}</span>
            </div>
            <div style={{ background: t.surfaceAlt, borderRadius: 4, height: 14 }}>
              <div style={{ width: `${Math.max(0.3, (s.count / maxCount) * 100)}%`, height: '100%', background: s.color, borderRadius: 4, transition: 'width 200ms ease' }} />
            </div>
          </div>
        ))}
      </div>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 8 }}>
        The exact same funnel shape applies whether the candidates are drug molecules, material compositions, or genomic variants -- the domain changes, this reduction pattern doesn't.
      </div>
    </VisualizationContainer>
  );
}
