import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, VisualizationMath } from '../primitives';
import { DIAGRAM_TYPE } from './diagramSystem';

type GateKey = 'forget' | 'input' | 'candidate' | 'output';
const GATES: { key: GateKey; label: string; x: number; fn: 'σ' | 'tanh'; latex: string; desc: string }[] = [
  { key: 'forget', label: 'f_t', x: 130, fn: 'σ', latex: 'f_t = \\sigma(W_f[h_{t-1},x_t]+b_f)', desc: 'how much of the old cell state to keep' },
  { key: 'input', label: 'i_t', x: 230, fn: 'σ', latex: 'i_t = \\sigma(W_i[h_{t-1},x_t]+b_i)', desc: 'how much of the new candidate to add' },
  { key: 'candidate', label: 'c̃_t', x: 330, fn: 'tanh', latex: '\\tilde c_t = \\tanh(W_c[h_{t-1},x_t]+b_c)', desc: 'new content proposed for the cell state' },
  { key: 'output', label: 'o_t', x: 470, fn: 'σ', latex: 'o_t = \\sigma(W_o[h_{t-1},x_t]+b_o)', desc: 'how much of the cell state to reveal as h_t' },
];

/** The classic cell-state-as-conveyor-belt layout (the diagram everyone
 * who has read Colah's LSTM post recognizes): the cell state runs straight
 * across the top with only two things happening to it -- a forget
 * (multiply) and an add -- while four small gate networks below decide how
 * much. Click a gate to see its formula. */
