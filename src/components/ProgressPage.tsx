import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import Navbar from './layout/Navbar';
import { getSidebar, getFlatPages, getPracticeProblems } from '../lib/contentTree';

import { SECTION_META, SECTION_ORDER, completionFor } from '../data/sectionMeta';
import { useProgress, REVIEW_INTERVALS_DAYS } from '../contexts/ProgressContext';
import { useGamification } from '../contexts/GamificationContext';
import { levelForPoints } from '../lib/gamification';
import { DomainIcon } from './icons/DomainIcons';
import { practiceStats, isSolved, nextLesson, recommendedProblem, cleanPracticeTitle } from '../lib/mastery';
import { getPracticeTracks, buildTopicLabels } from '../lib/practiceTracks';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import { useDocumentMeta } from '../lib/useDocumentMeta';
import ConfirmDialog from './common/ConfirmDialog';

/** Best-effort title lookup for a permalink -- falls back to the raw path
 * for the (should-be-rare) case a stored permalink no longer matches any
 * current page, e.g. a page that was later renamed or removed. */
function titleFor(route: string, flatPages: ReturnType<typeof getFlatPages>): string {
  return flatPages.find((p) => p.route === route)?.title ?? route;
}

const TRACK_ACCENTS = [
  '#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#3b82f6', '#14b8a6', '#f97316', '#a855f7'
];

/**
 * /progress: what you've done and what's next. A one-sentence summary, the
 * next lesson or problem, lessons by section next to practice by track, the
 * spaced-repetition queue, and the page-by-page checklist. Badges, rank and
 * level live on /profile so this page stays a working tool.
 */
