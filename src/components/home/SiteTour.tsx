import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import './siteTour.css';

const SEEN_KEY = 'nm-site-tour-seen';

const STEPS = [
  { title: 'Learn', to: '/learn', body: 'Start here if you are building your foundations. Lessons run in reading order, from the maths through LLMs and agents, with visualizations you can change.' },
  { title: 'Labs', to: '/labs', body: 'Practise what you read. Write and run Python in the browser, and test your work against real exercises.' },
  { title: 'Interview', to: '/interview', body: 'Prepare for AI engineering interviews with question banks, or speak your answers in a mock interview and get a report.' },
  { title: 'Blog', to: '/blog', body: 'Read explanations of what is changing in AI engineering and how real systems work.' },
  { title: 'Progress', to: '/progress', body: 'Mark lessons as understood, then come back here to continue and see what is due for review.' },
];

function hasSeenTour() {
  try { return localStorage.getItem(SEEN_KEY) === '1'; } catch { return true; } // Storage blocked: don't show the tour on every visit.
}

function rememberTourSeen() {
  try { localStorage.setItem(SEEN_KEY, '1'); } catch { /* Tour simply won't be remembered. */ }
}

/** First-visit guide to the site's main areas. Mounted on the home page only, so a visitor landing on a lesson is never interrupted. */
export default function SiteTour() {
  const [params, setParams] = useSearchParams();
  const replay = params.get('tour') === '1';
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);

  // Decided in an effect, and skipped for automated browsers, so prerendered HTML and search snapshots never contain the tour.
  useEffect(() => {
    if (replay || (!navigator.webdriver && !hasSeenTour())) { setStep(0); setOpen(true); }
  }, [replay]);

  useEffect(() => { if (open) cardRef.current?.focus({ preventScroll: true }); }, [open]);

  const close = () => {
    rememberTourSeen();
    setOpen(false);
    if (replay) setParams({}, { replace: true });
  };

  if (!open) return null;
  const current = STEPS[step];
  const last = step === STEPS.length - 1;
  return (
    <div ref={cardRef} className="nm-tour" role="dialog" aria-labelledby="nm-tour-title" tabIndex={-1} data-pagefind-ignore onKeyDown={(event) => { if (event.key === 'Escape') close(); }}>
      <div className="nm-tour__top">
        <span aria-live="polite">Site tour, {step + 1} of {STEPS.length}</span>
        <button type="button" className="nm-tour__skip" onClick={close}>Skip tour</button>
      </div>
      <h2 id="nm-tour-title">{current.title}</h2>
      <p>{current.body}</p>
      <Link className="nm-tour__open" to={current.to} onClick={rememberTourSeen}>Open {current.title} <span aria-hidden="true">→</span></Link>
      <div className="nm-tour__actions">
        <button type="button" disabled={step === 0} onClick={() => setStep(step - 1)}>Back</button>
        <button type="button" className="nm-tour__next" onClick={() => last ? close() : setStep(step + 1)}>{last ? 'Done' : 'Next'}</button>
      </div>
    </div>
  );
}
