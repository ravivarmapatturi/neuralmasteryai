import type { ReactNode } from 'react';
import { useVizTokens } from '../../../theme/vizTokens';

type Tokens = ReturnType<typeof useVizTokens>;
type Draw = (t: Tokens) => { aria: string; body: ReactNode };

// Small text helper; every diagram below draws its own mechanism in its field-standard form.
const txt = (x: number, y: number, v: ReactNode, c: string, a: 'start' | 'middle' | 'end' = 'start', s = 11, w = 400) => <text x={x} y={y} fill={c} textAnchor={a} fontSize={s} fontWeight={w}>{v}</text>;

/** Caption inside the SVG, wrapped so it never clips at the right edge. */
const note = (y: number, v: string, c: string) => {
  const lines: string[] = [''];
  for (const w of v.split(' ')) { if ((lines[lines.length - 1] + ' ' + w).length > 58) lines.push(w); else lines[lines.length - 1] += (lines[lines.length - 1] ? ' ' : '') + w; }
  return <text x={10} y={y} fill={c} fontSize={10.5}>{lines.map((l, i) => <tspan key={i} x={10} dy={i ? 13 : 0}>{l}</tspan>)}</text>;
};

/** Vertical probability bars with labels; each sampling diagram passes its own values and marks. */
const bars = (t: Tokens, labels: string[], vals: number[], color: (i: number) => string, x0 = 20, base = 112, h = 90, gap = 44) => labels.map((l, i) => (
  <g key={l + i}>
    <rect x={x0 + i * gap} y={base - vals[i] * h} width={28} height={vals[i] * h} rx={2} fill={color(i)} />
    {txt(x0 + i * gap + 14, base - vals[i] * h - 4, vals[i].toFixed(2).replace(/^0/, ''), t.textPrimary, 'middle', 10)}
    {txt(x0 + i * gap + 14, base + 14, l, t.textSecondary, 'middle', 10)}
  </g>
));

const P = ['sat', 'ran', 'ate', 'hid', 'dug'];

