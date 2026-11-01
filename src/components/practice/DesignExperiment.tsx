import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, VisualizationHeader } from '../../viz/primitives';

type Saved = { prediction?: string; decision?: string; cache?: boolean; outage?: boolean; seen?: string[] };
function savedDecision(): Saved {
  try { const value = JSON.parse(localStorage.getItem('nm-lab-outage-decision') ?? '{}'); return value && typeof value === 'object' ? value : {}; } catch { return {}; }
}

const PREDICTIONS = [
  { id: 'slower', text: 'Answers get slower', why: 'A local copy is usually faster to read than a remote search, so speed is not the risk.' },
  { id: 'stale', text: 'Customers may get outdated advice', why: 'Right. A copy saved yesterday does not know about today’s manual changes. That is the price of the fallback.' },
  { id: 'cost', text: 'It becomes much more expensive', why: 'Storing one manual is cheap. The real cost is correctness, not money.' },
];

type Outcome = { tone: 'good' | 'warn' | 'bad'; label: string; text: string };
function outcomeFor(cache: boolean, outage: boolean): Outcome {
  if (outage && cache) return { tone: 'warn', label: 'Answers, possibly stale', text: 'The assistant can use yesterday’s manual. It should show when the copy was saved and avoid answering questions that require current information.' };
  if (outage) return { tone: 'bad', label: 'No answer', text: 'The assistant has no source to consult. Show a clear message and offer a retry or human support instead of inventing an answer.' };
  if (cache) return { tone: 'good', label: 'Fresh answer + fallback', text: 'Both sources are available. Use the current manual first; keep the saved copy as a fallback. A cache needs an expiry and an update policy.' };
  return { tone: 'good', label: 'Fresh answer', text: 'Live search answers the question. This design is simple, but the assistant depends on that service being available.' };
}
const key = (cache: boolean, outage: boolean) => `${cache ? 'cache' : 'nocache'}-${outage ? 'down' : 'up'}`;

