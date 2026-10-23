import { Link } from 'react-router-dom';

/** A post's topic tags. Each links to /blog filtered to that tag; the
 * active one is marked, and `showAll` adds an "All" link to clear it. */
export function TagList({ tags, active, showAll }: { tags: string[]; active?: string | null; showAll?: boolean }) {
  return (
    <ul className="nm-blog-tags">
      {showAll && (
        <li>
          <Link to="/blog" aria-current={!active ? 'page' : undefined}>
            All
          </Link>
        </li>
      )}
      {tags.map((tag) => (
        <li key={tag}>
          <Link to={`/blog?tag=${encodeURIComponent(tag)}`} aria-current={tag === active ? 'page' : undefined}>
            {tag}
          </Link>
        </li>
      ))}
    </ul>
  );
}
