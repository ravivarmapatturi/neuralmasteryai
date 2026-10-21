import { useMemo } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import Navbar from './layout/Navbar';
import { getPageByRoute, getPracticeProblems } from '../lib/contentTree';
import { CATALOG, LEGACY_TOPIC_TO_TRACK, findCatalogTrack } from '../data/practiceCatalog';
import { slugifyTopic } from '../lib/practiceTracks';
import { isSolved } from '../lib/mastery';
import { useGamification } from '../contexts/GamificationContext';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import { useDocumentMeta } from '../lib/useDocumentMeta';

/** Old track URLs were slugs of the 54 raw topic strings
 * (/practice/track/agent-loop-engineering); each now redirects to the
 * curated track that absorbed it. */
const LEGACY_SLUG_TO_TRACK: Record<string, string> = Object.fromEntries(
  Object.entries(LEGACY_TOPIC_TO_TRACK).map(([topic, track]) => [slugifyTopic(topic), track]),
);

export default function PracticeTrackPage() {
  const { topicSlug = '' } = useParams<{ topicSlug: string }>();
  const track = findCatalogTrack(topicSlug);
  const { events } = useGamification();

  const pages = useMemo(() => {
    if (!track) return [];
    const byId = new Map(getPracticeProblems().map((p) => [p.problemId, p]));
    return track.problems.flatMap((id) => {
      const page = byId.get(id);
      return page ? [page] : [];
    });
  }, [track]);

  useDocumentTitle(track ? `${track.title}: practice track` : 'Practice track');
  useDocumentMeta(track?.title ?? 'Practice track', track ? `${track.summary} ${pages.length} problems with real test cases.` : undefined);

  if (!track) {
    const moved = LEGACY_SLUG_TO_TRACK[topicSlug];
    return <Navigate to={moved ? `/practice/track/${moved}` : '/practice'} replace />;
  }

  const passed = pages.filter((p) => isSolved(p, events)).length;
  const lesson = getPageByRoute(track.learnRoute);
  const position = CATALOG.indexOf(track);
  const nextTrack = CATALOG[position + 1];

  return (
    <div className="nb-theme" style={{ minHeight: '100vh' }}>
      <Navbar />
      <main className="nm-landing-shell" style={{ maxWidth: 820, padding: 'clamp(2rem, 5vw, 3.5rem) 0 4rem' }}>
        <Link to="/practice" className="nb-hand" style={{ color: 'var(--nb-cobalt)', textDecoration: 'none' }}>
          ← all tracks
        </Link>
        <h1 className="nb-heading" style={{ fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', margin: '0.75rem 0 0.75rem' }}>
          {track.title}
        </h1>
        <p className="nb-body" style={{ fontSize: '1.05rem', maxWidth: 640, margin: 0 }}>
          {track.summary}
        </p>
        <p style={{ margin: '1rem 0 0', fontSize: '0.9rem', color: 'var(--nb-ink-soft)' }}>
          {track.level} · {pages.length} problems · {passed} passed
          {lesson && (
            <>
              {' · '}
              Background reading: <Link to={lesson.route} style={{ color: 'var(--nb-cobalt)' }}>{lesson.title}</Link>
            </>
          )}
        </p>
        {track.kind === 'project' && (
          <p className="nb-body" style={{ margin: '1.25rem 0 0', padding: '0.8rem 1rem', borderLeft: '3px solid var(--nb-cobalt)', background: 'var(--nb-paper-alt)' }}>
            {track.note ??
              "This is one program built in stages. Each stage's starter code includes the finished code from the stages before it, so you can start anywhere, but going in order is how it's meant to be read."}
          </p>
        )}

        <ol style={{ margin: '2rem 0 0', padding: 0, listStyle: 'none', borderTop: '1px solid var(--nb-rule)' }}>
          {pages.map((page, i) => {
            const done = isSolved(page, events);
            return (
              <li key={page.route} style={{ borderBottom: '1px solid var(--nb-rule)' }}>
                <Link
                  to={page.route}
                  className="nm-practice-track-row"
                  style={{ display: 'grid', gridTemplateColumns: '2.2rem 1fr auto', gap: '1rem', padding: '0.8rem 0.25rem', textDecoration: 'none', alignItems: 'baseline' }}
                >
                  <span className="nb-hand" style={{ color: 'var(--nb-ink-soft)' }}>{String(i + 1).padStart(2, '0')}</span>
                  <span style={{ color: 'var(--nb-ink)' }}>
                    {page.title}
                    {done && <span style={{ color: 'var(--nb-green)' }}> ✓ passed</span>}
                  </span>
                  <span style={{ fontSize: '0.82rem', color: 'var(--nb-ink-soft)' }}>{page.difficulty}</span>
                </Link>
              </li>
            );
          })}
        </ol>

        {nextTrack && (
          <p className="nb-body" style={{ marginTop: '2rem' }}>
            Next track: <Link to={`/practice/track/${nextTrack.slug}`} style={{ color: 'var(--nb-cobalt)' }}>{nextTrack.title}</Link>
          </p>
        )}
      </main>
    </div>
  );
}
