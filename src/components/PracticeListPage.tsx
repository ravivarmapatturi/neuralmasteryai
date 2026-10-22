import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from './layout/Navbar';
import PracticePlayground from './content/PracticePlayground';
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
}

function useCatalogRows(): Row[] {
  return useMemo(() => {
    const byId = new Map(getPracticeProblems().map((p) => [p.problemId, p]));
    return CATALOG.flatMap((track) =>
      track.problems.flatMap((id) => {
        const page = byId.get(id);
        return page ? [{ page, track }] : [];
      }),
    );
  }, []);
}

/**
 * /practice. Deliberately plain: what this is, one problem you can run
 * right here, and the tracks as a list you can read in ten seconds. The
 * numbers on this page are the real catalogue (hand-picked problems, see
 * practiceCatalog.ts), not every generated file.
 */
export default function PracticeListPage() {
  const rows = useCatalogRows();
  const { events } = useGamification();
  const [query, setQuery] = useState('');

  const solvedRoutes = useMemo(() => new Set(rows.filter((r) => isSolved(r.page, events)).map((r) => r.page.route)), [rows, events]);
  const agent = CATALOG[0];
  const agentRows = rows.filter((r) => r.track.slug === agent.slug);
  const resume = rows.find((r) => !solvedRoutes.has(r.page.route) && rows.some((o) => o.track === r.track && solvedRoutes.has(o.page.route)));

  const q = query.trim().toLowerCase();
  const matches = q ? rows.filter((r) => r.page.title.toLowerCase().includes(q) || r.track.title.toLowerCase().includes(q)).slice(0, 12) : [];

  useDocumentTitle('Practice: AI engineering problems with tests');
  useDocumentMeta(
    'Practice',
    `${rows.length} hand-picked AI engineering problems in ${CATALOG.length} tracks. Write Python in your browser and run it against real test cases, starting with a 12-stage build of a tool-using agent.`,
  );

  return (
    <div className="nb-theme" style={{ minHeight: '100vh' }}>
      <Navbar />
      <main>
        <section style={{ borderBottom: '1px solid var(--nb-rule)', padding: 'clamp(2.5rem, 6vw, 4.5rem) 0 clamp(2rem, 4vw, 3rem)' }}>
          <div className="nm-landing-shell" style={{ maxWidth: 900 }}>
            <p className="nb-eyebrow">practice</p>
            <h1 className="nb-heading" style={{ fontSize: 'clamp(2rem, 4.4vw, 3rem)', margin: '0 0 1rem' }}>
              Write the code. Pass the tests.
            </h1>
            <p className="nb-body" style={{ maxWidth: 620, margin: 0, fontSize: '1.05rem' }}>
              Every problem runs real Python in your browser and checks it against test cases, some of them hidden
              until you submit. Pick a track and work down it. Each one goes from easy to hard.
            </p>
            <p className="nb-hand" style={{ margin: '1.25rem 0 0', color: 'var(--nb-ink-soft)' }}>
              {rows.length} problems in {CATALOG.length} tracks
              {solvedRoutes.size > 0 && <> · you've passed {solvedRoutes.size}</>}
            </p>
            {resume && (
              <Link className="nm-button nm-button-primary" to={resume.page.route} style={{ marginTop: '1.25rem', background: 'var(--nb-cobalt)' }}>
                Continue {resume.track.title}: {resume.page.title} →
              </Link>
            )}
          </div>
        </section>

        <section style={{ padding: 'clamp(2.5rem, 5vw, 4rem) 0', borderBottom: '1px solid var(--nb-rule)' }}>
          <div className="nm-landing-shell" style={{ maxWidth: 900 }}>
            <p className="nb-eyebrow">start here</p>
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

        <section style={{ padding: 'clamp(2.5rem, 5vw, 4rem) 0' }}>
          <div className="nm-landing-shell" style={{ maxWidth: 900 }}>
            <h2 className="nb-heading" style={{ fontSize: 'clamp(1.4rem, 2.6vw, 1.8rem)', margin: '0 0 1.25rem' }}>
              All tracks
            </h2>
            <ol aria-label="Practice tracks" style={{ margin: 0, padding: 0, listStyle: 'none', borderTop: '1px solid var(--nb-rule)' }}>
              {CATALOG.map((track, i) => {
                const trackRows = rows.filter((r) => r.track === track);
                const done = trackRows.filter((r) => solvedRoutes.has(r.page.route)).length;
                return (
                  <li key={track.slug} style={{ borderBottom: '1px solid var(--nb-rule)' }}>
                    <Link
                      to={`/practice/track/${track.slug}`}
                      className="nm-practice-track-row"
                      style={{ display: 'grid', gridTemplateColumns: '2.2rem 1fr auto', gap: '0.25rem 1rem', padding: '1rem 0.25rem', textDecoration: 'none', color: 'inherit', alignItems: 'baseline' }}
                    >
                      <span className="nb-hand" style={{ color: 'var(--nb-ink-soft)' }}>{String(i + 1).padStart(2, '0')}</span>
                      <span>
                        <strong style={{ color: 'var(--nb-ink)', fontSize: '1.02rem' }}>{track.title}</strong>
                        <span className="nb-body" style={{ display: 'block', fontSize: '0.9rem', marginTop: '0.2rem' }}>{track.summary}</span>
                      </span>
                      <span style={{ textAlign: 'right', fontSize: '0.82rem', color: 'var(--nb-ink-soft)', whiteSpace: 'nowrap' }}>
                        {track.level}
                        <br />
                        {done > 0 ? `${done}/${trackRows.length} passed` : `${trackRows.length} problems`}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ol>

            <div style={{ marginTop: '2.5rem' }}>
              <label htmlFor="practice-search" className="nb-hand" style={{ display: 'block', color: 'var(--nb-ink-soft)', marginBottom: '0.4rem' }}>
                looking for a specific problem?
              </label>
              <input
                id="practice-search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Try: softmax, k-means, LRU cache, top-p"
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '0.7rem 0.9rem',
                  fontSize: '0.95rem',
                  borderRadius: 4,
                  border: '1.5px solid var(--nb-rule)',
                  background: 'var(--nb-paper-alt)',
                  color: 'var(--nb-ink)',
                }}
              />
              {q && (
                <ul aria-label="Search results" style={{ margin: '0.75rem 0 0', padding: 0, listStyle: 'none' }}>
                  {matches.length === 0 && <li className="nb-body">Nothing matches "{query}".</li>}
                  {matches.map((r) => (
                    <li key={r.page.route} style={{ padding: '0.45rem 0', borderBottom: '1px dashed var(--nb-rule)', display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                      <Link to={r.page.route} style={{ color: 'var(--nb-ink)' }}>
                        {r.page.title}
                      </Link>
                      <span style={{ fontSize: '0.8rem', color: 'var(--nb-ink-soft)', whiteSpace: 'nowrap' }}>
                        {r.track.title} · {r.page.difficulty}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
