import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { TagList } from './BlogTags';
import Navbar from './layout/Navbar';
import { formatPostDate, getBlogPosts } from '../lib/blog';
import { listAllPosts, listPublishedPosts, readingMinutes, useIsAdmin, type StoredPost } from '../lib/blogStore';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import { useDocumentMeta } from '../lib/useDocumentMeta';

interface Row {
  slug: string;
  title: string;
  description: string | null;
  date: string | null;
  readingMinutes: number;
  draft: boolean;
  tags: string[];
}

function fromStored(post: StoredPost): Row {
  return { slug: post.slug, title: post.title, description: post.description || null, date: post.date, readingMinutes: readingMinutes(post.body), draft: post.status !== 'published', tags: post.tags };
}

/** /blog: every post, newest first. File-based posts (src/content/blog) and
 * posts written in the editor (Firestore) are listed together. Admins also
 * see their drafts, and a link to write a new post. */
export default function BlogListPage() {
  useDocumentTitle('Blog');
  useDocumentMeta('Blog', 'Posts on new AI releases: the older ideas each one builds on, and how it works, with the maths and code.');
  const isAdmin = useIsAdmin();
  const [stored, setStored] = useState<StoredPost[]>([]);
  const [params] = useSearchParams();
  const activeTag = params.get('tag');

  useEffect(() => {
    let cancelled = false;
    (isAdmin ? listAllPosts() : listPublishedPosts())
      .then((posts) => {
        if (!cancelled) setStored(posts);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  const rows: Row[] = [
    ...getBlogPosts().map((p) => ({ slug: p.slug, title: p.title, description: p.description, date: p.date, readingMinutes: p.readingMinutes, draft: false, tags: p.tags })),
    ...stored.map(fromStored),
  ].sort((a, b) => Number(b.draft) - Number(a.draft) || (b.date ?? '').localeCompare(a.date ?? ''));
  const shown = activeTag ? rows.filter((row) => row.tags.includes(activeTag)) : rows;
  const allTags = [...new Set(rows.flatMap((row) => row.tags))].sort((a, b) => a.localeCompare(b));

  return (
    <div className="nb-theme" style={{ minHeight: '100vh' }}>
      <Navbar />
      <main className="nm-landing-shell" style={{ maxWidth: 760, margin: '0 auto', padding: 'clamp(2.5rem, 6vw, 4.5rem) 0' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <h1 className="nb-heading" style={{ fontSize: 'clamp(2rem, 4vw, 2.8rem)', margin: '0 0 0.75rem' }}>
            Blog
          </h1>
          {isAdmin && (
            <Link to="/blog/write" className="nm-button nm-button-primary" style={{ background: 'var(--nb-cobalt)' }}>
              Write a post
            </Link>
          )}
        </div>
        <p className="nb-body" style={{ maxWidth: 620, margin: '0 0 2.5rem' }}>
          Posts on new AI releases. Each one starts from the older ideas the release builds on, then explains how it
          works, with the maths and code.
        </p>
        {allTags.length > 0 && (
          <nav aria-label="Topics" style={{ margin: '-1rem 0 2rem' }}>
            <TagList tags={allTags} active={activeTag} showAll />
          </nav>
        )}
        {shown.length === 0 ? (
          <p className="nb-body">{activeTag ? `No posts tagged "${activeTag}" yet.` : 'No posts yet.'}</p>
        ) : (
          <ol style={{ listStyle: 'none', margin: 0, padding: 0, borderTop: '1px solid var(--nb-rule)' }}>
            {shown.map((post) => (
              <li key={post.slug} style={{ borderBottom: '1px solid var(--nb-rule)', padding: '1.4rem 0.25rem' }}>
                <Link to={post.draft ? `/blog/write/${post.slug}` : `/blog/${post.slug}`} style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}>
                  <span className="nb-hand" style={{ color: 'var(--nb-ink-soft)', fontSize: '0.9rem' }}>
                    {post.draft ? 'Draft' : post.date ? formatPostDate(post.date) : ''} · {post.readingMinutes} min read
                  </span>
                  <strong style={{ display: 'block', margin: '0.3rem 0 0.4rem', fontSize: '1.3rem', color: 'var(--nb-ink)' }}>{post.title}</strong>
                  {post.description && <span className="nb-body" style={{ display: 'block', fontSize: '0.98rem' }}>{post.description}</span>}
                </Link>
                {post.tags.length > 0 && <div style={{ marginTop: '0.6rem' }}><TagList tags={post.tags} active={activeTag} /></div>}
              </li>
            ))}
          </ol>
        )}
      </main>
    </div>
  );
}
