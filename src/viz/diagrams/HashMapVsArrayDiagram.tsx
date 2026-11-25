import { useEffect, useMemo, useRef, useState } from 'react';
import { scaleLinear } from 'd3';
import { FONT_FAMILY, RADIUS, useVizTokens } from '../../theme/vizTokens';
import { SketchArrow, SketchRect } from '../../components/notebook/RoughShape';
import {
  PillSelect,
  Slider,
  StickyNote,
  StickyRow,
  VisualizationContainer,
  VisualizationHeader,
  VizButton,
  usePrefersReducedMotion,
  useVizVisible,
} from '../primitives';
import {
  DEFAULT_HASH_KEYS,
  buildLookupTrace,
  computeScaleComparison,
  explainLookupStep,
  parseKeyList,
} from '../lib/hashMapVsArray';

const KEY_PRESETS: readonly { label: string; key: string }[] = [
  { label: 'mat (1 jump)', key: 'mat' },
  { label: 'sat (collision)', key: 'sat' },
  { label: 'rat (slot 0)', key: 'rat' },
  { label: 'zebra (missing)', key: 'zebra' },
];

const BUCKET_OPTIONS: { value: number; label: string }[] = [
  { value: 4, label: '4 buckets' },
  { value: 8, label: '8 buckets' },
  { value: 12, label: '12 buckets' },
];

const PREDICT_OPTIONS = [
  'Array: 100,000 · Hash: ~1–2',
  'Array: 1 · Hash: 100,000',
  'Both need ~50,000 checks',
] as const;

function shortKey(key: string, maxLen = 6): string {
  return key.length > maxLen ? `${key.slice(0, maxLen - 1)}…` : key;
}

function compactCount(n: number): string {
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
  return String(n);
}

