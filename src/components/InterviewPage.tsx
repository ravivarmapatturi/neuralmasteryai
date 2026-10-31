import { useEffect, useRef, useState } from 'react';
import Navbar from './layout/Navbar';
import { Link } from 'react-router-dom';
import Markdown from './content/Markdown';
import { withinTolerance } from './content/InterviewCheck';
import { bankQuestions, interviewGuides, type InterviewQuestion } from '../data/interviewCatalog';
import { requestInterviewReview, type InterviewReview } from '../lib/interviewReview';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import { useFocusMusic } from '../contexts/FocusMusicContext';

type SpeechResult = { results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> };
type SpeechSession = { continuous: boolean; interimResults: boolean; lang: string; start(): void; stop(): void; onresult: ((e: SpeechResult) => void) | null; onerror: (() => void) | null; onend: (() => void) | null };
const guidedQuestions = [
  { area: 'AI system design', title: 'How would you build a support assistant that answers from company documents?', context: 'The documents change every week. Customers need answers they can trust. Talk through your design before choosing a model.', criteria: ['Clarify the users, scope, and success criteria.', 'Explain retrieval and how answers cite their sources.', 'Describe what happens when evidence is missing or outdated.', 'Plan evaluation, latency, cost, and monitoring.'], answer: 'I would first ask which questions the assistant should handle and when it should hand off to a person. I would index approved documents with version information, retrieve relevant passages, and ask the model to answer with citations. If the evidence is missing, it should say so. I would test on real support questions, including unanswerable ones, and measure grounded answers, latency, and cost before a limited rollout.', followup: 'A document changes after indexing. How do you prevent the assistant from quoting the old policy?' },
  { area: 'Experiment design', title: 'A larger model gives better demos. Would you switch the product to it?', context: 'The larger model costs three times as much. The team has seen five impressive examples.', criteria: ['Define what “better” means for users.', 'Compare models on representative and difficult examples.', 'Measure cost and response time alongside quality.', 'Describe rollout, monitoring, and rollback.'], answer: 'Five examples are a reason to investigate, not enough evidence to switch. I would agree on a task-specific rubric, build a representative evaluation set, and compare both models under the same conditions. I would check important failure cases and inspect cost and latency. If the improvement matters to users, I would run a limited rollout with monitoring and a rollback plan.', followup: 'What would you do if the new model wins on average but fails more often for one group of users?' },
  { area: 'Debugging', title: 'An assistant sounds confident, but its answers are becoming less reliable. What do you investigate?', context: 'There are no server errors. The issue appeared after a document update.', criteria: ['Collect failing examples and establish a baseline.', 'Inspect retrieval, source versions, and data changes.', 'Separate retrieval failures from generation failures.', 'Verify the fix with regression tests and monitoring.'], answer: 'I would collect recent failures and compare them with known-good examples. Since the timing matches a document update, I would check indexing, chunk boundaries, source versions, and retrieval results. I would then test generation using verified passages to separate retrieval problems from model behavior. After fixing the cause, I would add the failures to regression evaluations and monitor a gradual rollout.', followup: 'If retrieval finds the right passage but the answer is wrong, what would you test next?' },
  { area: 'Engineering judgment', title: 'When would you choose a simple workflow over an autonomous agent?', context: 'A team wants to automate invoice processing. Most invoices follow a fixed process, but some require human review.', criteria: ['Identify which steps are predictable.', 'Consider failure cost and permissions.', 'Keep human approval for consequential exceptions.', 'Explain how you would evaluate the approach.'], answer: 'I would start with a workflow for the predictable steps: extract fields, validate them, and route exceptions. An agent may help with genuinely variable tasks, but it adds uncertainty and needs bounded permissions. Payment approval should remain a controlled step. I would compare approaches on real invoices, looking at error rates, exception handling, auditability, and cost.', followup: 'How would you decide whether an exception is safe to automate?' },
];
const questions: InterviewQuestion[] = [...guidedQuestions.map((q,i) => ({ ...q, id: `guided-${i}`, bank: 'guided', kind: 'explanation' as const })), ...bankQuestions];
export default function InterviewPage() {
  useDocumentTitle('Interview — Explain your engineering decisions');
  const endpoint = import.meta.env.VITE_INTERVIEW_REVIEW_URL as string | undefined;
  const [modelReview, setModelReview] = useState<InterviewReview | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const request = useRef<AbortController | null>(null);
  const [index, setIndex] = useState(0);
  const [topic, setTopic] = useState('all');
  const [query, setQuery] = useState('');
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [numericResponse, setNumericResponse] = useState('');
  const [answer, setAnswer] = useState('');
  const [review, setReview] = useState(false);
  const [checked, setChecked] = useState<number[]>([]);
  const [listening, setListening] = useState(false);
  const [message, setMessage] = useState('');
  const session = useRef<SpeechSession | null>(null);
  const { pause } = useFocusMusic();
  const q = questions[index];
  useEffect(() => () => {
    if (session.current) {
      session.current.onresult = null;
      session.current.onerror = null;
      session.current.onend = null;
      session.current.stop();
    }
    request.current?.abort();
  }, []);
  const assess = async () => {
    if (!endpoint) return;
    request.current?.abort();
    const controller = new AbortController(); request.current = controller;
    setReviewing(true); setModelReview(null);
    const timeout = window.setTimeout(() => controller.abort(), 45000);
    try { const result = await requestInterviewReview(endpoint, q.title, answer, q.criteria, controller.signal); if (!controller.signal.aborted) setModelReview(result); }
    catch { if (request.current === controller) setMessage('Automatic review is unavailable. Your answer is still here; use the checklist.'); }
    finally { clearTimeout(timeout); if (request.current === controller) setReviewing(false); }
  };
  const stop = () => { session.current?.stop(); setListening(false); };
  const record = () => {
    const speechWindow = window as unknown as { SpeechRecognition?: new () => SpeechSession; webkitSpeechRecognition?: new () => SpeechSession };
    const Constructor = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
    if (!Constructor) { setMessage('Voice input is unavailable in this browser. You can type your answer below.'); return; }
    pause();
    const speech = new Constructor(); session.current = speech;
    speech.continuous = true; speech.interimResults = false; speech.lang = 'en-US';
    const baseline = answer.trim();
    speech.onresult = event => { if (session.current !== speech) return; let text = baseline ? baseline + ' ' : ''; for (let i = 0; i < event.results.length; i++) if (event.results[i].isFinal) text += event.results[i][0].transcript + ' '; setAnswer(text.trim()); };
    speech.onerror = () => { setListening(false); setMessage('Voice input stopped. Check microphone permission, or type your answer.'); };
    speech.onend = () => setListening(false);
    try { speech.start(); setListening(true); setMessage('Listening. Stop when you finish, then edit the transcript if needed.'); } catch { setMessage('Could not start the microphone. Please try again.'); }
  };
  return <div className="nb-theme" style={{ minHeight: '100vh' }}><Navbar /><main className="nm-interview-shell">
    <p className="nb-eyebrow">INTERVIEW / THINK IT THROUGH</p><h1 className="nb-heading">Explain the choices behind your solution.</h1>
    <p className="nm-interview-lead">{bankQuestions.length} questions from our existing Interview Prep banks, plus {guidedQuestions.length} guided scenarios. Choose a topic, answer out loud or in writing, and compare with the worked explanation.</p>
    <details className="nm-interview-guides"><summary>Preparation library · {interviewGuides.length} guides</summary><div>{interviewGuides.map(guide => <Link key={guide.slug} to={guide.route}><strong>{guide.title.replace(/ — The Full Bank$/, '')}</strong><span>{guide.description}</span></Link>)}</div></details>
    <div className="nm-interview-layout"><aside aria-label="Interview questions">
      <label htmlFor="interview-topic">Topic</label><select id="interview-topic" value={topic} onChange={e => setTopic(e.target.value)}><option value="all">All topics · {questions.length} questions</option><option value="guided">Guided scenarios · {guidedQuestions.length}</option>{interviewGuides.filter(guide => bankQuestions.some(item => item.bank === guide.slug)).map(guide => <option key={guide.slug} value={guide.slug}>{guide.title.replace(/ Interview Questions.*$/, '').replace('Interview Q&A Quick Reference', 'LLMs and agents')} · {bankQuestions.filter(item => item.bank === guide.slug).length}</option>)}</select>
      <input type="search" aria-label="Search interview questions" placeholder="Search questions…" value={query} onChange={e => setQuery(e.target.value)} />
      <small aria-live="polite">{questions.filter(item => (topic === 'all' || item.bank === topic) && `${item.title} ${item.section ?? ''} ${item.area}`.toLowerCase().includes(query.toLowerCase().trim())).length} questions</small>
      <div className="nm-interview-question-list">{questions.map((item,i) => ({item,i})).filter(({item}) => (topic === 'all' || item.bank === topic) && `${item.title} ${item.section ?? ''} ${item.area}`.toLowerCase().includes(query.toLowerCase().trim())).map(({item,i}) => <button type="button" key={item.id} aria-pressed={i === index} onClick={() => { if (session.current) { session.current.onresult = null; session.current.onerror = null; session.current.onend = null; } stop(); session.current = null; request.current?.abort(); request.current = null; setReviewing(false); setModelReview(null); setIndex(i); setAnswer(''); setSelectedOption(null); setNumericResponse(''); setReview(false); setChecked([]); setMessage(''); }}><small>{String(i+1).padStart(2,'0')} / {item.area}</small><strong>{item.title}</strong></button>)}</div></aside>
    <section className="nm-experiment"><p className="nb-eyebrow">{q.area} · Aim for 2–3 minutes</p><h2>{q.title}</h2><p>{q.context}</p>{q.sourceRoute && <p className="nm-interview-source">{q.section} · <Link to={q.sourceRoute}>Open the original study guide ↗</Link></p>}
    {q.kind === 'choice' && <fieldset className="nm-interview-options"><legend>Choose your answer</legend>{q.options?.map((option,i) => <label key={i}><input type="radio" name="interview-choice" checked={selectedOption === i} onChange={() => { setSelectedOption(i); setReview(false); }} /><span>{option.text}</span></label>)}</fieldset>}
    {q.kind === 'calculation' && <label className="nm-interview-number">Your numerical answer {q.unit && `(${q.unit})`}<input type="number" step="any" value={numericResponse} onChange={e => { setNumericResponse(e.target.value); setReview(false); }} /></label>}
    <label htmlFor="interview-answer">Your answer</label><textarea id="interview-answer" rows={8} value={answer} onChange={e => { request.current?.abort(); request.current = null; setReviewing(false); setModelReview(null); setAnswer(e.target.value); }} placeholder="First, I would clarify…" />
    <div className="nm-interview-actions"><button type="button" className="nm-button" onClick={listening ? stop : record}>{listening ? 'Stop microphone' : 'Answer with microphone'}</button><button type="button" className="nm-button nm-button-primary" disabled={(!answer.trim() && selectedOption === null && !numericResponse.trim()) || listening} onClick={() => setReview(true)}>Review my answer →</button></div>
    <p role="status">{message}</p><small>Voice input uses your browser’s speech service, which may process audio remotely. Start it only if you are comfortable with that. Answers are not submitted to Neural Mastery.</small>
    {review && <div className="nm-interview-review"><h3>Compare your reasoning</h3>{q.kind === 'choice' && selectedOption !== null && <div className="nm-experiment-result" role="status"><strong>{selectedOption === q.correctOption ? 'Correct choice.' : 'Take another look.'}</strong><p>{q.options?.[selectedOption].why}</p>{selectedOption !== q.correctOption && <p>Expected choice: {q.options?.[q.correctOption!].text}</p>}</div>}{q.kind === 'calculation' && numericResponse.trim() && <div className="nm-experiment-result" role="status"><strong>{Number.isFinite(Number(numericResponse)) && withinTolerance(Number(numericResponse),q.numericAnswer!,q.tolerance ?? .02) ? 'Correct calculation.' : 'Take another look.'}</strong><p>Expected answer: {q.numericAnswer} {q.unit}. {q.tolerance ? q.numericAnswer === 0 ? `Accepted absolute tolerance: ${q.tolerance}.` : `Accepted within ${q.tolerance * 100}% relative tolerance.` : 'This question expects an exact answer.'}</p></div>}{endpoint && <><p>Optional: send your question and transcript to our review service for a model assessment.</p><button type="button" className="nm-button" disabled={reviewing || listening || !answer.trim()} onClick={assess}>{reviewing ? 'Reviewing…' : 'Get model feedback'}</button></>}{modelReview && <div><h4>Model assessment · {modelReview.model}</h4><p>Uncalibrated estimates that each point is covered accurately, not an overall probability that your answer is correct.</p>{modelReview.criteria.map(item => <p key={item.criterion}>{item.criterion} <strong>{Math.round(item.probability * 100)}%</strong></p>)}</div>}<p>Check a point only if your answer explains it. This is a self-review checklist, not an AI grade or a probability of correctness.</p>{q.criteria.map((criterion,i) => <label className="nm-check" key={criterion}><input type="checkbox" checked={checked.includes(i)} onChange={() => setChecked(old => old.includes(i) ? old.filter(x => x !== i) : [...old,i])} />{criterion}</label>)}<p aria-live="polite"><strong>{checked.length} of {q.criteria.length} points reviewed</strong> · Use the missing points to improve your answer.</p><h3>One strong way to answer</h3><div className="prose"><Markdown source={q.answer} inlineMath /></div><h3>Try a follow-up</h3><p>{q.followup}</p><p>Several designs can be reasonable. The goal is to support your choice with evidence and explain its limits.</p></div>}
    </section></div></main></div>;
}
