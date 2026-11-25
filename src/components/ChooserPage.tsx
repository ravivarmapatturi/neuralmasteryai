import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import Navbar from './layout/Navbar';
import PlaygroundShowcase from './home/PlaygroundShowcase';
import DailyInterviewQuestion from './home/DailyInterviewQuestion';
import { LiveStatsTicker } from './home/LiveStats';
import AgentGraphSketch from './notebook/AgentGraphSketch';
import { SketchUnderline } from './notebook/RoughShape';
import { getFlatPages, getPracticeProblems } from '../lib/contentTree';
import { SECTION_META, SECTION_ORDER, groupLandingRoute, groupPageRoutes } from '../data/sectionMeta';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import { useDocumentMeta } from '../lib/useDocumentMeta';
import { useProgress } from '../contexts/ProgressContext';
import { STUDY_PLANS } from '../data/studyPlans';
import interviewCounts from '../data/interviewCounts.generated.json';
import playgroundCatalog from '../data/playgroundCatalog.json';
import './home/home.css';

function Arrow() {
  return <span aria-hidden="true">→</span>;
}

/** Adds .is-in to every [data-reveal] child once it scrolls into view (one-shot). */
function useScrollReveal() {
  const root = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = root.current;
    if (!el) return undefined;
    const items = Array.from(el.querySelectorAll<HTMLElement>('[data-reveal]'));
    if (!('IntersectionObserver' in window)) {
      items.forEach((i) => i.classList.add('is-in'));
      return undefined;
    }
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('is-in');
          io.unobserve(e.target);
        }
      }),
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' },
    );
    items.forEach((i) => io.observe(i));
    return () => io.disconnect();
  }, []);
  return root;
}

