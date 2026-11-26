import { useEffect, useId, useMemo, useState } from 'react';
import { FONT_FAMILY, RADIUS, useVizTokens } from '../../theme/vizTokens';
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
import { SketchArrow, SketchRect } from '../../components/notebook/RoughShape';
import {
  simulateAgentControlFlow,
  type ControlNodeId,
} from '../lib/agentControlFlow';
import { PredictChallenge } from './playgroundPrimitives';
import { useResponsiveHostWidth, useStepPlayback } from './useStepPlayback';

type FlowFormulaTab = 'confidence' | 'branch';

const FORMULA_LATEX: Record<FlowFormulaTab, string> = {
  confidence: String.raw`c_k = 1 - r^k`,
  branch: String.raw`\text{Check}(c_k) = \begin{cases}\text{Exit}, & c_k \ge \tau \text{ or } k \ge M \\ \text{Act}, & \text{otherwise}\end{cases}`,
};

const PREDICT_OPTIONS = [
  '3 attempts (c₁ = 0.450, c₂ = 0.698, then c₃ = 0.834 ≥ 0.75)',
  '2 attempts (c₂ = 0.698 already clears 0.75)',
  '1 attempt (Plan skips the Check loop)',
] as const;

const NODE_POS: Record<ControlNodeId, { x: number; y: number; w: number; h: number; label: string }> = {
  START: { x: 14, y: 58, w: 66, h: 40, label: 'Start' },
  PLAN: { x: 96, y: 58, w: 72, h: 40, label: 'Plan' },
  ACT: { x: 186, y: 58, w: 94, h: 40, label: 'Act (tool)' },
  CHECK: { x: 300, y: 58, w: 96, h: 40, label: 'Check' },
  HUMAN: { x: 170, y: 196, w: 118, h: 40, label: 'Human review' },
  END: { x: 306, y: 196, w: 90, h: 40, label: 'End' },
};

