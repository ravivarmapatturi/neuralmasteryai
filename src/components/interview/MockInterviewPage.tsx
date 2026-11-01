import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../layout/Navbar';
import Markdown from '../content/Markdown';
import { bankQuestions, type InterviewQuestion } from '../../data/interviewCatalog';
import { evaluateAnswer, sessionSummary, type AnswerReport } from '../../lib/mockInterview/evaluate';
import { embed, initEngine, onProgress, speak, startRecording, stopSpeaking, transcribe } from '../../lib/mockInterview/engine';
import { useDocumentTitle } from '../../lib/useDocumentTitle';
import { useFocusMusic } from '../../contexts/FocusMusicContext';

type Stage = 'setup' | 'loading' | 'question' | 'processing' | 'report';
const HISTORY_KEY = 'nm-mock-interview-history';
type HistoryEntry = { date: string; area: string; overall: number; content: number; structure: number };

function readHistory(): HistoryEntry[] {
  try { const v = JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]'); return Array.isArray(v) ? v : []; } catch { return []; }
}
const shuffle = <T,>(a: T[]) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
const fmtTime = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

function ScoreRing({ value, label }: { value: number; label: string }) {
  const r = 38, c = 2 * Math.PI * r;
  return <figure className="nm-mock-ring" aria-label={`${label}: ${value} out of 100`}>
    <svg viewBox="0 0 100 100" width="100" height="100" aria-hidden="true">
      <circle cx="50" cy="50" r={r} fill="none" stroke="var(--nm-border)" strokeWidth="9" />
      <circle cx="50" cy="50" r={r} fill="none" stroke="var(--nm-accent-primary)" strokeWidth="9" strokeLinecap="round" strokeDasharray={`${(value / 100) * c} ${c}`} transform="rotate(-90 50 50)" />
      <text x="50" y="56" textAnchor="middle" fontSize="22" fontWeight="700" fill="var(--nm-text-primary)">{value}</text>
    </svg>
    <figcaption>{label}</figcaption>
  </figure>;
}

