import { Link } from 'react-router-dom';
import Navbar from './layout/Navbar';
import { getSidebar, getFlatPages, type DocPage } from '../lib/contentTree';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import { useDocumentMeta } from '../lib/useDocumentMeta';
import { SECTION_META, SECTION_ORDER, completionFor } from '../data/sectionMeta';
import { useProgress } from '../contexts/ProgressContext';

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
 * /learn: the topic index. Every section's topics as plain links with page
 * counts, in reading order. A returning visitor gets one line on top with
 * the next unread page and any pages due for review.
 */
export default function Home() {
  useDocumentTitle('Learn AI: free lessons from the maths to LLMs and agents');
  useDocumentMeta(
    'Learn AI: free lessons from the maths to LLMs and agents',
    'A free, ordered path for learning AI: linear algebra and probability, classical ML, neural networks, transformers and LLMs, RAG and agents, with interactive diagrams and code you can run.',
  );
  const sections = getSidebar();
  const flatPages = getFlatPages();

  const { understood, isUnderstood, countWithin, dueForReview } = useProgress();
  // Gated on real, currently-existing pages (not raw understood-map key
  // count) -- a visitor whose only marked page was later renamed/removed
  // (see ProgressPage's own titleFor fallback for that same case) gets the
  // plain first-time view.
  const totalDone = countWithin(flatPages.map((p) => p.route));
  const hasProgress = totalDone > 0;
  const groupKey = hasProgress ? currentGroupKey(understood) : undefined;
  const nextPage = groupKey ? nextUnstartedPage(groupKey, flatPages, isUnderstood) : undefined;

  const sectionsById = new Map(sections.map((section) => [section.id, section]));

  return (
    <div style={{ minHeight: '100vh', background: 'var(--nm-bg)' }}>
      <Navbar />

      <section style={{ padding: '2.5rem 0 5rem' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 1.5rem' }}>
          {hasProgress && nextPage && (
            <p style={{ fontSize: 15, margin: '0 0 1.75rem', color: 'var(--nm-text-secondary)' }}>
              <Link to={nextPage.route} style={{ color: 'var(--nm-accent-primary)', fontWeight: 600 }}>
                Continue: {nextPage.title} →
              </Link>
              {dueForReview.length > 0 && (
                <>
                  {' · '}
                  <Link to="/progress" style={{ color: 'var(--nm-text-muted)' }}>
                    Review {dueForReview.length} due page{dueForReview.length === 1 ? '' : 's'} →
                  </Link>
                </>
              )}
            </p>
          )}
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--nm-text-primary)', margin: '0 0 0.4rem', fontFamily: 'var(--font-body)' }}>
            All topics
          </h1>
          <p style={{ fontSize: 14, color: 'var(--nm-text-muted)', margin: '0 0 2rem' }}>
            Grouped by section, in the order they build on each other. Open a topic to see its pages.
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
                        <details>
                          <summary>
                            <span className="nm-learn-topic-name">{section.label}</span>
                            <span className="nm-learn-topic-count">{section.pages.length}</span>
                          </summary>
                          <ol>
                            {section.pages.map((page) => (
                              <li key={page.route}>
                                <Link to={page.route}>{page.navLabel}</Link>
                                {isUnderstood(page.route) && <span aria-label="understood"> ✓</span>}
                              </li>
                            ))}
                          </ol>
                        </details>
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
