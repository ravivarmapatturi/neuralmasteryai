import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from './layout/Navbar';
import DecisionLab from './practice/DecisionLab';
import FailureLab from './practice/FailureLab';
import WouldYouShipThis from './practice/WouldYouShipThis';
import { getPracticeProblems, type DocPage } from '../lib/contentTree';
import { CATALOG, type CatalogTrack } from '../data/practiceCatalog';
import { isSolved } from '../lib/mastery';
import { useGamification } from '../contexts/GamificationContext';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import { useDocumentMeta } from '../lib/useDocumentMeta';
import './labs.css';

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
        if (!page) return [];
        return [{ page, track }];
      }),
    );
  }, []);
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
  const [lab, setLab] = useState<(typeof LABS)[number]['id']>('decision');
  const solved = useMemo(() => new Set(rows.filter((r) => isSolved(r.page, events)).map((r) => r.page.route)), [rows, events]);
  const resume = rows.find((r) => !solved.has(r.page.route) && rows.some((o) => o.track === r.track && solved.has(o.page.route)));
  const q = query.trim().toLowerCase();
  const matches = q ? rows.filter((r) => `${r.page.title} ${r.track.title}`.toLowerCase().includes(q)).slice(0, 30) : [];
  const ActiveLab = LABS.find((l) => l.id === lab)!.Lab;

  useDocumentTitle('Labs: practise AI engineering in your browser');
  useDocumentMeta('Labs: practise AI engineering in your browser', `${rows.length} coding problems you run in the browser against real tests, plus labs for design and debugging decisions.`);

  return (
    <div className="nb-theme labs">
      <Navbar />
      <main className="nm-landing-shell">
        <header className="labs__head">
          <h1 className="nb-heading">Labs</h1>
          <p className="nb-body">{rows.length} problems you solve in the browser, checked by real tests. Pick a track and start.</p>
          {resume && <Link className="nm-button nm-button-primary" to={resume.page.route}>Continue {resume.track.title}: {resume.page.title}</Link>}
          <label className="labs__search">
            <span className="sr-only">Search problems</span>
            <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search problems" aria-label="Search problems" />
          </label>
        </header>

        {q ? (
          <section aria-label="Search results" className="labs__section">
            {matches.length ? <ol className="labs__results">{matches.map((r) => <li key={r.page.route}><Link to={r.page.route}>{r.page.title}</Link> <span>{r.track.title}</span></li>)}</ol> : <p>No problems match this search.</p>}
          </section>
        ) : (
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
