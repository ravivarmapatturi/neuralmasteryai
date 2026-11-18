import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, PillSelect, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

type Method = 'ipo' | 'kto' | 'orpo' | 'rloo';
const METHODS: Record<Method, { label: string; base: string; changes: string; dataFormat: string }> = {
  ipo: { label: 'IPO', base: 'DPO', changes: "Adds regularization so the objective stays well-behaved when preference pairs are close to deterministic -- fixes DPO's overconfidence failure mode.", dataFormat: 'paired (chosen, rejected)' },
  kto: { label: 'KTO', base: 'DPO', changes: "Doesn't need paired data at all -- just independent binary labels (good/bad), inspired by loss-aversion research.", dataFormat: 'unpaired binary labels' },
  orpo: { label: 'ORPO', base: 'SFT+DPO', changes: 'Folds preference optimization directly into the SFT loss -- one combined stage instead of separate SFT-then-DPO.', dataFormat: 'paired (chosen, rejected)' },
  rloo: { label: 'RLOO', base: 'PPO', changes: 'Genuine RL (REINFORCE) like GRPO, no critic network -- uses other samples in the batch as a leave-one-out variance-reducing baseline.', dataFormat: 'sampled rollouts + reward' },
};

/** Four named variants, each patching one specific thing about DPO or PPO
 * -- select one to see exactly which baseline it's built on, what it
 * changes, and what data format it actually needs (the real practical
 * differentiator between these methods). */
export default function PreferenceOptimizationFamilyDiagram() {
  const t = useVizTokens();
  const methods = Object.keys(METHODS) as Method[];
  const cycle = useAutoCycle(methods.length, 3200, 1);
  const method = methods[cycle.value];
  const setMethod = (next: Method) => cycle.pick(methods.indexOf(next));
  const color = getConceptColor(t, 'attention');
  const active = METHODS[method];

  return (
    <VisualizationContainer footer={active.changes}>
      <PillSelect<Method>
        label="Method"
        value={method}
        onChange={setMethod}
        options={[
          { value: 'ipo', label: 'IPO' },
          { value: 'kto', label: 'KTO' },
          { value: 'orpo', label: 'ORPO' },
          { value: 'rloo', label: 'RLOO' },
        ]}
      />
      <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
        <div style={{ flex: 1, padding: 10, borderRadius: 8, background: t.surfaceAlt, border: `1px solid ${t.border}`, textAlign: 'center' }}>
          <div style={{ fontSize: 9, color: t.textMuted }}>built on</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: t.textSecondary, marginTop: 4 }}>{active.base}</div>
        </div>
        <div style={{ flex: 1, padding: 10, borderRadius: 8, background: `${color}18`, border: `1.5px solid ${color}`, textAlign: 'center' }}>
          <div style={{ fontSize: 9, color }}>data format needed</div>
          <div style={{ fontSize: 11, fontWeight: 700, color, marginTop: 4 }}>{active.dataFormat}</div>
        </div>
      </div>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 8 }}>
        These differ mainly in data format required and which specific failure mode of the baseline they patch.
      </div>
    </VisualizationContainer>
  );
}