export default function DesignExperiment() {
  const t = useVizTokens();
  const [initial] = useState(savedDecision);
  const [cache, setCache] = useState(initial.cache === true);
  const [outage, setOutage] = useState(initial.outage === true);
  const [prediction, setPrediction] = useState(typeof initial.prediction === 'string' ? initial.prediction : '');
  const [run, setRun] = useState(false);
  const [seen, setSeen] = useState<string[]>(Array.isArray(initial.seen) ? initial.seen : []);
  const [decision, setDecision] = useState(typeof initial.decision === 'string' ? initial.decision : '');
  const [saved, setSaved] = useState(false);
  const result = outcomeFor(cache, outage);
  const toneColor = { good: t.accentPrimary, warn: t.accentWarn, bad: t.accentDanger }[result.tone];
  const usesCache = run && outage && cache;
  const usesLive = run && !outage;
  const picked = PREDICTIONS.find(p => p.id === prediction);

  const runIt = () => { setRun(true); setSeen(s => (s.includes(key(cache, outage)) ? s : [...s, key(cache, outage)])); };
  const box = (x: number, y: number, label: string, sub: string, state: 'idle' | 'active' | 'down' | 'stale') => {
    const stroke = state === 'active' ? toneColor : state === 'down' ? t.accentDanger : state === 'stale' ? (t.accentWarn) : t.border;
    return <g key={label}>
      <rect x={x} y={y} width={135} height={66} rx={12} fill={state === 'down' ? t.surfaceAlt : t.surface} stroke={stroke} strokeWidth={state === 'idle' ? 2 : 3} />
      <text x={x + 67} y={y + 30} textAnchor="middle" fill={t.textPrimary} fontSize={16}>{label}</text>
      <text x={x + 67} y={y + 50} textAnchor="middle" fill={state === 'down' ? t.accentDanger : t.textSecondary} fontSize={12}>{sub}</text>
    </g>;
  };

  return <section className="nm-experiment" aria-labelledby="experiment-title">
    <div className="nm-experiment-heading"><div><p className="nb-eyebrow">GUIDED LAB / 10 MINUTES · NO CODE</p><h2 id="experiment-title">Keep a support assistant useful during an outage.</h2></div><span className="nm-experiment-badge">System design</span></div>
    <p>Your assistant answers customer questions from a product manual, looked up through a search service. Sometimes that service goes offline. You'll decide whether to keep a saved copy of the manual, then break things on purpose and watch what happens.</p>
    <div className="nm-experiment-columns"><div>
      <h3>1. Predict</h3>
      <fieldset className="nm-lab-predict"><legend>If you keep a 24-hour copy of the manual, what is the main risk?</legend>
        {PREDICTIONS.map(p => <label key={p.id} className={`nm-check ${prediction === p.id ? 'is-picked' : ''}`}><input type="radio" name="lab-prediction" checked={prediction === p.id} onChange={() => setPrediction(p.id)} /> {p.text}</label>)}
      </fieldset>
      {picked && run && <p className="nm-lab-predict-feedback" role="status"><strong>{picked.id === 'stale' ? 'Your prediction holds.' : 'Not quite.'}</strong> {picked.why}</p>}
      <h3>2. Choose your design</h3>
      <label className="nm-check"><input type="checkbox" checked={cache} onChange={e => { setCache(e.target.checked); setRun(false); }} /> Store a copy of the manual for 24 hours</label>
      <label className="nm-check"><input type="checkbox" checked={outage} onChange={e => { setOutage(e.target.checked); setRun(false); }} /> Simulate the search service going offline</label>
      <button type="button" className="nm-button nm-button-primary" onClick={runIt}>Run the experiment →</button>
    </div><div>
      <VisualizationContainer title="Trace the support request" footer="The highlighted route is the one this question actually takes. Live search supplies current information; a saved manual is a fallback that can be out of date.">
        <VisualizationHeader title={run ? `Result: ${result.label}` : 'Follow the question'} />
        <svg viewBox="0 0 420 285" role="img" aria-label={`A question passes through the assistant. ${outage ? 'Live search is offline.' : 'Live search is available.'} ${cache ? 'A saved copy exists.' : 'There is no saved copy.'} ${run ? `Result: ${result.label}.` : ''}`}>
          <path d="M150 68H230" fill="none" stroke={run ? toneColor : t.edge} strokeWidth={run ? 4 : 3} strokeDasharray={run ? undefined : '7 5'} />
          <path d="M297 101V165" fill="none" stroke={usesLive ? toneColor : t.edge} strokeWidth={usesLive ? 4 : 3} strokeDasharray={usesLive ? undefined : '7 5'} opacity={outage ? 0.35 : 1} />
          <path d="M230 68H195V198H150" fill="none" stroke={usesCache ? toneColor : t.edge} strokeWidth={usesCache ? 4 : 3} strokeDasharray={usesCache ? undefined : '7 5'} opacity={cache ? 1 : 0.35} />
          {box(15, 35, 'Question', '"How do I reset it?"', run ? 'active' : 'idle')}
          {box(230, 35, 'Assistant', run ? result.label : 'waiting', run ? 'active' : 'idle')}
          {box(230, 165, 'Live search', outage ? 'offline' : 'current manual', outage ? 'down' : usesLive ? 'active' : 'idle')}
          {box(15, 165, 'Saved manual', cache ? 'copy from yesterday' : 'none kept', !cache ? 'down' : usesCache ? 'stale' : 'idle')}
          <text x="210" y="265" textAnchor="middle" fill={run ? toneColor : t.textSecondary} fontSize="15" fontWeight={run ? 700 : 400}>{run ? result.label : 'Press “Run the experiment”'}</text>
        </svg>
      </VisualizationContainer>
      <h3>3. Inspect the outcome</h3>
      <div aria-live="polite" className="nm-experiment-result">{run ? result.text : 'Run the experiment to follow your question through the system.'}</div>
      <div className="nm-lab-outcomes" aria-label={`Outcomes explored: ${seen.length} of 4`}>
        <p><strong>Try all four combinations</strong> ({seen.length} of 4 explored)</p>
        <table><thead><tr><th scope="col"></th><th scope="col">Search up</th><th scope="col">Search offline</th></tr></thead><tbody>
          {[false, true].map(c => <tr key={String(c)}><th scope="row">{c ? 'Saved copy' : 'No copy'}</th>{[false, true].map(o => { const k = key(c, o); const r = outcomeFor(c, o); return <td key={k} className={seen.includes(k) ? `is-${r.tone}` : ''}>{seen.includes(k) ? r.label : '?'}</td>; })}</tr>)}
        </tbody></table>
      </div>
      <small>This is a qualitative teaching simulation, not a performance benchmark.</small>
    </div></div>
    <h3>4. Explain your decision</h3><label htmlFor="lab-decision">Which design would you choose, and what evidence would change your mind?</label>
    <textarea id="lab-decision" value={decision} onChange={e => { setDecision(e.target.value); setSaved(false); }} placeholder="I would choose… The trade-off is… I would test…" />
    <button type="button" className="nm-button" disabled={!decision.trim()} onClick={() => { try { localStorage.setItem('nm-lab-outage-decision', JSON.stringify({ prediction, decision, cache, outage, seen })); setSaved(true); } catch { setSaved(false); } }}>Save my decision on this device</button>
    {saved && <p role="status">Decision saved. Try the other design and compare your reasoning.</p>}
  </section>;
}
