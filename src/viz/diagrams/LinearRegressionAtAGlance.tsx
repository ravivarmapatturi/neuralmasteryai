import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, VisualizationMath, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE } from './diagramSystem';
import SketchBox from '../../components/notebook/SketchBox';

const HAND_FONT = "'Kalam', 'Comic Sans MS', cursive";

const CARDS = [
  { label: 'Hypothesis', latex: '\\hat{y} = w \\cdot x + b', color: 'accentSecondary' as const },
  { label: 'Cost (MSE)', latex: 'J(w,b) = \\frac{1}{n}\\sum(\\hat y^{(i)} - y^{(i)})^2', color: 'accentDanger' as const },
  { label: 'Gradient', latex: '\\frac{\\partial J}{\\partial w} = \\frac{2}{n}\\sum(\\hat y^{(i)}-y^{(i)})x^{(i)}', color: 'accentWarn' as const },
  { label: 'Update Rule', latex: 'w \\leftarrow w - \\alpha \\frac{\\partial J}{\\partial w}', color: 'accentPrimary' as const },
];

/** The whole page in four lines -- hypothesis produces a prediction, cost
 * measures how wrong it is, the gradient says which way to move to reduce
 * it, and the update rule is that move applied. Every section below
 * derives one of these four lines in full. */
export default function LinearRegressionAtAGlance() {
  const t = useVizTokens();
  const cycle = useAutoCycle(CARDS.length, 1400);
  return (
    <VisualizationContainer footer="The whole page in four lines: the hypothesis produces a prediction, the cost function measures how wrong it is, the gradient says which direction reduces that cost, and the update rule is that direction applied to the weights -- every section below derives one of these four lines in full.">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 12 }}>
        {CARDS.map((c, i) => (
          <div key={c.label} onPointerDown={() => cycle.pick(i)} style={{ opacity: cycle.value === i ? 1 : 0.58, transform: cycle.value === i ? 'translateY(-3px)' : 'none', transition: 'opacity 300ms, transform 300ms' }}>
          <SketchBox color={t[c.color]} strokeWidth={cycle.value === i ? 2.5 : 1.5}>
            <div style={{ background: cycle.value === i ? `${t[c.color]}18` : t.surfaceAlt, padding: '14px 12px', textAlign: 'center', transition: 'background 300ms' }}>
              <div style={{ fontSize: DIAGRAM_TYPE.label.size, fontWeight: 700, fontFamily: HAND_FONT, color: t[c.color], marginBottom: 8 }}>{c.label}</div>
              <VisualizationMath latex={c.latex} />
            </div>
          </SketchBox>
          </div>
        ))}
      </div>
    </VisualizationContainer>
  );
}
