import { useId, useMemo, useState } from 'react';
import { SketchArrow } from '../../components/notebook/RoughShape';
import { FONT_FAMILY, useVizTokens } from '../../theme/vizTokens';
import {
  PillSelect,
  Slider,
  StickyNote,
  StickyRow,
  useVizVisible,
  VisualizationContainer,
  VisualizationHeader,
  VizButton,
} from '../primitives';
import {
  simulateRandomWalkEmbedding,
  WALK_EDGES,
  WALK_NODES,
} from '../lib/randomWalkEmbedding';
import { useResponsiveHostWidth, useStepPlayback } from './useStepPlayback';

type WalkRegime = 'local' | 'exploratory' | 'deepwalk';

const REGIME_PRESETS: { id: WalkRegime; label: string; p: number; q: number }[] = [
  { id: 'local', label: 'Local community (high q = 2)', p: 1.0, q: 2.0 },
  { id: 'exploratory', label: 'Exploratory bridge (low q = 0.5)', p: 1.0, q: 0.5 },
  { id: 'deepwalk', label: 'DeepWalk uniform (p = 1, q = 1)', p: 1.0, q: 1.0 },
];

const PREDICT_OPTIONS = [
  'Jumping back to previous node 0',
  'Stepping outward to bridge node 3 (distance 2)',
  'Moving to shared neighbor 2',
] as const;

