import { Link } from 'react-router-dom';
import Navbar from './layout/Navbar';
import AttentionStepThrough from '../viz/AttentionStepThrough';
import { getSidebar, getFlatPages, getPracticeProblems, type DocPage } from '../lib/contentTree';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import { useDocumentMeta } from '../lib/useDocumentMeta';
import { SECTION_META, SECTION_ORDER, completionFor } from '../data/sectionMeta';
import { useProgress } from '../contexts/ProgressContext';
import { useGamification } from '../contexts/GamificationContext';
import { recommendedProblem, cleanPracticeTitle } from '../lib/mastery';

/** The first top-level group (in SECTION_ORDER) the visitor hasn't fully
 * finished yet -- "current group" for a "continue where you left off" CTA.
 * Undefined only in the (practically unreachable) case every group is
 * already 100% complete. */
function currentGroupKey(understood: Record<string, unknown>): string | undefined {
  return SECTION_ORDER.find((key) => completionFor(key, understood) < 1);
}

/** First page within that group, in sidebar order, not yet marked
 * understood -- same "which pages belong to this group" match
 * (`/docs/<subsection dir>/`) completionFor itself uses, so the two never
 * disagree about which group a page counts toward. Every subsection
 * follows the same overview.mdx (position 1) -> roadmap.mdx (position 2)
 * convention, and roadmap.mdx is a checklist/index of links back into the
 * section, not real teaching content -- skipped here so marking just the
 * overview page understood doesn't immediately recommend it as "next". */
function nextUnstartedPage(groupKey: string, flatPages: DocPage[], isUnderstood: (route: string) => boolean): DocPage | undefined {
  const meta = SECTION_META[groupKey];
  return flatPages.find(
    (p) =>
      meta.subsections.some((s) => p.route.includes(`/docs/${s.dir}/`)) &&
      !p.route.endsWith('/roadmap') &&
      !isUnderstood(p.route),
  );
}

/**
 * The Learn destination -- mounted at /learn, not the site root (see
 * ChooserPage, the real root "/" now shows). Built around one idea: prove
 * the site's differentiator (real, computed, interactive visualizations --
 * not static diagrams) directly in the hero, rather than describing it in
 * marketing copy. No skill-level segmentation (kids/beginner/expert) -- the
 * topic-first organization mirrors the sidebar, and the underlying
 * intuition -> visualization -> math -> code structure on every page
 * already serves every level without asking anyone to self-select.
 * Practice gets one plain line (the next unsolved problem), not a card.
 * The topic index below is a grouped list of links, not a card wall.
 */
