import { useMemo, useState } from 'react';
import { FONT_FAMILY, RADIUS, useVizTokens } from '../theme/vizTokens';
import { PillSelect, StickyNote, StickyRow, VisualizationContainer, VisualizationHeader, VizButton } from './primitives';
import { usePlaygroundPlayback } from './diagrams/usePlaygroundPlayback';
import {
  buildSlidingWindowTrace,
  buildTwoPointerTrace,
  isAscending,
  parseNumberList,
  type PointerOutcome,
} from './lib/twoPointersSlidingWindow';

type Mode = 'two-pointer' | 'sliding-window';
const MAX_ITEMS = 12;
const PRESETS = { pair: '1, 2, 3, 4, 6', noPair: '1, 3, 5, 8, 12', repeat: 'abcabcbb', jump: 'pwwkew' } as const;

function inputStyle(t: ReturnType<typeof useVizTokens>): React.CSSProperties {
  return {
    width: '100%', minHeight: 38, boxSizing: 'border-box', padding: '6px 9px', border: `1.5px solid ${t.border}`,
    borderRadius: RADIUS.sm, background: t.background, color: t.textPrimary, fontFamily: FONT_FAMILY, fontSize: 16,
    fontVariantNumeric: 'tabular-nums',
  };
}

function explanation(outcome: PointerOutcome): string {
  if (outcome === 'match') return 'The sum equals the target, so this pair is the answer.';
  if (outcome === 'too-small') return 'The sum is too small. Moving the left pointer right is the only move that can make it larger.';
  if (outcome === 'too-large') return 'The sum is too large. Moving the right pointer left is the only move that can make it smaller.';
  return 'The pointers met without a match, so no two different positions make the target.';
}

