import { Link } from 'react-router-dom';
import { getSeries } from '../data/blogSeries';
import { getSeriesPosts } from '../lib/blog';

function useSeriesParts(series: string) {
  const meta = getSeries(series);
  const published = new Map(getSeriesPosts(series).map((post) => [post.part, post]));
  return { meta, published };
}

function PartItem({ n, title, part, slug }: { n: number; title: string; part: number; slug?: string }) {
  return (
    <li value={n} className={n === part ? 'is-current' : slug ? undefined : 'is-planned'}>
      {n === part ? <span aria-current="page">{title}</span> : slug ? <Link to={`/blog/${slug}`}>{title}</Link> : title}
    </li>
  );
}

/** Every planned part. `compact` (the rail) lists the written parts and the
 * next one, and folds the rest of the plan into a "more planned" toggle so
 * the on-this-page list below it stays in view. */
function PartList({ series, part, compact }: { series: string; part: number; compact?: boolean }) {
  const { meta, published } = useSeriesParts(series);
  if (!meta) return null;
  const items = meta.plannedParts.map((title, i) => ({ n: i + 1, title, slug: published.get(i + 1)?.slug }));
  const lastShown = compact ? Math.max(part, ...items.filter((item) => item.slug).map((item) => item.n)) + 1 : items.length;
  const shown = items.slice(0, lastShown);
  const rest = items.slice(lastShown);
  return (
    <>
      <ol className="nm-series-parts">
        {shown.map((item) => (
          <PartItem key={item.n} {...item} part={part} />
        ))}
      </ol>
      {rest.length > 0 && (
        <details className="nm-series-more">
          <summary>{rest.length} more planned</summary>
          <ol className="nm-series-parts" start={lastShown + 1}>
            {rest.map((item) => (
              <PartItem key={item.n} {...item} part={part} />
            ))}
          </ol>
        </details>
      )}
    </>
  );
}

/** A series post's place in its series. `rail`: the full part list, for the
 * post page's side column on wide screens. `inline`: one line above the
 * article, with the list folded away, for narrow screens where there's no
 * rail. Unwritten parts show as plain text. */
export default function BlogSeriesBox({ series, part, variant }: { series: string; part: number; variant: 'rail' | 'inline' }) {
  const { meta } = useSeriesParts(series);
  if (!meta) return null;
  const heading = (
    <>
      <Link to={`/blog?tag=${encodeURIComponent(meta.tag)}`}>{meta.title}</Link>
      <span>Part {part} of {meta.plannedParts.length}</span>
    </>
  );
  if (variant === 'rail') {
    return (
      <nav className="nm-series-rail" aria-label={`${meta.title} series`}>
        <p className="nm-series-title">{heading}</p>
        <PartList series={series} part={part} compact />
      </nav>
    );
  }
  return (
    <details className="nm-series-inline">
      <summary>{heading}</summary>
      <PartList series={series} part={part} />
    </details>
  );
}

/** Previous / next part links, at the end of a series post. */
export function SeriesPager({ series, part }: { series: string; part: number }) {
  const { meta, published } = useSeriesParts(series);
  if (!meta) return null;
  const previous = published.get(part - 1);
  const next = published.get(part + 1);
  const nextPlanned = meta.plannedParts[part];
  return (
    <nav className="nm-series-pager" aria-label="Series navigation">
      {previous ? (
        <Link to={`/blog/${previous.slug}`}>
          <small>Previous: part {part - 1}</small>
          {meta.plannedParts[part - 2]}
        </Link>
      ) : <span />}
      {next ? (
        <Link to={`/blog/${next.slug}`} className="is-next">
          <small>Next: part {part + 1}</small>
          {meta.plannedParts[part]}
        </Link>
      ) : nextPlanned ? (
        <p className="is-next">
          <small>Coming next: part {part + 1}</small>
          {nextPlanned}
        </p>
      ) : null}
    </nav>
  );
}
