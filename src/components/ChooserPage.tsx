import { Link } from 'react-router-dom';
import Navbar from './layout/Navbar';
import LiveComputation from './home/LiveComputation';
import PracticePlayground from './content/PracticePlayground';
import AgentGraphSketch from './notebook/AgentGraphSketch';
import NotebookCallout from './notebook/NotebookCallout';
import { DomainIcon } from './icons/DomainIcons';
import { SketchUnderline } from './notebook/RoughShape';
import { getFlatPages, getPracticeProblems } from '../lib/contentTree';
import { SECTION_META, SECTION_ORDER, groupLandingRoute } from '../data/sectionMeta';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import { useDocumentMeta } from '../lib/useDocumentMeta';
import { useProgress } from '../contexts/ProgressContext';

const loop: [string, string, string, 'cobalt' | 'teal' | 'amber' | 'green'][] = [
  ['01', 'Understand', 'Read a precise explanation built from first principles.', 'cobalt'],
  ['02', 'Visualize', 'Change the inputs and watch the computation respond.', 'teal'],
  ['03', 'Implement', 'Turn the idea into working Python.', 'amber'],
  ['04', 'Practice', 'Run against real tests and earn the next concept.', 'green'],
];

function Arrow() {
  return <span aria-hidden="true">→</span>;
}

/** The public product landing page. It keeps the two real destinations, but
 * frames them as one learning loop instead of unrelated products.
 *
 * Visual identity: the "notebook" design system (src/styles/notebook.css +
 * src/components/notebook/*) -- warm paper, hand-drawn rough.js illustrations,
 * colored annotation boxes -- piloted here and on
 * /docs/agents/loops-and-graphs before any wider sitewide rollout. All
 * functional pieces (LiveComputation, PracticePlayground, progress-aware
 * CTAs) are unchanged; only the frame around them changed. */
