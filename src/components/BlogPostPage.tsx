import { Suspense } from 'react';
import { Link, useParams } from 'react-router-dom';
import Navbar from './layout/Navbar';
import NotFoundPage from './NotFoundPage';
import { formatPostDate, getBlogComponent, getBlogPost } from '../lib/blog';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import { useDocumentMeta } from '../lib/useDocumentMeta';
import { useGamification } from '../contexts/GamificationContext';
import { BLOG_READ_POINTS, hasAward } from '../lib/gamification';

/** /blog/:slug: one post, in the same prose styles as the Learn pages. */
export default function BlogPostPage() {
  const { slug = '' } = useParams();
  const post = getBlogPost(slug);
  const Component = post ? getBlogComponent(slug) : undefined;
  useDocumentTitle(post?.title);
  useDocumentMeta(post?.title, post?.description ?? undefined, post ? [{ label: 'Blog', href: '/blog' }] : undefined);

  if (!post || !Component) return <NotFoundPage />;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--nm-bg)' }}>
      <Navbar />
      <main style={{ maxWidth: 760, margin: '0 auto', padding: '2.5rem 1.5rem 4rem' }}>
        <p style={{ margin: '0 0 0.5rem', fontSize: 14, color: 'var(--nm-text-muted)' }}>
          <Link to="/blog" style={{ color: 'var(--nm-accent-primary)' }}>Blog</Link> · {formatPostDate(post.date)} · {post.readingMinutes} min read
        </p>
        <article className="prose">
          <Suspense fallback={<div style={{ padding: '3rem 0', textAlign: 'center', color: 'var(--nm-text-muted)', fontSize: 14 }}>Loading…</div>}>
            <Component />
          </Suspense>
        </article>
        <MarkReadButton slug={post.slug} />
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
