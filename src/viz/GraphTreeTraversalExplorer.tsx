import { useId, useMemo, useState } from 'react';
import { FONT_FAMILY, RADIUS, useVizTokens } from '../theme/vizTokens';
import {
  PillSelect,
  StickyNote,
  StickyRow,
  VisualizationContainer,
  VisualizationHeader,
  VizButton,
  useVizVisible,
} from './primitives';
import {
  buildLcaSteps,
  computeBfsSteps,
  computeDfsSteps,
  DEFAULT_GRAPH_TEXT,
  GRAPH_PRESETS,
  parseGraph,
  reconstructPath,
  TREE_NODE_IDS,
  TREE_NODES,
  TREE_PAIR_PRESETS,
  type GraphAlgo,
  type TraversalMode,
} from './lib/graphTreeTraversal';
import { useResponsiveHostWidth, useStepPlayback } from './diagrams/useStepPlayback';

const GRAPH_PREDICT_OPTIONS = [
  'Through A → B → D → C (3 hops, diving deep first)',
  'Directly along A → C (1 hop, shortest path)',
  'It never reaches C at all',
] as const;

const TREE_PREDICT_OPTIONS = [
  'Node 7 is never visited — node 6 matches p and returns itself',
  'It visits node 7 first, then climbs back to node 6',
  'It returns null because 6 cannot be its own ancestor',
] as const;

function layoutGraphNodes(
  order: readonly string[],
  offsetX: number,
  panelW: number,
): Record<string, { x: number; y: number; badgeDx: number; badgeDy: number; badgeAnchor: 'start' | 'middle' | 'end' }> {
  const pos: Record<
    string,
    { x: number; y: number; badgeDx: number; badgeDy: number; badgeAnchor: 'start' | 'middle' | 'end' }
  > = {};

  if (order.length === 5 && order.join(',') === 'A,B,C,D,E') {
    pos.A = { x: offsetX + panelW * 0.16, y: 186, badgeDx: 0, badgeDy: -27, badgeAnchor: 'middle' };
    pos.B = { x: offsetX + panelW * 0.42, y: 110, badgeDx: 0, badgeDy: -27, badgeAnchor: 'middle' };
    pos.C = { x: offsetX + panelW * 0.42, y: 264, badgeDx: 0, badgeDy: 34, badgeAnchor: 'middle' };
    pos.D = { x: offsetX + panelW * 0.68, y: 186, badgeDx: 0, badgeDy: -27, badgeAnchor: 'middle' };
    pos.E = { x: offsetX + panelW * 0.87, y: 186, badgeDx: 0, badgeDy: -27, badgeAnchor: 'middle' };
    return pos;
  }

  const cx = offsetX + panelW / 2;
  const cy = 190;
  const radius = Math.min(102, panelW * 0.27);
  const n = Math.max(order.length, 1);

  order.forEach((id, idx) => {
    const angle = (2 * Math.PI * idx) / n - Math.PI / 2;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const x = cx + radius * cos;
    const y = cy + radius * sin;
    const badgeDx = Math.round(cos * 30);
    const badgeDy = Math.round(sin * 30) + 5;
    const badgeAnchor: 'start' | 'middle' | 'end' =
      cos > 0.3 ? 'start' : cos < -0.3 ? 'end' : 'middle';
    pos[id] = { x, y, badgeDx, badgeDy, badgeAnchor };
  });

  return pos;
}

