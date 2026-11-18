import { useState } from 'react';
import { useVizTokens, type VizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE, DIAGRAM_RADIUS } from './diagramSystem';

const TOKENS = [
  { word: 'New', tag: 'B-LOC' }, { word: 'York', tag: 'I-LOC' }, { word: 'City', tag: 'I-LOC' },
  { word: 'is', tag: 'O' }, { word: 'bigger', tag: 'O' }, { word: 'than', tag: 'O' },
  { word: 'San', tag: 'B-LOC' }, { word: 'Francisco', tag: 'I-LOC' },
];
type ColorKey = 'accentPrimary' | 'accentSecondary' | 'textMuted';
const TAG_COLOR: Record<string, ColorKey> = { 'B-LOC': 'accentPrimary', 'I-LOC': 'accentSecondary', O: 'textMuted' };
function colorFor(t: VizTokens, tag: string): string {
  return t[TAG_COLOR[tag]];
}

function groupEntities(tokens: typeof TOKENS) {
  const spans: { words: string[]; start: number }[] = [];
  tokens.forEach((t, i) => {
    if (t.tag === 'B-LOC') spans.push({ words: [t.word], start: i });
    else if (t.tag === 'I-LOC' && spans.length) spans[spans.length - 1].words.push(t.word);
  });
  return spans;
}

export default function NerBioTaggingDiagram() {
  const t = useVizTokens();
  const { value: autoIdx } = useAutoCycle(TOKENS.length, 1800);
  const [userHovered, setUserHovered] = useState<number | null>(null);
  const hovered = userHovered ?? autoIdx;
  const spans = groupEntities(TOKENS);

  return (
    <VisualizationContainer footer="B-(begin) and I-(inside) are what let the scheme tell 'two separate one-word entities back to back' apart from 'one multi-word entity' -- a plain 'is this token part of an entity' binary tag couldn't make that distinction at all.">
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {TOKENS.map((tok, i) => (
          <div key={i} onMouseEnter={() => setUserHovered(i)} onMouseLeave={() => setUserHovered(null)} style={{ textAlign: 'center', cursor: 'default' }}>
            <div style={{ padding: '5px 10px', borderRadius: DIAGRAM_RADIUS.chip, background: `${colorFor(t, tok.tag)}18`, border: `1.5px solid ${hovered === i ? t.accentWarn : colorFor(t, tok.tag)}`, fontFamily: 'monospace', fontSize: 13 }}>
              {tok.word}
            </div>
            <div style={{ fontSize: 10, color: colorFor(t, tok.tag), fontWeight: 700, marginTop: 3 }}>{tok.tag}</div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ fontSize: DIAGRAM_TYPE.label.size, fontWeight: 700, color: t.textPrimary }}>Grouped entity spans (real BIO decoding)</div>
        {spans.map((s, i) => (
          <div key={i} style={{ fontSize: 12, fontFamily: 'monospace', color: t.accentPrimary }}>
            "{s.words.join(' ')}" — one LOC entity spanning {s.words.length} token{s.words.length > 1 ? 's' : ''}
          </div>
        ))}
      </div>
    </VisualizationContainer>
  );
}
