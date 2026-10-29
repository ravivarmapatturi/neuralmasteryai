import { Suspense, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Navbar from './layout/Navbar';
import NotFoundPage from './NotFoundPage';
import { TagList } from './BlogTags';
import BlogSeriesBox, { SeriesPager } from './BlogSeriesBox';
import TableOfContents from './layout/TableOfContents';
import { formatPostDate, getBlogComponent, getBlogPost } from '../lib/blog';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import { useDocumentMeta } from '../lib/useDocumentMeta';
import Markdown from './content/Markdown';
import { getStoredPost, readingMinutes, useIsAdmin, type StoredPost } from '../lib/blogStore';
import { useGamification } from '../contexts/GamificationContext';
import { BLOG_READ_POINTS, hasAward } from '../lib/gamification';
import BlogCover from './BlogCover';

/** /blog/:slug: one post, in the same prose styles as the Learn pages.
 * File-based posts render their MDX; editor-written posts are fetched from
 * Firestore and rendered from markdown with the same components. */
export default function BlogPostPage() {
  const { slug = '' } = useParams();
  const filePost = getBlogPost(slug);
  const articleRef = useRef<HTMLElement | null>(null);
  const series = filePost?.series && filePost.part != null ? { series: filePost.series, part: filePost.part } : null;
  const Component = filePost ? getBlogComponent(slug) : undefined;
  const isAdmin = useIsAdmin();
  const [stored, setStored] = useState<StoredPost | null | undefined>(filePost ? null : undefined);

  useEffect(() => {
    if (filePost) return;
    let cancelled = false;
    setStored(undefined);
    getStoredPost(slug).then((post) => {
      if (!cancelled) setStored(post && (post.status === 'published' || isAdmin) ? post : null);
    });
    return () => {
      cancelled = true;
    };
  }, [slug, filePost, isAdmin]);

  const title = filePost?.title ?? stored?.title;
  const description = filePost?.description ?? stored?.description ?? undefined;
  useDocumentTitle(title);
  useDocumentMeta(title, description || undefined, title ? [{ label: 'Blog', href: '/blog' }] : undefined);

  if (!filePost && stored === undefined) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--nm-bg)' }}>
        <Navbar />
        <p
          style={{
            padding: '3rem 0',
            textAlign: 'center',
            color: 'var(--nm-text-muted)',
            fontSize: 14,
          }}
        >
          Loading…
        </p>
      </div>
    );
  }
  if (filePost ? !Component : !stored) return <NotFoundPage />;

  const date = filePost?.date ?? stored?.date;
  const minutes = filePost?.readingMinutes ?? readingMinutes(stored!.body);
  const tags = filePost?.tags ?? stored?.tags ?? [];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--nm-bg)' }}>
      <Navbar />
      <ReadingProgress articleRef={articleRef} />
      <main className="nm-blog-shell">
        <div className="nm-post-grid">
          <div className="nm-post-main">
            <header className="nm-post-header">
              <p className="nm-post-eyebrow">
              <Link to="/blog" style={{ color: 'var(--nm-accent-primary)' }}>
                Blog
              </Link>
              {date && <> · {formatPostDate(date)}</>} · {minutes} min read
              {stored && stored.status !== 'published' && <> · Draft</>}
              {stored && isAdmin && (
                <>
                  {' '}
                  ·{' '}
                  <Link to={`/blog/write/${stored.slug}`} style={{ color: 'var(--nm-accent-primary)' }}>
                    Edit
                  </Link>
                </>
              )}
              </p>
              {tags.length > 0 && (
                <div className="nm-post-tags">
                  <TagList tags={tags.slice(0, 3)} variant="inline" />
                </div>
              )}
              <h1 className="nm-post-title">{title}</h1>
              {description && <p className="nm-post-standfirst">{description}</p>}
              <div className="nm-post-author"><span className="nm-post-author-mark">RV</span><span><strong>Ravi Varma Patturi</strong><small>Neural Mastery · technical field notes</small></span></div>
              <BlogCover slug={slug} series={filePost?.series} className="nm-post-cover" />
            </header>
            {series && <BlogSeriesBox {...series} variant="inline" />}
            <article className="prose" ref={articleRef}>
              {Component ? (
                <Suspense
                  fallback={
                    <div
                      style={{
                        padding: '3rem 0',
                        textAlign: 'center',
                        color: 'var(--nm-text-muted)',
                        fontSize: 14,
                      }}
                    >
                      Loading…
                    </div>
                  }
                >
                  <Component />
                </Suspense>
              ) : (
                <>
                  <h1>{stored!.title}</h1>
                  <Markdown source={stored!.body} />
                </>
              )}
            </article>
            {series && <SeriesPager {...series} />}
            <section className="nm-blog-learn-bridge" aria-label="Continue learning">
              <p className="nm-blog-kicker">Continue learning</p>
              <h2>Turn this idea into working knowledge.</h2>
              <p>Explore the structured Neural Mastery curriculum for first-principles lessons, diagrams, and practice.</p>
              <Link to="/learn" className="nm-blog-read-link">Explore Learn <span aria-hidden="true">→</span></Link>
            </section>
            <MarkReadButton slug={slug} />
            <p
              style={{
                marginTop: '2rem',
                paddingTop: '1.25rem',
                borderTop: '1px solid var(--nm-border)',
                fontSize: 14,
              }}
            >
              <Link to="/blog" style={{ color: 'var(--nm-accent-primary)' }}>
                ← All posts
              </Link>
            </p>
          </div>
          <aside className="nm-post-rail">
            {series && <BlogSeriesBox {...series} variant="rail" />}
            <TableOfContents contentRef={articleRef} />
          </aside>
        </div>
      </main>
    </div>
  );
}

function ReadingProgress({ articleRef }: { articleRef: React.RefObject<HTMLElement | null> }) {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const update = () => {
      const article = articleRef.current;
      if (!article) return;
      const start = article.getBoundingClientRect().top + window.scrollY - 120;
      const total = Math.max(article.offsetHeight - window.innerHeight, 1);
      setProgress(Math.max(0, Math.min(100, ((window.scrollY - start) / total) * 100)));
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => { window.removeEventListener('scroll', update); window.removeEventListener('resize', update); };
  }, [articleRef]);
  return <div className="nm-reading-progress" aria-hidden="true"><span style={{ width: `${progress}%` }} /></div>;
}

/** End-of-post "Mark as read": earns BLOG_READ_POINTS once per post, through
 * the same award system as "Mark as understood" on lessons. */
function MarkReadButton({ slug }: { slug: string }) {
  const { events, awardBlogRead } = useGamification();
  const read = hasAward(events, `/blog/${slug}`, 'blog');
  return (
    <div style={{ marginTop: '2.5rem', textAlign: 'center' }}>
      {read ? (
        <p
          style={{
            fontSize: 15,
            color: 'var(--nm-accent-primary)',
            fontWeight: 600,
          }}
        >
          ✓ Read · {BLOG_READ_POINTS} points earned
        </p>
      ) : (
        <button type="button" className="nm-button nm-button-secondary" onClick={() => awardBlogRead(slug)} style={{ padding: '0.65rem 1.4rem', fontSize: 15 }}>
          Mark as read · +{BLOG_READ_POINTS} points
        </button>
      )}
    </div>
  );
}