export default function MockInterviewPage() {
  useDocumentTitle('Mock interview — practise out loud, free');
  const { pause } = useFocusMusic();
  const pool = useMemo(() => bankQuestions.filter(q => q.specificCriteria), []);
  const areas = useMemo(() => Array.from(new Set(pool.map(q => q.area))), [pool]);
  const [area, setArea] = useState(areas[0] ?? '');
  const [count, setCount] = useState(3);
  const [stage, setStage] = useState<Stage>('setup');
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [current, setCurrent] = useState(0);
  const [reports, setReports] = useState<AnswerReport[]>([]);
  const [progress, setProgress] = useState<Record<string, { loaded: number; total: number }>>({});
  const [error, setError] = useState('');
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [typed, setTyped] = useState('');
  const [typing, setTyping] = useState(false);
  const rec = useRef<Awaited<ReturnType<typeof startRecording>> | null>(null);
  const timer = useRef<number | null>(null);

  useEffect(() => onProgress(p => setProgress(prev => ({ ...prev, [p.file]: { loaded: p.loaded, total: p.total } }))), []);
  useEffect(() => () => { rec.current?.cancel(); stopSpeaking(); if (timer.current) clearInterval(timer.current); }, []);
  const q = questions[current];
  useEffect(() => { if (stage === 'question' && q) speak(`${q.title} ${q.context && !/own words/i.test(q.context) ? q.context : ''}`); }, [stage, q]);

  const totals = Object.values(progress).reduce((a, p) => ({ loaded: a.loaded + (p.loaded || 0), total: a.total + (p.total || 0) }), { loaded: 0, total: 0 });
  const pct = totals.total ? Math.min(100, Math.round((totals.loaded / totals.total) * 100)) : 0;

  const begin = async () => {
    setError(''); pause();
    setQuestions(shuffle(pool.filter(x => x.area === area)).slice(0, count));
    setCurrent(0); setReports([]); setStage('loading');
    try { await initEngine(); setStage('question'); }
    catch (e) { setError(`Could not load the on-device models (${(e as Error).message}). Check your connection for the one-time download, or use a recent Chrome, Edge or Firefox.`); setStage('setup'); }
  };

  const startAnswer = async () => {
    setError(''); stopSpeaking();
    try {
      rec.current = await startRecording();
      setRecording(true); setElapsed(0);
      const t0 = performance.now();
      timer.current = window.setInterval(() => setElapsed((performance.now() - t0) / 1000), 500);
    } catch { setError('Microphone unavailable or permission denied. You can type your answer instead.'); setTyping(true); }
  };

  const finish = async (transcript: string, seconds: number) => {
    const report = await evaluateAnswer(q, transcript, seconds, embed);
    const next = [...reports, report];
    setReports(next);
    if (current + 1 < questions.length) { setCurrent(current + 1); setTyped(''); setTyping(false); setStage('question'); }
    else {
      const s = sessionSummary(next);
      try { localStorage.setItem(HISTORY_KEY, JSON.stringify([...readHistory(), { date: new Date().toISOString(), area, overall: s.overall, content: s.content, structure: s.structure }].slice(-20))); } catch { /* storage unavailable */ }
      setStage('report');
    }
  };

  const stopAnswer = async () => {
    if (!rec.current) return;
    if (timer.current) clearInterval(timer.current);
    setRecording(false); setStage('processing');
    try {
      const { audio, seconds } = await rec.current.stop();
      rec.current = null;
      await finish(await transcribe(audio), seconds);
    } catch (e) { setError(`Could not process the recording (${(e as Error).message}). Type your answer instead.`); setTyping(true); setStage('question'); }
  };

  const submitTyped = async () => {
    setStage('processing');
    // Typed answers get a speaking-time estimate of 150 words per minute.
    const words = typed.trim().split(/\s+/).length;
    await finish(typed, Math.max(1, (words / 150) * 60));
  };

  const summary = sessionSummary(reports);
  const history = readHistory();

  return <div className="nb-theme" style={{ minHeight: '100vh' }}><Navbar /><main className="nm-interview-shell nm-mock">
    <p className="nb-eyebrow"><Link to="/interview">INTERVIEW</Link> / MOCK INTERVIEW</p>

    {stage === 'setup' && <>
      <h1 className="nb-heading">Practise out loud. Get a report on what to improve.</h1>
      <p className="nm-interview-lead">We read each question aloud, you answer by speaking, as you would to an interviewer. Then you get a report: which key points you covered, how you structured the answer, your pace and filler words, and exactly where to improve.</p>
      <ul className="nm-mock-facts">
        <li><strong>Free and private.</strong> Speech recognition and scoring run on your device. Your voice never leaves your computer.</li>
        <li><strong>One-time download</strong> of about 100 MB of models, then it works offline.</li>
        <li><strong>An honest coach, not a judge.</strong> It checks whether you covered the points a strong answer needs. It cannot fully judge the depth of your reasoning the way a human interviewer can.</li>
      </ul>
      {pool.length === 0 ? <p>Mock interview questions are being prepared. Practise in <Link to="/interview">study mode</Link> meanwhile.</p> : <div className="nm-mock-setup">
        <label>Topic<select value={area} onChange={e => setArea(e.target.value)}>{areas.map(a => <option key={a} value={a}>{a} · {pool.filter(x => x.area === a).length} questions</option>)}</select></label>
        <label>Questions<select value={count} onChange={e => setCount(Number(e.target.value))}>{[1, 3, 5].map(n => <option key={n} value={n}>{n} ({n * 3} minutes)</option>)}</select></label>
        <button type="button" className="nm-button nm-button-primary" onClick={begin}>Start mock interview →</button>
      </div>}
      {error && <p role="alert" className="nm-mock-error">{error}</p>}
      {history.length > 0 && <section className="nm-mock-history" aria-label="Your past sessions"><h2>Your progress</h2>
        {history.length >= 2 && <svg viewBox={`0 0 ${Math.max(1, history.length - 1) * 40 + 20} 80`} width="100%" height="80" role="img" aria-label={`Overall scores of your last ${history.length} sessions: ${history.map(h => h.overall).join(', ')}`}>
          <polyline fill="none" stroke="var(--nm-accent-primary)" strokeWidth="2.5" points={history.map((h, i) => `${10 + i * 40},${70 - h.overall * 0.6}`).join(' ')} />
          {history.map((h, i) => <circle key={i} cx={10 + i * 40} cy={70 - h.overall * 0.6} r="4" fill="var(--nm-accent-primary)" />)}
        </svg>}
        <p>Last session: {history.at(-1)!.overall}/100 on {history.at(-1)!.area}.{history.length < 2 && ' Do another session to see your trend.'}</p></section>}
    </>}

    {stage === 'loading' && <section className="nm-experiment" aria-live="polite">
      <h2>Getting the interviewer ready</h2>
      <p>Downloading the speech and scoring models to your device. This happens once; next time it starts instantly.</p>
      <div className="nm-mock-bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Model download"><span style={{ width: `${pct}%` }} /></div>
      <p>{totals.total ? `${(totals.loaded / 1e6).toFixed(0)} of ${(totals.total / 1e6).toFixed(0)} MB` : 'Checking your browser cache…'}</p>
    </section>}

    {(stage === 'question' || stage === 'processing') && q && <section className="nm-experiment" aria-live="polite">
      <p className="nb-eyebrow">Question {current + 1} of {questions.length} · {q.area} · aim for 2–3 minutes</p>
      <div className="nm-mock-steps" aria-hidden="true">{questions.map((_, i) => <span key={i} className={i < current ? 'is-done' : i === current ? 'is-now' : ''} />)}</div>
      <h2>{q.title}</h2>
      <button type="button" className="nm-button" onClick={() => speak(q.title)} disabled={recording}>Read the question again</button>
      {stage === 'processing' ? <p className="nm-mock-status">Listening back to your answer and scoring it on your device…</p> : typing ? <>
        <label htmlFor="mock-typed">Type your answer</label>
        <textarea id="mock-typed" rows={8} value={typed} onChange={e => setTyped(e.target.value)} />
        <button type="button" className="nm-button nm-button-primary" disabled={!typed.trim()} onClick={submitTyped}>Submit answer →</button>
      </> : <div className="nm-mock-record">
        {!recording ? <button type="button" className="nm-mock-mic" onClick={startAnswer}><span aria-hidden="true">●</span> Start answering</button>
          : <button type="button" className="nm-mock-mic is-live" onClick={stopAnswer}><span aria-hidden="true">■</span> I’m done · {fmtTime(elapsed)}</button>}
        <p>{recording ? (elapsed > 180 ? 'Past 3 minutes: start wrapping up.' : 'Speak naturally. Clarify, give your approach, a trade-off, and how you’d verify it.') : 'Take a moment to think, then press start and answer out loud.'}</p>
        {!recording && <button type="button" className="nm-link-button" onClick={() => { setTyping(true); }}>Prefer to type?</button>}
      </div>}
      {error && <p role="alert" className="nm-mock-error">{error}</p>}
    </section>}

    {stage === 'report' && <section aria-labelledby="report-title">
      <h1 id="report-title" className="nb-heading">Your interview report</h1>
      <div className="nm-mock-rings"><ScoreRing value={summary.overall} label="Overall" /><ScoreRing value={summary.content} label="Key points" /><ScoreRing value={summary.structure} label="Structure" /></div>
      <p className="nm-mock-note">Scores are on-device estimates of how well each answer covered the points a strong answer contains. Use them to find gaps, not as a verdict on your ability.</p>
      <div className="nm-mock-delivery"><div><strong>{summary.wpm || '–'}</strong><span>words per minute (130–160 is easy to follow)</span></div><div><strong>{summary.fillers}</strong><span>filler words across the session</span></div><div><strong>{reports.length}</strong><span>questions answered</span></div></div>
      {summary.missed.length > 0 && <div className="nm-mock-focus"><h2>Where to improve first</h2><ol>{summary.missed.slice(0, 4).map((m, i) => <li key={i}>{m.criterion}{m.route && <> · <Link to={m.route}>study this</Link></>}</li>)}</ol></div>}
      {reports.map((r, i) => <details key={r.questionId} className="nm-mock-answer" open={i === 0}>
        <summary><span>Q{i + 1}. {r.title}</span><strong>{r.overall}/100</strong></summary>
        <h3>Key points</h3>
        <ul className="nm-mock-criteria">{r.criteria.map(c => <li key={c.criterion} className={`is-${c.coverage}`}><span aria-hidden="true">{c.coverage === 'covered' ? '✓' : c.coverage === 'partial' ? '~' : '✗'}</span><div><strong>{c.criterion}</strong><small>{c.coverage === 'covered' ? 'Likely covered' : c.coverage === 'partial' ? 'Partly covered' : 'Not found in your answer'}{c.evidence && <> · you said: “{c.evidence}”</>}</small></div></li>)}</ul>
        <h3>Structure</h3>
        <p className="nm-mock-moves">{r.moves.map(m => <span key={m.label} className={m.used ? 'is-used' : ''}>{m.used ? '✓' : '○'} {m.label}</span>)}</p>
        <h3>Delivery</h3>
        <p>{r.delivery.seconds}s · {r.delivery.words} words · {r.delivery.wpm} wpm · {r.delivery.fillerCount} filler words{r.delivery.lengthVerdict !== 'good' && ` · ${r.delivery.lengthVerdict}`}</p>
        {r.improvements.length > 0 && <><h3>Improve next time</h3><ul>{r.improvements.map(s => <li key={s}>{s}</li>)}</ul></>}
        <h3>What you said</h3><blockquote>{r.transcript || 'No speech was captured.'}</blockquote>
        <h3>A strong answer</h3><Markdown source={questions.find(x => x.id === r.questionId)?.answer ?? ''} />
        {r.sourceRoute && <p><Link to={r.sourceRoute}>Open the study guide for this topic →</Link></p>}
      </details>)}
      <div className="nm-interview-actions"><button type="button" className="nm-button nm-button-primary" onClick={() => setStage('setup')}>Practise again</button><Link className="nm-button" to="/interview">Back to study mode</Link></div>
    </section>}
  </main></div>;
}
