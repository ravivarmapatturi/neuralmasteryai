import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from './layout/Navbar';
import DecisionLab from './practice/DecisionLab';
import FailureLab from './practice/FailureLab';
import WouldYouShipThis from './practice/WouldYouShipThis';
import { CATALOG, type CatalogTrack } from '../data/practiceCatalog';
import { FRAMEWORKS, dailyProblem, getProblemRows, type Framework, type ProblemRow } from '../lib/problemIndex';
import { isSolved } from '../lib/mastery';
import { useGamification } from '../contexts/GamificationContext';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import { useDocumentMeta } from '../lib/useDocumentMeta';
import './labs.css';

type Row = ProblemRow;
type SolvedFilter = 'all' | 'solved' | 'unsolved';

function useCatalogRows(): Row[] {
  return useMemo(() => getProblemRows(), []);
}

const LABS = [
  { id: 'decision', label: 'Design a RAG system', Lab: DecisionLab },
  { id: 'failure', label: 'Find a silent failure', Lab: FailureLab },
  { id: 'ship', label: 'Would you ship this?', Lab: WouldYouShipThis },
] as const;

function TrackCard({ track, rows, solved }: { track: CatalogTrack; rows: Row[]; solved: Set<string> }) {
  const trackRows = rows.filter((r) => r.track.slug === track.slug);
  const done = trackRows.filter((r) => solved.has(r.page.route)).length;
  return (
    <li className="labs__card">
      <p className="labs__meta">{track.level} · {trackRows.length} problems{done > 0 ? ` · ${done} solved` : ''}</p>
      <h3><Link to={`/practice/track/${track.slug}`}>{track.title}</Link></h3>
      <p>{track.summary}</p>
      <details>
        <summary>Show problems</summary>
        <ol>
          {trackRows.map((r) => (
            <li key={r.page.route}><Link to={r.page.route}>{r.page.title}{solved.has(r.page.route) ? ' ✓' : ''}</Link></li>
          ))}
        </ol>
      </details>
    </li>
  );
}

