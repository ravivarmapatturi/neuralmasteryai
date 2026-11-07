import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, PillSelect } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

const BLANK = '-';

// Per-frame predictions the acoustic model might emit -- includes both
// blanks and intentionally-repeated characters, so the collapse rule has
// something real to do (and so "LL" surviving as two L's, not one,
// actually demonstrates why the blank-in-between matters).
const EXAMPLES: Record<string, string[]> = {
  hello: ['H', 'H', '-', 'E', 'E', '-', '-', 'L', 'L', '-', 'L', 'L', '-', 'O', 'O', '-'],
  speed: ['S', '-', 'P', 'P', '-', 'E', 'E', '-', '-', 'E', 'E', '-', 'D', 'D', '-'],
};

/** The real CTC collapse rule: merge consecutive duplicate symbols, then
 * drop all blanks. Run as an actual reduce over the frame sequence, not a
 * hardcoded final answer. */
function collapse(frames: string[]): { afterMerge: string[]; final: string } {
  const merged: string[] = [];
  for (const f of frames) {
    if (merged.length === 0 || merged[merged.length - 1] !== f) merged.push(f);
  }
  const final = merged.filter((c) => c !== BLANK).join('');
  return { afterMerge: merged, final };
}

const CELL = 26;

export default function CtcAlignmentDiagram() {
  const t = useVizTokens();
  const [example, setExample] = useState<keyof typeof EXAMPLES>('hello');
  const frames = EXAMPLES[example];
  const { afterMerge, final } = collapse(frames);
  const color = getConceptColor(t, 'attention');
  const blankColor = t.textMuted;

  return (
    <VisualizationContainer
      footer={`Merging consecutive duplicates first (not just dropping blanks) is what lets "${final}" keep its double letters -- the blank between the two L's (or two E's) is exactly what stops them from merging into one. Delete blanks before merging instead, and "HELLO" would collapse to "HELO." This is the entire trick that lets CTC train from unaligned (text-only) labels: the model is free to predict the same character for several frames in a row, or insert blanks anywhere, as long as collapsing the whole sequence recovers the right text.`}
    >
      <PillSelect<string>
        label="Example"
        value={example}
        onChange={(v) => setExample(v as keyof typeof EXAMPLES)}
        options={[
          { value: 'hello', label: '"HELLO"' },
          { value: 'speed', label: '"SPEED"' },
        ]}
      />
      <div style={{ fontSize: DIAGRAM_TYPE.secondaryLabel.size, color: t.textMuted, margin: '10px 0 4px' }}>Per-frame model output</div>
      <svg width={frames.length * CELL} height={CELL} viewBox={`0 0 ${frames.length * CELL} ${CELL}`} className="nm-fit-svg" style={{ display: 'block' }}>
        {frames.map((f, i) => (
          <g key={i}>
            <rect x={i * CELL} y={0} width={CELL - 1} height={CELL - 1} fill={f === BLANK ? t.surfaceAlt : `${color}22`} stroke={f === BLANK ? t.border : color} strokeWidth={1} />
            <text x={i * CELL + CELL / 2} y={CELL / 2 + 4} textAnchor="middle" fontSize={11} fontFamily="monospace" fontWeight={700} fill={f === BLANK ? blankColor : color}>
              {f}
            </text>
          </g>
        ))}
      </svg>

      <div style={{ fontSize: DIAGRAM_TYPE.secondaryLabel.size, color: t.textMuted, margin: '10px 0 4px' }}>After merging consecutive duplicates</div>
      <svg width={afterMerge.length * CELL} height={CELL} viewBox={`0 0 ${afterMerge.length * CELL} ${CELL}`} className="nm-fit-svg" style={{ display: 'block' }}>
        {afterMerge.map((f, i) => (
          <g key={i}>
            <rect x={i * CELL} y={0} width={CELL - 1} height={CELL - 1} fill={f === BLANK ? t.surfaceAlt : `${color}22`} stroke={f === BLANK ? t.border : color} strokeWidth={1} />
            <text x={i * CELL + CELL / 2} y={CELL / 2 + 4} textAnchor="middle" fontSize={11} fontFamily="monospace" fontWeight={700} fill={f === BLANK ? blankColor : color}>
              {f}
            </text>
          </g>
        ))}
      </svg>

      <div style={{ fontSize: DIAGRAM_TYPE.secondaryLabel.size, color: t.textMuted, margin: '10px 0 4px' }}>After dropping blanks — final text</div>
      <div style={{ fontFamily: 'monospace', fontSize: 20, fontWeight: 700, color: t.accentPrimary, letterSpacing: '0.1em' }}>{final}</div>
    </VisualizationContainer>
  );
}
