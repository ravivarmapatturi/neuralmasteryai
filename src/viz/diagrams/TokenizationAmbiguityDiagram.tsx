import { useMemo, useState } from 'react';
import { FONT_FAMILY, RADIUS, useVizTokens } from '../../theme/vizTokens';
import { StickyNote, StickyRow, VisualizationContainer, VizButton } from '../primitives';
import {
  compareTokenizers,
  explainTokenizationStep,
  type TokenSpan,
  type TokenizerMethod,
} from '../lib/tokenizationAmbiguity';
import { PredictChallenge } from './playgroundPrimitives';
import { useStepPlayback } from './useStepPlayback';

const EXAMPLES = [
  "Dr. Smith didn't arrive.",
  "I can't believe it's 3 p.m.",
  'New York-based teams shipped it!',
] as const;

const METHODS: { id: TokenizerMethod; label: string; plain: string; latex: string; color: 'yellow' | 'pink' | 'green' }[] = [
  { id: 'whitespace', label: 'Whitespace only', plain: 'Cut only where a space appears.', latex: String.raw`T_{\mathrm{space}}(x)=\operatorname{split}(x,\;\text{spaces})`, color: 'yellow' },
  { id: 'punctuation', label: 'Words + punctuation', plain: 'Make punctuation its own token.', latex: String.raw`T_{\mathrm{punct}}(x)=\text{words}\;\cup\;\text{punctuation}`, color: 'pink' },
  { id: 'language-aware', label: 'Language-aware rules', plain: 'Keep chosen abbreviations and contractions together.', latex: String.raw`T_{\mathrm{rules}}(x)=T(x;\;\text{kept words})`, color: 'green' },
];

const PREDICT_OPTIONS = [
  'Language-aware rules keep “Dr.” together and split the final period',
  'Whitespace always finds the most linguistic tokens',
  'Every policy returns the same list',
] as const;

function short(text: string, max = 15): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function layoutTokens(tokens: readonly TokenSpan[], maxWidth = 596) {
  const placed: { token: TokenSpan; x: number; width: number }[] = [];
  let x = 0;
  for (const token of tokens) {
    const width = Math.max(44, Math.min(112, token.text.length * 9 + 20));
    if (x + width > maxWidth) break;
    placed.push({ token, x, width });
    x += width + 7;
  }
  return placed;
}

