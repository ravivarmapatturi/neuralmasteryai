import { Link } from 'react-router-dom';
import { getPracticeProblems } from '../../lib/contentTree';
import { isSolved } from '../../lib/mastery';
import { useGamification } from '../../contexts/GamificationContext';
import type { CatalogTrack } from '../../data/practiceCatalog';

/**
 * Where this problem sits in a project track: every stage, which ones you've
 * passed, and a link to the one before and after. Project tracks build one
 * program across problems, so "you are on stage 4 of 12, and stage 4 uses
 * your stage-3 code" is the context a learner actually needs here.
 */
export default function TrackStageMap({ track, problemId }: { track: CatalogTrack; problemId: string }) {
  const { events } = useGamification();
  const pages = new Map(getPracticeProblems().filter((p) => p.problemId).map((p) => [p.problemId!, p]));
  const stages = track.problems.map((id) => pages.get(id)).filter((p) => p !== undefined);
  const index = track.problems.indexOf(problemId);
  const prev = stages[index - 1];
  const next = stages[index + 1];

  return (
    <nav
      aria-label={`${track.title} stages`}
      style={{
        marginBottom: 20,
        padding: '12px 14px',
        borderRadius: 8,
        background: 'var(--nm-surface)',
        border: '1px solid var(--nm-border)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
        <Link to={`/practice/track/${track.slug}`} style={{ fontSize: 13, fontWeight: 700, color: 'var(--nm-text-primary)', textDecoration: 'none' }}>
          {track.title}
        </Link>
        <span style={{ fontSize: 12, color: 'var(--nm-text-muted)' }}>
          Stage {index + 1} of {stages.length}
        </span>
      </div>
      <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {stages.map((page, i) => {
          const current = i === index;
          const done = isSolved(page, events);
          return (
            <li key={page.route}>
              <Link
                to={page.route}
                title={`${i + 1}. ${page.title}${done ? ' (passed)' : ''}`}
                aria-current={current ? 'step' : undefined}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 26,
                  height: 26,
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 700,
                  textDecoration: 'none',
                  color: current ? 'var(--nm-bg)' : done ? 'var(--nm-accent-primary)' : 'var(--nm-text-secondary)',
                  background: current ? 'var(--nm-text-primary)' : 'transparent',
                  border: `1px solid ${done && !current ? 'var(--nm-accent-primary)' : 'var(--nm-border)'}`,
                }}
              >
                {done && !current ? '✓' : i + 1}
              </Link>
            </li>
          );
        })}
      </ol>
      {(prev || next) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginTop: 10, fontSize: 12 }}>
          <span>
            {prev && (
              <Link to={prev.route} style={{ color: 'var(--nm-text-secondary)', textDecoration: 'none' }}>
                ← {prev.title}
              </Link>
            )}
          </span>
          <span style={{ textAlign: 'right' }}>
            {next && (
              <Link to={next.route} style={{ color: 'var(--nm-text-secondary)', textDecoration: 'none' }}>
                {next.title} →
              </Link>
            )}
          </span>
        </div>
      )}
    </nav>
  );
}
