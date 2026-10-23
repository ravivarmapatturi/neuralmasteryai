import { Suspense, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Navbar from './layout/Navbar';
import NotFoundPage from './NotFoundPage';
import { TagList } from './BlogTags';
import BlogSeriesBox from './BlogSeriesBox';
import { formatPostDate, getBlogComponent, getBlogPost } from '../lib/blog';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import { useDocumentMeta } from '../lib/useDocumentMeta';
import Markdown from './content/Markdown';
import { getStoredPost, readingMinutes, useIsAdmin, type StoredPost } from '../lib/blogStore';
import { useGamification } from '../contexts/GamificationContext';
import { BLOG_READ_POINTS, hasAward } from '../lib/gamification';

/** /blog/:slug: one post, in the same prose styles as the Learn pages.
 * File-based posts render their MDX; editor-written posts are fetched from
 * Firestore and rendered from markdown with the same components. */
export default function BlogPostPage() {
  const { slug = '' } = useParams();
  const filePost = getBlogPost(slug);
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
        <p style={{ padding: '3rem 0', textAlign: 'center', color: 'var(--nm-text-muted)', fontSize: 14 }}>Loading…</p>
      </div>
    );
  }
  if (filePost ? !Component : !stored) return <NotFoundPage />;

  const date = filePost?.date ?? stored?.date;
  const minutes = filePost?.readingMinutes ?? readingMinutes(stored!.body);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--nm-bg)' }}>
      <Navbar />
      <main style={{ maxWidth: 760, margin: '0 auto', padding: '2.5rem 1.5rem 4rem' }}>
        <p style={{ margin: '0 0 0.5rem', fontSize: 14, color: 'var(--nm-text-muted)' }}>
          <Link to="/blog" style={{ color: 'var(--nm-accent-primary)' }}>Blog</Link>
          {date && <> · {formatPostDate(date)}</>} · {minutes} min read
          {stored && stored.status !== 'published' && <> · Draft</>}
          {stored && isAdmin && <> · <Link to={`/blog/write/${stored.slug}`} style={{ color: 'var(--nm-accent-primary)' }}>Edit</Link></>}
        </p>
        {(filePost?.tags ?? stored?.tags ?? []).length > 0 && (
          <div style={{ margin: '0 0 1rem' }}>
            <TagList tags={filePost?.tags ?? stored?.tags ?? []} />
          </div>
        )}
        {filePost?.series && filePost.part != null && <BlogSeriesBox series={filePost.series} part={filePost.part} />}
        <article className="prose">
          {Component ? (
            <Suspense fallback={<div style={{ padding: '3rem 0', textAlign: 'center', color: 'var(--nm-text-muted)', fontSize: 14 }}>Loading…</div>}>
              <Component />
            </Suspense>
          ) : (
            <>
              <h1>{stored!.title}</h1>
              <Markdown source={stored!.body} />
            </>
          )}
        </article>
        <MarkReadButton slug={slug} />
        <p style={{ marginTop: '2rem', paddingTop: '1.25rem', borderTop: '1px solid var(--nm-border)', fontSize: 14 }}>
          <Link to="/blog" style={{ color: 'var(--nm-accent-primary)' }}>← All posts</Link>
        </p>
      </main>
    </div>
  );
}

/** End-of-post "Mark as read": earns BLOG_READ_POINTS once per post, through
 * the same award system as "Mark as understood" on lessons. */
function MarkReadButton({ slug }: { slug: string }) {
  const { events, awardBlogRead } = useGamification();
  const read = hasAward(events, `/blog/${slug}`, 'blog');
  return (
    <div style={{ marginTop: '2.5rem', textAlign: 'center' }}>
      {read ? (
        <p style={{ fontSize: 15, color: 'var(--nm-accent-primary)', fontWeight: 600 }}>✓ Read · {BLOG_READ_POINTS} points earned</p>
      ) : (
        <button type="button" className="nm-button nm-button-secondary" onClick={() => awardBlogRead(slug)} style={{ padding: '0.65rem 1.4rem', fontSize: 15 }}>
          Mark as read · +{BLOG_READ_POINTS} points
        </button>
      )}
    </div>
  );
}