function TokenizationPlayground({ compact }: { compact: boolean }) {
  const t = useVizTokens();
  const [text, setText] = useState<string>(EXAMPLES[0]);
  const [method, setMethod] = useState<TokenizerMethod>('language-aware');
  const [keepContractions, setKeepContractions] = useState(true);
  const [keepAbbreviations, setKeepAbbreviations] = useState(true);
  const [lowercase, setLowercase] = useState(false);
  const [prediction, setPrediction] = useState<number | null>(null);
  const playback = useStepPlayback(4, 1900, 3);
  const comparison = useMemo(() => compareTokenizers(text, { keepContractions, keepAbbreviations, lowercase }), [text, keepContractions, keepAbbreviations, lowercase]);
  const activeTokens = comparison[method];
  const caption = explainTokenizationStep(text, activeTokens, method, playback.step);

  const methodColors: Record<TokenizerMethod, string> = {
    whitespace: t.accentSecondary,
    punctuation: t.accentPurple,
    'language-aware': t.accentPrimary,
  };
  const inputStyle = {
    width: '100%',
    boxSizing: 'border-box' as const,
    minHeight: 38,
    padding: '6px 9px',
    border: `1.5px solid ${t.border}`,
    borderRadius: RADIUS.sm,
    background: t.background,
    color: t.textPrimary,
    fontFamily: FONT_FAMILY,
    fontSize: 15,
  };
  const selectedMethod = METHODS.find((item) => item.id === method) ?? METHODS[2];
  const setPolicy = (next: TokenizerMethod) => {
    setMethod(next);
    setPrediction(null);
    playback.setStep(0);
  };

  return (
    <>
      {!compact && (
        <>
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 18, fontWeight: 700 }}>Tokenization ambiguity playground</div>
            <p style={{ margin: '2px 0 0', fontSize: 15, lineHeight: 1.5, color: t.textSecondary }}>
              Tokenization turns one text string into pieces a model can count, label, or look up without breaking useful units by accident.
            </p>
          </div>
          <label style={{ display: 'block', fontSize: 15 }}>
            <span style={{ display: 'block', marginBottom: 4, fontWeight: 700 }}>Text to split into tokens</span>
            <input aria-label="Text to split into tokens" value={text} maxLength={90} onChange={(event) => { setText(event.target.value); playback.setStep(0); }} style={inputStyle} />
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 7 }}>
            {EXAMPLES.map((example, index) => <button key={example} type="button" onClick={() => { setText(example); playback.setStep(0); }} style={{ minHeight: 38, padding: '6px 9px', borderRadius: RADIUS.sm, border: `1px solid ${t.border}`, background: 'transparent', color: t.textPrimary, fontFamily: FONT_FAMILY, fontSize: 15, cursor: 'pointer' }}>Example {index + 1}</button>)}
          </div>
          <fieldset style={{ border: 0, padding: 0, margin: '9px 0 0', fontSize: 15 }}>
            <legend style={{ marginBottom: 4, fontWeight: 700 }}>Boundary policy (where it cuts)</legend>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {METHODS.map((item) => {
                const active = item.id === method;
                const color = methodColors[item.id];
                return <button key={item.id} type="button" aria-pressed={active} onClick={() => setPolicy(item.id)} style={{ minHeight: 38, padding: '6px 10px', borderRadius: RADIUS.sm, border: `1px solid ${active ? color : t.border}`, background: active ? color : 'transparent', color: active ? t.background : t.textPrimary, fontFamily: FONT_FAMILY, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>{item.label}</button>;
              })}
            </div>
          </fieldset>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 8 }}>
            {[
              { label: 'Keep contractions together', value: keepContractions, set: setKeepContractions },
              { label: 'Keep known abbreviations together', value: keepAbbreviations, set: setKeepAbbreviations },
              { label: 'Lowercase the output', value: lowercase, set: setLowercase },
            ].map((control) => (
              <button key={control.label} type="button" aria-pressed={control.value} onClick={() => { control.set(!control.value); playback.setStep(0); }} style={{ minHeight: 38, padding: '6px 10px', borderRadius: RADIUS.sm, border: `1px solid ${control.value ? t.accentTeal : t.border}`, background: control.value ? t.surfaceAlt : 'transparent', color: control.value ? t.accentTeal : t.textPrimary, fontFamily: FONT_FAMILY, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
                {control.label}: {control.value ? 'yes' : 'no'}
              </button>
            ))}
          </div>
        </>
      )}

      <svg width="100%" viewBox="0 0 810 332" role="img" aria-label={`${selectedMethod.label} splits the text into ${activeTokens.length} tokens`} style={{ display: 'block', fontFamily: FONT_FAMILY }}>
        <defs><clipPath id="token-rows-clip"><rect x="192" y="78" width="602" height="224" /></clipPath></defs>
        <text x="14" y="28" fontSize="15" fontWeight="700" fill={t.textPrimary}>Raw text x</text>
        <text x="192" y="28" fontSize="16" fill={t.textPrimary}>{short(text || '(empty text)', 72)}</text>
        <line x1="192" y1="42" x2="794" y2="42" stroke={t.border} strokeWidth={1.2} />
        <text x="192" y="62" fontSize="14" fill={t.textSecondary}>The same characters can produce different token boundaries:</text>

        {METHODS.map((item, methodIndex) => {
          const rowTokens = comparison[item.id];
          const placed = layoutTokens(rowTokens);
          const color = methodColors[item.id];
          const active = method === item.id;
          const y = 88 + methodIndex * 72;
          return (
            <g key={item.id} opacity={playback.step === 0 ? 0.28 : active ? 1 : 0.62} onClick={() => setPolicy(item.id)} style={{ cursor: 'pointer' }}>
              <text x="14" y={y + 20} fontSize="15" fontWeight={active ? 700 : 400} fill={color}>{item.label}</text>
              <text x="14" y={y + 41} fontSize="14" fill={t.textSecondary}>{rowTokens.length} tokens</text>
              <g clipPath="url(#token-rows-clip)">
                {placed.map(({ token, x, width }, index) => (
                  <g key={`${token.start}-${token.end}-${index}`}>
                    <rect x={192 + x} y={y} width={width} height={42} rx={6} fill={color} fillOpacity={active ? 0.18 : 0.1} stroke={color} strokeWidth={active ? 2 : 1.2} />
                    <text x={192 + x + width / 2} y={y + 18} textAnchor="middle" fontSize="14" fontWeight={active ? 700 : 400} fill={color}>{short(token.text, 11)}</text>
                    <text x={192 + x + width / 2} y={y + 35} textAnchor="middle" fontSize="14" fill={t.textSecondary}>{token.start}–{token.end}</text>
                  </g>
                ))}
              </g>
              {placed.length < rowTokens.length && <text x="744" y={y + 57} textAnchor="end" fontSize="14" fill={t.textMuted}>+{rowTokens.length - placed.length} more</text>}
            </g>
          );
        })}
        <text x="14" y="322" fontSize="14" fill={methodColors.whitespace}>■ whitespace</text>
        <text x="190" y="322" fontSize="14" fill={methodColors.punctuation}>■ punctuation</text>
        <text x="366" y="322" fontSize="14" fill={methodColors['language-aware']}>■ language-aware rules</text>
      </svg>

      {compact ? (
        <StickyRow>
          <StickyNote title={selectedMethod.label} latex={selectedMethod.latex} color={selectedMethod.color} tilt={-1}>
            <p>{selectedMethod.plain} Result: {activeTokens.length} tokens.</p>
          </StickyNote>
          <StickyNote title={`What just happened · step ${playback.step + 1}/4`} color="blue" tilt={1} live><p>{caption}</p></StickyNote>
        </StickyRow>
      ) : (
        <>
          <StickyRow>
            {METHODS.map((item, index) => (
              <StickyNote key={item.id} title={item.label} latex={item.latex} color={item.color} tilt={index % 2 ? 1 : -1} active={method === item.id} onSelect={() => setPolicy(item.id)}>
                <p>{item.plain}</p>
              </StickyNote>
            ))}
          </StickyRow>
          <StickyRow>
            <StickyNote title="Worked numbers" color="green" tilt={1}>
              <p style={{ fontVariantNumeric: 'tabular-nums' }}>x has {text.length} characters. T(x) has <strong>{activeTokens.length} tokens</strong>: [{activeTokens.map((token) => `“${token.text}”`).join(', ')}].</p>
            </StickyNote>
            <StickyNote title={`What just happened · step ${playback.step + 1}/4`} color="blue" tilt={-1} live><p>{caption}</p></StickyNote>
          </StickyRow>

          <PredictChallenge
            prompt="Which policy can keep “Dr.” together but still split the period after “arrive”?"
            options={PREDICT_OPTIONS}
            correctIndex={0}
            selected={prediction}
            onSelect={setPrediction}
            explanation="The language-aware pass recognizes Dr. as an abbreviation, then treats the final full stop as sentence punctuation."
            actionLabel="Run that policy"
            onAction={() => { setText(EXAMPLES[0]); setKeepAbbreviations(true); setKeepContractions(true); setMethod('language-aware'); playback.playFromStart(); }}
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
            <VizButton onClick={playback.toggle}>{playback.playing ? 'Pause' : 'Play'}</VizButton>
            <VizButton variant="secondary" onClick={playback.next}>Step →</VizButton>
            <VizButton variant="secondary" onClick={playback.reset}>Reset</VizButton>
            <span style={{ marginLeft: 'auto', fontSize: 15, color: t.textSecondary }}>The small numbers are start–end character positions in the original text.</span>
          </div>
        </>
      )}
    </>
  );
}

export default function TokenizationAmbiguityDiagram({ compact = false }: { compact?: boolean } = {}) {
  return (
    <VisualizationContainer title="Tokenization ambiguity playground" footer="These are transparent character-boundary rules, not a learned model. Real NLP libraries contain larger abbreviation lists and language-specific rules, but they make the same boundary decisions shown here.">
      <TokenizationPlayground compact={compact} />
    </VisualizationContainer>
  );
}
