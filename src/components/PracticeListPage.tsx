import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from './layout/Navbar';
import PracticePlayground from './content/PracticePlayground';
import AiEraSkillsComparison from './practice/AiEraSkillsComparison';
import SkillsMapVisualizer from './practice/SkillsMapVisualizer';
import DecisionLab from './practice/DecisionLab';
import FailureLab from './practice/FailureLab';
import WouldYouShipThis from './practice/WouldYouShipThis';
import ProgressRadar from './practice/ProgressRadar';
import { getPracticeProblems, type DocPage } from '../lib/contentTree';
import { CATALOG, type CatalogTrack } from '../data/practiceCatalog';
import { isSolved } from '../lib/mastery';
import { useGamification } from '../contexts/GamificationContext';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import { useDocumentMeta } from '../lib/useDocumentMeta';

/** One problem's page plus the track it lives in. */
interface Row {
  page: DocPage;
  track: CatalogTrack;
  type: string;
}

function assignProblemType(slug: string, trackSlug: string): string {
  if (slug.includes('debug') || slug.includes('failure') || slug.includes('stale-rag')) return 'DEBUG';
  if (slug.includes('incident') || slug.includes('canary')) return 'INCIDENT';
  if (slug.includes('review') || slug.includes('trust-the-judge')) return 'REVIEW';
  if (slug.includes('request-to-tests') || slug.includes('injection')) return 'SPECIFY';
  if (slug.includes('eval') || slug.includes('groundedness') || slug.includes('capacity')) return 'EVALUATE';
  if (trackSlug === 'build-an-agent') return 'ORCHESTRATE';
  if (trackSlug === 'ml-systems' || trackSlug === 'rag-and-retrieval') return 'DESIGN';
  if (trackSlug === 'specify-verify-debug') return 'DECIDE';
  return 'IMPLEMENT';
}

function assignCareerLevel(level: 'Beginner' | 'Intermediate' | 'Advanced', trackSlug: string): string {
  if (trackSlug === 'build-an-agent') return 'AI-Native Engineer';
  if (trackSlug === 'specify-verify-debug' || trackSlug === 'ml-systems') return 'Senior Engineer';
  if (level === 'Advanced') return 'Engineer';
  if (level === 'Intermediate') return 'Builder';
  return 'Foundation';
}

function useCatalogRows(): Row[] {
  return useMemo(() => {
    const byId = new Map(getPracticeProblems().map((p) => [p.problemId, p]));
    return CATALOG.flatMap((track) =>
      track.problems.flatMap((id) => {
        const page = byId.get(id);
        if (!page) return [];
        return [{ page, track, type: assignProblemType(page.slug || id, track.slug) }];
      }),
    );
  }, []);
}

type NavPath = 'skills' | 'types' | 'levels';
type ChallengeFilter = 'all' | 'IMPLEMENT' | 'DEBUG' | 'DESIGN' | 'DECIDE' | 'EVALUATE' | 'SPECIFY' | 'REVIEW' | 'INCIDENT' | 'ORCHESTRATE';
type CareerFilter = 'all' | 'Foundation' | 'Builder' | 'Engineer' | 'Senior Engineer' | 'AI-Native Engineer';

