import { useMemo, useState } from 'react';
import { FONT_FAMILY, RADIUS, useVizTokens } from '../../theme/vizTokens';
import { StickyNote, StickyRow, VisualizationContainer, VizButton } from '../primitives';
import { calculateBleu, explainBleuStep } from '../lib/bleuScore';
import { PredictChallenge } from './playgroundPrimitives';
import { useStepPlayback } from './useStepPlayback';

const PRESETS = [
  { label: 'Exact wording', reference: 'the cat is on the mat', candidate: 'the cat is on the mat' },
  { label: 'Shorter wording', reference: 'the cat is on the mat', candidate: 'the cat is on mat' },
  { label: 'Valid paraphrase', reference: 'the cat is on the mat', candidate: 'a feline rests upon the rug' },
  { label: 'Words reordered', reference: 'the cat is on the mat', candidate: 'the mat is on the cat' },
] as const;

const PREDICT_OPTIONS = [
  'Yes, because BLEU counts matching word groups rather than meaning',
  'No, equal meaning always gives BLEU 100',
  'No, BLEU reads both sentences with a language model',
] as const;

function percent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function short(text: string, length = 12): string {
  return text.length > length ? `${text.slice(0, length - 1)}…` : text;
}

function BleuScorePlayground({ compact }: { compact: boolean }) {
  const t = useVizTokens();
  const [reference, setReference] = useState<string>(PRESETS[1].reference);
  const [candidate, setCandidate] = useState<string>(PRESETS[1].candidate);
  const [maxOrder, setMaxOrder] = useState(4);
  const [lowercase, setLowercase] = useState(true);
  const [prediction, setPrediction] = useState<number | null>(null);
  const playback = useStepPlayback(4, 1900, 3);
  const result = useMemo(() => calculateBleu({ reference, candidate, maxOrder, lowercase }), [reference, candidate, maxOrder, lowercase]);
  const activeRow = result.rows[Math.max(0, result.effectiveOrder - 1)];
  const caption = explainBleuStep(result, playback.step);

  const candidateColor = t.accentPurple;
  const referenceColor = t.accentSecondary;
  const matchColor = t.accentPrimary;
  const missColor = t.accentDanger;
  const penaltyColor = t.accentWarn;
  const inputStyle = {
    width: '100%',
    minWidth: 0,
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

  const applyPreset = (preset: (typeof PRESETS)[number]) => {
    setReference(preset.reference);
    setCandidate(preset.candidate);
    setPrediction(null);
    playback.setStep(0);
  };

  const shownCandidate = result.candidateTokens.slice(0, 8);
  const shownReference = result.referenceTokens.slice(0, 8);
  const shownNgrams = activeRow?.candidateNgrams.slice(0, 4) ?? [];
  const tokenWidth = 72;

  return (
    <>
      {!compact && (
        <>
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 18, fontWeight: 700 }}>BLEU score explorer</div>
            <p style={{ margin: '2px 0 0', fontSize: 15, lineHeight: 1.5, color: t.textSecondary }}>
              BLEU gives us a quick translation check by counting candidate word groups that also appear in a human reference.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 10 }}>
            <label style={{ minWidth: 0, fontSize: 15 }}>
              <span style={{ display: 'block', marginBottom: 4, fontWeight: 700 }}>Human reference translation</span>
              <input aria-label="Human reference translation" value={reference} maxLength={100} onChange={(event) => { setReference(event.target.value); playback.setStep(0); }} style={inputStyle} />
            </label>
            <label style={{ minWidth: 0, fontSize: 15 }}>
              <span style={{ display: 'block', marginBottom: 4, fontWeight: 700 }}>Model candidate translation</span>
              <input aria-label="Model candidate translation" value={candidate} maxLength={100} onChange={(event) => { setCandidate(event.target.value); playback.setStep(0); }} style={inputStyle} />
            </label>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: '8px 14px', marginTop: 9, fontSize: 15 }}>
            <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
              <legend style={{ marginBottom: 4, fontWeight: 700 }}>Longest word group n</legend>
              <div style={{ display: 'flex', gap: 5 }}>
                {[1, 2, 3, 4].map((order) => (
                  <button key={order} type="button" aria-pressed={maxOrder === order} onClick={() => { setMaxOrder(order); playback.setStep(0); }} style={{ minWidth: 38, minHeight: 38, borderRadius: RADIUS.sm, border: `1px solid ${maxOrder === order ? referenceColor : t.border}`, background: maxOrder === order ? referenceColor : 'transparent', color: maxOrder === order ? t.background : t.textPrimary, fontFamily: FONT_FAMILY, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>{order}</button>
                ))}
              </div>
            </fieldset>
            <button type="button" aria-pressed={lowercase} onClick={() => { setLowercase((value) => !value); playback.setStep(0); }} style={{ minHeight: 38, padding: '6px 10px', borderRadius: RADIUS.sm, border: `1px solid ${lowercase ? matchColor : t.border}`, background: lowercase ? t.surfaceAlt : 'transparent', color: lowercase ? matchColor : t.textPrimary, fontFamily: FONT_FAMILY, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
              Ignore letter case: {lowercase ? 'yes' : 'no'}
            </button>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {PRESETS.map((preset) => <button key={preset.label} type="button" onClick={() => applyPreset(preset)} style={{ minHeight: 38, padding: '6px 9px', borderRadius: RADIUS.sm, border: `1px solid ${t.border}`, background: 'transparent', color: t.textPrimary, fontFamily: FONT_FAMILY, fontSize: 15, cursor: 'pointer' }}>{preset.label}</button>)}
            </div>
          </div>
        </>
      )}

      <svg width="100%" viewBox="0 0 760 292" role="img" aria-label={`BLEU compares ${result.candidateTokens.length} candidate words with ${result.referenceTokens.length} reference words and returns ${percent(result.score)}`} style={{ display: 'block', fontFamily: FONT_FAMILY }}>
        <defs>
          <clipPath id="bleu-token-clip"><rect x="110" y="18" width="628" height="102" /></clipPath>
          <clipPath id="bleu-ngram-clip"><rect x="110" y="154" width="628" height="74" /></clipPath>
        </defs>
        <text x="14" y="42" fontSize="15" fontWeight="700" fill={candidateColor}>Candidate</text>
        <text x="14" y="94" fontSize="15" fontWeight="700" fill={referenceColor}>Reference</text>
        <g clipPath="url(#bleu-token-clip)">
          {shownCandidate.map((token, index) => (
            <g key={`candidate-${index}`}>
              <rect x={110 + index * tokenWidth} y={20} width={66} height={34} rx={6} fill={candidateColor} fillOpacity={0.16} stroke={candidateColor} strokeWidth={1.4} />
              <text x={143 + index * tokenWidth} y={43} textAnchor="middle" fontSize="14" fill={candidateColor}>{short(token, 9)}</text>
            </g>
          ))}
          {shownReference.map((token, index) => (
            <g key={`reference-${index}`}>
              <rect x={110 + index * tokenWidth} y={72} width={66} height={34} rx={6} fill={referenceColor} fillOpacity={0.14} stroke={referenceColor} strokeWidth={1.4} />
              <text x={143 + index * tokenWidth} y={95} textAnchor="middle" fontSize="14" fill={referenceColor}>{short(token, 9)}</text>
            </g>
          ))}
        </g>
        {(result.candidateTokens.length > 8 || result.referenceTokens.length > 8) && <text x="738" y="121" textAnchor="end" fontSize="14" fill={t.textMuted}>first 8 words shown</text>}

        <line x1="14" y1="136" x2="746" y2="136" stroke={t.border} strokeWidth={1.2} strokeDasharray="5 4" />
        <text x="14" y="174" fontSize="15" fontWeight="700" fill={t.textPrimary}>{activeRow ? `${activeRow.order}-word groups` : 'No word groups'}</text>
        <g clipPath="url(#bleu-ngram-clip)">
          {shownNgrams.map((gram, index) => {
            const matched = activeRow?.candidateMatches[index] ?? false;
            const color = matched ? matchColor : missColor;
            return (
              <g key={`${gram}-${index}`}>
                <rect x={110 + index * 154} y={154} width={144} height={48} rx={7} fill={color} fillOpacity={0.15} stroke={color} strokeWidth={1.6} />
                <text x={182 + index * 154} y={176} textAnchor="middle" fontSize="14" fontWeight={700} fill={color}>{short(gram, 19)}</text>
                <text x={182 + index * 154} y={194} textAnchor="middle" fontSize="14" fill={color}>{matched ? 'clipped match' : 'not in reference'}</text>
              </g>
            );
          })}
        </g>
        {activeRow && activeRow.candidateNgrams.length > 4 && <text x="738" y="224" textAnchor="end" fontSize="14" fill={t.textMuted}>first 4 groups shown</text>}

        <g opacity={playback.step >= 2 ? 1 : 0.28}>
          <text x="14" y="254" fontSize="15" fill={penaltyColor}>Brevity penalty {result.brevityPenalty.toFixed(3)}</text>
          <line x1="178" y1="249" x2="348" y2="249" stroke={penaltyColor} strokeWidth={5} strokeLinecap="round" opacity={0.45} />
        </g>
        <g opacity={playback.step >= 3 ? 1 : 0.28}>
          <text x="430" y="254" fontSize="15" fill={matchColor}>Final BLEU</text>
          <circle cx="610" cy="248" r="32" fill={matchColor} fillOpacity={0.14} stroke={matchColor} strokeWidth={2.2} />
          <text x="610" y="255" textAnchor="middle" fontSize="18" fontWeight="700" fill={matchColor}>{percent(result.score)}</text>
        </g>
        <text x="14" y="284" fontSize="14" fill={candidateColor}>■ candidate words</text>
        <text x="190" y="284" fontSize="14" fill={referenceColor}>■ reference words</text>
        <text x="370" y="284" fontSize="14" fill={matchColor}>■ matched group</text>
        <text x="540" y="284" fontSize="14" fill={missColor}>■ missed group</text>
      </svg>

      {compact ? (
        <StickyRow>
          <StickyNote title="BLEU" latex={String.raw`\mathrm{BLEU}=\mathrm{BP}\cdot\exp\!\left(\frac{1}{N}\sum_{n=1}^{N}\log p_n\right)`} color="yellow" tilt={-1}>
            <p style={{ textAlign: 'center' }}>N = {result.effectiveOrder}, BP = {result.brevityPenalty.toFixed(3)}, BLEU = {percent(result.score)}.</p>
          </StickyNote>
          <StickyNote title={`What just happened · step ${playback.step + 1}/4`} color="blue" tilt={1} live><p>{caption}</p></StickyNote>
        </StickyRow>
      ) : (
        <>
          <StickyRow>
            <StickyNote title="Clipped n-gram precision" latex={String.raw`p_n=\frac{\sum_g \min\!\left(C_{\mathrm{cand}}(g),C_{\mathrm{ref}}(g)\right)}{\sum_g C_{\mathrm{cand}}(g)}`} color="pink" tilt={-1}>
              <p>pₙ is precision for n-word groups. A repeated group can match only as many times as the reference contains it.</p>
            </StickyNote>
            <StickyNote title="Brevity penalty" latex={String.raw`\mathrm{BP}=\min\!\left(1,e^{\,1-r/c}\right)`} color="orange" tilt={1}>
              <p>r = {result.referenceTokens.length} reference words; c = {result.candidateTokens.length} candidate words; BP = {result.brevityPenalty.toFixed(3)}.</p>
            </StickyNote>
            <StickyNote title="BLEU" latex={String.raw`\mathrm{BLEU}=\mathrm{BP}\cdot\exp\!\left(\frac{1}{N}\sum_{n=1}^{N}\log p_n\right)`} color="yellow" tilt={-1}>
              <p>N = {result.effectiveOrder} is the longest group size; this combines every precision order with BP.</p>
            </StickyNote>
          </StickyRow>
          <StickyRow>
            <StickyNote title="Worked numbers" color="green" tilt={1}>
              <p style={{ fontVariantNumeric: 'tabular-nums' }}>{result.rows.map((row) => `p${row.order}=${row.clippedMatches}/${row.totalCandidateNgrams}=${row.precision.toFixed(3)}`).join(' · ') || 'No n-grams'}.</p>
              <p><strong>{result.brevityPenalty.toFixed(3)} × {result.geometricMean.toFixed(3)} = {result.score.toFixed(3)}</strong>.</p>
            </StickyNote>
            <StickyNote title={`What just happened · step ${playback.step + 1}/4`} color="blue" tilt={-1} live><p>{caption}</p></StickyNote>
          </StickyRow>

          <PredictChallenge
            prompt="A translation keeps the meaning but changes every important word. Can BLEU still be near zero?"
            options={PREDICT_OPTIONS}
            correctIndex={0}
            selected={prediction}
            onSelect={setPrediction}
            explanation="BLEU sees n-gram overlap, so a valid paraphrase can receive 0 when none of its groups match the single reference."
            actionLabel="Run the paraphrase"
            onAction={() => { applyPreset(PRESETS[2]); playback.playFromStart(); }}
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
            <VizButton onClick={playback.toggle}>{playback.playing ? 'Pause' : 'Play'}</VizButton>
            <VizButton variant="secondary" onClick={playback.next}>Step →</VizButton>
            <VizButton variant="secondary" onClick={playback.reset}>Reset</VizButton>
            <span style={{ marginLeft: 'auto', fontSize: 15, color: t.textSecondary }}>n means the number of consecutive words in one group.</span>
          </div>
        </>
      )}
    </>
  );
}

export default function BleuScoreDiagram({ compact = false }: { compact?: boolean } = {}) {
  return (
    <VisualizationContainer title="BLEU score explorer" footer="This is sentence-level BLEU without smoothing: clipped 1-to-N-gram precisions, their geometric mean, and the standard brevity penalty are computed from the text you type.">
      <BleuScorePlayground compact={compact} />
    </VisualizationContainer>
  );
}
