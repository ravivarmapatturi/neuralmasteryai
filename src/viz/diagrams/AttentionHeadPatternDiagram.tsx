import { useMemo, useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, PillSelect, useAutoCycle } from '../primitives';
import DiagramMatrix from './DiagramMatrix';
import { DIAGRAM_TYPE } from './diagramSystem';

const TOKENS = ['A', 'B', 'C', 'A', 'B'];
type HeadType = 'previous' | 'induction';

// These weight matrices are HAND-DESIGNED to show the shape of two
// well-documented, real attention-analysis findings (a "previous-token
// head" and an "induction head") -- not extracted from a trained model.
// Real training does produce heads with these exact qualitative patterns
// (see Elhage et al., "A Mathematical Framework for Transformer Circuits"),
// but this component builds the pattern directly from the rule that
// defines it, deterministically, rather than pretending a random seeded
// projection would happen to discover it.
function previousTokenWeights(n: number): number[][] {
  const rows: number[][] = [];
  for (let i = 0; i < n; i++) {
    const row = new Array(n).fill(0);
    if (i === 0) {
      row[0] = 1;
    } else {
      row[i - 1] = 0.82;
      const rest = 1 - 0.82;
      const otherIdx = Array.from({ length: i }, (_, k) => k).filter((k) => k !== i - 1);
      otherIdx.forEach((k) => { row[k] = rest / Math.max(1, otherIdx.length); });
      if (otherIdx.length === 0) row[i - 1] = 1;
    }
    rows.push(row);
  }
  return rows;
}

function inductionWeights(tokens: string[]): { weights: number[][]; matches: (number | null)[] } {
  const n = tokens.length;
  const rows: number[][] = [];
  const matches: (number | null)[] = [];
  for (let i = 0; i < n; i++) {
    const row = new Array(n).fill(0);
    if (i === 0) { row[0] = 1; matches.push(null); rows.push(row); continue; }
    const prevTok = tokens[i - 1];
    let match: number | null = null;
    for (let s = i - 2; s >= 0; s--) { if (tokens[s] === prevTok) { match = s; break; } }
    const target = match !== null ? match + 1 : null;
    matches.push(target);
    const validIdx = Array.from({ length: i + 1 }, (_, k) => k).filter((k) => k !== i);
    if (target !== null) {
      row[target] = 0.82;
      const rest = validIdx.filter((k) => k !== target);
      rest.forEach((k) => { row[k] = 0.18 / Math.max(1, rest.length); });
    } else {
      validIdx.forEach((k) => { row[k] = 1 / validIdx.length; });
    }
    rows.push(row);
  }
  return { weights: rows, matches };
}

export default function AttentionHeadPatternDiagram() {
  const t = useVizTokens();
  const HEAD_TYPES: HeadType[] = ['induction', 'previous'];
  const { value: autoIdx } = useAutoCycle(HEAD_TYPES.length, 3400);
  const [userHead, setUserHead] = useState<HeadType | null>(null);
  const headType = userHead ?? HEAD_TYPES[autoIdx];

  const { weights, matches } = useMemo(() => {
    if (headType === 'previous') return { weights: previousTokenWeights(TOKENS.length), matches: [] as (number | null)[] };
    return inductionWeights(TOKENS);
  }, [headType]);

  const lastMatch = headType === 'induction' ? matches[matches.length - 1] : null;

  return (
    <VisualizationContainer footer={
      headType === 'induction'
        ? (lastMatch !== null
          ? `Query position 4 ("B") looks at its previous token, "A" -- finds that "A" already appeared at position 0 -- and attends strongly to position ${lastMatch} ("${TOKENS[lastMatch]}"), the token that followed it last time. That's the induction mechanism: "whatever followed this pattern before is a good guess for what follows it now," which is exactly how a model completes repeated sequences it's never seen before.`
          : 'No earlier repeat available yet for this row -- induction has nothing to copy from, so attention stays spread out.')
        : 'Every row puts most of its weight exactly one position back, regardless of token identity -- a purely positional pattern, unlike induction\'s pattern-matching.'
    }>
      <PillSelect label="Head type" value={headType} onChange={(v) => setUserHead(v as HeadType)} options={[
        { value: 'induction', label: 'Induction head' },
        { value: 'previous', label: 'Previous-token head' },
      ]} />
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}>
        <DiagramMatrix data={weights} concept="attention" rowLabels={TOKENS} colLabels={TOKENS} cellSize={46} valueFormat={(v) => v.toFixed(2)} highlightRow={4} highlightCol={lastMatch ?? undefined} />
      </div>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 8 }}>
        Rows = query token, columns = key token attended to. Real caveat still applies: this shows what the head attends to, not proof that attention alone causes the model's output -- see the caution in the prose above.
      </div>
    </VisualizationContainer>
  );
}
