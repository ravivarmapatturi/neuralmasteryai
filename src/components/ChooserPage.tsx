import { Link } from 'react-router-dom';
import Navbar from './layout/Navbar';
import LiveComputation from './home/LiveComputation';
import { LiveStatsTicker } from './home/LiveStats';
import LearningLoopVisualizer from './home/LearningLoopVisualizer';
import HomeBlogPreview from './home/HomeBlogPreview';
import { SketchUnderline } from './notebook/RoughShape';
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
        {/* Hero: Authoritative, Distinctive Proposition */}
        <section className="nb-ruled nm-hero-section">
          <div className="nm-landing-shell nm-hero-grid">
            <div className="nm-hero-copy-col">
              <p className="nb-eyebrow">FIRST-PRINCIPLES AI ENGINEERING</p>
              <h1 className="nb-heading nm-main-title">
                Understand AI.<br />
                Design systems.<br />
                <span className="nm-title-highlight">
                  Make better decisions.
                  <svg viewBox="0 0 320 16" width="100%" className="nm-sketch-svg" aria-hidden="true">
                    <SketchUnderline x={4} y={8} width={300} color="var(--nb-teal)" id="hero-underline" />
                  </svg>
                </span>
              </h1>
              <p className="nb-body nm-hero-lead">
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
              <p className="nb-hand nm-hero-stats-sub">
                {pages.length} interactive chapters, {problems.length} engineering challenges, and 0 blackbox shortcuts.
              </p>
            </div>
            <div className="nm-hero-comp-col">
              <div className="nm-hero-computation-frame">
                <LiveComputation />
              </div>
            </div>
          </div>
        </section>

        {/* The 5-Stage Interactive Learning Loop Journey */}
        <LearningLoopVisualizer />

        {/* Curriculum Sections: In Reading Order */}
        <section className="nm-curriculum-overview">
          <div className="nm-landing-shell">
            <div className="nm-section-heading-row">
              <div>
                <p className="nb-eyebrow">THE ARCHITECTURAL PATH</p>
                <h2 className="nb-heading" style={{ fontSize: 'clamp(1.6rem, 3vw, 2.3rem)', margin: 0 }}>
                  Seven sections, in reading order. Start wherever you need to.
                </h2>
              </div>
              <Link className="nm-text-link" to="/learn" style={{ color: 'var(--nb-cobalt)' }}>Browse all topics <Arrow /></Link>
            </div>
            <div className="nm-curriculum-cards-grid">
              {SECTION_ORDER.map((key, index) => {
                const section = SECTION_META[key];
                const pageCount = groupPageRoutes(key, routes).length;
                return (
                  <Link
                    key={key}
                    to={groupLandingRoute(key)}
                    className="nb-hover-lift nm-curriculum-card"
                    style={{ borderTop: `3px solid ${section.color}` }}
                  >
                    <span className="nb-hand" style={{ color: section.color, fontSize: '0.85rem' }}>0{index + 1}</span>
                    <h3 className="nm-curriculum-card-title">{section.label}</h3>
                    <p className="nm-curriculum-card-desc">{section.description}</p>
                    <p className="nb-hand nm-curriculum-card-count" style={{ color: section.color }}>{pageCount} pages <Arrow /></p>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        {/* Editorial Notebook & Series Preview Section */}
        <HomeBlogPreview />

      </main>
    </div>
  );
}
