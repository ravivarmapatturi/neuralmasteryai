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
  analyzeConsistentHashing,
  parseKeyList,
  type HashRuleMode,
  type RingMembership,
} from '../lib/consistentHashing';
import { useResponsiveHostWidth, useStepPlayback } from './useStepPlayback';

const PREDICT_OPTIONS = [
  'Key 30 moves from B to D',
  'Key 60 moves from C to D (inside interval (50, 70])',
  'All 5 keys get reassigned around the ring',
] as const;

const FORMULA_LATEX: Record<'ring' | 'modulo' | 'expected', string> = {
  ring: String.raw`\text{owner}(k) = \min\{\,t \in \text{ring} \mid t \ge k\,\} \pmod{100}`,
  modulo: String.raw`\text{owner}_{\text{mod}}(k) = k \bmod N`,
  expected: String.raw`\mathbb{E}[\text{moved fraction}] = \frac{1}{N_{\text{new}}}`,
};

function ringCoords(pos: number, cx: number, cy: number, r: number): [number, number] {
  const angle = ((pos / 100) * 2 * Math.PI) - Math.PI / 2;
  return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
}

function clockwiseArcPath(fromPos: number, toPos: number, cx: number, cy: number, r: number): string {
  const span = ((toPos - fromPos + 100) % 100) || 100;
  const [x0, y0] = ringCoords(fromPos, cx, cy, r);
  const [x1, y1] = ringCoords(toPos, cx, cy, r);
  const largeArc = span > 50 ? 1 : 0;
  return `M ${x0.toFixed(1)} ${y0.toFixed(1)} A ${r} ${r} 0 ${largeArc} 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`;
}

