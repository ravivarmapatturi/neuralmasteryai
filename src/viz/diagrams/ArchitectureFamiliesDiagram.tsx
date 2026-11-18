import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, PillSelect, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

type Family = 'encoder' | 'decoder' | 'encdec';
const N = 5;

const DESC: Record<Family, string> = {
  encoder: 'Bidirectional attention -- every position can attend to every other position, before AND after it. Good for understanding tasks (classification, embeddings), useless for generation since it needs the whole input at once.',
  decoder: 'Causal/masked attention -- each position can only attend to itself and earlier positions. The dominant architecture for modern LLMs, since next-token prediction naturally trains a model that can also generate.',
  encdec: 'A full bidirectional encoder over the input, a causal decoder for the output, connected by cross-attention (decoder positions attend to ALL encoder positions). Well-suited to translation/summarization where input and output are distinct sequences.',
};

/** The same NxN attention-mask idea, three ways -- click a family to see
 * exactly which (query, key) cells are actually allowed to attend, which
 * is the entire structural difference between them. */
export default function ArchitectureFamiliesDiagram() {
  const t = useVizTokens();
  const families: Family[] = ['encoder', 'decoder', 'encdec'];
  const cycle = useAutoCycle(families.length, 3200, 1);
  const family = families[cycle.value];
  const setFamily = (next: Family) => cycle.pick(families.indexOf(next));
  const color = getConceptColor(t, 'attention');
  const cell = 26;

  const allowed = (row: number, col: number, isDecoderSide: boolean) => {
    if (family === 'encoder') return true;
    if (family === 'decoder') return col <= row;
    // encdec: this grid represents the decoder's self+cross attention over [encoder(N) | decoder(N)]
    if (!isDecoderSide) return true; // encoder side always bidirectional among itself (only relevant if row also encoder, handled by caller)
    return true;
  };

  const width = family === 'encdec' ? 420 : 200;
  const gridN = family === 'encdec' ? N : N;

  return (
    <VisualizationContainer footer={DESC[family]}>
      <PillSelect<Family> label="Architecture family" value={family} onChange={setFamily} options={[{ value: 'encoder', label: 'Encoder-only (BERT)' }, { value: 'decoder', label: 'Decoder-only (GPT)' }, { value: 'encdec', label: 'Encoder-decoder (T5)' }]} />
      {family !== 'encdec' ? (
        <svg width="100%" viewBox={`0 0 ${width} ${20 + gridN * cell}`} style={{ display: 'block', marginTop: 10 }}>
          {Array.from({ length: gridN }, (_, row) =>
            Array.from({ length: gridN }, (_, col) => {
              const ok = allowed(row, col, false);
              return <rect key={`${row}-${col}`} x={40 + col * cell} y={20 + row * cell} width={cell - 2} height={cell - 2} rx={3} fill={ok ? `${color}40` : t.surfaceAlt} stroke={ok ? color : t.border} strokeWidth={1} />;
            })
          )}
          {Array.from({ length: gridN }, (_, i) => (
            <text key={`r${i}`} x={30} y={20 + i * cell + cell / 2 + 3} textAnchor="end" fontSize={8} fontFamily="monospace" fill={t.textMuted}>{i}</text>
          ))}
          <text x={40} y={14} fontSize={8} fill={t.textMuted}>key →</text>
        </svg>
      ) : (
        <svg width="100%" viewBox={`0 0 ${width} 170`} style={{ display: 'block', marginTop: 10 }}>
          <text x={70} y={14} textAnchor="middle" fontSize={9} fontWeight={700} fill={color}>Encoder (bidirectional)</text>
          {Array.from({ length: N }, (_, row) => Array.from({ length: N }, (_, col) => (
            <rect key={`e${row}-${col}`} x={30 + col * cell} y={22 + row * cell} width={cell - 2} height={cell - 2} rx={3} fill={`${color}40`} stroke={color} strokeWidth={1} />
          )))}
          <text x={70 + 170} y={14} textAnchor="middle" fontSize={9} fontWeight={700} fill={t.accentWarn}>Decoder (causal + cross-attn to encoder)</text>
          {Array.from({ length: N }, (_, row) => Array.from({ length: N }, (_, col) => {
            const ok = col <= row;
            return <rect key={`d${row}-${col}`} x={220 + col * cell} y={22 + row * cell} width={cell - 2} height={cell - 2} rx={3} fill={ok ? `${t.accentWarn}40` : t.surfaceAlt} stroke={ok ? t.accentWarn : t.border} strokeWidth={1} />;
          }))}
          <line x1={175} y1={80} x2={215} y2={80} stroke={t.textMuted} strokeWidth={1.5} strokeDasharray="3 2" />
          <text x={195} y={70} textAnchor="middle" fontSize={7} fill={t.textMuted}>cross-attn</text>
        </svg>
      )}
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 4 }}>
        Filled cell = query (row) allowed to attend to key (col).
      </div>
    </VisualizationContainer>
  );
}
