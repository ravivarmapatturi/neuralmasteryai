import { useMemo, useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, PillSelect, Slider, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE } from './diagramSystem';
import { foldAssignment } from '../lib/workflow';

type Mode = 'single' | 'kfold';
const N = 30;

export default function SplitCrossValidationDiagram() {
  const t = useVizTokens();
  const modeCycle = useAutoCycle(2, 1400);
  const mode: Mode = modeCycle.value === 0 ? 'single' : 'kfold';
  const [k, setK] = useState(5);
  const foldCycle = useAutoCycle(k, 1200);
  const activeFold = foldCycle.value;

  const cellW = 100 / N;
  const singleSplit = useMemo(() => Array.from({ length: N }, (_, i) => (i < N * 0.7 ? 'train' : i < N * 0.85 ? 'validation' : 'test')), []);
  const kfoldSplit = useMemo(() => foldAssignment(N, k, activeFold), [k, activeFold]);

  const cells = mode === 'single' ? singleSplit : kfoldSplit;
  const colorFor = (role: string) => role === 'train' ? t.accentSecondary : role === 'validation' ? t.accentWarn : t.accentDanger;

  return (
    <VisualizationContainer footer={
      mode === 'single'
        ? `Fixed real proportions: ${singleSplit.filter((r) => r === 'train').length} train, ${singleSplit.filter((r) => r === 'validation').length} validation, ${singleSplit.filter((r) => r === 'test').length} test, out of ${N} examples -- test is touched exactly once, at the very end.`
        : `Real fold ${activeFold + 1}/${k}: ${kfoldSplit.filter((r) => r === 'validation').length} examples held out this round, ${kfoldSplit.filter((r) => r === 'train').length} trained on. Step through every fold and every example gets used for validation exactly once, and for training in every other round.`
    }>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <PillSelect label="Mode" value={mode} onChange={(v) => modeCycle.pick(v === 'single' ? 0 : 1)} options={[
          { value: 'single', label: 'Single train/val/test split' },
          { value: 'kfold', label: 'K-fold cross-validation' },
        ]} />
        {mode === 'kfold' && <Slider label="k" value={k} onChange={(v) => { foldCycle.stop(); setK(v); }} min={3} max={8} step={1} />}
      </div>

      <div style={{ display: 'flex', width: '100%', height: 36, marginTop: 12, borderRadius: 6, overflow: 'hidden' }}>
        {cells.map((role, i) => (
          <div key={i} style={{ width: `${cellW}%`, height: '100%', background: colorFor(role), opacity: 0.85 }} />
        ))}
      </div>

      {mode === 'kfold' && (
        <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
          {Array.from({ length: k }, (_, i) => (
            <button key={i} type="button" onClick={() => { modeCycle.stop(); foldCycle.pick(i); }} style={{
              padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer',
              border: `1px solid ${activeFold === i ? t.accentPrimary : t.border}`,
              background: activeFold === i ? t.accentPrimary : 'transparent',
              color: activeFold === i ? t.background : t.textPrimary,
            }}>fold {i + 1}</button>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 20, fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 8 }}>
        <span><span style={{ color: t.accentSecondary }}>⬤</span> train</span>
        <span><span style={{ color: t.accentWarn }}>⬤</span> validation</span>
        {mode === 'single' && <span><span style={{ color: t.accentDanger }}>⬤</span> test</span>}
      </div>
    </VisualizationContainer>
  );
}