export default function Home() {
  useDocumentTitle('Learn AI: free lessons from the maths to LLMs and agents');
  useDocumentMeta(
    'Learn AI: free lessons from the maths to LLMs and agents',
    'A free, ordered path for learning AI: linear algebra and probability, classical ML, neural networks, transformers and LLMs, RAG and agents, with interactive diagrams and code you can run.',
  );
  const sections = getSidebar();
  const flatPages = getFlatPages();
  const totalPages = flatPages.length;

  const { understood, isUnderstood, countWithin, dueForReview } = useProgress();
  const { events } = useGamification();
  // Gated on real, currently-existing pages (not raw understood-map key
  // count) -- a visitor whose only marked page was later renamed/removed
  // (see ProgressPage's own titleFor fallback for that same case) should
  // see the normal first-time pitch, not a "you've understood 0 pages" hero.
  const totalDone = countWithin(flatPages.map((p) => p.route));
  const hasProgress = totalDone > 0;
  const groupKey = hasProgress ? currentGroupKey(understood) : undefined;
  const nextPage = groupKey ? nextUnstartedPage(groupKey, flatPages, isUnderstood) : undefined;
  const recommendedPractice = recommendedProblem(getPracticeProblems(), events, nextPage);

  const sectionsById = new Map(sections.map((section) => [section.id, section]));

  return (
    <div style={{ minHeight: '100vh', background: 'var(--nm-bg)' }}>
      <Navbar />

      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '4rem 1.5rem 3rem', textAlign: 'center' }}>
        <h1
          className="nm-display"
          style={{ fontSize: 'clamp(1.7rem, 4vw, 2.6rem)', fontWeight: 700, lineHeight: 1.25, margin: '0 0 1rem', color: 'var(--nm-text-primary)' }}
        >
          {hasProgress
            ? `Welcome back — you've understood ${totalDone} page${totalDone === 1 ? '' : 's'}.`
            : 'Learn AI from the ground up.'}
        </h1>
        <p
          style={{
            fontSize: 'clamp(1rem, 1.6vw, 1.15rem)',
            color: 'var(--nm-text-secondary)',
            maxWidth: 640,
            margin: '0 auto 2rem',
            lineHeight: 1.6,
            fontFamily: 'var(--font-body)',
          }}
        >
          {hasProgress ? (
            dueForReview.length > 0 ? (
              <>
                {dueForReview.length} page{dueForReview.length === 1 ? ' is' : 's are'} due for review —
                pick that back up, or keep moving forward.
              </>
            ) : (
              <>Nothing due for review right now — pick up where you left off.</>
            )
          ) : (
            <>
              Start with Python and the math, work up through classical ML and deep learning, then LLMs, agents, and
              the systems around them. {totalPages} pages so far. Many have a widget you can change and watch respond,
              like the one below.
            </>
          )}
        </p>

        <Link
          to={hasProgress && nextPage ? nextPage.route : '/docs/learning-path'}
          className="nm-home-cta"
          style={{
            display: 'inline-block',
            padding: '0.85rem 1.75rem',
            borderRadius: 10,
            background: 'var(--nm-accent-primary)',
            color: 'var(--nm-bg)',
            fontWeight: 700,
            fontSize: '1rem',
            textDecoration: 'none',
          }}
        >
          {hasProgress && nextPage ? `Continue: ${nextPage.title} →` : 'See the reading order →'}
        </Link>
        <div style={{ marginTop: '0.75rem', marginBottom: '2.5rem' }}>
          {hasProgress ? (
            <Link to="/progress" style={{ fontSize: 13.5, color: 'var(--nm-text-muted)', textDecoration: 'none' }}>
              {dueForReview.length > 0 ? `Review ${dueForReview.length} due page${dueForReview.length === 1 ? '' : 's'} →` : 'View full progress →'}
            </Link>
          ) : (
            <Link to="/docs/ml-system-design/case-studies" style={{ fontSize: 13.5, color: 'var(--nm-text-muted)', textDecoration: 'none' }}>
              or start from a case study →
            </Link>
          )}
        </div>

        <div style={{ maxWidth: 640, margin: '0 auto', textAlign: 'left' }}>
          <AttentionStepThrough />
        </div>
        <p style={{ fontSize: 13, color: 'var(--nm-text-muted)', marginTop: '0.75rem' }}>
          From the{' '}
          <Link to="/docs/deep-learning/attention-transformers" style={{ color: 'var(--nm-accent-primary)' }}>
            Attention &amp; Transformers
          </Link>{' '}
          page.
        </p>
        {recommendedPractice && (
          <p style={{ fontSize: 14, color: 'var(--nm-text-secondary)', margin: '1.5rem 0 0' }}>
            Want to write some code? Next practice problem:{' '}
            <Link to={recommendedPractice.route} style={{ color: 'var(--nm-accent-primary)', fontWeight: 600 }}>
              {cleanPracticeTitle(recommendedPractice.title)} →
            </Link>
          </p>
        )}
      </section>

      <section style={{ background: 'var(--nm-surface)', borderTop: '1px solid var(--nm-border)', padding: '2.5rem 0 5rem' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 1.5rem' }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--nm-text-primary)', margin: '0 0 0.4rem', fontFamily: 'var(--font-body)' }}>
            All topics
          </h2>
          <p style={{ fontSize: 14, color: 'var(--nm-text-muted)', margin: '0 0 2rem' }}>
            Grouped by section, in the order they build on each other.
          </p>
          <div className="nm-learn-topics">
            {SECTION_ORDER.map((key) => {
              const meta = SECTION_META[key];
              const topics = meta.subsections
                .map((sub) => sectionsById.get(sub.dir))
                .filter((section): section is NonNullable<typeof section> => Boolean(section?.pages[0]));
              if (topics.length === 0) return null;
              return (
                <div key={key} style={{ '--section-color': meta.color } as React.CSSProperties}>
                  <h3>{meta.label}</h3>
                  <ul>
                    {topics.map((section) => (
                      <li key={section.id}>
                        <Link to={section.pages[0].route}>{section.label}</Link>
                        <span>{section.pages.length}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
