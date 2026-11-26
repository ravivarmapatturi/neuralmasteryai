import { useMemo, useState } from 'react';
import { FONT_FAMILY, RADIUS, useVizTokens } from '../theme/vizTokens';
import { makeBlobs } from './lib/datasets';
import {
  buildTree,
  countTreeNodes,
  kmeansTrace,
  knnPredict,
  knnTrace,
  treePredict,
  treePredictionTrace,
  type KMeansIteration,
  type LabeledPoint,
} from './lib/decisionBoundary';
import { usePlaygroundPlayback } from './diagrams/usePlaygroundPlayback';
import { PillSelect, Slider, StickyNote, StickyRow, VisualizationContainer, VisualizationHeader, VizButton } from './primitives';

type Mode = 'knn' | 'tree' | 'kmeans';
type CanvasAction = 'query' | 'point';
const DOMAIN = 1.3;
const PLOT = { left: 58, top: 28, width: 650, height: 360 } as const;
const GRID = 24;

const MODE_OPTIONS: { value: Mode; label: string }[] = [
  { value: 'knn', label: 'K-nearest neighbors' },
  { value: 'tree', label: 'Decision tree' },
  { value: 'kmeans', label: 'K-means clustering' },
];

function seedPoints(): LabeledPoint[] {
  const { X, y } = makeBlobs(14, 3);
  return X.map(([x, yValue], index) => ({ x, y: yValue, label: y[index] }));
}

function numberInputStyle(t: ReturnType<typeof useVizTokens>): React.CSSProperties {
  return {
    width: '100%', minHeight: 36, boxSizing: 'border-box', padding: '5px 7px', border: `1.5px solid ${t.border}`,
    borderRadius: RADIUS.sm, background: t.background, color: t.textPrimary, fontFamily: FONT_FAMILY, fontSize: 15,
    fontVariantNumeric: 'tabular-nums',
  };
}

