import { useAutoCycle } from '../primitives';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

const LEVELS = [
  { key: 'unit', label: 'Unit / data / schema', count: 'many, fast', desc: 'Individual functions, data shape, schema contracts -- cheap to run, run on every commit.' },
  { key: 'statistical', label: 'Statistical / model', count: 'fewer, slower', desc: 'Distribution checks, specific behavioral edge cases -- needs real data/model artifacts.' },
  { key: 'regression', label: 'Regression / LLM-specific', count: 'fewest, slowest', desc: 'Full benchmark runs, prompt/hallucination/jailbreak/trajectory suites -- expensive, run before deploy.' },
];

/** The classic test pyramid, mapped onto ML-specific layers -- more of
 * the cheap ones, fewer of the expensive ones. Click a level. */
export default function MlTestPyramidDiagram() {
  const t = useVizTokens();
  const { value: activeIdx, pick } = useAutoCycle(LEVELS.length, 2500, 1);
  const active = LEVELS[activeIdx].key;
  const color = getConceptColor(t, 'attention');
  const info = LEVELS[activeIdx];
  const widths = [280, 190, 110];

  return (
    <VisualizationContainer footer={info.desc}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
        {LEVELS.slice().reverse().map((l, i) => {
          const originalIdx = LEVELS.length - 1 - i;
          const isActive = active === l.key;
          const w = widths[originalIdx];
          return (
            <div
              key={l.key}
              onClick={() => pick(originalIdx)}
              onMouseEnter={() => pick(originalIdx)}
              style={{ width: w, cursor: 'pointer', padding: '0.5rem', borderRadius: 6, background: isActive ? `${color}25` : t.surfaceAlt, border: `1.5px solid ${isActive ? color : t.border}`, textAlign: 'center' }}
            >
              <div style={{ fontSize: 10, fontWeight: isActive ? 700 : 500, color: isActive ? color : t.textPrimary }}>{l.label}</div>
              <div style={{ fontSize: 8, color: t.textMuted, marginTop: 2 }}>{l.count}</div>
            </div>
          );
        })}
      </div>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 8 }}>
        Same shape as any software test pyramid -- ML/LLM-specific tests slot into the existing discipline, not a separate one.
      </div>
    </VisualizationContainer>
  );
}
