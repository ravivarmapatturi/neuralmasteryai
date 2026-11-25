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
  analyzeRollout,
  type ModelHealth,
  type RolloutStrategy,
} from '../lib/rolloutStrategies';
import { PredictChallenge } from './playgroundPrimitives';
import { useResponsiveHostWidth, useStepPlayback } from './useStepPlayback';

const PREDICT_OPTIONS = [
  '0 users see an error, and you CANNOT measure CTR lift',
  '500 users see an error, and you get full CTR lift',
  '0 users see an error, and you get full CTR lift',
] as const;

const FORMULA_LATEX: Record<RolloutStrategy, string> = {
  shadow: String.raw`\text{User sees } M_{\text{old}},\quad \text{Risk} = 0,\quad \Delta\text{CTR} = \text{unobserved}`,
  canary: String.raw`\text{Blast radius} = p_{\text{canary}} \cdot N \cdot \Delta r_{\text{err}}`,
  ab: String.raw`\text{SE}(\Delta p) = \sqrt{\frac{p_1(1 - p_1)}{n_1} + \frac{p_2(1 - p_2)}{n_2}}`,
};

function ABShadowCanaryPlayground({
  compact = false,
  outerVisible = true,
}: {
  compact?: boolean;
  outerVisible?: boolean;
}) {
  const t = useVizTokens();
  const clipRouteId = useId();
  const clipScoreId = useId();
  const { hostRef, isCompactPhone } = useResponsiveHostWidth(760);

  const [strategy, setStrategy] = useState<RolloutStrategy>('canary');
  const [totalRequests, setTotalRequests] = useState<number>(1000);
  const [canaryPct, setCanaryPct] = useState<number>(10);
  const [modelHealth, setModelHealth] = useState<ModelHealth>('buggy');
  const [stickyHashing, setStickyHashing] = useState<boolean>(true);
  const [prediction, setPrediction] = useState<number | null>(null);

  const analysis = useMemo(
    () => analyzeRollout({ strategy, totalRequests, canaryPct, modelHealth, stickyHashing }),
    [strategy, totalRequests, canaryPct, modelHealth, stickyHashing],
  );

  const playback = useStepPlayback(analysis.trace.length, 2150, 2, outerVisible);
  const activeStep = analysis.trace[playback.step] ?? analysis.trace[2];

  const oldColor = t.accentSecondary;
  const newColor = modelHealth === 'buggy' ? t.accentDanger : t.accentPrimary;
  const shadowColor = t.accentPurple;
  const okColor = t.accentPrimary;
  const warnColor = t.accentWarn;

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

  const renderRoutePanel = (offsetX: number, panelW: number) => {
    const plotX = offsetX + 10;
    const plotY = 36;
    const plotW = panelW - 20;
    const plotH = 210;

    const routerX = plotX + 8;
    const routerW = 68;
    const routerY = plotY + 76;

    const midX = plotX + Math.round(plotW * 0.37);
    const midW = 82;
    const oldY = plotY + 24;
    const newY = plotY + 128;

    const rightX = plotX + plotW - 92;
    const rightW = 84;
    const userY = plotY + 24;
    const logY = plotY + 128;

    const stepFrac = playback.step === 0 ? 0.15 : playback.step === 1 ? 0.5 : playback.step === 2 ? 0.85 : 1;
    const isShadow = strategy === 'shadow';
    const dotX1 = routerX + routerW + (midX - (routerX + routerW)) * Math.min(1, stepFrac * 1.15);
    const dotX2 = midX + midW + (rightX - (midX + midW)) * Math.max(0, Math.min(1, (stepFrac - 0.35) * 1.5));

    return (
      <g>
        <text x={offsetX + panelW / 2} y={20} textAnchor="middle" fontSize={15} fontWeight={700} fill={t.textPrimary}>
          1. Traffic path (who answers the user?)
        </text>
        <defs>
          <clipPath id={`${clipRouteId}-${offsetX}`}>
            <rect x={plotX} y={plotY} width={plotW} height={plotH} />
          </clipPath>
        </defs>
        <rect x={plotX} y={plotY} width={plotW} height={plotH} fill={t.background} stroke={t.border} strokeWidth={1} rx={4} />

        <g clipPath={`url(#${clipRouteId}-${offsetX})`}>
          {/* Router -> Old v1 */}
          <line x1={routerX + routerW} y1={routerY + 20} x2={midX} y2={oldY + 24} stroke={oldColor} strokeWidth={2.4} />
          <text
            x={(routerX + routerW + midX) / 2}
            y={oldY + 16}
            textAnchor="middle"
            fontSize={14}
            fontWeight={700}
            fill={oldColor}
          >
            {analysis.oldServedCount}
          </text>

          {/* Router -> New v2 */}
          <line
            x1={routerX + routerW}
            y1={routerY + 34}
            x2={midX}
            y2={newY + 24}
            stroke={isShadow ? shadowColor : newColor}
            strokeWidth={2.4}
            strokeDasharray={isShadow ? '5 4' : undefined}
          />
          <text
            x={(routerX + routerW + midX) / 2}
            y={newY + 46}
            textAnchor="middle"
            fontSize={14}
            fontWeight={700}
            fill={isShadow ? shadowColor : newColor}
          >
            {isShadow ? `${analysis.newMirroredCount} copy` : `${analysis.newServedCount} live`}
          </text>

          {/* Old v1 -> Shown to user */}
          <line x1={midX + midW} y1={oldY + 24} x2={rightX} y2={userY + 24} stroke={oldColor} strokeWidth={2.4} />

          {/* New v2 -> Shown to user (ONLY when user-facing!) */}
          {!isShadow && (
            <line x1={midX + midW} y1={newY + 18} x2={rightX} y2={userY + 36} stroke={newColor} strokeWidth={2.4} />
          )}

          {/* New v2 -> Telemetry logs */}
          <line
            x1={midX + midW}
            y1={newY + 28}
            x2={rightX}
            y2={logY + 24}
            stroke={isShadow ? shadowColor : warnColor}
            strokeWidth={2}
            strokeDasharray="4 3"
          />

          {/* Live animated packets */}
          {playback.step >= 1 && (
            <>
              <circle
                cx={dotX1}
                cy={routerY + 20 + ((oldY + 24) - (routerY + 20)) * Math.min(1, stepFrac * 1.15)}
                r={5}
                fill={oldColor}
                stroke={t.background}
                strokeWidth={1.4}
              />
              <circle
                cx={dotX1}
                cy={routerY + 34 + ((newY + 24) - (routerY + 34)) * Math.min(1, stepFrac * 1.15)}
                r={5}
                fill={isShadow ? shadowColor : newColor}
                stroke={t.background}
                strokeWidth={1.4}
              />
            </>
          )}
          {playback.step >= 2 && (
            <>
              <circle cx={dotX2} cy={oldY + 24} r={5} fill={oldColor} stroke={t.background} strokeWidth={1.4} />
              <circle
                cx={dotX2}
                cy={isShadow ? newY + 28 : newY + 18 + (userY + 36 - (newY + 18)) * Math.max(0, Math.min(1, (stepFrac - 0.35) * 1.5))}
                r={5}
                fill={isShadow ? shadowColor : newColor}
                stroke={t.background}
                strokeWidth={1.4}
              />
            </>
          )}

          {/* Boxes */}
          <rect x={routerX} y={routerY} width={routerW} height={52} rx={6} fill={t.surfaceAlt} stroke={t.border} strokeWidth={1.6} />
          <text x={routerX + routerW / 2} y={routerY + 23} textAnchor="middle" fontSize={14} fontWeight={700} fill={t.textPrimary}>
            Router
          </text>
          <text x={routerX + routerW / 2} y={routerY + 42} textAnchor="middle" fontSize={14} fill={t.textSecondary}>
            {analysis.totalRequests} req
          </text>

          <rect x={midX} y={oldY} width={midW} height={48} rx={6} fill={`${oldColor}18`} stroke={oldColor} strokeWidth={1.8} />
          <text x={midX + midW / 2} y={oldY + 21} textAnchor="middle" fontSize={14} fontWeight={700} fill={oldColor}>
            Old v1
          </text>
          <text x={midX + midW / 2} y={oldY + 40} textAnchor="middle" fontSize={14} fill={t.textSecondary}>
            baseline
          </text>

          <rect
            x={midX}
            y={newY}
            width={midW}
            height={48}
            rx={6}
            fill={`${isShadow ? shadowColor : newColor}18`}
            stroke={isShadow ? shadowColor : newColor}
            strokeWidth={1.8}
          />
          <text x={midX + midW / 2} y={newY + 21} textAnchor="middle" fontSize={14} fontWeight={700} fill={isShadow ? shadowColor : newColor}>
            New v2
          </text>
          <text x={midX + midW / 2} y={newY + 40} textAnchor="middle" fontSize={14} fill={t.textSecondary}>
            {modelHealth === 'buggy' ? 'has bug' : 'healthy'}
          </text>

          <rect x={rightX} y={userY} width={rightW} height={48} rx={6} fill={t.surfaceAlt} stroke={t.border} strokeWidth={1.6} />
          <text x={rightX + rightW / 2} y={userY + 21} textAnchor="middle" fontSize={14} fontWeight={700} fill={t.textPrimary}>
            User sees
          </text>
          <text x={rightX + rightW / 2} y={userY + 40} textAnchor="middle" fontSize={14} fill={isShadow ? oldColor : newColor}>
            {analysis.userFacingPct}% new
          </text>

          <rect x={rightX} y={logY} width={rightW} height={48} rx={6} fill={`${shadowColor}16`} stroke={shadowColor} strokeWidth={1.6} />
          <text x={rightX + rightW / 2} y={logY + 21} textAnchor="middle" fontSize={14} fontWeight={700} fill={shadowColor}>
            Logs only
          </text>
          <text x={rightX + rightW / 2} y={logY + 40} textAnchor="middle" fontSize={14} fill={t.textSecondary}>
            {analysis.loggedErrorsFound} errs
          </text>
        </g>

        <text x={plotX + plotW / 2} y={plotY + plotH + 22} textAnchor="middle" fontSize={14} fill={t.textSecondary}>
          {isShadow
            ? 'Shadow copies requests silently: New v2 never reaches users'
            : `${analysis.userFacingPct}% of users receive New v2 output live`}
        </text>
      </g>
    );
  };

  const renderRiskPanel = (offsetX: number, panelW: number) => {
    const plotX = offsetX + 14;
    const plotY = 36;
    const plotW = panelW - 28;
    const plotH = 210;
    const barW = plotW - 24;

    const maxHarmed = Math.max(10, Math.round(analysis.totalRequests * 0.5 * 0.08));
    const ctrText =
      strategy === 'shadow'
        ? '0% (unseen)'
        : !stickyHashing
          ? 'Diluted (no hash)'
          : `${analysis.observedCtrLift >= 0 ? '+' : ''}${(analysis.observedCtrLift * 100).toFixed(1)} pp (z=${analysis.zScore.toFixed(1)})`;

    const rows = [
      {
        label: 'Users exposed to New v2',
        value: `${analysis.userFacingPct}% (${analysis.newServedCount})`,
        frac: analysis.userFacingPct / 50,
        color: okColor,
      },
      {
        label: 'Users harmed by bug',
        value: `${analysis.usersHarmedByBug} of ${analysis.totalRequests}`,
        frac: analysis.usersHarmedByBug / maxHarmed,
        color: t.accentDanger,
      },
      {
        label: 'Errors / latency logged',
        value: `${analysis.loggedErrorsFound} errs (${analysis.newLatencyMs} ms)`,
        frac: Math.min(1, analysis.loggedErrorsFound / Math.max(20, analysis.totalRequests * 0.09)),
        color: shadowColor,
      },
      {
        label: 'User click (CTR) signal',
        value: ctrText,
        frac: strategy === 'shadow' ? 0 : stickyHashing ? Math.min(1, analysis.zScore / 4) : 0.3,
        color: oldColor,
      },
    ];

    return (
      <g>
        <text x={offsetX + panelW / 2} y={20} textAnchor="middle" fontSize={15} fontWeight={700} fill={t.textPrimary}>
          2. Risk vs. what you learn
        </text>
        <defs>
          <clipPath id={`${clipScoreId}-${offsetX}`}>
            <rect x={plotX} y={plotY} width={plotW} height={plotH} />
          </clipPath>
        </defs>
        <rect x={plotX} y={plotY} width={plotW} height={plotH} fill={t.background} stroke={t.border} strokeWidth={1} rx={4} />

        <g clipPath={`url(#${clipScoreId}-${offsetX})`}>
          {rows.map((row, idx) => {
            const ry = plotY + 14 + idx * 49;
            const fillW = row.frac <= 0 ? 0 : Math.max(6, Math.min(barW, row.frac * barW));
            return (
              <g key={row.label} opacity={playback.step < 2 && idx === 3 ? 0.45 : 1}>
                <text x={plotX + 12} y={ry + 10} fontSize={14} fontWeight={700} fill={t.textPrimary}>
                  {row.label}
                </text>
                <text x={plotX + plotW - 12} y={ry + 10} textAnchor="end" fontSize={14} fontWeight={700} fill={row.color}>
                  {row.value}
                </text>
                <rect x={plotX + 12} y={ry + 18} width={barW} height={12} rx={3} fill={t.surfaceAlt} />
                {fillW > 0 && (
                  <rect x={plotX + 12} y={ry + 18} width={fillW} height={12} rx={3} fill={row.color} fillOpacity={0.85} />
                )}
              </g>
            );
          })}
        </g>

        <text x={plotX + plotW / 2} y={plotY + plotH + 22} textAnchor="middle" fontSize={14} fill={t.textSecondary}>
          Shadow: safe · Canary: capped · A/B: lift
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
                title="How to test a new model in production without hurting users"
                description="Shipping a new AI model straight to 100% of users risks silent crashes or worse answers. Compare Shadow mirroring (zero user risk, logs only), Canary ramps (small capped traffic), and randomized A/B experiments (true user lift)."
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
              <PillSelect<RolloutStrategy>
                label="Rollout strategy"
                value={strategy}
                onChange={(val) => setStrategy(val)}
                options={[
                  { value: 'shadow', label: 'Shadow (0% user)' },
                  { value: 'canary', label: 'Canary ramp' },
                  { value: 'ab', label: 'A/B test (50/50)' },
                ]}
              />
            </div>
            <div style={{ marginBottom: -8 }}>
              <PillSelect<ModelHealth>
                label="New model behavior"
                value={modelHealth}
                onChange={(val) => setModelHealth(val)}
                options={[
                  { value: 'healthy', label: 'Healthy (+3% CTR)' },
                  { value: 'buggy', label: 'Silent bug (8.5% err)' },
                ]}
              />
            </div>
            <button
              type="button"
              aria-pressed={stickyHashing}
              onClick={() => setStickyHashing((s) => !s)}
              style={{
                padding: '6px 12px',
                borderRadius: RADIUS.sm,
                border: `1px solid ${stickyHashing ? okColor : warnColor}`,
                background: stickyHashing ? t.surfaceAlt : 'transparent',
                color: stickyHashing ? okColor : warnColor,
                fontFamily: FONT_FAMILY,
                fontSize: 15,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Sticky user ID hash: {stickyHashing ? 'ON' : 'OFF'}
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 170px), 1fr))', gap: 12, alignItems: 'end' }}>
            <Slider
              label="Canary traffic share %"
              value={canaryPct}
              onChange={(v) => {
                setCanaryPct(v);
                setStrategy('canary');
              }}
              min={1}
              max={50}
              step={1}
              format={(v) => `${v}%`}
            />
            <label style={{ display: 'block', fontSize: 15, color: t.textPrimary }}>
              <span style={{ display: 'block', marginBottom: 4, fontWeight: 700 }}>Traffic volume N (requests)</span>
              <input
                aria-label="Total requests N"
                type="number"
                min={100}
                max={20000}
                step={100}
                value={totalRequests}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (Number.isFinite(v)) setTotalRequests(Math.max(100, Math.min(20000, Math.round(v))));
                }}
                style={inputStyle}
              />
            </label>
          </div>
        </>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 18px', fontSize: 15 }} aria-label="Rollout path colours">
        <span>
          <span style={{ display: 'inline-block', width: 18, height: 3, background: oldColor, verticalAlign: 'middle', marginRight: 6 }} />
          Old v1 (user-facing)
        </span>
        <span>
          <span style={{ display: 'inline-block', width: 18, height: 3, background: okColor, verticalAlign: 'middle', marginRight: 6 }} />
          New v2 (healthy live)
        </span>
        <span>
          <span style={{ display: 'inline-block', width: 18, height: 3, background: t.accentDanger, verticalAlign: 'middle', marginRight: 6 }} />
          New v2 (bug blast radius)
        </span>
        <span>
          <span style={{ display: 'inline-block', width: 18, borderTop: `2.5px dashed ${shadowColor}`, verticalAlign: 'middle', marginRight: 6 }} />
          Logged only (shadow)
        </span>
      </div>

      <div ref={hostRef} style={{ width: '100%' }}>
        {!isCompactPhone ? (
          <svg
            width="100%"
            viewBox="0 0 760 292"
            role="img"
            aria-label={`${strategy} rollout over ${analysis.totalRequests} requests: ${analysis.newServedCount} user-facing new calls, ${analysis.usersHarmedByBug} users harmed`}
            style={{ display: 'block', fontFamily: FONT_FAMILY }}
          >
            {renderRoutePanel(0, 408)}
            {renderRiskPanel(420, 340)}
          </svg>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            <svg width="100%" viewBox="0 0 370 292" role="img" aria-label="Request routing path" style={{ display: 'block', fontFamily: FONT_FAMILY }}>
              {renderRoutePanel(0, 370)}
            </svg>
            <svg width="100%" viewBox="0 0 370 292" role="img" aria-label="Blast radius and observability" style={{ display: 'block', fontFamily: FONT_FAMILY }}>
              {renderRiskPanel(0, 370)}
            </svg>
          </div>
        )}
      </div>

      {compact ? (
        <StickyRow>
          <StickyNote
            title={`Rollout rule · ${strategy === 'ab' ? 'A/B test' : strategy === 'shadow' ? 'Shadow' : 'Canary'}`}
            latex={FORMULA_LATEX[strategy]}
            color="yellow"
            tilt={-1}
          >
            <p className="nm-sticky__mono" style={{ textAlign: 'center' }}>
              New seen by {analysis.userFacingPct}% · Harmed: {analysis.usersHarmedByBug} · Logged errs: {analysis.loggedErrorsFound}
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
              title="Shadow deployment"
              latex={FORMULA_LATEX.shadow}
              color="yellow"
              tilt={-1}
              active={strategy === 'shadow'}
              onSelect={() => setStrategy('shadow')}
            >
              <p style={{ textAlign: 'center' }}>Mirrors live traffic to New v2 in logs only; Old v1 answers 100% of users.</p>
            </StickyNote>
            <StickyNote
              title="Canary rollout"
              latex={FORMULA_LATEX.canary}
              color="pink"
              tilt={1}
              active={strategy === 'canary'}
              onSelect={() => setStrategy('canary')}
            >
              <p style={{ textAlign: 'center' }}>Caps blast radius to p_canary % while validating live outputs before scaling up.</p>
            </StickyNote>
            <StickyNote
              title="A/B experiment"
              latex={FORMULA_LATEX.ab}
              color="orange"
              tilt={-1}
              active={strategy === 'ab'}
              onSelect={() => setStrategy('ab')}
            >
              <p style={{ textAlign: 'center' }}>Splits sticky users 50/50 for maximum statistical power on click lift.</p>
            </StickyNote>
          </StickyRow>

          <StickyRow>
            <StickyNote title={`Worked numbers · N = ${analysis.totalRequests.toLocaleString('en-US')} requests`} color="green" tilt={1}>
              <p className="nm-sticky__mono">
                Old served: <strong>{analysis.oldServedCount}</strong> · New served: <strong>{analysis.newServedCount}</strong> · Mirrored: <strong>{analysis.newMirroredCount}</strong>
              </p>
              <p className="nm-sticky__mono" style={{ marginTop: 4 }}>
                Harmed by bug: <strong>{analysis.usersHarmedByBug}</strong> · Logged errors: <strong>{analysis.loggedErrorsFound}</strong> · CTR lift: <strong>{strategy === 'shadow' ? 'unobserved' : `${(analysis.observedCtrLift * 100).toFixed(1)} pp`}</strong>
              </p>
            </StickyNote>
            <StickyNote title={`Step ${playback.step + 1} of ${analysis.trace.length} · ${activeStep.title}`} color="blue" tilt={-1} live>
              <p>{activeStep.explain}</p>
            </StickyNote>
          </StickyRow>

          <PredictChallenge
            prompt="Your new model has a hidden 8.5% failure bug. You deploy it in Shadow mode across 1,000 requests. How many users see an error, and can you measure click-through lift?"
            options={PREDICT_OPTIONS}
            correctIndex={0}
            selected={prediction}
            onSelect={setPrediction}
            explanation="Because Shadow only logs New v2's predictions while Old v1 answers every user, 0 users see the crash—yet you also cannot see how users react to New v2."
            actionLabel="Run Shadow with bug now"
            onAction={() => {
              setStrategy('shadow');
              setModelHealth('buggy');
              setTotalRequests(1000);
              playback.setStep(3);
            }}
          />
        </>
      )}
    </div>
  );
}

export default function ABShadowCanaryDiagram({ compact = false }: { compact?: boolean } = {}) {
  const outerVisible = useVizVisible();
  return (
    <VisualizationContainer
      title="A/B, Shadow & Canary rollout playground"
      footer="Exact request routing and binomial standard-error calculator contrasting Shadow mirroring, Canary blast-radius capping, and sticky 50/50 A/B splits."
    >
      <ABShadowCanaryPlayground compact={compact} outerVisible={outerVisible} />
    </VisualizationContainer>
  );
}