export default function DecisionBoundaryPlayground({ defaultMode = 'knn', compact = false }: { defaultMode?: Mode; compact?: boolean }) {
  const t = useVizTokens();
  const [mode, setMode] = useState<Mode>(defaultMode);
  const [points, setPoints] = useState<LabeledPoint[]>(seedPoints);
  const [query, setQuery] = useState({ x: 0.05, y: 0.05 });
  const [k, setK] = useState(3);
  const [maxDepth, setMaxDepth] = useState(3);
  const [clusterCount, setClusterCount] = useState(3);
  const [currentClass, setCurrentClass] = useState(0);
  const [canvasAction, setCanvasAction] = useState<CanvasAction>('query');
  const [prediction, setPrediction] = useState('0');
  const [predictionResult, setPredictionResult] = useState<boolean | null>(null);

  const tree = useMemo(() => buildTree(points, maxDepth), [points, maxDepth]);
  const neighborTrace = useMemo(() => knnTrace(points, k, query.x, query.y), [points, k, query]);
  const decisionTrace = useMemo(() => treePredictionTrace(tree, query.x, query.y), [tree, query]);
  const clusterTrace = useMemo(() => kmeansTrace(points, clusterCount, 7, 7), [points, clusterCount]);
  const traceLength = mode === 'knn' ? neighborTrace.length : mode === 'tree' ? decisionTrace.length : clusterTrace.length;
  const playback = usePlaygroundPlayback(Math.max(1, traceLength), 1350);
  const traceIndex = Math.min(playback.step, Math.max(0, traceLength - 1));
  const clusterStep: KMeansIteration | undefined = clusterTrace[traceIndex];
  const finalClusterStep = clusterTrace.at(-1);
  const classColors = [t.accentDanger, t.accentPrimary];
  const clusterColors = [t.accentPrimary, t.accentSecondary, t.accentPurple, t.accentWarn];

  const mapX = (x: number) => PLOT.left + ((x + DOMAIN) / (2 * DOMAIN)) * PLOT.width;
  const mapY = (y: number) => PLOT.top + ((DOMAIN - y) / (2 * DOMAIN)) * PLOT.height;
  const currentPrediction = mode === 'knn'
    ? knnPredict(points, k, query.x, query.y) ?? 0
    : mode === 'tree'
      ? treePredict(tree, query.x, query.y)
      : null;
  const neighborStep = neighborTrace[traceIndex];
  const treeStep = decisionTrace[traceIndex];

  const stopAndReset = () => { playback.setStep(0); setPredictionResult(null); };
  const updateMode = (next: Mode | ((previous: Mode) => Mode)) => {
    setMode(typeof next === 'function' ? next(mode) : next);
    stopAndReset();
  };

  const nearestCentroid = (x: number, y: number, step = clusterStep ?? finalClusterStep): number => {
    if (!step || step.centroids.length === 0) return 0;
    let best = 0;
    let bestDistance = Infinity;
    step.centroids.forEach((centroid, index) => {
      const distance = (centroid.x - x) ** 2 + (centroid.y - y) ** 2;
      if (distance < bestDistance) { bestDistance = distance; best = index; }
    });
    return best;
  };

  const handlePlotClick = (event: React.MouseEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const viewX = ((event.clientX - rect.left) / rect.width) * 760;
    const viewY = ((event.clientY - rect.top) / rect.height) * 430;
    if (viewX < PLOT.left || viewX > PLOT.left + PLOT.width || viewY < PLOT.top || viewY > PLOT.top + PLOT.height) return;
    const x = Number((((viewX - PLOT.left) / PLOT.width) * 2 * DOMAIN - DOMAIN).toFixed(2));
    const y = Number((DOMAIN - ((viewY - PLOT.top) / PLOT.height) * 2 * DOMAIN).toFixed(2));
    if (canvasAction === 'query') setQuery({ x, y });
    else setPoints((current) => [...current, { x, y, label: currentClass }]);
    stopAndReset();
  };

  const votesA = neighborStep?.votes[0] ?? 0;
  const votesB = neighborStep?.votes[1] ?? 0;
  const currentText = mode === 'knn'
    ? neighborStep
      ? `Neighbor ${neighborStep.rank} is class ${neighborStep.point.label === 0 ? 'A' : 'B'} at distance ${neighborStep.distance.toFixed(2)}. Votes so far: A ${votesA}, B ${votesB}.`
      : 'Add points to begin the vote.'
    : mode === 'tree'
      ? treeStep?.axis === 'leaf'
        ? `The query reached a leaf and the tree predicts class ${treeStep.label === 0 ? 'A' : 'B'}.`
        : `Question ${traceIndex + 1}: is ${treeStep?.axis} = ${treeStep?.value.toFixed(2)} at most ${treeStep?.threshold?.toFixed(2)}? Follow the ${treeStep?.branch} branch.`
      : `Iteration ${clusterStep?.iteration ?? 0}: assign each point to its nearest centroid, then move every centroid to its group's mean. SSE = ${(clusterStep?.sse ?? 0).toFixed(3)}.`;

  return (
    <VisualizationContainer
      title="Decision boundary playground"
      footer={compact ? undefined : 'KNN uses exact Euclidean neighbors, the tree uses greedy Gini-impurity splits, and k-means uses Lloyd iterations. The colored background is recomputed from the points and settings shown.'}
    >
      {!compact && (
        <>
          <VisualizationHeader
            eyebrow="Live playground"
            title="See how a model divides an empty map into decisions"
            description="A decision boundary is the line or region where a model changes its answer. Move the query or add training points to see why three algorithms draw different boundaries."
          />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'end' }}>
            <PillSelect<Mode> label="Algorithm (how the map is divided)" value={mode} onChange={updateMode} options={MODE_OPTIONS} />
            {mode === 'knn' && <div style={{ flex: '1 1 190px' }}><Slider label="Neighbors k (points that vote)" value={k} onChange={(value) => { setK(value); stopAndReset(); }} min={1} max={9} step={2} /></div>}
            {mode === 'tree' && <div style={{ flex: '1 1 190px' }}><Slider label="Maximum depth (questions allowed)" value={maxDepth} onChange={(value) => { setMaxDepth(value); stopAndReset(); }} min={1} max={6} step={1} /></div>}
            {mode === 'kmeans' && <div style={{ flex: '1 1 190px' }}><Slider label="Clusters k (groups to find)" value={clusterCount} onChange={(value) => { setClusterCount(value); stopAndReset(); }} min={2} max={4} step={1} /></div>}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, alignItems: 'end', marginBottom: 8 }}>
            <label style={{ fontSize: 15 }}><span style={{ display: 'block', marginBottom: 3, fontWeight: 700 }}>Query x (horizontal)</span><input aria-label="Query x coordinate" type="number" min={-DOMAIN} max={DOMAIN} step={0.05} value={query.x} onChange={(event) => { setQuery((current) => ({ ...current, x: Math.max(-DOMAIN, Math.min(DOMAIN, Number(event.target.value) || 0)) })); stopAndReset(); }} style={numberInputStyle(t)} /></label>
            <label style={{ fontSize: 15 }}><span style={{ display: 'block', marginBottom: 3, fontWeight: 700 }}>Query y (vertical)</span><input aria-label="Query y coordinate" type="number" min={-DOMAIN} max={DOMAIN} step={0.05} value={query.y} onChange={(event) => { setQuery((current) => ({ ...current, y: Math.max(-DOMAIN, Math.min(DOMAIN, Number(event.target.value) || 0)) })); stopAndReset(); }} style={numberInputStyle(t)} /></label>
            <PillSelect<CanvasAction> label="Plot click (what a click changes)" value={canvasAction} onChange={(value) => setCanvasAction(value as CanvasAction)} options={[{ value: 'query', label: 'Move query' }, { value: 'point', label: 'Add training point' }]} />
            {mode !== 'kmeans' && canvasAction === 'point' && <PillSelect<number> label="New point's known class" value={currentClass} onChange={(value) => setCurrentClass(Number(value))} options={[{ value: 0, label: 'Class A' }, { value: 1, label: 'Class B' }]} />}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
            <VizButton variant="secondary" onClick={() => { setPoints((current) => current.slice(0, -1)); stopAndReset(); }}>Undo point</VizButton>
            <VizButton variant="secondary" onClick={() => { setPoints(seedPoints()); setQuery({ x: 0.05, y: 0.05 }); stopAndReset(); }}>Reset map</VizButton>
          </div>
        </>
      )}

      <svg width="100%" viewBox="0 0 760 430" role="img" aria-label={`${mode} decision regions with ${points.length} training points and a query at ${query.x}, ${query.y}`} onClick={handlePlotClick} style={{ display: 'block', fontFamily: FONT_FAMILY, cursor: 'crosshair' }}>
        <defs><clipPath id="decision-boundary-clip"><rect x={PLOT.left} y={PLOT.top} width={PLOT.width} height={PLOT.height} /></clipPath></defs>
        <rect x={PLOT.left} y={PLOT.top} width={PLOT.width} height={PLOT.height} fill={t.background} stroke={t.border} strokeWidth={1.5} />
        <g clipPath="url(#decision-boundary-clip)">
          {Array.from({ length: GRID * GRID }, (_, index) => {
            const gx = index % GRID;
            const gy = Math.floor(index / GRID);
            const x = -DOMAIN + ((gx + 0.5) / GRID) * 2 * DOMAIN;
            const y = DOMAIN - ((gy + 0.5) / GRID) * 2 * DOMAIN;
            const label = mode === 'knn' ? knnPredict(points, k, x, y) ?? 0 : mode === 'tree' ? treePredict(tree, x, y) : nearestCentroid(x, y);
            const color = mode === 'kmeans' ? clusterColors[label % clusterColors.length] : classColors[label];
            return <rect key={index} x={PLOT.left + (gx / GRID) * PLOT.width} y={PLOT.top + (gy / GRID) * PLOT.height} width={PLOT.width / GRID + 0.6} height={PLOT.height / GRID + 0.6} fill={color} fillOpacity={0.16} />;
          })}
          {mode === 'knn' && neighborTrace.slice(0, traceIndex + 1).map((neighbor) => <line key={neighbor.rank} x1={mapX(query.x)} y1={mapY(query.y)} x2={mapX(neighbor.point.x)} y2={mapY(neighbor.point.y)} stroke={classColors[neighbor.point.label]} strokeWidth={2} strokeDasharray="5 4" />)}
          {points.map((point, index) => {
            const cluster = clusterStep?.assignments[index] ?? finalClusterStep?.assignments[index] ?? 0;
            const color = mode === 'kmeans' ? clusterColors[cluster % clusterColors.length] : classColors[point.label];
            return <circle key={`${point.x}-${point.y}-${index}`} cx={mapX(point.x)} cy={mapY(point.y)} r={5.5} fill={color} stroke={t.background} strokeWidth={1.5} />;
          })}
          {mode === 'kmeans' && clusterStep?.centroids.map((centroid, index) => (
            <g key={index} stroke={clusterColors[index]} strokeWidth={3}>
              <line x1={mapX(centroid.x) - 8} y1={mapY(centroid.y) - 8} x2={mapX(centroid.x) + 8} y2={mapY(centroid.y) + 8} />
              <line x1={mapX(centroid.x) + 8} y1={mapY(centroid.y) - 8} x2={mapX(centroid.x) - 8} y2={mapY(centroid.y) + 8} />
            </g>
          ))}
          {mode !== 'kmeans' && <path d={`M${mapX(query.x)} ${mapY(query.y) - 9} L${mapX(query.x) + 9} ${mapY(query.y)} L${mapX(query.x)} ${mapY(query.y) + 9} L${mapX(query.x) - 9} ${mapY(query.y)} Z`} fill={t.accentWarn} stroke={t.background} strokeWidth={1.5} />}
        </g>
        <text x={PLOT.left + PLOT.width / 2} y={420} textAnchor="middle" fontSize={15} fill={t.textSecondary}>x: horizontal feature →</text>
        <text x={16} y={PLOT.top + 16} fontSize={15} fill={t.textSecondary}>y ↑</text>
        <text x={PLOT.left + 8} y={PLOT.top + 22} fontSize={15} fontWeight={700} fill={t.textPrimary}>{points.length} training points</text>
        {mode !== 'kmeans' && <text x={Math.min(PLOT.left + PLOT.width - 100, mapX(query.x) + 12)} y={Math.max(PLOT.top + 18, mapY(query.y) - 12)} fontSize={15} fontWeight={700} fill={t.accentWarn}>query?</text>}
      </svg>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 18px', fontSize: 15 }} aria-label="Point colours">
        {mode === 'kmeans'
          ? clusterColors.slice(0, clusterCount).map((color, index) => <span key={index} style={{ color }}>● Cluster {index + 1}</span>)
          : <><span style={{ color: classColors[0] }}>● Known class A</span><span style={{ color: classColors[1] }}>● Known class B</span><span style={{ color: t.accentWarn }}>◆ Query to predict</span></>}
      </div>

      {compact ? (
        <StickyRow>
          <StickyNote title={mode === 'knn' ? 'Nearest-neighbor vote' : mode === 'tree' ? 'Gini impurity' : 'Move each centroid to its mean'} latex={mode === 'knn' ? String.raw`\hat y=\operatorname{mode}\{y_i:i\in N_k(q)\}` : mode === 'tree' ? String.raw`G=1-\sum_c p_c^2` : String.raw`\mu_j=\frac{1}{|C_j|}\sum_{x_i\in C_j}x_i`} color="yellow" tilt={-1}><p>{currentText}</p></StickyNote>
          <StickyNote title={`Step ${traceIndex + 1} of ${Math.max(1, traceLength)}`} color="blue" tilt={1} live><p>{currentText}</p></StickyNote>
        </StickyRow>
      ) : (
        <>
          <StickyRow>
            <StickyNote title="KNN: neighbors vote" latex={String.raw`\hat y=\operatorname{mode}\{y_i:i\in N_k(q)\}`} color="yellow" tilt={-1} active={mode === 'knn'} onSelect={() => updateMode('knn')}><p>Nk(q) means the k training points nearest to query q.</p></StickyNote>
            <StickyNote title="Tree: choose purer groups" latex={String.raw`G=1-\sum_c p_c^2`} color="pink" tilt={1} active={mode === 'tree'} onSelect={() => updateMode('tree')}><p>pc is the share of a node belonging to class c; lower G means less mixing.</p></StickyNote>
            <StickyNote title="K-means: move the centers" latex={String.raw`\mu_j=\frac{1}{|C_j|}\sum_{x_i\in C_j}x_i`} color="orange" tilt={-1} active={mode === 'kmeans'} onSelect={() => updateMode('kmeans')}><p>μj is cluster j's centroid: the mean position of its assigned points.</p></StickyNote>
          </StickyRow>
          <StickyRow>
            <StickyNote title="Worked numbers" color="green" tilt={1}>
              <p style={{ fontVariantNumeric: 'tabular-nums' }}>{mode === 'knn' ? `At q = (${query.x.toFixed(2)}, ${query.y.toFixed(2)}), votes revealed: A ${votesA}, B ${votesB}; final class ${currentPrediction === 0 ? 'A' : 'B'}.` : mode === 'tree' ? `The tree contains ${countTreeNodes(tree)} nodes and asks at most ${maxDepth} questions; q = (${query.x.toFixed(2)}, ${query.y.toFixed(2)}) ends in class ${currentPrediction === 0 ? 'A' : 'B'}.` : `SSE falls from ${(clusterTrace[0]?.sse ?? 0).toFixed(3)} to ${(clusterStep?.sse ?? 0).toFixed(3)} by iteration ${clusterStep?.iteration ?? 0}.`}</p>
            </StickyNote>
            <StickyNote title={`What just happened · step ${traceIndex + 1}`} color="blue" tilt={-1} live><p>{currentText}</p></StickyNote>
          </StickyRow>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
            <VizButton onClick={playback.toggle}>{playback.playing ? 'Pause' : 'Play'}</VizButton>
            <VizButton variant="secondary" onClick={playback.next}>Step →</VizButton>
            <VizButton variant="secondary" onClick={playback.reset}>Reset trace</VizButton>
          </div>
          <div style={{ marginTop: 10, paddingTop: 8, borderTop: `1px dashed ${t.border}`, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', fontSize: 15 }}>
            <strong style={{ color: t.accentWarn }}>Predict first:</strong>
            <span>{mode === 'kmeans' ? 'After centroids move to their groups, should SSE rise or fall?' : 'Which class will the yellow query receive?'}</span>
            <select aria-label="Boundary prediction" value={prediction} onChange={(event) => { setPrediction(event.target.value); setPredictionResult(null); }} style={{ minHeight: 36, font: 'inherit', border: `1.5px solid ${t.border}`, borderRadius: RADIUS.sm, background: t.background, color: t.textPrimary }}>
              {mode === 'kmeans' ? <><option value="0">SSE falls</option><option value="1">SSE rises</option></> : <><option value="0">Class A</option><option value="1">Class B</option></>}
            </select>
            <VizButton variant="secondary" onClick={() => setPredictionResult(mode === 'kmeans' ? prediction === '0' : Number(prediction) === currentPrediction)}>Run prediction</VizButton>
            {predictionResult !== null && <span role="status" style={{ color: predictionResult ? t.accentPrimary : t.accentDanger, fontWeight: 700 }}>{predictionResult ? 'Correct.' : mode === 'kmeans' ? 'Moving to each group mean cannot increase within-cluster squared distance.' : `The computed answer is class ${currentPrediction === 0 ? 'A' : 'B'}.`}</span>}
          </div>
        </>
      )}
    </VisualizationContainer>
  );
}
