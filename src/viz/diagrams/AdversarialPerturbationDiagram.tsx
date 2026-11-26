import { useId, useMemo, useState } from 'react';
import { FONT_FAMILY, useVizTokens } from '../../theme/vizTokens';
import {
  PillSelect,
  Slider,
  StickyNote,
  StickyRow,
  VisualizationContainer,
  VisualizationHeader,
  VizButton,
  useVizVisible,
} from '../primitives';
import {
  ADV_EPSILON_SWEEP,
  evaluatePerturbation,
  explainPerturbation,
  type AttackMethod,
} from '../lib/adversarialPerturbation';
import { NumericField, PredictChallenge } from './playgroundPrimitives';
import { useResponsiveHostWidth, useStepPlayback } from './useStepPlayback';

const DOMAIN_MIN = -2.2;
const DOMAIN_MAX = 2.2;

const PREDICT_OPTIONS = [
  'About ε = 0.10 (shortest L2 distance from radius 1.36 to boundary 1.26)',
  'At least ε = 0.50 (halfway back to the origin)',
  'Never — any small nudge keeps the point in Class 1',
] as const;

function AdversarialPerturbationPlayground({
  compact = false,
  outerVisible = true,
}: {
  compact?: boolean;
  outerVisible?: boolean;
}) {
  const t = useVizTokens();
  const clipSpaceId = useId();
  const clipBarsId = useId();
  const { hostRef, isCompactPhone } = useResponsiveHostWidth(760);

  const [method, setMethod] = useState<AttackMethod>('l2');
  const [startX, setStartX] = useState(1.3);
  const [startY, setStartY] = useState(0.4);
  const [rSquared, setRSquared] = useState(1.6);
  const [manualEps, setManualEps] = useState<number | null>(null);
  const [prediction, setPrediction] = useState<number | null>(null);

  // Reduced-motion opens at step 3 (epsilon = 0.16) where L2/FGSM flips Class 1 -> Class 0 cleanly.
  const playback = useStepPlayback(ADV_EPSILON_SWEEP.length, 1300, 3, outerVisible);
  const epsilon = manualEps !== null ? manualEps : ADV_EPSILON_SWEEP[playback.step];

  const res = useMemo(
    () =>
      evaluatePerturbation({
        start: [startX, startY],
        epsilon,
        method,
        rSquared,
      }),
    [startX, startY, epsilon, method, rSquared],
  );

  const caption = explainPerturbation(res);
  const class1Color = t.accentPrimary;
  const class0Color = t.accentDanger;
  const boundaryColor = t.accentSecondary;
  const budgetColor = t.accentPurple;

  const setUserEps = (val: number) => {
    playback.stop();
    setManualEps(Math.max(0, Math.min(0.65, Math.round(val * 100) / 100)));
  };

  const chooseMethod = (next: AttackMethod) => {
    setMethod(next);
    setPrediction(null);
  };

  const renderSpacePanel = (offsetX: number, panelW: number) => {
    const plotSize = 224;
    const plotX = offsetX + Math.round((panelW - plotSize) / 2);
    const plotY = 38;
    const px = (x: number) => plotX + ((x - DOMAIN_MIN) / (DOMAIN_MAX - DOMAIN_MIN)) * plotSize;
    const py = (y: number) => plotY + plotSize - ((y - DOMAIN_MIN) / (DOMAIN_MAX - DOMAIN_MIN)) * plotSize;
    const unitPx = plotSize / (DOMAIN_MAX - DOMAIN_MIN);

    const handleClick = (e: React.MouseEvent<SVGGElement>) => {
      const svg = e.currentTarget.ownerSVGElement;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const vb = svg.viewBox.baseVal;
      const vx = ((e.clientX - rect.left) / rect.width) * vb.width;
      const vy = ((e.clientY - rect.top) / rect.height) * vb.height;
      if (vx < plotX || vx > plotX + plotSize || vy < plotY || vy > plotY + plotSize) return;
      const nx = Number((DOMAIN_MIN + ((vx - plotX) / plotSize) * (DOMAIN_MAX - DOMAIN_MIN)).toFixed(2));
      const ny = Number((DOMAIN_MAX - ((vy - plotY) / plotSize) * (DOMAIN_MAX - DOMAIN_MIN)).toFixed(2));
      setStartX(Math.max(-2.0, Math.min(2.0, nx)));
      setStartY(Math.max(-2.0, Math.min(2.0, ny)));
    };

    const bx = px(res.start[0]);
    const by = py(res.start[1]);
    const ax = px(res.perturbed[0]);
    const ay = py(res.perturbed[1]);
    const epsPx = res.epsilon * unitPx;
    const rPx = res.boundaryRadius * unitPx;

    return (
      <g onClick={handleClick} style={{ cursor: 'crosshair' }}>
        <text x={offsetX + 8} y={20} fontSize={16} fontWeight={700} fill={t.textPrimary}>
          1. Input space (click plot to move x)
        </text>
        <defs>
          <clipPath id={`${clipSpaceId}-${offsetX}`}>
            <rect x={plotX} y={plotY} width={plotSize} height={plotSize} />
          </clipPath>
        </defs>
        <rect x={plotX} y={plotY} width={plotSize} height={plotSize} fill={class1Color} fillOpacity={0.08} stroke={t.border} rx={4} />

        <g clipPath={`url(#${clipSpaceId}-${offsetX})`}>
          {/* Axes at 0 */}
          <line x1={plotX} y1={py(0)} x2={plotX + plotSize} y2={py(0)} stroke={t.border} strokeWidth={1} />
          <line x1={px(0)} y1={plotY} x2={px(0)} y2={plotY + plotSize} stroke={t.border} strokeWidth={1} />

          {/* Class 0 interior */}
          <circle
            cx={px(0)}
            cy={py(0)}
            r={rPx}
            fill={class0Color}
            fillOpacity={0.14}
            stroke={boundaryColor}
            strokeWidth={2.2}
            strokeDasharray="6 4"
          />

          {/* Allowed epsilon budget envelope */}
          {res.epsilon > 0 && (
            method === 'fgsm' ? (
              <rect
                x={bx - epsPx}
                y={by - epsPx}
                width={epsPx * 2}
                height={epsPx * 2}
                fill={budgetColor}
                fillOpacity={0.12}
                stroke={budgetColor}
                strokeWidth={1.6}
                strokeDasharray="4 3"
              />
            ) : (
              <circle
                cx={bx}
                cy={by}
                r={epsPx}
                fill={budgetColor}
                fillOpacity={0.12}
                stroke={budgetColor}
                strokeWidth={1.6}
                strokeDasharray="4 3"
              />
            )
          )}

          {/* Nudge line */}
          {res.epsilon > 0 && (
            <line x1={bx} y1={by} x2={ax} y2={ay} stroke={budgetColor} strokeWidth={2.2} />
          )}

          {/* Original and Perturbed dots */}
          <circle cx={bx} cy={by} r={5} fill={res.baseClass === 1 ? class1Color : class0Color} stroke={t.background} strokeWidth={1.5} />
          {res.epsilon > 0 && (
            <circle cx={ax} cy={ay} r={5.5} fill={res.perturbedClass === 1 ? class1Color : class0Color} stroke={t.background} strokeWidth={1.5} />
          )}

          <text
            x={res.start[0] > 0.7 ? bx - 10 : bx + 10}
            y={Math.max(plotY + 18, by - 10)}
            textAnchor={res.start[0] > 0.7 ? 'end' : 'start'}
            fontSize={14}
            fontWeight={700}
            fill={res.baseClass === 1 ? class1Color : class0Color}
            stroke={t.background}
            strokeWidth={4}
            paintOrder="stroke"
          >
            x ({res.baseClass})
          </text>

          {res.epsilon > 0 && (
            <text
              x={res.perturbed[0] > 0.8 ? ax - 10 : ax + 10}
              y={Math.min(plotY + plotSize - 8, ay + 18)}
              textAnchor={res.perturbed[0] > 0.8 ? 'end' : 'start'}
              fontSize={14}
              fontWeight={700}
              fill={res.perturbedClass === 1 ? class1Color : class0Color}
              stroke={t.background}
              strokeWidth={4}
              paintOrder="stroke"
            >
              x_adv ({res.perturbedClass})
            </text>
          )}
        </g>

        {[-2, 0, 2].map((tick) => (
          <text key={`xt-${tick}`} x={px(tick)} y={plotY + plotSize + 18} textAnchor="middle" fontSize={14} fill={t.textMuted}>
            {tick}
          </text>
        ))}
        {[-2, 0, 2].map((tick) => (
          <text key={`yt-${tick}`} x={plotX - 8} y={py(tick) + 5} textAnchor="end" fontSize={14} fill={t.textMuted}>
            {tick}
          </text>
        ))}
        <text x={plotX + plotSize / 2} y={plotY + plotSize + 36} textAnchor="middle" fontSize={14} fill={t.textSecondary}>
          Feature x₁ (boundary x₁² + x₂² = {rSquared.toFixed(2)})
        </text>
      </g>
    );
  };

  const renderConfidencePanel = (offsetX: number, panelW: number) => {
    const plotX = offsetX + 12;
    const plotY = 38;
    const plotW = panelW - 22;
    const plotH = 224;
    const barX = plotX + 12;
    const barW = plotW - 24;

    const methodTag = method === 'l2' ? 'L2 gradient' : method === 'fgsm' ? 'FGSM box' : 'Random';
    const randProb1 = 1 / (1 + Math.exp(-Math.max(-20, Math.min(20, 4 * res.randomScore))));

    const rows = [
      {
        title: `1. Original x: Class ${res.baseClass} (s = ${res.baseScore.toFixed(2)})`,
        prob: res.baseProb1,
        col: res.baseClass === 1 ? class1Color : class0Color,
      },
      {
        title: `2. ${methodTag} x_adv: Class ${res.perturbedClass} (${res.flipped ? 'FLIPPED!' : `s = ${res.perturbedScore.toFixed(2)}`})`,
        prob: res.perturbedProb1,
        col: res.perturbedClass === 1 ? class1Color : class0Color,
      },
      {
        title: `3. Random (same ε): Class ${res.randomClass} (s = ${res.randomScore.toFixed(2)})`,
        prob: randProb1,
        col: res.randomClass === 1 ? class1Color : class0Color,
      },
    ];

    return (
      <g>
        <text x={offsetX + 8} y={20} fontSize={16} fontWeight={700} fill={t.textPrimary}>
          2. Score &amp; Class 1 confidence vs. random
        </text>
        <defs>
          <clipPath id={`${clipBarsId}-${offsetX}`}>
            <rect x={plotX} y={plotY} width={plotW} height={plotH} />
          </clipPath>
        </defs>
        <rect x={plotX} y={plotY} width={plotW} height={plotH} fill={t.background} stroke={t.border} rx={4} />

        <g clipPath={`url(#${clipBarsId}-${offsetX})`}>
          {rows.map((r, i) => {
            const ry = plotY + 14 + i * 52;
            const fillW = Math.max(4, Math.min(barW, r.prob * barW));
            return (
              <g key={r.title}>
                <text x={barX} y={ry + 12} fontSize={14} fontWeight={700} fill={r.col}>
                  {r.title}
                </text>
                <rect x={barX} y={ry + 20} width={barW} height={16} rx={4} fill={t.surfaceAlt} />
                <rect x={barX} y={ry + 20} width={fillW} height={16} rx={4} fill={r.col} fillOpacity={0.85} />
                <line x1={barX + barW / 2} y1={ry + 17} x2={barX + barW / 2} y2={ry + 39} stroke={boundaryColor} strokeWidth={1.6} strokeDasharray="3 2" />
              </g>
            );
          })}

          <text x={barX} y={plotY + 186} fontSize={14} fontWeight={700} fill={t.textPrimary}>
            Nudge: Δx₁ = {res.delta[0].toFixed(3)}, Δx₂ = {res.delta[1].toFixed(3)}
          </text>
          <text x={barX} y={plotY + 208} fontSize={14} fill={t.textSecondary}>
            Distance to boundary = {res.exactBoundaryDist.toFixed(3)} (L2 used = {res.l2Distance.toFixed(3)})
          </text>
        </g>

        <text x={plotX + plotW / 2} y={plotY + plotH + 36} textAnchor="middle" fontSize={14} fill={t.textSecondary}>
          Dashed blue center = 50% decision threshold (s = 0)
        </text>
      </g>
    );
  };

  return (
    <>
      {!compact && (
        <>
          <VisualizationHeader
            eyebrow="Live playground"
            title="Why a tiny, invisible nudge can flip a model's prediction"
            description="A classifier draws a boundary through feature space; by stepping straight toward the nearest boundary along the model's gradient, an attacker flips the prediction with a nudge too small for humans to notice."
          />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 10, marginBottom: 8 }}>
            <PillSelect<AttackMethod>
              label="Attack method (how the nudge direction is chosen)"
              value={method}
              onChange={(v) => chooseMethod(typeof v === 'function' ? v(method) : v)}
              options={[
                { value: 'l2', label: 'L2 gradient step' },
                { value: 'fgsm', label: 'FGSM (L∞ sign)' },
                { value: 'random', label: 'Random nudge' },
              ]}
            />

            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <VizButton
                onClick={() => {
                  setManualEps(null);
                  playback.toggle();
                }}
              >
                {playback.playing && manualEps === null ? 'Pause' : 'Play'}
              </VizButton>
              <VizButton
                variant="secondary"
                onClick={() => {
                  setManualEps(null);
                  playback.next();
                }}
              >
                Step →
              </VizButton>
              <VizButton
                variant="secondary"
                onClick={() => {
                  setManualEps(null);
                  playback.reset();
                }}
              >
                Reset
              </VizButton>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 8 }}>
            <Slider
              label="Perturbation budget ε (how big the nudge is)"
              value={epsilon}
              onChange={setUserEps}
              min={0}
              max={0.6}
              step={0.01}
              format={(v) => v.toFixed(2)}
            />
            <Slider
              label="Boundary threshold R² (circle size)"
              value={rSquared}
              onChange={setRSquared}
              min={0.6}
              max={2.6}
              step={0.1}
              format={(v) => v.toFixed(2)}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))', gap: 10, marginBottom: 10 }}>
            <NumericField label="Nudge budget ε" hint="0.00 to 0.60" value={Number(epsilon.toFixed(2))} min={0} max={0.6} step={0.01} integer={false} onChange={setUserEps} />
            <NumericField label="Start x₁" hint="-2.0 to 2.0" value={Number(startX.toFixed(2))} min={-2.0} max={2.0} step={0.05} integer={false} onChange={setStartX} />
            <NumericField label="Start x₂" hint="-2.0 to 2.0" value={Number(startY.toFixed(2))} min={-2.0} max={2.0} step={0.05} integer={false} onChange={setStartY} />
            <NumericField label="Boundary R²" hint="0.60 to 2.60" value={Number(rSquared.toFixed(2))} min={0.6} max={2.6} step={0.1} integer={false} onChange={setRSquared} />
          </div>
        </>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px', fontSize: 15, marginBottom: 4 }} aria-label="Adversarial perturbation legend">
        <span style={{ color: class1Color }}>● Class 1 (score &gt; 0)</span>
        <span style={{ color: class0Color }}>● Class 0 (score ≤ 0, flipped)</span>
        <span style={{ color: boundaryColor }}>● Decision boundary s = 0</span>
        <span style={{ color: budgetColor }}>● Allowed ε budget &amp; nudge</span>
      </div>

      <div ref={hostRef} style={{ width: '100%' }}>
        {!isCompactPhone ? (
          <svg
            width="100%"
            viewBox="0 0 760 306"
            role="img"
            aria-label={caption}
            style={{ display: 'block', fontFamily: FONT_FAMILY }}
          >
            {renderSpacePanel(0, 396)}
            <line x1={404} y1={14} x2={404} y2={290} stroke={t.border} strokeDasharray="4 4" strokeWidth={1.2} />
            {renderConfidencePanel(412, 348)}
          </svg>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            <svg width="100%" viewBox="0 0 380 306" role="img" aria-label="2D decision boundary and perturbation step" style={{ display: 'block', fontFamily: FONT_FAMILY }}>
              {renderSpacePanel(0, 380)}
            </svg>
            <svg width="100%" viewBox="0 0 380 306" role="img" aria-label="Score and confidence comparison" style={{ display: 'block', fontFamily: FONT_FAMILY }}>
              {renderConfidencePanel(0, 380)}
            </svg>
          </div>
        )}
      </div>

      {compact ? (
        <StickyRow>
          <StickyNote
            title="Gradient perturbation rule"
            latex={String.raw`x_{\text{adv}} = x - \varepsilon \frac{\nabla s(x)}{\lVert \nabla s(x) \rVert_2}`}
            color="yellow"
            tilt={-1}
          >
            <p className="nm-sticky__mono" style={{ textAlign: 'center' }}>
              ε = {epsilon.toFixed(2)} · score {res.baseScore.toFixed(2)} → <strong>{res.perturbedScore.toFixed(2)}</strong> ({res.flipped ? 'flipped!' : 'same class'})
            </p>
          </StickyNote>
          <StickyNote title={`What just happened · ε = ${epsilon.toFixed(2)}`} color="blue" tilt={1} live>
            <p>{caption}</p>
          </StickyNote>
        </StickyRow>
      ) : (
        <>
          <StickyRow>
            <StickyNote
              title="1. L2 gradient step"
              latex={String.raw`x_{\text{adv}} = x - \varepsilon \frac{\nabla s(x)}{\lVert \nabla s(x) \rVert_2}`}
              color="yellow"
              tilt={-1}
              active={method === 'l2'}
              onSelect={() => chooseMethod('l2')}
            >
              <p>Takes the shortest Euclidean path straight across the boundary using ∇s = (2x₁, 2x₂).</p>
            </StickyNote>
            <StickyNote
              title="2. FGSM (L∞ sign step)"
              latex={String.raw`x_{\text{adv}} = x - \varepsilon \operatorname{sign}\!\bigl(\nabla s(x)\bigr)`}
              color="pink"
              tilt={1}
              active={method === 'fgsm'}
              onSelect={() => chooseMethod('fgsm')}
            >
              <p>Nudges every coordinate by ±ε inside a square box, giving total L2 length √2·ε in 2D.</p>
            </StickyNote>
            <StickyNote
              title="3. Random unaligned nudge"
              latex={String.raw`x_{\text{rand}} = x + \varepsilon \, u, \quad \lVert u \rVert_2 = 1`}
              color="orange"
              tilt={-1}
              active={method === 'random'}
              onSelect={() => chooseMethod('random')}
            >
              <p>Random directions spend most of ε running sideways along the boundary instead of crossing it.</p>
            </StickyNote>
          </StickyRow>

          <StickyRow>
            <StickyNote title={`Worked numbers (ε = ${epsilon.toFixed(2)})`} color="green" tilt={-1}>
              <p className="nm-sticky__mono">
                x = ({res.start[0].toFixed(2)}, {res.start[1].toFixed(2)}) → s = <strong>{res.baseScore.toFixed(3)}</strong> (Class {res.baseClass})
              </p>
              <p className="nm-sticky__mono" style={{ marginTop: 4 }}>
                x_adv = ({res.perturbed[0].toFixed(2)}, {res.perturbed[1].toFixed(2)}) → s ={' '}
                <strong style={{ color: res.flipped ? class0Color : class1Color }}>{res.perturbedScore.toFixed(3)}</strong> (Class {res.perturbedClass})
              </p>
            </StickyNote>
            <StickyNote title={`What just happened · ε = ${epsilon.toFixed(2)}`} color="blue" tilt={1} live>
              <p>{caption}</p>
            </StickyNote>
          </StickyRow>

          <PredictChallenge
            prompt="Start at x = (1.30, 0.40) (score +0.25, Class 1) with boundary x₁² + x₂² = 1.60. What is the smallest L2 gradient step ε that flips it to Class 0?"
            options={PREDICT_OPTIONS}
            correctIndex={0}
            selected={prediction}
            onSelect={setPrediction}
            explanation="Radius at (1.30, 0.40) is √1.85 ≈ 1.360, while the boundary radius is √1.60 ≈ 1.265 — a gap of 0.095. At ε = 0.10 the score drops to −0.012 (Class 0), whereas a random nudge of ε = 0.15 still stays in Class 1."
            actionLabel="Test L2 step ε = 0.10 now"
            onAction={() => {
              setMethod('l2');
              setStartX(1.3);
              setStartY(0.4);
              setRSquared(1.6);
              playback.stop();
              setManualEps(0.1);
            }}
          />
        </>
      )}
    </>
  );
}

export default function AdversarialPerturbationDiagram({ compact = false }: { compact?: boolean } = {}) {
  const outerVisible = useVizVisible();
  return (
    <VisualizationContainer
      title="Adversarial perturbation explorer"
      footer={
        compact
          ? undefined
          : 'Exact 2D classifier s(x) = x₁² + x₂² − R² with live gradient ∇s = (2x₁, 2x₂). Click anywhere in the feature plane to move x and compare L2 gradient steps, FGSM (L∞), and random perturbations.'
      }
    >
      <AdversarialPerturbationPlayground compact={compact} outerVisible={outerVisible} />
    </VisualizationContainer>
  );
}