export default function PracticeListPage() {
  const rows = useCatalogRows();
  const { events } = useGamification();
  const [query, setQuery] = useState('');
  const [activePath, setActivePath] = useState<NavPath>('types');
  const [typeFilter, setTypeFilter] = useState<ChallengeFilter>('all');
  const [careerFilter, setCareerFilter] = useState<CareerFilter>('all');
  const [activeLabTab, setActiveLabTab] = useState<'decision' | 'failure' | 'ship' | 'agent'>('decision');

  const solvedRoutes = useMemo(() => new Set(rows.filter((r) => isSolved(r.page, events)).map((r) => r.page.route)), [rows, events]);
  const agent = CATALOG[0];
  const agentRows = rows.filter((r) => r.track.slug === agent.slug);
  const resume = rows.find((r) => !solvedRoutes.has(r.page.route) && rows.some((o) => o.track === r.track && solvedRoutes.has(o.page.route)));

  const q = query.trim().toLowerCase();
  const matches = q
    ? rows.filter((r) => r.page.title.toLowerCase().includes(q) || r.track.title.toLowerCase().includes(q) || r.type.toLowerCase().includes(q)).slice(0, 16)
    : [];

  // Filtered tracks / problems based on active entry path
  const displayedTracks = useMemo(() => {
    if (activePath === 'types' && typeFilter !== 'all') {
      return CATALOG.filter((t) => rows.some((r) => r.track.slug === t.slug && r.type === typeFilter));
    }
    if (activePath === 'levels' && careerFilter !== 'all') {
      return CATALOG.filter((t) => assignCareerLevel(t.level, t.slug) === careerFilter);
    }
    return CATALOG;
  }, [activePath, typeFilter, careerFilter, rows]);

  useDocumentTitle('Engineering Lab — Practice in the AI Era');
  useDocumentMeta(
    'Engineering Lab — Practice in the AI Era',
    `${rows.length} engineering challenges. Practice engineering, not syntax: design architectures, evaluate failure modes, debug agent loops, and navigate physical trade-offs.`,
  );

  return (
    <div className="nb-theme" style={{ minHeight: '100vh' }}>
      <Navbar />
      <main className="nm-lab-shell">
        {/* Hero Section: Engineering Lab */}
        <section className="nm-lab-hero-section">
          <div className="nm-landing-shell">
            <div className="nm-lab-hero-copy">
              <span className="nb-eyebrow">ENGINEERING LAB · NEURAL MASTERY</span>
              <h1 className="nb-heading nm-lab-hero-title">
                Practice engineering,<br />
                <span style={{ color: 'var(--nb-teal)' }}>not syntax.</span>
              </h1>
              <p className="nb-body nm-lab-hero-lead">
                AI can generate an implementation. Your job is to know what to ask for, what architecture fits,
                what failed, how to measure it, and whether the result is good enough to ship.
              </p>

              <div className="nm-lab-stats-strip">
                <div className="nm-lchip">
                  <span className="nm-lchip-dot is-green" />
                  <strong>{rows.length}</strong> verified challenges
                </div>
                <div className="nm-lchip">
                  <span className="nm-lchip-dot is-cobalt" />
                  <strong>8</strong> challenge paradigms
                </div>
                <div className="nm-lchip">
                  <span className="nm-lchip-dot is-amber" />
                  <strong>3</strong> interactive decision labs
                </div>
                {solvedRoutes.size > 0 && (
                  <div className="nm-lchip is-solved">
                    ✓ <strong>{solvedRoutes.size}</strong> solved solutions
                  </div>
                )}
              </div>

              {resume && (
                <div style={{ marginTop: '1.5rem' }}>
                  <Link to={resume.page.route} className="nm-button nm-button-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                    Continue {resume.track.title}: {resume.page.title} →
                  </Link>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Flagship Live Project: Build an Agent */}
        <section style={{ padding: 'clamp(2.5rem, 5vw, 4rem) 0', borderBottom: '1px solid var(--nb-rule)' }}>
          <div className="nm-landing-shell" style={{ maxWidth: 900 }}>
            <p className="nb-eyebrow">FLAGSHIP SYSTEMS PROJECT</p>
            <h2 className="nb-heading" style={{ fontSize: 'clamp(1.5rem, 3vw, 2.1rem)', margin: '0 0 0.75rem' }}>
              {agent.title}, in {agentRows.length} stages
            </h2>
            <p className="nb-body" style={{ maxWidth: 640, margin: 0 }}>
              You write the program behind every AI agent, one piece at a time, and each stage starts from the code of
              the stage before. The model is scripted, so your tests are exact. Stage 1 is right here: make the four
              visible cases pass, then submit to run the hidden ones.
            </p>
            <div className="nm-practice-live" style={{ marginTop: '1.75rem' }}>
              {agentRows[0] && <PracticePlayground problemId={agentRows[0].page.problemId!} awardPermalink={agentRows[0].page.route} />}
            </div>
            <ol style={{ margin: '1.75rem 0 0', padding: 0, listStyle: 'none', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '0.35rem 1.5rem' }}>
              {agentRows.map((r, i) => (
                <li key={r.page.route} style={{ display: 'flex', gap: '0.6rem', alignItems: 'baseline' }}>
                  <span className="nb-hand" style={{ color: 'var(--nb-cobalt)', minWidth: '1.6rem' }}>{String(i + 1).padStart(2, '0')}</span>
                  <Link to={r.page.route} style={{ color: 'var(--nb-ink)', textDecoration: 'none', fontSize: '0.92rem' }}>
                    {r.page.title}
                    {solvedRoutes.has(r.page.route) && <span style={{ color: 'var(--nb-green)' }}> ✓</span>}
                  </Link>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Section: What becomes valuable when implementation becomes cheap? */}
        <div className="nm-landing-shell">
          <AiEraSkillsComparison />
        </div>

        {/* Holistic Multi-dimensional Mastery Progress */}
        <div className="nm-landing-shell" style={{ marginTop: '3rem' }}>
          <ProgressRadar />
        </div>

        {/* Interactive Engineering Labs: Decision, Failure, Ship */}
        <section className="nm-interactive-labs-wrapper">
          <div className="nm-landing-shell">
            <div className="nm-labs-wrapper-header">
              <span className="nb-eyebrow">HIGH-STAKES SIMULATION BENCHMARKS</span>
              <h2 className="nb-heading" style={{ fontSize: 'clamp(1.7rem, 3.5vw, 2.5rem)', margin: '0 0 0.5rem' }}>
                Interactive Engineering Labs
              </h2>
              <p className="nb-body" style={{ margin: 0, color: 'var(--nm-text-secondary)', maxWidth: 680 }}>
                Step beyond unit test passing. Experience real-world systems engineering: configure architectural trade-offs,
                diagnose production degradation incidents, and review AI pull requests.
              </p>

              {/* Lab Switcher Tabs */}
              <div className="nm-lab-tabs-row" role="tablist">
                <button
                  type="button"
                  className={`nm-ltab ${activeLabTab === 'decision' ? 'is-active' : ''}`}
                  onClick={() => setActiveLabTab('decision')}
                >
                  01. Decision Lab (RAG System Design)
                </button>
                <button
                  type="button"
                  className={`nm-ltab ${activeLabTab === 'failure' ? 'is-active' : ''}`}
                  onClick={() => setActiveLabTab('failure')}
                >
                  02. Failure Lab (Silent Degradation)
                </button>
                <button
                  type="button"
                  className={`nm-ltab ${activeLabTab === 'ship' ? 'is-active' : ''}`}
                  onClick={() => setActiveLabTab('ship')}
                >
                  03. Review Lab ("Would You Ship This?")
                </button>
              </div>
            </div>

            {/* Active Lab Display */}
            <div className="nm-active-lab-container">
              {activeLabTab === 'decision' && <DecisionLab />}
              {activeLabTab === 'failure' && <FailureLab />}
              {activeLabTab === 'ship' && <WouldYouShipThis />}
            </div>
          </div>
        </section>

        {/* Three Ways into Practice Section */}
        <section className="nm-three-paths-section">
          <div className="nm-landing-shell">
            <div className="nm-paths-header">
              <span className="nb-eyebrow">CURRICULUM ARCHITECTURE</span>
              <h2 className="nb-heading" style={{ fontSize: 'clamp(1.7rem, 3.5vw, 2.4rem)', margin: '0 0 0.5rem' }}>
                Three Ways into Practice
              </h2>
              <p className="nb-body" style={{ margin: 0, color: 'var(--nm-text-secondary)' }}>
                Choose the lens that matches your engineering objective: navigate by interconnected skills, challenge paradigm, or career depth.
              </p>

              {/* Path Navigation Pills */}
              <div className="nm-path-pills-row" role="tablist">
                <button
                  type="button"
                  className={`nm-ppill ${activePath === 'skills' ? 'is-active' : ''}`}
                  onClick={() => setActivePath('skills')}
                >
                  Path A — Skill Map (8 Connected Families)
                </button>
                <button
                  type="button"
                  className={`nm-ppill ${activePath === 'types' ? 'is-active' : ''}`}
                  onClick={() => setActivePath('types')}
                >
                  Path B — Challenge Type (Design, Debug, Decide, etc.)
                </button>
                <button
                  type="button"
                  className={`nm-ppill ${activePath === 'levels' ? 'is-active' : ''}`}
                  onClick={() => setActivePath('levels')}
                >
                  Path C — Career Level (Foundation → AI-Native)
                </button>
              </div>
            </div>

            {/* Path A Content: Interactive Skills Map */}
            {activePath === 'skills' && (
              <div className="nm-path-view nm-path-skills">
                <SkillsMapVisualizer />
              </div>
            )}

            {/* Path B Content: Filter by Challenge Type */}
            {activePath === 'types' && (
              <div className="nm-path-view nm-path-types">
                <div className="nm-type-filter-bar">
                  <span className="nm-type-filter-label">Filter by Challenge Paradigm:</span>
                  <div className="nm-type-filter-buttons">
                    {(['all', 'IMPLEMENT', 'DEBUG', 'DESIGN', 'DECIDE', 'EVALUATE', 'SPECIFY', 'REVIEW', 'INCIDENT', 'ORCHESTRATE'] as ChallengeFilter[]).map((t) => (
                      <button
                        key={t}
                        type="button"
                        className={`nm-tf-btn ${typeFilter === t ? 'is-active' : ''}`}
                        onClick={() => setTypeFilter(t)}
                      >
                        {t === 'all' ? 'All Types' : `TYPE: ${t}`}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Path C Content: Filter by Career Level */}
            {activePath === 'levels' && (
              <div className="nm-path-view nm-path-levels">
                <div className="nm-career-grid">
                  {[
                    { id: 'Foundation', title: 'Foundation', tag: 'I need to understand how it works.', color: 'var(--nb-teal)' },
                    { id: 'Builder', title: 'Builder', tag: 'I can build components and models.', color: 'var(--nb-cobalt)' },
                    { id: 'Engineer', title: 'Engineer', tag: 'I can design complete distributed systems.', color: 'var(--nb-purple)' },
                    { id: 'Senior Engineer', title: 'Senior', tag: 'I can make architecture and trade-off decisions.', color: 'var(--nb-amber)' },
                    { id: 'AI-Native Engineer', title: 'AI-Native Engineer', tag: 'I coordinate agents, design feedback loops and verify autonomous work.', color: 'var(--nb-coral)' },
                  ].map((lvl) => (
                    <button
                      key={lvl.id}
                      type="button"
                      className={`nm-career-card ${careerFilter === lvl.id ? 'is-active' : ''}`}
                      onClick={() => setCareerFilter(careerFilter === lvl.id ? 'all' : (lvl.id as CareerFilter))}
                      style={{ borderTop: `3px solid ${lvl.color}` }}
                    >
                      <h4 className="nm-career-title">{lvl.title}</h4>
                      <p className="nm-career-tag">"{lvl.tag}"</p>
                      <span className="nm-career-status">
                        {careerFilter === lvl.id ? '✓ Showing Selected Level' : 'Click to filter tracks →'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Search Box */}
            <div className="nm-catalog-search-wrap">
              <input
                type="search"
                className="nm-catalog-search-input"
                placeholder="Search all 243 problems by keyword, system component, or type..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Search problems"
              />
              {q && matches.length > 0 && (
                <div className="nm-search-results-dropdown">
                  {matches.map((m) => (
                    <Link key={m.page.route} to={m.page.route} className="nm-search-result-row">
                      <span className="nm-search-type-tag">TYPE: {m.type}</span>
                      <strong className="nm-search-result-title">{m.page.title}</strong>
                      <span className="nm-search-result-track">{m.track.title}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Catalog Tracks Grid */}
            <div className="nm-catalog-tracks-list">
              {displayedTracks.map((track) => {
                const trackRows = rows.filter((r) => r.track.slug === track.slug);
                const trackCareer = assignCareerLevel(track.level, track.slug);

                return (
                  <article key={track.slug} className="nm-track-card">
                    <div className="nm-track-header">
                      <div className="nm-track-meta-row">
                        <span className="nm-track-badge">{trackCareer}</span>
                        <span className="nm-track-count">{track.problems.length} problems</span>
                        <span className="nm-track-level">{track.level}</span>
                      </div>
                      <h3 className="nm-track-title">
                        <Link to={`/practice/track/${track.slug}`}>{track.title}</Link>
                      </h3>
                      <p className="nm-track-desc">{track.summary}</p>
                    </div>

                    <ol className="nm-track-problems-grid">
                      {trackRows.map((r, i) => {
                        const solved = solvedRoutes.has(r.page.route);
                        return (
                          <li key={r.page.route} className="nm-track-problem-item">
                            <span className="nm-problem-idx">{String(i + 1).padStart(2, '0')}</span>
                            <span className="nm-problem-badge">TYPE: {r.type}</span>
                            <Link to={r.page.route} className="nm-problem-link">
                              {r.page.title}
                              {solved && <span className="nm-check-glyph"> ✓</span>}
                            </Link>
                          </li>
                        );
                      })}
                    </ol>

                    <div className="nm-track-footer">
                      <Link to={`/practice/track/${track.slug}`} className="nm-text-link">
                        Open complete {track.title} track ({track.problems.length} challenges) →
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