export default function TwoPointersSlidingWindowExplorer({ compact = false }: { compact?: boolean }) {
  const t = useVizTokens();
  const [mode, setMode] = useState<Mode>('two-pointer');
  const [arrayText, setArrayText] = useState<string>(PRESETS.pair);
  const [target, setTarget] = useState(6);
  const [text, setText] = useState<string>(PRESETS.repeat);
  const [prediction, setPrediction] = useState('left');
  const [predictionResult, setPredictionResult] = useState<boolean | null>(null);

  const values = useMemo(() => parseNumberList(arrayText, MAX_ITEMS), [arrayText]);
  const sorted = isAscending(values);
  const pointerTrace = useMemo(() => buildTwoPointerTrace(values, target), [values, target]);
  const windowText = [...text].slice(0, MAX_ITEMS).join('');
  const windowTrace = useMemo(() => buildSlidingWindowTrace(windowText, MAX_ITEMS), [windowText]);
  const traceLength = mode === 'two-pointer' ? pointerTrace.length : windowTrace.length;
  const playback = usePlaygroundPlayback(Math.max(1, traceLength), 1450);
  const pointerStep = pointerTrace[Math.min(playback.step, Math.max(0, pointerTrace.length - 1))];
  const windowStep = windowTrace[Math.min(playback.step, Math.max(0, windowTrace.length - 1))];

  const resetForInput = () => { playback.setStep(0); setPredictionResult(null); };
  const changeMode = (next: Mode | ((previous: Mode) => Mode)) => {
    setMode(typeof next === 'function' ? next(mode) : next);
    resetForInput();
  };

  const leftColor = t.accentSecondary;
  const rightColor = t.accentPurple;
  const activeColor = t.accentTeal;
  const matchColor = t.accentPrimary;
  const items = mode === 'two-pointer' ? values.map(String) : [...windowText];
  const cellWidth = Math.min(54, 660 / Math.max(items.length, 1));
  const plotStart = (760 - cellWidth * items.length) / 2;
  const pointerWorked = !pointerStep
    ? 'Enter at least two ascending numbers to start the search.'
    : pointerStep.sum === null
      ? `L and R met at index ${pointerStep.left}; no pair was found.`
      : `${pointerStep.leftValue} + ${pointerStep.rightValue} = ${pointerStep.sum}; target T = ${target}.`;
  const windowWorked = windowStep
    ? `Current window “${windowStep.window}” has ${windowStep.right - windowStep.left + 1} characters; best length = ${windowStep.bestLength}.`
    : 'Type at least one character to start the window.';
  const currentExplanation = mode === 'two-pointer'
    ? pointerStep ? explanation(pointerStep.outcome) : 'The trace starts after the list is sorted and contains at least two numbers.'
    : !windowStep
      ? 'Type at least one character to start the window.'
      : windowStep.repeatedAt === null
        ? 'The new character is unique, so the window grows by one.'
        : `“${windowStep.character}” repeated, so L jumps past its earlier position.`;

  return (
    <VisualizationContainer
      title="Two pointers and sliding window playground"
      footer={compact ? undefined : 'Every comparison and window jump is computed from the values you type. Two pointers requires an ascending list; the sliding window solves longest substring without repeated characters.'}
    >
      {!compact && (
        <>
          <VisualizationHeader
            eyebrow="Live playground"
            title="Find a pair or a clean substring without checking every possibility"
            description="Two pointers discard impossible pairs from both ends of a sorted list. A sliding window remembers where repeats occurred, so it never starts over from the beginning."
          />
          <PillSelect<Mode>
            label="Problem pattern (how the search moves)"
            value={mode}
            onChange={changeMode}
            options={[
              { value: 'two-pointer', label: 'Pair with a target sum' },
              { value: 'sliding-window', label: 'Longest text without repeats' },
            ]}
          />
          {mode === 'two-pointer' ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(120px, 0.35fr)', gap: 12, marginBottom: 8 }}>
              <label style={{ minWidth: 0, fontSize: 15 }}>
                <span style={{ display: 'block', marginBottom: 4, fontWeight: 700 }}>Sorted numbers (the list we search)</span>
                <input aria-label="Sorted numbers" value={arrayText} onChange={(event) => { setArrayText(event.target.value); resetForInput(); }} style={inputStyle(t)} />
              </label>
              <label style={{ minWidth: 0, fontSize: 15 }}>
                <span style={{ display: 'block', marginBottom: 4, fontWeight: 700 }}>Target sum T</span>
                <input aria-label="Target sum" type="number" value={target} onChange={(event) => { setTarget(Number(event.target.value) || 0); resetForInput(); }} style={inputStyle(t)} />
              </label>
            </div>
          ) : (
            <label style={{ display: 'block', marginBottom: 8, fontSize: 15 }}>
              <span style={{ display: 'block', marginBottom: 4, fontWeight: 700 }}>Text to scan (up to {MAX_ITEMS} characters)</span>
              <input aria-label="Text to scan" maxLength={MAX_ITEMS} value={text} onChange={(event) => { setText(event.target.value); resetForInput(); }} style={inputStyle(t)} />
            </label>
          )}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
            <VizButton variant="secondary" onClick={() => { if (mode === 'two-pointer') { setArrayText(PRESETS.pair); setTarget(6); } else setText(PRESETS.repeat); resetForInput(); }}>Worked example</VizButton>
            <VizButton variant="secondary" onClick={() => { if (mode === 'two-pointer') { setArrayText(PRESETS.noPair); setTarget(7); } else setText(PRESETS.jump); resetForInput(); }}>Different shape</VizButton>
          </div>
          {mode === 'two-pointer' && (!sorted || values.length < 2) && (
            <p role="status" style={{ margin: '0 0 8px', color: t.accentDanger, fontSize: 15 }}>
              Enter at least two numbers in ascending order. The pointer rule is only correct for a sorted list.
            </p>
          )}
        </>
      )}

      <svg width="100%" viewBox="0 0 760 200" role="img" aria-label={mode === 'two-pointer' ? `Two pointers comparing values for target ${target}` : `Sliding window scanning ${windowText}`} style={{ display: 'block', fontFamily: FONT_FAMILY }}>
        <defs><clipPath id="pointer-window-clip"><rect x="24" y="20" width="712" height="160" /></clipPath></defs>
        <g clipPath="url(#pointer-window-clip)">
          <text x="24" y="28" fontSize={16} fontWeight={700} fill={t.textPrimary}>
            {mode === 'two-pointer' ? 'Sorted list: compare the two ends still possible' : 'Current window: every character inside it is unique'}
          </text>
          {items.map((item, index) => {
            const x = plotStart + index * cellWidth;
            const inWindow = mode === 'sliding-window' && windowStep && index >= windowStep.left && index <= windowStep.right;
            const atLeft = mode === 'two-pointer' ? index === pointerStep?.left : index === windowStep?.left;
            const atRight = mode === 'two-pointer' ? index === pointerStep?.right : index === windowStep?.right;
            const matched = mode === 'two-pointer' && pointerStep?.outcome === 'match' && (atLeft || atRight);
            const fill = matched ? matchColor : inWindow ? activeColor : t.surfaceAlt;
            const stroke = matched ? matchColor : atLeft ? leftColor : atRight ? rightColor : t.border;
            return (
              <g key={`${item}-${index}`}>
                <rect x={x + 3} y={70} width={cellWidth - 6} height={48} rx={5} fill={fill} fillOpacity={matched || inWindow ? 0.22 : 1} stroke={stroke} strokeWidth={atLeft || atRight ? 2.4 : 1.2} />
                <text x={x + cellWidth / 2} y={100} textAnchor="middle" fontSize={16} fontWeight={700} fill={t.textPrimary}>{item}</text>
                <text x={x + cellWidth / 2} y={138} textAnchor="middle" fontSize={14} fill={t.textSecondary}>{index}</text>
                {atLeft && <text x={x + cellWidth / 2} y={60} textAnchor="middle" fontSize={14} fontWeight={700} fill={leftColor}>L: left</text>}
                {atRight && <text x={x + cellWidth / 2} y={158} textAnchor="middle" fontSize={14} fontWeight={700} fill={rightColor}>{mode === 'two-pointer' ? 'R: right' : 'R: new character'}</text>}
              </g>
            );
          })}
          {items.length === 0 && <text x="380" y="104" textAnchor="middle" fontSize={16} fill={t.textSecondary}>Type an input above.</text>}
          {mode === 'sliding-window' && windowStep && (
            <path d={`M${plotStart + windowStep.left * cellWidth + 5} 126 V170 H${plotStart + (windowStep.right + 1) * cellWidth - 5} V126`} fill="none" stroke={activeColor} strokeWidth={2.5} />
          )}
        </g>
      </svg>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 18px', fontSize: 15, marginBottom: 6 }} aria-label="Diagram colours">
        {mode === 'two-pointer'
          ? <><span style={{ color: leftColor }}>● Left pointer L</span><span style={{ color: rightColor }}>● Right pointer R</span><span style={{ color: matchColor }}>● Matching pair</span></>
          : <><span style={{ color: activeColor }}>● Unique window</span><span style={{ color: leftColor }}>● Left edge L</span><span style={{ color: rightColor }}>● New character R</span></>}
      </div>

      {compact ? (
        <StickyRow>
          <StickyNote title={mode === 'two-pointer' ? 'Pair sum' : 'Window length'} latex={mode === 'two-pointer' ? String.raw`s=a_L+a_R` : String.raw`\text{length}=R-L+1`} color="yellow" tilt={-1}>
            <p>{mode === 'two-pointer' ? pointerWorked : windowWorked}</p>
          </StickyNote>
          <StickyNote title={`Step ${Math.min(playback.step + 1, Math.max(traceLength, 1))} of ${Math.max(traceLength, 1)}`} color="blue" tilt={1} live><p>{currentExplanation}</p></StickyNote>
        </StickyRow>
      ) : (
        <>
          <StickyRow>
            <StickyNote title={mode === 'two-pointer' ? 'Compare the ends' : 'Measure the window'} latex={mode === 'two-pointer' ? String.raw`s=a_L+a_R` : String.raw`\text{length}=R-L+1`} color="yellow" tilt={-1}>
              <p>{mode === 'two-pointer' ? 'aL and aR are the numbers at the left and right pointers; T is the target.' : 'L is the left edge and R is the newest character.'}</p>
            </StickyNote>
            <StickyNote title={mode === 'two-pointer' ? 'Discard one impossible end' : 'Jump past a repeat'} latex={mode === 'two-pointer' ? String.raw`s<T\Rightarrow L\leftarrow L+1,\quad s>T\Rightarrow R\leftarrow R-1` : String.raw`L\leftarrow\max(L,\operatorname{last}(c)+1)`} color="pink" tilt={1}>
              <p>{mode === 'two-pointer' ? 'Sorting makes this safe: moving the other pointer would move the sum in the wrong direction.' : 'last(c) is the earlier position of the new character c.'}</p>
            </StickyNote>
            <StickyNote title="Worked numbers" color="green" tilt={-1}><p style={{ fontVariantNumeric: 'tabular-nums' }}>{mode === 'two-pointer' ? pointerWorked : windowWorked}</p></StickyNote>
            <StickyNote title={`What just happened · step ${Math.min(playback.step + 1, Math.max(traceLength, 1))}`} color="blue" tilt={1} live><p>{currentExplanation}</p></StickyNote>
          </StickyRow>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
            <VizButton onClick={playback.toggle}>{playback.playing ? 'Pause' : 'Play'}</VizButton>
            <VizButton variant="secondary" onClick={playback.next}>Step →</VizButton>
            <VizButton variant="secondary" onClick={playback.reset}>Reset</VizButton>
          </div>
          <div style={{ marginTop: 10, paddingTop: 8, borderTop: `1px dashed ${t.border}`, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', fontSize: 15 }}>
            <strong style={{ color: t.accentWarn }}>Predict first:</strong>
            <span>{mode === 'two-pointer' ? 'For 1 + 6 = 7 with target 6, which pointer moves?' : 'When the second “a” arrives in “abca”, what happens to L?'}</span>
            <select aria-label="Prediction" value={prediction} onChange={(event) => { setPrediction(event.target.value); setPredictionResult(null); }} style={{ minHeight: 36, font: 'inherit', border: `1.5px solid ${t.border}`, borderRadius: RADIUS.sm, background: t.background, color: t.textPrimary }}>
              {mode === 'two-pointer' ? <><option value="left">Move L right</option><option value="right">Move R left</option><option value="stop">Stop</option></> : <><option value="left">L stays at 0</option><option value="right">L jumps to 1</option><option value="stop">The scan stops</option></>}
            </select>
            <VizButton variant="secondary" onClick={() => setPredictionResult(prediction === 'right')}>Run prediction</VizButton>
            {predictionResult !== null && <span role="status" style={{ color: predictionResult ? t.accentPrimary : t.accentDanger, fontWeight: 700 }}>{predictionResult ? 'Correct.' : mode === 'two-pointer' ? '7 is too large, so R moves left.' : 'The old “a” is at 0, so L jumps to 1.'}</span>}
          </div>
        </>
      )}
    </VisualizationContainer>
  );
}
