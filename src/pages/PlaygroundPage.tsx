import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import {
  PLAYGROUND_SECTIONS,
  PLAYGROUND_TOOLS,
  type PlaygroundTool,
} from '../data/playgroundCatalog';
import { useDocumentMeta } from '../lib/useDocumentMeta';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import './playground.css';
import './playground-hub.css';

const TRACK_STYLE: Record<string, { glyph: string; pen: number; short: string }> = {
  Foundations: { glyph: '∑', pen: 1, short: 'Foundations' },
  'Core ML & Deep Learning': { glyph: '◉', pen: 2, short: 'Core ML' },
  'Agents & Production Systems': { glyph: '⚙', pen: 3, short: 'Agents & Systems' },
  'Quality, Safety & Domain AI': { glyph: '✓', pen: 4, short: 'Safety & Eval' },
  'Practice & Builders': { glyph: '✎', pen: 5, short: 'Build' },
};

/** Tools whose live screen does not make a clear thumbnail get a drawn picture instead. */
const DRAWN_THUMBS = new Set(['tcp-vs-udp']);

const sectionTrack = new Map(PLAYGROUND_SECTIONS.map((s) => [s.id, s.track]));
const TRACKS = [...new Set(PLAYGROUND_SECTIONS.map((s) => s.track))];

function penVars(track: string) {
  const pen = TRACK_STYLE[track]?.pen ?? 2;
  return { ['--pg-hl' as string]: `var(--nm-hl-${pen})`, ['--pg-ink' as string]: `var(--nm-hl-${pen}-ink)` };
}

function ToolCard({ tool }: { tool: PlaygroundTool }) {
  const [broken, setBroken] = useState(false);
  const track = sectionTrack.get(tool.section) ?? '';
  return (
    <li>
      <Link to={`/playground/${tool.slug}`} className="playground__entry-link pgh-card" style={penVars(track)}>
        <span className="pgh-card__pic">
          {broken ? (
            <span className="pgh-card__glyph" aria-hidden="true">{TRACK_STYLE[track]?.glyph ?? '✶'}</span>
          ) : (
            <img
              src={`/playground-thumbs/${tool.slug}.${DRAWN_THUMBS.has(tool.slug) ? 'svg' : 'jpg'}`}
              alt=""
              loading="lazy"
              decoding="async"
              onError={() => setBroken(true)}
            />
          )}
        </span>
        <span className="pgh-card__body">
          <span className="pgh-card__tag">{tool.sectionLabel}</span>
          <span className="pgh-card__title">{tool.title}</span>
          <span className="pgh-card__note">{tool.whatYouTry}</span>
        </span>
      </Link>
    </li>
  );
}

export default function PlaygroundPage() {
  useDocumentTitle('Playground');
  useDocumentMeta(
    'Interactive AI & ML Playground',
    'Hands-on interactive simulators and visual workbenches across every section of Neural Mastery.',
    [
      { label: 'Home', href: '/' },
      { label: 'Playground', href: '/playground' },
    ],
  );

  const [query, setQuery] = useState('');
  const [selectedTrack, setSelectedTrack] = useState('All');
  const [selectedSection, setSelectedSection] = useState('all');

  const sectionsForDropdown = useMemo(
    () => (selectedTrack === 'All' ? PLAYGROUND_SECTIONS : PLAYGROUND_SECTIONS.filter((s) => s.track === selectedTrack)),
    [selectedTrack],
  );

  const groups = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const match = (t: PlaygroundTool) =>
      (selectedTrack === 'All' || sectionTrack.get(t.section) === selectedTrack) &&
      (selectedSection === 'all' || t.section === selectedSection) &&
      (!needle || `${t.title} ${t.whatYouTry} ${t.sectionLabel} ${t.section}`.toLowerCase().includes(needle));
    return TRACKS.map((track) => ({
      track,
      tools: PLAYGROUND_TOOLS.filter((t) => sectionTrack.get(t.section) === track && match(t)),
    })).filter((g) => g.tools.length > 0);
  }, [query, selectedTrack, selectedSection]);

  const shown = groups.reduce((n, g) => n + g.tools.length, 0);
  const filtered = query.trim() !== '' || selectedTrack !== 'All' || selectedSection !== 'all';

  const pickTrack = (track: string) => {
    setSelectedTrack(track);
    setSelectedSection('all');
  };

  return (
    <div className="pgh">
      <Navbar />
      <main className="pgh-shell">
        <header className="pgh-hero">
          <h1>Interactive Playground</h1>
          <p>
            {PLAYGROUND_TOOLS.length} small tools that show how AI really works. Pick a picture, move a slider, and
            watch what changes.
          </p>
          <label className="pgh-search">
            <span className="pgh-sr">Search tools</span>
            <input
              type="search"
              aria-label="Search tools"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search: attention, kv cache, bm25, rate limit…"
            />
          </label>
        </header>

        <nav className="pgh-tabs" aria-label="Filter by learning track">
          <div className="pgh-tabs__row" role="group">
            {['All', ...TRACKS].map((track) => {
              const count =
                track === 'All'
                  ? PLAYGROUND_TOOLS.length
                  : PLAYGROUND_TOOLS.filter((t) => sectionTrack.get(t.section) === track).length;
              return (
                <button
                  key={track}
                  type="button"
                  className="pgh-tab"
                  aria-pressed={selectedTrack === track}
                  onClick={() => pickTrack(track)}
                  style={track === 'All' ? undefined : penVars(track)}
                >
                  {track !== 'All' && <span aria-hidden="true">{TRACK_STYLE[track]?.glyph}</span>}
                  {track === 'All' ? 'All' : TRACK_STYLE[track]?.short ?? track}
                  <span className="pgh-tab__count">{count}</span>
                </button>
              );
            })}
          </div>
          <div className="pgh-tabs__row pgh-tabs__row--small">
            <label className="pgh-select">
              <span>Filter by section</span>
              <select value={selectedSection} onChange={(e) => setSelectedSection(e.target.value)}>
                <option value="all">All sections ({sectionsForDropdown.length})</option>
                {sectionsForDropdown.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
            <span role="status" className="pgh-status">
              {shown} {shown === 1 ? 'tool' : 'tools'}
              {filtered && (
                <button
                  type="button"
                  className="pgh-clear"
                  onClick={() => {
                    setQuery('');
                    pickTrack('All');
                  }}
                >
                  Clear
                </button>
              )}
            </span>
            <Link to="/labs" className="pgh-labs">Want to write code? Labs →</Link>
          </div>
        </nav>

        {groups.length === 0 ? (
          <p className="pgh-empty" role="status">No tool matches that. Try a shorter word, or press Clear.</p>
        ) : (
          groups.map(({ track, tools }) => (
            <section key={track} className="pgh-group" style={penVars(track)} aria-label={track}>
              <h2>
                <span aria-hidden="true">{TRACK_STYLE[track]?.glyph}</span> {track}
                <small>{tools.length}</small>
              </h2>
              <ul className="pgh-grid">
                {tools.map((tool) => (
                  <ToolCard key={tool.slug} tool={tool} />
                ))}
              </ul>
            </section>
          ))
        )}
      </main>
    </div>
  );
}
