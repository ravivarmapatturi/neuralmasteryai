import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, VizButton } from '../primitives';
import { DIAGRAM_TYPE, DIAGRAM_RADIUS } from './diagramSystem';

// A concrete, checkable example: "is 91 prime?" Trace A reaches the right
// answer through an invalid rule; Trace B does the actually-correct
// factorization but contradicts its own work in the final line. Grading
// each trace two different ways is real boolean logic on real content,
// not a fabricated conclusion.
const TRACE_A = { steps: ['91 is an odd number.', 'Odd numbers are not prime. invalid rule -- oddness says nothing about primality'], answer: 'Not prime', outcomeCorrect: true, processValid: false };
const TRACE_B = { steps: ['Test small primes: 91 / 7 = 13 exactly.', '91 = 7 × 13, a valid factorization.'], answer: 'Prime', outcomeCorrect: false, processValid: true };

export default function ProcessVsOutcomeDiagram() {
  const t = useVizTokens();
  const [tested, setTested] = useState(false);

  const Badge = ({ ok, label }: { ok: boolean; label: string }) => (
    <span style={{ padding: '2px 8px', borderRadius: DIAGRAM_RADIUS.chip, fontSize: 11, fontWeight: 700, background: ok ? `${t.accentPrimary}25` : `${t.accentDanger}25`, color: ok ? t.accentPrimary : t.accentDanger }}>
      {ok ? 'PASS' : 'FAIL'} — {label}
    </span>
  );

  return (
    <VisualizationContainer footer={tested
      ? 'Trace A\'s rule ("odd ⇒ not prime") applied to 97 says "not prime" -- but 97 IS prime. Outcome-based grading called Trace A correct on the original question and never caught this; process-based grading would have flagged the invalid rule immediately, before it ever got tested on a case where it fails.'
      : 'Both traces answer the SAME original question ("is 91 prime?"). Outcome-based grading only looks at the final line; process-based grading reads the actual reasoning.'}>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {[TRACE_A, TRACE_B].map((trace, i) => (
          <div key={i} style={{ flex: 1, minWidth: 220, padding: 10, borderRadius: 8, background: t.surfaceAlt, border: `1px solid ${t.border}` }}>
            <div style={{ fontSize: DIAGRAM_TYPE.label.size, fontWeight: 700, color: t.textPrimary, marginBottom: 6 }}>Trace {i === 0 ? 'A' : 'B'}</div>
            {trace.steps.map((s, si) => (
              <div key={si} style={{ fontSize: 12, color: t.textSecondary, marginBottom: 3 }}>{si + 1}. {s}</div>
            ))}
            <div style={{ fontSize: 12, fontWeight: 700, color: t.textPrimary, marginTop: 4 }}>Final answer: {trace.answer}</div>
            <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
              <Badge ok={trace.outcomeCorrect} label="outcome-based" />
              <Badge ok={trace.processValid} label="process-based" />
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 10 }}>
        <VizButton onClick={() => setTested(true)} disabled={tested}>Test Trace A's rule on a new number (97)</VizButton>
      </div>
    </VisualizationContainer>
  );
}
