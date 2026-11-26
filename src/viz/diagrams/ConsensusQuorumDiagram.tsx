import { useId, useMemo, useState } from 'react';
import { FONT_FAMILY, RADIUS, useVizTokens } from '../../theme/vizTokens';
import {
  PillSelect,
  Slider,
  StickyNote,
  StickyRow,
  VisualizationContainer,
  VisualizationHeader,
  VizButton,
  useVizVisible,
} from '../primitives';
import {
  analyzeConsensus,
  type QuorumScenario,
} from '../lib/consensusQuorum';
import { NumericField, PredictChallenge } from './playgroundPrimitives';
import { useResponsiveHostWidth, useStepPlayback } from './useStepPlayback';

const PREDICT_OPTIONS = [
  'Still only 1 crash (quorum rises from 2 to 3, so 4 − 3 = 1)',
  '2 crashes (half of 4 servers is 2)',
  '3 crashes (only 1 server needs to stay alive)',
] as const;

function makeCountMask(n: number, unreachableCount: number): boolean[] {
  const capped = Math.max(0, Math.min(n - 1, unreachableCount));
  return Array.from({ length: n }, (_, i) => i >= n - capped);
}

function ConsensusQuorumPlayground({
  compact = false,
  outerVisible = true,
}: {
  compact?: boolean;
  outerVisible?: boolean;
}) {
  const t = useVizTokens();
  const clipClusterId = useId();
  const clipOverlapId = useId();
  const { hostRef, isCompactPhone } = useResponsiveHostWidth(760);

  const [n, setN] = useState(5);
  const [unreachableMask, setUnreachableMask] = useState<boolean[]>(() => makeCountMask(5, 1));
  const [scenario, setScenario] = useState<QuorumScenario>('crash');
  const [proposal, setProposal] = useState('set balance = $250');
  const [prediction, setPrediction] = useState<number | null>(null);

  const analysis = useMemo(
    () => analyzeConsensus({ n, unreachableMask, scenario, proposal }),
    [n, unreachableMask, scenario, proposal],
  );

  // Reduced motion opens at step 4 (index 3) so the final commit/halt decision is immediately visible.
  const playback = useStepPlayback(analysis.steps.length, 1600, 3, outerVisible);
  const activeStep = analysis.steps[playback.step] ?? analysis.steps[3];

  const okColor = t.accentPrimary;
  const errColor = t.accentDanger;
  const q1Color = t.accentSecondary;
  const q2Color = t.accentPurple;
  const threshColor = t.accentWarn;

  const setClusterSize = (nextN: number, nextUnreachable = Math.min(analysis.unreachable, nextN - 1)) => {
    const safeN = Math.max(3, Math.min(9, Math.round(nextN)));
    setN(safeN);
    setUnreachableMask(makeCountMask(safeN, nextUnreachable));
  };

  const setUnreachableCount = (count: number) => {
    setUnreachableMask(makeCountMask(n, count));
  };

  const toggleServer = (index: number) => {
    if (index === 0) return; // S1 is the proposing leader in Group A
    setUnreachableMask((prev) => {
      const next = Array.from({ length: n }, (_, i) => Boolean(prev[i]));
      next[index] = !next[index];
      return next;
    });
  };

  const renderClusterPanel = (offsetX: number, panelW: number) => {
    const plotX = offsetX + 10;
    const plotY = 34;
    const plotW = panelW - 20;
    const plotH = 244;
    const cx = plotX + plotW / 2;
    const cy = plotY + 104;
    const radius = 74;
    const stepNum = playback.step + 1;

    const coords = analysis.nodes.map((node, i) => {
      const angle = -Math.PI / 2 + (i / analysis.n) * Math.PI * 2;
      return {
        node,
        x: cx + radius * Math.cos(angle),
        y: cy + radius * Math.sin(angle),
      };
    });
    const leaderPos = coords[0];

    return (
      <g>
        <text x={offsetX + 8} y={20} fontSize={16} fontWeight={700} fill={t.textPrimary}>
          1. Cluster vote (click S2–S{analysis.n} to toggle)
        </text>
        <defs>
          <clipPath id={`${clipClusterId}-${offsetX}`}>
            <rect x={plotX} y={plotY} width={plotW} height={plotH} />
          </clipPath>
        </defs>
        <rect x={plotX} y={plotY} width={plotW} height={plotH} fill={t.background} stroke={t.border} rx={4} />

        <g clipPath={`url(#${clipClusterId}-${offsetX})`}>
          {/* Message arrows from Leader S1 to followers */}
          {coords.slice(1).map(({ node, x, y }) => {
            if (stepNum < 2) return null;
            const col = node.reachable ? okColor : errColor;
            const midX = (leaderPos.x + x) / 2;
            const midY = (leaderPos.y + y) / 2;
            return (
              <g key={`link-${node.index}`}>
                <line
                  x1={leaderPos.x}
                  y1={leaderPos.y}
                  x2={node.reachable ? x : midX}
                  y2={node.reachable ? y : midY}
                  stroke={col}
                  strokeWidth={2}
                  strokeDasharray={node.reachable ? undefined : '4 3'}
                />
                {!node.reachable && (
                  <text x={midX} y={midY + 5} textAnchor="middle" fontSize={15} fontWeight={700} fill={errColor}>
                    ×
                  </text>
                )}
              </g>
            );
          })}

          {coords.map(({ node, x, y }) => {
            const isLeader = node.role === 'leader';
            const col = node.reachable ? (isLeader ? q1Color : okColor) : errColor;
            const showVote = stepNum >= 3 && node.reachable;
            return (
              <g
                key={node.label}
                onClick={() => toggleServer(node.index)}
                style={{ cursor: isLeader ? 'default' : 'pointer' }}
              >
                <circle
                  cx={x}
                  cy={y}
                  r={21}
                  fill={t.surface}
                  stroke={col}
                  strokeWidth={isLeader ? 2.8 : 2}
                  strokeDasharray={node.reachable ? undefined : '4 3'}
                />
                <text x={x} y={y - 1} textAnchor="middle" fontSize={14} fontWeight={700} fill={col}>
                  {node.label}
                </text>
                <text x={x} y={y + 14} textAnchor="middle" fontSize={14} fill={col}>
                  {isLeader ? 'lead' : !node.reachable ? (scenario === 'partition' ? 'split' : 'down') : showVote ? 'vote' : 'idle'}
                </text>
              </g>
            );
          })}

          <text
            x={cx}
            y={plotY + plotH - 12}
            textAnchor="middle"
            fontSize={14}
            fontWeight={700}
            fill={analysis.committed ? okColor : errColor}
          >
            {analysis.committed
              ? `Quorum ${analysis.reachable}/${analysis.n} ≥ ${analysis.quorum} — COMMITTED`
              : `Only ${analysis.reachable}/${analysis.n} (< ${analysis.quorum}) — HALTED`}
          </text>
        </g>

        <text x={plotX + plotW / 2} y={plotY + plotH + 22} textAnchor="middle" fontSize={14} fill={t.textSecondary}>
          Proposal: “{analysis.proposal.slice(0, 28)}”
        </text>
      </g>
    );
  };

  const renderOverlapPanel = (offsetX: number, panelW: number) => {
    const plotX = offsetX + 10;
    const plotY = 34;
    const plotW = panelW - 20;
    const plotH = 244;
    const barX = plotX + 14;
    const barW = plotW - 28;
    const voteFillW = (analysis.reachable / analysis.n) * barW;
    const threshX = barX + (analysis.quorum / analysis.n) * barW;

    const cellGap = 4;
    const cellW = Math.floor((barW - (analysis.n - 1) * cellGap) / analysis.n);

    return (
      <g>
        <text x={offsetX + 8} y={20} fontSize={16} fontWeight={700} fill={t.textPrimary}>
          2. Majority meter &amp; witness overlap proof
        </text>
        <defs>
          <clipPath id={`${clipOverlapId}-${offsetX}`}>
            <rect x={plotX} y={plotY} width={plotW} height={plotH} />
          </clipPath>
        </defs>
        <rect x={plotX} y={plotY} width={plotW} height={plotH} fill={t.background} stroke={t.border} rx={4} />

        <g clipPath={`url(#${clipOverlapId}-${offsetX})`}>
          {/* Votes vs threshold */}
          <text x={barX} y={plotY + 24} fontSize={14} fontWeight={700} fill={t.textPrimary}>
            Votes gathered: {analysis.reachable} of {analysis.n}
          </text>
          <text x={barX + barW} y={plotY + 24} textAnchor="end" fontSize={14} fontWeight={700} fill={threshColor}>
            Need Q = {analysis.quorum}
          </text>
          <rect x={barX} y={plotY + 34} width={barW} height={22} rx={4} fill={t.surfaceAlt} />
          <rect
            x={barX}
            y={plotY + 34}
            width={Math.max(4, voteFillW)}
            height={22}
            rx={4}
            fill={analysis.committed ? okColor : errColor}
            fillOpacity={0.85}
          />
          <line x1={threshX} y1={plotY + 28} x2={threshX} y2={plotY + 64} stroke={threshColor} strokeWidth={2.5} />

          {/* Two majorities must overlap by 2Q - N >= 1 */}
          <text x={barX} y={plotY + 94} fontSize={14} fontWeight={700} fill={t.textPrimary}>
            Any 2 quorums of size {analysis.quorum} overlap:
          </text>

          {/* Row 1: Q1 from left */}
          <text x={barX} y={plotY + 114} fontSize={14} fill={q1Color}>Quorum 1 ({analysis.quorum})</text>
          {Array.from({ length: analysis.n }, (_, i) => {
            const inQ1 = i < analysis.quorum;
            const inBoth = i >= analysis.n - analysis.quorum && i < analysis.quorum;
            return (
              <rect
                key={`q1-${i}`}
                x={barX + i * (cellW + cellGap)}
                y={plotY + 120}
                width={cellW}
                height={20}
                rx={3}
                fill={inQ1 ? q1Color : t.surfaceAlt}
                fillOpacity={inBoth ? 0.9 : inQ1 ? 0.45 : 0.6}
                stroke={inBoth ? okColor : 'none'}
                strokeWidth={2}
              />
            );
          })}

          {/* Row 2: Q2 from right */}
          <text x={barX} y={plotY + 162} fontSize={14} fill={q2Color}>Quorum 2 ({analysis.quorum})</text>
          {Array.from({ length: analysis.n }, (_, i) => {
            const inQ2 = i >= analysis.n - analysis.quorum;
            const inBoth = i >= analysis.n - analysis.quorum && i < analysis.quorum;
            return (
              <rect
                key={`q2-${i}`}
                x={barX + i * (cellW + cellGap)}
                y={plotY + 168}
                width={cellW}
                height={20}
                rx={3}
                fill={inQ2 ? q2Color : t.surfaceAlt}
                fillOpacity={inBoth ? 0.9 : inQ2 ? 0.45 : 0.6}
                stroke={inBoth ? okColor : 'none'}
                strokeWidth={2}
              />
            );
          })}

          <text x={barX} y={plotY + 214} fontSize={14} fontWeight={700} fill={okColor}>
            Overlap witness = {analysis.minOverlap} server(s) ≥ 1
          </text>
        </g>

        <text x={plotX + plotW / 2} y={plotY + plotH + 22} textAnchor="middle" fontSize={14} fill={t.textSecondary}>
          Max failures tolerated F = {analysis.maxFailures} of {analysis.n}
        </text>
      </g>
    );
  };

  return (
    <>
      {!compact && (
        <>
          <VisualizationHeader
            eyebrow="Live playground"
            title="Why distributed clusters require a majority vote to save data"
            description="To prevent two disconnected halves of a cluster from saving conflicting writes (split-brain), Raft and Paxos only commit when strictly more than half of the servers agree."
          />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 10, marginBottom: 8 }}>
            <PillSelect<QuorumScenario>
              label="Failure scenario (why servers cannot answer)"
              value={scenario}
              onChange={(v) => setScenario(typeof v === 'function' ? v(scenario) : v)}
              options={[
                { value: 'crash', label: 'Crash failures' },
                { value: 'partition', label: 'Network split (Group A vs B)' },
              ]}
            />

            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <VizButton onClick={playback.toggle}>{playback.playing ? 'Pause' : 'Play'}</VizButton>
              <VizButton variant="secondary" onClick={playback.next}>Step →</VizButton>
              <VizButton variant="secondary" onClick={playback.reset}>Reset</VizButton>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 8 }}>
            <Slider
              label={`Unreachable servers (${analysis.unreachable} of ${analysis.n})`}
              value={analysis.unreachable}
              onChange={setUnreachableCount}
              min={0}
              max={analysis.n - 1}
              step={1}
              format={(v) => `${v} down`}
            />
            <Slider
              label="Cluster size N (total servers)"
              value={n}
              onChange={(v) => setClusterSize(v)}
              min={3}
              max={9}
              step={1}
              format={(v) => `${v} servers`}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 10 }}>
            <NumericField
              label="Cluster size N"
              hint="3 to 9 servers"
              value={n}
              min={3}
              max={9}
              onChange={(v) => setClusterSize(v)}
            />
            <NumericField
              label="Unreachable count"
              hint={`0 to ${n - 1} (or click nodes)`}
              value={analysis.unreachable}
              min={0}
              max={n - 1}
              onChange={setUnreachableCount}
            />
            <label style={{ display: 'block', minWidth: 0, fontSize: 15, color: t.textPrimary }}>
              <span style={{ display: 'block', fontWeight: 700 }}>Proposed write</span>
              <span style={{ display: 'block', fontSize: 15, color: t.textSecondary, marginBottom: 4 }}>log entry to commit</span>
              <input
                aria-label="Proposed write"
                type="text"
                maxLength={32}
                value={proposal}
                onChange={(e) => setProposal(e.target.value)}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  minHeight: 34,
                  padding: '4px 8px',
                  font: 'inherit',
                  fontSize: 15,
                  border: `1.5px solid ${t.border}`,
                  borderRadius: RADIUS.sm,
                  background: t.background,
                  color: t.textPrimary,
                }}
              />
            </label>
          </div>
        </>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px', fontSize: 15, marginBottom: 4 }} aria-label="Consensus quorum legend">
        <span style={{ color: okColor }}>● Reachable / witness overlap</span>
        <span style={{ color: errColor }}>● Unreachable / blocked write</span>
        <span style={{ color: threshColor }}>● Majority needed (Q = {analysis.quorum})</span>
        <span style={{ color: q1Color }}>● Quorum 1 / Leader</span>
        <span style={{ color: q2Color }}>● Quorum 2</span>
      </div>

      <div ref={hostRef} style={{ width: '100%' }}>
        {!isCompactPhone ? (
          <svg
            width="100%"
            viewBox="0 0 760 312"
            role="img"
            aria-label={`${analysis.reachable} of ${analysis.n} reachable; quorum needed is ${analysis.quorum}; cluster ${analysis.committed ? 'can commit' : 'cannot commit'}`}
            style={{ display: 'block', fontFamily: FONT_FAMILY }}
          >
            {renderClusterPanel(0, 414)}
            <line x1={422} y1={14} x2={422} y2={296} stroke={t.border} strokeDasharray="4 4" strokeWidth={1.2} />
            {renderOverlapPanel(430, 330)}
          </svg>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            <svg width="100%" viewBox="0 0 380 312" role="img" aria-label="Cluster vote diagram" style={{ display: 'block', fontFamily: FONT_FAMILY }}>
              {renderClusterPanel(0, 380)}
            </svg>
            <svg width="100%" viewBox="0 0 380 312" role="img" aria-label="Majority threshold and quorum overlap proof" style={{ display: 'block', fontFamily: FONT_FAMILY }}>
              {renderOverlapPanel(0, 380)}
            </svg>
          </div>
        )}
      </div>

      {compact ? (
        <StickyRow>
          <StickyNote
            title="Majority quorum rule"
            latex={String.raw`Q = \left\lfloor \frac{N}{2} \right\rfloor + 1, \quad F = N - Q`}
            color="yellow"
            tilt={-1}
          >
            <p className="nm-sticky__mono" style={{ textAlign: 'center' }}>
              N = {analysis.n}, need Q = <strong>{analysis.quorum}</strong>; reachable = <strong>{analysis.reachable}</strong> ({analysis.committed ? 'can commit' : 'halted'})
            </p>
          </StickyNote>
          <StickyNote title={`What just happened · step ${activeStep.step} of 4`} color="blue" tilt={1} live>
            <p>{activeStep.explain}</p>
          </StickyNote>
        </StickyRow>
      ) : (
        <>
          <StickyRow>
            <StickyNote
              title="1. Majority quorum size (Q)"
              latex={String.raw`Q = \left\lfloor \frac{N}{2} \right\rfloor + 1`}
              color="yellow"
              tilt={-1}
              active={scenario === 'crash'}
              onSelect={() => setScenario('crash')}
            >
              <p>Strict majority needed to commit. For N = {analysis.n}, Q = ⌊{analysis.n}/2⌋ + 1 = {analysis.quorum} votes.</p>
            </StickyNote>
            <StickyNote
              title="2. Failures tolerated (F)"
              latex={String.raw`F = N - Q = \left\lfloor \frac{N - 1}{2} \right\rfloor`}
              color="pink"
              tilt={1}
              active={scenario === 'partition'}
              onSelect={() => setScenario('partition')}
            >
              <p>Overlap between any two quorums is 2Q − N = {analysis.minOverlap} ≥ 1 witness, preventing split-brain.</p>
            </StickyNote>
          </StickyRow>

          <StickyRow>
            <StickyNote title={`Worked numbers (N = ${analysis.n} servers)`} color="green" tilt={-1}>
              <p className="nm-sticky__mono">
                Reachable = <strong>{analysis.reachable}/{analysis.n}</strong> · Required Q = <strong>{analysis.quorum}</strong> · Max crashes F = <strong>{analysis.maxFailures}</strong>
              </p>
              <p className="nm-sticky__mono" style={{ marginTop: 4 }}>
                Group A: <strong style={{ color: analysis.committed ? okColor : errColor }}>{analysis.committed ? 'commits' : 'halted'}</strong> · Group B ({analysis.unreachable}):{' '}
                <strong style={{ color: analysis.groupBCanCommit ? okColor : errColor }}>{analysis.groupBCanCommit ? 'holds majority' : 'cannot commit'}</strong>
              </p>
            </StickyNote>
            <StickyNote title={`What just happened · step ${activeStep.step} of 4`} color="blue" tilt={1} live>
              <p>{activeStep.explain}</p>
            </StickyNote>
          </StickyRow>

          <PredictChallenge
            prompt="You add a 4th server to a 3-server cluster (N = 3 → 4). How many crashed servers can the 4-server cluster survive while still committing writes?"
            options={PREDICT_OPTIONS}
            correctIndex={0}
            selected={prediction}
            onSelect={setPrediction}
            explanation="With N = 4, majority quorum jumps from 2 to ⌊4/2⌋ + 1 = 3, so max failures F = 4 − 3 = 1 — no better than 3 servers, which is why production clusters use odd sizes (3, 5, 7)."
            actionLabel="Test N = 4 with 2 crashes now"
            onAction={() => {
              setScenario('crash');
              setClusterSize(4, 2);
              playback.setStep(3);
            }}
          />
        </>
      )}
    </>
  );
}

export default function ConsensusQuorumDiagram({ compact = false }: { compact?: boolean } = {}) {
  const outerVisible = useVizVisible();
  return (
    <VisualizationContainer
      title="Consensus quorum calculator playground"
      footer={
        compact
          ? undefined
          : 'Exact Raft/Paxos majority threshold Q = ⌊N/2⌋ + 1. Click any follower server S2–SN to simulate a crash or partition and verify that two majorities always share at least one witness node.'
      }
    >
      <ConsensusQuorumPlayground compact={compact} outerVisible={outerVisible} />
    </VisualizationContainer>
  );
}