export default function ChooserPage() {
  // The homepage title and description are what people see in search
  // results, so they say plainly what the site is ("learn AI", "practice")
  // instead of a slogan.
  useDocumentTitle('Learn AI by building it, free');
  useDocumentMeta(
    'Learn AI by building it, free',
    'Free lessons on AI from the maths up to LLMs and agents, plus coding problems you run in your browser against real tests. No sign-up, nothing to install.',
  );

  const pages = getFlatPages();
  const problems = getPracticeProblems();
  const { countWithin } = useProgress();
  const completed = countWithin(pages.map((page) => page.route));

  return (
    <div className="nb-theme">
      <Navbar />
      <main>
        <section className="nb-ruled" style={{ borderBottom: '1px solid var(--nb-rule)', padding: 'clamp(3rem, 7vw, 6rem) 0' }}>
          <div className="nm-landing-shell nm-hero-grid">
            <div>
              <p className="nb-eyebrow">✎ interactive AI engineering curriculum</p>
              <h1 className="nb-heading" style={{ fontSize: 'clamp(2.4rem, 5vw, 4.1rem)', lineHeight: 1.05, margin: 0, position: 'relative' }}>
                Learn it.<br />Practice it.<br />
                <span style={{ color: 'var(--nb-teal)', position: 'relative', display: 'inline-block' }}>
                  Achieve Mastery.
                  <svg viewBox="0 0 320 16" width="100%" style={{ position: 'absolute', left: 0, bottom: -8, height: 16 }} aria-hidden="true">
                    <SketchUnderline x={4} y={8} width={300} color="var(--nb-teal)" id="hero-underline" />
                  </svg>
                </span>
              </h1>
              <p className="nb-body" style={{ maxWidth: 560, margin: '1.75rem 0 2rem', fontSize: '1.08rem' }}>
                Master AI engineering through real in-browser execution, step-by-step computed visualizations, and
                rigorous test suites — from linear algebra and gradient descent to transformers, RAG, and
                autonomous agent loops.
              </p>
              <div className="nm-hero-actions">
                <Link className="nm-button nm-button-primary" to={completed ? '/progress' : '/learn'} style={{ background: 'var(--nb-cobalt)' }}>
                  {completed ? 'Continue learning' : 'Explore the curriculum'} <Arrow />
                </Link>
                <Link
                  className="nm-button nm-button-secondary"
                  to="/practice"
                  style={{ borderColor: 'var(--nb-rule)', color: 'var(--nb-ink)', background: 'color-mix(in srgb, var(--nb-paper-alt) 90%, transparent)' }}
                >
                  Try a coding problem <Arrow />
                </Link>
              </div>
              <div className="nm-proof-row" style={{ marginTop: '2.4rem' }}>
                <div style={{ borderColor: 'var(--nb-rule)' }}><strong className="nb-hand" style={{ color: 'var(--nb-cobalt)', fontSize: '1.5rem' }}>{pages.length}+</strong><span>learning pages</span></div>
                <div style={{ borderColor: 'var(--nb-rule)' }}><strong className="nb-hand" style={{ color: 'var(--nb-teal)', fontSize: '1.5rem' }}>{problems.length}+</strong><span>coding problems</span></div>
                <div style={{ borderColor: 'var(--nb-rule)' }}><strong className="nb-hand" style={{ color: 'var(--nb-amber)', fontSize: '1.5rem' }}>7</strong><span>AI disciplines</span></div>
              </div>
            </div>
            <div>
              <p className="nb-eyebrow" style={{ justifyContent: 'center' }}>✎ live, computed — not a recording</p>
              <div
                style={{
                  border: '1.5px solid var(--nb-rule)',
                  borderRadius: 4,
                  padding: '0.6rem',
                  background: 'color-mix(in srgb, var(--nb-paper-alt) 60%, transparent)',
                }}
              >
                <LiveComputation />
              </div>
            </div>
          </div>
        </section>

        <section style={{ padding: 'clamp(3rem, 6vw, 5rem) 0', borderBottom: '1px solid var(--nb-rule)' }}>
          <div className="nm-landing-shell nb-loop-grid">
            <div>
              <p className="nb-eyebrow">★ the Neural Mastery method</p>
              <h2 className="nb-heading" style={{ fontSize: 'clamp(1.6rem, 3vw, 2.3rem)', margin: '0 0 2rem' }}>
                One concept. A complete learning loop.
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                {loop.map(([number, title, text, color]) => (
                  <NotebookCallout key={number} color={color} title={`${number} · ${title}`}>
                    <p>{text}</p>
                  </NotebookCallout>
                ))}
              </div>
            </div>
            <div>
              <p className="nb-hand" style={{ textAlign: 'center', color: 'var(--nb-ink-soft)', fontSize: '0.9rem', margin: '0 0 0.25rem' }}>
                a real graph-based agent, sketched →{' '}
                <Link to="/docs/agents/loops-and-graphs" style={{ color: 'var(--nb-cobalt)' }}>see it interactive</Link>
              </p>
              <AgentGraphSketch />
            </div>
          </div>
        </section>

        <section style={{ padding: 'clamp(3rem, 6vw, 5rem) 0', background: 'var(--nb-paper-alt)', borderBottom: '1px solid var(--nb-rule)' }}>
          <div className="nm-landing-shell">
            <div className="nm-section-heading-row">
              <div>
                <p className="nb-eyebrow">a curriculum with range</p>
                <h2 className="nb-heading" style={{ fontSize: 'clamp(1.6rem, 3vw, 2.3rem)', margin: 0 }}>
                  Start with the layer you need. Keep going without leaving the platform.
                </h2>
              </div>
              <Link className="nm-text-link" to="/learn" style={{ color: 'var(--nb-cobalt)' }}>Browse all topics <Arrow /></Link>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: '1rem', marginTop: '2.25rem' }}>
              {SECTION_ORDER.map((key, index) => {
                const section = SECTION_META[key];
                return (
                  <Link
                    key={key}
                    to={groupLandingRoute(key)}
                    className="nb-hover-lift"
                    style={{
                      display: 'block',
                      padding: '1.1rem',
                      borderRadius: 4,
                      border: `1.5px solid ${section.color}`,
                      background: `color-mix(in srgb, ${section.color} 7%, var(--nb-paper))`,
                      textDecoration: 'none',
                      color: 'inherit',
                    }}
                  >
                    <span className="nb-hand" style={{ color: section.color, fontSize: '0.85rem' }}>0{index + 1}</span>
                    <div style={{ margin: '0.4rem 0' }}><DomainIcon groupKey={key} color={section.color} size={24} /></div>
                    <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--nb-ink)' }}>{section.label}</h3>
                    <p style={{ margin: '0.4rem 0 0', fontSize: '0.82rem', color: 'var(--nb-ink-soft)', maxWidth: '25ch' }}>{section.description}</p>
                    <p className="nb-hand" style={{ margin: '0.8rem 0 0', color: section.color, fontSize: '0.8rem' }}>{section.pageCount} pages <Arrow /></p>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        <section style={{ padding: 'clamp(3rem, 6vw, 5rem) 0' }}>
          <div className="nm-landing-shell" style={{ maxWidth: 900, textAlign: 'center', margin: '0 auto' }}>
            <p className="nb-eyebrow" style={{ justifyContent: 'center' }}>learn it. then prove it.</p>
            <h2 className="nb-heading" style={{ fontSize: 'clamp(1.6rem, 3vw, 2.3rem)', margin: '0 0 0.75rem' }}>
              Practice the algorithms you just learned.
            </h2>
            <p className="nb-body" style={{ maxWidth: 600, margin: '0 auto' }}>
              No sign-up or installation — hit <strong>▶ Run</strong> to execute real Python in your browser (via
              Pyodide/WebAssembly) and check it against real test cases, no vague LLM grading.
            </p>
            <div className="nm-practice-live">
              <PracticePlayground problemId="fizz-buzz" celebrateOnSuccess />
            </div>
            <div className="nm-practice-live-foot">
              <Link className="nm-button nm-button-primary" to="/practice" style={{ background: 'var(--nb-cobalt)' }}>
                Browse {problems.length} problems <Arrow />
              </Link>
            </div>
          </div>
        </section>

        <section style={{ padding: 'clamp(3.5rem, 8vw, 6rem) 0', textAlign: 'center', background: 'var(--nb-paper-alt)', borderTop: '1px solid var(--nb-rule)' }}>
          <div className="nm-landing-shell" style={{ maxWidth: 700, margin: '0 auto' }}>
            <p className="nb-eyebrow" style={{ justifyContent: 'center' }}>code it. run it. verify it.</p>
            <h2 className="nb-heading" style={{ fontSize: 'clamp(1.6rem, 3.2vw, 2.4rem)', margin: '0 0 0.75rem' }}>
              Run real algorithms.<br />Inspect every tensor, step by step.
            </h2>
            <p className="nb-body" style={{ maxWidth: 560, margin: '0 auto' }}>
              From core matrix math to production multi-agent systems — solve hands-on problems with zero setup and
              instant in-browser test validation.
            </p>
            <Link className="nm-button nm-button-primary" to="/learn" style={{ marginTop: '1.75rem', background: 'var(--nb-cobalt)' }}>
              Start learning AI <Arrow />
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
