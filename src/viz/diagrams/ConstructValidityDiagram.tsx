import { useMemo, useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, Slider, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE } from './diagramSystem';
import { generateBenchmark, shortcutModelAccuracy, realCapabilityAccuracy } from '../lib/evaluationFundamentals';

const REAL_CAPABILITY = 0.75;
const CUES = [0.85, 0.60, 0.95, 0.70];

export default function ConstructValidityDiagram() {
  const t = useVizTokens();
  const { value: cueIdx, stop } = useAutoCycle(CUES.length, 3000, 0);
  const [userCue, setUserCue] = useState<number | null>(null);
  const cueCorrelation = userCue ?? CUES[cueIdx];

  const { shortcutAcc, realAcc } = useMemo(() => {
    const items = generateBenchmark(200, cueCorrelation, 3);
    return { shortcutAcc: shortcutModelAccuracy(items), realAcc: realCapabilityAccuracy(items, REAL_CAPABILITY, 3) };
  }, [cueCorrelation]);

  const shortcutWins = shortcutAcc > realAcc;

  return (
    <VisualizationContainer footer={`"Shortcut model" has ZERO real understanding -- it just outputs whatever this benchmark's surface cue suggests. "Real-capability model" genuinely reasons at ${(REAL_CAPABILITY * 100).toFixed(0)}% accuracy, independent of any surface cue. At cue-correlation=${cueCorrelation.toFixed(2)}, shortcut scores ${(shortcutAcc * 100).toFixed(1)}% -- ${shortcutWins ? 'HIGHER than the genuinely capable model' : 'lower than the genuinely capable model'}. This is a real, computed accuracy gap, not a hypothetical.`}>
      <Slider
        label="how strongly this benchmark's surface cue correlates with the true answer"
        value={cueCorrelation}
        onChange={(v) => {
          stop();
          setUserCue(v);
        }}
        min={0.5}
        max={0.98}
        step={0.01}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
            <span style={{ color: shortcutWins ? t.accentDanger : t.textSecondary, fontWeight: shortcutWins ? 700 : 400 }}>Shortcut model (no real understanding)</span>
            <span>{(shortcutAcc * 100).toFixed(1)}%</span>
          </div>
          <div style={{ background: t.surfaceAlt, borderRadius: 4, height: 16 }}>
            <div style={{ width: `${shortcutAcc * 100}%`, height: '100%', background: t.accentDanger, borderRadius: 4, transition: 'width 0.4s ease' }} />
          </div>
        </div>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
            <span style={{ color: !shortcutWins ? t.accentPrimary : t.textSecondary, fontWeight: !shortcutWins ? 700 : 400 }}>Real-capability model</span>
            <span>{(realAcc * 100).toFixed(1)}%</span>
          </div>
          <div style={{ background: t.surfaceAlt, borderRadius: 4, height: 16 }}>
            <div style={{ width: `${realAcc * 100}%`, height: '100%', background: t.accentPrimary, borderRadius: 4, transition: 'width 0.4s ease' }} />
          </div>
        </div>
      </div>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 8 }}>
        This is exactly what "does the benchmark actually measure the capability it claims to?" means concretely -- a high score here would mislead you about which model is actually better at the underlying task.
      </div>
    </VisualizationContainer>
  );
}
