import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, VisualizationHeader } from '../../viz/primitives';

function savedDecision(): { prediction?: string; decision?: string; cache?: boolean; outage?: boolean } {
  try { const value = JSON.parse(localStorage.getItem('nm-lab-outage-decision') ?? '{}'); return value && typeof value === 'object' ? value : {}; } catch { return {}; }
}

export default function DesignExperiment() {
  const t = useVizTokens();
  const [initial] = useState(savedDecision);
  const [cache, setCache] = useState(initial.cache === true);
  const [outage, setOutage] = useState(initial.outage === true);
  const [prediction, setPrediction] = useState(typeof initial.prediction === 'string' ? initial.prediction : '');
  const [run, setRun] = useState(false);
  const [decision, setDecision] = useState(typeof initial.decision === 'string' ? initial.decision : '');
  const [saved, setSaved] = useState(false);
  return <section className="nm-experiment" aria-labelledby="experiment-title">
    <div className="nm-experiment-heading"><div><p className="nb-eyebrow">GUIDED LAB / 15 MINUTES</p><h2 id="experiment-title">Keep a support assistant useful during an outage.</h2></div><span className="nm-experiment-badge">System design</span></div>
    <p>Your assistant answers questions using a product manual. Its search service sometimes goes offline. Can you keep answers fast without showing customers outdated advice?</p>
    <div className="nm-experiment-columns"><div>
      <h3>1. Make a prediction</h3><label htmlFor="lab-prediction">What would a cache help with? What could go wrong?</label>
      <textarea id="lab-prediction" value={prediction} onChange={e => setPrediction(e.target.value)} placeholder="I expect… because…" />
      <h3>2. Choose your design</h3>
      <label className="nm-check"><input type="checkbox" checked={cache} onChange={e => { setCache(e.target.checked); setRun(false); }} /> Store a copy of the manual for 24 hours</label>
      <label className="nm-check"><input type="checkbox" checked={outage} onChange={e => { setOutage(e.target.checked); setRun(false); }} /> Simulate the search service going offline</label>
      <button type="button" className="nm-button nm-button-primary" onClick={() => setRun(true)}>Run the experiment →</button>
    </div><div>
      <VisualizationContainer title="Trace the support request" footer="Live search supplies current information. A saved manual adds a fallback, with the risk of stale advice."><VisualizationHeader title="Follow the question" />
      <svg viewBox="0 0 420 285" role="img" aria-label={`A question passes through the assistant to ${cache ? 'a saved manual' : 'live search'}. ${outage ? 'Live search is unavailable.' : 'Live search is available.'}`}>
        <path d="M150 68H230 M297 101V165 M230 68H195V198H150" fill="none" stroke={t.edge} strokeWidth="3" strokeDasharray="7 5" />
        {[[15,35,'Question'],[230,35,'Assistant'],[230,165,'Live search'],[15,165,'Saved manual']].map(([x,y,label]) => <g key={label}><rect x={x} y={y} width="135" height="66" rx="12" fill={label === 'Live search' && outage ? t.surfaceAlt : t.surface} stroke={label === 'Live search' && outage ? t.accentDanger : t.border} strokeWidth="2" /><text x={Number(x)+67} y={Number(y)+38} textAnchor="middle" fill={t.textPrimary} fontSize="16">{label}</text></g>)}
        <text x="210" y="265" textAnchor="middle" fill={t.textSecondary} fontSize="15">{cache ? 'Saved copy enabled · may be stale' : 'No saved copy'}</text>
      </svg></VisualizationContainer>
      <h3>3. Inspect the outcome</h3>
      <div aria-live="polite" className="nm-experiment-result">{!run ? 'Run the experiment to follow your question through the system.' : outage ? cache ? 'The assistant can use yesterday’s manual. It should show when the copy was saved and avoid answering questions that require current information.' : 'The assistant has no source to consult. Show a clear message and offer a retry or human support instead of inventing an answer.' : cache ? 'Both sources are available. Use the current manual first; keep the saved copy as a fallback. A cache needs an expiry and an update policy.' : 'Live search answers the question. This design is simple, but the assistant depends on that service being available.'}</div>
      <small>This is a qualitative teaching simulation, not a performance benchmark.</small>
    </div></div>
    <h3>4. Explain your decision</h3><label htmlFor="lab-decision">Which design would you choose, and what evidence would change your mind?</label>
    <textarea id="lab-decision" value={decision} onChange={e => { setDecision(e.target.value); setSaved(false); }} placeholder="I would choose… The trade-off is… I would test…" />
    <button type="button" className="nm-button" disabled={!decision.trim()} onClick={() => { try { localStorage.setItem('nm-lab-outage-decision', JSON.stringify({ prediction, decision, cache, outage })); setSaved(true); } catch { setSaved(false); } }}>Save my decision on this device</button>
    {saved && <p role="status">Decision saved. Try the other design and compare your reasoning.</p>}
  </section>;
}