export default function ChooserPage() {
  useDocumentTitle('Neural Mastery: Learn AI from First Principles');
  useDocumentMeta(
    'Neural Mastery: Learn AI from First Principles',
    'AI engineering lessons with visual explanations, live playgrounds, practice problems, interview questions and study plans.',
  );

  const pages = getFlatPages();
  const problems = getPracticeProblems();
  const { countWithin } = useProgress();
  const routes = pages.map((page) => page.route);
  const completed = countWithin(routes);
  const root = useScrollReveal();

  const tools = playgroundCatalog.tools as { slug: string; title: string; whatYouTry: string; sectionLabel: string }[];
  return (
    <div className="nb-theme nm-home">
      <Navbar />
      <LiveStatsTicker pages={pages.length} problems={problems.length} />
      <main ref={root}>
        {/* Hero: headline + live playground carousel */}
        <section className="nm-home-hero nb-ruled">
          <div className="nm-landing-shell nm-home-hero-grid">
            <div className="nm-home-hero-copy">
              <p className="nm-home-eyebrow">A hands-on AI engineering notebook</p>
              <h1 className="nb-heading nm-home-title">
                <span className="nm-home-write" style={{ ['--w' as string]: '0ms' }}>Learn AI from</span>
                <br />
                <span className="nm-home-title-accent">
                  <span className="nm-home-write" style={{ ['--w' as string]: '650ms' }}>First Principles</span>
                  <svg viewBox="0 0 320 16" width="100%" aria-hidden="true">
                    <SketchUnderline x={4} y={8} width={300} color="var(--nb-teal)" id="hero-underline" />
                  </svg>
                </span>
              </h1>
              <p className="nb-body nm-home-lede">
                See how each concept works, play with it live, then build it yourself.
              </p>
              <div className="nm-hero-actions">
                <Link className="nm-button nm-button-primary" to={completed ? '/progress' : '/learn'} style={{ background: 'var(--nb-cobalt)' }}>
                  {completed ? 'Continue learning' : 'Start learning'} <Arrow />
                </Link>
                <Link className="nm-button nm-button-secondary nm-home-ghost" to="/playground">
                  Open the Playground <Arrow />
                </Link>
              </div>
              <ul className="nm-home-counts" aria-label="What is on the site">
                <li><Link to="/learn"><strong>{pages.length}</strong> Learn pages</Link></li>
                <li><Link to="/playground"><strong>{tools.length}</strong> live playgrounds</Link></li>
                <li><Link to="/labs"><strong>{problems.length}</strong> practice problems</Link></li>
                <li><Link to="/interview/questions"><strong>{interviewCounts.questions}</strong> interview questions</Link></li>
              </ul>
            </div>
            <div className="nm-home-hero-side">
              <p className="nm-home-pen-note" aria-hidden="true">
                play with it, change it, see what happens
                <svg viewBox="0 0 60 40"><path d="M4 6 C 22 4, 40 12, 50 32 M42 28 L51 34 L54 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </p>
              <div className="nm-home-hero-demo">
                <span className="nm-home-tape nm-home-tape--l" aria-hidden="true" />
                <span className="nm-home-tape nm-home-tape--r" aria-hidden="true" />
                <PlaygroundShowcase />
              </div>
            </div>
          </div>
        </section>

        <DailyInterviewQuestion />

        {/* The curriculum */}
        <section className="nm-home-band" aria-labelledby="home-sections">
          <div className="nm-landing-shell">
            <div className="nm-section-heading-row" data-reveal>
              <h2 id="home-sections" className="nb-heading nm-home-h2" style={{ margin: 0 }}>
                Seven sections, in reading order.
              </h2>
              <Link className="nm-text-link" to="/learn" style={{ color: 'var(--nb-cobalt)' }}>Browse all topics <Arrow /></Link>
            </div>
            <ol className="nm-home-chapters">
              {SECTION_ORDER.map((key, index) => {
                const section = SECTION_META[key];
                const pageCount = groupPageRoutes(key, routes).length;
                return (
                  <li key={key} data-reveal style={{ ['--d' as string]: `${index * 60}ms`, ['--c' as string]: section.color }}>
                    <Link to={groupLandingRoute(key)} className="nm-home-chapter">
                      <span className="nm-home-chapter-num">0{index + 1}</span>
                      <span className="nm-home-chapter-body">
                        <strong>{section.label}</strong>
                        <span>{section.description}</span>
                      </span>
                      <span className="nm-home-chapter-count">{pageCount} pages</span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          </div>
        </section>

        {/* Why: the agent loop sketch */}
        <section className="nm-home-band nm-home-band--alt" aria-labelledby="home-why">
          <div className="nm-landing-shell nb-loop-grid">
            <div data-reveal>
              <h2 id="home-why" className="nb-heading nm-home-h2">
                Understand it. See it work. <span className="nm-home-hl" style={{ ['--hl' as string]: 'var(--nm-hl-3)' }}>Make the decision.</span>
              </h2>
              <p className="nb-body nm-home-p">
                AI can write more of the code than ever. Your edge is knowing what the system is doing, where it fails, which design to choose, and how to check the result.
              </p>
              <p className="nb-body nm-home-p">
                Plans for every goal: <Link to="/study-plans" style={{ color: 'var(--nb-cobalt)' }}>{STUDY_PLANS.length} study plans</Link>, from your first model to an AI engineering interview.
              </p>
            </div>
            <div data-reveal style={{ ['--d' as string]: '120ms' }}>
              <p className="nb-hand nm-home-caption">
                The control loop of a graph-based agent.{' '}
                <Link to="/docs/agents/loops-and-graphs" style={{ color: 'var(--nb-cobalt)' }}>Interactive version</Link>
              </p>
              <AgentGraphSketch />
            </div>
          </div>
        </section>

        {/* Closing call to action */}
        <section className="nm-home-band nm-home-end" aria-labelledby="home-end">
          <div className="nm-landing-shell" data-reveal>
            <h2 id="home-end" className="nb-heading nm-home-h2">Start with one page today.</h2>
            <p className="nb-body nm-home-p">Free to read. Pick up where you left off any time.</p>
            <div className="nm-hero-actions" style={{ justifyContent: 'center' }}>
              <Link className="nm-button nm-button-primary" to="/learn" style={{ background: 'var(--nb-cobalt)' }}>Start learning <Arrow /></Link>
              <Link className="nm-button nm-button-secondary nm-home-ghost" to="/study-plans">Pick a study plan <Arrow /></Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
