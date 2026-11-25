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
  analyzeAgentHarness,
  HARNESS_COMMAND_PRESETS,
  type HarnessMode,
} from '../lib/agentHarness';
import { PredictChallenge } from './playgroundPrimitives';
import { useResponsiveHostWidth, useStepPlayback } from './useStepPlayback';

const PREDICT_OPTIONS = [
  'It declares victory anyway because it has no compiler or test exit code',
  'It secretly runs a Python compiler inside its transformer weights',
  'It automatically reverts broken files on your disk',
] as const;

type HarnessFormulaTab = 'agent' | 'naked' | 'budget';

const FORMULA_LATEX: Record<HarnessFormulaTab, string> = {
  agent: String.raw`\text{Agent} = \text{Model} + \text{Harness}`,
  naked: String.raw`\text{Naked} = \text{Prompt} \rightarrow \text{Host} \quad (\text{no jail, no check})`,
  budget: String.raw`\text{Context load} = \frac{T_{\text{used}}}{T_{\text{budget}}} \le 100\%`,
};

function AgentHarnessPlayground({
  compact = false,
  outerVisible = true,
}: {
  compact?: boolean;
  outerVisible?: boolean;
}) {
  const t = useVizTokens();
  const clipLoopId = useId();
  const clipGaugeId = useId();
  const { hostRef, isCompactPhone } = useResponsiveHostWidth(760);

  const [mode, setMode] = useState<HarnessMode>('harness');
  const [command, setCommand] = useState<string>(HARNESS_COMMAND_PRESETS[0].command);
  const [tokenBudget, setTokenBudget] = useState<number>(32000);
  const [timeoutSeconds, setTimeoutSeconds] = useState<number>(15);
  const [activeFormula, setActiveFormula] = useState<HarnessFormulaTab>('agent');
  const [prediction, setPrediction] = useState<number | null>(null);

  const analysis = useMemo(
    () => analyzeAgentHarness({ mode, command, tokenBudget, timeoutSeconds }),
    [mode, command, tokenBudget, timeoutSeconds],
  );

  const playback = useStepPlayback(analysis.trace.length, 2100, 3, outerVisible);
  const activeStage = analysis.trace[playback.step] ?? analysis.trace[3];

  const contextColor = t.accentPurple;
  const modelColor = t.accentSecondary;
  const sandboxColor = t.accentWarn;
  const verifyColor = t.accentPrimary;
  const stateColor = t.accentTeal;
  const dangerColor = t.accentDanger;

  const activePresetId =
    HARNESS_COMMAND_PRESETS.find((p) => p.command === command.trim())?.id ?? 'custom';

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

  const renderLoopPanel = (offsetX: number, panelW: number) => {
    const plotX = offsetX + 10;
    const plotY = 34;
    const plotW = panelW - 20;
    const plotH = 228;

    const isHarness = analysis.mode === 'harness';
    const stageColors = isHarness
      ? [contextColor, modelColor, sandboxColor, verifyColor, stateColor]
      : [dangerColor, modelColor, dangerColor, dangerColor, dangerColor];

    const boxW = Math.round((plotW - 54) / 3);
    const boxH = 54;
    const col1X = plotX + 14;
    const col2X = col1X + boxW + 13;
    const col3X = col2X + boxW + 13;
    const topY = plotY + 26;
    const botY = plotY + 122;

    const nodes = isHarness
      ? [
          { idx: 0, x: col1X, y: topY, title: '1. Context', sub: 'map + rules' },
          { idx: 1, x: col2X, y: topY, title: '2. Model', sub: 'proposes cmd' },
          { idx: 2, x: col3X, y: topY, title: '3. Sandbox', sub: 'gate + jail' },
          { idx: 3, x: col3X, y: botY, title: '4. Verifier', sub: '3 checks' },
          { idx: 4, x: col1X, y: botY, title: '5. State', sub: 'compact log' },
        ]
      : [
          { idx: 0, x: col1X, y: topY, title: '1. Prompt', sub: 'raw dump' },
          { idx: 1, x: col2X, y: topY, title: '2. Model', sub: 'unchecked' },
          { idx: 2, x: col3X, y: topY, title: '3. Host', sub: 'no jail!' },
          { idx: 3, x: col3X, y: botY, title: '4. Guess', sub: '"All pass!"' },
          { idx: 4, x: col1X, y: botY, title: '5. Amnesia', sub: 'loses track' },
        ];

    return (
      <g>
        <text x={offsetX + panelW / 2} y={20} textAnchor="middle" fontSize={15} fontWeight={700} fill={t.textPrimary}>
          1. {isHarness ? 'Closed harness control loop' : 'Open-loop naked prompt (no guardrails)'}
        </text>
        <defs>
          <clipPath id={`${clipLoopId}-${offsetX}`}>
            <rect x={plotX} y={plotY} width={plotW} height={plotH} />
          </clipPath>
        </defs>
        <rect x={plotX} y={plotY} width={plotW} height={plotH} fill={t.background} stroke={t.border} strokeWidth={1} rx={4} />

        <g clipPath={`url(#${clipLoopId}-${offsetX})`}>
          {/* Outer Harness Isolation Boundary */}
          <rect
            x={plotX + 6}
            y={plotY + 8}
            width={plotW - 12}
            height={plotH - 16}
            rx={8}
            fill="none"
            stroke={isHarness ? verifyColor : dangerColor}
            strokeWidth={1.6}
            strokeDasharray={isHarness ? '6 4' : '3 5'}
          />
          <text
            x={plotX + 16}
            y={plotY + 21}
            fontSize={14}
            fontWeight={700}
            fill={isHarness ? verifyColor : dangerColor}
          >
            {isHarness ? 'Harness safety boundary (isolates host)' : 'No boundary: commands hit host directly'}
          </text>

          {/* Connecting arrows */}
          <line x1={col1X + boxW} y1={topY + boxH / 2} x2={col2X} y2={topY + boxH / 2} stroke={t.border} strokeWidth={2} />
          <line x1={col2X + boxW} y1={topY + boxH / 2} x2={col3X} y2={topY + boxH / 2} stroke={isHarness ? t.border : dangerColor} strokeWidth={2} />
          <line x1={col3X + boxW / 2} y1={topY + boxH} x2={col3X + boxW / 2} y2={botY} stroke={isHarness ? verifyColor : dangerColor} strokeWidth={2} strokeDasharray={isHarness ? undefined : '4 4'} />
          <line x1={col3X} y1={botY + boxH / 2} x2={col1X + boxW} y2={botY + boxH / 2} stroke={isHarness ? stateColor : dangerColor} strokeWidth={2} strokeDasharray={isHarness ? undefined : '4 4'} />
          <line x1={col1X + boxW / 2} y1={botY} x2={col1X + boxW / 2} y2={topY + boxH} stroke={isHarness ? contextColor : dangerColor} strokeWidth={2} strokeDasharray={isHarness ? undefined : '4 4'} />

          {/* Verdict label on feedback return arrow */}
          <text
            x={(col1X + boxW + col3X) / 2}
            y={botY + boxH / 2 - 8}
            textAnchor="middle"
            fontSize={14}
            fontWeight={700}
            fill={isHarness ? verifyColor : dangerColor}
          >
            {isHarness ? 'checked facts only' : 'no feedback check!'}
          </text>

          {nodes.map((node) => {
            const active = playback.step === node.idx;
            const color = stageColors[node.idx];
            return (
              <g
                key={node.idx}
                style={{ cursor: 'pointer' }}
                onClick={() => playback.setStep(node.idx)}
              >
                <rect
                  x={node.x}
                  y={node.y}
                  width={boxW}
                  height={boxH}
                  rx={6}
                  fill={active ? `${color}28` : `${color}12`}
                  stroke={color}
                  strokeWidth={active ? 2.8 : 1.4}
                />
                <text x={node.x + boxW / 2} y={node.y + 22} textAnchor="middle" fontSize={14} fontWeight={700} fill={color}>
                  {node.title}
                </text>
                <text x={node.x + boxW / 2} y={node.y + 42} textAnchor="middle" fontSize={14} fill={t.textPrimary}>
                  {node.sub}
                </text>
              </g>
            );
          })}

          <text x={plotX + plotW / 2} y={plotY + plotH - 16} textAnchor="middle" fontSize={14} fontWeight={700} fill={isHarness ? t.textPrimary : dangerColor}>
            Command: {analysis.command.length > 34 ? `${analysis.command.slice(0, 33)}…` : analysis.command}
          </text>
        </g>

        <text x={plotX + plotW / 2} y={plotY + plotH + 20} textAnchor="middle" fontSize={14} fill={t.textSecondary}>
          Click any box in the loop to inspect its role
        </text>
      </g>
    );
  };

  const renderMetricsPanel = (offsetX: number, panelW: number) => {
    const plotX = offsetX + 10;
    const plotY = 34;
    const plotW = panelW - 20;
    const plotH = 228;
    const barW = plotW - 24;

    const isSafeVerdict =
      analysis.mode === 'harness' &&
      (analysis.verdict.blockedByGate ||
        analysis.verdict.exitStatus === '0 (passed)' ||
        analysis.verdict.exitStatus === 'Timed out safely');

    const rows = [
      {
        label: 'Verdict',
        value: analysis.verdict.exitStatus,
        frac: 1,
        color: isSafeVerdict ? verifyColor : dangerColor,
      },
      {
        label: 'Context load',
        value: `${analysis.usedTokens.toLocaleString('en-US')} (${analysis.contextLoadPct}%)`,
        frac: Math.min(1, analysis.contextLoadPct / 100),
        color: analysis.contextOverBudget ? dangerColor : contextColor,
      },
      {
        label: 'Blast radius',
        value: analysis.mode === 'harness' ? 'Isolated (0 host)' : 'Host exposed!',
        frac: analysis.mode === 'harness' ? 0.15 : 0.95,
        color: analysis.mode === 'harness' ? sandboxColor : dangerColor,
      },
      {
        label: 'False victory',
        value: analysis.mode === 'harness' ? '0% (verified)' : 'High (unverified)',
        frac: analysis.mode === 'harness' ? 0.08 : 0.9,
        color: analysis.mode === 'harness' ? verifyColor : dangerColor,
      },
    ];

    return (
      <g>
        <text x={offsetX + panelW / 2} y={20} textAnchor="middle" fontSize={15} fontWeight={700} fill={t.textPrimary}>
          2. Safety &amp; context meters
        </text>
        <defs>
          <clipPath id={`${clipGaugeId}-${offsetX}`}>
            <rect x={plotX} y={plotY} width={plotW} height={plotH} />
          </clipPath>
        </defs>
        <rect x={plotX} y={plotY} width={plotW} height={plotH} fill={t.background} stroke={t.border} strokeWidth={1} rx={4} />

        <g clipPath={`url(#${clipGaugeId}-${offsetX})`}>
          {rows.map((row, idx) => {
            const ry = plotY + 14 + idx * 52;
            const fillW = Math.max(6, Math.min(barW, row.frac * barW));
            return (
              <g key={row.label}>
                <text x={plotX + 12} y={ry + 12} fontSize={14} fontWeight={700} fill={t.textPrimary}>
                  {row.label}
                </text>
                <text x={plotX + plotW - 12} y={ry + 12} textAnchor="end" fontSize={14} fontWeight={700} fill={row.color}>
                  {row.value}
                </text>
                <rect x={plotX + 12} y={ry + 22} width={barW} height={13} rx={3} fill={t.surfaceAlt} />
                <rect x={plotX + 12} y={ry + 22} width={fillW} height={13} rx={3} fill={row.color} fillOpacity={0.85} />
              </g>
            );
          })}
        </g>

        <text x={plotX + plotW / 2} y={plotY + plotH + 20} textAnchor="middle" fontSize={14} fill={t.textSecondary}>
          {analysis.mode === 'harness' ? `Timeout guard: ${analysis.timeoutSeconds}s max per command` : 'Naked mode trusts model guesses'}
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
                title="Why a reliable AI agent needs a safety harness around the model"
                description="An AI language model can only predict words—it cannot check if code compiles or prevent unsafe shell commands. Compare a closed harness loop against a naked prompt and test dangerous commands safely."
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
              <PillSelect<HarnessMode>
                label="System setup"
                value={mode}
                onChange={(val) => {
                  const next = typeof val === 'function' ? val(mode) : val;
                  setMode(next);
                  setActiveFormula(next === 'harness' ? 'agent' : 'naked');
                }}
                options={[
                  { value: 'harness', label: 'Full harness (safe loop)' },
                  { value: 'naked', label: 'Naked model (no guardrails)' },
                ]}
              />
            </div>
            <div style={{ marginBottom: -8 }}>
              <PillSelect<string>
                label="Try a model command"
                value={activePresetId}
                onChange={(id) => {
                  const preset = HARNESS_COMMAND_PRESETS.find((p) => p.id === id);
                  if (preset) {
                    setCommand(preset.command);
                    playback.setStep(2);
                  }
                }}
                options={[
                  ...HARNESS_COMMAND_PRESETS.map((p) => ({ value: p.id, label: p.label })),
                  ...(activePresetId === 'custom' ? [{ value: 'custom', label: 'Custom command' }] : []),
                ]}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: 12, alignItems: 'end' }}>
            <label style={{ display: 'block', fontSize: 15, color: t.textPrimary }}>
              <span style={{ display: 'block', marginBottom: 4, fontWeight: 700 }}>Model's proposed shell command</span>
              <input
                aria-label="Model proposed shell command"
                type="text"
                maxLength={80}
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                style={inputStyle}
              />
            </label>
            <label style={{ display: 'block', fontSize: 15, color: t.textPrimary }}>
              <span style={{ display: 'block', marginBottom: 4, fontWeight: 700 }}>Context token budget</span>
              <input
                aria-label="Context token budget"
                type="number"
                min={4000}
                max={128000}
                step={2000}
                value={tokenBudget}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (Number.isFinite(v)) setTokenBudget(Math.max(4000, Math.min(128000, Math.round(v))));
                }}
                style={inputStyle}
              />
            </label>
            <Slider
              label="Sandbox timeout cap (seconds)"
              value={timeoutSeconds}
              onChange={(v) => setTimeoutSeconds(v)}
              min={1}
              max={60}
              step={1}
              format={(v) => `${v} s`}
            />
          </div>
        </>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px', fontSize: 15 }} aria-label="Harness component colours">
        <span>
          <span style={{ display: 'inline-block', width: 12, height: 12, background: contextColor, verticalAlign: 'middle', marginRight: 6 }} />
          Context &amp; map
        </span>
        <span>
          <span style={{ display: 'inline-block', width: 12, height: 12, background: modelColor, verticalAlign: 'middle', marginRight: 6 }} />
          AI model
        </span>
        <span>
          <span style={{ display: 'inline-block', width: 12, height: 12, background: sandboxColor, verticalAlign: 'middle', marginRight: 6 }} />
          Gate &amp; sandbox
        </span>
        <span>
          <span style={{ display: 'inline-block', width: 12, height: 12, background: verifyColor, verticalAlign: 'middle', marginRight: 6 }} />
          3-layer verifier
        </span>
        <span>
          <span style={{ display: 'inline-block', width: 12, height: 12, background: dangerColor, verticalAlign: 'middle', marginRight: 6 }} />
          Unchecked host risk
        </span>
      </div>

      <div ref={hostRef} style={{ width: '100%' }}>
        {!isCompactPhone ? (
          <svg
            width="100%"
            viewBox="0 0 760 296"
            role="img"
            aria-label={`Agent harness in ${analysis.mode} mode: ${analysis.verdict.exitStatus}, context load ${analysis.contextLoadPct}%`}
            style={{ display: 'block', fontFamily: FONT_FAMILY }}
          >
            {renderLoopPanel(0, 444)}
            {renderMetricsPanel(452, 308)}
          </svg>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            <svg width="100%" viewBox="0 0 370 296" role="img" aria-label="Agent harness closed control loop" style={{ display: 'block', fontFamily: FONT_FAMILY }}>
              {renderLoopPanel(0, 370)}
            </svg>
            <svg width="100%" viewBox="0 0 370 296" role="img" aria-label="Safety and context load meters" style={{ display: 'block', fontFamily: FONT_FAMILY }}>
              {renderMetricsPanel(0, 370)}
            </svg>
          </div>
        )}
      </div>

      {compact ? (
        <StickyRow>
          <StickyNote title="Agent equation" latex={FORMULA_LATEX.agent} color="yellow" tilt={-1}>
            <p className="nm-sticky__mono" style={{ textAlign: 'center' }}>
              Verdict: <strong>{analysis.verdict.exitStatus}</strong> · Context: <strong>{analysis.contextLoadPct}%</strong>
            </p>
          </StickyNote>
          <StickyNote title={`Step ${playback.step + 1} of ${analysis.trace.length}`} color="blue" tilt={1} live>
            <p>{activeStage.explain}</p>
          </StickyNote>
        </StickyRow>
      ) : (
        <>
          <StickyRow>
            <StickyNote
              title="1. Full harness equation"
              latex={FORMULA_LATEX.agent}
              color="yellow"
              tilt={-1}
              active={activeFormula === 'agent'}
              onSelect={() => {
                setMode('harness');
                setActiveFormula('agent');
              }}
            >
              <p style={{ textAlign: 'center' }}>The model reasons; the harness handles context, safety, tests, and memory.</p>
            </StickyNote>
            <StickyNote
              title="2. Naked prompt failure"
              latex={FORMULA_LATEX.naked}
              color="pink"
              tilt={1}
              active={activeFormula === 'naked'}
              onSelect={() => {
                setMode('naked');
                setActiveFormula('naked');
              }}
            >
              <p style={{ textAlign: 'center' }}>Without a boundary, bad commands hit your host and errors go unchecked.</p>
            </StickyNote>
            <StickyNote
              title="3. Context budget check"
              latex={FORMULA_LATEX.budget}
              color="orange"
              tilt={-1}
              active={activeFormula === 'budget'}
              onSelect={() => {
                setActiveFormula('budget');
                playback.setStep(0);
              }}
            >
              <p style={{ textAlign: 'center' }}>Compacting logs keeps working memory sharp instead of flooding the prompt.</p>
            </StickyNote>
          </StickyRow>

          <StickyRow>
            <StickyNote title={`Worked numbers · ${analysis.mode === 'harness' ? 'Full Harness' : 'Naked Model'}`} color="green" tilt={1}>
              <p className="nm-sticky__mono">
                Status: <strong>{analysis.verdict.exitStatus}</strong> · Blast radius: <strong>{analysis.verdict.blastRadius}</strong>
              </p>
              <p className="nm-sticky__mono" style={{ marginTop: 4 }}>
                Context used: <strong>{analysis.usedTokens.toLocaleString('en-US')} / {analysis.tokenBudget.toLocaleString('en-US')}</strong> (<strong>{analysis.contextLoadPct}%</strong>) · Timeout: <strong>{analysis.timeoutSeconds} s</strong>
              </p>
            </StickyNote>
            <StickyNote title={`Step ${playback.step + 1} of ${analysis.trace.length} · What just happened`} color="blue" tilt={-1} live>
              <p>{activeStage.explain}</p>
            </StickyNote>
          </StickyRow>

          <PredictChallenge
            prompt='An AI writes code with a syntax error and reports "All tests pass!" while running in Naked mode (no harness). What happens?'
            options={PREDICT_OPTIONS}
            correctIndex={0}
            selected={prediction}
            onSelect={setPrediction}
            explanation="A language model predicts plausible completion text; without external test exit codes, it claims success on broken code."
            actionLabel="Switch to Naked model + inspect verifier now"
            onAction={() => {
              setMode('naked');
              setActiveFormula('naked');
              playback.setStep(3);
            }}
          />
        </>
      )}
    </div>
  );
}

export default function AgentHarnessArchitectureVisualizer({ compact = false }: { compact?: boolean } = {}) {
  const outerVisible = useVizVisible();
  return (
    <VisualizationContainer
      title="Agent harness architecture playground"
      footer="Deterministic rule simulation comparing closed-loop harness controls (context budget, pre-dispatch gate, sandbox timeout, 3-layer verifier, state compaction) against an open-loop naked prompt."
    >
      <AgentHarnessPlayground compact={compact} outerVisible={outerVisible} />
    </VisualizationContainer>
  );
}
