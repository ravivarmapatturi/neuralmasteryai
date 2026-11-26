import { useId, useMemo, useState } from 'react';
import { FONT_FAMILY, useVizTokens } from '../../theme/vizTokens';
import { StickyNote, StickyRow, VisualizationContainer, VisualizationHeader, VizButton, useVizVisible } from '../primitives';
import { analyzeSuperposition, explainFeatureStep } from '../lib/superposition';
import { NumericField, PredictChallenge } from './playgroundPrimitives';
import { useStepPlayback } from './useStepPlayback';

const PREDICT_OPTIONS = [
  'The 4-neuron wide basis',
  'The 2-neuron packed basis',
  'Both reconstruct equally well',
] as const;

function SuperpositionPlayground({ compact, outerVisible }: { compact: boolean; outerVisible: boolean }) {
  const t = useVizTokens();
  const vectorClip = useId();
  const matrixClip = useId();
  const [features, setFeatures] = useState(6);
  const [neurons, setNeurons] = useState(2);
  const [activeFeatures, setActiveFeatures] = useState(2);
  const [threshold, setThreshold] = useState(0.15);
  const [prediction, setPrediction] = useState<number | null>(null);
  const packed = useMemo(() => analyzeSuperposition(features, neurons, activeFeatures, threshold), [activeFeatures, features, neurons, threshold]);
  const wide = useMemo(() => analyzeSuperposition(features, features, activeFeatures, threshold), [activeFeatures, features, threshold]);
  const playback = useStepPlayback(features, 1300, Math.min(1, features - 1), outerVisible);
  const currentFeature = Math.min(features - 1, playback.step);
  const caption = explainFeatureStep(currentFeature, packed);

  const activeColor = t.accentSecondary;
  const currentColor = t.accentPurple;
  const collisionColor = t.accentDanger;
  const wideColor = t.accentPrimary;
  const center = { x: 190, y: 164 };
  const vectorRadius = 105;
  const matrixCell = Math.min(25, 220 / features);
  const matrixSize = matrixCell * features;
  const matrixX = 480;
  const matrixY = 64;
  const strongest = packed.gram[currentFeature].reduce((best, value, index, row) => (
    index !== currentFeature && Math.abs(value) > Math.abs(row[best] ?? 0) ? index : best
  ), currentFeature === 0 ? 1 : 0);

  const update = (setter: (value: number) => void, value: number) => {
    playback.stop();
    setter(value);
    setPrediction(null);
  };

  return (
    <>
      {!compact && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 360px', minWidth: 0 }}>
              <VisualizationHeader
                eyebrow="Live playground"
                title="Fit more learned features than there are neurons"
                description="Superposition lets a network store many useful patterns as overlapping directions, but two features can interfere when they are active together."
              />
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', paddingTop: 2 }}>
              <VizButton onClick={playback.toggle}>{playback.playing ? 'Pause' : 'Play'}</VizButton>
              <VizButton variant="secondary" onClick={playback.next}>Step</VizButton>
              <VizButton variant="secondary" onClick={playback.reset}>Reset</VizButton>
            </div>
          </div>
          <p style={{ margin: '0 0 7px', fontSize: 15, color: t.textSecondary }}>
            A <strong>feature</strong> is one recognizable pattern the model may need, such as an edge or a topic. W stores one direction per feature inside a smaller neuron space.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
            <NumericField label="Features n" hint="patterns to represent" value={features} min={3} max={10} onChange={(value) => {
              playback.stop();
              setFeatures(value);
              setNeurons((current) => Math.min(current, Math.max(2, value - 1)));
              setActiveFeatures((current) => Math.min(current, value));
              setPrediction(null);
            }} />
            <NumericField label="Neurons m" hint="available hidden dimensions" value={neurons} min={2} max={Math.max(2, features - 1)} onChange={(value) => update(setNeurons, value)} />
            <NumericField label="Features active together" hint="input sparsity example" value={activeFeatures} min={1} max={features} onChange={(value) => update(setActiveFeatures, value)} />
            <NumericField label="Decoder threshold b" hint="suppresses weak cross-talk" value={threshold} min={0} max={1} step={0.05} integer={false} onChange={(value) => update(setThreshold, value)} />
          </div>
        </>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px 18px', fontSize: 15, margin: '7px 0 2px' }} aria-label="Superposition legend">
        {[
          ['Feature active in x', activeColor],
          ['Feature being inspected', currentColor],
          ['Packed-space collision', collisionColor],
          ['Wide orthogonal basis', wideColor],
        ].map(([label, color]) => <span key={label} style={{ color }}><span style={{ display: 'inline-block', width: 18, height: 4, background: color, marginRight: 6, verticalAlign: 'middle' }} />{label}</span>)}
      </div>

      <svg width="100%" viewBox="0 0 760 354" role="img" aria-label={caption} style={{ display: 'block', fontFamily: FONT_FAMILY }}>
        <defs>
          <clipPath id={vectorClip}><rect x={28} y={43} width={340} height={250} /></clipPath>
          <clipPath id={matrixClip}><rect x={matrixX} y={matrixY} width={matrixSize} height={matrixSize} /></clipPath>
        </defs>
        <text x={24} y={24} fontSize={16} fontWeight={700} fill={t.textPrimary}>Feature directions inside the {neurons}-neuron space</text>
        <text x={426} y={24} fontSize={16} fontWeight={700} fill={t.textPrimary}>Gram matrix G = WᵀW</text>
        <text x={426} y={43} fontSize={14} fill={t.textSecondary}>each square is a pairwise cosine</text>

        <g clipPath={`url(#${vectorClip})`}>
          <line x1={55} y1={center.y} x2={334} y2={center.y} stroke={t.border} strokeWidth={1.3} />
          <line x1={center.x} y1={55} x2={center.x} y2={276} stroke={t.border} strokeWidth={1.3} />
          <text x={332} y={center.y - 8} textAnchor="end" fontSize={14} fill={t.textSecondary}>neuron 1</text>
          <text x={center.x + 8} y={68} fontSize={14} fill={t.textSecondary}>neuron 2</text>
          {packed.vectors.map((vector, index) => {
            const endpoint = { x: center.x + (vector[0] ?? 0) * vectorRadius, y: center.y - (vector[1] ?? 0) * vectorRadius };
            const isCurrent = index === currentFeature;
            const isStrongest = index === strongest;
            const isActive = packed.activeIndices.includes(index);
            const color = isCurrent ? currentColor : isStrongest ? collisionColor : isActive ? activeColor : t.textMuted;
            return (
              <g key={index} opacity={isCurrent || isStrongest || isActive ? 1 : 0.5}>
                <line x1={center.x} y1={center.y} x2={endpoint.x} y2={endpoint.y} stroke={color} strokeWidth={isCurrent ? 3 : 2} />
                <path d={`M${endpoint.x} ${endpoint.y} l${vector[0] >= 0 ? -8 : 8} ${vector[1] >= 0 ? 4 : -4} l${vector[0] >= 0 ? 2 : -2} ${vector[1] >= 0 ? -9 : 9} Z`} fill={color} />
                <circle cx={endpoint.x} cy={endpoint.y} r={3.5} fill={color} />
                {isCurrent && (
                  <>
                    <line x1={endpoint.x} y1={endpoint.y} x2={endpoint.x + (vector[0] >= 0 ? 22 : -22)} y2={endpoint.y - 16} stroke={currentColor} strokeWidth={1.3} />
                    <text x={endpoint.x + (vector[0] >= 0 ? 26 : -26)} y={endpoint.y - 18} textAnchor={vector[0] >= 0 ? 'start' : 'end'} fontSize={14} fontWeight={700} fill={currentColor}>feature {index + 1}</text>
                  </>
                )}
              </g>
            );
          })}
          <circle cx={center.x} cy={center.y} r={4} fill={t.textPrimary} />
        </g>
        <text x={24} y={312} fontSize={14} fill={t.textSecondary}>{neurons > 2 ? 'The drawing shows the first two neuron coordinates; calculations use all m dimensions.' : 'Every arrow is a full feature direction in this two-neuron plane.'}</text>

        <g clipPath={`url(#${matrixClip})`}>
          {packed.gram.map((row, r) => row.map((value, c) => {
            const magnitude = Math.min(1, Math.abs(value));
            const color = r === c ? t.textSecondary : value >= 0 ? t.accentPrimary : collisionColor;
            return <rect key={`${r}-${c}`} x={matrixX + c * matrixCell} y={matrixY + r * matrixCell} width={matrixCell - 1.5} height={matrixCell - 1.5} rx={2} fill={color} fillOpacity={r === c ? 0.9 : 0.08 + magnitude * 0.85} stroke={r === currentFeature ? currentColor : 'none'} strokeWidth={1.4} />;
          }))}
        </g>
        {Array.from({ length: features }, (_, index) => (
          <g key={index}>
            <text x={matrixX + index * matrixCell + matrixCell / 2} y={matrixY - 7} textAnchor="middle" fontSize={14} fill={index === currentFeature ? currentColor : t.textSecondary}>{index + 1}</text>
            <text x={matrixX - 9} y={matrixY + index * matrixCell + matrixCell / 2 + 5} textAnchor="end" fontSize={14} fill={index === currentFeature ? currentColor : t.textSecondary}>{index + 1}</text>
          </g>
        ))}
        <text x={matrixX + matrixSize / 2} y={matrixY + matrixSize + 22} textAnchor="middle" fontSize={14} fill={t.textSecondary}>off-diagonal colour = feature interference</text>

        <text x={426} y={300} fontSize={14} fontWeight={700} fill={collisionColor}>Packed m={neurons}: mean |cos| {packed.meanAbsCosine.toFixed(3)} · MSE {packed.mse.toFixed(3)}</text>
        <rect x={426} y={310} width={280} height={12} rx={4} fill={t.surfaceAlt} />
        <rect x={426} y={310} width={280 * Math.min(1, packed.meanAbsCosine)} height={12} rx={4} fill={collisionColor} />
        <text x={426} y={342} fontSize={14} fontWeight={700} fill={wideColor}>Wide m=n={features}: mean |cos| {wide.meanAbsCosine.toFixed(3)} · MSE {wide.mse.toFixed(3)}</text>
      </svg>

      {compact ? (
        <StickyRow>
          <StickyNote title="Encode then decode" latex={String.raw`h=Wx \qquad \hat{x}=\operatorname{ReLU}(W^T h-b)`} color="yellow" tilt={-1}>
            <p style={{ textAlign: 'center' }}>packed MSE = <strong>{packed.mse.toFixed(3)}</strong></p>
          </StickyNote>
          <StickyNote title={`What just happened · feature ${currentFeature + 1}`} color="blue" tilt={1} live><p>{caption}</p></StickyNote>
        </StickyRow>
      ) : (
        <>
          <StickyRow>
            <StickyNote title="Encode features into neurons" latex={String.raw`h=Wx`} color="yellow" tilt={-1}>
              <p>x says which features are present; W turns them into the hidden neuron values h.</p>
            </StickyNote>
            <StickyNote title="Decode the features again" latex={String.raw`\hat{x}=\operatorname{ReLU}(W^T h-b)`} color="pink" tilt={1}>
              <p>b is the editable threshold; ReLU replaces negative guesses with zero.</p>
            </StickyNote>
            <StickyNote title="Collision for feature i" latex={String.raw`I_i=\sum_{j\ne i}(\hat{w}_i^T w_j)^2`} color="orange" tilt={-1}>
              <p>A zero dot product means two feature directions are orthogonal and do not collide.</p>
            </StickyNote>
          </StickyRow>
          <StickyRow>
            <StickyNote title="Worked numbers" color="green" tilt={-1}>
              <p style={{ fontVariantNumeric: 'tabular-nums' }}>n={features} features, m={neurons} neurons, {packed.activeIndices.length} active: packed mean |cos| = <strong>{packed.meanAbsCosine.toFixed(3)}</strong>, MSE = <strong>{packed.mse.toFixed(3)}</strong>.</p>
              <p style={{ fontVariantNumeric: 'tabular-nums' }}>With m=n={features}: mean |cos| = <strong>{wide.meanAbsCosine.toFixed(3)}</strong>, MSE = <strong>{wide.mse.toFixed(3)}</strong>.</p>
            </StickyNote>
            <StickyNote title={`What just happened · feature ${currentFeature + 1} of ${features}`} color="blue" tilt={1} live><p>{caption}</p></StickyNote>
          </StickyRow>
          <PredictChallenge
            prompt="Four features are active three at a time. Which basis reconstructs them with lower error: 2 packed neurons or 4 separate neurons?"
            options={PREDICT_OPTIONS}
            correctIndex={0}
            selected={prediction}
            onSelect={setPrediction}
            explanation="The 4-neuron basis gives each feature an orthogonal direction, so the toy decoder recovers all three active features exactly; antipodal packed features can cancel."
            actionLabel="Run n=4, m=2, three active now"
            onAction={() => {
              setFeatures(4);
              setNeurons(2);
              setActiveFeatures(3);
              setThreshold(0);
              playback.playFromStart();
            }}
          />
        </>
      )}
    </>
  );
}

export default function SuperpositionDiagram({ compact = false }: { compact?: boolean } = {}) {
  const outerVisible = useVizVisible();
  return (
    <VisualizationContainer
      title="Superposition explorer"
      footer={compact ? undefined : 'The diagram follows the Toy Models of Superposition convention: feature directions are columns of W, h = Wx, and the ReLU decoder uses Wᵀ. The regular directions are a calculated teaching geometry, not weights measured from a trained language model.'}
    >
      <SuperpositionPlayground compact={compact} outerVisible={outerVisible} />
    </VisualizationContainer>
  );
}