function GraphTreeTraversalPlayground({
  compact = false,
  outerVisible = true,
}: {
  compact?: boolean;
  outerVisible?: boolean;
}) {
  const t = useVizTokens();
  const clipLeftId = useId();
  const clipRightId = useId();
  const { hostRef, isCompactPhone } = useResponsiveHostWidth(760);

  const [mode, setMode] = useState<TraversalMode>('graph');
  const [graphText, setGraphText] = useState(DEFAULT_GRAPH_TEXT);
  const [algo, setAlgo] = useState<GraphAlgo>('bfs');
  const [start, setStart] = useState('A');
  const [target, setTarget] = useState('C');

  const [pId, setPId] = useState('4');
  const [qId, setQId] = useState('5');
  const [nextPickTarget, setNextPickTarget] = useState<'p' | 'q'>('p');

  const [prediction, setPrediction] = useState<number | null>(null);

  const { adj, order, edges } = useMemo(() => parseGraph(graphText, 10), [graphText]);
  const validStart = order.includes(start) ? start : order[0] ?? '';
  const validTarget = order.includes(target) ? target : order[order.length - 1] ?? validStart;

  const graphSteps = useMemo(() => {
    if (!validStart || order.length === 0) return [];
    return algo === 'bfs' ? computeBfsSteps(adj, validStart) : computeDfsSteps(adj, validStart);
  }, [adj, order.length, validStart, algo]);

  const { steps: lcaSteps, finalResult: lcaFinalResult } = useMemo(
    () => buildLcaSteps(pId, qId),
    [pId, qId],
  );

  const totalSteps = mode === 'graph' ? graphSteps.length : lcaSteps.length;
  const reducedMotionStep = Math.max(0, totalSteps - 1);
  const playback = useStepPlayback(Math.max(1, totalSteps), 1450, reducedMotionStep, outerVisible);

  const safeStepIdx = Math.min(playback.step, Math.max(0, totalSteps - 1));
  const currentGraphStep = graphSteps[safeStepIdx];
  const currentLcaStep = lcaSteps[safeStepIdx];
  const isLastLcaStep = mode === 'tree' && totalSteps > 0 && safeStepIdx === totalSteps - 1;

  const resetTrace = () => {
    playback.setStep(0);
    setPrediction(null);
  };

  const changeMode = (next: TraversalMode | ((prev: TraversalMode) => TraversalMode)) => {
    setMode((prev) => (typeof next === 'function' ? next(prev) : next));
    resetTrace();
  };

  const changeAlgo = (next: GraphAlgo | ((prev: GraphAlgo) => GraphAlgo)) => {
    setAlgo((prev) => (typeof next === 'function' ? next(prev) : next));
    resetTrace();
  };

  const applyPreset = (presetId: (typeof GRAPH_PRESETS)[number]['id']) => {
    const preset = GRAPH_PRESETS.find((item) => item.id === presetId) ?? GRAPH_PRESETS[0];
    setGraphText(preset.text);
    setStart(preset.defaultStart);
    setTarget(preset.defaultTarget);
    resetTrace();
  };

  // Distinct color mapping used consistently across graph, tree, trace, and legend
  const currentColor = t.accentPrimary; // green: active node / match / confirmed LCA
  const visitedColor = t.accentSecondary; // blue: visited / resolved subtree
  const frontierColor = t.accentWarn; // amber: waiting in Q/S or target node p/q
  const warnColor = t.accentDanger; // red: duplicate skipped / unreachable

  const targetPath = useMemo(() => {
    if (!currentGraphStep || !validStart || !validTarget) return null;
    if (!currentGraphStep.visitedOrder.includes(validTarget)) return null;
    return reconstructPath(currentGraphStep.parents, validStart, validTarget);
  }, [currentGraphStep, validStart, validTarget]);

  const targetPathEdges = useMemo(() => {
    const set = new Set<string>();
    if (!targetPath || targetPath.length < 2) return set;
    for (let i = 0; i < targetPath.length - 1; i += 1) {
      set.add([targetPath[i], targetPath[i + 1]].sort().join('|'));
    }
    return set;
  }, [targetPath]);

  const inputStyle: React.CSSProperties = {
    width: '100%',
    minHeight: 36,
    boxSizing: 'border-box',
    padding: '5px 8px',
    borderRadius: RADIUS.sm,
    border: `1.5px solid ${t.border}`,
    background: t.background,
    color: t.textPrimary,
    fontFamily: FONT_FAMILY,
    fontSize: 15,
    fontVariantNumeric: 'tabular-nums',
  };

  const renderGraphNetworkPanel = (offsetX: number, panelW: number) => {
    const pos = layoutGraphNodes(order, offsetX, panelW);
    const visitedSet = new Set(currentGraphStep?.visitedOrder ?? []);
    const frontierSet = new Set(currentGraphStep?.frontier ?? []);
    const currentId = currentGraphStep?.current;
    const treeEdgeSet = new Set<string>();
    if (currentGraphStep) {
      Object.entries(currentGraphStep.parents).forEach(([node, parent]) => {
        if (parent) treeEdgeSet.add([node, parent].sort().join('|'));
      });
    }

    return (
      <g clipPath={`url(#${clipLeftId})`}>
        <text x={offsetX + 10} y={24} fontSize={16} fontWeight={700} fill={t.textPrimary}>
          Connected map (click a node to start)
        </text>
        {order.length === 0 ? (
          <text x={offsetX + panelW / 2} y={180} textAnchor="middle" fontSize={15} fill={warnColor}>
            Type at least one node (e.g. A: B, C) above.
          </text>
        ) : (
          <>
            {edges.map(([a, b]) => {
              const pa = pos[a];
              const pb = pos[b];
              if (!pa || !pb) return null;
              const key = [a, b].sort().join('|');
              const onTargetPath = targetPathEdges.has(key);
              const onTree = treeEdgeSet.has(key);
              return (
                <line
                  key={`${a}-${b}`}
                  x1={pa.x}
                  y1={pa.y}
                  x2={pb.x}
                  y2={pb.y}
                  stroke={onTargetPath ? currentColor : onTree ? visitedColor : t.border}
                  strokeWidth={onTargetPath ? 3.5 : onTree ? 2.6 : 1.6}
                  opacity={onTargetPath || onTree ? 0.95 : 0.65}
                />
              );
            })}

            {order.map((id) => {
              const p = pos[id];
              if (!p) return null;
              const isCurrent = id === currentId;
              const isVisited = visitedSet.has(id) && !isCurrent;
              const isFrontier = frontierSet.has(id) && !isVisited && !isCurrent;
              const isTarget = id === validTarget;
              const isSkippedDup = currentGraphStep?.action === 'skip-duplicate' && isCurrent;

              let fill = t.surfaceAlt;
              let stroke = t.border;
              if (isSkippedDup) {
                fill = warnColor;
                stroke = warnColor;
              } else if (isCurrent) {
                fill = currentColor;
                stroke = currentColor;
              } else if (isVisited) {
                fill = visitedColor;
                stroke = visitedColor;
              } else if (isFrontier) {
                fill = frontierColor;
                stroke = frontierColor;
              }

              const dist = currentGraphStep?.distances[id];
              const badge =
                id === validStart && dist !== undefined
                  ? `start · d=${dist}`
                  : isTarget && dist !== undefined
                    ? `goal · d=${dist}`
                    : dist !== undefined
                      ? `${algo === 'bfs' ? 'd' : 'hop'}=${dist}`
                      : id === validStart
                        ? 'start'
                        : isTarget
                          ? 'goal'
                          : '';

              return (
                <g
                  key={id}
                  onClick={() => {
                    setStart(id);
                    resetTrace();
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  {isTarget && (
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={23}
                      fill="none"
                      stroke={currentColor}
                      strokeWidth={2}
                      strokeDasharray="4 3"
                    />
                  )}
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={18}
                    fill={fill}
                    fillOpacity={isCurrent || isVisited || isFrontier ? 0.22 : 1}
                    stroke={stroke}
                    strokeWidth={isCurrent ? 3 : 2}
                  />
                  <text
                    x={p.x}
                    y={p.y + 5}
                    textAnchor="middle"
                    fontSize={15}
                    fontWeight={700}
                    fill={t.textPrimary}
                  >
                    {id}
                  </text>
                  {badge && (
                    <text
                      x={p.x + p.badgeDx}
                      y={p.y + p.badgeDy}
                      textAnchor={p.badgeAnchor}
                      fontSize={14}
                      fontWeight={isTarget || isCurrent ? 700 : 500}
                      fill={isTarget ? currentColor : isVisited ? visitedColor : t.textSecondary}
                    >
                      {badge}
                    </text>
                  )}
                </g>
              );
            })}
          </>
        )}
      </g>
    );
  };

  const renderGraphTracePanel = (offsetX: number, panelW: number) => {
    const frontier = currentGraphStep?.frontier ?? [];
    const dupSet = new Set(currentGraphStep?.duplicateIndices ?? []);
    const visitedOrder = currentGraphStep?.visitedOrder ?? [];
    const finished = safeStepIdx === Math.max(0, graphSteps.length - 1);
    const maxSlots = Math.min(frontier.length, 6);
    const slotW = Math.min(44, Math.floor((panelW - 36) / Math.max(maxSlots, 1)));
    const slotGap = 6;
    const listX = offsetX + 12;

    return (
      <g clipPath={`url(#${clipRightId})`}>
        <text x={listX} y={24} fontSize={16} fontWeight={700} fill={t.textPrimary}>
          {algo === 'bfs' ? 'Queue Q (front popped first)' : 'Stack S (top popped first)'}
        </text>

        {frontier.length === 0 ? (
          <text x={listX} y={76} fontSize={15} fill={t.textSecondary}>
            Empty — every reachable node was processed.
          </text>
        ) : (
          <>
            <text x={listX} y={48} fontSize={14} fill={frontierColor} fontWeight={700}>
              {algo === 'bfs' ? '← pop front next' : 'bottom of stack'}
            </text>
            {algo === 'dfs' && (
              <text x={offsetX + panelW - 12} y={48} textAnchor="end" fontSize={14} fill={currentColor} fontWeight={700}>
                pop top next →
              </text>
            )}
            {frontier.slice(0, 6).map((item, idx) => {
              const bx = listX + idx * (slotW + slotGap);
              const isDup = dupSet.has(idx);
              const isNextPop = algo === 'bfs' ? idx === 0 : idx === Math.min(frontier.length, 6) - 1;
              return (
                <g key={`${item}-${idx}`}>
                  <rect
                    x={bx}
                    y={58}
                    width={slotW}
                    height={36}
                    rx={6}
                    fill={isDup ? warnColor : isNextPop ? currentColor : frontierColor}
                    fillOpacity={0.18}
                    stroke={isDup ? warnColor : isNextPop ? currentColor : frontierColor}
                    strokeWidth={isNextPop ? 2.4 : 1.6}
                    strokeDasharray={isDup ? '4 3' : undefined}
                  />
                  <text
                    x={bx + slotW / 2}
                    y={82}
                    textAnchor="middle"
                    fontSize={15}
                    fontWeight={700}
                    fill={t.textPrimary}
                  >
                    {item}
                  </text>
                  {isDup && (
                    <text x={bx + slotW / 2} y={110} textAnchor="middle" fontSize={14} fontWeight={700} fill={warnColor}>
                      dup
                    </text>
                  )}
                </g>
              );
            })}
            {frontier.length > 6 && (
              <text x={listX + 6 * (slotW + slotGap)} y={82} fontSize={14} fill={t.textSecondary}>
                +{frontier.length - 6}
              </text>
            )}
          </>
        )}

        <text x={listX} y={146} fontSize={15} fontWeight={700} fill={t.textPrimary}>
          Visited order ({visitedOrder.length}/{order.length})
        </text>
        <text x={listX} y={172} fontSize={15} fill={visitedColor} fontWeight={600}>
          {visitedOrder.slice(0, 5).join(' → ') || 'none yet'}
        </text>
        {visitedOrder.length > 5 && (
          <text x={listX} y={196} fontSize={15} fill={visitedColor} fontWeight={600}>
            → {visitedOrder.slice(5).join(' → ')}
          </text>
        )}

        <text x={listX} y={232} fontSize={15} fontWeight={700} fill={t.textPrimary}>
          Route to goal “{validTarget}”
        </text>
        <text
          x={listX}
          y={258}
          fontSize={15}
          fontWeight={700}
          fill={targetPath ? currentColor : finished ? warnColor : t.textSecondary}
        >
          {targetPath
            ? `${targetPath.length > 5 ? `${targetPath.slice(0, 4).join(' → ')} → … → ${targetPath[targetPath.length - 1]}` : targetPath.join(' → ')} (${targetPath.length - 1} hop${targetPath.length - 1 === 1 ? '' : 's'})`
            : finished
              ? `Unreachable from ${validStart}`
              : 'Not reached yet — keep stepping'}
        </text>

        <text x={listX} y={294} fontSize={14} fill={t.textSecondary}>
          {algo === 'bfs'
            ? 'BFS marks visited on push: Q never repeats a node.'
            : 'DFS marks visited on pop: S can hold a duplicate.'}
        </text>
      </g>
    );
  };

  const renderTreePanel = (offsetX: number, panelW: number) => {
    const activeSet = new Set(currentLcaStep?.activePath ?? []);
    const resolved = currentLcaStep?.resolved ?? {};
    const currentId = currentLcaStep?.node;

    const mapX = (x: number) => offsetX + (x / 408) * panelW;
    const treeEdges: [string, string][] = [];
    Object.values(TREE_NODES).forEach((n) => {
      if (n.left) treeEdges.push([n.id, n.left]);
      if (n.right) treeEdges.push([n.id, n.right]);
    });

    const targetSide = (id: string): { dx: number; anchor: 'start' | 'end' } =>
      id === '3' || id === '2' || id === '4' || id === '1'
        ? { dx: -26, anchor: 'end' }
        : { dx: 26, anchor: 'start' };

    return (
      <g clipPath={`url(#${clipLeftId})`}>
        <text x={offsetX + 10} y={24} fontSize={16} fontWeight={700} fill={t.textPrimary}>
          Binary tree (click node to set {nextPickTarget})
        </text>

        {treeEdges.map(([a, b]) => {
          const onStack = activeSet.has(a) && activeSet.has(b);
          return (
            <line
              key={`${a}-${b}`}
              x1={mapX(TREE_NODES[a].x)}
              y1={TREE_NODES[a].y}
              x2={mapX(TREE_NODES[b].x)}
              y2={TREE_NODES[b].y}
              stroke={onStack ? visitedColor : t.border}
              strokeWidth={onStack ? 3 : 1.8}
              opacity={onStack ? 0.95 : 0.65}
            />
          );
        })}

        {TREE_NODE_IDS.map((id) => {
          const spec = TREE_NODES[id];
          const nx = mapX(spec.x);
          const ny = spec.y;
          const isCurrent = id === currentId;
          const isLca = isLastLcaStep && id === lcaFinalResult;
          const isTarget = id === pId || id === qId;
          const retVal = resolved[id];

          let fill = t.surfaceAlt;
          let stroke = t.border;
          if (isLca) {
            fill = currentColor;
            stroke = currentColor;
          } else if (isCurrent) {
            fill = currentColor;
            stroke = currentColor;
          } else if (activeSet.has(id)) {
            fill = visitedColor;
            stroke = visitedColor;
          } else if (retVal !== undefined) {
            fill = retVal ? visitedColor : t.surfaceAlt;
            stroke = retVal ? visitedColor : t.textMuted;
          }

          const side = targetSide(id);
          const targetLabel = id === pId && id === qId ? 'p, q' : id === pId ? 'p' : id === qId ? 'q' : '';
          const retLabel =
            retVal !== undefined
              ? isLca
                ? `→ ${retVal} (LCA)`
                : `→ ${retVal ?? 'null'}`
              : '';

          return (
            <g
              key={id}
              onClick={() => {
                if (nextPickTarget === 'p') {
                  if (id !== qId) setPId(id);
                  setNextPickTarget('q');
                } else {
                  if (id !== pId) setQId(id);
                  setNextPickTarget('p');
                }
                resetTrace();
              }}
              style={{ cursor: 'pointer' }}
            >
              {isTarget && (
                <circle
                  cx={nx}
                  cy={ny}
                  r={23}
                  fill="none"
                  stroke={frontierColor}
                  strokeWidth={2.2}
                  strokeDasharray="4 3"
                />
              )}
              <circle
                cx={nx}
                cy={ny}
                r={18}
                fill={fill}
                fillOpacity={isLca || isCurrent || activeSet.has(id) || retVal ? 0.22 : 1}
                stroke={stroke}
                strokeWidth={isLca || isCurrent ? 3 : 1.8}
              />
              <text x={nx} y={ny + 5} textAnchor="middle" fontSize={15} fontWeight={700} fill={t.textPrimary}>
                {id}
              </text>
              {targetLabel && (
                <text
                  x={nx + side.dx}
                  y={ny - 4}
                  textAnchor={side.anchor}
                  fontSize={14}
                  fontWeight={700}
                  fill={frontierColor}
                >
                  {targetLabel}
                </text>
              )}
              {retLabel && (
                <text
                  x={id === '4' || id === '5' || id === '7' ? nx : nx + (id === '1' || id === '6' ? 26 : -26)}
                  y={id === '4' || id === '5' || id === '7' ? ny + 36 : ny + 18}
                  textAnchor={id === '4' || id === '5' || id === '7' ? 'middle' : id === '1' || id === '6' ? 'start' : 'end'}
                  fontSize={14}
                  fontWeight={isLca ? 700 : 500}
                  fill={isLca ? currentColor : retVal ? visitedColor : t.textMuted}
                >
                  {retLabel}
                </text>
              )}
            </g>
          );
        })}
      </g>
    );
  };

  const renderTreeTracePanel = (offsetX: number, panelW: number) => {
    const activePath = currentLcaStep?.activePath ?? [];
    const resolved = currentLcaStep?.resolved ?? {};
    const listX = offsetX + 12;

    return (
      <g clipPath={`url(#${clipRightId})`}>
        <text x={listX} y={24} fontSize={16} fontWeight={700} fill={t.textPrimary}>
          Recursion call stack (active path)
        </text>
        {activePath.map((nodeId, idx) => {
          const y = 48 + idx * 28;
          const isLeafFrame = idx === activePath.length - 1;
          return (
            <g key={`${nodeId}-${idx}`}>
              <rect
                x={listX + idx * 14}
                y={y}
                width={Math.max(120, panelW - 32 - idx * 14)}
                height={24}
                rx={5}
                fill={isLeafFrame ? currentColor : visitedColor}
                fillOpacity={0.14}
                stroke={isLeafFrame ? currentColor : visitedColor}
                strokeWidth={isLeafFrame ? 2 : 1.2}
              />
              <text
                x={listX + idx * 14 + 10}
                y={y + 17}
                fontSize={14}
                fontWeight={isLeafFrame ? 700 : 500}
                fill={t.textPrimary}
              >
                visit({nodeId}) {isLeafFrame ? `← ${currentLcaStep?.phase}` : 'waiting on child'}
              </text>
            </g>
          );
        })}

        <text x={listX} y={182} fontSize={15} fontWeight={700} fill={t.textPrimary}>
          What each node returned
        </text>
        {TREE_NODE_IDS.map((id, idx) => {
          const col = idx % 2;
          const row = Math.floor(idx / 2);
          const rx = listX + col * Math.floor((panelW - 24) / 2);
          const ry = 208 + row * 26;
          const val = resolved[id];
          const isLca = isLastLcaStep && id === lcaFinalResult;
          return (
            <text
              key={id}
              x={rx}
              y={ry}
              fontSize={14}
              fontWeight={isLca ? 700 : 500}
              fill={isLca ? currentColor : val ? visitedColor : t.textSecondary}
            >
              node {id} → {val === undefined ? '…' : val === null ? 'null' : isLca ? `${val} (LCA)` : val}
            </text>
          );
        })}

        <text
          x={listX}
          y={324}
          fontSize={15}
          fontWeight={700}
          fill={isLastLcaStep ? currentColor : t.textSecondary}
        >
          {isLastLcaStep
            ? `Confirmed LCA(${pId}, ${qId}) = node ${lcaFinalResult}`
            : `Still checking subtree — root must combine both sides`}
        </text>
      </g>
    );
  };

  const workedText =
    mode === 'graph'
      ? currentGraphStep
        ? `Start ${validStart}, Goal ${validTarget}. Visited ${currentGraphStep.visitedOrder.length}/${order.length}: [${currentGraphStep.visitedOrder.join(', ')}]. ${algo === 'bfs' ? 'Queue Q' : 'Stack S'} = [${currentGraphStep.frontier.join(', ') || 'empty'}]. ${targetPath ? `Path to ${validTarget}: ${targetPath.join(' → ')} (${targetPath.length - 1} hop${targetPath.length - 1 === 1 ? '' : 's'}).` : 'Goal not visited yet.'}`
        : 'Add at least one valid node to trace the traversal.'
      : `Targets p = ${pId}, q = ${qId}. Stack: ${currentLcaStep?.activePath.join(' → ') ?? '1'}. ${isLastLcaStep ? `Root returned LCA = node ${lcaFinalResult}.` : `Current node ${currentLcaStep?.node ?? '1'} (${currentLcaStep?.phase ?? 'visit'}).`}`;

  const stepSummary =
    mode === 'graph'
      ? currentGraphStep?.explanation ?? 'Enter a valid graph to begin.'
      : currentLcaStep?.detail ?? 'Pick two tree nodes to trace.';

  return (
    <>
      {!compact && (
        <>
          <VisualizationHeader
            eyebrow="Live playground"
            title="How a computer searches a network or tree one step at a time"
            description={
              <span style={{ fontSize: 15 }}>
                When roads or ideas connect in loops and branches, taking the oldest waiting node (BFS queue) finds the fewest hops first, while taking the newest one (DFS stack) dives down one trail before backing up.
              </span>
            }
          />

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'end', marginBottom: 8 }}>
            <PillSelect<TraversalMode>
              label="What to explore (data shape)"
              value={mode}
              onChange={changeMode}
              options={[
                { value: 'graph', label: 'Graph: BFS vs DFS' },
                { value: 'tree', label: 'Tree: Find the LCA' },
              ]}
            />
            {mode === 'graph' && (
              <PillSelect<GraphAlgo>
                label="Pick-next rule (how it explores)"
                value={algo}
                onChange={changeAlgo}
                options={[
                  { value: 'bfs', label: 'BFS (queue: nearest first)' },
                  { value: 'dfs', label: 'DFS (stack: deepest first)' },
                ]}
              />
            )}
          </div>

          {mode === 'graph' ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 8 }}>
              <label style={{ display: 'block', minWidth: 0, fontSize: 15 }}>
                <span style={{ display: 'block', marginBottom: 4, fontWeight: 700, color: t.textPrimary }}>
                  Graph connections (NODE: neighbor, neighbor)
                </span>
                <textarea
                  aria-label="Graph connections"
                  rows={4}
                  value={graphText}
                  onChange={(e) => {
                    setGraphText(e.target.value);
                    resetTrace();
                  }}
                  style={{ ...inputStyle, minHeight: 96, resize: 'vertical', lineHeight: 1.4 }}
                />
              </label>

              <div style={{ display: 'grid', gap: 8, alignContent: 'start' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <label style={{ minWidth: 0, fontSize: 15 }}>
                    <span style={{ display: 'block', marginBottom: 4, fontWeight: 700, color: t.textPrimary }}>
                      Start node
                    </span>
                    <select
                      aria-label="Start node"
                      value={validStart}
                      onChange={(e) => {
                        setStart(e.target.value);
                        resetTrace();
                      }}
                      style={inputStyle}
                    >
                      {order.map((id) => (
                        <option key={id} value={id}>
                          {id}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label style={{ minWidth: 0, fontSize: 15 }}>
                    <span style={{ display: 'block', marginBottom: 4, fontWeight: 700, color: t.textPrimary }}>
                      Goal node
                    </span>
                    <select
                      aria-label="Goal node"
                      value={validTarget}
                      onChange={(e) => {
                        setTarget(e.target.value);
                        resetTrace();
                      }}
                      style={inputStyle}
                    >
                      {order.map((id) => (
                        <option key={id} value={id}>
                          {id}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }} role="group" aria-label="Graph presets">
                  {GRAPH_PRESETS.map((preset) => (
                    <VizButton key={preset.id} variant="secondary" onClick={() => applyPreset(preset.id)}>
                      {preset.label}
                    </VizButton>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'end', marginBottom: 8 }}>
              <label style={{ minWidth: 110, fontSize: 15 }}>
                <span style={{ display: 'block', marginBottom: 4, fontWeight: 700, color: t.textPrimary }}>
                  Target node p
                </span>
                <select
                  aria-label="Target node p"
                  value={pId}
                  onChange={(e) => {
                    setPId(e.target.value);
                    resetTrace();
                  }}
                  style={inputStyle}
                >
                  {TREE_NODE_IDS.map((id) => (
                    <option key={id} value={id} disabled={id === qId}>
                      Node {id}
                    </option>
                  ))}
                </select>
              </label>

              <label style={{ minWidth: 110, fontSize: 15 }}>
                <span style={{ display: 'block', marginBottom: 4, fontWeight: 700, color: t.textPrimary }}>
                  Target node q
                </span>
                <select
                  aria-label="Target node q"
                  value={qId}
                  onChange={(e) => {
                    setQId(e.target.value);
                    resetTrace();
                  }}
                  style={inputStyle}
                >
                  {TREE_NODE_IDS.map((id) => (
                    <option key={id} value={id} disabled={id === pId}>
                      Node {id}
                    </option>
                  ))}
                </select>
              </label>

              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }} role="group" aria-label="Tree pair presets">
                {TREE_PAIR_PRESETS.map((pair) => (
                  <VizButton
                    key={pair.label}
                    variant="secondary"
                    onClick={() => {
                      setPId(pair.p);
                      setQId(pair.q);
                      resetTrace();
                    }}
                  >
                    {pair.label}
                  </VizButton>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* HTML colour legend */}
      <div
        style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px', fontSize: 15, marginBottom: 4 }}
        aria-label="Traversal colour legend"
      >
        {mode === 'graph' ? (
          <>
            <span style={{ color: currentColor }}>● Current node / goal path</span>
            <span style={{ color: visitedColor }}>● Already visited</span>
            <span style={{ color: frontierColor }}>● Waiting in {algo === 'bfs' ? 'queue Q' : 'stack S'}</span>
            <span style={{ color: warnColor }}>● Duplicate skipped / unreachable</span>
          </>
        ) : (
          <>
            <span style={{ color: currentColor }}>● Active node / confirmed LCA</span>
            <span style={{ color: visitedColor }}>● Call stack / subtree hit</span>
            <span style={{ color: frontierColor }}>● Target nodes p and q</span>
          </>
        )}
      </div>

      {/* Main SVG */}
      <div ref={hostRef} style={{ width: '100%' }}>
        {!isCompactPhone ? (
          <svg
            width="100%"
            viewBox="0 0 760 350"
            role="img"
            aria-label={
              mode === 'graph'
                ? `${algo.toUpperCase()} traversal starting at ${validStart}: visited ${currentGraphStep?.visitedOrder.join(', ') ?? 'none'}`
                : `Lowest common ancestor trace for nodes ${pId} and ${qId}: LCA is ${lcaFinalResult}`
            }
            style={{ display: 'block', fontFamily: FONT_FAMILY }}
          >
            <defs>
              <clipPath id={clipLeftId}>
                <rect x={4} y={6} width={402} height={338} />
              </clipPath>
              <clipPath id={clipRightId}>
                <rect x={418} y={6} width={338} height={338} />
              </clipPath>
            </defs>
            {mode === 'graph' ? renderGraphNetworkPanel(0, 408) : renderTreePanel(0, 408)}
            <line x1={414} y1={14} x2={414} y2={334} stroke={t.border} strokeDasharray="4 4" strokeWidth={1.2} />
            {mode === 'graph' ? renderGraphTracePanel(418, 342) : renderTreeTracePanel(418, 342)}
          </svg>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            <svg
              width="100%"
              viewBox="0 0 380 340"
              role="img"
              aria-label={mode === 'graph' ? `Graph network from ${validStart}` : `Binary tree with targets ${pId} and ${qId}`}
              style={{ display: 'block', fontFamily: FONT_FAMILY }}
            >
              <defs>
                <clipPath id={clipLeftId}>
                  <rect x={4} y={6} width={372} height={328} />
                </clipPath>
              </defs>
              {mode === 'graph' ? renderGraphNetworkPanel(0, 380) : renderTreePanel(0, 380)}
            </svg>
            <svg
              width="100%"
              viewBox="0 0 380 330"
              role="img"
              aria-label={mode === 'graph' ? `${algo.toUpperCase()} frontier and visited list` : `LCA recursion call stack`}
              style={{ display: 'block', fontFamily: FONT_FAMILY }}
            >
              <defs>
                <clipPath id={clipRightId}>
                  <rect x={4} y={6} width={372} height={318} />
                </clipPath>
              </defs>
              {mode === 'graph' ? renderGraphTracePanel(0, 380) : renderTreeTracePanel(0, 380)}
            </svg>
          </div>
        )}
      </div>

      {/* Sticky notes */}
      {compact ? (
        <StickyRow>
          <StickyNote
            title={mode === 'graph' ? (algo === 'bfs' ? 'BFS · Queue' : 'DFS · Stack') : 'Lowest common ancestor'}
            latex={
              mode === 'graph'
                ? algo === 'bfs'
                  ? String.raw`Q.\text{pop\_front}() \;\Rightarrow\; d(v) = d(u)+1`
                  : String.raw`S.\text{pop\_top}() \;\Rightarrow\; \text{skip if visited}`
                : String.raw`\operatorname{lca}(u) = u \;\text{if } L \neq \varnothing \land R \neq \varnothing`
            }
            color="yellow"
            tilt={-1}
          >
            <p style={{ fontVariantNumeric: 'tabular-nums' }}>{workedText}</p>
          </StickyNote>
          <StickyNote title={`Step ${safeStepIdx + 1} of ${Math.max(1, totalSteps)}`} color="blue" tilt={1} live>
            <p>{stepSummary}</p>
          </StickyNote>
        </StickyRow>
      ) : (
        <>
          <StickyRow>
            {mode === 'graph' ? (
              <>
                <StickyNote
                  title="BFS · Queue (nearest first)"
                  latex={String.raw`Q.\text{pop\_front}() \;\Rightarrow\; d(v) = d(u) + 1`}
                  color="yellow"
                  tilt={-1}
                  active={algo === 'bfs'}
                  onSelect={() => changeAlgo('bfs')}
                >
                  <p>Marks neighbors visited when pushed to Q, so Q has no duplicates and finds fewest hops d.</p>
                </StickyNote>
                <StickyNote
                  title="DFS · Stack (deepest first)"
                  latex={String.raw`S.\text{pop\_top}() \;\Rightarrow\; \text{skip if visited}`}
                  color="pink"
                  tilt={1}
                  active={algo === 'dfs'}
                  onSelect={() => changeAlgo('dfs')}
                >
                  <p>Dives down one trail first. Checks visited on pop, so S can hold duplicate copies.</p>
                </StickyNote>
              </>
            ) : (
              <>
                <StickyNote
                  title="Base case (hit p or q)"
                  latex={String.raw`\operatorname{lca}(u) = u \quad\text{if } u \in \{p, q\}`}
                  color="yellow"
                  tilt={-1}
                >
                  <p>Stops searching below u and returns u upward, so a node counts as its own ancestor.</p>
                </StickyNote>
                <StickyNote
                  title="Combine left and right"
                  latex={String.raw`\operatorname{lca}(u) = \begin{cases} u & \text{if } L \neq \varnothing \land R \neq \varnothing \\ L \text{ or } R & \text{otherwise} \end{cases}`}
                  color="pink"
                  tilt={1}
                >
                  <p>If both children report a target, u is where their paths meet (the LCA).</p>
                </StickyNote>
              </>
            )}
          </StickyRow>

          <StickyRow>
            <StickyNote title="Worked numbers" color="green" tilt={-1}>
              <p style={{ fontVariantNumeric: 'tabular-nums' }}>{workedText}</p>
            </StickyNote>
            <StickyNote
              title={`What just happened · step ${safeStepIdx + 1} of ${Math.max(1, totalSteps)}`}
              color="blue"
              tilt={1}
              live
            >
              <p>{stepSummary}</p>
            </StickyNote>
          </StickyRow>

          {/* Playback transport */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
            <VizButton onClick={playback.toggle}>{playback.playing ? 'Pause' : 'Play'}</VizButton>
            <VizButton variant="secondary" onClick={playback.next}>
              Step →
            </VizButton>
            <VizButton variant="secondary" onClick={playback.reset}>
              Reset
            </VizButton>
          </div>

          {/* Predict-then-run challenge */}
          <div
            style={{
              marginTop: 10,
              paddingTop: 8,
              borderTop: `1px dashed ${t.border}`,
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: '6px 10px',
              fontSize: 15,
            }}
          >
            <strong style={{ color: t.accentWarn }}>Predict first:</strong>
            <span>
              {mode === 'graph'
                ? 'On the default diamond starting at A, how does DFS reach C when exploring B first?'
                : 'If p = 6 and q = 7 (an ancestor and its child), does the search ever visit node 7?'}
            </span>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {(mode === 'graph' ? GRAPH_PREDICT_OPTIONS : TREE_PREDICT_OPTIONS).map((opt, idx) => {
                const picked = prediction === idx;
                const correct = idx === 0;
                const revealed = prediction !== null;
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setPrediction(idx)}
                    style={{
                      padding: '5px 10px',
                      borderRadius: RADIUS.sm,
                      border: `1px solid ${
                        revealed && correct ? currentColor : revealed && picked ? warnColor : t.border
                      }`,
                      background:
                        revealed && correct ? currentColor : revealed && picked ? warnColor : 'transparent',
                      color: revealed && (correct || picked) ? t.background : t.textPrimary,
                      fontFamily: FONT_FAMILY,
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
              <span role="status" style={{ color: prediction === 0 ? currentColor : frontierColor, fontSize: 15 }}>
                {prediction === 0 ? 'Right — ' : 'Watch — '}
                {mode === 'graph'
                  ? 'DFS dives A → B → D → C (3 hops) and leaves the older C sitting in stack S as a duplicate until the end.'
                  : 'Node 6 matches p immediately and returns itself upward without ever stepping into node 7.'}{' '}
                <button
                  type="button"
                  onClick={() => {
                    if (mode === 'graph') {
                      const dfsSteps = computeDfsSteps(parseGraph(DEFAULT_GRAPH_TEXT, 10).adj, 'A');
                      const hitIdx = dfsSteps.findIndex((s) => s.current === 'C' && s.action === 'visit');
                      setGraphText(DEFAULT_GRAPH_TEXT);
                      setAlgo('dfs');
                      setStart('A');
                      setTarget('C');
                      playback.setStep(hitIdx >= 0 ? hitIdx : 3);
                    } else {
                      const { steps: pairSteps } = buildLcaSteps('6', '7');
                      const matchIdx = pairSteps.findIndex((s) => s.node === '6' && s.phase === 'match');
                      setPId('6');
                      setQId('7');
                      playback.setStep(matchIdx >= 0 ? matchIdx : 8);
                    }
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    color: visitedColor,
                    textDecoration: 'underline',
                    fontFamily: FONT_FAMILY,
                    fontSize: 15,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {mode === 'graph' ? 'Run DFS to C now' : 'Run p = 6, q = 7 now'}
                </button>
              </span>
            )}
          </div>
        </>
      )}
    </>
  );
}

export default function GraphTreeTraversalExplorer({ compact = false }: { compact?: boolean } = {}) {
  const outerVisible = useVizVisible();
  return (
    <VisualizationContainer
      title="Graph and tree traversal playground"
      footer={
        compact
          ? undefined
          : 'Every queue, stack, hop count, and recursive call frame is computed live from your inputs. Edit the connections or click any node to test a different starting point.'
      }
    >
      <GraphTreeTraversalPlayground compact={compact} outerVisible={outerVisible} />
    </VisualizationContainer>
  );
}
