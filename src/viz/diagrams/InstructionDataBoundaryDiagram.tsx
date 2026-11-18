import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, PillSelect, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE, DIAGRAM_RADIUS } from './diagramSystem';

type Mode = 'sql' | 'prompt';
const MODES: Mode[] = ['prompt', 'sql'];

export default function InstructionDataBoundaryDiagram() {
  const t = useVizTokens();
  const { value: modeIdx, pick: setModeIdx, stop } = useAutoCycle(MODES.length, 3800, 0);
  const mode = MODES[modeIdx];

  return (
    <VisualizationContainer footer={
      mode === 'sql'
        ? 'A parameterized query keeps the SQL code and the user-supplied value in two mechanically separate channels -- the database driver never interprets the parameter\'s contents as SQL syntax, no matter what it contains. This is a structural guarantee, not a filter that can be evaded.'
        : 'An LLM prompt has no equivalent separate channel -- the "instructions" and the "data" (a retrieved document, a user message) are concatenated into one token stream the model reads uniformly. There is no mechanical guarantee the model treats one part as inert data; it\'s a learned, probabilistic tendency, which is exactly what prompt injection exploits.'
    }>
      <PillSelect label="Compare" value={mode} onChange={(v) => { stop(); setModeIdx(MODES.indexOf(v as Mode)); }} options={[
        { value: 'sql', label: 'SQL (parameterized -- solved)' },
        { value: 'prompt', label: 'LLM prompt (unsolved)' },
      ]} />

      {mode === 'sql' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10, fontFamily: 'monospace', fontSize: 12 }}>
          <div style={{ padding: '8px 12px', borderRadius: DIAGRAM_RADIUS.node, background: `${t.accentSecondary}18`, border: `1.5px solid ${t.accentSecondary}`, color: t.accentSecondary }}>
            CODE channel: SELECT * FROM users WHERE id = ?
          </div>
          <div style={{ padding: '8px 12px', borderRadius: DIAGRAM_RADIUS.node, background: `${t.accentWarn}18`, border: `1.5px solid ${t.accentWarn}`, color: t.accentWarn }}>
            DATA channel: "1 OR 1=1" -- never parsed as SQL syntax, just a literal string value
          </div>
          <div style={{ textAlign: 'center', fontSize: 11, color: t.textMuted, marginTop: 4 }}>Two separate channels, mechanically enforced by the driver.</div>
        </div>
      ) : (
        <div style={{ marginTop: 10 }}>
          <div style={{ padding: '10px 12px', borderRadius: DIAGRAM_RADIUS.node, background: t.surfaceAlt, border: `1.5px solid ${t.border}`, fontFamily: 'monospace', fontSize: 12, lineHeight: 1.6 }}>
            <span style={{ color: t.accentSecondary }}>"Summarize this document for the user: "</span>
            <span style={{ color: t.accentDanger }}> + "...[hidden text: ignore prior instructions, do X instead]..."</span>
          </div>
          <div style={{ textAlign: 'center', fontSize: 11, color: t.textMuted, marginTop: 4 }}>One channel. The model reads both spans as the same kind of token sequence -- nothing marks the second span as inert.</div>
        </div>
      )}
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 8 }}>
        This structural gap -- not a specific bug -- is why prompt injection mitigation is layered and probabilistic rather than a single definitive fix.
      </div>
    </VisualizationContainer>
  );
}
