import { Link } from 'react-router-dom';
import Navbar from './layout/Navbar';
import { formatPostDate, getBlogPosts } from '../lib/blog';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import { useDocumentMeta } from '../lib/useDocumentMeta';

/** /blog: every post, newest first. */
export default function BlogListPage() {
  useDocumentTitle('Blog');
  useDocumentMeta('Blog', 'Posts on new AI releases: the older ideas each one builds on, and how it works, with the maths and code.');
  const posts = getBlogPosts();

  return (
    <div className="nb-theme" style={{ minHeight: '100vh' }}>
      <Navbar />
      <main className="nm-landing-shell" style={{ maxWidth: 760, margin: '0 auto', padding: 'clamp(2.5rem, 6vw, 4.5rem) 0' }}>
        <h1 className="nb-heading" style={{ fontSize: 'clamp(2rem, 4vw, 2.8rem)', margin: '0 0 0.75rem' }}>
          Blog
        </h1>
        <p className="nb-body" style={{ maxWidth: 620, margin: '0 0 2.5rem' }}>
          Posts on new AI releases. Each one starts from the older ideas the release builds on, then explains how it
          works, with the maths and code.
        </p>
        {posts.length === 0 ? (
          <p className="nb-body">No posts yet.</p>
        ) : (
          <ol style={{ listStyle: 'none', margin: 0, padding: 0, borderTop: '1px solid var(--nb-rule)' }}>
            {posts.map((post) => (
              <li key={post.slug} style={{ borderBottom: '1px solid var(--nb-rule)' }}>
                <Link to={`/blog/${post.slug}`} style={{ display: 'block', padding: '1.4rem 0.25rem', textDecoration: 'none', color: 'inherit' }}>
                  <span className="nb-hand" style={{ color: 'var(--nb-ink-soft)', fontSize: '0.9rem' }}>
                    {formatPostDate(post.date)} · {post.readingMinutes} min read
                  </span>
                  <strong style={{ display: 'block', margin: '0.3rem 0 0.4rem', fontSize: '1.3rem', color: 'var(--nb-ink)' }}>{post.title}</strong>
                  {post.description && <span className="nb-body" style={{ display: 'block', fontSize: '0.98rem' }}>{post.description}</span>}
                </Link>
              </li>
            ))}
          </ol>
        )}
      </main>
    </div>
  );
}
