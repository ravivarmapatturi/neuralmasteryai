import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

function sigmoid(x: number) {
  return 1 / (1 + Math.exp(-x));
}
function softplus(x: number) {
  return Math.log(1 + Math.exp(x));
}
function gelu(x: number) {
  return 0.5 * x * (1 + Math.tanh(Math.sqrt(2 / Math.PI) * (x + 0.044715 * x ** 3)));
}
const SELU_SCALE = 1.0507;
const SELU_ALPHA = 1.6733;

const FUNCTIONS: { name: string; fn: (x: number) => number; yMin: number; yMax: number }[] = [
  { name: 'Binary Step', fn: (x) => (x < 0 ? 0 : 1), yMin: 0, yMax: 1 },
  { name: 'Sigmoid', fn: sigmoid, yMin: 0, yMax: 1 },
  { name: 'Tanh', fn: Math.tanh, yMin: -1, yMax: 1 },
  { name: 'ReLU', fn: (x) => Math.max(0, x), yMin: 0, yMax: 5 },
  { name: 'Leaky ReLU', fn: (x) => (x >= 0 ? x : 0.1 * x), yMin: -0.5, yMax: 5 },
  { name: 'ELU', fn: (x) => (x >= 0 ? x : Math.exp(x) - 1), yMin: -1, yMax: 5 },
  { name: 'SELU', fn: (x) => SELU_SCALE * (x >= 0 ? x : SELU_ALPHA * (Math.exp(x) - 1)), yMin: -2, yMax: 5 },
  { name: 'GELU', fn: gelu, yMin: -0.5, yMax: 5 },
  { name: 'Swish (SiLU)', fn: (x) => x * sigmoid(x), yMin: -0.5, yMax: 5 },
  { name: 'Mish', fn: (x) => x * Math.tanh(softplus(x)), yMin: -0.5, yMax: 5 },
  { name: 'Softplus', fn: softplus, yMin: 0, yMax: 5 },
  { name: 'Softsign', fn: (x) => x / (1 + Math.abs(x)), yMin: -1, yMax: 1 },
  { name: 'Identity', fn: (x) => x, yMin: -5, yMax: 5 },
];

const X_MIN = -5;
const X_MAX = 5;

function MiniPlot({ name, fn, yMin, yMax, color }: { name: string; fn: (x: number) => number; yMin: number; yMax: number; color: string }) {
  const t = useVizTokens();
  const w = 130;
  const h = 100;
  const padT = 22;
  const padB = 18;
  const padX = 8;
  const plotW = w - padX * 2;
  const plotH = h - padT - padB;
  const xFor = (x: number) => padX + ((x - X_MIN) / (X_MAX - X_MIN)) * plotW;
  const yFor = (y: number) => padT + plotH - ((Math.max(yMin, Math.min(yMax, y)) - yMin) / (yMax - yMin)) * plotH;
  const d = Array.from({ length: 61 }, (_, i) => {
    const x = X_MIN + (i / 60) * (X_MAX - X_MIN);
    return `${i === 0 ? 'M' : 'L'} ${xFor(x)},${yFor(fn(x))}`;
  }).join(' ');

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block' }}>
      <text x={w / 2} y={13} textAnchor="middle" fontSize={10} fontWeight={700} fill={t.textPrimary}>{name}</text>
      {yMin < 0 && yMax > 0 && <line x1={padX} y1={yFor(0)} x2={w - padX} y2={yFor(0)} stroke={t.border} strokeWidth={1} />}
      <line x1={xFor(0)} y1={padT} x2={xFor(0)} y2={padT + plotH} stroke={t.border} strokeWidth={1} />
      <path d={d} fill="none" stroke={color} strokeWidth={2} />
    </svg>
  );
}

/** Every major activation's real shape, small-multiples style -- each
 * function keeps its own y-range (ReLU-family functions dwarf sigmoid/tanh
 * on a shared axis), so independent mini-plots read better than one
 * overlay chart here. */
export default function ActivationFunctionsDiagram() {
  const t = useVizTokens();
  const cycle = useAutoCycle(FUNCTIONS.length, 1800);
  const hovered = FUNCTIONS[cycle.value].name;
  const color = getConceptColor(t, 'attention');

  return (
    <VisualizationContainer footer="Every curve is a real function evaluated live over x in [-5, 5], not a static image. Hover a plot to see its name highlighted.">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 8, justifyItems: 'center' }}>
        {FUNCTIONS.map((f) => (
          <div
            key={f.name}
            onPointerDown={() => cycle.pick(FUNCTIONS.indexOf(f))}
            onMouseEnter={() => { if (!cycle.auto) cycle.pick(FUNCTIONS.indexOf(f)); }}
            style={{ background: t.surfaceAlt, borderRadius: 8, border: `1.5px solid ${hovered === f.name ? color : t.border}`, padding: 4 }}
          >
            <MiniPlot name={f.name} fn={f.fn} yMin={f.yMin} yMax={f.yMax} color={hovered === f.name ? color : t.accentSecondary} />
          </div>
        ))}
      </div>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 8 }}>
        {hovered}{cycle.auto ? ' · tracing each family automatically' : ''}
      </div>
    </VisualizationContainer>
  );
}
