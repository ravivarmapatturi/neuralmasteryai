import { Link } from 'react-router-dom';
import { getBlogPosts, getSeriesPosts, formatPostDate } from '../../lib/blog';
import { BLOG_SERIES } from '../../data/blogSeries';
import BlogCover from '../BlogCover';

export default function HomeBlogPreview() {
  const posts = getBlogPosts();
  const featured = posts[0];
  const secondary = posts.slice(1, 4);

  const activeSeries = BLOG_SERIES[0];
  const seriesPosts = activeSeries ? getSeriesPosts(activeSeries.slug) : [];

  if (!featured) return null;

  return (
    <section className="nm-home-blog-preview" aria-label="Editorial Notes & Field Studies">
      <div className="nm-landing-shell">
        <div className="nm-home-blog-top">
          <div>
            <p className="nb-eyebrow">FIELD ESSAYS & SYSTEMS RESEARCH</p>
            <h2 className="nb-heading" style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.5rem)', margin: '0 0 0.5rem' }}>
              From the Neural Mastery notebook.
            </h2>
            <p className="nb-body" style={{ margin: 0, color: 'var(--nm-text-secondary)', maxWidth: 620 }}>
              Rigorous, first-principles essays on AI releases, agent systems, and the underlying engineering mechanisms.
            </p>
          </div>
          <Link to="/blog" className="nm-text-link" style={{ color: 'var(--nb-cobalt)', fontWeight: 700 }}>
            Explore all writing →
          </Link>
        </div>

        {/* Featured + Secondary Articles Grid */}
        <div className="nm-home-blog-grid">
          {/* Main Large Featured Card */}
          <article className="nm-home-featured-card">
            <Link to={`/blog/${featured.slug}`} className="nm-home-card-art-link" tabIndex={-1} aria-hidden="true">
              <BlogCover slug={featured.slug} series={featured.series} className="nm-home-featured-art" />
            </Link>
            <div className="nm-home-featured-content">
              <div className="nm-home-card-meta">
                <span className="nm-home-kicker">FEATURED ESSAY</span>
                <span className="nm-home-meta-dot">·</span>
                <span>{featured.date ? formatPostDate(featured.date) : ''}</span>
                <span className="nm-home-meta-dot">·</span>
                <span>{featured.readingMinutes} min read</span>
              </div>
              <h3 className="nm-home-featured-title">
                <Link to={`/blog/${featured.slug}`}>{featured.title}</Link>
              </h3>
              <p className="nm-home-featured-desc">{featured.description}</p>
              <div className="nm-home-card-tags">
                {featured.tags.slice(0, 3).map((tag) => (
                  <span key={tag} className="nm-home-tag">#{tag}</span>
                ))}
              </div>
            </div>
          </article>

          {/* Secondary Column */}
          <div className="nm-home-secondary-col">
            {secondary.map((post) => (
              <article key={post.slug} className="nm-home-secondary-card">
                <Link to={`/blog/${post.slug}`} className="nm-home-sec-thumb" tabIndex={-1} aria-hidden="true">
                  <BlogCover slug={post.slug} series={post.series} className="nm-home-thumb-art" />
                </Link>
                <div className="nm-home-sec-content">
                  <div className="nm-home-card-meta">
                    {post.series ? (
                      <span className="nm-home-kicker">SERIES · PART {post.part}</span>
                    ) : (
                      <span className="nm-home-kicker">ESSAY</span>
                    )}
                    <span className="nm-home-meta-dot">·</span>
                    <span>{post.readingMinutes} min read</span>
                  </div>
                  <h4 className="nm-home-sec-title">
                    <Link to={`/blog/${post.slug}`}>{post.title}</Link>
                  </h4>
                  <p className="nm-home-sec-desc">{post.description}</p>
                </div>
              </article>
            ))}
          </div>
        </div>

        {/* Horizontal Series Rail */}
        {activeSeries && seriesPosts.length > 0 && (
          <div className="nm-home-series-rail-box">
            <div className="nm-home-series-rail-header">
              <div>
                <span className="nm-home-series-badge">SERIES SPOTLIGHT</span>
                <h3 className="nm-home-series-title">
                  <Link to={`/blog/series/${activeSeries.slug}`}>{activeSeries.title}</Link>
                </h3>
                <p className="nm-home-series-desc">
                  {activeSeries.description} ({seriesPosts.length} of {activeSeries.plannedParts.length} chapters available)
                </p>
              </div>
              <Link to={`/blog/series/${activeSeries.slug}`} className="nm-button nm-button-secondary">
                View Full Series Guide →
              </Link>
            </div>

            <div className="nm-home-series-scroll" role="region" aria-label="Series chapters horizontal rail">
              {seriesPosts.slice(0, 8).map((post) => (
                <Link
                  key={post.slug}
                  to={`/blog/${post.slug}`}
                  className="nm-home-series-node"
                >
                  <div className="nm-home-node-thumb">
                    <BlogCover slug={post.slug} series={post.series} className="nm-home-node-cover" />
                  </div>
                  <div className="nm-home-node-info">
                    <span className="nm-home-node-part">PART {String(post.part).padStart(2, '0')}</span>
                    <h5 className="nm-home-node-title">{post.title.replace(/^How US Healthcare Works, Part \d+: /, '')}</h5>
                    <span className="nm-home-node-meta">⏱️ {post.readingMinutes} min read</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