/** /labs: write code against real tests, or practise engineering judgement. */
export default function PracticeListPage() {
  const rows = useCatalogRows();
  const { events } = useGamification();
  const [query, setQuery] = useState('');
  const [topic, setTopic] = useState('all');
  const [difficulty, setDifficulty] = useState('all');
  const [framework, setFramework] = useState<'all' | Framework>('all');
  const [solvedFilter, setSolvedFilter] = useState<SolvedFilter>('all');
  const [lab, setLab] = useState<(typeof LABS)[number]['id']>('decision');
  const solved = useMemo(() => new Set(rows.filter((r) => isSolved(r.page, events)).map((r) => r.page.route)), [rows, events]);
  const resume = rows.find((r) => !solved.has(r.page.route) && rows.some((o) => o.track === r.track && solved.has(o.page.route)));
  const q = query.trim().toLowerCase();
  const matches = rows.filter((r) =>
    (!q || `${r.page.title} ${r.track.title}`.toLowerCase().includes(q)) &&
    (topic === 'all' || r.track.slug === topic) &&
    (difficulty === 'all' || r.page.difficulty === difficulty) &&
    (framework === 'all' || r.framework === framework) &&
    (solvedFilter === 'all' || (solvedFilter === 'solved') === solved.has(r.page.route)));
  const filtered = Boolean(q) || topic !== 'all' || difficulty !== 'all' || framework !== 'all' || solvedFilter !== 'all';
  const daily = dailyProblem(rows, new Date(Date.now()));
  const clearFilters = () => { setQuery(''); setTopic('all'); setDifficulty('all'); setFramework('all'); setSolvedFilter('all'); };
  const ActiveLab = LABS.find((l) => l.id === lab)!.Lab;

  useDocumentTitle('Labs: practise AI engineering in your browser');
  useDocumentMeta('Labs: practise AI engineering in your browser', `${rows.length} coding problems you run in the browser against real tests, plus labs for design and debugging decisions.`);

  return (
    <div className="nb-theme labs">
      <Navbar />
      <main className="nm-landing-shell">
        <header className="labs__head">
          <h1 className="nb-heading">Labs</h1>
          <p className="nb-body">Problems you solve in the browser, checked by real tests. Pick a track, or filter the full list below.</p>
          <p className="labs__stats" aria-label="Your progress"><strong>{rows.length}</strong> problems · <strong>{solved.size}</strong> solved</p>
          {resume && <Link className="nm-button nm-button-primary" to={resume.page.route}>Continue {resume.track.title}: {resume.page.title}</Link>}
        </header>

        {daily && (
          <section className="labs__daily" aria-label="Problem of the day">
            <p className="labs__meta">Problem of the day · {daily.page.difficulty ?? 'open'} · {daily.points} points</p>
            <h2><Link to={daily.page.route}>{daily.page.title}</Link>{solved.has(daily.page.route) ? ' ✓' : ''}</h2>
            <p>{daily.track.title}. A new problem every day, the same for everyone.</p>
          </section>
        )}

        <section aria-labelledby="problems-heading" className="labs__section">
          <h2 id="problems-heading">All problems</h2>
          <div className="labs__filters">
            <label className="labs__search">
              <span>Search</span>
              <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search problems" aria-label="Search problems" />
            </label>
            <label><span>Topic</span>
              <select value={topic} onChange={(e) => setTopic(e.target.value)} aria-label="Topic">
                <option value="all">All topics</option>
                {CATALOG.map((t) => <option key={t.slug} value={t.slug}>{t.title}</option>)}
              </select>
            </label>
            <label><span>Difficulty</span>
              <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} aria-label="Difficulty">
                <option value="all">Any difficulty</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </label>
            <label><span>Framework</span>
              <select value={framework} onChange={(e) => setFramework(e.target.value as 'all' | Framework)} aria-label="Framework">
                <option value="all">Any framework</option>
                {FRAMEWORKS.filter((f) => rows.some((r) => r.framework === f)).map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </label>
            <label><span>Status</span>
              <select value={solvedFilter} onChange={(e) => setSolvedFilter(e.target.value as SolvedFilter)} aria-label="Status">
                <option value="all">Solved and unsolved</option>
                <option value="unsolved">Unsolved</option>
                <option value="solved">Solved</option>
              </select>
            </label>
          </div>
          {filtered && <p className="labs__count" role="status">Showing {matches.length} of {rows.length} · <button type="button" className="labs__clear" onClick={clearFilters}>Clear filters</button></p>}
          {filtered ? (
            matches.length ? (
              <table className="labs__table">
                <thead><tr><th scope="col">Problem</th><th scope="col">Topic</th><th scope="col">Difficulty</th><th scope="col">Framework</th><th scope="col">Points</th></tr></thead>
                <tbody>
                  {matches.map((r) => (
                    <tr key={r.page.route}>
                      <td><Link to={r.page.route}>{r.page.title}</Link>{solved.has(r.page.route) && <span className="labs__tick" aria-label="solved"> ✓</span>}</td>
                      <td>{r.track.title}</td>
                      <td className={`labs__diff labs__diff--${r.page.difficulty ?? 'open'}`}>{r.page.difficulty ?? 'open'}</td>
                      <td>{r.framework}</td>
                      <td>{r.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <p>No problems match these filters.</p>
          ) : <p className="labs__lead">Choose a filter or search to see the matching problems, or browse by track below.</p>}
        </section>

        {!filtered && (
          <>
            <section className="labs__section">
              <h2>Build something</h2>
              <p className="labs__lead">Each problem adds a piece to one working program.</p>
              <ul className="labs__grid">{CATALOG.filter((t) => t.kind === 'project').map((t) => <TrackCard key={t.slug} track={t} rows={rows} solved={solved} />)}</ul>
            </section>
            <section className="labs__section">
              <h2>Practise a topic</h2>
              <p className="labs__lead">Standalone problems, easiest first.</p>
              <ul className="labs__grid">{CATALOG.filter((t) => t.kind !== 'project').map((t) => <TrackCard key={t.slug} track={t} rows={rows} solved={solved} />)}</ul>
            </section>
            <section className="labs__section">
              <h2>Make the call</h2>
              <p className="labs__lead">No code here: choose a design, trace a failure, or decide whether a change ships.</p>
              <div className="labs__tabs" role="group" aria-label="Choose a lab">
                {LABS.map((l) => <button key={l.id} type="button" aria-pressed={lab === l.id} onClick={() => setLab(l.id)}>{l.label}</button>)}
              </div>
              <ActiveLab />
            </section>
          </>
        )}
      </main>
    </div>
  );
}
