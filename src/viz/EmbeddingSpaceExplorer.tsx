import { useMemo, useState } from 'react';
import { useVizTokens } from '../theme/vizTokens';
import { PillSelect, StickyNote, StickyRow, VisualizationContainer, VisualizationHeader, VizButton } from './primitives';
import {
  VOCAB,
  combineWordVectors,
  fitPca2D,
  pca2D,
  projectVector2D,
  rankVector,
  type EmbeddingMetric,
} from './lib/embeddings';
import { usePlaygroundPlayback } from './diagrams/usePlaygroundPlayback';

const HAND_FONT = "'Kalam', 'Comic Sans MS', cursive";
const PLOT = { left: 24, top: 44, width: 476, height: 342 };
const LABEL_COLUMNS = 5;
const LABEL_ROWS = 10;
const METRICS: { id: EmbeddingMetric; title: string; latex: string; plain: string; color: 'yellow' | 'pink' | 'orange' }[] = [
  { id: 'cosine', title: 'Cosine similarity', latex: String.raw`\cos(q,d)=\frac{q\cdot d}{\lVert q\rVert\,\lVert d\rVert}`, plain: 'Compares direction; higher is closer.', color: 'yellow' },
  { id: 'euclidean', title: 'Straight-line distance (L2)', latex: String.raw`\mathrm{L2}(q,d)=\sqrt{\sum_i(q_i-d_i)^2}`, plain: 'Measures distance; lower is closer.', color: 'pink' },
  { id: 'dot', title: 'Dot product', latex: String.raw`q\cdot d=\sum_i q_i d_i`, plain: 'Compares alignment and size; higher is closer.', color: 'orange' },
];

function format(value: number): string {
  return Number.isFinite(value) ? value.toFixed(3) : '0.000';
}

interface PlotLabelInput {
  id: string;
  label: string;
  pointX: number;
  pointY: number;
}

interface PlacedPlotLabel extends PlotLabelInput {
  x: number;
  y: number;
}

export function placeEmbeddingLabels(labels: PlotLabelInput[]): PlacedPlotLabel[] {
  const slots = Array.from({ length: LABEL_COLUMNS * LABEL_ROWS }, (_, index) => {
    const column = index % LABEL_COLUMNS;
    const row = Math.floor(index / LABEL_COLUMNS);
    return {
      x: PLOT.left + ((column + 0.5) * PLOT.width) / LABEL_COLUMNS,
      y: PLOT.top + ((row + 0.5) * PLOT.height) / LABEL_ROWS,
    };
  });

  return labels.map((label) => {
    let bestIndex = 0;
    let bestDistance = Number.POSITIVE_INFINITY;
    slots.forEach((slot, index) => {
      const distance = (slot.x - label.pointX) ** 2 + (slot.y - label.pointY) ** 2;
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = index;
      }
    });
    const [slot] = slots.splice(bestIndex, 1);
    return { ...label, x: slot.x, y: slot.y };
  });
}

function TermControl({ label, word, coefficient, onWord, onCoefficient }: {
  label: string; word: string; coefficient: number; onWord: (word: string) => void; onCoefficient: (value: number) => void;
}) {
  const t = useVizTokens();
  const control = { minHeight: 34, border: `1.5px solid ${t.border}`, borderRadius: 6, background: t.background, color: t.textPrimary, font: 'inherit' };
  return <div style={{ minWidth: 0 }}>
    <span style={{ display: 'block', marginBottom: 3, fontSize: 15, fontWeight: 700 }}>{label}</span>
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(100px, 1fr) 74px', gap: 6 }}>
      <select aria-label={`${label} word`} value={word} onChange={(event) => onWord(event.target.value)} style={control}>
        {VOCAB.map((entry) => <option key={entry.word} value={entry.word}>{entry.word}</option>)}
      </select>
      <input aria-label={`${label} coefficient`} type="number" min={-2} max={2} step={0.1} value={coefficient}
        onChange={(event) => {
          const next = Number(event.target.value);
          if (Number.isFinite(next)) onCoefficient(Math.max(-2, Math.min(2, next)));
        }}
        style={{ ...control, width: '100%', boxSizing: 'border-box', padding: '3px 6px', fontVariantNumeric: 'tabular-nums' }} />
    </div>
  </div>;
}

