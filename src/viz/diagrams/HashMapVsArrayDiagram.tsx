import { useMemo, useState } from 'react';
import { FONT_FAMILY, RADIUS, useVizTokens } from '../../theme/vizTokens';
import { SketchArrow, SketchRect } from '../../components/notebook/RoughShape';
import { PillSelect, Slider, VisualizationContainer, useVizVisible } from '../primitives';
import {
  DEFAULT_HASH_KEYS,
  buildLookupTrace,
  computeScaleComparison,
  explainLookupStep,
  formatHashFormula,
  parseKeyList,
} from '../lib/hashMapVsArray';
import {
  FormulaStrip,
  PlaygroundHeaderBar,
  PredictChallenge,
  StepCaptionStrip,
} from './playgroundPrimitives';
import { useResponsiveHostWidth, useStepPlayback } from './useStepPlayback';

const KEY_PRESETS: readonly { label: string; key: string }[] = [
  { label: 'mat (idx 5)', key: 'mat' },
  { label: 'sat (collision)', key: 'sat' },
  { label: 'rat (idx 0)', key: 'rat' },
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

function HashMapVsArrayPlayground({ outerVisible }: { outerVisible: boolean }) {
  const t = useVizTokens();
  const { hostRef, isCompactPhone } = useResponsiveHostWidth(700);
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

  const playback = useStepPlayback(
    trace.steps.length,
    1300,
    Math.max(0, trace.steps.length - 1),
    outerVisible,
  );
  const current = trace.steps[Math.min(playback.step, trace.steps.length - 1)];

  const caption = explainLookupStep(trace, current.step);
  const formula = formatHashFormula(trace, scale);

  const renderLookupSvg = (offsetX: number, panelW: number) => {
    const numKeys = trace.keys.length;
    const colsArr = numKeys <= 5 ? numKeys : Math.min(numKeys, isCompactPhone ? 5 : 8);
    const slotW = Math.floor((panelW - 12 - (colsArr - 1) * 4) / colsArr);
    const arrayRowOffset = (idx: number) => {
      if (!isCompactPhone && numKeys <= 8) return { x: offsetX + 6 + idx * (slotW + 4), y: 48, w: slotW };
      const r = Math.floor(idx / 5);
      const c = idx % 5;
      const w = Math.floor((panelW - 12 - 4 * 4) / 5);
      return { x: offsetX + 6 + c * (w + 4), y: 46 + r * 44, w };
    };
    const arrayBottom = !isCompactPhone && numKeys <= 8 ? 100 : numKeys > 5 ? 140 : 96;

    const bucketCols = isCompactPhone ? 2 : 4;
    const bucketRows = Math.ceil(trace.bucketCount / bucketCols);
    const bucketW = Math.floor((panelW - 12 - (bucketCols - 1) * 6) / bucketCols);
    const bucketH = bucketRows >= 4 ? 26 : bucketRows >= 3 ? 28 : 34;

    return (
      <g>
        {/* Colour legend */}
        <circle cx={offsetX + 10} cy={14} r={5} fill={t.accentPrimary} />
        <text x={offsetX + 19} y={19} fontSize={13.5} fontFamily={FONT_FAMILY} fill={t.textSecondary}>
          Match
        </text>
        <circle cx={offsetX + 78} cy={14} r={5} fill={t.accentDanger} />
        <text x={offsetX + 87} y={19} fontSize={13.5} fontFamily={FONT_FAMILY} fill={t.textSecondary}>
          Checked/miss
        </text>
        <circle cx={offsetX + 190} cy={14} r={5} fill={t.accentSecondary} />
        <text x={offsetX + 199} y={19} fontSize={13.5} fontFamily={FONT_FAMILY} fill={t.textSecondary}>
          Hash bucket
        </text>

        {/* Array section */}
        <text x={offsetX + 6} y={38} fontSize={14} fontWeight={700} fontFamily={FONT_FAMILY} fill={t.textPrimary}>
          Array: scan 0 → {numKeys - 1} ({current.arrayComparisons} check{current.arrayComparisons > 1 ? 's' : ''})
        </text>

        {trace.keys.map((k, i) => {
          const pos = arrayRowOffset(i);
          const isMatch = current.arrayFoundIndex === i;
          const isChecked = i < current.arrayComparisons;
          const isCurrent = current.arrayIndexChecked === i;
          const fill = isMatch ? `${t.accentPrimary}2A` : isChecked ? `${t.accentDanger}24` : t.surfaceAlt;
          const borderCol = isMatch ? t.accentPrimary : isChecked ? t.accentDanger : t.border;
          return (
            <g key={`${k}-${i}`}>
              <rect x={pos.x} y={pos.y} width={pos.w} height={28} rx={4} fill={fill} stroke={borderCol} strokeWidth={1.3} />
              {isCurrent && (
                <SketchRect
                  x={pos.x - 1}
                  y={pos.y - 1}
                  width={pos.w + 2}
                  height={30}
                  color={isMatch ? t.accentPrimary : t.accentDanger}
                  strokeWidth={2}
                  roughness={1}
                  id={`arr-cur-${i}`}
                />
              )}
              <text
                x={pos.x + pos.w / 2}
                y={pos.y + 19}
                textAnchor="middle"
                fontSize={13.5}
                fontWeight={isMatch ? 700 : 500}
                fontFamily="monospace"
                fill={isMatch ? t.accentPrimary : t.textPrimary}
              >
                {k.length > 5 ? `${k.slice(0, 4)}…` : k}
              </text>
              <text x={pos.x + pos.w / 2} y={pos.y + 42} textAnchor="middle" fontSize={13.5} fontFamily={FONT_FAMILY} fill={t.textMuted}>
                {i}
              </text>
            </g>
          );
        })}

        {/* Hash Map section */}
        <text x={offsetX + 6} y={arrayBottom + 16} fontSize={14} fontWeight={700} fontFamily={FONT_FAMILY} fill={t.textPrimary}>
          Hash map: jump to b{trace.hashInfo.bucket} ({current.hashComparisons} check{current.hashComparisons > 1 ? 's' : ''})
        </text>

        {trace.buckets.map((b) => {
          const r = Math.floor(b.bucketIndex / bucketCols);
          const c = b.bucketIndex % bucketCols;
          const bx = offsetX + 6 + c * (bucketW + 6);
          const by = arrayBottom + 26 + r * (bucketH + 8);
          const isTarget = b.bucketIndex === trace.hashInfo.bucket;
          const highlightColor = !isTarget
            ? t.border
            : current.hashFound
              ? t.accentPrimary
              : current.hashDone
                ? t.accentDanger
                : t.accentSecondary;
          const labelKeys = b.keys.length === 0 ? 'empty' : b.keys.slice(0, 2).join(',');
          const extra = b.keys.length > 2 ? `+${b.keys.length - 2}` : '';
          return (
            <g key={b.bucketIndex}>
              <rect
                x={bx}
                y={by}
                width={bucketW}
                height={bucketH}
                rx={4}
                fill={isTarget ? `${highlightColor}22` : t.surfaceAlt}
                stroke={isTarget ? highlightColor : t.border}
                strokeWidth={isTarget ? 1.8 : 1}
              />
              {isTarget && (
                <SketchRect
                  x={bx - 1}
                  y={by - 1}
                  width={bucketW + 2}
                  height={bucketH + 2}
                  color={highlightColor}
                  strokeWidth={2}
                  roughness={1}
                  id={`hash-b-${b.bucketIndex}`}
                />
              )}
              <text
                x={bx + 6}
                y={by + Math.round(bucketH * 0.65)}
                fontSize={13.5}
                fontWeight={isTarget ? 700 : 500}
                fontFamily="monospace"
                fill={isTarget ? highlightColor : b.keys.length === 0 ? t.textMuted : t.textPrimary}
              >
                b{b.bucketIndex}:{labelKeys}{extra}
              </text>
            </g>
          );
        })}
      </g>
    );
  };

  const renderScaleSvg = (offsetX: number, panelW: number, panelH: number) => {
    const plotL = offsetX + 36;
    const plotR = offsetX + panelW - 10;
    const plotB = panelH - 42;
    const plotT = 50;
    const maxBarH = plotB - plotT - 16;
    const barW = Math.min(68, Math.floor((plotR - plotL) * 0.28));
    const arrX = plotL + Math.round((plotR - plotL) * 0.24) - barW / 2;
    const hashX = plotL + Math.round((plotR - plotL) * 0.74) - barW / 2;
    const hashBarH = Math.max(4, Math.round((scale.hashAvgOps / scale.arrayWorstOps) * maxBarH));

    return (
      <g>
        <text x={offsetX + 8} y={16} fontSize={14} fontWeight={700} fontFamily={FONT_FAMILY} fill={t.textPrimary}>
          Scale at n = {scale.n.toLocaleString('en-US')} entries
        </text>
        <text x={offsetX + 6} y={40} fontSize={13.5} fontFamily={FONT_FAMILY} fill={t.textSecondary}>
          Ops ↑
        </text>
        <line x1={plotL} y1={plotT} x2={plotL} y2={plotB} stroke={t.border} strokeWidth={1.3} />
        <line x1={plotL} y1={plotB} x2={plotR} y2={plotB} stroke={t.border} strokeWidth={1.3} />

        {/* Array bar */}
        <rect x={arrX} y={plotB - maxBarH} width={barW} height={maxBarH} rx={4} fill={t.accentDanger} />
        <text x={arrX + barW / 2} y={plotB - maxBarH - 8} textAnchor="middle" fontSize={13.5} fontWeight={700} fontFamily="monospace" fill={t.accentDanger}>
          {scale.arrayWorstOps.toLocaleString('en-US')}
        </text>
        <text x={arrX + barW / 2} y={plotB + 17} textAnchor="middle" fontSize={13.5} fontWeight={600} fontFamily={FONT_FAMILY} fill={t.textPrimary}>
          Array O(n)
        </text>

        {/* Hash bar */}
        <rect x={hashX} y={plotB - hashBarH} width={barW} height={hashBarH} rx={3} fill={t.accentPrimary} />
        <text x={hashX + barW / 2} y={plotB - hashBarH - 8} textAnchor="middle" fontSize={13.5} fontWeight={700} fontFamily="monospace" fill={t.accentPrimary}>
          ~{scale.hashAvgOps}
        </text>
        <text x={hashX + barW / 2} y={plotB + 17} textAnchor="middle" fontSize={13.5} fontWeight={600} fontFamily={FONT_FAMILY} fill={t.textPrimary}>
          Hash O(1)
        </text>

        <SketchArrow
          points={[
            [arrX + barW + 10, plotB - maxBarH + 20],
            [hashX - 8, plotB - 24],
          ]}
          color={t.accentPrimary}
          strokeWidth={1.6}
          roughness={1.1}
          id="hash-speedup-arrow"
        />

        <text
          x={(plotL + plotR) / 2}
          y={panelH - 6}
          textAnchor="middle"
          fontSize={14}
          fontWeight={700}
          fontFamily={FONT_FAMILY}
          fill={t.accentPrimary}
        >
          {scale.speedupWorst.toLocaleString('en-US')}× fewer worst-case checks
        </text>
      </g>
    );
  };

  return (
    <>
      <PlaygroundHeaderBar
        eyebrow="Live playground"
        title="Array scan vs. Hash map jump"
        description="Type any key to look up, edit the stored items or bucket count, and scale up to 200,000 entries."
        playing={playback.playing}
        onToggle={playback.toggle}
        onNext={playback.next}
        onReset={playback.reset}
      />

      {/* Row 1: Free text Lookup key + presets */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}>
        <label htmlFor="hash-target-key" style={{ fontSize: 14, fontWeight: 700, color: t.textSecondary }}>
          Lookup key:
        </label>
        <input
          id="hash-target-key"
          type="text"
          value={targetKey}
          maxLength={16}
          placeholder="Type any key…"
          onChange={(e) => {
            setTargetKey(e.target.value);
            playback.reset();
          }}
          style={{
            flex: '0 1 130px',
            minWidth: 96,
            padding: '4px 9px',
            borderRadius: RADIUS.sm,
            border: `1.5px solid ${t.border}`,
            background: t.background,
            color: t.textPrimary,
            fontFamily: 'monospace',
            fontSize: 14.5,
          }}
        />
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {KEY_PRESETS.map((p) => {
            const active = targetKey.trim() === p.key;
            return (
              <button
                key={p.label}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  setTargetKey(p.key);
                  playback.playFromStart();
                }}
                style={{
                  padding: '4px 10px',
                  borderRadius: RADIUS.sm,
                  border: `1px solid ${active ? t.accentPrimary : t.border}`,
                  background: active ? t.surfaceAlt : 'transparent',
                  color: active ? t.accentPrimary : t.textPrimary,
                  fontFamily: FONT_FAMILY,
                  fontSize: 14,
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

      {/* Row 2: Stored keys input + Bucket count */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}>
        <label htmlFor="hash-stored-keys" style={{ fontSize: 14, color: t.textSecondary, display: 'flex', alignItems: 'center', gap: 6, flex: '1 1 220px', minWidth: 0 }}>
          <span style={{ whiteSpace: 'nowrap', fontWeight: 600 }}>Stored keys:</span>
          <input
            id="hash-stored-keys"
            type="text"
            value={keysText}
            maxLength={80}
            onChange={(e) => {
              setKeysText(e.target.value);
              playback.reset();
            }}
            style={{
              width: '100%',
              minWidth: 0,
              padding: '4px 8px',
              borderRadius: RADIUS.sm,
              border: `1px solid ${t.border}`,
              background: t.background,
              color: t.textPrimary,
              fontFamily: 'monospace',
              fontSize: 14,
            }}
          />
        </label>
        <div style={{ marginBottom: -8 }}>
          <PillSelect<number>
            value={bucketCount}
            onChange={(nextM) => {
              setBucketCount(typeof nextM === 'function' ? nextM(bucketCount) : nextM);
              playback.reset();
            }}
            options={BUCKET_OPTIONS}
          />
        </div>
      </div>

      {/* Row 3: Scale n slider + free numeric input + live readout */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 4 }}>
        <div style={{ flex: '1 1 200px', minWidth: 160 }}>
          <Slider
            label="Collection size n"
            value={scaleN}
            onChange={setScaleN}
            min={100}
            max={200_000}
            step={100}
            format={(v) => v.toLocaleString('en-US')}
          />
        </div>
        <label htmlFor="hash-scale-num" style={{ fontSize: 14, color: t.textSecondary }}>
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
              width: 84,
              marginLeft: 6,
              padding: '4px 6px',
              borderRadius: RADIUS.sm,
              border: `1px solid ${t.border}`,
              background: t.background,
              color: t.textPrimary,
              fontFamily: 'monospace',
              fontSize: 14,
            }}
          />
        </label>
        <div style={{ fontSize: 14, color: t.textSecondary, fontVariantNumeric: 'tabular-nums' }} aria-live="polite">
          Array checks: <strong style={{ color: t.accentDanger }}>{current.arrayComparisons}</strong> · Hash checks:{' '}
          <strong style={{ color: t.accentPrimary }}>{current.hashComparisons}</strong> · Load α:{' '}
          <strong style={{ color: t.textPrimary }}>{trace.loadFactor.toFixed(2)}</strong>
        </div>
      </div>

      <StepCaptionStrip caption={caption} accentColor={current.hashFound ? t.accentPrimary : t.accentSecondary} />

      <div ref={hostRef} style={{ width: '100%' }}>
        {!isCompactPhone ? (
          <svg
            width="100%"
            viewBox="0 0 700 248"
            role="img"
            aria-label={`Looking up "${trace.targetKey}": array takes ${trace.arrayTotalChecks} checks while hash map jumps to bucket ${trace.hashInfo.bucket} in ${trace.hashTotalChecks} checks`}
            style={{ display: 'block', overflow: 'visible' }}
          >
            {renderLookupSvg(0, 408)}
            <line x1={414} y1={10} x2={414} y2={236} stroke={t.border} strokeDasharray="4 4" strokeWidth={1} />
            {renderScaleSvg(420, 278, 248)}
          </svg>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            <svg
              width="100%"
              viewBox={bucketCount >= 8 ? '0 0 340 318' : '0 0 340 248'}
              role="img"
              aria-label={`Array scan versus hash bucket lookup for "${trace.targetKey}"`}
              style={{ display: 'block', overflow: 'visible' }}
            >
              {renderLookupSvg(0, 340)}
            </svg>
            <svg
              width="100%"
              viewBox="0 0 340 206"
              role="img"
              aria-label={`Scale comparison at ${scale.n.toLocaleString('en-US')} entries`}
              style={{ display: 'block', overflow: 'visible' }}
            >
              {renderScaleSvg(0, 340, 206)}
            </svg>
          </div>
        )}
      </div>

      <FormulaStrip general={formula.general} worked={formula.worked} />

      <PredictChallenge
        prompt={'Search for "zebra" (not in a 100,000-item collection) — how many checks does each need?'}
        options={PREDICT_OPTIONS}
        correctIndex={0}
        selected={prediction}
        onSelect={setPrediction}
        explanation={'An array must scan all 100,000 items to prove it is absent; a hash map jumps straight to one bucket.'}
        actionLabel={'Test missing "zebra" now'}
        onAction={() => {
          setTargetKey('zebra');
          setScaleN(100_000);
          playback.playFromStart();
        }}
      />
    </>
  );
}

export default function HashMapVsArrayDiagram() {
  const outerVisible = useVizVisible();
  return (
    <VisualizationContainer
      title="Hash Map vs. Array Lookup Playground"
      footer="Uses a real weighted ASCII sum mod m hash into chained buckets alongside a live linear scan. Production scale assumes resizing keeps load factor α constant."
    >
      <HashMapVsArrayPlayground outerVisible={outerVisible} />
    </VisualizationContainer>
  );
}
