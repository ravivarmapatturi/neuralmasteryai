import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, Slider, VisualizationMath } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

function swish(x: number) {
  return x / (1 + Math.exp(-x));
}

/** SwiGLU's gate xW3 is a per-element multiplier on Swish(xW1) -- drag the
 * gate value and watch how much of the Swish branch actually survives to
 * the output, the concrete mechanics behind "the network learns which
 * features to let through." */
export default function SwiGluGatingDiagram() {
  const t = useVizTokens();
  const [swishInput, setSwishInput] = useState(2);
  const [gateValue, setGateValue] = useState(0.7);
  const swishColor = getConceptColor(t, 'attention');
  const gateColor = t.accentWarn;
  const outColor = getConceptColor(t, 'output');

  const swishOut = swish(swishInput);
  const gated = swishOut * gateValue;
  const barMax = 3;
  const barH = (v: number) => Math.min(1, Math.abs(v) / barMax) * 60;

  return (
    <VisualizationContainer footer="Two parallel projections of the same input x: Swish(xW1) is the 'content' branch, xW3 is a learned per-element GATE in (roughly) [0,1]-ish range controlling how much of that content passes through, before W2 projects the product back down. The gate itself is learned, not fixed.">
      <Slider label={`Swish(xW1) input = ${swishInput.toFixed(1)}`} min={-4} max={4} step={0.1} value={swishInput} onChange={setSwishInput} />
      <Slider label={`gate xW3 = ${gateValue.toFixed(2)}`} min={0} max={1} step={0.05} value={gateValue} onChange={setGateValue} />
      <svg width="100%" viewBox="0 0 400 130" style={{ display: 'block', marginTop: 10 }}>
        {/* Baseline */}
        <line x1={20} y1={75} x2={360} y2={75} stroke={t.border} strokeWidth={1.5} />

        {/* 1. Swish(xW1) content bar */}
        <rect
          x={55}
          y={swishOut >= 0 ? 75 - barH(swishOut) : 75}
          width={44}
          height={Math.max(2, barH(swishOut))}
          fill={swishColor}
          opacity={0.85}
          rx={4}
        />
        <text x={77} y={95} textAnchor="middle" fontSize={11} fontWeight={700} fill={swishColor}>Swish</text>
        <text x={77} y={110} textAnchor="middle" fontSize={9.5} fontFamily="monospace" fill={t.textSecondary}>{swishOut.toFixed(2)}</text>

        {/* Multiply operator */}
        <text x={145} y={60} textAnchor="middle" fontSize={20} fontWeight={700} fill={t.textMuted}>⊙</text>
        <text x={145} y={75} textAnchor="middle" fontSize={8} fill={t.textMuted}>elementwise</text>

        {/* 2. Gate xW3 bar */}
        <rect
          x={185}
          y={75 - (gateValue * 60)}
          width={44}
          height={Math.max(2, gateValue * 60)}
          fill={gateColor}
          opacity={0.85}
          rx={4}
        />
        <text x={207} y={95} textAnchor="middle" fontSize={11} fontWeight={700} fill={gateColor}>Gate</text>
        <text x={207} y={110} textAnchor="middle" fontSize={9.5} fontFamily="monospace" fill={t.textSecondary}>{gateValue.toFixed(2)}</text>

        {/* Equals operator */}
        <text x={275} y={60} textAnchor="middle" fontSize={20} fontWeight={700} fill={t.textMuted}>=</text>

        {/* 3. Output bar */}
        <rect
          x={310}
          y={gated >= 0 ? 75 - barH(gated) : 75}
          width={44}
          height={Math.max(2, barH(gated))}
          fill={outColor}
          opacity={0.9}
          rx={4}
        />
        <text x={332} y={95} textAnchor="middle" fontSize={11} fontWeight={700} fill={outColor}>Output</text>
        <text x={332} y={110} textAnchor="middle" fontSize={9.5} fontFamily="monospace" fill={t.textSecondary}>{gated.toFixed(2)}</text>
      </svg>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 4 }}>
        Gate near 0 -- this feature is blocked regardless of its Swish activation. Gate near 1 -- it passes through nearly unchanged.
      </div>
      <div style={{ marginTop: 8, textAlign: 'center' }}>
        <VisualizationMath latex="\text{SwiGLU}(x) = \text{Swish}(xW_1) \odot (xW_3)\, W_2" />
      </div>
    </VisualizationContainer>
  );
}
