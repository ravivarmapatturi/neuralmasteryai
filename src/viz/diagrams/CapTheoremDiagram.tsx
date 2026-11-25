import { useId, useMemo, useState } from 'react';
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
import {
  analyzeCapSystem,
  BASE_LOCAL_LATENCY_MS,
  CAP_PRESETS,
  type CapChoice,
} from '../lib/capTheorem';
import { PredictChallenge } from './playgroundPrimitives';
import { useResponsiveHostWidth, useStepPlayback } from './useStepPlayback';

const PREDICT_OPTIONS = [
  'Node B refuses to answer (error) instead of returning old $100',
  'Node B answers $100 right away',
  'Node B still gets the new $250 instantly',
] as const;

type CapFormulaTab = 'cp' | 'ap' | 'pacelc';

const FORMULA_LATEX: Record<CapFormulaTab, string> = {
  cp: String.raw`P \land \text{Consistent} \implies \text{Refuse stale node}`,
  ap: String.raw`P \land \text{Available} \implies \text{Answer with local } v_1`,
  pacelc: String.raw`\neg P \implies \text{Write delay} = L_{\text{local}} + L_{\text{sync}}`,
};

function CapTheoremPlayground({
  compact = false,
  outerVisible = true,
}: {
  compact?: boolean;
  outerVisible?: boolean;
}) {
  const t = useVizTokens();
  const clipClusterId = useId();
  const clipScoreId = useId();
  const { hostRef, isCompactPhone } = useResponsiveHostWidth(760);

  const [choice, setChoice] = useState<CapChoice>('cp');
  const [partitioned, setPartitioned] = useState<boolean>(true);
  const [newWriteValue, setNewWriteValue] = useState<number>(250);
  const [syncLatencyMs, setSyncLatencyMs] = useState<number>(60);
  const [activeFormula, setActiveFormula] = useState<CapFormulaTab>('cp');
  const [prediction, setPrediction] = useState<number | null>(null);

  const analysis = useMemo(
    () => analyzeCapSystem({ choice, partitioned, initialValue: 100, newWriteValue, syncLatencyMs }),
    [choice, partitioned, newWriteValue, syncLatencyMs],
  );

  const playback = useStepPlayback(analysis.trace.length, 2200, 3, outerVisible);
  const activeStep = analysis.trace[playback.step] ?? analysis.trace[3];

  const syncedColor = t.accentPrimary;
  const writerColor = t.accentSecondary;
  const staleColor = t.accentWarn;
  const errorColor = t.accentDanger;
  const syncMsgColor = t.accentPurple;

  const activePresetId =
    CAP_PRESETS.find(
      (p) =>
        p.choice === choice &&
        p.partitioned === partitioned &&
        p.newWriteValue === newWriteValue &&
        p.syncLatencyMs === syncLatencyMs,
    )?.id ?? 'custom';

  const inputStyle: React.CSSProperties = {
    width: '100%',
    boxSizing: 'border-box',
    minHeight: 34,
    padding: '4px 8px',
    font: 'inherit',
    fontSize: 15,
    fontVariantNumeric: 'tabular-nums',
    border: `1.5px solid ${t.border}`,
    borderRadius: RADIUS.sm,
    background: t.background,
    color: t.textPrimary,
  };

  const renderClusterPanel = (offsetX: number, panelW: number) => {
    const plotX = offsetX + 10;
    const plotY = 34;
    const plotW = panelW - 20;
    const plotH = 218;

    const nodeW = 112;
    const nodeH = 74;
    const nodeAX = plotX + 12;
    const nodeBX = plotX + plotW - nodeW - 12;
    const nodeY = plotY + 42;

    const wireX1 = nodeAX + nodeW;
    const wireX2 = nodeBX;
    const wireY = nodeY + nodeH / 2;
    const wireMid = (wireX1 + wireX2) / 2;

    const step = playback.step;
    const showWrite = step >= 1;
    const showProp = step >= 2;
    const showRead = step >= 3;

    const nodeACurVal = showWrite ? analysis.nodeA.value : analysis.initialValue;
    const nodeACurVer = showWrite ? 'v2' : 'v1';

    let nodeBDisplayVal = `$${analysis.initialValue} (v1)`;
    let nodeBColor = syncedColor;
    let nodeBSubtitle = 'in sync';

    if (showProp) {
      if (!analysis.partitioned) {
        nodeBDisplayVal = `$${analysis.nodeB.value} (v2)`;
        nodeBColor = syncedColor;
        nodeBSubtitle = 'synced';
      } else if (showRead && analysis.nodeB.status === 'rejected') {
        nodeBDisplayVal = '503 Refused';
        nodeBColor = errorColor;
        nodeBSubtitle = 'blocks stale read';
      } else if (analysis.choice === 'ap') {
        nodeBDisplayVal = `$${analysis.initialValue} (v1)`;
        nodeBColor = staleColor;
        nodeBSubtitle = showRead ? 'stale answer!' : 'old copy';
      } else {
        nodeBDisplayVal = `$${analysis.initialValue} (v1)`;
        nodeBColor = staleColor;
        nodeBSubtitle = 'no sync yet';
      }
    }

    const packetFrac = step === 1 ? 0.25 : step === 2 ? (analysis.partitioned ? 0.45 : 0.92) : 1;
    const packetX = wireX1 + (wireX2 - wireX1) * packetFrac;

    return (
      <g>
        <text x={offsetX + panelW / 2} y={20} textAnchor="middle" fontSize={15} fontWeight={700} fill={t.textPrimary}>
          1. Two replicas and the network cable between them
        </text>
        <defs>
          <clipPath id={`${clipClusterId}-${offsetX}`}>
            <rect x={plotX} y={plotY} width={plotW} height={plotH} />
          </clipPath>
        </defs>
        <rect x={plotX} y={plotY} width={plotW} height={plotH} fill={t.background} stroke={t.border} strokeWidth={1} rx={4} />

        <g clipPath={`url(#${clipClusterId}-${offsetX})`}>
          {/* Client 1 write arrow into Node A */}
          <text x={nodeAX + nodeW / 2} y={plotY + 20} textAnchor="middle" fontSize={14} fontWeight={700} fill={writerColor}>
            {showWrite ? `Write $${analysis.newWriteValue} →` : 'Initial state (v1)'}
          </text>
          {showWrite && (
            <line x1={nodeAX + nodeW / 2} y1={plotY + 25} x2={nodeAX + nodeW / 2} y2={nodeY - 2} stroke={writerColor} strokeWidth={2} />
          )}

          {/* Sync cable between Node A and Node B */}
          {analysis.partitioned ? (
            <>
              <line x1={wireX1} y1={wireY} x2={wireMid - 12} y2={wireY} stroke={errorColor} strokeWidth={2.2} strokeDasharray="5 4" />
              <line x1={wireMid + 12} y1={wireY} x2={wireX2} y2={wireY} stroke={errorColor} strokeWidth={2.2} strokeDasharray="5 4" />
              <line x1={wireMid - 7} y1={wireY - 8} x2={wireMid + 7} y2={wireY + 8} stroke={errorColor} strokeWidth={2.5} />
              <line x1={wireMid + 7} y1={wireY - 8} x2={wireMid - 7} y2={wireY + 8} stroke={errorColor} strokeWidth={2.5} />
              <text x={wireMid} y={wireY - 16} textAnchor="middle" fontSize={14} fontWeight={700} fill={errorColor}>
                Split!
              </text>
            </>
          ) : (
            <>
              <line x1={wireX1} y1={wireY} x2={wireX2} y2={wireY} stroke={syncMsgColor} strokeWidth={2.4} />
              <text x={wireMid} y={wireY - 14} textAnchor="middle" fontSize={14} fontWeight={700} fill={syncMsgColor}>
                {analysis.syncLatencyMs} ms
              </text>
            </>
          )}

          {/* Sync message dot */}
          {showWrite && !(analysis.partitioned && showRead) && (
            <circle
              cx={analysis.partitioned && step >= 2 ? wireMid - 14 : packetX}
              cy={wireY}
              r={5}
              fill={analysis.partitioned && step >= 2 ? errorColor : syncMsgColor}
              stroke={t.background}
              strokeWidth={1.5}
            />
          )}

          {/* Node A box */}
          <rect x={nodeAX} y={nodeY} width={nodeW} height={nodeH} rx={6} fill={`${writerColor}18`} stroke={writerColor} strokeWidth={2} />
          <text x={nodeAX + nodeW / 2} y={nodeY + 23} textAnchor="middle" fontSize={15} fontWeight={700} fill={writerColor}>
            Node A (writer)
          </text>
          <text x={nodeAX + nodeW / 2} y={nodeY + 46} textAnchor="middle" fontSize={15} fontWeight={700} fill={t.textPrimary}>
            ${nodeACurVal} ({nodeACurVer})
          </text>
          <text x={nodeAX + nodeW / 2} y={nodeY + 65} textAnchor="middle" fontSize={14} fill={t.textSecondary}>
            {showWrite ? 'updated' : 'synced'}
          </text>

          {/* Node B box */}
          <rect x={nodeBX} y={nodeY} width={nodeW} height={nodeH} rx={6} fill={`${nodeBColor}18`} stroke={nodeBColor} strokeWidth={2} />
          <text x={nodeBX + nodeW / 2} y={nodeY + 23} textAnchor="middle" fontSize={15} fontWeight={700} fill={nodeBColor}>
            Node B (replica)
          </text>
          <text x={nodeBX + nodeW / 2} y={nodeY + 46} textAnchor="middle" fontSize={15} fontWeight={700} fill={t.textPrimary}>
            {nodeBDisplayVal}
          </text>
          <text x={nodeBX + nodeW / 2} y={nodeY + 65} textAnchor="middle" fontSize={14} fill={nodeBColor}>
            {nodeBSubtitle}
          </text>

          {/* Client 2 Read probe on Node B */}
          <line
            x1={nodeBX + nodeW / 2}
            y1={nodeY + nodeH + 2}
            x2={nodeBX + nodeW / 2}
            y2={plotY + 156}
            stroke={showRead ? nodeBColor : t.border}
            strokeWidth={2}
            strokeDasharray={showRead ? undefined : '4 3'}
          />
          <rect
            x={plotX + 18}
            y={plotY + 158}
            width={plotW - 36}
            height={44}
            rx={6}
            fill={showRead ? `${nodeBColor}16` : t.surfaceAlt}
            stroke={showRead ? nodeBColor : t.border}
            strokeWidth={1.5}
          />
          <text x={plotX + plotW / 2} y={plotY + 185} textAnchor="middle" fontSize={14} fontWeight={700} fill={showRead ? nodeBColor : t.textSecondary}>
            {!showRead
              ? 'Next: Client 2 reads from Node B'
              : analysis.nodeB.status === 'rejected'
                ? 'Client 2 → Error 503 (blocks stale $100)'
                : analysis.nodeB.status === 'stale'
                  ? `Client 2 → $${analysis.nodeB.returnedValue} (stale by $${analysis.nodeB.stalenessDelta})`
                  : `Client 2 → $${analysis.nodeB.returnedValue} (fresh v2)`}
          </text>
        </g>

        <text x={plotX + plotW / 2} y={plotY + plotH + 22} textAnchor="middle" fontSize={14} fill={t.textSecondary}>
          {analysis.partitioned
            ? `Split active: ${analysis.choice === 'cp' ? 'CP picks Consistency over Node B uptime' : 'AP picks Availability over freshness'}`
            : 'Healthy link: both Consistency and Availability hold'}
        </text>
      </g>
    );
  };

  const renderScorePanel = (offsetX: number, panelW: number) => {
    const plotX = offsetX + 12;
    const plotY = 34;
    const plotW = panelW - 24;
    const plotH = 218;
    const barW = plotW - 24;

    const freshPct = analysis.guarantees.consistent ? 100 : 0;
    const latencyFrac = Math.min(1, analysis.writeLatencyMs / 320);

    const rows = [
      {
        label: 'Consistency',
        value: analysis.guarantees.consistent ? '100% fresh' : `Stale (-$${analysis.nodeB.stalenessDelta})`,
        frac: freshPct / 100,
        color: analysis.guarantees.consistent ? syncedColor : staleColor,
      },
      {
        label: 'Availability',
        value: `${analysis.clusterAvailabilityPct}% (${analysis.guarantees.availableOnB ? '2/2' : '1/2'} up)`,
        frac: analysis.clusterAvailabilityPct / 100,
        color: analysis.guarantees.availableOnB ? writerColor : errorColor,
      },
      {
        label: 'Network link',
        value: analysis.partitioned ? 'Split active' : 'Healthy',
        frac: 1,
        color: analysis.partitioned ? errorColor : syncedColor,
      },
      {
        label: 'Write delay',
        value: `${analysis.writeLatencyMs} ms`,
        frac: latencyFrac,
        color: syncMsgColor,
      },
    ];

    return (
      <g>
        <text x={offsetX + panelW / 2} y={20} textAnchor="middle" fontSize={15} fontWeight={700} fill={t.textPrimary}>
          2. Guarantees &amp; write delay
        </text>
        <defs>
          <clipPath id={`${clipScoreId}-${offsetX}`}>
            <rect x={plotX} y={plotY} width={plotW} height={plotH} />
          </clipPath>
        </defs>
        <rect x={plotX} y={plotY} width={plotW} height={plotH} fill={t.background} stroke={t.border} strokeWidth={1} rx={4} />

        <g clipPath={`url(#${clipScoreId}-${offsetX})`}>
          {rows.map((row, idx) => {
            const ry = plotY + 14 + idx * 50;
            const fillW = Math.max(6, Math.min(barW, row.frac * barW));
            return (
              <g key={row.label}>
                <text x={plotX + 12} y={ry + 12} fontSize={14} fontWeight={700} fill={t.textPrimary}>
                  {row.label}
                </text>
                <text x={plotX + plotW - 12} y={ry + 12} textAnchor="end" fontSize={14} fontWeight={700} fill={row.color}>
                  {row.value}
                </text>
                <rect x={plotX + 12} y={ry + 20} width={barW} height={13} rx={3} fill={t.surfaceAlt} />
                <rect x={plotX + 12} y={ry + 20} width={fillW} height={13} rx={3} fill={row.color} fillOpacity={0.85} />
              </g>
            );
          })}
        </g>

        <text x={plotX + plotW / 2} y={plotY + plotH + 22} textAnchor="middle" fontSize={14} fill={t.textSecondary}>
          {analysis.partitioned ? 'You can keep C or A during a split, never both' : `Healthy mode: ${BASE_LOCAL_LATENCY_MS} ms local + ${analysis.choice === 'cp' ? analysis.syncLatencyMs : 0} ms sync wait`}
        </text>
      </g>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {!compact && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
            <div style={{ flex: '1 1 320px', minWidth: 0, marginBottom: -8 }}>
              <VisualizationHeader
                eyebrow="Live playground"
                title="When a network splits two database copies, choose honesty or uptime"
                description="Suppose two copies of your database live in separate buildings (Node A and Node B), and the cable between them snaps after a new write. Toggle the split, pick CP (refuse old data) vs AP (keep answering), and see the exact trade-off."
              />
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', paddingTop: 2 }}>
              <VizButton onClick={playback.toggle}>{playback.playing ? 'Pause' : 'Play'}</VizButton>
              <VizButton variant="secondary" onClick={playback.next}>Step →</VizButton>
              <VizButton variant="secondary" onClick={playback.reset}>Reset</VizButton>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ marginBottom: -8 }}>
              <PillSelect<string>
                label="Quick scenarios"
                value={activePresetId}
                onChange={(id) => {
                  const preset = CAP_PRESETS.find((p) => p.id === id);
                  if (preset) {
                    setChoice(preset.choice);
                    setPartitioned(preset.partitioned);
                    setNewWriteValue(preset.newWriteValue);
                    setSyncLatencyMs(preset.syncLatencyMs);
                    setActiveFormula(!preset.partitioned ? 'pacelc' : preset.choice);
                    setPrediction(null);
                  }
                }}
                options={[
                  ...CAP_PRESETS.map((p) => ({ value: p.id, label: p.label })),
                  ...(activePresetId === 'custom' ? [{ value: 'custom', label: 'Custom setup' }] : []),
                ]}
              />
            </div>
            <div style={{ marginBottom: -8 }}>
              <PillSelect<CapChoice>
                label="Rule during a split (CP vs AP)"
                value={choice}
                onChange={(val) => {
                  const next = typeof val === 'function' ? val(choice) : val;
                  setChoice(next);
                  setActiveFormula(next);
                }}
                options={[
                  { value: 'cp', label: 'CP: Consistency first' },
                  { value: 'ap', label: 'AP: Availability first' },
                ]}
              />
            </div>
            <button
              type="button"
              aria-pressed={partitioned}
              onClick={() => setPartitioned((p) => !p)}
              style={{
                padding: '6px 12px',
                borderRadius: RADIUS.sm,
                border: `1.5px solid ${partitioned ? errorColor : syncedColor}`,
                background: partitioned ? `${errorColor}18` : `${syncedColor}14`,
                color: partitioned ? errorColor : syncedColor,
                fontFamily: FONT_FAMILY,
                fontSize: 15,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Network link: {partitioned ? 'Partitioned (cable cut)' : 'Connected (healthy)'}
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 190px), 1fr))', gap: 12, alignItems: 'end' }}>
            <label style={{ display: 'block', fontSize: 15, color: t.textPrimary }}>
              <span style={{ display: 'block', marginBottom: 4, fontWeight: 700 }}>New balance written to Node A ($)</span>
              <input
                aria-label="New write value on Node A"
                type="number"
                min={0}
                max={9999}
                step={10}
                value={newWriteValue}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (Number.isFinite(v)) setNewWriteValue(Math.max(0, Math.min(9999, Math.round(v))));
                }}
                style={inputStyle}
              />
            </label>
            <Slider
              label="Sync link delay when healthy (ms)"
              value={syncLatencyMs}
              onChange={(v) => setSyncLatencyMs(v)}
              min={10}
              max={250}
              step={5}
              format={(v) => `${v} ms`}
            />
          </div>
        </>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 18px', fontSize: 15 }} aria-label="CAP diagram colours">
        <span>
          <span style={{ display: 'inline-block', width: 12, height: 12, background: writerColor, verticalAlign: 'middle', marginRight: 6 }} />
          Node A (writer, fresh v2)
        </span>
        <span>
          <span style={{ display: 'inline-block', width: 12, height: 12, background: syncedColor, verticalAlign: 'middle', marginRight: 6 }} />
          Synced &amp; consistent
        </span>
        <span>
          <span style={{ display: 'inline-block', width: 12, height: 12, background: staleColor, verticalAlign: 'middle', marginRight: 6 }} />
          Stale copy (old v1)
        </span>
        <span>
          <span style={{ display: 'inline-block', width: 12, height: 12, background: errorColor, verticalAlign: 'middle', marginRight: 6 }} />
          Split / refused read (503)
        </span>
      </div>

      <div ref={hostRef} style={{ width: '100%' }}>
        {!isCompactPhone ? (
          <svg
            width="100%"
            viewBox="0 0 760 288"
            role="img"
            aria-label={`CAP cluster in ${choice.toUpperCase()} mode, ${partitioned ? 'partitioned' : 'connected'}: Node A has $${analysis.nodeA.value}, Node B ${analysis.nodeB.status === 'rejected' ? 'refuses reads' : `returns $${analysis.nodeB.returnedValue}`}`}
            style={{ display: 'block', fontFamily: FONT_FAMILY }}
          >
            {renderClusterPanel(0, 424)}
            {renderScorePanel(432, 328)}
          </svg>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            <svg width="100%" viewBox="0 0 370 288" role="img" aria-label="Cluster nodes and network link" style={{ display: 'block', fontFamily: FONT_FAMILY }}>
              {renderClusterPanel(0, 370)}
            </svg>
            <svg width="100%" viewBox="0 0 370 288" role="img" aria-label="Consistency, availability, and latency bars" style={{ display: 'block', fontFamily: FONT_FAMILY }}>
              {renderScorePanel(0, 370)}
            </svg>
          </div>
        )}
      </div>

      {compact ? (
        <StickyRow>
          <StickyNote
            title={choice === 'cp' ? 'CP rule · Consistency first' : 'AP rule · Availability first'}
            latex={FORMULA_LATEX[choice]}
            color="yellow"
            tilt={-1}
          >
            <p className="nm-sticky__mono" style={{ textAlign: 'center' }}>
              Node A: <strong>${analysis.nodeA.value}</strong> · Node B:{' '}
              <strong>{analysis.nodeB.status === 'rejected' ? '503 Refused' : `$${analysis.nodeB.returnedValue}`}</strong>
            </p>
          </StickyNote>
          <StickyNote title={`Step ${playback.step + 1} of ${analysis.trace.length}`} color="blue" tilt={1} live>
            <p>{activeStep.explain}</p>
          </StickyNote>
        </StickyRow>
      ) : (
        <>
          <StickyRow>
            <StickyNote
              title="1. CP (Consistency + Partition)"
              latex={FORMULA_LATEX.cp}
              color="yellow"
              tilt={-1}
              active={activeFormula === 'cp'}
              onSelect={() => {
                setChoice('cp');
                setActiveFormula('cp');
              }}
            >
              <p style={{ textAlign: 'center' }}>Minority side refuses requests during a split so no user reads stale data.</p>
            </StickyNote>
            <StickyNote
              title="2. AP (Availability + Partition)"
              latex={FORMULA_LATEX.ap}
              color="pink"
              tilt={1}
              active={activeFormula === 'ap'}
              onSelect={() => {
                setChoice('ap');
                setActiveFormula('ap');
              }}
            >
              <p style={{ textAlign: 'center' }}>Every reachable node keeps answering, even with an older version.</p>
            </StickyNote>
            <StickyNote
              title="3. PACELC (When connected)"
              latex={FORMULA_LATEX.pacelc}
              color="orange"
              tilt={-1}
              active={activeFormula === 'pacelc'}
              onSelect={() => {
                setPartitioned(false);
                setActiveFormula('pacelc');
              }}
            >
              <p style={{ textAlign: 'center' }}>With no split, waiting for replica sync trades speed for freshness.</p>
            </StickyNote>
          </StickyRow>

          <StickyRow>
            <StickyNote title={`Worked numbers · ${choice.toUpperCase()} (${partitioned ? 'Split' : 'Connected'})`} color="green" tilt={1}>
              <p className="nm-sticky__mono">
                Node A: <strong>${analysis.nodeA.value} (v2)</strong> · Node B:{' '}
                <strong>{analysis.nodeB.status === 'rejected' ? 'Error 503' : `$${analysis.nodeB.returnedValue} (v${analysis.nodeB.version})`}</strong>
              </p>
              <p className="nm-sticky__mono" style={{ marginTop: 4 }}>
                Stale gap: <strong>${analysis.nodeB.stalenessDelta}</strong> · Availability: <strong>{analysis.clusterAvailabilityPct}%</strong> · Write time: <strong>{analysis.writeLatencyMs} ms</strong>
              </p>
            </StickyNote>
            <StickyNote title={`Step ${playback.step + 1} of ${analysis.trace.length} · What just happened`} color="blue" tilt={-1} live>
              <p>{activeStep.explain}</p>
            </StickyNote>
          </StickyRow>

          <PredictChallenge
            prompt="The cable between Node A and Node B snaps right after Node A saves $250 (Node B still holds $100). Under CP mode, what does Node B do when asked for the balance?"
            options={PREDICT_OPTIONS}
            correctIndex={0}
            selected={prediction}
            onSelect={setPrediction}
            explanation="CP refuses to lie: since Node B cannot reach Node A to confirm the latest write, it returns an error (503) instead of stale $100."
            actionLabel="Run Split + CP now"
            onAction={() => {
              setChoice('cp');
              setPartitioned(true);
              setNewWriteValue(250);
              setActiveFormula('cp');
              playback.setStep(3);
            }}
          />
        </>
      )}
    </div>
  );
}

export default function CapTheoremDiagram({ compact = false }: { compact?: boolean } = {}) {
  const outerVisible = useVizVisible();
  return (
    <VisualizationContainer
      title="CAP theorem partition simulator"
      footer="Interactive CAP & PACELC model with exact replica values, staleness gap, availability share, and synchronous vs. asynchronous write latency."
    >
      <CapTheoremPlayground compact={compact} outerVisible={outerVisible} />
    </VisualizationContainer>
  );
}
