import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import {
  COMING_SOON_TOOLS,
  PLAYGROUND_SECTIONS,
  PLAYGROUND_TOOLS,
  type ComingSoonTool,
  type PlaygroundSection,
  type PlaygroundTool,
} from '../data/playgroundCatalog';
import { useDocumentMeta } from '../lib/useDocumentMeta';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import './playground.css';

interface GroupedSection {
  section: PlaygroundSection;
  tools: PlaygroundTool[];
  comingSoon: ComingSoonTool[];
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

  const tracks = useMemo(() => {
    const seen: string[] = [];
    for (const s of PLAYGROUND_SECTIONS) {
      if (!seen.includes(s.track)) seen.push(s.track);
    }
    return ['All', ...seen];
  }, []);

  const visibleSectionsForDropdown = useMemo(() => {
    if (selectedTrack === 'All') return PLAYGROUND_SECTIONS;
    return PLAYGROUND_SECTIONS.filter((s) => s.track === selectedTrack);
  }, [selectedTrack]);

  const grouped = useMemo<GroupedSection[]>(() => {
    const needle = query.trim().toLowerCase();
    const out: GroupedSection[] = [];

    for (const section of PLAYGROUND_SECTIONS) {
      if (selectedTrack !== 'All' && section.track !== selectedTrack) continue;
      if (selectedSection !== 'all' && section.id !== selectedSection) continue;

      const matchesItem = (item: { title: string; whatYouTry: string; sectionLabel: string; section: string }) => {
        if (!needle) return true;
        return `${item.title} ${item.whatYouTry} ${item.sectionLabel} ${item.section}`
          .toLowerCase()
          .includes(needle);
      };

      const tools = PLAYGROUND_TOOLS.filter((t) => t.section === section.id && matchesItem(t));
      const comingSoon = COMING_SOON_TOOLS.filter((c) => c.section === section.id && matchesItem(c));

      if (tools.length > 0 || comingSoon.length > 0) {
        out.push({ section, tools, comingSoon });
      }
    }

    return out;
  }, [query, selectedSection, selectedTrack]);

  const liveMatchCount = useMemo(
    () => grouped.reduce((sum, g) => sum + g.tools.length, 0),
    [grouped],
  );

  const handleTrackChange = (track: string) => {
    setSelectedTrack(track);
    if (track !== 'All' && selectedSection !== 'all') {
      const stillInTrack = PLAYGROUND_SECTIONS.some(
        (s) => s.id === selectedSection && s.track === track,
      );
      if (!stillInTrack) setSelectedSection('all');
    }
  };

  return (
    <div className="playground nb-theme">
      <Navbar />
      <main className="nm-landing-shell">
        <div className="nm-notebook-sheet playground__sheet">
          <header className="playground__head">
            <div className="nm-diary-header">Notebook Workbench</div>
            <h1>Interactive Playground</h1>
            <p>
              Experiment directly with neural networks, attention weights, KV caches, ranking metrics, rate limiters,
              and agent harnesses—no setup required.
            </p>
            <div className="playground__meta-bar">
              <span>
                <strong>{PLAYGROUND_TOOLS.length}</strong> live tools across{' '}
                <strong>{PLAYGROUND_SECTIONS.length}</strong> Learn sections
              </span>
              <Link to="/labs" className="playground__labs-link">
                Python coding problems live in Labs →
              </Link>
            </div>
          </header>

          <section className="playground__controls" aria-label="Filter playground tools">
            <div className="playground__search-row">
              <label className="playground__field">
                <span>Search tools</span>
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Try: attention, kv cache, bm25, rate limit..."
                />
              </label>

              <label className="playground__field">
                <span>Filter by section</span>
                <select
                  value={selectedSection}
                  onChange={(e) => setSelectedSection(e.target.value)}
                >
                  <option value="all">
                    All sections ({visibleSectionsForDropdown.length})
                  </option>
                  {visibleSectionsForDropdown.map((sec) => (
                    <option key={sec.id} value={sec.id}>
                      {sec.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="playground__tracks" role="group" aria-label="Filter by learning track">
              {tracks.map((track) => (
                <button
                  key={track}
                  type="button"
                  className="playground__track-btn"
                  aria-pressed={selectedTrack === track}
                  onClick={() => handleTrackChange(track)}
                >
                  {track}
                </button>
              ))}
            </div>

            <div className="playground__meta-bar" role="status">
              <span>
                Showing {liveMatchCount} live {liveMatchCount === 1 ? 'tool' : 'tools'} across{' '}
                {grouped.length} {grouped.length === 1 ? 'section' : 'sections'}
              </span>
            </div>
          </section>

          {grouped.length === 0 ? (
            <p className="playground__empty" role="status">
              No playground tools match that filter. Clear the search box or switch back to All tracks.
            </p>
          ) : (
            grouped.map(({ section, tools, comingSoon }) => {
              const pen = (PLAYGROUND_SECTIONS.findIndex((s) => s.id === section.id) % 5) + 1;
              let n = 0;
              return (
              <section
                key={section.id}
                className="playground__section"
                aria-labelledby={`pg-sec-${section.id}`}
                style={{ ['--pg-hl' as string]: `var(--nm-hl-${pen})`, ['--pg-ink' as string]: `var(--nm-hl-${pen}-ink)` }}
              >
                <div className="playground__section-head">
                  <h2 id={`pg-sec-${section.id}`}><span className="playground__hl">{section.label}</span></h2>
                  <span className="playground__section-track">{section.track}</span>
                </div>

                <ol className="playground__index">
                  {tools.map((tool) => {
                    n += 1;
                    return (
                      <li key={tool.slug} className="playground__entry">
                        <Link to={`/playground/${tool.slug}`} className="playground__entry-link">
                          <span className="playground__num" aria-hidden="true">{n}</span>
                          <span className="playground__entry-body">
                            <span className="playground__entry-line">
                              <span className="playground__entry-title">{tool.title}</span>
                              <span className="playground__leader" aria-hidden="true" />
                              <span className="playground__go">try it →</span>
                            </span>
                            <span className="playground__entry-note">{tool.whatYouTry}</span>
                          </span>
                        </Link>
                      </li>
                    );
                  })}

                  {comingSoon.map((item) => (
                    <li key={item.title} className="playground__entry playground__entry--soon">
                      <span className="playground__entry-link">
                        <span className="playground__num" aria-hidden="true">·</span>
                        <span className="playground__entry-body">
                          <span className="playground__entry-line">
                            <span className="playground__entry-title">{item.title}</span>
                            <span className="playground__leader" aria-hidden="true" />
                            <span className="playground__go">Coming soon</span>
                          </span>
                          <span className="playground__entry-note">{item.whatYouTry}</span>
                        </span>
                      </span>
                    </li>
                  ))}
                </ol>
              </section>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
}
