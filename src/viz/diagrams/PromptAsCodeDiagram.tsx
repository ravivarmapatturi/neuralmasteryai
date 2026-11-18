import { useAutoCycle } from '../primitives';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer } from '../primitives';
import { getConceptColor } from './diagramSystem';

/** A prompt edit run against a fixed test set -- click "run tests" to
 * see it flagged as a real regression, exactly like a code change would
 * be. */
export default function PromptAsCodeDiagram() {
  const t = useVizTokens();
  const { value: testIdx, pick } = useAutoCycle(2, 3500, 0);
  const tested = testIdx === 0;
  const color = getConceptColor(t, 'attention');
  const badColor = t.accentDanger;
  const okColor = t.accentPrimary;

  const CASES = [
    { input: 'Summarize this contract', pass: true },
    { input: 'Extract the total amount', pass: true },
    { input: 'List the parties involved', pass: false },
  ];

  return (
    <VisualizationContainer footer={tested ? '1 of 3 fixed test cases regressed after the prompt edit -- caught before this ever reached production, the same way a unit test would catch a code regression.' : 'A prompt template was just edited. Click "run tests" to check it against the fixed test set.'}>
      <button type="button" onClick={() => pick(tested ? 1 : 0)} style={{ marginBottom: 10, padding: '6px 12px', borderRadius: 6, border: `1px solid ${color}`, background: tested ? `${color}15` : 'transparent', color, cursor: 'pointer', fontSize: 11.5, fontWeight: 700 }}>
        {tested ? 'Tests run' : 'Run tests against prompt edit'}
      </button>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {CASES.map((c) => (
          <div key={c.input} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0.7rem', borderRadius: 7, background: tested ? (c.pass ? `${okColor}12` : `${badColor}15`) : t.surfaceAlt }}>
            <span style={{ fontSize: 11, color: t.textSecondary }}>&ldquo;{c.input}&rdquo;</span>
            {tested && <span style={{ fontSize: 10.5, fontWeight: 700, color: c.pass ? okColor : badColor }}>{c.pass ? '✓ pass' : '✗ regressed'}</span>}
          </div>
        ))}
      </div>
    </VisualizationContainer>
  );
}
