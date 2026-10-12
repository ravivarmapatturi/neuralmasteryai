import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, VisualizationMath } from '../primitives';
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
  return (
    <VisualizationContainer footer="The whole page in four lines: the hypothesis produces a prediction, the cost function measures how wrong it is, the gradient says which direction reduces that cost, and the update rule is that direction applied to the weights -- every section below derives one of these four lines in full.">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
        {CARDS.map((c) => (
          <SketchBox key={c.label} color={t[c.color]} strokeWidth={1.5}>
            <div style={{ background: t.surfaceAlt, padding: '14px 12px', textAlign: 'center' }}>
              <div style={{ fontSize: DIAGRAM_TYPE.label.size, fontWeight: 700, fontFamily: HAND_FONT, color: t[c.color], marginBottom: 8, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{c.label}</div>
              <VisualizationMath latex={c.latex} />
            </div>
          </SketchBox>
        ))}
      </div>
    </VisualizationContainer>
  );
}
