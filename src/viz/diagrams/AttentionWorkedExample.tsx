import { useEffect, useRef, useState } from 'react';
import { useVizTokens, SPACING } from '../../theme/vizTokens';
import { VisualizationContainer, VisualizationHeader, VisualizationMath, VisualizationStepController, useStepController, VizButton, usePrefersReducedMotion } from '../primitives';
import DiagramMatrix from './DiagramMatrix';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';
import { TOKENS, EMBEDDINGS, Q, K, V, RAW_SCORES, SCALE, SCALED_SCORES, ATTENTION_WEIGHTS, ATTENTION_WEIGHTS_UNSCALED, OUTPUT } from '../lib/attentionWorkedExample';

const DIM_LABELS = ['d1', 'd2', 'd3', 'd4'];

const STEPS = [
  { title: 'Token embeddings', latex: 'X \\in \\mathbb{R}^{3 \\times 4}' },
  { title: 'Project to Q, K, V', latex: 'Q = XW_Q,\\ \\ K = XW_K,\\ \\ V = XW_V' },
  { title: 'Raw attention scores', latex: 'QK^T' },
  { title: 'Scale by √dₖ', latex: '\\frac{QK^T}{\\sqrt{d_k}}' },
  { title: 'Softmax', latex: '\\mathrm{softmax}\\!\\left(\\frac{QK^T}{\\sqrt{d_k}}\\right)' },
  { title: 'Weighted sum of V', latex: '\\mathrm{softmax}\\!\\left(\\frac{QK^T}{\\sqrt{d_k}}\\right)V' },
];

/**
 * The full worked example as ONE reusable step-through, replacing what used
 * to be 6 disconnected screenshots. Same live-computed numbers throughout
 * (src/viz/lib/attentionWorkedExample.ts) -- stepping forward is literally
 * "reveal the next real computation," not a slideshow of separate images.
 */
export default function AttentionWorkedExample() {
  const t = useVizTokens();
  const controller = useStepController(STEPS.length, 1400);
  const [showUnscaled, setShowUnscaled] = useState(false);
  const step = controller.step;
  // Live by default: starts playing when scrolled into view and loops, until the reader touches it.
  const reduced = usePrefersReducedMotion();
  const [auto, setAuto] = useState(true);
  const boxRef = useRef<HTMLDivElement>(null);
  const { play, reset, playing } = controller;
  useEffect(() => {
    const el = boxRef.current;
    if (reduced || !auto || !el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) play(); }, { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, [reduced, auto, play]);
  useEffect(() => {
    if (reduced || !auto || playing || step !== STEPS.length - 1) return;
    const id = window.setTimeout(() => { reset(); play(); }, 2500);
    return () => window.clearTimeout(id);
  }, [reduced, auto, playing, step, reset, play]);

  return (
    <VisualizationContainer footer="Every matrix below is computed live from the token embeddings via real matrix multiplication -- not a fixed screenshot. Step through to watch softmax(QKᵀ/√dₖ)V build up piece by piece.">
      <div ref={boxRef} onPointerDown={() => setAuto(false)}>
      <VisualizationHeader eyebrow="Interactive · Worked Example" title={`Step ${step + 1}: ${STEPS[step].title}`} />

      <div style={{ minHeight: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', overflowX: 'auto', padding: '8px 0' }}>
        {step === 0 && <DiagramMatrix data={EMBEDDINGS} concept="token" rowLabels={TOKENS} colLabels={DIM_LABELS} cellSize={46} />}

        {step === 1 && (
          <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap', justifyContent: 'center' }}>
            {[
              { label: 'Q', data: Q, concept: 'query' as const },
              { label: 'K', data: K, concept: 'key' as const },
              { label: 'V', data: V, concept: 'value' as const },
            ].map((m) => (
              <div key={m.label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: DIAGRAM_TYPE.label.size, fontWeight: 700, color: getConceptColor(t, m.concept), marginBottom: 6 }}>{m.label}</div>
                <DiagramMatrix data={m.data} concept={m.concept} rowLabels={TOKENS} colLabels={DIM_LABELS} cellSize={40} />
              </div>
            ))}
          </div>
        )}

        {step === 2 && <DiagramMatrix data={RAW_SCORES} concept="attention" rowLabels={TOKENS} colLabels={TOKENS} cellSize={52} valueFormat={(v) => v.toFixed(0)} />}

        {step === 3 && (
          <div style={{ textAlign: 'center' }}>
            <DiagramMatrix data={SCALED_SCORES} concept="attention" rowLabels={TOKENS} colLabels={TOKENS} cellSize={52} />
            <div style={{ fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 6 }}>every raw score ÷ √{SCALE * SCALE} = {SCALE}</div>
          </div>
        )}

        {step === 4 && (
          <div style={{ textAlign: 'center' }}>
            <DiagramMatrix data={showUnscaled ? ATTENTION_WEIGHTS_UNSCALED : ATTENTION_WEIGHTS} concept="attention" rowLabels={TOKENS} colLabels={TOKENS} cellSize={52} />
            <div style={{ marginTop: 10 }}>
              <VizButton variant={showUnscaled ? 'primary' : 'secondary'} onClick={() => setShowUnscaled((v) => !v)}>
                {showUnscaled ? 'Showing: unscaled softmax (no ÷√dₖ)' : 'Show unscaled softmax for comparison'}
              </VizButton>
            </div>
            <div style={{ fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 8, maxWidth: 420 }}>
              {showUnscaled
                ? `Without scaling, "${TOKENS[2]}"'s peak weight is ${Math.max(...ATTENTION_WEIGHTS_UNSCALED[2]).toFixed(3)} -- more saturated toward one token, less gradient for the rest.`
                : `Scaled, "${TOKENS[2]}"'s peak weight drops to ${Math.max(...ATTENTION_WEIGHTS[2]).toFixed(3)} -- compare with the unscaled version.`}
            </div>
          </div>
        )}

        {step === 5 && <DiagramMatrix data={OUTPUT} concept="output" rowLabels={TOKENS} colLabels={DIM_LABELS} cellSize={46} />}
      </div>

      <div style={{ textAlign: 'center', margin: `${SPACING.sm}px 0` }}>
        <VisualizationMath latex={STEPS[step].latex} />
      </div>

      <VisualizationStepController controller={controller} totalSteps={STEPS.length} stepLabel={(s) => STEPS[s].title} />
      </div>
    </VisualizationContainer>
  );
}
