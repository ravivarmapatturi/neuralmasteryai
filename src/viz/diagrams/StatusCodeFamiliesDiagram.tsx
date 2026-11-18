import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

const FAMILIES = [
  { key: '2xx', label: '2xx Success', codes: ['200 OK', '201 Created', '204 No Content'], desc: 'It worked.', retry: 'n/a' },
  { key: '3xx', label: '3xx Redirect', codes: ['301 Moved', '304 Not Modified'], desc: 'Go look elsewhere.', retry: 'follow redirect' },
  { key: '4xx', label: '4xx Client Error', codes: ['400 Bad Request', '401 Unauthorized', '403 Forbidden', '404 Not Found', '429 Rate Limited'], desc: 'YOUR request was the problem.', retry: 'fix the request first (except 429: backoff & retry)' },
  { key: '5xx', label: '5xx Server Error', codes: ['500 Internal Error', '502 Bad Gateway', '503 Unavailable'], desc: 'The SERVER\'s problem.', retry: 'often safe to retry with backoff -- may be transient' },
];

/** The family matters more than memorizing every code -- click one to see
 * what it means for how a client should react. */
export default function StatusCodeFamiliesDiagram() {
  const t = useVizTokens();
  const { value: activeIdx, pick: setActiveIdx, stop } = useAutoCycle(FAMILIES.length, 3200, 2);
  const colorFor = (k: string) => (k === '2xx' ? t.accentPrimary : k === '3xx' ? getConceptColor(t, 'query') : k === '4xx' ? t.accentWarn : t.accentDanger);
  const active = FAMILIES[activeIdx];
  const selected = active.key;

  return (
    <VisualizationContainer footer={`Client action: ${active.retry}`}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {FAMILIES.map((f, i) => {
          const isSelected = selected === f.key;
          const color = colorFor(f.key);
          return (
            <div key={f.key} onClick={() => { stop(); setActiveIdx(i); }} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); stop(); setActiveIdx(i); } }} onMouseEnter={() => { stop(); setActiveIdx(i); }} style={{ flex: '1 1 120px', cursor: 'pointer', padding: '0.6rem 0.8rem', borderRadius: 8, background: isSelected ? `${color}18` : t.surfaceAlt, border: `1.5px solid ${isSelected ? color : t.border}` }}>
              <div style={{ fontWeight: 700, fontSize: 12.5, color }}>{f.label}</div>
              <div style={{ fontSize: 10.5, color: t.textMuted, marginTop: 2 }}>{f.desc}</div>
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
        {active.codes.map((c) => (
          <div key={c} style={{ fontSize: 10.5, fontFamily: 'monospace', padding: '3px 8px', borderRadius: 5, background: `${colorFor(selected)}18`, color: colorFor(selected) }}>{c}</div>
        ))}
      </div>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 10 }}>
        429 is the one every LLM API integration needs to handle gracefully -- it's the normal shape of a shared, rate-limited service under load.
      </div>
    </VisualizationContainer>
  );
}
