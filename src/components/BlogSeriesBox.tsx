import { Link } from 'react-router-dom';
import { getSeries } from '../data/blogSeries';
import { getSeriesPosts } from '../lib/blog';

/** On a series post: which part this is, every planned part (written ones
 * linked), and previous/next links. */
export default function BlogSeriesBox({ series, part }: { series: string; part: number }) {
  const meta = getSeries(series);
  if (!meta) return null;
  const published = new Map(getSeriesPosts(series).map((post) => [post.part, post]));
  const previous = published.get(part - 1);
  const next = published.get(part + 1);

  return (
    <aside className="nm-series-box" aria-label={`${meta.title} series`}>
      <p className="nm-series-title">
        <Link to={`/blog?tag=${encodeURIComponent(meta.tag)}`}>{meta.title}</Link> · Part {part} of {meta.plannedParts.length}
      </p>
      <ol>
        {meta.plannedParts.map((title, i) => {
          const n = i + 1;
          const post = published.get(n);
          return (
            <li key={n} className={n === part ? 'is-current' : post ? '' : 'is-planned'}>
              {n === part ? <strong>{title}</strong> : post ? <Link to={`/blog/${post.slug}`}>{title}</Link> : title}
            </li>
          );
        })}
      </ol>
      {(previous || next) && (
        <p className="nm-series-nav">
          {previous && <Link to={`/blog/${previous.slug}`}>← Part {part - 1}</Link>}
          {next && <Link to={`/blog/${next.slug}`} style={{ marginLeft: 'auto' }}>Part {part + 1} →</Link>}
        </p>
      )}
    </aside>
  );
}
