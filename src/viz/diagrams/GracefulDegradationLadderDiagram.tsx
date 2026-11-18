import { useAutoCycle } from '../primitives';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer } from '../primitives';
import { getConceptColor } from './diagramSystem';

const RUNGS = [
  { key: 'full', label: 'Full service', desc: 'Retrieval is up -- the answer is grounded in retrieved context, as normal.', tone: 'ok' as const },
  { key: 'degraded', label: 'Degraded: ungrounded answer', desc: 'Retrieval is down. The LLM answers from its own knowledge instead, clearly caveated as ungrounded -- worse, but the feature still works.', tone: 'warn' as const },
  { key: 'down', label: 'Hard failure', desc: 'No fallback path exists. The request simply errors out -- the outcome a "must work" dependency with no degradation plan produces.', tone: 'bad' as const },
];

/** A RAG system's retrieval step going down -- click a rung to compare
 * failing by doing less against failing completely. */
export default function GracefulDegradationLadderDiagram() {
  const t = useVizTokens();
  const { value: activeIdx, pick } = useAutoCycle(RUNGS.length, 2500, 1);
  const active = RUNGS[activeIdx].key;
  const color = getConceptColor(t, 'attention');
  const r = RUNGS[activeIdx];
  const toneColor = (tone: string) => (tone === 'ok' ? t.accentPrimary : tone === 'warn' ? t.accentWarn : t.accentDanger);

  return (
    <VisualizationContainer footer={r.desc}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {RUNGS.map((x, idx) => {
          const isActive = active === x.key;
          const c = toneColor(x.tone);
          return (
            <div key={x.key} onClick={() => pick(idx)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(idx); } }} onMouseEnter={() => pick(idx)} style={{ cursor: 'pointer', padding: '0.55rem 0.8rem', borderRadius: 7, background: isActive ? `${c}18` : t.surfaceAlt, border: `1.5px solid ${isActive ? c : t.border}` }}>
              <span style={{ fontSize: 11, fontWeight: isActive ? 700 : 500, color: isActive ? c : t.textPrimary }}>{x.label}</span>
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 8, fontSize: 9, color: t.textMuted, textAlign: 'center' }}>
        design failure behavior per-dependency in advance, using <span style={{ color }}>&ldquo;nice to have&rdquo; vs &ldquo;must work&rdquo;</span>
      </div>
    </VisualizationContainer>
  );
}
