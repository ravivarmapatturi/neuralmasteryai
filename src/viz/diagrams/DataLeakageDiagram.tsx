import { useMemo, useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, VizButton, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE } from './diagramSystem';
import { generateFraudData, trainFraudModel } from '../lib/workflow';

export default function DataLeakageDiagram() {
  const t = useVizTokens();
  const [seed, setSeed] = useState(1);
  const comparison = useAutoCycle(2, 1700);

  const rows = useMemo(() => generateFraudData(seed, 400), [seed]);
  const withLeak = useMemo(() => trainFraudModel(rows, true), [rows]);
  const withoutLeak = useMemo(() => trainFraudModel(rows, false), [rows]);

  return (
    <VisualizationContainer footer={`Real logistic regression, real gradient descent, same 400-row toy fraud dataset. Including "was_refunded" (only known AFTER a fraud investigation concludes -- it doesn't exist yet at prediction time) as a feature: real training accuracy ${(withLeak.accuracy * 100).toFixed(1)}%. Remove it: real accuracy drops to ${(withoutLeak.accuracy * 100).toFixed(1)}% -- the honest number, and the one that will actually hold in production, where "was_refunded" simply isn't available yet when the prediction needs to be made.`}>
      <div style={{ display: 'flex', gap: 24, justifyContent: 'center', marginTop: 8 }}>
        <div style={{ textAlign: 'center', opacity: comparison.value === 0 ? 1 : 0.48, transform: comparison.value === 0 ? 'scale(1.04)' : 'none', transition: 'opacity 300ms, transform 300ms' }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: t.accentDanger, fontFamily: 'monospace' }}>{(withLeak.accuracy * 100).toFixed(1)}%</div>
          <div style={{ fontSize: 11, color: t.textMuted, maxWidth: 140 }}>WITH leaky feature<br />(suspiciously excellent)</div>
        </div>
        <div style={{ textAlign: 'center', opacity: comparison.value === 1 ? 1 : 0.48, transform: comparison.value === 1 ? 'scale(1.04)' : 'none', transition: 'opacity 300ms, transform 300ms' }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: t.accentPrimary, fontFamily: 'monospace' }}>{(withoutLeak.accuracy * 100).toFixed(1)}%</div>
          <div style={{ fontSize: 11, color: t.textMuted, maxWidth: 140 }}>WITHOUT it<br />(the honest, real-world number)</div>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 10 }}>
        <VizButton onClick={() => { comparison.stop(); setSeed((s) => s + 1); }}>Re-run with a new dataset</VizButton>
      </div>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 8 }}>
        A model with suspiciously excellent validation metrics is the first thing to double-check for leakage, not celebrate -- this is what that check actually looks like, with real numbers instead of a warning to keep in mind.
      </div>
    </VisualizationContainer>
  );
}
