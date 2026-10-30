import { Link } from 'react-router-dom';
import Navbar from './layout/Navbar';
import LiveComputation from './home/LiveComputation';
import { LiveStatsTicker } from './home/LiveStats';
import AgentGraphSketch from './notebook/AgentGraphSketch';
import { SketchUnderline } from './notebook/RoughShape';
import HomeBlogPreview from './home/HomeBlogPreview';
import { getFlatPages, getPracticeProblems } from '../lib/contentTree';
import { SECTION_META, SECTION_ORDER, groupLandingRoute, groupPageRoutes } from '../data/sectionMeta';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import { useDocumentMeta } from '../lib/useDocumentMeta';
import { useProgress } from '../contexts/ProgressContext';

function Arrow() {
  return <span aria-hidden="true">→</span>;
}

export default function ChooserPage() {
  useDocumentTitle('Neural Mastery — Understand AI. Design Systems. Make Better Decisions.');
  useDocumentMeta(
    'Neural Mastery — Understand AI. Design Systems. Make Better Decisions.',
    'Learn AI from first principles through explanations, interactive visualizations, engineering decisions, experiments and real system challenges.',
  );

  const pages = getFlatPages();
  const problems = getPracticeProblems();
  const { countWithin } = useProgress();
  const routes = pages.map((page) => page.route);
  const completed = countWithin(routes);

  return (
    <div className="nb-theme">
      <Navbar />
      <LiveStatsTicker pages={pages.length} problems={problems.length} />
      <main>
        {/* Section 1: Hero */}
        <section className="nb-ruled" style={{ borderBottom: '1px solid var(--nb-rule)', padding: 'clamp(3rem, 7vw, 6rem) 0' }}>
          <div className="nm-landing-shell nm-hero-grid">
            <div>
              <h1 className="nb-heading" style={{ fontSize: 'clamp(2.4rem, 5vw, 4.1rem)', lineHeight: 1.05, margin: 0, position: 'relative' }}>
                Understand AI.<br />Design systems.<br />
                <span style={{ color: 'var(--nb-teal)', position: 'relative', display: 'inline-block' }}>
                  Make better decisions.
                  <svg viewBox="0 0 320 16" width="100%" style={{ position: 'absolute', left: 0, bottom: -8, height: 16 }} aria-hidden="true">
                    <SketchUnderline x={4} y={8} width={300} color="var(--nb-teal)" id="hero-underline" />
                  </svg>
                </span>
              </h1>
              <p className="nb-body" style={{ maxWidth: 560, margin: '1.75rem 0 2rem', fontSize: '1.08rem' }}>
                Learn AI from first principles through explanations, interactive visualizations, engineering decisions, experiments and real system challenges.
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
                  Enter the Lab <Arrow />
                </Link>
              </div>
              <p className="nb-hand" style={{ marginTop: '2rem', color: 'var(--nb-ink-soft)', fontSize: '1rem' }}>
                {pages.length} pages and {problems.length} practice problems.
              </p>
            </div>
            <div>
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

        {/* Section 2: The Loop */}
        <section style={{ padding: 'clamp(3rem, 6vw, 5rem) 0', borderBottom: '1px solid var(--nb-rule)' }}>
          <div className="nm-landing-shell nb-loop-grid">
            <div>
              <h2 className="nb-heading" style={{ fontSize: 'clamp(1.6rem, 3vw, 2.3rem)', margin: '0 0 1.25rem' }}>
                Understand it. See it work. Make the decision.
              </h2>
              <p className="nb-body" style={{ margin: '0 0 1.25rem', color: 'var(--nb-ink-soft)', fontSize: '1.05rem', lineHeight: 1.6 }}>
                AI can write more of the implementation than ever. Your advantage is understanding what the system is doing, knowing where it fails, choosing the right design, and verifying the result.
              </p>
              <ol className="nb-body" style={{ margin: 0, paddingLeft: '1.3rem', display: 'grid', gap: '0.9rem', maxWidth: 540 }}>
                <li><strong>UNDERSTAND</strong> — Build the mental model before writing code.</li>
                <li><strong>EXPLORE</strong> — Change inputs, adjust parameters, and watch the system respond.</li>
                <li><strong>DECIDE</strong> — Choose between real engineering trade-offs under hardware constraints.</li>
                <li><strong>BUILD</strong> — Implement the parts worth understanding directly in Python.</li>
                <li><strong>VERIFY</strong> — Test assumptions, find failure modes, and decide whether it ships.</li>
              </ol>
            </div>
            <div>
              <p className="nb-hand" style={{ textAlign: 'center', color: 'var(--nb-ink-soft)', fontSize: '0.9rem', margin: '0 0 0.25rem' }}>
                The control loop of a graph-based agent.{' '}
                <Link to="/docs/agents/loops-and-graphs" style={{ color: 'var(--nb-cobalt)' }}>Interactive version</Link>
              </p>
              <AgentGraphSketch />
            </div>
          </div>
        </section>

        {/* Section 3: The Seven Sections */}
        <section style={{ padding: 'clamp(3rem, 6vw, 5rem) 0', background: 'var(--nb-paper-alt)', borderBottom: '1px solid var(--nb-rule)' }}>
          <div className="nm-landing-shell">
            <div className="nm-section-heading-row">
              <div>
                <h2 className="nb-heading" style={{ fontSize: 'clamp(1.6rem, 3vw, 2.3rem)', margin: 0 }}>
                  Seven sections, in reading order. Start wherever you need to.
                </h2>
              </div>
              <Link className="nm-text-link" to="/learn" style={{ color: 'var(--nb-cobalt)' }}>Browse all topics <Arrow /></Link>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: '1rem', marginTop: '2.25rem' }}>
              {SECTION_ORDER.map((key, index) => {
                const section = SECTION_META[key];
                const pageCount = groupPageRoutes(key, routes).length;
                return (
                  <Link
                    key={key}
                    to={groupLandingRoute(key)}
                    className="nb-hover-lift"
                    style={{
                      display: 'block',
                      padding: '1.1rem',
                      borderRadius: 4,
                      border: '1.5px solid var(--nb-rule)',
                      borderTop: `3px solid ${section.color}`,
                      background: 'var(--nb-paper)',
                      textDecoration: 'none',
                      color: 'inherit',
                    }}
                  >
                    <span className="nb-hand" style={{ color: section.color, fontSize: '0.85rem' }}>0{index + 1}</span>
                    <h3 style={{ margin: '0.3rem 0 0', fontSize: '1rem', color: 'var(--nb-ink)' }}>{section.label}</h3>
                    <p style={{ margin: '0.4rem 0 0', fontSize: '0.82rem', color: 'var(--nb-ink-soft)', maxWidth: '25ch' }}>{section.description}</p>
                    <p className="nb-hand" style={{ margin: '0.8rem 0 0', color: section.color, fontSize: '0.8rem' }}>{pageCount} pages <Arrow /></p>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        {/* Section 4: Editorial Notebook & Series Preview */}
        <HomeBlogPreview />

      </main>
    </div>
  );
}