function AgentControlFlowPlayground({
  compact = false,
  outerVisible = true,
}: {
  compact?: boolean;
  outerVisible?: boolean;
}) {
  const t = useVizTokens();
  const clipGraphId = useId();
  const clipChartId = useId();
  const { hostRef, isCompactPhone } = useResponsiveHostWidth(760);

  const [goal, setGoal] = useState('Verify duplicate invoice 482 and refund');
  const [threshold, setThreshold] = useState(0.75);
  const [decayFactor, setDecayFactor] = useState(0.55);
  const [maxAttempts, setMaxAttempts] = useState(4);
  const [requireApproval, setRequireApproval] = useState<'yes' | 'no'>('yes');
  const [activeFormula, setActiveFormula] = useState<FlowFormulaTab>('confidence');
  const [prediction, setPrediction] = useState<number | null>(null);
  const [pendingStep, setPendingStep] = useState<number | null>(null);

  const sim = useMemo(
    () =>
      simulateAgentControlFlow({
        goal,
        threshold,
        decayFactor,
        maxAttempts,
        requireApproval: requireApproval === 'yes',
      }),
    [goal, threshold, decayFactor, maxAttempts, requireApproval],
  );

  const playback = useStepPlayback(
    sim.steps.length,
    1300,
    Math.max(0, sim.steps.length - 1),
    outerVisible,
  );
  useEffect(() => {
    if (pendingStep === null) return;
    playback.setStep(pendingStep);
    setPendingStep(null);
  }, [pendingStep, sim.steps.length, playback]);
  const current = sim.steps[playback.step] ?? sim.steps[sim.steps.length - 1];

  const activeColor = t.accentPurple;
  const actColor = t.accentTeal;
  const loopColor = t.accentWarn;
  const doneColor = t.accentPrimary;
  const stopColor = t.accentDanger;

  const traversedEdges = new Set<string>();
  const visitedNodes = new Set<ControlNodeId>();
  for (let i = 0; i <= playback.step; i++) {
    const st = sim.steps[i];
    if (!st) continue;
    visitedNodes.add(st.node);
    if (st.fromNode) traversedEdges.add(`${st.fromNode}->${st.node}`);
  }

  const renderGraphPanel = (offsetX: number, panelW: number) => {
    const plotX = offsetX + 10;
    const plotY = 34;
    const plotW = panelW - 20;
    const plotH = 248;
    const scaleX = plotW / 412;
    const sx = (lx: number) => plotX + lx * scaleX;
    const sw = (lw: number) => lw * scaleX;
    const sy = (ly: number) => plotY + ly;

    const edges: { from: ControlNodeId; to: ControlNodeId; pts: [number, number][]; col: string; label?: string; lx?: number; ly?: number }[] = [
      {
        from: 'START',
        to: 'PLAN',
        pts: [[sx(NODE_POS.START.x + NODE_POS.START.w), sy(78)], [sx(NODE_POS.PLAN.x), sy(78)]],
        col: activeColor,
      },
      {
        from: 'PLAN',
        to: 'ACT',
        pts: [[sx(NODE_POS.PLAN.x + NODE_POS.PLAN.w), sy(78)], [sx(NODE_POS.ACT.x), sy(78)]],
        col: actColor,
      },
      {
        from: 'ACT',
        to: 'CHECK',
        pts: [[sx(NODE_POS.ACT.x + NODE_POS.ACT.w), sy(78)], [sx(NODE_POS.CHECK.x), sy(78)]],
        col: actColor,
      },
      {
        from: 'CHECK',
        to: 'ACT',
        pts: [
          [sx(334), sy(98)],
          [sx(334), sy(142)],
          [sx(233), sy(142)],
          [sx(233), sy(98)],
        ],
        col: loopColor,
        label: 'c < τ (loop)',
        lx: sx(284),
        ly: sy(158),
      },
      {
        from: 'CHECK',
        to: 'HUMAN',
        pts: [
          [sx(314), sy(98)],
          [sx(229), sy(196)],
        ],
        col: doneColor,
        label: 'c ≥ τ',
        lx: sx(248),
        ly: sy(182),
      },
      {
        from: 'CHECK',
        to: 'END',
        pts: [
          [sx(368), sy(98)],
          [sx(368), sy(196)],
        ],
        col: current.budgetCapped || sim.cappedOut ? stopColor : doneColor,
        label: sim.cappedOut ? 'k = M cap' : 'direct',
        lx: sx(362),
        ly: sy(150),
      },
      {
        from: 'HUMAN',
        to: 'END',
        pts: [[sx(NODE_POS.HUMAN.x + NODE_POS.HUMAN.w), sy(216)], [sx(NODE_POS.END.x), sy(216)]],
        col: doneColor,
      },
    ];

    return (
      <g>
        <text x={offsetX + panelW / 2} y={20} textAnchor="middle" fontSize={15} fontWeight={700} fill={t.textPrimary}>
          1. Explicit state graph (nodes, loops, guards)
        </text>
        <defs>
          <clipPath id={`${clipGraphId}-${offsetX}`}>
            <rect x={plotX} y={plotY} width={plotW} height={plotH} />
          </clipPath>
        </defs>
        <rect x={plotX} y={plotY} width={plotW} height={plotH} fill={t.background} stroke={t.border} strokeWidth={1} rx={4} />

        <g clipPath={`url(#${clipGraphId}-${offsetX})`}>
          <text x={plotX + 12} y={plotY + 22} fontSize={14} fill={t.textSecondary}>
            Shared state: attempts k = {current.attempts}/{sim.config.maxAttempts}, c = {current.confidence.toFixed(3)}
          </text>

          {edges.map((e) => {
            const key = `${e.from}->${e.to}`;
            const on = traversedEdges.has(key);
            return (
              <g key={key} opacity={on ? 1 : 0.38}>
                <SketchArrow points={e.pts} color={on ? e.col : t.border} strokeWidth={on ? 2.4 : 1.4} roughness={0.8} id={`acfg-${offsetX}-${key}`} />
                {e.label && e.lx !== undefined && e.ly !== undefined && (
                  <text
                    x={e.lx}
                    y={e.ly}
                    textAnchor={e.from === 'CHECK' && e.to === 'END' ? 'end' : 'middle'}
                    fontSize={14}
                    fontWeight={on ? 700 : 400}
                    fill={on ? e.col : t.textMuted}
                    stroke={t.background}
                    strokeWidth={3}
                    paintOrder="stroke"
                  >
                    {e.label}
                  </text>
                )}
              </g>
            );
          })}

          {(Object.keys(NODE_POS) as ControlNodeId[]).map((id) => {
            const n = NODE_POS[id];
            const nx = sx(n.x);
            const nw = sw(n.w);
            const ny = sy(n.y);
            const isCurr = current.node === id;
            const isVis = visitedNodes.has(id);
            const nodeCol =
              id === 'ACT'
                ? actColor
                : id === 'CHECK'
                  ? loopColor
                  : id === 'HUMAN' || id === 'END'
                    ? (id === 'END' && sim.cappedOut && current.node === 'END' ? stopColor : doneColor)
                    : activeColor;
            return (
              <g key={id} opacity={id === 'HUMAN' && requireApproval === 'no' ? 0.35 : 1}>
                <rect
                  x={nx}
                  y={ny}
                  width={nw}
                  height={n.h}
                  rx={6}
                  fill={isCurr ? `${nodeCol}26` : isVis ? t.surfaceAlt : t.surface}
                />
                <SketchRect
                  x={nx}
                  y={ny}
                  width={nw}
                  height={n.h}
                  color={isCurr ? nodeCol : isVis ? nodeCol : t.border}
                  strokeWidth={isCurr ? 2.6 : 1.3}
                  roughness={0.9}
                  id={`acfg-node-${offsetX}-${id}`}
                />
                <text
                  x={nx + nw / 2}
                  y={ny + 25}
                  textAnchor="middle"
                  fontSize={14}
                  fontWeight={isCurr ? 700 : 500}
                  fill={isCurr ? nodeCol : t.textPrimary}
                >
                  {n.label}
                </text>
              </g>
            );
          })}
        </g>
      </g>
    );
  };

  const renderChartPanel = (offsetX: number, panelW: number) => {
    const plotX = offsetX + 10;
    const plotY = 34;
    const plotW = panelW - 20;
    const plotH = 248;
    const padL = 46;
    const padR = 16;
    const padT = 22;
    const padB = 40;
    const innerW = plotW - padL - padR;
    const innerH = plotH - padT - padB;

    const maxK = Math.max(1, sim.config.maxAttempts);
    const mapX = (kVal: number) => plotX + padL + (kVal / maxK) * innerW;
    const mapY = (cVal: number) => plotY + padT + innerH - Math.max(0, Math.min(1, cVal)) * innerH;
    const tauY = mapY(sim.config.threshold);

    return (
      <g>
        <text x={offsetX + panelW / 2} y={20} textAnchor="middle" fontSize={15} fontWeight={700} fill={t.textPrimary}>
          2. Confidence cₖ vs threshold τ
        </text>
        <defs>
          <clipPath id={`${clipChartId}-${offsetX}`}>
            <rect x={plotX} y={plotY} width={plotW} height={plotH} />
          </clipPath>
        </defs>
        <rect x={plotX} y={plotY} width={plotW} height={plotH} fill={t.background} stroke={t.border} strokeWidth={1} rx={4} />

        <g clipPath={`url(#${clipChartId}-${offsetX})`}>
          <line x1={plotX + padL} y1={plotY + padT} x2={plotX + padL} y2={plotY + padT + innerH} stroke={t.border} strokeWidth={1.3} />
          <line x1={plotX + padL} y1={plotY + padT + innerH} x2={plotX + padL + innerW} y2={plotY + padT + innerH} stroke={t.border} strokeWidth={1.3} />

          <text x={plotX + padL - 6} y={plotY + padT + 10} textAnchor="end" fontSize={14} fill={t.textMuted}>1.0</text>
          <text x={plotX + padL - 6} y={plotY + padT + innerH + 4} textAnchor="end" fontSize={14} fill={t.textMuted}>0.0</text>

          {/* Threshold line */}
          <line x1={plotX + padL} y1={tauY} x2={plotX + padL + innerW} y2={tauY} stroke={loopColor} strokeWidth={1.8} strokeDasharray="5 4" />
          <text x={plotX + padL + innerW - 2} y={tauY - 6} textAnchor="end" fontSize={14} fontWeight={700} fill={loopColor}>
            τ = {sim.config.threshold.toFixed(2)}
          </text>

          {sim.attemptCurve.map((pt) => (
            <text
              key={`k-${pt.attempt}`}
              x={mapX(pt.attempt)}
              y={plotY + padT + innerH + 18}
              textAnchor="middle"
              fontSize={14}
              fill={pt.attempt === current.attempts ? activeColor : t.textMuted}
              fontWeight={pt.attempt === current.attempts ? 700 : 400}
            >
              {pt.attempt}
            </text>
          ))}
          <text x={plotX + padL + innerW / 2} y={plotY + plotH - 5} textAnchor="middle" fontSize={14} fill={t.textSecondary}>
            Act attempts k (cap M = {sim.config.maxAttempts})
          </text>

          <polyline
            points={sim.attemptCurve.map((pt) => `${mapX(pt.attempt)},${mapY(pt.confidence)}`).join(' ')}
            fill="none"
            stroke={actColor}
            strokeWidth={2.5}
            strokeLinejoin="round"
          />
          {sim.attemptCurve.map((pt) => {
            const reached = pt.attempt <= current.attempts;
            const isNow = pt.attempt === current.attempts;
            return (
              <circle
                key={`dot-${pt.attempt}`}
                cx={mapX(pt.attempt)}
                cy={mapY(pt.confidence)}
                r={isNow ? 7 : 4.5}
                fill={isNow ? (pt.confidence >= sim.config.threshold ? doneColor : activeColor) : reached ? actColor : t.border}
                stroke={t.background}
                strokeWidth={1.5}
              />
            );
          })}
          <text
            x={current.attempts >= maxK ? mapX(current.attempts) - 10 : mapX(current.attempts) + 10}
            y={Math.max(plotY + padT + 16, mapY(current.confidence) + 16)}
            textAnchor={current.attempts >= maxK ? 'end' : 'start'}
            fontSize={14}
            fontWeight={700}
            fill={activeColor}
            stroke={t.background}
            strokeWidth={4}
            paintOrder="stroke"
          >
            c = {current.confidence.toFixed(3)}
          </text>
        </g>
      </g>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {!compact && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
            <div style={{ flex: '1 1 280px', minWidth: 0, marginBottom: -8 }}>
              <VisualizationHeader
                eyebrow="Live playground"
                title="A control-flow graph turns implicit agent loops into explicit edges"
                description="This solves runaway or opaque agent loops: every tool retry, confidence check, max-attempt guard, and human checkpoint is an inspectable node and edge."
              />
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', paddingTop: 2 }}>
              <VizButton onClick={playback.toggle}>{playback.playing ? 'Pause' : 'Play'}</VizButton>
              <VizButton variant="secondary" onClick={playback.next}>Step →</VizButton>
              <VizButton variant="secondary" onClick={playback.reset}>Reset</VizButton>
            </div>
          </div>

          <label style={{ display: 'block', minWidth: 0, fontSize: 15 }}>
            <span style={{ display: 'block', fontWeight: 700, marginBottom: 4 }}>Task in shared state (goal)</span>
            <input
              aria-label="Agent task goal"
              value={goal}
              maxLength={80}
              onChange={(e) => {
                setGoal(e.target.value);
                playback.playFromStart();
              }}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                minHeight: 34,
                padding: '4px 8px',
                border: `1.5px solid ${t.border}`,
                borderRadius: RADIUS.sm,
                background: t.background,
                color: t.textPrimary,
                fontFamily: FONT_FAMILY,
                fontSize: 15,
              }}
            />
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 155px), 1fr))', gap: 10, alignItems: 'end' }}>
            <div>
              <Slider
                label="Confidence threshold"
                value={threshold}
                onChange={(v) => {
                  setThreshold(v);
                  setPrediction(null);
                  playback.playFromStart();
                }}
                min={0.5}
                max={0.95}
                step={0.01}
                format={(v) => v.toFixed(2)}
              />
            </div>
            <div>
              <Slider
                label="Uncertainty left r (per Act)"
                value={decayFactor}
                onChange={(v) => {
                  setDecayFactor(v);
                  setPrediction(null);
                  playback.playFromStart();
                }}
                min={0.3}
                max={0.85}
                step={0.05}
                format={(v) => v.toFixed(2)}
              />
            </div>
            <label style={{ display: 'block', minWidth: 0, fontSize: 15 }}>
              <span style={{ display: 'block', fontWeight: 700, marginBottom: 4 }}>Max attempts guard M</span>
              <input
                aria-label="Max attempts guard"
                type="number"
                min={1}
                max={6}
                step={1}
                value={maxAttempts}
                onChange={(e) => {
                  const v = Math.max(1, Math.min(6, Math.round(Number(e.target.value) || 1)));
                  setMaxAttempts(v);
                  setPrediction(null);
                  playback.playFromStart();
                }}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  minHeight: 34,
                  padding: '4px 8px',
                  border: `1.5px solid ${t.border}`,
                  borderRadius: RADIUS.sm,
                  background: t.background,
                  color: t.textPrimary,
                  fontFamily: FONT_FAMILY,
                  fontSize: 15,
                  fontVariantNumeric: 'tabular-nums',
                }}
              />
            </label>
            <PillSelect<'yes' | 'no'>
              label="Human approval required"
              value={requireApproval}
              onChange={(v) => {
                setRequireApproval(typeof v === 'function' ? v(requireApproval) : v);
                playback.playFromStart();
              }}
              options={[
                { value: 'yes', label: 'Required' },
                { value: 'no', label: 'Not required' },
              ]}
            />
          </div>
        </>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px 16px', fontSize: 15 }} aria-label="Control flow colours">
        <span><span style={{ display: 'inline-block', width: 12, height: 12, background: activeColor, verticalAlign: 'middle', marginRight: 6 }} />Active state / Plan</span>
        <span><span style={{ display: 'inline-block', width: 12, height: 12, background: actColor, verticalAlign: 'middle', marginRight: 6 }} />Act (tool execution)</span>
        <span><span style={{ display: 'inline-block', width: 12, height: 12, background: loopColor, verticalAlign: 'middle', marginRight: 6 }} />Check / Retry loop</span>
        <span><span style={{ display: 'inline-block', width: 12, height: 12, background: doneColor, verticalAlign: 'middle', marginRight: 6 }} />Human gate / Done</span>
        <span><span style={{ display: 'inline-block', width: 12, height: 12, background: stopColor, verticalAlign: 'middle', marginRight: 6 }} />Max-attempt cap exit</span>
      </div>

      <div ref={hostRef} style={{ width: '100%' }}>
        {!isCompactPhone ? (
          <svg
            width="100%"
            viewBox="0 0 760 296"
            role="img"
            aria-label={`Agent control-flow graph at ${current.node}, ${current.attempts} Act attempts, confidence ${current.confidence.toFixed(3)}`}
            style={{ display: 'block', fontFamily: FONT_FAMILY }}
          >
            {renderGraphPanel(0, 432)}
            {renderChartPanel(440, 320)}
          </svg>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            <svg width="100%" viewBox="0 0 370 296" role="img" aria-label="Agent control-flow graph" style={{ display: 'block', fontFamily: FONT_FAMILY }}>
              {renderGraphPanel(0, 370)}
            </svg>
            <svg width="100%" viewBox="0 0 370 296" role="img" aria-label="Confidence versus threshold" style={{ display: 'block', fontFamily: FONT_FAMILY }}>
              {renderChartPanel(0, 370)}
            </svg>
          </div>
        )}
      </div>

      {compact ? (
        <StickyRow>
          <StickyNote title="Confidence per Act" latex={FORMULA_LATEX.confidence} color="yellow" tilt={-1}>
            <p className="nm-sticky__mono" style={{ textAlign: 'center' }}>
              c({current.attempts}) = 1 − {sim.config.decayFactor.toFixed(2)}<sup>{current.attempts}</sup> = <strong>{current.confidence.toFixed(3)}</strong> (τ = {sim.config.threshold.toFixed(2)})
            </p>
          </StickyNote>
          <StickyNote title={`Step ${playback.step + 1} of ${sim.steps.length}`} color="blue" tilt={1} live>
            <p>{current.branchReason}</p>
          </StickyNote>
        </StickyRow>
      ) : (
        <>
          <StickyRow>
            <StickyNote
              title="1. Evidence confidence"
              latex={FORMULA_LATEX.confidence}
              color="yellow"
              tilt={-1}
              active={activeFormula === 'confidence'}
              onSelect={() => setActiveFormula('confidence')}
            >
              <p style={{ textAlign: 'center' }}>k = Act attempts taken, r = remaining uncertainty per tool call.</p>
            </StickyNote>
            <StickyNote
              title="2. Check edge guard"
              latex={FORMULA_LATEX.branch}
              color="pink"
              tilt={1}
              active={activeFormula === 'branch'}
              onSelect={() => setActiveFormula('branch')}
            >
              <p style={{ textAlign: 'center' }}>τ = threshold, M = max-attempt cap stopping runaway loops.</p>
            </StickyNote>
          </StickyRow>

          <StickyRow>
            <StickyNote title={`Worked numbers · step ${playback.step + 1}`} color="green" tilt={1}>
              <p className="nm-sticky__mono">
                Now at <strong>{current.node}</strong> · Act attempts = <strong>{current.attempts}</strong> (loops: {sim.loopCount})
              </p>
              <p className="nm-sticky__mono" style={{ marginTop: 4 }}>
                c({current.attempts}) = 1 − {sim.config.decayFactor.toFixed(2)}<sup>{current.attempts}</sup> = <strong>{current.confidence.toFixed(3)}</strong> vs τ = <strong>{sim.config.threshold.toFixed(2)}</strong> · {sim.clearedThreshold ? 'Passes τ' : 'Stops at cap M'}
              </p>
            </StickyNote>
            <StickyNote title={`Step ${playback.step + 1} of ${sim.steps.length} · What just happened`} color="blue" tilt={-1} live>
              <p>{current.branchReason}</p>
            </StickyNote>
          </StickyRow>

          <PredictChallenge
            prompt="With uncertainty decay r = 0.55 and threshold τ = 0.75, how many Act attempts does the graph loop through before Check passes?"
            options={PREDICT_OPTIONS}
            correctIndex={0}
            selected={prediction}
            onSelect={setPrediction}
            explanation="After 1 Act, c₁ = 0.450 < 0.75 (loops back). After 2 Acts, c₂ = 0.698 < 0.75 (loops back). After 3 Acts, c₃ = 0.834 ≥ 0.75 (exits!)."
            actionLabel="Jump to Check after 3 Acts now"
            onAction={() => {
              setThreshold(0.75);
              setDecayFactor(0.55);
              setMaxAttempts(4);
              setRequireApproval('yes');
              setPendingStep(7);
            }}
          />
        </>
      )}
    </div>
  );
}

export default function AgentControlFlowGraphDiagram({ compact = false }: { compact?: boolean } = {}) {
  const outerVisible = useVizVisible();
  return (
    <VisualizationContainer
      title="Agent Control-Flow Graph playground"
      footer="Deterministic LangGraph-style state machine: every transition, retry back-edge, confidence formula c_k = 1 − r^k, and max-attempt guard runs directly from your controls."
    >
      <AgentControlFlowPlayground compact={compact} outerVisible={outerVisible} />
    </VisualizationContainer>
  );
}
