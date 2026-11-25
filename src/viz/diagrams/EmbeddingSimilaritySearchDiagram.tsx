import { useMemo, useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { SketchArrow, SketchEllipse } from '../../components/notebook/RoughShape';
import { PillSelect, VisualizationContainer, VisualizationHeader, VizButton } from '../primitives';
import {
  DEFAULT_EMBEDDING_DOCUMENTS,
  METRIC_EXPLANATIONS,
  rankEmbeddings,
  type SimilarityMetric,
  type Vector2,
} from '../lib/embeddingSimilaritySearch';
import { usePlaygroundPlayback } from './usePlaygroundPlayback';

const HAND_FONT = "'Kalam', 'Comic Sans MS', cursive";
const PLOT = { left: 50, top: 18, width: 390, height: 184 } as const;
const DOMAIN_MIN = -2;
const DOMAIN_MAX = 2;

function NumberInput({ value, onChange, label }: { value: number; onChange: (value: number) => void; label: string }) {
  const t = useVizTokens();
  return (
    <label style={{ display: 'block', minWidth: 84, fontSize: 14 }}>
      <span style={{ display: 'block', marginBottom: 3 }}>{label}</span>
      <input
        aria-label={label}
        type="number"
        min={DOMAIN_MIN}
        max={DOMAIN_MAX}
        step={0.05}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        style={{ width: '100%', boxSizing: 'border-box', minHeight: 32, padding: '4px 7px', font: 'inherit', border: `1px solid ${t.border}`, borderRadius: 6, background: t.background, color: t.textPrimary }}
      />
    </label>
  );
}

function format(value: number): string {
  return Number.isFinite(value) ? value.toFixed(3) : '0.000';
}

function workedFormula(metric: SimilarityMetric, query: Vector2, document: Vector2, score: number): string {
  const q = query.map((value) => value.toFixed(2));
  const d = document.map((value) => value.toFixed(2));
  if (metric === 'cosine') {
    const qMagnitude = Math.hypot(...query).toFixed(2);
    const dMagnitude = Math.hypot(...document).toFixed(2);
    return `= (${q[0]}×${d[0]} + ${q[1]}×${d[1]})/(${qMagnitude}×${dMagnitude}) = ${format(score)}`;
  }
  if (metric === 'euclidean') {
    return `= sqrt((${q[0]}−${d[0]})² + (${q[1]}−${d[1]})²) = ${format(score)}`;
  }
  return `= ${q[0]}×${d[0]} + ${q[1]}×${d[1]} = ${format(score)}`;
}

function EmbeddingSimilaritySearchPlayground() {
  const t = useVizTokens();
  const [metric, setMetric] = useState<SimilarityMetric>('cosine');
  const [queryLabel, setQueryLabel] = useState('cat');
  const [queryX, setQueryX] = useState(0.8);
  const [queryY, setQueryY] = useState(0.6);
  const [prediction, setPrediction] = useState('kitten');
  const [predictionResult, setPredictionResult] = useState<boolean | null>(null);
  const query = useMemo<Vector2>(() => [queryX, queryY], [queryX, queryY]);
  const ranked = useMemo(() => rankEmbeddings(query, DEFAULT_EMBEDDING_DOCUMENTS, metric), [query, metric]);
  const playback = usePlaygroundPlayback(ranked.length, 1250);
  const selected = ranked[playback.step] ?? ranked[0];
  const metricInfo = METRIC_EXPLANATIONS[metric];

  const queryColor = t.accentPurple;
  const selectedColor = t.accentPrimary;
  const documentColor = t.accentSecondary;
  const mapX = (value: number) => PLOT.left + ((value - DOMAIN_MIN) / (DOMAIN_MAX - DOMAIN_MIN)) * PLOT.width;
  const mapY = (value: number) => PLOT.top + PLOT.height - ((value - DOMAIN_MIN) / (DOMAIN_MAX - DOMAIN_MIN)) * PLOT.height;
  const zeroX = mapX(0);
  const zeroY = mapY(0);

  const changeMetric = (value: SimilarityMetric | ((current: SimilarityMetric) => SimilarityMetric)) => {
    setMetric(typeof value === 'function' ? value(metric) : value);
    setPredictionResult(null);
    playback.setStep(0);
  };
  const changeQuery = (setter: (value: number) => void, value: number) => {
    setter(Math.max(DOMAIN_MIN, Math.min(DOMAIN_MAX, Number.isFinite(value) ? value : 0)));
    setPredictionResult(null);
    playback.setStep(0);
  };

  const reason = metric === 'cosine'
    ? 'cosine compares vector direction, so higher scores rank earlier'
    : metric === 'euclidean'
      ? 'L2 measures straight-line distance, so lower scores rank earlier'
      : 'dot product measures unnormalized alignment, so higher scores rank earlier';

  return (
    <>
      <VisualizationHeader
        eyebrow="Live playground"
        title="Which vector is actually closest?"
        description="Change one query vector, then watch the same documents reorder under three real distance metrics."
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 8, alignItems: 'end' }}>
        <label style={{ display: 'block', minWidth: 0, fontSize: 14 }}>
          <span style={{ display: 'block', marginBottom: 3 }}>Query word</span>
          <input
            aria-label="Query word"
            value={queryLabel}
            maxLength={20}
            onChange={(event) => setQueryLabel(event.target.value || 'query')}
            style={{ width: '100%', boxSizing: 'border-box', minHeight: 32, padding: '4px 7px', font: 'inherit', border: `1px solid ${t.border}`, borderRadius: 6, background: t.background, color: t.textPrimary }}
          />
        </label>
        <NumberInput value={queryX} onChange={(value) => changeQuery(setQueryX, value)} label="Query dim 1" />
        <NumberInput value={queryY} onChange={(value) => changeQuery(setQueryY, value)} label="Query dim 2" />
        <PillSelect<SimilarityMetric>
          label="Distance metric"
          value={metric}
          onChange={changeMetric}
          options={[
            { value: 'cosine', label: 'Cosine' },
            { value: 'euclidean', label: 'L2' },
            { value: 'dot', label: 'Dot' },
          ]}
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', margin: '5px 0 4px', fontSize: 14 }}>
        <strong>Predict first:</strong>
        <span>Which document ranks #1?</span>
        <select aria-label="Predicted closest document" value={prediction} onChange={(event) => { setPrediction(event.target.value); setPredictionResult(null); }} style={{ minHeight: 30, font: 'inherit', border: `1px solid ${t.border}`, borderRadius: 6, background: t.background, color: t.textPrimary }}>
          {DEFAULT_EMBEDDING_DOCUMENTS.map((document) => <option key={document.id} value={document.id}>{document.label}</option>)}
        </select>
        <VizButton onClick={() => setPredictionResult(prediction === ranked[0].id)}>Run prediction</VizButton>
        {predictionResult !== null && (
          <span role="status" style={{ color: predictionResult ? t.accentPrimary : t.accentDanger, fontWeight: 700 }}>
            {predictionResult ? 'Correct.' : `Not this time: ${ranked[0].label} is #1.`}
          </span>
        )}
      </div>

      <svg
        width="100%"
        viewBox="0 0 760 224"
        role="img"
        aria-label={`${metric} search ranks ${ranked[0].label} closest to query ${queryLabel} with score ${format(ranked[0].calculation.score)}`}
        style={{ display: 'block', fontFamily: HAND_FONT }}
      >
        <SketchArrow points={[[PLOT.left, zeroY], [PLOT.left + PLOT.width + 8, zeroY]]} color={t.textSecondary} strokeWidth={1.2} id="embedding-axis-x" />
        <SketchArrow points={[[zeroX, PLOT.top + PLOT.height], [zeroX, PLOT.top - 6]]} color={t.textSecondary} strokeWidth={1.2} id="embedding-axis-y" />
        <text x={PLOT.left + PLOT.width} y={219} textAnchor="end" fontSize={14} fill={t.textSecondary}>embedding dimension 1 →</text>
        <text x={zeroX + 9} y={PLOT.top + 10} fontSize={14} fill={t.textSecondary}>embedding dimension 2 ↑</text>
        {[-2, -1, 0, 1, 2].map((tick) => (
          <g key={tick}>
            <text x={mapX(tick)} y={zeroY + 17} textAnchor="middle" fontSize={14} fill={t.textMuted}>{tick}</text>
            {tick !== 0 && <text x={zeroX - 8} y={mapY(tick) + 4} textAnchor="end" fontSize={14} fill={t.textMuted}>{tick}</text>}
          </g>
        ))}

        <SketchArrow points={[[zeroX, zeroY], [mapX(queryX), mapY(queryY)]]} color={queryColor} strokeWidth={2.2} id="embedding-query-vector" />
        <circle cx={mapX(queryX)} cy={mapY(queryY)} r={8} fill={`${queryColor}24`} stroke="none" />
        <SketchEllipse cx={mapX(queryX)} cy={mapY(queryY)} width={16} height={16} color={queryColor} strokeWidth={2} id="embedding-query-point" />
        <text x={mapX(queryX)} y={mapY(queryY) + 26} textAnchor="middle" fontSize={14} fontWeight={700} fill={queryColor}>
          query “{queryLabel}”
        </text>

        {DEFAULT_EMBEDDING_DOCUMENTS.map((document) => {
          const isSelected = document.id === selected.id;
          const x = mapX(document.vector[0]);
          const y = mapY(document.vector[1]);
          return (
            <g key={document.id} onClick={() => playback.setStep(ranked.findIndex((row) => row.id === document.id))} style={{ cursor: 'pointer' }}>
              {isSelected && <line x1={mapX(queryX)} y1={mapY(queryY)} x2={x} y2={y} stroke={selectedColor} strokeWidth={2} strokeDasharray="5 4" />}
              <circle cx={x} cy={y} r={isSelected ? 8 : 6} fill={isSelected ? `${selectedColor}24` : `${documentColor}1A`} stroke="none" />
              <SketchEllipse cx={x} cy={y} width={isSelected ? 16 : 12} height={isSelected ? 16 : 12} color={isSelected ? selectedColor : documentColor} strokeWidth={isSelected ? 2.2 : 1.4} id={`embedding-document-${document.id}`} />
              {(() => {
                // If another document sits close by on its right, put this label on the left so they never overlap.
                const crowded = DEFAULT_EMBEDDING_DOCUMENTS.some((o) => o.id !== document.id && o.vector[0] > document.vector[0] && Math.hypot(o.vector[0] - document.vector[0], o.vector[1] - document.vector[1]) < 0.45);
                return <text x={crowded ? x - 10 : x + 9} y={y - 8} textAnchor={crowded ? 'end' : 'start'} fontSize={14} fontWeight={isSelected ? 700 : 400} fill={isSelected ? selectedColor : documentColor}>{document.label}</text>;
              })()}
            </g>
          );
        })}

        <text x={482} y={20} fontSize={15} fontWeight={700} fill={t.textPrimary}>Live ranking ({metric === 'euclidean' ? 'lower is closer' : 'higher is closer'})</text>
        {ranked.map((document, index) => {
          const y = 47 + index * 31;
          const revealed = index <= playback.step;
          const active = index === playback.step;
          return (
            <g key={document.id} opacity={revealed ? 1 : 0.24} onClick={() => playback.setStep(index)} style={{ cursor: 'pointer' }}>
              {active && <rect x={476} y={y - 18} width={266} height={26} rx={6} fill={`${selectedColor}18`} stroke="none" />}
              <text x={485} y={y} fontSize={14} fontWeight={active ? 700 : 400} fill={active ? selectedColor : t.textPrimary}>{document.rank}. {document.label} [{document.vector[0].toFixed(2)}, {document.vector[1].toFixed(2)}]</text>
              <text x={735} y={y} textAnchor="end" fontSize={14} fontFamily="monospace" fill={active ? selectedColor : t.textSecondary}>{format(document.calculation.score)}</text>
            </g>
          );
        })}
        <text x={482} y={215} fontSize={14} fill={queryColor}>Purple = query</text>
        <text x={600} y={215} fontSize={14} fill={selectedColor}>Green = selected</text>
      </svg>

      <div style={{ background: t.surfaceAlt, padding: '5px 9px', borderRadius: 7, fontSize: 16, lineHeight: 1.5 }}>
        <strong>{metricInfo.formula}</strong> · {metricInfo.closerMeans}<br />
        <span style={{ fontFamily: 'monospace' }}>{workedFormula(metric, query, selected.vector, selected.calculation.score)}</span>
      </div>

      <div style={{ marginTop: 5, fontSize: 14, color: t.textSecondary, lineHeight: 1.35 }} aria-live="polite">
        Step {playback.step + 1}/{ranked.length}: “{selected.label}” ranks #{selected.rank} for “{queryLabel}” because {reason}; {metric} = <strong style={{ color: selectedColor }}>{format(selected.calculation.score)}</strong>.
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 5 }}>
        <VizButton onClick={playback.toggle}>{playback.playing ? 'Pause' : 'Play'}</VizButton>
        <VizButton variant="secondary" onClick={playback.next}>Step →</VizButton>
        <VizButton variant="secondary" onClick={playback.reset}>Reset</VizButton>
        <label style={{ marginLeft: 'auto', minWidth: 170, fontSize: 14 }}>
          Selected document
          <select
            aria-label="Selected document"
            value={selected.id}
            onChange={(event) => playback.setStep(ranked.findIndex((row) => row.id === event.target.value))}
            style={{ marginLeft: 6, minHeight: 30, font: 'inherit', border: `1px solid ${t.border}`, borderRadius: 6, background: t.background, color: t.textPrimary }}
          >
            {ranked.map((document) => <option key={document.id} value={document.id}>{document.label}</option>)}
          </select>
        </label>
      </div>
    </>
  );
}

export default function EmbeddingSimilaritySearchDiagram() {
  return (
    <VisualizationContainer
      title="Embedding similarity search playground"
      footer="This is an exact two-dimensional calculation with vectors you can edit. Real embedding models use many more dimensions, but cosine, L2, and dot product use the same formulas shown here."
    >
      <EmbeddingSimilaritySearchPlayground />
    </VisualizationContainer>
  );
}
