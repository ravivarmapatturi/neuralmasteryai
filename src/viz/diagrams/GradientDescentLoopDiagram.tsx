import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, PulseRect, useAutoCycle } from '../primitives';
import { getConceptColor } from './diagramSystem';

// split a sentence into two lines of roughly equal length, at a space
function wrapTwo(text: string): string[] {
  if (text.length <= 40) return [text];
  const mid = text.length / 2;
  let cut = text.lastIndexOf(' ', mid);
  const after = text.indexOf(' ', mid);
  if (cut === -1 || (after !== -1 && after - mid < mid - cut)) cut = after;
  return cut === -1 ? [text] : [text.slice(0, cut), text.slice(cut + 1)];
}

const STEPS = [
  { label: 'Compute predictions', desc: 'Use the current weights and intercept to predict each example.' },
  { label: 'Measure the cost', desc: 'Calculate the mean squared error for the current predictions.' },
  { label: 'Find the gradient', desc: 'Measure how each parameter changes the cost.' },
  { label: 'Update w and b', desc: 'Move both parameters opposite the gradient, then repeat.' },
];

/** The training loop as a readable, keyboard-selectable sequence. */
export default function GradientDescentLoopDiagram() {
  const t = useVizTokens();
  const cycle = useAutoCycle(STEPS.length, 1300);
  const active = cycle.value;
  const color = getConceptColor(t, 'attention');
  const initColor = t.textSecondary;
  const stepY = (i: number) => 98 + i * 82;

  return (
    <VisualizationContainer footer="Choose a step to see what changes. This is the loop used by the Studio's Gradient Descent Lab.">
      <svg
        role="img"
        aria-label="Gradient descent starts with weights and an intercept, computes predictions and cost, finds the gradient, updates both parameters, then repeats."
        width="100%"
        viewBox="0 0 360 468"
        style={{ display: 'block', maxWidth: 360, marginInline: 'auto' }}
      >
        <defs>
          <marker id="gdloop-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
            <path d="M0,0 L7,3.5 L0,7 Z" fill={t.textMuted} />
          </marker>
        </defs>

        <rect x="40" y="12" width="280" height="48" rx="8" fill={t.surfaceAlt} stroke={initColor} strokeWidth="1.5" />
        <text x="180" y="33" textAnchor="middle" fontSize="16" fontWeight="700" fill={initColor}>Start with w and b</text>
        <text x="180" y="52" textAnchor="middle" fontSize="14" fill={initColor}>initial model parameters</text>
        <line x1="180" y1="60" x2="180" y2="88" stroke={t.textMuted} strokeWidth="1.5" markerEnd="url(#gdloop-arrow)" />

        {STEPS.map((step, i) => {
          const y = stepY(i);
          const isActive = active === i;
          return (
            <g
              key={step.label}
              role="button"
              tabIndex={0}
              aria-label={step.desc}
              aria-pressed={isActive}
              onClick={() => cycle.pick(i)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  cycle.pick(i);
                }
              }}
              style={{ cursor: 'pointer' }}
            >
              <rect x="40" y={y} width="280" height="46" rx="8" fill={isActive ? `${color}30` : t.surfaceAlt} stroke={color} strokeWidth={isActive ? 2.5 : 1.5} />
              {isActive && <PulseRect x={40} y={y} w={280} h={46} color={color} dur={1.3} blink />}
              <text x="180" y={y + 29} textAnchor="middle" fontSize="16" fontWeight="700" fill={color}>{step.label}</text>
              {i < STEPS.length - 1 && <line x1="180" y1={y + 46} x2="180" y2={y + 74} stroke={t.textMuted} strokeWidth="1.5" markerEnd="url(#gdloop-arrow)" />}
            </g>
          );
        })}

        <path
          d={`M 320 ${stepY(3) + 22} C 350 ${stepY(3) + 22}, 350 ${stepY(0) + 22}, 320 ${stepY(0) + 22}`}
          fill="none"
          stroke={t.textMuted}
          strokeWidth="1.5"
          strokeDasharray="4 3"
          markerEnd="url(#gdloop-arrow)"
        />
        {/* the active step's description, wrapped onto two lines so it fits the 360-wide drawing */}
        <text x="180" y="440" textAnchor="middle" fontSize="14" fill={color}>
          {wrapTwo(STEPS[active].desc).map((ln, i) => (
            <tspan key={i} x="180" dy={i === 0 ? 0 : 18}>{ln}</tspan>
          ))}
        </text>
      </svg>
    </VisualizationContainer>
  );
}
