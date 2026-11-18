import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, PillSelect, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

const CANDIDATES = [
  { token: 'cat', hard: 1, soft: 0.62 },
  { token: 'dog', hard: 0, soft: 0.24 },
  { token: 'fox', hard: 0, soft: 0.09 },
  { token: 'car', hard: 0, soft: 0.02 },
  { token: 'sky', hard: 0, soft: 0.03 },
];

/** Hard labels ("cat" = 1, everything else = 0) carry only one bit of
 * information. The teacher's full soft distribution also encodes HOW
 * SIMILAR the wrong answers are ("dog" is much more plausible than "car")
 * -- that's the extra signal distillation actually trains the student on. */
export default function DistillationDiagram() {
  const t = useVizTokens();
  const modes = ['hard', 'soft'] as const;
  const cycle = useAutoCycle(modes.length, 3200, 1);
  const mode = modes[cycle.value];
  const setMode = (next: (typeof modes)[number]) => cycle.pick(modes.indexOf(next));
  const hardColor = t.textMuted;
  const softColor = getConceptColor(t, 'attention');
  const color = mode === 'hard' ? hardColor : softColor;

  return (
    <VisualizationContainer
      footer={
        mode === 'hard'
          ? 'Hard labels: only "the correct answer is cat" -- one bit of information, identical to training on ground truth directly.'
          : 'Soft labels (teacher\'s full distribution): also encodes that "dog" is far more plausible than "car" -- this relative-similarity signal is what the student actually learns from, beyond just the right answer.'
      }
    >
      <PillSelect<'hard' | 'soft'> label="Target" value={mode} onChange={setMode} options={[{ value: 'hard', label: 'Hard label' }, { value: 'soft', label: "Teacher's soft distribution" }]} />
      <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {CANDIDATES.map((c) => {
          const val = mode === 'hard' ? c.hard : c.soft;
          return (
            <div key={c.token} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 40, fontSize: 11, fontFamily: 'monospace', color: t.textSecondary }}>{c.token}</div>
              <div style={{ flex: 1, height: 14, background: t.surfaceAlt, borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ width: `${val * 100}%`, height: '100%', background: color, opacity: val > 0 ? 0.85 : 0, transition: 'width 200ms' }} />
              </div>
              <div style={{ width: 36, textAlign: 'right', fontSize: 10, fontFamily: 'monospace', color: t.textMuted }}>{val.toFixed(2)}</div>
            </div>
          );
        })}
      </div>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 8 }}>
        Same image, same true label ("cat") — the soft distribution carries strictly more information.
      </div>
    </VisualizationContainer>
  );
}