function ConsistentHashPlayground({
  compact = false,
  outerVisible = true,
}: {
  compact?: boolean;
  outerVisible?: boolean;
}) {
  const t = useVizTokens();
  const clipRingId = useId();
  const clipBarsId = useId();
  const { hostRef, isCompactPhone } = useResponsiveHostWidth(760);

  const [membership, setMembership] = useState<RingMembership>('after');
  const [dPosition, setDPosition] = useState<number>(35);
  const [vnodes, setVnodes] = useState<number>(1);
  const [rawKeys, setRawKeys] = useState<string>('10, 30, 45, 60, 90');
  const [ruleMode, setRuleMode] = useState<HashRuleMode>('ring');
  const [prediction, setPrediction] = useState<number | null>(null);

  const keys = useMemo(() => parseKeyList(rawKeys), [rawKeys]);
  const analysis = useMemo(
    () => analyzeConsistentHashing({ membership, dPosition, vnodes, keys }),
    [membership, dPosition, vnodes, keys],
  );

  const playback = useStepPlayback(analysis.assignments.length, 2100, 1, outerVisible);
  const activeKey = analysis.assignments[playback.step] ?? analysis.assignments[0];

  const ownerColor = (owner: string): string => {
    switch (owner) {
      case 'A':
        return t.accentSecondary;
      case 'B':
        return t.accentPurple;
      case 'C':
        return t.accentWarn;
      default:
        return t.accentPrimary;
    }
  };

  const ringColor = t.accentPrimary;
  const modColor = t.accentDanger;

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

  const statusText = useMemo(() => {
    if (membership === 'before') {
      return ['A', 'B', 'C']
        .map((o) => `${o}: ${(analysis.ownerGroupsBefore[o] ?? []).join(',') || '—'}`)
        .join(' · ');
    }
    const moved = analysis.assignments.filter((a) => a.movedRing);
    if (moved.length === 0) {
      return `Moved: none of ${analysis.keys.length} example keys change (0 vs ${analysis.movedModuloCount} under mod N).`;
    }
    const desc = moved.map((m) => `key ${m.key}, ${m.beforeOwner} → ${m.afterOwner}`).join('; ');
    return `Moved: ${desc}. ${analysis.movedRingCount} of ${analysis.keys.length} keys move (vs ${analysis.movedModuloCount} under mod N).`;
  }, [membership, analysis]);

  const activeStepExplain = useMemo(() => {
    if (!activeKey) return '';
    const activeOwner = membership === 'after' ? activeKey.afterOwner : activeKey.beforeOwner;
    if (membership === 'before') {
      return `Key ${activeKey.key} walks clockwise${activeKey.wrapsAroundZero ? ' past 100→0' : ''} to reach server ${activeOwner}.`;
    }
    if (activeKey.movedRing) {
      return `Key ${activeKey.key} falls inside D's newly claimed arc, so ownership transfers cleanly from ${activeKey.beforeOwner} → ${activeKey.afterOwner}.`;
    }
    return `Key ${activeKey.key} sits outside D's new slice and stays on ${activeKey.afterOwner} unchanged${activeKey.movedModulo ? ` (whereas modulo N would have moved it ${activeKey.moduloBefore}→${activeKey.moduloAfter}!).` : '.'}`;
  }, [activeKey, membership]);

  const renderRingPanel = (offsetX: number, panelW: number) => {
    const plotX = offsetX + 10;
    const plotY = 30;
    const plotW = panelW - 20;
    const plotH = 248;
    const cx = offsetX + panelW / 2;
    const cy = 152;
    const ringR = 88;
    const keyR = 60;

    return (
      <g>
        <text x={offsetX + panelW / 2} y={20} textAnchor="middle" fontSize={15} fontWeight={700} fill={t.textPrimary}>
          1. Clockwise hash ring [0..100)
        </text>
        <defs>
          <clipPath id={`${clipRingId}-${offsetX}`}>
            <rect x={plotX} y={plotY} width={plotW} height={plotH} />
          </clipPath>
        </defs>

        <g clipPath={`url(#${clipRingId}-${offsetX})`}>
          {/* Base circle */}
          <circle cx={cx} cy={cy} r={ringR} fill="none" stroke={t.border} strokeWidth={2.2} />

          {/* Cardinal ticks 0, 25, 50, 75 */}
          {[0, 25, 50, 75].map((tick) => {
            const [tx, ty] = ringCoords(tick, cx, cy, ringR + 28);
            return (
              <text key={`rt-${tick}`} x={tx} y={ty + 4} textAnchor="middle" fontSize={14} fill={t.textMuted}>
                {tick}
              </text>
            );
          })}

          {/* Stolen interval arcs when D is added */}
          {membership === 'after' &&
            analysis.stolenIntervals.map((seg, idx) => (
              <path
                key={`stolen-${idx}`}
                d={clockwiseArcPath(seg.from, seg.to, cx, cy, ringR)}
                fill="none"
                stroke={ringColor}
                strokeWidth={7}
                strokeOpacity={0.35}
              />
            ))}

          {/* Active key's clockwise lookup trace */}
          {activeKey && (() => {
            const activeTok =
              analysis.activeTokens.find((tok) => tok.position >= activeKey.key) ??
              analysis.activeTokens[0];
            if (!activeTok) return null;
            return (
              <path
                d={clockwiseArcPath(activeKey.key, activeTok.position, cx, cy, ringR - 12)}
                fill="none"
                stroke={ownerColor(activeTok.owner)}
                strokeWidth={2.5}
                strokeDasharray="4 3"
              />
            );
          })()}

          {/* Server token nodes along ring */}
          {analysis.activeTokens.map((tok, idx) => {
            const [nx, ny] = ringCoords(tok.position, cx, cy, ringR);
            const prevTok = analysis.activeTokens[(idx - 1 + analysis.activeTokens.length) % analysis.activeTokens.length];
            const gapPrev = prevTok && prevTok !== tok ? (tok.position - prevTok.position + 100) % 100 : 50;
            const closeToPrev = gapPrev < 12;
            const radialOffset = closeToPrev ? 34 : idx % 2 === 0 ? 18 : 24;
            const [lx, ly] = ringCoords(tok.position, cx, cy, ringR + radialOffset);
            const col = ownerColor(tok.owner);
            const anchor = lx < cx - 12 ? 'end' : lx > cx + 12 ? 'start' : 'middle';
            return (
              <g key={`tok-${tok.label}-${tok.position}`}>
                {closeToPrev && (
                  <line x1={nx} y1={ny} x2={lx} y2={ly} stroke={col} strokeWidth={1.1} strokeDasharray="2 2" opacity={0.75} />
                )}
                <circle cx={nx} cy={ny} r={6} fill={col} stroke={t.background} strokeWidth={1.5} />
                <text
                  x={lx}
                  y={ly + 4}
                  textAnchor={anchor}
                  fontSize={14}
                  fontWeight={700}
                  fill={col}
                  stroke={t.background}
                  strokeWidth={3.5}
                  paintOrder="stroke"
                >
                  {tok.label}:{tok.position}
                </text>
              </g>
            );
          })}

          {/* Key markers inside ring */}
          {analysis.assignments.map((a, idx) => {
            const [kx, ky] = ringCoords(a.key, cx, cy, keyR);
            const isSel = activeKey?.key === a.key;
            const owner = membership === 'after' ? a.afterOwner : a.beforeOwner;
            const col = ownerColor(owner);
            const [lx, ly] = ringCoords(a.key, cx, cy, keyR - (idx % 2 === 0 ? 17 : 21));
            return (
              <g
                key={`k-${a.key}`}
                onClick={() => playback.setStep(idx)}
                style={{ cursor: 'pointer' }}
              >
                {isSel && <circle cx={kx} cy={ky} r={9} fill="none" stroke={col} strokeWidth={2} />}
                <rect
                  x={kx - 4}
                  y={ky - 4}
                  width={8}
                  height={8}
                  rx={1.5}
                  fill={a.movedRing && membership === 'after' ? modColor : col}
                  stroke={t.background}
                  strokeWidth={1.2}
                />
                <text
                  x={lx}
                  y={ly + 4}
                  textAnchor="middle"
                  fontSize={14}
                  fontWeight={isSel ? 700 : 400}
                  fill={isSel ? col : t.textPrimary}
                >
                  {a.key}
                </text>
              </g>
            );
          })}
        </g>
      </g>
    );
  };

  const renderComparePanel = (offsetX: number, panelW: number) => {
    const plotX = offsetX + 16;
    const plotY = 36;
    const plotW = panelW - 30;
    const plotH = 216;
    const rowH = Math.min(28, Math.floor((plotH - 72) / Math.max(1, analysis.assignments.length)));
    const barMaxW = Math.max(60, plotW - 210);

    return (
      <g>
        <text x={offsetX + panelW / 2} y={20} textAnchor="middle" fontSize={15} fontWeight={700} fill={t.textPrimary}>
          2. Moved keys: Ring vs. Modulo (k % N)
        </text>
        <defs>
          <clipPath id={`${clipBarsId}-${offsetX}`}>
            <rect x={plotX} y={plotY} width={plotW} height={plotH} />
          </clipPath>
        </defs>

        <rect x={plotX} y={plotY} width={plotW} height={plotH} fill={t.background} rx={4} />

        <g clipPath={`url(#${clipBarsId}-${offsetX})`}>
          <text x={plotX + 8} y={plotY + 18} fontSize={14} fontWeight={700} fill={t.textSecondary}>Key</text>
          <text x={plotX + 66} y={plotY + 18} fontSize={14} fontWeight={700} fill={ringColor}>Ring</text>
          <text x={plotX + 182} y={plotY + 18} fontSize={14} fontWeight={700} fill={modColor}>Modulo %N</text>
          <line x1={plotX + 6} y1={plotY + 25} x2={plotX + plotW - 6} y2={plotY + 25} stroke={t.border} strokeWidth={1} />

          {analysis.assignments.map((a, idx) => {
            const ry = plotY + 44 + idx * rowH;
            const isSel = activeKey?.key === a.key;
            return (
              <g
                key={`row-${a.key}`}
                onClick={() => playback.setStep(idx)}
                style={{ cursor: 'pointer' }}
              >
                {isSel && (
                  <rect
                    x={plotX + 4}
                    y={ry - 16}
                    width={plotW - 8}
                    height={rowH - 2}
                    rx={4}
                    fill={ownerColor(membership === 'after' ? a.afterOwner : a.beforeOwner)}
                    fillOpacity={0.12}
                  />
                )}
                <text x={plotX + 10} y={ry} fontSize={14} fontWeight={isSel ? 700 : 400} fill={t.textPrimary}>
                  {a.key}
                </text>
                <text x={plotX + 66} y={ry} fontSize={14} fontWeight={a.movedRing ? 700 : 400} fill={a.movedRing ? ringColor : t.textSecondary}>
                  {a.beforeOwner}→{a.afterOwner}{a.movedRing ? ' ★' : ''}
                </text>
                <text x={plotX + 182} y={ry} fontSize={14} fontWeight={a.movedModulo ? 700 : 400} fill={a.movedModulo ? modColor : t.textSecondary}>
                  {a.moduloBefore}→{a.moduloAfter}{a.movedModulo ? ' moved' : ''}
                </text>
              </g>
            );
          })}

          {/* Percentage moved comparison bars */}
          <text x={plotX + 8} y={plotY + plotH - 36} fontSize={14} fontWeight={700} fill={ringColor}>Ring moved:</text>
          <rect x={plotX + 112} y={plotY + plotH - 48} width={barMaxW} height={14} rx={4} fill={t.surfaceAlt} />
          <rect x={plotX + 112} y={plotY + plotH - 48} width={Math.max(4, (analysis.movedRingPct / 100) * barMaxW)} height={14} rx={4} fill={ringColor} />
          <text x={plotX + plotW - 8} y={plotY + plotH - 36} textAnchor="end" fontSize={14} fontWeight={700} fill={ringColor}>
            {analysis.movedRingCount}/{analysis.keys.length} ({analysis.movedRingPct.toFixed(0)}%)
          </text>

          <text x={plotX + 8} y={plotY + plotH - 12} fontSize={14} fontWeight={700} fill={modColor}>Mod moved:</text>
          <rect x={plotX + 112} y={plotY + plotH - 24} width={barMaxW} height={14} rx={4} fill={t.surfaceAlt} />
          <rect x={plotX + 112} y={plotY + plotH - 24} width={Math.max(4, (analysis.movedModuloPct / 100) * barMaxW)} height={14} rx={4} fill={modColor} />
          <text x={plotX + plotW - 8} y={plotY + plotH - 12} textAnchor="end" fontSize={14} fontWeight={700} fill={modColor}>
            {analysis.movedModuloCount}/{analysis.keys.length} ({analysis.movedModuloPct.toFixed(0)}%)
          </text>
        </g>

        <text x={plotX + plotW / 2} y={plotY + plotH + 22} textAnchor="middle" fontSize={14} fill={t.textSecondary}>
          Adding D steals only interval{analysis.stolenIntervals.length > 1 ? 's' : ''}{' '}
          {analysis.stolenIntervals.map((s) => `(${s.from},${s.to}]`).join(', ')}
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
                title="Why adding one server on a hash ring moves only nearby keys"
                description="Changing N in hash(key) % N shifts the divisor for every key and triggers a cache stampede. Placing both servers and keys on a clockwise circle means a new server D only steals keys in the slice right before it."
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
              <PillSelect<RingMembership>
                label="Ring membership"
                value={membership}
                onChange={(val) => setMembership(val)}
                options={[
                  { value: 'before', label: 'A, B, C' },
                  { value: 'after', label: `Add D at ${dPosition}` },
                ]}
              />
            </div>
            <div style={{ marginBottom: -8 }}>
              <PillSelect<number>
                label="Virtual tokens per server"
                value={vnodes}
                onChange={(val) => setVnodes(val)}
                options={[
                  { value: 1, label: '1 token' },
                  { value: 2, label: '2 tokens' },
                  { value: 3, label: '3 tokens' },
                ]}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 160px), 1fr))', gap: 12, alignItems: 'end' }}>
            <Slider
              label="Server D position on ring (1–99)"
              value={dPosition}
              onChange={(v) => {
                setDPosition(v);
                setMembership('after');
              }}
              min={1}
              max={99}
              step={1}
              format={(v) => `pos ${v}`}
            />
            <label style={{ display: 'block', fontSize: 15, color: t.textPrimary }}>
              <span style={{ display: 'block', marginBottom: 4, fontWeight: 700 }}>Exact D position (1–99)</span>
              <input
                aria-label="Exact node D position"
                type="number"
                min={1}
                max={99}
                step={1}
                value={dPosition}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (Number.isFinite(v)) {
                    setDPosition(Math.max(1, Math.min(99, Math.round(v))));
                    setMembership('after');
                  }
                }}
                style={inputStyle}
              />
            </label>
            <label style={{ display: 'block', fontSize: 15, color: t.textPrimary }}>
              <span style={{ display: 'block', marginBottom: 4, fontWeight: 700 }}>Keys to route (0–99)</span>
              <input
                aria-label="Key positions list"
                type="text"
                value={rawKeys}
                onChange={(e) => setRawKeys(e.target.value)}
                style={inputStyle}
              />
            </label>
          </div>

          <p role="status" style={{ margin: 0, fontSize: 15, fontWeight: 700, color: t.textPrimary, fontVariantNumeric: 'tabular-nums' }}>
            {statusText}
          </p>
        </>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px', fontSize: 15 }} aria-label="Ring colours">
        <span>
          <span style={{ display: 'inline-block', width: 11, height: 11, borderRadius: '50%', background: ownerColor('A'), verticalAlign: 'middle', marginRight: 6 }} />
          Server A
        </span>
        <span>
          <span style={{ display: 'inline-block', width: 11, height: 11, borderRadius: '50%', background: ownerColor('B'), verticalAlign: 'middle', marginRight: 6 }} />
          Server B
        </span>
        <span>
          <span style={{ display: 'inline-block', width: 11, height: 11, borderRadius: '50%', background: ownerColor('C'), verticalAlign: 'middle', marginRight: 6 }} />
          Server C
        </span>
        <span>
          <span style={{ display: 'inline-block', width: 11, height: 11, borderRadius: '50%', background: ringColor, verticalAlign: 'middle', marginRight: 6 }} />
          Server D &amp; stolen slice
        </span>
      </div>

      <div ref={hostRef} style={{ width: '100%' }}>
        {!isCompactPhone ? (
          <svg
            width="100%"
            viewBox="0 0 760 284"
            role="img"
            aria-label={
              membership === 'after'
                ? `Adding D at ${dPosition} moves ${analysis.movedRingCount} of ${analysis.keys.length} keys vs ${analysis.movedModuloCount} under modulo`
                : 'A at 20, B at 50, C at 80; keys 10,90 to A, 30,45 to B, 60 to C'
            }
            style={{ display: 'block', fontFamily: FONT_FAMILY }}
          >
            {renderRingPanel(0, 382)}
            {renderComparePanel(392, 368)}
          </svg>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            <svg width="100%" viewBox="0 0 370 284" role="img" aria-label="Clockwise hash ring" style={{ display: 'block', fontFamily: FONT_FAMILY }}>
              {renderRingPanel(0, 370)}
            </svg>
            <svg width="100%" viewBox="0 0 370 284" role="img" aria-label="Ring versus modulo movement comparison" style={{ display: 'block', fontFamily: FONT_FAMILY }}>
              {renderComparePanel(0, 370)}
            </svg>
          </div>
        )}
      </div>

      {compact ? (
        <StickyRow>
          <StickyNote title="Clockwise successor rule" latex={FORMULA_LATEX.ring} color="yellow" tilt={-1}>
            <p className="nm-sticky__mono" style={{ textAlign: 'center' }}>
              Ring moved: {analysis.movedRingCount}/{analysis.keys.length} ({analysis.movedRingPct.toFixed(0)}%) vs Modulo: {analysis.movedModuloCount}/{analysis.keys.length} ({analysis.movedModuloPct.toFixed(0)}%)
            </p>
          </StickyNote>
          <StickyNote title={`Step ${playback.step + 1} of ${analysis.assignments.length}`} color="blue" tilt={1} live>
            <p>{activeStepExplain}</p>
          </StickyNote>
        </StickyRow>
      ) : (
        <>
          <StickyRow>
            <StickyNote
              title="Consistent hash ring"
              latex={FORMULA_LATEX.ring}
              color="yellow"
              tilt={-1}
              active={ruleMode === 'ring'}
              onSelect={() => setRuleMode('ring')}
            >
              <p style={{ textAlign: 'center' }}>Walk clockwise from key k to the next token; wrap past 100 back to 0.</p>
            </StickyNote>
            <StickyNote
              title="Naive modulo hashing"
              latex={FORMULA_LATEX.modulo}
              color="pink"
              tilt={1}
              active={ruleMode === 'modulo'}
              onSelect={() => setRuleMode('modulo')}
            >
              <p style={{ textAlign: 'center' }}>Changing N from 3 to 4 alters the remainder for almost every key at once.</p>
            </StickyNote>
            <StickyNote title="Expected moved share" latex={FORMULA_LATEX.expected} color="orange" tilt={-1}>
              <p style={{ textAlign: 'center' }}>Adding 1 node to 3 (N_new = 4) reassigns only ~1/4 = 25% on average.</p>
            </StickyNote>
          </StickyRow>

          <StickyRow>
            <StickyNote title={`Worked numbers · D at ${dPosition}, ${vnodes} token${vnodes === 1 ? '' : 's'}/server`} color="green" tilt={1}>
              <p className="nm-sticky__mono">
                Key {activeKey?.key}: ring {activeKey?.beforeOwner} → <strong>{activeKey?.afterOwner}</strong> · mod {activeKey?.moduloBefore} → <strong>{activeKey?.moduloAfter}</strong>
              </p>
              <p className="nm-sticky__mono" style={{ marginTop: 4 }}>
                Ring moves <strong>{analysis.movedRingCount}/{analysis.keys.length}</strong> ({analysis.movedRingPct.toFixed(0)}%) vs Modulo <strong>{analysis.movedModuloCount}/{analysis.keys.length}</strong> ({analysis.movedModuloPct.toFixed(0)}%)
              </p>
            </StickyNote>
            <StickyNote title={`Step ${playback.step + 1} of ${analysis.assignments.length} · What just happened`} color="blue" tilt={-1} live>
              <p>{activeStepExplain}</p>
            </StickyNote>
          </StickyRow>

          {/* Inline predict-then-run challenge using aria-live so role="status" remains unique */}
          <div
            style={{
              paddingTop: 8,
              borderTop: `1px dashed ${t.border}`,
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: '8px 12px',
              fontSize: 15,
            }}
          >
            <span style={{ fontWeight: 700, color: t.accentWarn }}>Predict first:</span>
            <span style={{ color: t.textPrimary }}>
              Place new server D at position 70 instead of 35 (with A=20, B=50, C=80). Which key in [10, 30, 45, 60, 90] moves to D?
            </span>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {PREDICT_OPTIONS.map((opt, idx) => {
                const revealed = prediction !== null;
                const picked = prediction === idx;
                const correct = idx === 1;
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setPrediction(idx)}
                    style={{
                      padding: '5px 10px',
                      borderRadius: RADIUS.sm,
                      border: `1.5px solid ${
                        revealed && correct
                          ? ringColor
                          : revealed && picked
                            ? modColor
                            : t.border
                      }`,
                      background:
                        revealed && correct
                          ? ringColor
                          : revealed && picked
                            ? modColor
                            : 'transparent',
                      color: revealed && (correct || picked) ? t.background : t.textPrimary,
                      fontFamily: FONT_FAMILY,
                      fontSize: 14,
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
              <span aria-live="polite" style={{ color: prediction === 1 ? ringColor : t.accentWarn, fontSize: 15 }}>
                {prediction === 1 ? 'Right — ' : 'Try it — '}
                D at 70 claims the predecessor arc (50, 70] from C, so only key 60 transfers (C → D).{' '}
                <button
                  type="button"
                  onClick={() => {
                    setVnodes(1);
                    setRawKeys('10, 30, 45, 60, 90');
                    setDPosition(70);
                    setMembership('after');
                    playback.setStep(3);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    color: ownerColor('A'),
                    textDecoration: 'underline',
                    fontFamily: FONT_FAMILY,
                    fontSize: 15,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Place D at 70 now
                </button>
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default function ConsistentHashMembershipExplorer({ compact = false }: { compact?: boolean } = {}) {
  const outerVisible = useVizVisible();
  return (
    <VisualizationContainer
      title="Consistent hashing & membership playground"
      footer="Exact clockwise successor lookup on a [0, 100) ring compared against naive k mod N hashing. Keys are drawn inside the ring; server tokens sit on the rim."
    >
      <ConsistentHashPlayground compact={compact} outerVisible={outerVisible} />
    </VisualizationContainer>
  );
}
