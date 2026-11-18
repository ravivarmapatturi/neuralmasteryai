import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, PillSelect, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

const PROMPT = 'How do I reverse a list in Python?';
const BASE_RESPONSE = 'How do I reverse a list in Python? How do I reverse a string in Python? How do I sort a list...';
const SFT_RESPONSE = 'Use list.reverse() to reverse in place, or reversed(list) / list[::-1] to get a reversed copy without mutating the original.';

/** The same prompt, before and after SFT -- a pretrained base model just
 * continues plausible text (including repeating similar-looking
 * questions, since that's a common pattern in web text); SFT teaches it
 * to recognize "this is an instruction" and respond directly. */
export default function SftBeforeAfterDiagram() {
  const t = useVizTokens();
  const stages = ['base', 'sft'] as const;
  const cycle = useAutoCycle(stages.length, 3600, 1);
  const stage = stages[cycle.value];
  const setStage = (next: (typeof stages)[number]) => cycle.pick(stages.indexOf(next));
  const baseColor = t.textMuted;
  const sftColor = getConceptColor(t, 'attention');
  const response = stage === 'base' ? BASE_RESPONSE : SFT_RESPONSE;
  const color = stage === 'base' ? baseColor : sftColor;

  return (
    <VisualizationContainer
      footer={
        stage === 'base'
          ? "Base model: trained only to predict plausible next tokens -- it continues the TEXT PATTERN of \"a list of similar questions\" rather than recognizing this as a request to answer."
          : 'SFT model: fine-tuned on (instruction, ideal response) pairs -- it now recognizes the prompt as an instruction to follow and responds directly, in the format of a helpful assistant.'
      }
    >
      <PillSelect<'base' | 'sft'> label="Model stage" value={stage} onChange={setStage} options={[{ value: 'base', label: 'Base (pretrained only)' }, { value: 'sft', label: 'After SFT' }]} />
      <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 6, background: t.surfaceAlt, border: `1px solid ${t.border}`, fontSize: 11, fontFamily: 'monospace', color: t.textSecondary }}>
        prompt: "{PROMPT}"
      </div>
      <div style={{ marginTop: 8, padding: '10px 12px', borderRadius: 6, background: `${color}18`, border: `1.5px solid ${color}`, fontSize: 11, fontFamily: 'monospace', color: t.textSecondary }}>
        {response}
      </div>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color, fontWeight: 700, marginTop: 8 }}>
        {stage === 'base' ? 'continues plausible text' : 'follows the instruction'}
      </div>
    </VisualizationContainer>
  );
}
