import { useMemo, useState } from 'react';
import { FONT_FAMILY, RADIUS, useVizTokens } from '../../theme/vizTokens';
import { evaluateRanking, type GainType, type RankingMetric } from '../lib/rankingMetrics';
import { usePlaygroundPlayback } from './usePlaygroundPlayback';
import { PillSelect, StickyNote, StickyRow, VisualizationContainer, VisualizationHeader, VizButton } from '../primitives';

interface RankedDoc { id: string; title: string; grade: number }

const INITIAL_DOCS: RankedDoc[] = [
  { id: 'A', title: 'Exact retrieval guide', grade: 3 },
  { id: 'D', title: 'Unrelated database post', grade: 0 },
  { id: 'B', title: 'Learning-to-rank guide', grade: 2 },
  { id: 'C', title: 'Basic retrieval notes', grade: 1 },
  { id: 'E', title: 'Network tuning tips', grade: 0 },
];

const METRICS: { id: RankingMetric; label: string; latex: string; color: 'yellow' | 'pink' | 'orange' | 'green' | 'blue'; meaning: string }[] = [
  { id: 'precision', label: 'Precision@k', latex: String.raw`P@k=\frac{\sum_{i=1}^{k}r_i}{k}`, color: 'yellow', meaning: 'What share of the first k results is relevant?' },
  { id: 'recall', label: 'Recall@k', latex: String.raw`R@k=\frac{\sum_{i=1}^{k}r_i}{R_{\mathrm{total}}}`, color: 'pink', meaning: 'What share of every known relevant result did we retrieve?' },
  { id: 'mrr', label: 'Reciprocal rank', latex: String.raw`RR=\frac{1}{\operatorname{rank}_{\mathrm{first\ hit}}}`, color: 'orange', meaning: 'How early does the first useful result appear?' },
  { id: 'ap', label: 'Average precision@k', latex: String.raw`AP@k=\frac{\sum_{i=1}^{k}P@i\,r_i}{R_{\mathrm{total}}}`, color: 'green', meaning: 'Reward every relevant result for appearing early.' },
  { id: 'ndcg', label: 'Normalized DCG@k', latex: String.raw`NDCG@k=\frac{\sum_{i=1}^{k}\frac{2^{g_i}-1}{\log_2(i+1)}}{IDCG@k}`, color: 'blue', meaning: 'Reward higher relevance grades more, then discount later ranks.' },
];

const metricValue = (metric: RankingMetric, result: ReturnType<typeof evaluateRanking>) => result[metric];

