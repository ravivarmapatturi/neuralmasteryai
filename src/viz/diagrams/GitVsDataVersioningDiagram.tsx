import { useVizTokens } from '../../theme/vizTokens';
import { SelectableRow, VisualizationContainer, useAutoCycle, usePrefersReducedMotion } from '../primitives';
import { getConceptColor } from './diagramSystem';

type Mode = 'code' | 'data';

/** Git's diffing model works great line-by-line for text; a 500GB binary
 * dataset has no meaningful "diff" to compute or store efficiently --
 * toggle to see why the same tool breaks down. */
export default function GitVsDataVersioningDiagram() {
  const t = useVizTokens();
  const reducedMotion = usePrefersReducedMotion();
  const cyc = useAutoCycle(2, 3800);
  const mode: Mode = cyc.value === 0 ? 'data' : 'code';
  const okColor = t.accentPrimary;
  const badColor = t.accentDanger;
  const color = getConceptColor(t, 'attention');

  return (
    <VisualizationContainer
      footer={mode === 'code'
        ? 'Code: a one-line change produces a tiny, meaningful diff -- git stores that diff efficiently, and "which version introduced this bug" is a fast, precise git blame away.'
        : 'Data: a 500GB dataset has no meaningful line-by-line diff to compute -- git either stores the whole file again per commit (huge) or chokes trying to diff binary content. "Which exact version trained model v3" becomes unanswerable with git alone.'}
    >
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <SelectableRow
          selected={mode === 'code'}
          label="Code"
          onSelect={() => cyc.pick(1)}
          onMouseEnter={() => cyc.pick(1)}
          style={{
            flex: 1,
            padding: '0.6rem',
            borderRadius: 8,
            background: mode === 'code' ? `${color}18` : t.surfaceAlt,
            border: `1.5px solid ${mode === 'code' ? color : t.border}`,
            boxShadow: mode === 'code' && !reducedMotion ? `0 0 6px ${color}33` : 'none',
            textAlign: 'center',
            transition: 'all 0.2s ease',
          }}
        >
          <span style={{ fontSize: 11.5, fontWeight: 700, color: mode === 'code' ? color : t.textPrimary }}>Code</span>
        </SelectableRow>
        <SelectableRow
          selected={mode === 'data'}
          label="500GB dataset"
          onSelect={() => cyc.pick(0)}
          onMouseEnter={() => cyc.pick(0)}
          style={{
            flex: 1,
            padding: '0.6rem',
            borderRadius: 8,
            background: mode === 'data' ? `${color}18` : t.surfaceAlt,
            border: `1.5px solid ${mode === 'data' ? color : t.border}`,
            boxShadow: mode === 'data' && !reducedMotion ? `0 0 6px ${color}33` : 'none',
            textAlign: 'center',
            transition: 'all 0.2s ease',
          }}
        >
          <span style={{ fontSize: 11.5, fontWeight: 700, color: mode === 'data' ? color : t.textPrimary }}>500GB dataset</span>
        </SelectableRow>
      </div>
      <div
        style={{
          padding: '0.7rem',
          borderRadius: 8,
          background: mode === 'code' ? `${okColor}12` : `${badColor}12`,
          border: `1.5px solid ${mode === 'code' ? okColor : badColor}`,
          boxShadow: !reducedMotion ? `0 0 8px ${mode === 'code' ? okColor : badColor}22` : 'none',
          textAlign: 'center',
          transition: 'all 0.3s ease',
        }}
      >
        <span style={{ fontSize: 11, fontWeight: 700, color: mode === 'code' ? okColor : badColor }}>
          {mode === 'code' ? '✓ small, efficient, meaningful diff' : '✗ no efficient diff -- git\'s model breaks down'}
        </span>
      </div>
    </VisualizationContainer>
  );
}