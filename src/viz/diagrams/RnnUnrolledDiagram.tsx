import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, VisualizationMath } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

const STEPS = 4;

/** The same cell (identical weights W_h, W_x, b) applied at every time
 * step -- "unrolled" just means drawing that one repeated computation out
 * across time instead of looping it. The hidden state is the only thing
 * that carries information from step to step. */
export default function RnnUnrolledDiagram() {
  const t = useVizTokens();
  const [activeStep, setActiveStep] = useState<number | null>(null);
  const cellColor = getConceptColor(t, 'attention');
  const tokenColor = getConceptColor(t, 'token');

  const width = 560;
  const height = 190;
  const cellY = 60;
  const inputY = 160;
  const cellW = 66;
  const cellH = 46;
  const stepX = (i: number) => 90 + i * ((width - 90 - 40) / (STEPS - 1));
  const h0X = 30;

  return (
    <VisualizationContainer footer="Same weights (W_h, W_x, b) reused at every step -- that sharing is what lets an RNN handle any sequence length with a fixed parameter count, and it's exactly why gradients have to flow through so many repeated multiplications during training.">
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
        <defs>
          <marker id="rnnu-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 Z" fill={cellColor} />
          </marker>
        </defs>

        <circle cx={h0X} cy={cellY} r={16} fill={t.surfaceAlt} stroke={t.textMuted} strokeWidth={1.5} />
        <text x={h0X} y={cellY + 4} textAnchor="middle" fontSize={10} fontFamily="monospace" fill={t.textMuted}>h₀</text>

        {Array.from({ length: STEPS }, (_, i) => {
          const x = stepX(i);
          const prevX = i === 0 ? h0X + 16 : stepX(i - 1) + cellW / 2;
          const isActive = activeStep === i;
          return (
            <g key={i} onMouseEnter={() => setActiveStep(i)} onMouseLeave={() => setActiveStep(null)} style={{ cursor: 'pointer' }}>
              <line x1={prevX} y1={cellY} x2={x - cellW / 2 - 7} y2={cellY} stroke={cellColor} strokeWidth={isActive ? 2.5 : 1.5} markerEnd="url(#rnnu-arrow)" />
              <rect x={x - cellW / 2} y={cellY - cellH / 2} width={cellW} height={cellH} rx={7} fill={isActive ? `${cellColor}30` : t.surfaceAlt} stroke={cellColor} strokeWidth={isActive ? 2.5 : 1.5} />
              <text x={x} y={cellY + 4} textAnchor="middle" fontSize={11} fontWeight={700} fontFamily="monospace" fill={cellColor}>h{i + 1}</text>
              {i < STEPS - 1 && (
                <text x={(x + stepX(i + 1)) / 2} y={cellY - cellH / 2 - 8} textAnchor="middle" fontSize={9} fontFamily="monospace" fill={t.textMuted} opacity={isActive || activeStep === i + 1 ? 1 : 0.5}>
                  same Wₕ
                </text>
              )}
              <line x1={x} y1={inputY - 16} x2={x} y2={cellY + cellH / 2 + 7} stroke={tokenColor} strokeWidth={isActive ? 2.5 : 1.5} markerEnd="url(#rnnu-arrow)" />
              <circle cx={x} cy={inputY} r={16} fill={`${tokenColor}18`} stroke={tokenColor} strokeWidth={1.5} />
              <text x={x} y={inputY + 4} textAnchor="middle" fontSize={10} fontFamily="monospace" fill={tokenColor}>x{i + 1}</text>
            </g>
          );
        })}
        <line x1={stepX(STEPS - 1) + cellW / 2} y1={cellY} x2={width - 10} y2={cellY} stroke={cellColor} strokeWidth={1.5} markerEnd="url(#rnnu-arrow)" />
      </svg>
      <div style={{ marginTop: 8, textAlign: 'center' }}>
        <VisualizationMath latex="h_t = \tanh\left(W_h h_{t-1} + W_x x_t + b\right)" />
      </div>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 4 }}>
        Hover a cell -- it's the identical computation at every step, only the inputs (h_{'{t-1}'}, x_t) change.
      </div>
    </VisualizationContainer>
  );
}