export default function RankingMetricsExplorer({ compact = false }: { compact?: boolean }) {
  const t = useVizTokens();
  const [docs, setDocs] = useState(INITIAL_DOCS);
  const [cutoff, setCutoff] = useState(3);
  const [totalRelevant, setTotalRelevant] = useState(3);
  const [gainType, setGainType] = useState<GainType>('exponential');
  const [metric, setMetric] = useState<RankingMetric>('ndcg');
  const [prediction, setPrediction] = useState('same');
  const [predictionResult, setPredictionResult] = useState<boolean | null>(null);
  const grades = docs.map((doc) => doc.grade);
  const knownRelevantInList = grades.filter((grade) => grade > 0).length;
  const result = useMemo(() => evaluateRanking(grades, cutoff, totalRelevant, gainType), [grades, cutoff, totalRelevant, gainType]);
  const playback = usePlaygroundPlayback(Math.max(1, cutoff), 1400);
  const activeRank = Math.min(playback.step + 1, cutoff);
  const activeDoc = docs[activeRank - 1];
  const activeContribution = result.dcgContributions[activeRank - 1] ?? 0;
  const relevantColor = t.accentPrimary;
  const irrelevantColor = t.textMuted;
  const activeColor = t.accentSecondary;

  const updateDocs = (next: RankedDoc[]) => { setDocs(next); playback.setStep(0); setPredictionResult(null); };
  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= docs.length) return;
    const next = [...docs];
    [next[index], next[target]] = [next[target], next[index]];
    updateDocs(next);
  };
  const applyPreset = (id: 'one' | 'two' | 'ideal') => {
    const byId = new Map(INITIAL_DOCS.map((doc) => [doc.id, doc]));
    const order = id === 'one' ? ['A', 'D', 'B', 'C', 'E'] : id === 'two' ? ['D', 'A', 'B', 'C', 'E'] : ['A', 'B', 'C', 'D', 'E'];
    updateDocs(order.map((docId) => ({ ...byId.get(docId)! })));
  };
  const worked = metric === 'precision'
    ? `${result.relevantInTopK} relevant ÷ k ${cutoff} = ${result.precision.toFixed(4)}`
    : metric === 'recall'
      ? `${result.relevantInTopK} found ÷ ${totalRelevant} known relevant = ${result.recall.toFixed(4)}`
      : metric === 'mrr'
        ? result.firstRelevantRank ? `1 ÷ first relevant rank ${result.firstRelevantRank} = ${result.mrr.toFixed(4)}` : 'No relevant result, so RR = 0.'
        : metric === 'ap'
          ? `Precision at each hit, summed and divided by ${totalRelevant} = ${result.ap.toFixed(4)}`
          : `${result.dcg.toFixed(4)} DCG ÷ ${result.idcg.toFixed(4)} ideal DCG = ${result.ndcg.toFixed(4)}`;
  const currentStep = activeDoc
    ? `Rank ${activeRank}: ${activeDoc.id} has grade g = ${activeDoc.grade}. ${activeDoc.grade > 0 ? 'It is relevant.' : 'It is not relevant.'} Its DCG contribution is ${activeContribution.toFixed(3)}.`
    : 'Choose a non-zero cutoff to score the list.';

  return (
    <VisualizationContainer
      title="Interactive Ranking Evaluation Metrics Calculator"
      footer={compact ? undefined : 'Grades 1–3 count as relevant for binary metrics. DCG uses the chosen gain convention; all values are recalculated from the visible order, grades, cutoff, and total relevant count.'}
    >
      {!compact && (
        <>
          <VisualizationHeader
            eyebrow="Live playground"
            title="Measure whether useful results appear early enough"
            description="A search system can return the right items in the wrong order. Reorder and regrade this list to see which metrics only count relevant results and which metrics care where they appear."
          />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
            <VizButton variant="secondary" onClick={() => applyPreset('one')}>Preset 1: [A, D, B, C, E]</VizButton>
            <VizButton variant="secondary" onClick={() => applyPreset('two')}>Preset 2: [D, A, B, C, E]</VizButton>
            <VizButton variant="secondary" onClick={() => applyPreset('ideal')}>Ideal: [A, B, C, D, E]</VizButton>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, alignItems: 'end', marginBottom: 8 }}>
            <PillSelect<number> label="Cutoff k (results we inspect)" value={cutoff} onChange={(value) => { setCutoff(Number(value)); playback.setStep(0); }} options={[1, 2, 3, 4, 5].map((value) => ({ value, label: `First ${value}` }))} />
            <PillSelect<GainType> label="DCG gain (how grades are valued)" value={gainType} onChange={(value) => { setGainType(value as GainType); playback.setStep(0); }} options={[{ value: 'exponential', label: 'Exponential 2ᵍ−1' }, { value: 'linear', label: 'Linear g' }]} />
            <label style={{ fontSize: 15 }}><span style={{ display: 'block', marginBottom: 4, fontWeight: 700 }}>Known relevant results Rtotal</span><input aria-label="Known relevant results" type="number" min={Math.max(1, knownRelevantInList)} max={20} value={totalRelevant} onChange={(event) => setTotalRelevant(Math.max(1, knownRelevantInList, Math.min(20, Math.round(Number(event.target.value) || 1))))} style={{ width: '100%', minHeight: 38, boxSizing: 'border-box', padding: '5px 8px', border: `1.5px solid ${t.border}`, borderRadius: RADIUS.sm, background: t.background, color: t.textPrimary, font: 'inherit', fontVariantNumeric: 'tabular-nums' }} /></label>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 8, marginBottom: 8 }}>
            {docs.map((doc, index) => (
              <label key={doc.id} style={{ minWidth: 0, fontSize: 15 }}>
                <span style={{ display: 'block', marginBottom: 3, fontWeight: 700 }}>Grade g for {doc.id}</span>
                <input aria-label={`Relevance grade for ${doc.id}`} type="number" min={0} max={3} value={doc.grade} onChange={(event) => { const grade = Math.max(0, Math.min(3, Math.round(Number(event.target.value) || 0))); const next = docs.map((item, itemIndex) => itemIndex === index ? { ...item, grade } : item); setTotalRelevant((current) => Math.max(current, next.filter((item) => item.grade > 0).length)); updateDocs(next); }} style={{ width: '100%', minHeight: 36, boxSizing: 'border-box', padding: '4px 7px', border: `1.5px solid ${t.border}`, borderRadius: RADIUS.sm, background: t.background, color: t.textPrimary, font: 'inherit', fontVariantNumeric: 'tabular-nums' }} />
              </label>
            ))}
          </div>
        </>
      )}

      <svg width="100%" viewBox="0 0 760 330" role="img" aria-label={`Ranked list with grades ${grades.join(', ')} and ${metric} value ${metricValue(metric, result).toFixed(4)}`} style={{ display: 'block', fontFamily: FONT_FAMILY }}>
        <defs><clipPath id="ranking-list-clip"><rect x="20" y="20" width="720" height="286" /></clipPath></defs>
        <g clipPath="url(#ranking-list-clip)">
          <text x={30} y={28} fontSize={15} fontWeight={700} fill={t.textSecondary}>rank (position)</text>
          <text x={112} y={28} fontSize={15} fontWeight={700} fill={t.textSecondary}>result</text>
          <text x={520} y={28} fontSize={15} fontWeight={700} fill={t.textSecondary}>relevance grade g</text>
          <text x={710} y={28} textAnchor="end" fontSize={15} fontWeight={700} fill={t.textSecondary}>DCG gain</text>
          {docs.map((doc, index) => {
            const rank = index + 1;
            const y = 68 + index * 50;
            const active = rank === activeRank;
            const inside = rank <= cutoff;
            const contribution = result.dcgContributions[index] ?? 0;
            const color = doc.grade > 0 ? relevantColor : irrelevantColor;
            return (
              <g key={doc.id} opacity={inside ? 1 : 0.42}>
                {active && <rect x={24} y={y - 28} width={708} height={38} rx={5} fill={activeColor} fillOpacity={0.12} />}
                <text x={54} y={y} textAnchor="middle" fontSize={16} fontWeight={700} fill={active ? activeColor : t.textPrimary}>{rank}</text>
                <circle cx={92} cy={y - 5} r={5} fill={color} />
                <text x={112} y={y} fontSize={15} fontWeight={active ? 700 : 400} fill={t.textPrimary}>{doc.id}: {doc.title}</text>
                <rect x={520} y={y - 18} width={Math.max(4, doc.grade * 44)} height={18} rx={4} fill={color} fillOpacity={0.75} />
                <text x={510} y={y - 3} textAnchor="end" fontSize={15} fontWeight={700} fill={color}>{doc.grade}</text>
                <text x={710} y={y} textAnchor="end" fontSize={15} fontWeight={700} fill={inside ? color : t.textMuted}>{inside ? contribution.toFixed(3) : 'outside k'}</text>
                {index < docs.length - 1 && <line x1={30} y1={y + 16} x2={724} y2={y + 16} stroke={t.border} strokeWidth={1} />}
              </g>
            );
          })}
          <path d={`M34 40 H24 V${40 + cutoff * 50} H34`} fill="none" stroke={activeColor} strokeWidth={2.5} />
          <text x={38} y={48 + cutoff * 50} fontSize={14} fontWeight={700} fill={activeColor}>top k = {cutoff}</text>
        </g>
      </svg>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 18px', fontSize: 15 }} aria-label="Ranking colours">
        <span style={{ color: relevantColor }}>● Relevant (g ≥ 1)</span><span style={{ color: irrelevantColor }}>● Not relevant (g = 0)</span><span style={{ color: activeColor }}>■ Rank being scored</span>
      </div>

      {compact ? (
        <StickyRow>
          {METRICS.filter((note) => note.id === metric).map((note) => <StickyNote key={note.id} title={note.label} latex={note.id === 'ndcg' && gainType === 'linear' ? String.raw`NDCG@k=\frac{\sum_{i=1}^{k}\frac{g_i}{\log_2(i+1)}}{IDCG@k}` : note.latex} color={note.color} tilt={-1}><p>{worked}</p></StickyNote>)}
          <StickyNote title={`Rank ${activeRank} of ${cutoff}`} color="blue" tilt={1} live><p>{currentStep}</p></StickyNote>
        </StickyRow>
      ) : (
        <>
          <StickyRow>
            {METRICS.map((note, index) => (
              <StickyNote key={note.id} title={note.label} latex={note.id === 'ndcg' && gainType === 'linear' ? String.raw`NDCG@k=\frac{\sum_{i=1}^{k}\frac{g_i}{\log_2(i+1)}}{IDCG@k}` : note.latex} color={note.color} tilt={index % 2 ? 1 : -1} active={metric === note.id} onSelect={() => setMetric(note.id)}><p>{note.meaning} Here ri is 1 for a relevant result; gi is its grade.</p></StickyNote>
            ))}
          </StickyRow>
          <StickyRow>
            <StickyNote title={`Worked numbers · ${METRICS.find((note) => note.id === metric)?.label}`} color="green" tilt={1}><p style={{ fontVariantNumeric: 'tabular-nums' }}><strong>{worked}</strong></p><p>Current value = {metricValue(metric, result).toFixed(4)}.</p></StickyNote>
            <StickyNote title={`What just happened · rank ${activeRank}`} color="blue" tilt={-1} live><p>{currentStep}</p></StickyNote>
          </StickyRow>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginTop: 8 }}>
            <VizButton onClick={playback.toggle}>{playback.playing ? 'Pause' : 'Play'}</VizButton>
            <VizButton variant="secondary" onClick={playback.next}>Step →</VizButton>
            <VizButton variant="secondary" onClick={playback.reset}>Reset trace</VizButton>
            <span style={{ marginLeft: 'auto', display: 'flex', gap: 6, flexWrap: 'wrap', fontSize: 15 }}>
              {docs.map((doc, index) => <span key={doc.id}><button type="button" aria-label={`Move ${doc.id} up`} onClick={() => move(index, -1)} disabled={index === 0} style={{ font: 'inherit', minWidth: 34, minHeight: 34, border: `1px solid ${t.border}`, borderRadius: RADIUS.sm, background: 'transparent', color: t.textPrimary }}>↑</button><button type="button" aria-label={`Move ${doc.id} down`} onClick={() => move(index, 1)} disabled={index === docs.length - 1} style={{ font: 'inherit', minWidth: 34, minHeight: 34, border: `1px solid ${t.border}`, borderRadius: RADIUS.sm, background: 'transparent', color: t.textPrimary }}>↓</button> {doc.id}</span>)}
            </span>
          </div>
          <div style={{ marginTop: 10, paddingTop: 8, borderTop: `1px dashed ${t.border}`, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', fontSize: 15 }}>
            <strong style={{ color: t.accentWarn }}>Predict first:</strong><span>If A moves from rank 1 to rank 2 but the same two relevant items stay in the top 3, what happens to Precision@3?</span>
            <select aria-label="Ranking prediction" value={prediction} onChange={(event) => { setPrediction(event.target.value); setPredictionResult(null); }} style={{ minHeight: 36, font: 'inherit', border: `1.5px solid ${t.border}`, borderRadius: RADIUS.sm, background: t.background, color: t.textPrimary }}><option value="same">It stays 2/3</option><option value="down">It drops</option><option value="up">It rises</option></select>
            <VizButton variant="secondary" onClick={() => { applyPreset('two'); setPredictionResult(prediction === 'same'); }}>Run demotion</VizButton>
            {predictionResult !== null && <span role="status" style={{ color: predictionResult ? t.accentPrimary : t.accentDanger, fontWeight: 700 }}>{predictionResult ? 'Correct: Precision ignores order, while RR, AP, and NDCG fall.' : 'Precision only counts two relevant results among the first three, so it stays 2/3.'}</span>}
          </div>
        </>
      )}
    </VisualizationContainer>
  );
}