export default function LstmCellDiagram() {
  const t = useVizTokens();
  const [active, setActive] = useState<GateKey | null>(null);
  const width = 560;
  const height = 300;
  const lineY = 46;
  const gateY = 170;
  const inputY = 260;
  const mulX = 130;
  const addX = 280;
  const smallMulX = 280;
  const smallMulY = 110;
  const outMulX = 470;
  const outMulY = 110;

  const forgetColor = t.accentDanger;
  const inputColor = t.accentPrimary;
  const outputColor = t.accentSecondary;
  const gateColor = (k: GateKey) => (k === 'forget' ? forgetColor : k === 'input' || k === 'candidate' ? inputColor : outputColor);

  function OpNode({ x, y, symbol, color }: { x: number; y: number; symbol: string; color: string }) {
    return (
      <g>
        <circle cx={x} cy={y} r={11} fill={t.surface} stroke={color} strokeWidth={2} />
        <text x={x} y={y + 4} textAnchor="middle" fontSize={13} fontWeight={700} fill={color}>{symbol}</text>
      </g>
    );
  }

  return (
    <VisualizationContainer footer="The cell state (top line) is only ever multiplied and added to -- never passed through a squashing non-linearity itself -- which is exactly what gives gradients a near-unobstructed path across many time steps. Click a gate for its formula.">
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
        <defs>
          <marker id="lstm-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
            <path d="M0,0 L7,3.5 L0,7 Z" fill={t.textMuted} />
          </marker>
        </defs>

        {/* cell state line */}
        <text x={20} y={lineY - 12} fontSize={10} fontFamily="monospace" fill={t.textMuted}>c_(t-1)</text>
        <line x1={20} y1={lineY} x2={mulX - 12} y2={lineY} stroke={t.textPrimary} strokeWidth={2} />
        <OpNode x={mulX} y={lineY} symbol="×" color={forgetColor} />
        <line x1={mulX + 12} y1={lineY} x2={addX - 12} y2={lineY} stroke={t.textPrimary} strokeWidth={2} />
        <OpNode x={addX} y={lineY} symbol="+" color={inputColor} />
        <line x1={addX + 12} y1={lineY} x2={width - 50} y2={lineY} stroke={t.textPrimary} strokeWidth={2} markerEnd="url(#lstm-arrow)" />
        <text x={width - 40} y={lineY + 4} fontSize={10} fontFamily="monospace" fontWeight={700} fill={t.textPrimary}>c_t</text>

        {/* forget gate -> mul node */}
        <line x1={130} y1={gateY - 20} x2={mulX} y2={lineY + 12} stroke={forgetColor} strokeWidth={active === 'forget' ? 2.5 : 1.5} markerEnd="url(#lstm-arrow)" opacity={active === null || active === 'forget' ? 1 : 0.3} />

        {/* input * candidate -> small mul -> add node */}
        <line x1={230} y1={gateY - 20} x2={smallMulX - 8} y2={smallMulY + 6} stroke={inputColor} strokeWidth={active === 'input' ? 2.5 : 1.5} markerEnd="url(#lstm-arrow)" opacity={active === null || active === 'input' ? 1 : 0.3} />
        <line x1={330} y1={gateY - 20} x2={smallMulX + 8} y2={smallMulY + 6} stroke={inputColor} strokeWidth={active === 'candidate' ? 2.5 : 1.5} markerEnd="url(#lstm-arrow)" opacity={active === null || active === 'candidate' ? 1 : 0.3} />
        <OpNode x={smallMulX} y={smallMulY} symbol="×" color={inputColor} />
        <line x1={smallMulX} y1={smallMulY - 11} x2={addX} y2={lineY + 12} stroke={inputColor} strokeWidth={1.5} markerEnd="url(#lstm-arrow)" opacity={active === null || active === 'input' || active === 'candidate' ? 1 : 0.3} />

        {/* c_t -> tanh -> out mul, with output gate */}
        <path d={`M ${addX + 40},${lineY} C ${outMulX},${lineY} ${outMulX},${lineY + 20} ${outMulX},${outMulY - 11}`} fill="none" stroke={t.textMuted} strokeWidth={1.5} strokeDasharray="3 2" markerEnd="url(#lstm-arrow)" />
        <text x={outMulX - 16} y={outMulY - 18} textAnchor="end" fontSize={9} fontFamily="monospace" fill={t.textMuted}>tanh(c_t)</text>
        <line x1={470} y1={gateY - 20} x2={outMulX} y2={outMulY + 11} stroke={outputColor} strokeWidth={active === 'output' ? 2.5 : 1.5} markerEnd="url(#lstm-arrow)" opacity={active === null || active === 'output' ? 1 : 0.3} />
        <OpNode x={outMulX} y={outMulY} symbol="×" color={outputColor} />
        {/* h_t exits cleanly to the right without crossing cell state line */}
        <line x1={outMulX + 11} y1={outMulY} x2={width - 50} y2={outMulY} stroke={outputColor} strokeWidth={2} markerEnd="url(#lstm-arrow)" />
        <text x={width - 40} y={outMulY + 4} fontSize={10} fontFamily="monospace" fontWeight={700} fill={outputColor}>h_t</text>

        {/* gate boxes */}
        {GATES.map((g) => {
          const isActive = active === g.key;
          const color = gateColor(g.key);
          return (
            <g key={g.key} onClick={() => setActive(isActive ? null : g.key)} onMouseEnter={() => setActive(g.key)} onMouseLeave={() => setActive(null)} style={{ cursor: 'pointer' }}>
              <rect x={g.x - 26} y={gateY - 18} width={52} height={36} rx={6} fill={isActive ? `${color}30` : t.surfaceAlt} stroke={color} strokeWidth={isActive ? 2.5 : 1.5} />
              <text x={g.x} y={gateY - 2} textAnchor="middle" fontSize={11} fontWeight={700} fill={color}>{g.fn}</text>
              <text x={g.x} y={gateY + 12} textAnchor="middle" fontSize={9} fontFamily="monospace" fill={color}>{g.label}</text>
              <line x1={g.x} y1={inputY - 14} x2={g.x} y2={gateY + 18} stroke={t.textMuted} strokeWidth={1} opacity={0.6} />
            </g>
          );
        })}

        {/* concatenated input bus spanning all 4 gates */}
        <rect x={100} y={inputY - 14} width={400} height={26} rx={5} fill={t.surfaceAlt} stroke={t.border} strokeWidth={1.25} />
        <text x={300} y={inputY + 4} textAnchor="middle" fontSize={10} fontFamily="monospace" fill={t.textSecondary}>[h_(t-1), x_t]</text>
      </svg>

      <div style={{ display: 'flex', gap: 20, justifyContent: 'center', marginTop: 4, flexWrap: 'wrap' }}>
        {GATES.map((g) => (
          <div key={g.key} onMouseEnter={() => setActive(g.key)} onMouseLeave={() => setActive(null)} style={{ cursor: 'pointer', fontSize: DIAGRAM_TYPE.caption.size, color: active === g.key ? gateColor(g.key) : t.textMuted, fontWeight: active === g.key ? 700 : 400 }}>
            {g.label}: {g.desc}
          </div>
        ))}
      </div>

      <div style={{ marginTop: 12, textAlign: 'center' }}>
        <VisualizationMath latex={active ? GATES.find((g) => g.key === active)!.latex : 'c_t = f_t \\odot c_{t-1} + i_t \\odot \\tilde c_t \\qquad h_t = o_t \\odot \\tanh(c_t)'} />
      </div>
    </VisualizationContainer>
  );
}
