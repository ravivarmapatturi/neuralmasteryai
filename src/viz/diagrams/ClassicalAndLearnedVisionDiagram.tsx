import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, VizButton, useAutoCycle } from '../primitives';
const MODES = { classical: { title: 'Known rule → deterministic vision', line: 'calibrate → threshold/filter → geometry → post-process', note: 'Use it when the physical rule is stable and inspectable: camera calibration, color conversion, morphology, or geometry.' }, learned: { title: 'Varied meaning → learned vision', line: 'images → labels → encoder → task head → prediction', note: 'Use it when pixels map to meaning too variably to hand-code: defects, objects, actions, and scenes.' }, hybrid: { title: 'Production systems often combine both', line: 'camera checks → learned model → deterministic cleanup → decision', note: 'The learned model handles semantic ambiguity; deterministic steps enforce known geometry and operational constraints.' } };
const MODE_KEYS = ['hybrid', 'classical', 'learned'] as const;

export default function ClassicalAndLearnedVisionDiagram() {
  const t = useVizTokens();
  const { value: autoIdx } = useAutoCycle(MODE_KEYS.length, 3400);
  const [userMode, setUserMode] = useState<typeof MODE_KEYS[number] | null>(null);
  const mode = userMode ?? MODE_KEYS[autoIdx];
  const item = MODES[mode];
  return (
    <VisualizationContainer footer={item.note}>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
        {MODE_KEYS.map(m => (
          <VizButton key={m} variant={mode === m ? 'primary' : 'secondary'} onClick={() => setUserMode(m)}>
            {m}
          </VizButton>
        ))}
      </div>
      <div style={{ fontWeight: 700, color: t.textPrimary, marginBottom: 10 }}>{item.title}</div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, flexWrap: 'wrap' }}>
        {item.line.split(' → ').map((s, i) => (
          <div key={s} style={{ display: 'contents' }}>
            <div style={{ padding: '9px 12px', border: `1px solid ${i % 2 ? t.accentPrimary : t.border}`, borderRadius: 8, background: t.surfaceAlt, fontSize: 12 }}>
              {s}
            </div>
            {i < item.line.split(' → ').length - 1 && <span style={{ color: t.textMuted }}>→</span>}
          </div>
        ))}
      </div>
    </VisualizationContainer>
  );
}
