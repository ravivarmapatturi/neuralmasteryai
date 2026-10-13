import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';
import { SketchEllipse } from '../../components/notebook/RoughShape';

type Metric = 'faithfulness' | 'relevance' | 'precision' | 'recall';

const METRICS: { key: Metric; label: string; question: string; formula: string }[] = [
  { key: 'faithfulness', label: 'Faithfulness', question: 'Does every claim in the answer trace back to the retrieved context?', formula: 'supported claims / total claims in answer' },
  { key: 'relevance', label: 'Answer relevance', question: 'Does the answer actually address the question asked?', formula: 'judged independent of whether it\'s grounded' },
  { key: 'precision', label: 'Context precision', question: 'Of the chunks retrieved, how many were actually relevant?', formula: 'relevant retrieved / total retrieved' },
  { key: 'recall', label: 'Context recall', question: 'Of all relevant chunks that exist, how many were retrieved?', formula: 'relevant retrieved / total relevant that exist' },
];

const RETRIEVED = new Set([1, 2, 3, 4]);
const RELEVANT = new Set([2, 3, 5, 6]);
const ALL = [1, 2, 3, 4, 5, 6, 7, 8];

/** Precision/recall made concrete on one retrieved set (dots 1-4) against
 * one true-relevant set (dots 2,3,5,6) -- click each metric to see exactly
 * which dots it counts, rather than just stating the ratio in words. */
export default function RagEvalMetricsDiagram() {
  const t = useVizTokens();
  const [metric, setMetric] = useState<Metric>('precision');
  const retrievedColor = getConceptColor(t, 'query');
  const relevantColor = t.accentWarn;
  const bothColor = getConceptColor(t, 'attention');

  const width = 400;
  const height = 130;
  const cols = 4;
  const pos = (i: number) => ({ x: 60 + (i % cols) * 90, y: 30 + Math.floor(i / cols) * 60 });

  const dotColor = (i: number) => {
    const inR = RETRIEVED.has(i);
    const inL = RELEVANT.has(i);
    if (inR && inL) return bothColor;
    if (inR) return retrievedColor;
    if (inL) return relevantColor;
    return t.textMuted;
  };
  const dotVisible = (i: number) => {
    if (metric === 'precision' || metric === 'faithfulness') return RETRIEVED.has(i);
    if (metric === 'recall') return true;
    return true;
  };

  const precision = [...RETRIEVED].filter((i) => RELEVANT.has(i)).length / RETRIEVED.size;
  const recall = [...RETRIEVED].filter((i) => RELEVANT.has(i)).length / RELEVANT.size;

  const active = METRICS.find((m) => m.key === metric)!;

  return (
    <VisualizationContainer footer={active.question}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
        {METRICS.map((m) => (
          <div
            key={m.key}
            onClick={() => setMetric(m.key)}
            style={{ padding: '6px 12px', borderRadius: 999, fontSize: 11, cursor: 'pointer', background: metric === m.key ? t.accentPrimary : t.surfaceAlt, color: metric === m.key ? t.background : t.textSecondary, fontWeight: metric === m.key ? 700 : 400 }}
          >
            {m.label}
          </div>
        ))}
      </div>
      {(metric === 'precision' || metric === 'recall') && (
        <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
          {ALL.map((i) => {
            const p = pos(i - 1);
            const opacity = dotVisible(i) ? 1 : 0.15;
            return (
              <g key={i} opacity={opacity}>
                <circle cx={p.x} cy={p.y} r={16} fill={`${dotColor(i)}30`} stroke="none" />
                <SketchEllipse cx={p.x} cy={p.y} width={32} height={32} color={dotColor(i)} strokeWidth={2} roughness={1.3} id={`eval-dot-${i}`} />
                <text x={p.x} y={p.y + 4} textAnchor="middle" fontSize={10} fontWeight={700} fill={dotColor(i)}>{i}</text>
              </g>
            );
          })}
        </svg>
      )}
      {(metric === 'faithfulness' || metric === 'relevance') && (
        <div style={{ padding: 16, textAlign: 'center', fontSize: 12, color: t.textSecondary, background: t.surfaceAlt, borderRadius: 8 }}>
          Not a retrieval-set metric — {active.formula}.
        </div>
      )}
      <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 8, fontSize: 10 }}>
        <span style={{ color: retrievedColor }}>● retrieved only</span>
        <span style={{ color: relevantColor }}>● relevant only</span>
        <span style={{ color: bothColor }}>● both</span>
      </div>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 6 }}>
        {metric === 'precision' && `precision = 2 relevant / 4 retrieved = ${precision.toFixed(2)}`}
        {metric === 'recall' && `recall = 2 retrieved / 4 relevant that exist = ${recall.toFixed(2)}`}
        {metric !== 'precision' && metric !== 'recall' && active.formula}
      </div>
    </VisualizationContainer>
  );
}
