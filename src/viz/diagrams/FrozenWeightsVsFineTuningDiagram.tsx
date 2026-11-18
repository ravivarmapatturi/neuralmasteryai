import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE } from './diagramSystem';

const FROZEN = ['Zero/few-shot prompting', 'Chain-of-thought', 'RAG (retrieval)', 'Tool use / agents'];
const TRAINED = ['Full fine-tuning', 'LoRA / QLoRA / DoRA', 'Prefix / prompt tuning', 'Distillation'];

/** Two lanes, one axis: does this technique touch the model's weights?
 * Click either side to see the concrete techniques and what changes. */
export default function FrozenWeightsVsFineTuningDiagram() {
  const t = useVizTokens();
  const sides = ['frozen', 'trained'] as const;
  const cycle = useAutoCycle(sides.length, 3000);
  const side = sides[cycle.value];
  const setSide = (next: (typeof sides)[number]) => cycle.pick(sides.indexOf(next));
  const frozenColor = t.accentSecondary;
  const trainedColor = t.accentWarn;
  const color = side === 'frozen' ? frozenColor : trainedColor;
  const items = side === 'frozen' ? FROZEN : TRAINED;

  return (
    <VisualizationContainer
      footer={
        side === 'frozen'
          ? 'Zero training cost, instantly reversible, limited by what fits in a context window -- the default first move.'
          : 'Real training cost and a new artifact to version/serve, but more durable behavior change than anything fitting in a prompt allows.'
      }
    >
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        {(['frozen', 'trained'] as const).map((s) => (
          <div
            key={s}
            onClick={() => setSide(s)}
            style={{
              flex: 1, padding: '10px 14px', borderRadius: 8, cursor: 'pointer', textAlign: 'center',
              background: side === s ? `${s === 'frozen' ? frozenColor : trainedColor}20` : t.surfaceAlt,
              border: `1.5px solid ${side === s ? (s === 'frozen' ? frozenColor : trainedColor) : t.border}`,
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 700, color: side === s ? (s === 'frozen' ? frozenColor : trainedColor) : t.textSecondary }}>
              {s === 'frozen' ? 'Weights stay frozen' : 'Weights get updated'}
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {items.map((it) => (
          <div key={it} style={{ padding: '8px 12px', borderRadius: 6, background: `${color}18`, border: `1.5px solid ${color}`, fontSize: 12, color: t.textSecondary }}>
            {it}
          </div>
        ))}
      </div>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 8 }}>
        Click a lane to compare its techniques.
      </div>
    </VisualizationContainer>
  );
}