export default function EmbeddingSpaceExplorer({ compact = false }: { compact?: boolean }) {
  const t = useVizTokens();
  const [words, setWords] = useState(['king', 'man', 'woman']);
  const [coefficients, setCoefficients] = useState([1, -1, 1]);
  const [metric, setMetric] = useState<EmbeddingMetric>('cosine');
  const [neighborCount, setNeighborCount] = useState(5);
  const [prediction, setPrediction] = useState('queen');
  const [predictionResult, setPredictionResult] = useState<boolean | null>(null);

  const target = useMemo(() => combineWordVectors(words.map((word, index) => ({ word, coefficient: coefficients[index] }))), [words, coefficients]);
  const ranked = useMemo(() => rankVector(target, metric, neighborCount, [...new Set(words)]), [target, metric, neighborCount, words]);
  const playback = usePlaygroundPlayback(ranked.length, 1350);
  const current = ranked[playback.step] ?? ranked[0];
  const pcaModel = useMemo(() => fitPca2D(VOCAB), []);
  const baseCoordinates = useMemo(() => pca2D(VOCAB), []);
  const queryCoordinate = useMemo(() => projectVector2D(target, pcaModel), [target, pcaModel]);
  const minX = Math.min(...baseCoordinates.map((point) => point[0]));
  const maxX = Math.max(...baseCoordinates.map((point) => point[0]));
  const minY = Math.min(...baseCoordinates.map((point) => point[1]));
  const maxY = Math.max(...baseCoordinates.map((point) => point[1]));
  const xPadding = Math.max(0.1, (maxX - minX) * 0.08);
  const yPadding = Math.max(0.1, (maxY - minY) * 0.08);
  const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value));
  const mapX = (value: number) => clamp(
    PLOT.left + ((value - (minX - xPadding)) / (maxX - minX + 2 * xPadding || 1)) * PLOT.width,
    PLOT.left + 8,
    PLOT.left + PLOT.width - 8,
  );
  const mapY = (value: number) => clamp(
    PLOT.top + PLOT.height - ((value - (minY - yPadding)) / (maxY - minY + 2 * yPadding || 1)) * PLOT.height,
    PLOT.top + 8,
    PLOT.top + PLOT.height - 8,
  );
  const categoryCounts = new Map<string, number>();
  VOCAB.forEach((entry) => categoryCounts.set(entry.category, (categoryCounts.get(entry.category) ?? 0) + 1));
  const categoryPositions = new Map<string, number>();
  const plotPoints = VOCAB.map((entry, index) => {
    const categoryPosition = categoryPositions.get(entry.category) ?? 0;
    categoryPositions.set(entry.category, categoryPosition + 1);
    const count = categoryCounts.get(entry.category) ?? 1;
    const angle = -Math.PI / 2 + (categoryPosition * 2 * Math.PI) / count;
    const radius = count <= 2 ? 7 : count <= 6 ? 11 : 15;
    return {
      word: entry.word,
      x: clamp(mapX(baseCoordinates[index][0]) + Math.cos(angle) * radius, PLOT.left + 8, PLOT.left + PLOT.width - 8),
      y: clamp(mapY(baseCoordinates[index][1]) + Math.sin(angle) * radius, PLOT.top + 8, PLOT.top + PLOT.height - 8),
    };
  });
  const pointByWord = new Map(plotPoints.map((point) => [point.word, point]));
  const queryPoint = { x: mapX(queryCoordinate[0]), y: mapY(queryCoordinate[1]) };
  const currentIndex = VOCAB.findIndex((entry) => entry.word === current.word);
  const currentPoint = plotPoints[currentIndex] ?? { x: PLOT.left, y: PLOT.top };
  const termColors = [t.accentSecondary, t.accentDanger, t.accentTeal];
  const inputWordSet = new Set(words);
  const rankedWordSet = new Set(ranked.map((row) => row.word));
  const scoreDirection = metric === 'euclidean' ? 'lower is closer' : 'higher is closer';
  const labelWordOrder = [...new Set([...ranked.map((row) => row.word), ...words, ...VOCAB.map((entry) => entry.word)])];
  const plotLabels = placeEmbeddingLabels([
    { id: 'query', label: 'query q', pointX: queryPoint.x, pointY: queryPoint.y },
    ...labelWordOrder.map((word) => {
      const point = pointByWord.get(word) ?? { x: PLOT.left, y: PLOT.top };
      return { id: word, label: word, pointX: point.x, pointY: point.y };
    }),
  ]);

  const updateWord = (index: number, word: string) => {
    setWords((previous) => previous.map((value, position) => position === index ? word : value));
    setPredictionResult(null);
    playback.setStep(0);
  };
  const updateCoefficient = (index: number, value: number) => {
    setCoefficients((previous) => previous.map((currentValue, position) => position === index ? value : currentValue));
    setPredictionResult(null);
    playback.setStep(0);
  };
  const updateMetric = (value: EmbeddingMetric | ((current: EmbeddingMetric) => EmbeddingMetric)) => {
    const next = typeof value === 'function' ? value(metric) : value;
    setMetric(next);
    setPredictionResult(null);
    playback.setStep(0);
  };
  const expression = words.map((word, index) => `${coefficients[index].toFixed(1)}×${word}`).join(' + ').replaceAll('+ -', '− ');

  return <VisualizationContainer title="Embedding space explorer playground"
    footer="The vocabulary vectors are small, deterministic teaching vectors rather than a trained embedding model. Vector addition, category-balanced PCA projection, cosine, L2, dot product, ranking, and every displayed number are computed live; small in-cluster point offsets and leader lines keep near-identical words readable.">
    {!compact && <>
      <VisualizationHeader eyebrow="Live playground" title="See why nearby vectors return related words"
        description="This solves the search problem of turning a meaning-like vector into the nearest stored words, so a beginner can see how semantic retrieval and vector analogies work." />
      <p style={{ margin: '0 0 8px', fontSize: 15, color: t.textSecondary }}>Build a query vector q by adding three word vectors. Each coefficient is free input: 1 keeps a direction, −1 subtracts it, and 0 removes it.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 10 }}>
        {[0, 1, 2].map((index) => <TermControl key={index} label={`Term ${String.fromCharCode(65 + index)} (word and multiplier)`}
          word={words[index]} coefficient={coefficients[index]} onWord={(word) => updateWord(index, word)} onCoefficient={(value) => updateCoefficient(index, value)} />)}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'end', gap: 12, marginTop: 8 }}>
        <PillSelect<EmbeddingMetric> label="Closeness rule (metric)" value={metric} onChange={updateMetric}
          options={[{ value: 'cosine', label: 'Cosine' }, { value: 'euclidean', label: 'L2 distance' }, { value: 'dot', label: 'Dot product' }]} />
        <label style={{ fontSize: 15, minWidth: 150 }}>Neighbors to rank
          <input aria-label="Neighbors to rank" type="number" min={3} max={8} step={1} value={neighborCount}
            onChange={(event) => {
              const next = Math.max(3, Math.min(8, Math.round(Number(event.target.value) || 3)));
              setNeighborCount(next);
              playback.setStep(0);
            }}
            style={{ display: 'block', width: '100%', boxSizing: 'border-box', minHeight: 34, marginTop: 3, border: `1.5px solid ${t.border}`, borderRadius: 6, background: t.background, color: t.textPrimary, font: 'inherit', fontVariantNumeric: 'tabular-nums' }} />
        </label>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, margin: '8px 0', fontSize: 15 }}>
        <strong style={{ color: t.accentWarn }}>Predict first:</strong><span>Which unused word will rank first?</span>
        <select aria-label="Predicted nearest word" value={prediction} onChange={(event) => { setPrediction(event.target.value); setPredictionResult(null); }}
          style={{ minHeight: 34, border: `1.5px solid ${t.border}`, borderRadius: 6, background: t.background, color: t.textPrimary, font: 'inherit' }}>
          {VOCAB.filter((entry) => !inputWordSet.has(entry.word)).map((entry) => <option key={entry.word} value={entry.word}>{entry.word}</option>)}
        </select>
        <VizButton onClick={() => setPredictionResult(prediction === ranked[0].word)}>Run prediction</VizButton>
        {predictionResult !== null && <span role="status" style={{ color: predictionResult ? t.accentPrimary : t.accentDanger, fontWeight: 700 }}>
          {predictionResult ? 'Correct.' : `The closest unused word is “${ranked[0].word}”.`}
        </span>}
      </div>
    </>}

    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px 16px', fontSize: 15 }} aria-label="Point colour legend">
      {words.map((word, index) => <span key={`${word}-${index}`}><span style={{ display: 'inline-block', width: 9, height: 9, marginRight: 5, background: termColors[index] }} />Term {String.fromCharCode(65 + index)}: {word}</span>)}
      <span><span style={{ display: 'inline-block', width: 9, height: 9, marginRight: 5, background: t.accentPurple }} />Query q</span>
      <span><span style={{ display: 'inline-block', width: 9, height: 9, marginRight: 5, background: t.accentPrimary }} />Word being scored</span>
    </div>

    <svg width="100%" viewBox="0 0 760 420" role="img"
      aria-label={`Category-balanced PCA view of the word vectors; ${current.word} is rank ${current.rank} with ${metric} score ${format(current.score)}`}
      style={{ display: 'block', fontFamily: HAND_FONT }}>
      <defs><clipPath id="embedding-space-plot"><rect x={PLOT.left} y={PLOT.top} width={PLOT.width} height={PLOT.height} /></clipPath></defs>
      <rect x={PLOT.left} y={PLOT.top} width={PLOT.width} height={PLOT.height} fill={t.background} rx={5} />
      <g clipPath="url(#embedding-space-plot)">
        <line x1={queryPoint.x} y1={queryPoint.y} x2={currentPoint.x} y2={currentPoint.y} stroke={t.accentPrimary} strokeWidth={2} strokeDasharray="6 5" />
        {plotLabels.map((label) => {
          const isQuery = label.id === 'query';
          const isCurrent = label.id === current.word;
          const isInput = inputWordSet.has(label.id);
          const isRanked = rankedWordSet.has(label.id);
          const roleIndex = words.indexOf(label.id);
          const color = isQuery ? t.accentPurple : isCurrent || isRanked ? t.accentPrimary : isInput ? termColors[Math.max(0, roleIndex)] : t.border;
          return <line key={`leader-${label.id}`} x1={label.pointX} y1={label.pointY} x2={label.x} y2={label.y}
            stroke={color} strokeWidth={isQuery || isCurrent ? 1.8 : 1} strokeOpacity={isQuery || isCurrent || isRanked || isInput ? 0.72 : 0.3} />;
        })}
        {VOCAB.map((entry, index) => {
          const point = plotPoints[index];
          const isInput = inputWordSet.has(entry.word);
          const isCurrent = entry.word === current.word;
          const isRanked = rankedWordSet.has(entry.word);
          const roleIndex = words.indexOf(entry.word);
          const color = isCurrent || isRanked ? t.accentPrimary : isInput ? termColors[Math.max(0, roleIndex)] : t.accentSecondary;
          return <circle key={entry.word} cx={point.x} cy={point.y} r={isCurrent ? 6 : isRanked || isInput ? 5 : 3.2} fill={color} opacity={isCurrent || isRanked || isInput ? 1 : 0.42} />;
        })}
        <path d={`M${queryPoint.x} ${queryPoint.y - 8} L${queryPoint.x + 8} ${queryPoint.y} L${queryPoint.x} ${queryPoint.y + 8} L${queryPoint.x - 8} ${queryPoint.y} Z`} fill={t.accentPurple} />
        {plotLabels.map((label) => {
          const isQuery = label.id === 'query';
          const isCurrent = label.id === current.word;
          const isInput = inputWordSet.has(label.id);
          const isRanked = rankedWordSet.has(label.id);
          const roleIndex = words.indexOf(label.id);
          const color = isQuery ? t.accentPurple : isCurrent || isRanked ? t.accentPrimary : isInput ? termColors[Math.max(0, roleIndex)] : t.textSecondary;
          return <text key={`label-${label.id}`} data-embedding-label={label.id} x={label.x} y={label.y + 5} textAnchor="middle"
            fontSize={14} fontWeight={isQuery || isCurrent || isRanked || isInput ? 700 : 400} fill={color}
            stroke={t.background} strokeWidth={5} strokeLinejoin="round" paintOrder="stroke fill">{label.label}</text>;
        })}
      </g>
      <text x={PLOT.left + 8} y={28} fontSize={14} fill={t.textSecondary}>Category-balanced PCA; leader lines spread crowded labels</text>

      <text x={520} y={38} fontSize={16} fontWeight={700} fill={t.textPrimary}>Live ranking ({scoreDirection})</text>
      {ranked.map((row, index) => {
        const y = 75 + index * 39;
        const revealed = index <= playback.step;
        const active = index === playback.step;
        return <g key={row.word} opacity={revealed ? 1 : 0.2} onClick={() => playback.setStep(index)} style={{ cursor: 'pointer' }}>
          <circle cx={532} cy={y - 5} r={5} fill={active ? t.accentPrimary : t.accentSecondary} />
          <text x={548} y={y} fontSize={15} fontWeight={active ? 700 : 400} fill={active ? t.accentPrimary : t.textPrimary}>{row.rank}. {row.word}</text>
          <text x={744} y={y} textAnchor="end" fontSize={15} fontWeight={700} fill={active ? t.accentPrimary : t.textSecondary}>{format(row.score)}</text>
        </g>;
      })}
      <text x={520} y={408} fontSize={14} fill={t.textSecondary}>Click a ranked word to inspect its score.</text>
    </svg>

    {compact ? <StickyRow>
      {METRICS.filter((note) => note.id === metric).map((note) => <StickyNote key={note.id} title={note.title} latex={note.latex} color={note.color} tilt={-1}><p>{note.plain}</p></StickyNote>)}
      <StickyNote title={`Step ${playback.step + 1} of ${ranked.length}`} color="blue" tilt={1} live><p>“{current.word}” is rank {current.rank}; {metric} = <strong>{format(current.score)}</strong>.</p></StickyNote>
    </StickyRow> : <>
      <StickyRow>
        {METRICS.map((note, index) => <StickyNote key={note.id} title={note.title} latex={note.latex} color={note.color} tilt={index % 2 ? 1 : -1}
          active={metric === note.id} onSelect={() => updateMetric(note.id)}><p>{note.plain}</p></StickyNote>)}
      </StickyRow>
      <StickyRow>
        <StickyNote title="Worked query and score" color="green" tilt={-1}>
          <p>q = {expression}</p><p>{metric} to “{current.word}” = <strong>{format(current.score)}</strong>.</p>
        </StickyNote>
        <StickyNote title={`What just happened · step ${playback.step + 1}`} color="blue" tilt={1} live>
          <p>“{current.word}” is rank {current.rank} because {scoreDirection}; this step compares its full vector with q.</p>
        </StickyNote>
      </StickyRow>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <VizButton onClick={playback.toggle}>{playback.playing ? 'Pause' : 'Play'}</VizButton>
        <VizButton variant="secondary" onClick={playback.next}>Step →</VizButton>
        <VizButton variant="secondary" onClick={playback.reset}>Reset</VizButton>
      </div>
    </>}
  </VisualizationContainer>;
}
