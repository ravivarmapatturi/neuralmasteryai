import { Link } from 'react-router-dom';
import Navbar from '../layout/Navbar';
import { useDocumentTitle } from '../../lib/useDocumentTitle';
import { useDocumentMeta } from '../../lib/useDocumentMeta';
import data from '../../data/changelog.generated.json';

interface Entry { sha: string; date: string; kind: string; area: string | null; text: string }
const entries = data.entries as Entry[];
const days = data.days as Record<string, number>;
const WEEKS = 26;

function iso(d: Date) { return d.toISOString().slice(0, 10); }
function longDate(day: string) { return new Date(`${day}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }); }

/** Commits per day for the last 26 weeks, newest column on the right. Anchored to the latest commit, not today, so the prerendered page is stable. */
function Heatmap() {
  const last = Object.keys(days).sort().at(-1) ?? iso(new Date());
  const end = new Date(`${last}T12:00:00Z`);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - (WEEKS * 7 - 1) - end.getUTCDay());
  const cells: Array<{ day: string; n: number; col: number; row: number }> = [];
  for (let i = 0, d = new Date(start); d <= end; i++, d.setUTCDate(d.getUTCDate() + 1)) {
    cells.push({ day: iso(d), n: days[iso(d)] ?? 0, col: Math.floor(i / 7), row: i % 7 });
  }
  const level = (n: number) => (n === 0 ? 0 : n < 5 ? 1 : n < 15 ? 2 : n < 30 ? 3 : 4);
  const total = cells.reduce((s, c) => s + c.n, 0);
  const cols = cells.at(-1)!.col + 1;
  return (
    <figure className="nm-changelog-heatmap">
      <svg viewBox={`0 0 ${cols * 13} ${7 * 13}`} role="img" aria-label={`${total} commits in the last ${WEEKS} weeks`}>
        {cells.map((c) => (
          <rect key={c.day} x={c.col * 13} y={c.row * 13} width={10} height={10} rx={2} className={`nm-heat-${level(c.n)}`}>
            <title>{`${longDate(c.day)}: ${c.n} commit${c.n === 1 ? '' : 's'}`}</title>
          </rect>
        ))}
      </svg>
      <figcaption>{total} commits in the last {WEEKS} weeks. Each square is one day.</figcaption>
    </figure>
  );
}

export default function ChangelogPage() {
  const title = 'Changelog';
  useDocumentTitle(`${title} | Neural Mastery`);
  useDocumentMeta(`${title} | Neural Mastery`, 'What changed on Neural Mastery, day by day, taken from the site’s git history.');
  const byDay = new Map<string, Entry[]>();
  for (const e of entries) byDay.set(e.date, [...(byDay.get(e.date) ?? []), e]);
  return (
    <div className="nb-theme" style={{ minHeight: '100%', background: 'var(--nm-bg)' }}>
      <Navbar />
      <main className="nm-information-page nm-changelog">
        <header>
          <p className="nm-information-eyebrow">NEURAL MASTERY</p>
          <h1>{title}</h1>
          <p className="nm-changelog-lead">New features and fixes, newest first. The list is built from the site’s git history on every release.</p>
        </header>
        <Heatmap />
        {[...byDay].map(([day, list]) => (
          <section key={day} aria-labelledby={`day-${day}`}>
            <h2 id={`day-${day}`}>{longDate(day)}</h2>
            <ul>
              {list.map((e) => (
                <li key={e.sha}>
                  <span className={`nm-changelog-kind nm-changelog-${e.kind.toLowerCase()}`}>{e.kind}</span>
                  {e.area && <span className="nm-changelog-area">{e.area}</span>}
                  <span>{e.text}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
        <p className="nm-changelog-lead">Older changes are in the <a href="https://github.com/ravivarmapatturi/neuralmasteryai/commits/main" target="_blank" rel="noopener noreferrer">repository history ↗</a>. Back to <Link to="/">home</Link>.</p>
      </main>
    </div>
  );
}