const DIAGRAMS: Record<string, Draw> = {
  beam: t => ({ aria: 'A search tree keeps the two best partial sequences at each depth and prunes the rest.', body: <>
    {[[40, 70, 120, 30], [40, 70, 120, 70], [40, 70, 120, 110], [150, 30, 240, 15], [150, 30, 240, 50], [150, 70, 240, 85], [150, 70, 240, 120]].map(([a, b, c, d], i) => <line key={i} x1={a} y1={b} x2={c} y2={d} stroke={i === 2 || i === 4 || i === 6 ? t.border : t.accentPrimary} strokeWidth={i === 2 || i === 4 || i === 6 ? 1 : 2} strokeDasharray={i === 2 || i === 4 || i === 6 ? '3 3' : undefined} />)}
    {txt(10, 74, 'The', t.textPrimary)}
    {txt(122, 28, 'cat −0.4', t.textPrimary)}{txt(122, 68, 'dog −0.9', t.textPrimary)}{txt(122, 114, 'car −2.3 ✗', t.textSecondary)}
    {txt(244, 18, 'sat −0.7', t.accentPrimary, 'start', 11, 700)}{txt(244, 54, 'ate −2.8 ✗', t.textSecondary)}{txt(244, 89, 'ran −1.2', t.accentPrimary, 'start', 11, 700)}{txt(244, 124, 'hid −3.1 ✗', t.textSecondary)}
    {note(145, "Beam width 2: only the two best total log-probabilities survive each step.", t.textSecondary)}
  </> }),
  greedy: t => ({ aria: 'Probability bars with only the single largest token selected at this step.', body: <>
    {bars(t, P, [.55, .25, .1, .06, .04], i => i === 0 ? t.accentPrimary : t.surfaceAlt)}
    {txt(52, 12, 'argmax', t.accentPrimary, 'start', 11, 700)}{note(145, "Always takes the tallest bar, so the same prompt gives the same output.", t.textSecondary)}
  </> }),
  temperature: t => {
    const pts = (v: number[]) => v.map((p, i) => `${40 + i * 60},${112 - p * 95}`).join(' ');
    return { aria: 'Three curves over the same logits: low temperature sharpens the distribution and high temperature flattens it.', body: <>
      <polyline points={pts([.84, .11, .04, .01])} fill="none" stroke={t.accentDanger} strokeWidth={2} /><polyline points={pts([.58, .21, .13, .08])} fill="none" stroke={t.accentPrimary} strokeWidth={2} /><polyline points={pts([.37, .27, .2, .16])} fill="none" stroke={t.accentSecondary} strokeWidth={2} />
      {txt(52, 26, 'T = 0.5 sharp', t.accentDanger)}{txt(100, 60, 'T = 1', t.accentPrimary)}{txt(226, 84, 'T = 2 flat', t.accentSecondary)}
      <line x1={30} y1={112} x2={235} y2={112} stroke={t.border} />{['sat', 'ran', 'ate', 'hid'].map((l, i) => <g key={l}>{txt(40 + i * 60, 126, l, t.textSecondary, 'middle', 10)}</g>)}
      {note(145, "Logits are divided by T before softmax; the ranking never changes.", t.textSecondary)}
    </> };
  },
  topk: t => ({ aria: 'Sorted probability bars with a cut after the third token; the rest are removed.', body: <>
    {bars(t, P, [.5, .25, .15, .07, .03], i => i < 3 ? t.accentPrimary : t.surfaceAlt)}
    <line x1={146} y1={14} x2={146} y2={116} stroke={t.accentDanger} strokeWidth={2} strokeDasharray="4 3" />{txt(152, 24, 'k = 3: fixed count', t.accentDanger)}
    {note(145, "Keep exactly k tokens whatever their probabilities, then renormalize and sample.", t.textSecondary)}
  </> }),
  topp: t => ({ aria: 'Sorted probability bars with a running total; the cut falls where the cumulative reaches 0.9.', body: <>
    {bars(t, P, [.5, .25, .15, .07, .03], i => i < 3 ? t.accentPrimary : t.surfaceAlt)}
    {['.50', '.75', '.90', '.97', '1.0'].map((c, i) => <g key={c}>{txt(34 + i * 44, 138, `Σ${c}`, i === 2 ? t.accentDanger : t.textSecondary, 'middle', 10, i === 2 ? 700 : 400)}</g>)}
    <line x1={146} y1={14} x2={146} y2={126} stroke={t.accentDanger} strokeWidth={2} strokeDasharray="4 3" />{txt(152, 24, 'p = 0.9: count adapts', t.accentDanger)}
  </> }),
  repetition: t => ({ aria: 'Paired bars show the logit of a repeated token reduced by the penalty while a new token is unchanged.', body: <>
    {[['cat (seen)', 3, 2.5, true], ['dog (new)', 2.7, 2.7, false]].map(([l, a, b, seen], i) => <g key={String(l)} transform={`translate(${40 + i * 140} 0)`}>
      <rect x={0} y={112 - Number(a) * 28} width={30} height={Number(a) * 28} fill={t.surfaceAlt} stroke={t.border} /><rect x={36} y={112 - Number(b) * 28} width={30} height={Number(b) * 28} fill={seen ? t.accentWarn : t.accentPrimary} />
      {txt(15, 112 - Number(a) * 28 - 4, Number(a).toFixed(1), t.textPrimary, 'middle', 10)}{txt(51, 112 - Number(b) * 28 - 4, Number(b).toFixed(1), t.textPrimary, 'middle', 10)}{txt(33, 126, String(l), t.textSecondary, 'middle', 10)}
    </g>)}
    {note(145, "Penalty 1.2: cat 3.0 ÷ 1.2 = 2.5, so the unseen token now ranks first.", t.textSecondary)}
  </> }),
  pruning: t => ({ aria: 'A weight matrix with one low-magnitude column removed.', body: <>
    {[0, 1, 2, 3].flatMap(r => [0, 1, 2, 3, 4].map(c => <rect key={`${r}${c}`} x={30 + c * 34} y={18 + r * 24} width={30} height={20} fill={c === 2 ? t.surfaceAlt : t.accentSecondary} opacity={c === 2 ? 1 : .35 + ((r * 3 + c * 5) % 6) / 10} stroke={t.border} />))}
    <line x1={113} y1={12} x2={147} y2={118} stroke={t.accentDanger} strokeWidth={2} /><line x1={147} y1={12} x2={113} y2={118} stroke={t.accentDanger} strokeWidth={2} />
    {txt(208, 40, 'column norm ≈ 0', t.accentDanger)}{txt(208, 58, 'remove and', t.textSecondary)}{txt(208, 72, 'fine-tune', t.textSecondary)}{note(138, "Darker cells are larger weights. Removing a whole column shrinks the matrix itself.", t.textSecondary)}
  </> }),
  'static-quant': t => ({ aria: 'A float number line maps to integer levels using a scale fixed in advance from calibration data.', body: <>
    <line x1={20} y1={40} x2={300} y2={40} stroke={t.textSecondary} />{txt(20, 26, 'float  −1.0', t.textPrimary)}{txt(300, 26, '3.0', t.textPrimary, 'end')}
    <line x1={20} y1={100} x2={300} y2={100} stroke={t.textSecondary} />{txt(20, 118, 'int8  −128', t.textPrimary)}{txt(300, 118, '127', t.textPrimary, 'end')}
    {[0, .25, .5, .75, 1].map(f => <line key={f} x1={20 + f * 280} y1={40} x2={20 + f * 280} y2={100} stroke={t.accentPrimary} />)}
    {txt(160, 74, 'S, Z fixed from calibration', t.accentWarn, 'middle', 11, 700)}{note(142, "Requests outside the calibrated range clip, so calibration data must match traffic.", t.textSecondary)}
  </> }),
  onnx: t => ({ aria: 'A graph of operators Conv, Relu, and MatMul in one format dispatched to three execution providers.', body: <>
    {['Conv', 'Relu', 'MatMul'].map((o, i) => <g key={o}><ellipse cx={45} cy={25 + i * 42} rx={34} ry={15} fill={t.surfaceAlt} stroke={t.border} />{txt(45, 29 + i * 42, o, t.textPrimary, 'middle')}{i < 2 && <line x1={45} y1={40 + i * 42} x2={45} y2={52 + i * 42} stroke={t.edge} strokeWidth={2} />}</g>)}
    <rect x={92} y={8} width={2} height={106} fill={t.accentPrimary} />{txt(100, 16, 'model.onnx', t.accentPrimary, 'start', 11, 700)}
    {['CPU', 'GPU', 'WebGPU'].map((p, i) => <g key={p}><path d={`M94 64 C150 64 150 ${30 + i * 38} 210 ${30 + i * 38}`} fill="none" stroke={t.edge} /><rect x={210} y={16 + i * 38} width={92} height={26} rx={4} fill={t.surface} stroke={t.border} />{txt(256, 33 + i * 38, p, t.textPrimary, 'middle')}</g>)}
    {note(145, "One operator graph; the runtime picks an execution provider per device.", t.textSecondary)}
  </> }),
  wasm: t => ({ aria: 'JavaScript copies a typed array into WebAssembly linear memory where SIMD kernels run on CPU threads.', body: <>
    <rect x={10} y={24} width={82} height={70} rx={4} fill={t.surface} stroke={t.border} />{txt(51, 44, 'JavaScript', t.textPrimary, 'middle')}{txt(51, 64, 'Float32Array', t.textSecondary, 'middle', 10)}
    <line x1={92} y1={58} x2={122} y2={58} stroke={t.edge} strokeWidth={2} />{txt(107, 52, 'copy', t.textSecondary, 'middle', 9)}
    <rect x={122} y={14} width={188} height={92} rx={4} fill="none" stroke={t.accentWarn} strokeWidth={2} strokeDasharray="5 3" />{txt(130, 28, 'sandbox: linear memory', t.accentWarn)}
    {Array.from({ length: 12 }, (_, i) => <rect key={i} x={130 + i * 14} y={36} width={12} height={16} fill={i < 7 ? t.accentSecondary : t.surfaceAlt} stroke={t.border} />)}
    {[0, 1, 2].map(i => <g key={i}><rect x={130 + i * 58} y={62} width={52} height={34} rx={3} fill={t.surfaceAlt} stroke={t.border} />{txt(156 + i * 58, 83, `thread ${i + 1}`, t.textPrimary, 'middle', 10)}</g>)}
    {note(130, "SIMD kernels run on CPU threads inside the sandbox; no GPU required.", t.textSecondary)}
  </> }),
  'dynamic-quant': t => ({ aria: 'Weights are stored as integers ahead of time while activation ranges are measured per request.', body: <>
    <rect x={14} y={18} width={120} height={32} rx={4} fill={t.accentSecondary} opacity={.35} />{txt(74, 38, 'weights: int8, saved', t.textPrimary, 'middle', 10)}
    {[['request A', 150, 210], ['request B', 110, 280]].map(([l, a, b], i) => <g key={String(l)}>{txt(14, 78 + i * 28, String(l), t.textSecondary, 'start', 10)}<line x1={70} y1={74 + i * 28} x2={305} y2={74 + i * 28} stroke={t.border} /><line x1={Number(a)} y1={74 + i * 28} x2={Number(b)} y2={74 + i * 28} stroke={t.accentWarn} strokeWidth={6} /></g>)}
    {txt(150, 38, 'activations: range found', t.accentWarn, 'start', 10, 700)}{txt(150, 52, 'at run time, per request', t.accentWarn, 'start', 10)}
    {note(134, "No calibration set needed; each request pays a small range-finding cost.", t.textSecondary)}
  </> }),
  gptq: t => ({ aria: 'One weight is rounded and its error is compensated in the remaining unquantized weights, column by column.', body: <>
    {[.82, .31, -.47, .66, -.12].map((w, i) => <g key={i}><rect x={20 + i * 58} y={40} width={50} height={34} fill={i === 0 ? t.accentPrimary : i < 1 ? t.surfaceAlt : t.surfaceAlt} stroke={i === 0 ? t.accentPrimary : t.border} />{txt(45 + i * 58, 62, i === 0 ? '0.75' : w.toFixed(2), i === 0 ? t.surface : t.textPrimary, 'middle')}</g>)}
    {txt(45, 32, 'round', t.accentPrimary, 'middle', 10, 700)}
    {[1, 2, 3, 4].map(i => <path key={i} d={`M45 76 C${45 + i * 20} 108 ${45 + i * 40} 108 ${45 + i * 58} 76`} fill="none" stroke={t.accentWarn} strokeDasharray="3 2" />)}
    {txt(160, 112, 'push the error into later weights (Hessian-guided)', t.accentWarn, 'middle', 10)}{note(138, "Each weight is quantized in turn, so layer output stays close to the original.", t.textSecondary)}
  </> }),
  awq: t => ({ aria: 'A channel with large activations is scaled up before rounding so its weights lose less precision.', body: <>
    {[.2, .9, .3, .25].map((a, i) => <g key={i}><rect x={24 + i * 50} y={88 - a * 66} width={34} height={a * 66} fill={i === 1 ? t.accentWarn : t.surfaceAlt} stroke={t.border} />{txt(41 + i * 50, 102, `ch ${i + 1}`, t.textSecondary, 'middle', 10)}</g>)}
    {txt(24, 14, 'mean activation size', t.textSecondary, 'start', 10)}
    <line x1={232} y1={60} x2={244} y2={60} stroke={t.edge} strokeWidth={2} />
    {txt(250, 42, 'ch 2 × s', t.accentWarn, 'start', 11, 700)}{txt(250, 58, 'round', t.textPrimary)}{txt(250, 74, 'next ÷ s', t.textSecondary)}
    {note(130, "Output is unchanged before rounding; the salient channel keeps more precision.", t.textSecondary)}
  </> }),
  gguf: t => ({ aria: 'A single file laid out as header, metadata, tensor index, and aligned tensor blocks, memory mapped into RAM.', body: <>
    {[['header', 50, t.accentPrimary], ['metadata', 72, t.accentSecondary], ['tensor info', 72, t.accentTeal], ['tensor data (quantized, aligned)', 106, t.surfaceAlt]].reduce<{ x: number; out: ReactNode[] }>((acc, [l, w, c]) => { acc.out.push(<g key={String(l)}><rect x={acc.x} y={22} width={Number(w)} height={40} fill={String(c)} opacity={c === t.surfaceAlt ? 1 : .55} stroke={t.border} />{txt(acc.x + Number(w) / 2, 46, String(l).split(' (')[0], t.textPrimary, 'middle', 9)}</g>); acc.x += Number(w); return acc; }, { x: 10, out: [] }).out}
    {txt(10, 14, 'one .gguf file', t.textSecondary, 'start', 10)}
    <path d="M250 62 V94" stroke={t.edge} strokeWidth={2} /><rect x={196} y={94} width={108} height={26} rx={4} fill={t.surface} stroke={t.border} />{txt(250, 111, 'mmap: paged on use', t.textPrimary, 'middle', 10)}
    {txt(10, 100, 'tokenizer, architecture', t.textSecondary, 'start', 10)}{txt(10, 114, 'and quant type travel inside', t.textSecondary, 'start', 10)}
    {note(142, "A container format: it holds quantized tensors but is not a quantization method.", t.textSecondary)}
  </> }),
  webgpu: t => ({ aria: 'Tensors upload to GPU buffers, a WGSL compute shader runs in parallel workgroups, and results read back asynchronously.', body: <>
    {[['JS tensors', 10], ['GPU buffer', 112], ['read back', 226]].map(([l, x]) => <g key={String(l)}><rect x={Number(x)} y={30} width={84} height={30} rx={4} fill={t.surface} stroke={t.border} />{txt(Number(x) + 42, 49, String(l), t.textPrimary, 'middle', 10)}</g>)}
    <line x1={94} y1={45} x2={112} y2={45} stroke={t.edge} strokeWidth={2} /><line x1={196} y1={45} x2={226} y2={45} stroke={t.edge} strokeWidth={2} />
    {Array.from({ length: 16 }, (_, i) => <rect key={i} x={112 + (i % 8) * 11} y={72 + Math.floor(i / 8) * 11} width={9} height={9} fill={t.accentPrimary} opacity={.75} />)}
    {txt(208, 82, 'WGSL compute shader', t.accentPrimary, 'start', 10, 700)}{txt(208, 96, 'parallel workgroups', t.textSecondary, 'start', 10)}
    {note(130, "Speed comes from the GPU; the upload and read-back copies are the cost.", t.textSecondary)}
  </> }),
  roofline: t => ({ aria: 'A log-log plot rises along a bandwidth-limited slope, then flattens at peak compute with a knee between.', body: <>
    <line x1={36} y1={118} x2={306} y2={118} stroke={t.textSecondary} /><line x1={36} y1={118} x2={36} y2={10} stroke={t.textSecondary} />
    <polyline points="36,118 170,34 306,34" fill="none" stroke={t.accentPrimary} strokeWidth={3} /><circle cx={170} cy={34} r={4} fill={t.accentDanger} />
    {txt(174, 26, 'knee', t.accentDanger, 'start', 11, 700)}{txt(122, 96, 'memory-bound', t.accentWarn)}{txt(206, 56, 'compute-bound', t.accentSecondary)}
    <circle cx={110} cy={72} r={4} fill={t.accentWarn} />{txt(171, 136, 'operational intensity (FLOPs per byte, log)', t.textSecondary, 'middle', 10)}<text x={12} y={100} fill={t.textSecondary} fontSize={10} transform="rotate(-90 12 100)">attainable FLOP/s (log)</text>
  </> }),
  'kv-cache': t => ({ aria: 'A grid of key and value rows grows one column per token; earlier columns are reused and only the newest is computed.', body: <>
    {['K', 'V'].map((r, ri) => <g key={r}>{txt(14, 52 + ri * 34, r, t.textPrimary, 'start', 12, 700)}{[0, 1, 2, 3, 4].map(c => <rect key={c} x={30 + c * 44} y={34 + ri * 34} width={40} height={28} fill={c === 4 ? t.accentWarn : t.accentSecondary} opacity={c === 4 ? 1 : .4} stroke={t.border} />)}</g>)}
    {[1, 2, 3, 4, 5].map(c => <g key={c}>{txt(50 + (c - 1) * 44, 26, `t${c}`, t.textSecondary, 'middle', 10)}</g>)}
    {txt(250, 118, 'computed new', t.accentWarn, 'end', 10, 700)}
    {txt(30, 118, 'reused, not recomputed', t.accentSecondary, 'start', 10, 700)}{note(142, "Saves compute per token; memory grows with sequence length, layers and heads.", t.textSecondary)}
  </> }),
  flash: t => ({ aria: 'A query tile stays in SRAM while key and value tiles stream from HBM with an online softmax.', body: <>
    <rect x={10} y={18} width={134} height={92} rx={4} fill="none" stroke={t.accentPrimary} strokeWidth={2} />{txt(18, 32, 'SRAM (small, fast)', t.accentPrimary, 'start', 10, 700)}
    <rect x={20} y={40} width={50} height={56} fill={t.accentSecondary} opacity={.5} />{txt(45, 72, 'Q tile', t.textPrimary, 'middle', 10)}<rect x={80} y={40} width={54} height={56} fill={t.accentWarn} opacity={.6} />{txt(107, 72, 'K, V tile', t.textPrimary, 'middle', 10)}
    <rect x={184} y={18} width={126} height={92} rx={4} fill="none" stroke={t.border} />{txt(192, 32, 'HBM (large, slow)', t.textSecondary, 'start', 10)}
    {[0, 1, 2, 3].map(i => <rect key={i} x={194 + i * 27} y={46} width={23} height={46} fill={t.surfaceAlt} stroke={t.border} />)}
    <path d="M184 68 H146" stroke={t.edge} strokeWidth={2} />{txt(165, 62, 'tile', t.textSecondary, 'middle', 9)}
    {note(132, "Exact attention, fewer HBM accesses: softmax is updated online per tile.", t.textSecondary)}
  </> }),
  gqa: t => ({ aria: 'Query heads fan into two shared key and value heads, four queries per pair.', body: <>
    {Array.from({ length: 8 }, (_, i) => <g key={i}><rect x={12 + i * 38} y={16} width={32} height={22} rx={3} fill={t.accentSecondary} opacity={.5} />{txt(28 + i * 38, 31, `Q${i + 1}`, t.textPrimary, 'middle', 10)}<line x1={28 + i * 38} y1={38} x2={i < 4 ? 80 : 232} y2={84} stroke={t.edge} /></g>)}
    {[80, 232].map((x, i) => <g key={x}><rect x={x - 46} y={84} width={92} height={26} rx={3} fill={t.accentWarn} opacity={.75} />{txt(x, 101, `K${i + 1}, V${i + 1} shared`, t.textPrimary, 'middle', 10)}</g>)}
    {note(134, "Cache holds 2 KV heads instead of 8: a quarter of the KV memory for this layer.", t.textSecondary)}
  </> }),
  'paged-kv': t => ({ aria: 'Consecutive logical blocks of a request point through a block table to scattered physical blocks.', body: <>
    {txt(14, 16, 'request (logical)', t.textSecondary, 'start', 10)}{[0, 1, 2].map(i => <g key={i}><rect x={14 + i * 42} y={24} width={38} height={26} fill={t.accentSecondary} opacity={.5} stroke={t.border} />{txt(33 + i * 42, 41, String(i), t.textPrimary, 'middle')}</g>)}
    {txt(14, 92, 'GPU memory (physical blocks)', t.textSecondary, 'start', 10)}{Array.from({ length: 9 }, (_, i) => { const used: Record<number, string> = { 6: '0', 1: '1', 4: '2' }; return <g key={i}><rect x={14 + i * 33} y={100} width={30} height={26} fill={used[i] ? t.accentPrimary : t.surfaceAlt} opacity={used[i] ? .7 : 1} stroke={t.border} />{used[i] && txt(29 + i * 33, 117, used[i], t.textPrimary, 'middle')}</g>; })}
    {[[33, 227], [75, 62], [117, 161]].map(([a, b], i) => <path key={i} d={`M${a} 50 C${a} 80 ${b} 70 ${b} 100`} fill="none" stroke={t.accentWarn} strokeWidth={1.5} />)}
    {txt(170, 40, 'blocks need not touch, so', t.textSecondary, 'start', 10)}{txt(170, 54, 'no large reservation', t.textSecondary, 'start', 10)}
  </> }),
  'static-batch': t => ({ aria: 'A slot-by-time chart: finished requests sit idle until the longest one ends and the batch releases.', body: gantt(t, [[0, 3, 'A'], [0, 8, 'B'], [0, 2, 'C'], [0, 5, 'D']], true, 'Slots stay reserved until B finishes. Hatched time is wasted GPU capacity.') }),
  'continuous-batch': t => ({ aria: 'A slot-by-time chart: each slot refills with a waiting request as soon as its request finishes.', body: gantt(t, [[0, 3, 'A'], [0, 8, 'B'], [0, 2, 'C'], [0, 5, 'D'], [3, 7, 'E', 0], [2, 7, 'F', 2], [5, 8, 'G', 3]], false, 'The batch changes between decode steps, so no slot waits. Same 4 slots, more requests.') }),
  autoscale: t => ({ aria: 'Queue length rises, desired replicas step up immediately, and ready replicas lag by the cold-start delay.', body: <>
    <line x1={34} y1={118} x2={306} y2={118} stroke={t.textSecondary} /><line x1={34} y1={118} x2={34} y2={12} stroke={t.textSecondary} />
    <polyline points="34,104 90,100 130,34 200,44 306,92" fill="none" stroke={t.accentDanger} strokeWidth={2} />{txt(138, 26, 'queue', t.accentDanger)}
    <polyline points="34,100 124,100 124,60 306,60" fill="none" stroke={t.textSecondary} strokeWidth={2} strokeDasharray="4 3" />{txt(250, 54, 'desired', t.textSecondary)}
    <polyline points="34,100 214,100 214,60 306,60" fill="none" stroke={t.accentPrimary} strokeWidth={2.5} />{txt(240, 76, 'ready', t.accentPrimary)}
    <line x1={124} y1={110} x2={214} y2={110} stroke={t.accentWarn} strokeWidth={3} />{txt(169, 106, 'cold start', t.accentWarn, 'middle', 10, 700)}{txt(170, 134, 'time', t.textSecondary, 'middle', 10)}
  </> }),
  'latency-metrics': t => ({ aria: 'A request timeline marks time to first token and token intervals; a latency histogram marks p50 and p99.', body: <>
    <line x1={14} y1={28} x2={306} y2={28} stroke={t.textSecondary} /><rect x={14} y={20} width={100} height={16} fill={t.accentWarn} opacity={.7} />{txt(64, 32, 'TTFT', t.textPrimary, 'middle', 10, 700)}
    {[114, 136, 158, 180, 202, 224, 246].map(x => <line key={x} x1={x} y1={18} x2={x} y2={38} stroke={t.accentPrimary} strokeWidth={2} />)}{txt(180, 14, 'tokens: TPS = count ÷ time', t.accentPrimary, 'middle', 10)}
    {[3, 9, 18, 26, 22, 14, 8, 5, 3, 2, 1, 1, 2].map((h, i) => <rect key={i} x={20 + i * 21} y={118 - h * 2.2} width={19} height={h * 2.2} fill={t.accentSecondary} opacity={.5} />)}
    <line x1={90} y1={58} x2={90} y2={118} stroke={t.accentPrimary} strokeWidth={2} />{txt(94, 66, 'p50', t.accentPrimary, 'start', 11, 700)}<line x1={268} y1={70} x2={268} y2={118} stroke={t.accentDanger} strokeWidth={2} />{txt(264, 66, 'p99', t.accentDanger, 'end', 11, 700)}
    {note(138, "Averages hide the tail. Report TTFT and token rate at p50 and p99 under load.", t.textSecondary)}
  </> }),
  speculative: t => ({ aria: 'A draft model proposes tokens, the target verifies them, accepting two and correcting the third.', body: <>
    {txt(10, 34, 'draft', t.textSecondary)}{['the', 'cat', 'sat', 'on'].map((w, i) => <g key={w}><rect x={56 + i * 60} y={18} width={54} height={24} rx={3} fill={t.surfaceAlt} stroke={t.border} />{txt(83 + i * 60, 34, w, t.textPrimary, 'middle')}</g>)}
    {txt(10, 90, 'target', t.textSecondary)}{[['the', 1], ['cat', 1], ['ran', 0]].map(([w, ok], i) => <g key={i}><rect x={56 + i * 60} y={74} width={54} height={24} rx={3} fill={ok ? t.accentPrimary : t.accentDanger} opacity={.8} />{txt(83 + i * 60, 90, String(w), t.surface, 'middle', 11, 700)}<line x1={83 + i * 60} y1={42} x2={83 + i * 60} y2={74} stroke={t.edge} />{txt(90 + i * 60, 62, ok ? '✓' : '✗', ok ? t.accentPrimary : t.accentDanger, 'start', 12, 700)}</g>)}
    {txt(236, 90, 'discarded', t.textSecondary, 'start', 10)}{note(128, "One target pass checks several drafts: output matches the target at less latency.", t.textSecondary)}
  </> }),
  routing: t => ({ aria: 'A decision node sends most requests to a cheap model and escalates hard ones to a larger model.', body: <>
    {txt(10, 66, 'request', t.textPrimary)}<line x1={58} y1={62} x2={88} y2={62} stroke={t.edge} strokeWidth={2} /><polygon points="118,36 148,62 118,88 88,62" fill={t.accentWarn} opacity={.6} />{txt(118, 66, 'score', t.textPrimary, 'middle', 10)}
    <path d="M148 62 C180 62 180 30 210 30" fill="none" stroke={t.accentPrimary} strokeWidth={4} /><path d="M148 62 C180 62 180 96 210 96" fill="none" stroke={t.accentDanger} strokeWidth={1.5} />
    <rect x={210} y={14} width={98} height={32} rx={4} fill={t.surface} stroke={t.accentPrimary} />{txt(259, 34, 'small, cheap', t.textPrimary, 'middle', 10)}<rect x={210} y={80} width={98} height={32} rx={4} fill={t.surface} stroke={t.accentDanger} />{txt(259, 100, 'large, costly', t.textPrimary, 'middle', 10)}
    {note(134, "Line width shows share of traffic. Router errors cost quality, so measure them.", t.textSecondary)}
  </> }),
  'semantic-cache': t => ({ aria: 'Similarity scores on a line with a threshold; a hit is reused, a miss calls the model, and one false hit is marked.', body: <>
    <line x1={20} y1={60} x2={300} y2={60} stroke={t.textSecondary} />{txt(20, 76, '0', t.textSecondary, 'middle', 10)}{txt(300, 76, '1 similarity', t.textSecondary, 'end', 10)}
    <line x1={230} y1={22} x2={230} y2={72} stroke={t.accentDanger} strokeWidth={2} strokeDasharray="4 3" />{txt(230, 16, 'threshold', t.accentDanger, 'middle', 10, 700)}
    {[[70, 'miss', t.textSecondary], [150, 'miss', t.textSecondary], [272, 'hit', t.accentPrimary]].map(([x, l, c]) => <g key={String(x)}><circle cx={Number(x)} cy={60} r={6} fill={String(c)} />{txt(Number(x), 46, String(l), String(c), 'middle', 10)}</g>)}
    <circle cx={246} cy={60} r={6} fill={t.accentWarn} />{txt(246, 92, 'false hit', t.accentWarn, 'middle', 10, 700)}
    {note(116, 'A refund for order 12 looks like a refund for order 21.', t.textSecondary)}{note(132, "Scope by tenant and validate the threshold, or wrong answers get reused.", t.textSecondary)}
  </> }),
  'prefix-cache': t => ({ aria: 'Two requests share a cached system prompt prefix; only their differing suffixes are computed.', body: <>
    {['request 1', 'request 2'].map((r, i) => <g key={r}>{txt(10, 44 + i * 42, r, t.textSecondary, 'start', 10)}<rect x={68} y={28 + i * 42} width={150} height={24} fill={t.accentPrimary} opacity={.55} />{txt(143, 44 + i * 42, 'system + policy', t.textPrimary, 'middle', 10)}<rect x={218} y={28 + i * 42} width={i ? 66 : 88} height={24} fill={t.accentWarn} opacity={.75} />{txt(i ? 251 : 262, 44 + i * 42, i ? 'question B' : 'question A', t.textPrimary, 'middle', 10)}</g>)}
    {txt(143, 20, 'cached KV: reused', t.accentPrimary, 'middle', 10, 700)}{txt(262, 20, 'computed', t.accentWarn, 'middle', 10, 700)}
    {note(114, "Only an exact token match from the start is reusable.", t.textSecondary)}{note(130, "Put stable text first and changing text last to raise the hit rate.", t.textSecondary)}
  </> }),
  structured: t => ({ aria: 'A grammar state after an age key allows digits and blocks other next tokens by masking them.', body: <>
    <rect x={10} y={18} width={140} height={28} rx={3} fill={t.surfaceAlt} stroke={t.border} /><text x={80} y={37} fill={t.textPrimary} fontSize={12} fontFamily="monospace" textAnchor="middle">{'{"age":'}</text>
    {txt(162, 36, 'state: expect number', t.accentWarn, 'start', 10, 700)}
    {[['42', 1], ['7', 1], ['"old"', 0], ['}', 0], ['null', 0]].map(([w, ok], i) => <g key={i}><rect x={14 + i * 60} y={64} width={52} height={26} rx={3} fill={ok ? t.accentPrimary : t.surfaceAlt} opacity={ok ? .75 : 1} stroke={t.border} /><text x={40 + i * 60} y={81} fill={ok ? t.textPrimary : t.textSecondary} fontSize={11} fontFamily="monospace" textAnchor="middle" textDecoration={ok ? undefined : 'line-through'}>{String(w)}</text></g>)}
    {txt(10, 114, 'Invalid tokens get probability 0 before sampling.', t.textSecondary, 'start', 10)}{note(130, "Output is valid by shape, which says nothing about whether the value is true.", t.textSecondary)}
  </> }),
  disaggregated: t => ({ aria: 'A prefill worker pool builds KV state from the prompt and transfers it to a separate decode worker pool.', body: <>
    {[['Prefill pool', 10, 'compute-heavy', t.accentWarn], ['Decode pool', 196, 'memory-heavy', t.accentSecondary]].map(([l, x, s, c]) => <g key={String(l)}><rect x={Number(x)} y={22} width={114} height={72} rx={5} fill="none" stroke={String(c)} strokeWidth={2} />{txt(Number(x) + 57, 42, String(l), t.textPrimary, 'middle', 11, 700)}{txt(Number(x) + 57, 58, String(s), t.textSecondary, 'middle', 10)}{[0, 1, 2].map(i => <rect key={i} x={Number(x) + 22 + i * 25} y={68} width={20} height={16} fill={String(c)} opacity={.6} />)}</g>)}
    <line x1={124} y1={58} x2={194} y2={58} stroke={t.edge} strokeWidth={3} />{txt(160, 50, 'KV state', t.accentPrimary, 'middle', 10, 700)}
    {note(118, "Long prompts no longer stall token streaming, and each pool scales alone.", t.textSecondary)}{note(146, "The cost is moving the KV state, so it needs a fast interconnect.", t.textSecondary)}
  </> }),
};