function HashMapVsArrayPlayground({ compact = false, outerVisible = true }: { compact?: boolean; outerVisible?: boolean }) {
  const t = useVizTokens();
  const reducedMotion = usePrefersReducedMotion();
  const innerVisible = useVizVisible();
  const visible = outerVisible && innerVisible;

  const hostRef = useRef<HTMLDivElement>(null);
  const [hostWidth, setHostWidth] = useState(760);
  useEffect(() => {
    const el = hostRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 760;
      if (w > 0) setHostWidth(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const isCompactPhone = hostWidth < 540;

  const [targetKey, setTargetKey] = useState('mat');
  const [keysText, setKeysText] = useState(DEFAULT_HASH_KEYS.join(', '));
  const [bucketCount, setBucketCount] = useState(8);
  const [scaleN, setScaleN] = useState(50_000);
  const [prediction, setPrediction] = useState<number | null>(null);

  const keys = useMemo(() => parseKeyList(keysText, 10), [keysText]);
  const trace = useMemo(
    () => buildLookupTrace(keys, targetKey, bucketCount),
    [keys, targetKey, bucketCount],
  );
  const scale = useMemo(
    () => computeScaleComparison(scaleN, trace.loadFactor),
    [scaleN, trace.loadFactor],
  );

  const totalSteps = Math.max(1, trace.steps.length);
  const [step, setStep] = useState(() => (reducedMotion ? totalSteps - 1 : 0));
  const [playing, setPlaying] = useState(() => !reducedMotion);

  useEffect(() => {
    setStep((curr) => Math.min(curr, totalSteps - 1));
  }, [totalSteps]);

  useEffect(() => {
    if (reducedMotion) {
      setPlaying(false);
      setStep(totalSteps - 1);
    }
  }, [reducedMotion, totalSteps]);

  useEffect(() => {
    if (!playing || !visible || reducedMotion || totalSteps < 2) return undefined;
    const id = window.setTimeout(() => {
      setStep((curr) => (curr + 1) % totalSteps);
    }, 1300);
    return () => window.clearTimeout(id);
  }, [playing, visible, reducedMotion, totalSteps, step]);

  const safeStep = Math.min(step, totalSteps - 1);
  const current = trace.steps[safeStep];
  const caption = explainLookupStep(trace, current.step);

  // One consistent colour per role across diagram, scale chart, and HTML legend
  const arrayColor = t.accentDanger;
  const hashColor = t.accentPrimary;
  const jumpColor = t.accentSecondary;
  const warnColor = t.accentWarn;

  const sumTermsText = trace.hashInfo.terms
    .slice(0, 4)
    .map((term) => `${term.pos}×${term.code}`)
    .join(' + ') + (trace.hashInfo.terms.length > 4 ? ' + …' : '');

  const isDefaultKeys = keys.join(', ') === DEFAULT_HASH_KEYS.join(', ');

  // Compute clean dynamic height so 4, 8, or 12 chained buckets never clip or overlap
  const numKeys = trace.keys.length;
  const arrayRows = isCompactPhone ? Math.ceil(numKeys / 5) : numKeys <= 8 ? 1 : 2;
  const hashTopY = 44 + arrayRows * 50 + 28;
  const rowStep = bucketCount >= 12 ? 24 : bucketCount >= 8 ? 27 : 34;
  const lookupSvgH = hashTopY + 34 + trace.bucketCount * rowStep + 14;
  const desktopSvgH = Math.max(300, lookupSvgH);

  // ---- SVG Panel 1: Array linear scan vs CLRS-style Chained Hash Map ----
  const renderLookupSvg = (offsetX: number, panelW: number) => {
    const arrCols = isCompactPhone ? Math.min(numKeys, 5) : numKeys <= 8 ? numKeys : 5;
    const slotW = Math.floor((panelW - 12 - (arrCols - 1) * 4) / arrCols);
    const arrayPos = (idx: number) => {
      const r = Math.floor(idx / arrCols);
      const c = idx % arrCols;
      return { x: offsetX + 6 + c * (slotW + 4), y: 40 + r * 50, w: slotW };
    };

    const hashBoxX = offsetX + 6;
    const hashBoxW = isCompactPhone ? 106 : 128;
    const hashBoxY = hashTopY + 46;
    const hashBoxH = 66;
    const dirX = hashBoxX + hashBoxW + (isCompactPhone ? 24 : 38);
    const dirW = 38;
    const chainStartX = dirX + dirW + 16;
    const chainAvailW = offsetX + panelW - chainStartX - 4;
    const targetBucketY = hashTopY + 28 + trace.hashInfo.bucket * rowStep + (rowStep - 4) / 2;

    return (
      <g>
        {/* 1. Array scan */}
        <text x={offsetX + 6} y={22} fontSize={15} fontWeight={700} fontFamily={FONT_FAMILY} fill={t.textPrimary}>
          1. Array scan: 0 → {numKeys - 1} ({current.arrayComparisons} check{current.arrayComparisons > 1 ? 's' : ''})
        </text>
        {trace.keys.map((k, i) => {
          const pos = arrayPos(i);
          const isMatch = current.arrayFoundIndex === i;
          const isChecked = i < current.arrayComparisons;
          const isCurrent = current.arrayIndexChecked === i;
          const fill = isMatch ? `${hashColor}2A` : isChecked ? `${arrayColor}22` : t.surfaceAlt;
          const borderCol = isMatch ? hashColor : isChecked ? arrayColor : t.border;
          return (
            <g key={`${k}-${i}`}>
              <rect x={pos.x} y={pos.y} width={pos.w} height={28} rx={4} fill={fill} stroke={borderCol} strokeWidth={1.3} />
              {isCurrent && (
                <SketchRect
                  x={pos.x - 1}
                  y={pos.y - 1}
                  width={pos.w + 2}
                  height={30}
                  color={isMatch ? hashColor : arrayColor}
                  strokeWidth={2}
                  roughness={1}
                  id={`arr-cur-${i}`}
                />
              )}
              <text
                x={pos.x + pos.w / 2}
                y={pos.y + 19}
                textAnchor="middle"
                fontSize={14}
                fontWeight={isMatch ? 700 : 500}
                fontFamily="monospace"
                fill={isMatch ? hashColor : t.textPrimary}
              >
                {shortKey(k, 5)}
              </text>
              <text x={pos.x + pos.w / 2} y={pos.y + 44} textAnchor="middle" fontSize={14} fontFamily={FONT_FAMILY} fill={t.textMuted}>
                {i}
              </text>
            </g>
          );
        })}

        {/* 2. CLRS Chained Hash Map: hash(key) -> slot T[b] -> chain */}
        <text x={offsetX + 6} y={hashTopY + 14} fontSize={15} fontWeight={700} fontFamily={FONT_FAMILY} fill={t.textPrimary}>
          2. Hash map: jump to b{trace.hashInfo.bucket} ({current.hashComparisons} check{current.hashComparisons > 1 ? 's' : ''})
        </text>

        {/* Hash machine box */}
        <rect x={hashBoxX} y={hashBoxY} width={hashBoxW} height={hashBoxH} rx={6} fill={`${jumpColor}14`} stroke="none" />
        <SketchRect x={hashBoxX} y={hashBoxY} width={hashBoxW} height={hashBoxH} color={jumpColor} strokeWidth={1.8} roughness={1} id="hash-fn-box" />
        <text x={hashBoxX + hashBoxW / 2} y={hashBoxY + 21} textAnchor="middle" fontSize={14} fontWeight={700} fontFamily={FONT_FAMILY} fill={jumpColor}>
          h(&ldquo;{shortKey(trace.targetKey, 6)}&rdquo;)
        </text>
        <text x={hashBoxX + hashBoxW / 2} y={hashBoxY + 41} textAnchor="middle" fontSize={14} fontFamily="monospace" fill={t.textPrimary}>
          {trace.hashInfo.weightedSum}%{trace.bucketCount}={trace.hashInfo.bucket}
        </text>
        <text x={hashBoxX + hashBoxW / 2} y={hashBoxY + 59} textAnchor="middle" fontSize={14} fontWeight={700} fontFamily={FONT_FAMILY} fill={jumpColor}>
          bucket {trace.hashInfo.bucket} →
        </text>

        {/* Jump arrow directly from Hash box into target bucket b */}
        <SketchArrow
          points={[
            [hashBoxX + hashBoxW + 2, hashBoxY + hashBoxH / 2],
            [dirX - 3, targetBucketY],
          ]}
          color={jumpColor}
          strokeWidth={2.2}
          roughness={0.9}
          id="hash-jump-arrow"
        />

        {/* Bucket slots 0..m-1 + linked chains */}
        {trace.buckets.map((b) => {
          const ry = hashTopY + 28 + b.bucketIndex * rowStep;
          const rh = rowStep - 4;
          const isTarget = b.bucketIndex === trace.hashInfo.bucket;
          const slotCol = !isTarget ? t.border : current.hashFound ? hashColor : current.hashDone ? arrayColor : jumpColor;
          const maxNodes = Math.max(1, b.keys.length);
          const nodeGap = 10;
          const nodeW = Math.min(62, Math.floor((chainAvailW - (maxNodes - 1) * nodeGap) / maxNodes));

          return (
            <g key={b.bucketIndex}>
              <rect
                x={dirX}
                y={ry}
                width={dirW}
                height={rh}
                rx={3}
                fill={isTarget ? `${slotCol}24` : t.surfaceAlt}
                stroke={slotCol}
                strokeWidth={isTarget ? 2 : 1.1}
              />
              <text
                x={dirX + dirW / 2}
                y={ry + rh / 2 + 5}
                textAnchor="middle"
                fontSize={14}
                fontWeight={isTarget ? 700 : 500}
                fontFamily="monospace"
                fill={isTarget ? slotCol : t.textSecondary}
              >
                b{b.bucketIndex}
              </text>

              {b.keys.length === 0 ? (
                <text
                  x={chainStartX}
                  y={ry + rh / 2 + 5}
                  fontSize={14}
                  fontWeight={isTarget ? 700 : 400}
                  fontFamily={FONT_FAMILY}
                  fill={isTarget && current.hashDone ? arrayColor : t.textMuted}
                >
                  {isTarget ? '→ empty (missing!)' : '→ empty'}
                </text>
              ) : (
                b.keys.map((k, nodeIdx) => {
                  const nx = chainStartX + nodeIdx * (nodeW + nodeGap);
                  const checkedNode = isTarget && nodeIdx < current.hashComparisons;
                  const matchedNode = checkedNode && k === trace.targetKey && current.hashFound;
                  const nodeColor = matchedNode ? hashColor : checkedNode ? warnColor : isTarget ? jumpColor : t.border;
                  return (
                    <g key={`${b.bucketIndex}-${k}`}>
                      <line
                        x1={nodeIdx === 0 ? dirX + dirW : nx - nodeGap}
                        y1={ry + rh / 2}
                        x2={nx}
                        y2={ry + rh / 2}
                        stroke={isTarget ? slotCol : t.border}
                        strokeWidth={1.3}
                      />
                      <rect
                        x={nx}
                        y={ry}
                        width={nodeW}
                        height={rh}
                        rx={4}
                        fill={matchedNode ? `${hashColor}2A` : checkedNode ? `${warnColor}28` : t.surfaceAlt}
                        stroke={nodeColor}
                        strokeWidth={checkedNode || matchedNode ? 2 : 1.1}
                      />
                      <text
                        x={nx + nodeW / 2}
                        y={ry + rh / 2 + 5}
                        textAnchor="middle"
                        fontSize={14}
                        fontWeight={matchedNode ? 700 : 500}
                        fontFamily="monospace"
                        fill={matchedNode ? hashColor : checkedNode ? warnColor : t.textPrimary}
                      >
                        {shortKey(k, nodeW < 50 ? 4 : 5)}
                      </text>
                    </g>
                  );
                })
              )}
            </g>
          );
        })}
      </g>
    );
  };

  // ---- SVG Panel 2: Clipped Scale Growth Chart (0 -> n) ----
  const renderScaleSvg = (offsetX: number, panelW: number, panelH: number) => {
    const plotL = offsetX + 54;
    const plotR = offsetX + panelW - 14;
    const plotT = 48;
    const plotB = panelH - 58;
    const sx = scaleLinear().domain([0, scale.n]).range([plotL, plotR]);
    const sy = scaleLinear().domain([0, scale.arrayWorstOps]).range([plotB, plotT]);
    const hashY = Math.min(plotB - 4, sy(scale.hashAvgOps));
    const clipId = `hash-scale-clip-${offsetX}-${panelW}`;

    return (
      <g>
        <defs>
          <clipPath id={clipId}>
            <rect x={plotL} y={plotT} width={plotR - plotL} height={plotB - plotT} />
          </clipPath>
        </defs>
        <text x={offsetX + 8} y={22} fontSize={15} fontWeight={700} fontFamily={FONT_FAMILY} fill={t.textPrimary}>
          Cost as list grows to n = {scale.n.toLocaleString('en-US')}
        </text>
        <text x={offsetX + 8} y={42} fontSize={14} fontFamily={FONT_FAMILY} fill={t.textSecondary}>
          Checks ↑
        </text>

        <rect x={plotL} y={plotT} width={plotR - plotL} height={plotB - plotT} fill={t.background} rx={4} />
        <line x1={plotL} y1={plotT} x2={plotL} y2={plotB} stroke={t.border} strokeWidth={1.3} />
        <line x1={plotL} y1={plotB} x2={plotR} y2={plotB} stroke={t.border} strokeWidth={1.3} />

        <text x={plotL - 6} y={plotT + 6} textAnchor="end" fontSize={14} fontFamily="monospace" fill={t.textMuted}>
          {compactCount(scale.arrayWorstOps)}
        </text>
        <text x={plotL - 6} y={plotB + 5} textAnchor="end" fontSize={14} fontFamily="monospace" fill={t.textMuted}>
          0
        </text>
        <text x={plotL} y={plotB + 18} textAnchor="start" fontSize={14} fontFamily="monospace" fill={t.textMuted}>
          0
        </text>
        <text x={plotR} y={plotB + 18} textAnchor="end" fontSize={14} fontFamily="monospace" fill={t.textMuted}>
          {compactCount(scale.n)}
        </text>
        <text x={(plotL + plotR) / 2} y={plotB + 34} textAnchor="middle" fontSize={14} fontWeight={600} fontFamily={FONT_FAMILY} fill={t.textSecondary}>
          Stored items n →
        </text>

        <g clipPath={`url(#${clipId})`}>
          <line x1={sx(0)} y1={sy(0)} x2={sx(scale.n)} y2={sy(scale.arrayWorstOps)} stroke={arrayColor} strokeWidth={2.5} />
          <line x1={sx(0)} y1={hashY} x2={sx(scale.n)} y2={hashY} stroke={hashColor} strokeWidth={2.6} />
        </g>

        <circle cx={sx(scale.n)} cy={sy(scale.arrayWorstOps)} r={4.5} fill={arrayColor} stroke={t.background} strokeWidth={1.3} />
        <circle cx={sx(scale.n)} cy={hashY} r={4.5} fill={hashColor} stroke={t.background} strokeWidth={1.3} />

        {/* Non-overlapping labels inside the plot */}
        <text x={plotR - 10} y={plotT + 20} textAnchor="end" fontSize={14} fontWeight={700} fontFamily={FONT_FAMILY} fill={arrayColor}>
          Array O(n): {scale.arrayWorstOps.toLocaleString('en-US')}
        </text>
        <text x={plotR - 10} y={plotB - 14} textAnchor="end" fontSize={14} fontWeight={700} fontFamily={FONT_FAMILY} fill={hashColor}>
          Hash O(1): ~{scale.hashAvgOps}
        </text>

        <text
          x={(plotL + plotR) / 2}
          y={panelH - 6}
          textAnchor="middle"
          fontSize={14.5}
          fontWeight={700}
          fontFamily={FONT_FAMILY}
          fill={hashColor}
        >
          {scale.speedupWorst.toLocaleString('en-US')}× fewer worst-case checks
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
            title="Why a hash map finds items in one jump instead of scanning everything"
            description={
              <span style={{ fontSize: 15 }}>
                An array checks items one by one from start to finish — slow when there are thousands of entries. A hash map runs a simple math rule on the key name to compute a bucket number and jumps straight there.
              </span>
            }
          />

          {/* Control Group 1: Free text Lookup key + presets */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 8 }}>
            <label htmlFor="hash-target-key" style={{ display: 'block', flex: '0 1 170px', minWidth: 120, fontSize: 15 }}>
              <span style={{ display: 'block', marginBottom: 4, fontWeight: 700, color: t.textPrimary }}>
                Lookup key (word to find)
              </span>
              <input
                id="hash-target-key"
                type="text"
                value={targetKey}
                maxLength={16}
                placeholder="Type any key…"
                onChange={(e) => {
                  setPlaying(false);
                  setStep(0);
                  setTargetKey(e.target.value);
                }}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  minHeight: 36,
                  padding: '5px 9px',
                  borderRadius: RADIUS.sm,
                  border: `1.5px solid ${t.border}`,
                  background: t.background,
                  color: t.textPrimary,
                  fontFamily: 'monospace',
                  fontSize: 15,
                }}
              />
            </label>
            <div role="group" aria-label="Preset lookup keys" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {KEY_PRESETS.map((p) => {
                const active = targetKey.trim() === p.key;
                return (
                  <button
                    key={p.label}
                    type="button"
                    aria-pressed={active}
                    onClick={() => {
                      setTargetKey(p.key);
                      setStep(0);
                      setPlaying(!reducedMotion);
                    }}
                    style={{
                      padding: '6px 11px',
                      borderRadius: RADIUS.sm,
                      border: `1px solid ${active ? t.accentPrimary : t.border}`,
                      background: active ? t.surfaceAlt : 'transparent',
                      color: active ? t.accentPrimary : t.textPrimary,
                      fontFamily: FONT_FAMILY,
                      fontSize: 15,
                      fontWeight: active ? 700 : 500,
                      cursor: 'pointer',
                    }}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Control Group 2: Stored keys + Bucket count m */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 8 }}>
            <label htmlFor="hash-stored-keys" style={{ display: 'block', flex: '1 1 240px', minWidth: 0, fontSize: 15 }}>
              <span style={{ display: 'block', marginBottom: 4, fontWeight: 700, color: t.textPrimary }}>
                Stored keys (comma-separated items in memory)
              </span>
              <input
                id="hash-stored-keys"
                type="text"
                value={keysText}
                maxLength={80}
                onChange={(e) => {
                  setPlaying(false);
                  setStep(0);
                  setKeysText(e.target.value);
                }}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  minHeight: 36,
                  padding: '5px 9px',
                  borderRadius: RADIUS.sm,
                  border: `1.5px solid ${t.border}`,
                  background: t.background,
                  color: t.textPrimary,
                  fontFamily: 'monospace',
                  fontSize: 15,
                }}
              />
            </label>
            <div style={{ marginBottom: -8 }}>
              <PillSelect<number>
                label="Buckets m (slots to hash into)"
                value={bucketCount}
                onChange={(nextM) => {
                  setPlaying(false);
                  setStep(0);
                  setBucketCount(typeof nextM === 'function' ? nextM(bucketCount) : nextM);
                }}
                options={BUCKET_OPTIONS}
              />
            </div>
            {!isDefaultKeys && (
              <VizButton
                variant="secondary"
                onClick={() => {
                  setPlaying(false);
                  setStep(0);
                  setKeysText(DEFAULT_HASH_KEYS.join(', '));
                }}
              >
                Reset items
              </VizButton>
            )}
          </div>

          {/* Control Group 3: Scale n slider + free numeric input + live counters */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 6 }}>
            <div style={{ flex: '1 1 210px', minWidth: 165 }}>
              <Slider
                label="Collection size n (for scale comparison)"
                value={scaleN}
                onChange={setScaleN}
                min={100}
                max={200_000}
                step={100}
                format={(v) => v.toLocaleString('en-US')}
              />
            </div>
            <label htmlFor="hash-scale-num" style={{ fontSize: 15, color: t.textSecondary }}>
              Exact n:
              <input
                id="hash-scale-num"
                type="number"
                min={10}
                max={200_000}
                step={100}
                value={scaleN}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (!Number.isFinite(v)) return;
                  setScaleN(Math.max(10, Math.min(200_000, Math.round(v))));
                }}
                style={{
                  width: 88,
                  marginLeft: 6,
                  minHeight: 34,
                  padding: '4px 6px',
                  borderRadius: RADIUS.sm,
                  border: `1.5px solid ${t.border}`,
                  background: t.background,
                  color: t.textPrimary,
                  fontFamily: 'monospace',
                  fontSize: 15,
                }}
              />
            </label>
            <div style={{ fontSize: 15, color: t.textSecondary, fontVariantNumeric: 'tabular-nums' }} aria-live="polite">
              Array checks: <strong style={{ color: arrayColor }}>{current.arrayComparisons}</strong> · Hash checks:{' '}
              <strong style={{ color: hashColor }}>{current.hashComparisons}</strong> · Load α:{' '}
              <strong style={{ color: t.textPrimary }}>{trace.loadFactor.toFixed(2)}</strong>
            </div>
          </div>
        </>
      )}

      {/* HTML Colour Legend */}
      <div
        style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px', fontSize: 15, color: t.textSecondary, marginBottom: 4 }}
        aria-label="Lookup step colours"
      >
        <span>
          <span style={{ display: 'inline-block', width: 16, height: 4, background: arrayColor, verticalAlign: 'middle', marginRight: 6 }} />
          Array scan (checked / miss)
        </span>
        <span>
          <span style={{ display: 'inline-block', width: 16, height: 4, background: jumpColor, verticalAlign: 'middle', marginRight: 6 }} />
          Hash jump h(k) → bucket
        </span>
        <span>
          <span style={{ display: 'inline-block', width: 16, height: 4, background: hashColor, verticalAlign: 'middle', marginRight: 6 }} />
          Found match / Hash O(1)
        </span>
        <span>
          <span style={{ display: 'inline-block', width: 16, height: 4, background: warnColor, verticalAlign: 'middle', marginRight: 6 }} />
          Collision check in bucket
        </span>
      </div>

      {/* Main SVG visual */}
      <div ref={hostRef} style={{ width: '100%' }}>
        {!isCompactPhone ? (
          <svg
            width="100%"
            viewBox={`0 0 760 ${desktopSvgH}`}
            role="img"
            aria-label={`Looking up "${trace.targetKey}": array takes ${trace.arrayTotalChecks} checks while hash map jumps to bucket ${trace.hashInfo.bucket} in ${trace.hashTotalChecks} checks`}
            style={{ display: 'block', fontFamily: FONT_FAMILY }}
          >
            {renderLookupSvg(0, 470)}
            <line x1={478} y1={10} x2={478} y2={desktopSvgH - 12} stroke={t.border} strokeDasharray="4 4" strokeWidth={1.2} />
            {renderScaleSvg(486, 270, desktopSvgH)}
          </svg>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            <svg
              width="100%"
              viewBox={`0 0 380 ${lookupSvgH}`}
              role="img"
              aria-label={`Array scan versus hash bucket lookup for "${trace.targetKey}"`}
              style={{ display: 'block', fontFamily: FONT_FAMILY }}
            >
              {renderLookupSvg(0, 380)}
            </svg>
            <svg
              width="100%"
              viewBox="0 0 380 230"
              role="img"
              aria-label={`Scale comparison at ${scale.n.toLocaleString('en-US')} entries`}
              style={{ display: 'block', fontFamily: FONT_FAMILY }}
            >
              {renderScaleSvg(0, 380, 230)}
            </svg>
          </div>
        )}
      </div>

      {compact ? (
        <StickyRow>
          <StickyNote title="Hash bucket rule" latex={'b(k) = \\Big(\\sum_{i=1}^{|k|} i\\cdot\\mathrm{code}(k_i)\\Big) \\bmod m'} color="yellow" tilt={-1}>
            <p className="nm-sticky__mono" style={{ textAlign: 'center' }}>
              {trace.hashInfo.weightedSum} mod {trace.bucketCount} = bucket {trace.hashInfo.bucket}
            </p>
          </StickyNote>
          <StickyNote title={`Step ${current.step + 1} of ${trace.steps.length}`} color="blue" tilt={1} live>
            <p>{caption}</p>
          </StickyNote>
        </StickyRow>
      ) : (
        <>
          <StickyRow>
            <StickyNote title="Array scan · O(n)" latex={'\\text{Worst case} = n \\qquad \\text{Average} = \\frac{n+1}{2}'} color="pink" tilt={-1}>
              <p style={{ textAlign: 'center' }}>Checks slot 0, 1, 2… one by one. If absent, it must check all n items.</p>
            </StickyNote>
            <StickyNote title="Hash jump · O(1 + α/2)" latex={'b(k) = \\Big(\\sum_{i=1}^{|k|} i\\cdot\\mathrm{code}(k_i)\\Big) \\bmod m'} color="yellow" tilt={1}>
              <p style={{ textAlign: 'center' }}>Load factor α = items ÷ m buckets. Fewer collisions keeps chains short.</p>
            </StickyNote>
            <StickyNote title={`Worked numbers · "${trace.targetKey}"`} color="green" tilt={-1}>
              <p className="nm-sticky__mono">
                ({sumTermsText}) mod {trace.bucketCount} = {trace.hashInfo.weightedSum} mod {trace.bucketCount} = bucket {trace.hashInfo.bucket}
              </p>
              <p className="nm-sticky__mono">
                Load α = {trace.keys.length}/{trace.bucketCount} = {trace.loadFactor.toFixed(2)} · At n={scale.n.toLocaleString('en-US')}: {scale.arrayWorstOps.toLocaleString('en-US')} vs ~{scale.hashAvgOps}
              </p>
            </StickyNote>
            <StickyNote title={`Step ${current.step + 1} of ${trace.steps.length} · What just happened`} color="blue" tilt={1} live>
              <p>{caption}</p>
            </StickyNote>
          </StickyRow>

          {/* Predict-then-run challenge */}
          <div
            style={{
              marginTop: 6,
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
            <span style={{ color: t.textPrimary }}>
              Search for &ldquo;zebra&rdquo; (not in a 100,000-item collection) — how many checks does each need?
            </span>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {PREDICT_OPTIONS.map((opt, idx) => {
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
                        revealed && correct ? t.accentPrimary : revealed && picked ? t.accentDanger : t.border
                      }`,
                      background:
                        revealed && correct ? t.accentPrimary : revealed && picked ? t.accentDanger : 'transparent',
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
              <span role="status" style={{ color: prediction === 0 ? t.accentPrimary : t.accentWarn, fontSize: 15 }}>
                {prediction === 0 ? 'Right — ' : 'Try it — '}
                an array must scan all 100,000 items to prove it is absent; a hash map jumps straight to one bucket.{' '}
                <button
                  type="button"
                  onClick={() => {
                    setTargetKey('zebra');
                    setScaleN(100_000);
                    setStep(0);
                    setPlaying(!reducedMotion);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    color: t.accentSecondary,
                    textDecoration: 'underline',
                    fontFamily: FONT_FAMILY,
                    fontSize: 15,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Test missing &ldquo;zebra&rdquo; now
                </button>
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
            <VizButton onClick={() => setPlaying((p) => !p)}>{playing ? 'Pause' : 'Play'}</VizButton>
            <VizButton
              variant="secondary"
              onClick={() => {
                setPlaying(false);
                setStep((s) => (s + 1) % totalSteps);
              }}
            >
              Step →
            </VizButton>
            <VizButton
              variant="secondary"
              onClick={() => {
                setPlaying(false);
                setStep(0);
              }}
            >
              Reset
            </VizButton>
            <span style={{ marginLeft: 'auto', fontSize: 15, color: t.textSecondary }}>
              Toy list has {trace.keys.length} items; scale chart projects to n = {scale.n.toLocaleString('en-US')}.
            </span>
          </div>
        </>
      )}
    </>
  );
}

export default function HashMapVsArrayDiagram({ compact = false }: { compact?: boolean } = {}) {
  const outerVisible = useVizVisible();
  return (
    <VisualizationContainer
      title="Hash Map vs. Array Lookup Playground"
      footer="Uses a real weighted character-sum mod m hash into chained buckets alongside a live linear scan. Production scale assumes resizing keeps load factor α constant."
    >
      <HashMapVsArrayPlayground compact={compact} outerVisible={outerVisible} />
    </VisualizationContainer>
  );
}