function RandomWalkEmbeddingPlayground({
  compact = false,
  outerVisible = true,
}: {
  compact?: boolean;
  outerVisible?: boolean;
}) {
  const t = useVizTokens();
  const clipGraphId = useId();
  const clipBarsId = useId();
  const { hostRef, isCompactPhone } = useResponsiveHostWidth(760);

  const [p, setP] = useState(1.0);
  const [q, setQ] = useState(2.0);
  const [startNode, setStartNode] = useState(1);
  const [walkLength, setWalkLength] = useState(7);
  const [seed, setSeed] = useState(42);
  const [prediction, setPrediction] = useState<number | null>(null);

  const sim = useMemo(
    () => simulateRandomWalkEmbedding({ start: startNode, length: walkLength, p, q, seed }),
    [startNode, walkLength, p, q, seed],
  );

  const playback = useStepPlayback(
    sim.frames.length,
    1850,
    Math.max(0, sim.frames.length - 1),
    outerVisible,
  );
  const frame = sim.frames[playback.step] ?? sim.frames[sim.frames.length - 1];

  const currColor = t.accentPrimary;
  const prevColor = t.accentPurple;
  const clusterColor = t.accentSecondary;
  const chainColor = t.accentDanger;

  const activeRegime: WalkRegime | 'custom' =
    Math.abs(p - 1) < 0.05 && Math.abs(q - 1) < 0.05
      ? 'deepwalk'
      : Math.abs(p - 1) < 0.05 && q > 1.2
        ? 'local'
        : Math.abs(p - 1) < 0.05 && q < 0.8
          ? 'exploratory'
          : 'custom';

  const inputStyle: React.CSSProperties = {
    width: '100%',
    boxSizing: 'border-box',
    minHeight: 34,
    padding: '4px 8px',
    font: 'inherit',
    fontSize: 15,
    fontVariantNumeric: 'tabular-nums',
    border: `1.5px solid ${t.border}`,
    borderRadius: 6,
    background: t.background,
    color: t.textPrimary,
  };

  const renderGraphPanel = (offsetX: number, panelW: number) => {
    const padX = 42;
    const padY = 44;
    const gW = panelW - padX * 2;
    const gH = 178;

    // Normalize original node positions cleanly into panel bounds
    const coords = WALK_NODES.map((n) => ({
      ...n,
      px: offsetX + padX + ((n.x - 70) / (420 - 70)) * gW,
      py: padY + ((n.y - 58) / (205 - 58)) * gH,
    }));

    const trailEdges: [number, number][] = [];
    for (let i = 0; i < frame.walkSoFar.length - 1; i++) {
      trailEdges.push([frame.walkSoFar[i], frame.walkSoFar[i + 1]]);
    }

    return (
      <g>
        <text x={offsetX + panelW / 2} y={20} textAnchor="middle" fontSize={15} fontWeight={700} fill={t.textPrimary}>
          2nd-order biased walk (click any node to start there)
        </text>
        <defs>
          <clipPath id={`${clipGraphId}-${offsetX}`}>
            <rect x={offsetX + 4} y={28} width={panelW - 8} height={240} />
          </clipPath>
        </defs>

        <g clipPath={`url(#${clipGraphId}-${offsetX})`}>
          {/* Base graph edges */}
          {WALK_EDGES.map(([a, b], idx) => (
            <line
              key={`edge-${idx}`}
              x1={coords[a].px}
              y1={coords[a].py}
              x2={coords[b].px}
              y2={coords[b].py}
              stroke={t.border}
              strokeWidth={1.6}
            />
          ))}

          {/* Walk trail arrows so far */}
          {trailEdges.map(([a, b], idx) => (
            <SketchArrow
              key={`trail-${idx}`}
              points={[
                [coords[a].px, coords[a].py],
                [coords[b].px, coords[b].py],
              ]}
              color={idx === trailEdges.length - 1 ? currColor : clusterColor}
              strokeWidth={idx === trailEdges.length - 1 ? 2.8 : 2}
              roughness={0.8}
              id={`rw-trail-${offsetX}-${idx}`}
            />
          ))}

          {/* Transition probability labels on edges leaving current node */}
          {frame.transitions.map((tr) => {
            const cA = coords[frame.curr];
            const cB = coords[tr.neighbor];
            const mx = (cA.px + cB.px) / 2;
            const my = (cA.py + cB.py) / 2;
            const dx = cB.px - cA.px;
            const dy = cB.py - cA.py;
            const len = Math.max(1, Math.hypot(dx, dy));
            // Offset perpendicular to edge so text never sits on top of the line
            const nx = (-dy / len) * 14;
            const ny = (dx / len) * 14;
            const pctText = `${Math.round(tr.probability * 100)}%`;
            const pillColor =
              tr.distanceFromPrev === 0
                ? prevColor
                : tr.distanceFromPrev === 2
                  ? chainColor
                  : currColor;

            return (
              <g key={`lbl-${tr.neighbor}`}>
                <rect
                  x={mx + nx - 20}
                  y={my + ny - 10}
                  width={40}
                  height={20}
                  rx={6}
                  fill={t.surface}
                  stroke={pillColor}
                  strokeWidth={1.1}
                />
                <text
                  x={mx + nx}
                  y={my + ny + 4}
                  textAnchor="middle"
                  fontSize={14}
                  fontWeight={700}
                  fill={pillColor}
                >
                  {pctText}
                </text>
              </g>
            );
          })}

          {/* Nodes */}
          {coords.map((node) => {
            const isCurr = node.id === frame.curr;
            const isPrev = node.id === frame.prev;
            const visits = frame.walkSoFar.filter((x) => x === node.id).length;
            const ringColor = isCurr ? currColor : isPrev ? prevColor : node.id >= 4 ? chainColor : clusterColor;

            return (
              <g
                key={`node-${node.id}`}
                onClick={() => {
                  setStartNode(node.id);
                  playback.setStep(0);
                }}
                style={{ cursor: 'pointer' }}
              >
                <circle
                  cx={node.px}
                  cy={node.py}
                  r={isCurr ? 19 : 16}
                  fill={isCurr ? currColor : visits > 0 ? t.surfaceAlt : t.background}
                  fillOpacity={isCurr ? 0.22 : 1}
                  stroke={ringColor}
                  strokeWidth={isCurr ? 3 : isPrev ? 2.4 : 1.6}
                  strokeDasharray={isPrev && !isCurr ? '4 2' : undefined}
                />
                <text
                  x={node.px}
                  y={node.py + 5}
                  textAnchor="middle"
                  fontSize={15}
                  fontWeight={700}
                  fill={t.textPrimary}
                >
                  {node.id}
                </text>
                {visits > 1 && (
                  <text x={node.px + 18} y={node.py - 12} fontSize={14} fontWeight={700} fill={clusterColor}>
                    ×{visits}
                  </text>
                )}
              </g>
            );
          })}

          <text x={offsetX + 20} y={260} fontSize={14} fill={clusterColor}>
            Cluster &#123;0, 1, 2, 3&#125;
          </text>
          <text x={offsetX + panelW - 16} y={260} textAnchor="end" fontSize={14} fill={chainColor}>
            Bridge → chain &#123;4, 5&#125;
          </text>
        </g>
      </g>
    );
  };

  const renderOddsPanel = (offsetX: number, panelW: number) => {
    const plotX = offsetX + 16;
    const barMax = Math.max(70, panelW - 170);

    return (
      <g>
        <text x={offsetX + panelW / 2} y={20} textAnchor="middle" fontSize={15} fontWeight={700} fill={t.textPrimary}>
          Next-step odds from node {frame.curr}
        </text>
        <defs>
          <clipPath id={`${clipBarsId}-${offsetX}`}>
            <rect x={plotX} y={32} width={panelW - 24} height={238} />
          </clipPath>
        </defs>

        <g clipPath={`url(#${clipBarsId}-${offsetX})`}>
          {frame.transitions.map((tr, i) => {
            const y = 46 + i * 38;
            const barColor =
              tr.distanceFromPrev === 0
                ? prevColor
                : tr.distanceFromPrev === 2
                  ? chainColor
                  : currColor;
            return (
              <g key={`tr-${tr.neighbor}`} transform={`translate(0, ${y})`}>
                <text x={plotX} y={13} fontSize={14} fontWeight={700} fill={t.textPrimary}>
                  To node {tr.neighbor} ({tr.ruleText})
                </text>
                <rect x={plotX} y={18} width={barMax} height={14} rx={4} fill={t.surfaceAlt} />
                <rect x={plotX} y={18} width={Math.max(4, tr.probability * barMax)} height={14} rx={4} fill={barColor} fillOpacity={0.85} />
                <text x={plotX + barMax + 8} y={30} fontSize={14} fontWeight={700} fill={barColor}>
                  {Math.round(tr.probability * 100)}% (w={tr.weight.toFixed(2)})
                </text>
              </g>
            );
          })}

          {/* Multi-walk visit breakdown */}
          <text x={plotX} y={184} fontSize={14} fontWeight={700} fill={t.textPrimary}>
            25-walk visit share (community vs. chain)
          </text>
          <text x={plotX} y={206} fontSize={14} fill={clusterColor}>
            Cluster &#123;0..3&#125;:
          </text>
          <rect x={plotX + 114} y={194} width={barMax - 20} height={14} rx={4} fill={t.surfaceAlt} />
          <rect x={plotX + 114} y={194} width={Math.max(4, sim.avgClusterShareMulti * (barMax - 20))} height={14} rx={4} fill={clusterColor} fillOpacity={0.85} />
          <text x={plotX + 114 + barMax - 12} y={206} fontSize={14} fontWeight={700} fill={clusterColor}>
            {Math.round(sim.avgClusterShareMulti * 100)}%
          </text>

          <text x={plotX} y={234} fontSize={14} fill={chainColor}>
            Chain &#123;4, 5&#125;:
          </text>
          <rect x={plotX + 114} y={222} width={barMax - 20} height={14} rx={4} fill={t.surfaceAlt} />
          <rect x={plotX + 114} y={222} width={Math.max(4, sim.avgChainShareMulti * (barMax - 20))} height={14} rx={4} fill={chainColor} fillOpacity={0.85} />
          <text x={plotX + 114 + barMax - 12} y={234} fontSize={14} fontWeight={700} fill={chainColor}>
            {Math.round(sim.avgChainShareMulti * 100)}%
          </text>
        </g>
      </g>
    );
  };

  return (
    <>
      {!compact && (
        <>
          <VisualizationHeader
            eyebrow="Live playground"
            title="How node2vec explores a network: community vs. structural role"
            description="node2vec turns a graph into training sentences using 2nd-order random walks. Two biases — return parameter p (revisiting the previous node t) and outward parameter q (stepping farther away) — shift walks from tight community loops (BFS-like) to outward bridge exploration (DFS-like)."
          />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <div style={{ marginBottom: -8 }}>
              <PillSelect<string>
                label="Walk bias preset (BFS community vs. DFS exploration)"
                value={activeRegime}
                onChange={(id) => {
                  const found = REGIME_PRESETS.find((r) => r.id === id);
                  if (!found) return;
                  setP(found.p);
                  setQ(found.q);
                }}
                options={[
                  ...REGIME_PRESETS.map((r) => ({ value: r.id, label: r.label })),
                  ...(activeRegime === 'custom' ? [{ value: 'custom', label: 'Custom p, q' }] : []),
                ]}
              />
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <VizButton onClick={playback.toggle}>{playback.playing ? 'Pause' : 'Play'}</VizButton>
              <VizButton variant="secondary" onClick={playback.next}>
                Step →
              </VizButton>
              <VizButton variant="secondary" onClick={playback.reset}>
                Reset
              </VizButton>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14, alignItems: 'end', marginTop: 6 }}>
            <Slider
              label="Return bias p (lower = bounce back)"
              value={p}
              onChange={(v) => setP(v)}
              min={0.2}
              max={4.0}
              step={0.1}
              format={(v) => v.toFixed(1)}
            />
            <Slider
              label="Outward bias q (lower = explore out)"
              value={q}
              onChange={(v) => setQ(v)}
              min={0.2}
              max={4.0}
              step={0.1}
              format={(v) => v.toFixed(1)}
            />
            <label style={{ display: 'block', fontSize: 15, color: t.textPrimary }}>
              <span style={{ display: 'block', marginBottom: 4, fontWeight: 700 }}>Exact outward bias q (0.2–4.0)</span>
              <input
                aria-label="Exact outward bias q"
                type="number"
                min={0.2}
                max={4.0}
                step={0.1}
                value={q}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  if (!Number.isFinite(val)) return;
                  setQ(Math.max(0.2, Math.min(4.0, Number(val.toFixed(2)))));
                }}
                style={inputStyle}
              />
            </label>
            <label style={{ display: 'block', fontSize: 15, color: t.textPrimary }}>
              <span style={{ display: 'block', marginBottom: 4, fontWeight: 700 }}>Walk length (3–12 hops)</span>
              <input
                aria-label="Walk length"
                type="number"
                min={3}
                max={12}
                step={1}
                value={walkLength}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  if (!Number.isFinite(val)) return;
                  setWalkLength(Math.max(3, Math.min(12, Math.round(val))));
                }}
                style={inputStyle}
              />
            </label>
            <label style={{ display: 'block', fontSize: 15, color: t.textPrimary }}>
              <span style={{ display: 'block', marginBottom: 4, fontWeight: 700 }}>Walk seed</span>
              <input
                aria-label="Walk seed"
                type="number"
                min={1}
                max={999}
                step={1}
                value={seed}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  if (!Number.isFinite(val)) return;
                  setSeed(Math.max(1, Math.min(999, Math.round(val))));
                }}
                style={inputStyle}
              />
            </label>
          </div>
        </>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 18px', fontSize: 15 }} aria-label="Chart legend">
        <span>
          <span style={{ display: 'inline-block', width: 12, height: 12, background: currColor, borderRadius: 6, verticalAlign: 'middle', marginRight: 6 }} />
          Current node v ({frame.curr})
        </span>
        <span>
          <span style={{ display: 'inline-block', width: 12, height: 12, border: `2px dashed ${prevColor}`, borderRadius: 6, verticalAlign: 'middle', marginRight: 6 }} />
          Previous node t ({frame.prev ?? 'none'})
        </span>
        <span>
          <span style={{ display: 'inline-block', width: 14, height: 4, background: clusterColor, verticalAlign: 'middle', marginRight: 6 }} />
          Cluster &#123;0..3&#125;
        </span>
        <span>
          <span style={{ display: 'inline-block', width: 14, height: 4, background: chainColor, verticalAlign: 'middle', marginRight: 6 }} />
          Outward chain &#123;4, 5&#125;
        </span>
      </div>

      <div ref={hostRef} style={{ width: '100%' }}>
        {!isCompactPhone ? (
          <svg
            width="100%"
            viewBox="0 0 760 272"
            role="img"
            aria-label={`node2vec walk at step ${frame.step} on node ${frame.curr} with p=${p}, q=${q}`}
            style={{ display: 'block', fontFamily: FONT_FAMILY }}
          >
            {renderGraphPanel(0, 442)}
            {renderOddsPanel(454, 306)}
          </svg>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            <svg width="100%" viewBox="0 0 370 268" role="img" aria-label="Graph walk path" style={{ display: 'block', fontFamily: FONT_FAMILY }}>
              {renderGraphPanel(0, 370)}
            </svg>
            <svg width="100%" viewBox="0 0 370 250" role="img" aria-label="Transition odds and visit share" style={{ display: 'block', fontFamily: FONT_FAMILY }}>
              {renderOddsPanel(0, 370)}
            </svg>
          </div>
        )}
      </div>

      {compact ? (
        <StickyRow>
          <StickyNote
            title="2nd-order step weight"
            latex={'\\alpha_{pq}(t,x) = \\begin{cases} 1/p & d_{tx}=0 \\\\ 1 & d_{tx}=1 \\\\ 1/q & d_{tx}=2 \\end{cases}'}
            color="yellow"
            tilt={-1}
          >
            <p className="nm-sticky__mono" style={{ textAlign: 'center' }}>
              p = {p.toFixed(1)}, q = {q.toFixed(1)} → Chain visits: <strong>{Math.round(sim.avgChainShareMulti * 100)}%</strong>
            </p>
          </StickyNote>
          <StickyNote title={`Step ${playback.step + 1} of ${sim.frames.length}`} color="blue" tilt={1} live>
            <p>{frame.explain}</p>
          </StickyNote>
        </StickyRow>
      ) : (
        <>
          <StickyRow>
            <StickyNote
              title="Local community (high q > 1)"
              latex={'\\alpha_{pq}(t,x) = \\begin{cases} 1/p & d_{tx}=0 \\\\ 1 & d_{tx}=1 \\\\ 1/q & d_{tx}=2 \\end{cases}'}
              color="yellow"
              tilt={-1}
              active={activeRegime === 'local'}
              onSelect={() => {
                setP(1.0);
                setQ(2.0);
              }}
            >
              <p style={{ textAlign: 'center' }}>When q &gt; 1, outward jumps (d=2) get weight 1/q &lt; 1, keeping walks in the cluster.</p>
            </StickyNote>
            <StickyNote
              title="Exploratory role (low q < 1)"
              latex={'P(x\\mid v,t) = \\frac{\\alpha_{pq}(t,x)}{\\sum_{u\\in N(v)} \\alpha_{pq}(t,u)}'}
              color="pink"
              tilt={1}
              active={activeRegime === 'exploratory'}
              onSelect={() => {
                setP(1.0);
                setQ(0.5);
              }}
            >
              <p style={{ textAlign: 'center' }}>When q &lt; 1, 1/q &gt; 1 rewards stepping away from t along chains and bridges.</p>
            </StickyNote>
            <StickyNote
              title="DeepWalk (uniform walk)"
              latex={'p = 1,\\; q = 1 \\implies P(x\\mid v) = \\frac{1}{|N(v)|}'}
              color="orange"
              tilt={-1}
              active={activeRegime === 'deepwalk'}
              onSelect={() => {
                setP(1.0);
                setQ(1.0);
              }}
            >
              <p style={{ textAlign: 'center' }}>Equal probability for every neighbor regardless of the previous node.</p>
            </StickyNote>
          </StickyRow>

          <StickyRow>
            <StickyNote title={`Worked numbers · Walk: ${frame.walkSoFar.join(' → ')}`} color="green" tilt={1}>
              <p className="nm-sticky__mono">
                From {frame.curr} (prev {frame.prev ?? 'none'}): {frame.transitions.map((tr) => `${tr.neighbor}:${tr.weight.toFixed(2)} (${Math.round(tr.probability * 100)}%)`).join(' · ')}
              </p>
              <p className="nm-sticky__mono" style={{ marginTop: 4 }}>
                This walk: {frame.clusterVisits} cluster / {frame.chainVisits} chain · 25-walk avg: <strong>{Math.round(sim.avgClusterShareMulti * 100)}% cluster / {Math.round(sim.avgChainShareMulti * 100)}% chain</strong>
              </p>
            </StickyNote>
            <StickyNote title={`Step ${playback.step + 1} of ${sim.frames.length} · What just happened`} color="blue" tilt={-1} live>
              <p>{frame.explain}</p>
            </StickyNote>
          </StickyRow>

          <div
            style={{
              marginTop: 4,
              paddingTop: 10,
              borderTop: `1px dashed ${t.border}`,
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: '8px 12px',
              fontSize: 15,
            }}
          >
            <strong style={{ color: t.accentWarn }}>Predict first:</strong>
            <span>At node 1 (after arriving from node 0), you set p = 1.0 and q = 0.25. Which neighbor gets the highest transition weight (1/q = 4.0)?</span>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {PREDICT_OPTIONS.map((opt, idx) => {
                const picked = prediction === idx;
                const correct = idx === 1;
                const revealed = prediction !== null;
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setPrediction(idx)}
                    style={{
                      padding: '5px 10px',
                      borderRadius: 6,
                      border: `1px solid ${revealed && correct ? t.accentPrimary : revealed && picked ? t.accentDanger : t.border}`,
                      background: revealed && correct ? t.accentPrimary : revealed && picked ? t.accentDanger : 'transparent',
                      color: revealed && (correct || picked) ? t.background : t.textPrimary,
                      font: 'inherit',
                      fontSize: 15,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
            {prediction !== null && (
              <span role="status" style={{ fontSize: 15, color: prediction === 1 ? t.accentPrimary : t.accentWarn }}>
                {prediction === 1 ? 'Correct — ' : 'Watch — '}
                node 3 has no direct edge to node 0 (d = 2), so it gets weight 1/0.25 = 4.0 (67% odds) while nodes 0 and 2 get weight 1.0 (17% each).{' '}
                <button
                  type="button"
                  onClick={() => {
                    setStartNode(0);
                    setP(1.0);
                    setQ(0.25);
                    setSeed(42);
                    playback.setStep(1);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    color: t.accentSecondary,
                    textDecoration: 'underline',
                    font: 'inherit',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Test p = 1.0, q = 0.25 now
                </button>
              </span>
            )}
          </div>
        </>
      )}
    </>
  );
}

export default function RandomWalkEmbeddingDiagram({ compact = false }: { compact?: boolean } = {}) {
  const outerVisible = useVizVisible();
  return (
    <VisualizationContainer
      title="node2vec biased random walk playground"
      footer="Real 2nd-order weighted walk on a 6-node cluster+chain network: weights 1/p (backtrack d=0), 1 (shared neighbor d=1), and 1/q (outward step d=2)."
    >
      <RandomWalkEmbeddingPlayground compact={compact} outerVisible={outerVisible} />
    </VisualizationContainer>
  );
}
