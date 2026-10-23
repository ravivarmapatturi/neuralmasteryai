import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { TagList } from './BlogTags';
import Navbar from './layout/Navbar';
import { formatPostDate, getBlogPosts, getSeriesPosts } from '../lib/blog';
import { BLOG_SERIES } from '../data/blogSeries';
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
  return {
    slug: post.slug,
    title: post.title,
    description: post.description || null,
    date: post.date,
    readingMinutes: readingMinutes(post.body),
    draft: post.status !== 'published',
    tags: post.tags,
  };
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
    ...getBlogPosts().map((p) => ({
      slug: p.slug,
      title: p.title,
      description: p.description,
      date: p.date,
      readingMinutes: p.readingMinutes,
      draft: false,
      tags: p.tags,
    })),
    ...stored.map(fromStored),
  ].sort((a, b) => Number(b.draft) - Number(a.draft) || (b.date ?? '').localeCompare(a.date ?? ''));
  const shown = activeTag ? rows.filter((row) => row.tags.includes(activeTag)) : rows;
  const allTags = [...new Set(rows.flatMap((row) => row.tags))].sort((a, b) => a.localeCompare(b));

  const featured = activeTag ? [] : BLOG_SERIES.filter((series) => getSeriesPosts(series.slug).length > 0);

  return (
    <div className="nb-theme" style={{ minHeight: '100vh' }}>
      <Navbar />
      <main className="nm-blog-shell">
        <header className="nm-blog-header">
          <div>
            <h1 className="nb-heading">Blog</h1>
            <p>Posts on new AI releases and longer series on how real systems work, explained from the ideas they build on.</p>
          </div>
          {isAdmin && (
            <Link to="/blog/write" className="nm-button nm-button-primary" style={{ background: 'var(--nb-cobalt)' }}>
              Write a post
            </Link>
          )}
        </header>

        <div className="nm-blog-grid">
          <div className="nm-blog-main">
            {featured.map((series) => {
              const parts = getSeriesPosts(series.slug);
              return (
                <section key={series.slug} className="nm-blog-feature" aria-label={`${series.title} series`}>
                  <p className="nm-blog-kicker">
                    Series · {parts.length} of {series.plannedParts.length} parts published
                  </p>
                  <h2>
                    <Link to={`/blog/${parts[0].slug}`}>{series.title}</Link>
                  </h2>
                  <p className="nm-blog-feature-desc">{series.description}</p>
                  <ol>
                    {parts.map((post) => (
                      <li key={post.slug}>
                        <Link to={`/blog/${post.slug}`}>{series.plannedParts[(post.part ?? 1) - 1]}</Link>
                      </li>
                    ))}
                  </ol>
                </section>
              );
            })}

            {activeTag && (
              <p className="nm-blog-filter">
                Posts tagged <strong>{activeTag}</strong> · <Link to="/blog">Show all</Link>
              </p>
            )}
            {shown.length === 0 ? (
              <p className="nb-body">{activeTag ? `No posts tagged "${activeTag}" yet.` : 'No posts yet.'}</p>
            ) : (
              <ol className="nm-blog-list">
                {shown.map((post) => (
                  <li key={post.slug}>
                    <p className="nm-blog-date">
                      {post.draft ? 'Draft' : post.date ? formatPostDate(post.date) : ''}
                      <span>{post.readingMinutes} min read</span>
                    </p>
                    <div>
                      <h2>
                        <Link to={post.draft ? `/blog/write/${post.slug}` : `/blog/${post.slug}`}>{post.title}</Link>
                      </h2>
                      {post.description && <p className="nm-blog-desc">{post.description}</p>}
                      {post.tags.length > 0 && <TagList tags={post.tags} active={activeTag} variant="inline" />}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>

          <aside className="nm-blog-rail" aria-label="Blog topics">
            {allTags.length > 0 && (
              <section>
                <h2>Topics</h2>
                <TagList tags={allTags} active={activeTag} showAll />
              </section>
            )}
            <section>
              <h2>Series</h2>
              <ul className="nm-blog-rail-list">
                {BLOG_SERIES.map((series) => {
                  const parts = getSeriesPosts(series.slug);
                  return (
                    <li key={series.slug}>
                      {parts.length > 0 ? <Link to={`/blog/${parts[0].slug}`}>{series.title}</Link> : series.title}
                      <span>
                        {parts.length} of {series.plannedParts.length} parts
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
            <section>
              <h2>About</h2>
              <p>
                Each post links back to the <Link to="/learn">Learn</Link> pages it builds on. Mark a post as read at the end to earn points toward your streak.
              </p>
            </section>
          </aside>
        </div>
      </main>
    </div>
  );
}