function gantt(t: Tokens, rows: (string | number)[][], waste: boolean, caption: string) {
  const x = (v: number) => 44 + v * 31;
  const slotOf = (r: (string | number)[], i: number) => (r[3] === undefined ? i : Number(r[3]));
  return <>
    {[0, 1, 2, 3].map(s => <g key={s}>{txt(10, 30 + s * 24, `slot ${s + 1}`, t.textSecondary, 'start', 9)}{waste && <rect x={x(0)} y={18 + s * 24} width={x(8) - x(0)} height={18} fill={t.surfaceAlt} stroke={t.accentDanger} strokeDasharray="3 3" />}</g>)}
    {rows.map((r, i) => <g key={i}><rect x={x(Number(r[0]))} y={18 + slotOf(r, i) * 24} width={x(Number(r[1])) - x(Number(r[0]))} height={18} fill={r[3] === undefined ? t.accentSecondary : t.accentPrimary} opacity={.8} stroke={t.surface} />{txt(x(Number(r[0])) + 6, 31 + slotOf(r, i) * 24, String(r[2]), t.surface, 'start', 10, 700)}</g>)}
    {txt(x(4), 124, 'decode steps →', t.textSecondary, 'middle', 9)}{note(142, caption, t.textSecondary)}
  </>;
}

export const inferenceDiagramKinds = Object.keys(DIAGRAMS);

export default function InferenceTechniqueDiagram({ kind }: { kind: string }) {
  const t = useVizTokens();
  const d = DIAGRAMS[kind];
  if (!d) return null;
  const { aria, body } = d(t);
  return (
    <svg viewBox="0 0 320 172" width="100%" role="img" aria-label={`${aria} Illustrative values.`} style={{ display: 'block', minHeight: 172, maxWidth: 620, margin: '0 auto' }}>
      {body}
    </svg>
  );
}