export default function ProgressPage() {
  useDocumentTitle('Your Progress');
  useDocumentMeta('Your Progress', 'Pages you have marked understood, practice problems solved, and pages due for review.');

  const { understood, isUnderstood, toggle, countWithin, reset, dueForReview, markReviewed } = useProgress();
  const { points, streak, events, awardReviewCompleted } = useGamification();
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const { level } = levelForPoints(points);

  const sections = getSidebar();
  const flatPages = useMemo(() => getFlatPages(), []);
  const problems = useMemo(() => getPracticeProblems(), []);
  const totalPages = flatPages.length;
  const totalDone = countWithin(flatPages.map((p) => p.route));
  const overallPct = totalPages === 0 ? 0 : totalDone / totalPages;

  const practice = useMemo(() => practiceStats(problems, events), [problems, events]);
  const practicePct = practice.total === 0 ? 0 : practice.solved / practice.total;
  const tracks = useMemo(() => getPracticeTracks(problems), [problems]);
  const topicLabels = useMemo(() => buildTopicLabels(), []);

  const systemDesignSolved = useMemo(() => events.filter((e) => e.kind === 'design').length, [events]);

  // Next Best Action determination
  const nextLessonDoc = useMemo(() => nextLesson(flatPages, understood), [flatPages, understood]);
  const recommendedProb = useMemo(() => recommendedProblem(problems, events, nextLessonDoc), [problems, events, nextLessonDoc]);

  // Checkpoints for curriculum
  const curriculumCheckpoints = useMemo(() => {
    return SECTION_ORDER.map((key) => {
      const meta = SECTION_META[key];
      const pct = completionFor(key, understood);
      const groupPages = flatPages.filter((p) =>
        meta.folders
          ? meta.folders.some((f) => p.route.includes(`/docs/${f}/`))
          : meta.subsections.some((s) => p.route.includes(`/docs/${s.dir}/`)),
      );
      const groupDone = countWithin(groupPages.map((p) => p.route));
      const nextInGroup = groupPages.find((p) => !understood[p.route] && !p.route.endsWith('/roadmap'));
      return {
        key,
        meta,
        pct,
        groupDone,
        groupTotal: groupPages.length || meta.pageCount,
        nextInGroup,
      };
    });
  }, [flatPages, understood, countWithin]);

  // Per-topic Mastery Map matching /practice track calculations exactly
  const masteryMapRows = useMemo(() => {
    return tracks.map((track, idx) => {
      const topicProblems = problems.filter((p) => p.topic === track.topic);
      const solved = topicProblems.filter((p) => isSolved(p, events)).length;
      const total = topicProblems.length;
      const pct = total > 0 ? Math.round((solved / total) * 100) : 0;
      const accent = TRACK_ACCENTS[idx % TRACK_ACCENTS.length];
      return { track, solved, total, pct, accent };
    });
  }, [tracks, problems, events]);

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  return (
    <div style={{ minHeight: '100vh', background: 'var(--nm-bg)' }}>
      <Navbar />

      <section style={{ maxWidth: 1040, margin: '0 auto', padding: '2.5rem 1.5rem 3rem' }}>
        <header style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.1rem)', fontWeight: 800, color: 'var(--nm-text-primary)', margin: '0 0 0.6rem' }}>
            Your progress
          </h1>
          <p style={{ fontSize: 15, lineHeight: 1.6, color: 'var(--nm-text-secondary)', margin: 0, maxWidth: 680 }}>
            You've marked <strong>{totalDone}</strong> of {totalPages} pages understood and solved{' '}
            <strong>{practice.solved}</strong> of {practice.total} practice problems
            {systemDesignSolved > 0 ? <>, plus {systemDesignSolved} system design challenge{systemDesignSolved === 1 ? '' : 's'}</> : null}.
            {streak > 0 ? <> You're on a {streak}-day streak.</> : null}
          </p>
          <p style={{ fontSize: 13, color: 'var(--nm-text-muted)', margin: '0.5rem 0 0' }}>
            Level {level} · {points} points ·{' '}
            <Link to="/profile" style={{ color: 'var(--nm-accent-primary)' }}>profile and badges</Link>
          </p>
        </header>

        {(recommendedProb || nextLessonDoc) && (
          <div
            style={{
              padding: '1rem 1.25rem',
              borderRadius: 10,
              border: '1px solid var(--nm-border)',
              borderLeft: '3px solid var(--nm-accent-primary)',
              background: 'var(--nm-surface)',
              marginBottom: '2rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 16,
            }}
          >
            <div style={{ minWidth: 260, flex: 1 }}>
              <div style={{ fontSize: 12.5, color: 'var(--nm-text-muted)', marginBottom: 2 }}>Up next</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--nm-text-primary)' }}>
                {recommendedProb ? cleanPracticeTitle(recommendedProb.title) : nextLessonDoc?.title}
              </div>
              <div style={{ fontSize: 13, color: 'var(--nm-text-secondary)', marginTop: 2 }}>
                {recommendedProb
                  ? `Practice problem${recommendedProb.topic ? ` · ${topicLabels[recommendedProb.topic] ?? recommendedProb.topic}` : ''}${recommendedProb.difficulty ? ` · ${recommendedProb.difficulty}` : ''}`
                  : `Lesson · ${nextLessonDoc?.section}`}
              </div>
            </div>

            <Link
              to={recommendedProb ? recommendedProb.route : nextLessonDoc ? nextLessonDoc.route : '/practice'}
              className="nm-button nm-button-primary"
              style={{ padding: '0.6rem 1.1rem', fontSize: 13.5, fontWeight: 700, textDecoration: 'none', flexShrink: 0 }}
            >
              {recommendedProb ? 'Open problem →' : 'Open lesson →'}
            </Link>
          </div>
        )}
        {/* --- Side-by-side Progress Sections --- */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
            gap: 20,
            marginBottom: '2.5rem',
          }}
        >
          {/* Section 1: Curriculum Progress */}
          <div
            style={{
              borderRadius: 14,
              border: '1px solid var(--nm-border)',
              background: 'var(--nm-surface)',
              padding: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                <h2 style={{ fontSize: 16, fontWeight: 800, color: 'var(--nm-text-primary)', margin: 0 }}>
                  Lessons
                </h2>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--nm-text-muted)' }}>
                  {totalDone} / {totalPages} pages ({Math.round(overallPct * 100)}%)
                </span>
              </div>
              <div style={{ height: 6, borderRadius: 3, background: 'var(--nm-border)', overflow: 'hidden' }}>
                <div style={{ width: `${overallPct * 100}%`, height: '100%', background: 'var(--nm-accent-primary)', transition: 'width 200ms ease' }} />
              </div>
            </div>

            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--nm-text-muted)' }}>
              By section
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {curriculumCheckpoints.map(({ key, meta, pct, groupDone, groupTotal, nextInGroup }) => (
                <div
                  key={key}
                  style={{
                    padding: '0.85rem 1rem',
                    borderRadius: 10,
                    border: '1px solid var(--nm-border)',
                    background: 'color-mix(in srgb, var(--nm-bg) 50%, var(--nm-surface))',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <DomainIcon groupKey={key} color={meta.color} size={18} />
                      <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--nm-text-primary)' }}>{meta.label}</span>
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: meta.color }}>
                      {Math.round(pct * 100)}% <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--nm-text-muted)' }}>({groupDone}/{groupTotal})</span>
                    </span>
                  </div>

                  <div style={{ height: 5, borderRadius: 2.5, background: 'var(--nm-border)', overflow: 'hidden', marginBottom: 8 }}>
                    <div style={{ width: `${pct * 100}%`, height: '100%', background: meta.color, transition: 'width 200ms ease' }} />
                  </div>

                  {nextInGroup ? (
                    <div style={{ fontSize: 12, color: 'var(--nm-text-muted)' }}>
                      Next:{' '}
                      <Link to={nextInGroup.route} style={{ color: 'var(--nm-text-secondary)', textDecoration: 'none', fontWeight: 600 }}>
                        {nextInGroup.title} →
                      </Link>
                    </div>
                  ) : (
                    <div style={{ fontSize: 11.5, color: '#10b981', fontWeight: 600 }}>
                      ✓ Done
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Section 2: Practice Progress */}
          <div
            style={{
              borderRadius: 14,
              border: '1px solid var(--nm-border)',
              background: 'var(--nm-surface)',
              padding: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                <h2 style={{ fontSize: 16, fontWeight: 800, color: 'var(--nm-text-primary)', margin: 0 }}>
                  Practice
                </h2>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--nm-text-muted)' }}>
                  {practice.solved} / {practice.total} solved ({Math.round(practicePct * 100)}%)
                </span>
              </div>
              <div style={{ height: 6, borderRadius: 3, background: 'var(--nm-border)', overflow: 'hidden', marginBottom: 10 }}>
                <div style={{ width: `${practicePct * 100}%`, height: '100%', background: '#10b981', transition: 'width 200ms ease' }} />
              </div>

              <div style={{ fontSize: 12.5, color: 'var(--nm-text-muted)' }}>
                Easy {practice.easySolved} · Medium {practice.mediumSolved} · Hard {practice.hardSolved}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--nm-text-muted)' }}>
                By track
              </span>
              <Link to="/practice" style={{ fontSize: 12, color: 'var(--nm-accent-primary)', textDecoration: 'none', fontWeight: 600 }}>
                All tracks →
              </Link>
            </div>

            {/* Per-topic Mastery Map list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 420, overflowY: 'auto', paddingRight: 4 }}>
              {masteryMapRows.map(({ track, solved, total, pct, accent }) => (
                <Link
                  key={track.slug}
                  to={`/practice/track/${track.slug}`}
                  style={{
                    display: 'block',
                    padding: '0.65rem 0.85rem',
                    borderRadius: 8,
                    border: '1px solid var(--nm-border)',
                    background: 'color-mix(in srgb, var(--nm-bg) 50%, var(--nm-surface))',
                    textDecoration: 'none',
                    transition: 'border-color 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--nm-text-primary)' }}>
                      {track.label}
                    </span>
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: accent }}>
                      {solved} / {total} ({pct}%)
                    </span>
                  </div>
                  <div style={{ height: 4, borderRadius: 2, background: 'var(--nm-border)', overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: accent, transition: 'width 200ms ease' }} />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* --- Due for review (Spaced Repetition) --- */}
        <h2 style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--nm-text-muted)', marginBottom: '0.9rem' }}>
          Due for review
        </h2>
        <div style={{ borderRadius: 12, border: '1px solid var(--nm-border)', background: 'var(--nm-surface)', marginBottom: '2.5rem', overflow: 'hidden' }}>
          {dueForReview.length === 0 ? (
            <p style={{ margin: 0, padding: '1rem 1.25rem', fontSize: 13, color: 'var(--nm-text-muted)', lineHeight: 1.6 }}>
              Nothing due right now. Pages you mark understood get a simple spaced-repetition schedule (review reminders at 1, 3, 7, 14, and 30 days) —
              they&rsquo;ll show up here once one comes due.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {dueForReview.map((route, i) => (
                <div
                  key={route}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '0.65rem 1.25rem',
                    borderTop: i === 0 ? 'none' : '1px solid var(--nm-border)',
                  }}
                >
                  <Link to={route} style={{ flex: 1, minWidth: 0, fontSize: 13.5, color: 'var(--nm-text-primary)', textDecoration: 'none' }}>
                    {titleFor(route, flatPages)}
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      const nextStage = Math.min((understood[route]?.stage ?? 0) + 1, REVIEW_INTERVALS_DAYS.length - 1);
                      markReviewed(route);
                      awardReviewCompleted(route, nextStage);
                    }}
                    style={{
                      flexShrink: 0,
                      fontSize: 12.5,
                      fontWeight: 600,
                      color: 'var(--nm-accent-primary)',
                      background: 'color-mix(in srgb, var(--nm-accent-primary) 12%, transparent)',
                      border: `1px solid var(--nm-accent-primary)`,
                      borderRadius: 8,
                      padding: '0.35rem 0.7rem',
                      cursor: 'pointer',
                    }}
                  >
                    Reviewed
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* --- By section checklist --- */}
        <h2 style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--nm-text-muted)', marginBottom: '0.9rem' }}>
          By section — click a page to toggle it
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: '2.5rem' }}>
          {sections.map((section) => {
            const done = countWithin(section.pages.map((p) => p.route));
            const isOpen = !!expanded[section.id];
            return (
              <div key={section.id} style={{ borderRadius: 10, border: '1px solid var(--nm-border)', background: 'var(--nm-surface)', overflow: 'hidden' }}>
                <button
                  type="button"
                  onClick={() => setExpanded((prev) => ({ ...prev, [section.id]: !prev[section.id] }))}
                  style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.7rem 0.9rem', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--nm-text-primary)', fontSize: 13.5, fontWeight: 600 }}
                >
                  <span>{isOpen ? '▾' : '▸'} {section.label}</span>
                  <span style={{ fontSize: 12, color: 'var(--nm-text-muted)', fontWeight: 400 }}>{done} / {section.pages.length}</span>
                </button>
                {isOpen && (
                  <div style={{ padding: '0 0.9rem 0.75rem', display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {section.pages.map((page) => {
                      const done = isUnderstood(page.route);
                      return (
                        <div key={page.route} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0.35rem 0' }}>
                          <button
                            type="button"
                            onClick={() => toggle(page.route)}
                            aria-pressed={done}
                            aria-label={done ? `Mark ${page.title} as not understood` : `Mark ${page.title} as understood`}
                            style={{ width: 18, height: 18, flexShrink: 0, borderRadius: 5, border: `1.5px solid ${done ? 'var(--nm-accent-primary)' : 'var(--nm-border)'}`, background: done ? 'var(--nm-accent-primary)' : 'transparent', color: 'var(--nm-bg)', fontSize: 11, lineHeight: '15px', cursor: 'pointer', padding: 0 }}
                          >
                            {done ? '✓' : ''}
                          </button>
                          <Link to={page.route} style={{ fontSize: 13, color: done ? 'var(--nm-text-muted)' : 'var(--nm-text-secondary)', textDecoration: 'none' }}>
                            {page.title}
                          </Link>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => setConfirmResetOpen(true)}
          style={{ fontSize: 13, color: 'var(--nm-text-muted)', background: 'transparent', border: '1px solid var(--nm-border)', borderRadius: 8, padding: '0.5rem 0.9rem', cursor: 'pointer' }}
        >
          Reset progress
        </button>
      </section>
      <ConfirmDialog
        open={confirmResetOpen}
        title="Reset all progress?"
        description="This clears every page you've marked as understood."
        confirmLabel="Reset"
        onConfirm={() => {
          setConfirmResetOpen(false);
          reset();
        }}
        onCancel={() => setConfirmResetOpen(false)}
      />
    </div>
  );
}
