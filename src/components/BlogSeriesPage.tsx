import { useParams, Link } from 'react-router-dom';
import Navbar from './layout/Navbar';
import BlogCover from './BlogCover';
import { getSeries } from '../data/blogSeries';
import { getSeriesPosts, formatPostDate } from '../lib/blog';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import { useDocumentMeta } from '../lib/useDocumentMeta';

export default function BlogSeriesPage() {
  const { seriesSlug } = useParams<{ seriesSlug: string }>();
  const series = getSeries(seriesSlug || 'us-healthcare');
  const publishedPosts = series ? getSeriesPosts(series.slug) : [];

  useDocumentTitle(series ? `${series.title} — Architectural Series Guide` : 'Series Guide');
  useDocumentMeta(
    series ? series.title : 'Series Guide',
    series ? series.description : 'A comprehensive architectural course and documentary.',
  );

  if (!series) {
    return (
      <div className="nb-theme" style={{ minHeight: '100vh' }}>
        <Navbar />
        <div style={{ maxWidth: 800, margin: '4rem auto', padding: '0 1rem', textAlign: 'center' }}>
          <h2>Series not found</h2>
          <p><Link to="/blog">Return to blog essays →</Link></p>
        </div>
      </div>
    );
  }

  const totalEpisodes = series.plannedParts.length;
  const publishedCount = publishedPosts.length;
  const isComplete = publishedCount >= totalEpisodes;
  const totalReadingTime = publishedPosts.reduce((acc, p) => acc + (p.readingMinutes || 7), 0);

  return (
    <div className="nb-theme" style={{ minHeight: '100vh' }}>
      <Navbar />
      <main className="nm-series-shell">
        {/* Series Cinematic Hero */}
        <header className="nm-series-hero">
          <div className="nm-series-hero-copy">
            <div className="nm-series-hero-badges">
              <span className="nm-series-badge-pill">ARCHITECTURAL BLUEPRINT SERIES</span>
              <span className="nm-series-status-pill">{isComplete ? 'COMPLETE GUIDE' : 'IN PROGRESS'}</span>
            </div>
            <h1 className="nb-heading nm-series-hero-title">{series.title}</h1>
            <p className="nm-series-hero-desc">{series.description}</p>
            <div className="nm-series-hero-stats">
              <div className="nm-sstat">
                <strong>{totalEpisodes}</strong>
                <span>Chapters</span>
              </div>
              <div className="nm-sstat">
                <strong>~{totalReadingTime}</strong>
                <span>Min total reading</span>
              </div>
              <div className="nm-sstat">
                <strong>100%</strong>
                <span>First-principles systems view</span>
              </div>
            </div>
            {publishedPosts.length > 0 && (
              <div className="nm-series-cta-row">
                <Link to={`/blog/${publishedPosts[0].slug}`} className="nm-button nm-button-primary">
                  Start Chapter 1: {series.plannedParts[0]} →
                </Link>
                <Link to="/blog" className="nm-button nm-button-secondary">
                  ← Back to all essays
                </Link>
              </div>
            )}
          </div>

          <div className="nm-series-hero-art">
            {publishedPosts.length > 0 && (
              <BlogCover slug={publishedPosts[0].slug} series={series.slug} className="nm-series-banner-cover" />
            )}
          </div>
        </header>

        {/* Course / Documentary Episode Roadmap */}
        <section className="nm-series-roadmap-section" aria-label="Series Chapter Roadmap">
          <div className="nm-roadmap-header">
            <h2 className="nb-heading" style={{ fontSize: 'clamp(1.5rem, 3vw, 2.2rem)', margin: 0 }}>
              The Course Roadmap
            </h2>
            <p className="nb-body" style={{ margin: '0.4rem 0 0', color: 'var(--nm-text-secondary)' }}>
              Follow the journey from foundational members and plans through clinical decision gates, EDI scrubbers, and AI systems.
            </p>
          </div>

          <div className="nm-series-episodes-list">
            {series.plannedParts.map((title, index) => {
              const partNum = index + 1;
              const post = publishedPosts.find((p) => p.part === partNum);
              const isPublished = Boolean(post);

              return (
                <div
                  key={title}
                  className={`nm-series-episode-card ${isPublished ? 'is-published' : 'is-planned'}`}
                >
                  <div className="nm-ep-left-col">
                    <span className="nm-ep-num">
                      {String(partNum).padStart(2, '0')}
                    </span>
                    {index < series.plannedParts.length - 1 && (
                      <div className="nm-ep-spine" aria-hidden="true" />
                    )}
                  </div>

                  <div className="nm-ep-media-col">
                    {post ? (
                      <Link to={`/blog/${post.slug}`} tabIndex={-1} aria-hidden="true">
                        <BlogCover slug={post.slug} series={series.slug} className="nm-ep-cover-art" />
                      </Link>
                    ) : (
                      <div className="nm-ep-cover-placeholder">
                        <span>CHAPTER {partNum}</span>
                      </div>
                    )}
                  </div>

                  <div className="nm-ep-body-col">
                    <div className="nm-ep-meta-row">
                      <span className="nm-ep-status-tag">
                        {isPublished ? 'CHAPTER AVAILABLE' : 'UPCOMING'}
                      </span>
                      {post && (
                        <>
                          <span className="nm-ep-meta-dot">·</span>
                          <span>{post.date ? formatPostDate(post.date) : ''}</span>
                          <span className="nm-ep-meta-dot">·</span>
                          <span>⏱️ {post.readingMinutes} min read</span>
                        </>
                      )}
                    </div>

                    <h3 className="nm-ep-title">
                      {post ? (
                        <Link to={`/blog/${post.slug}`}>{post.title}</Link>
                      ) : (
                        <span>Part {partNum}: {title}</span>
                      )}
                    </h3>

                    <p className="nm-ep-desc">
                      {post ? post.description : 'In-depth architectural breakdown and systems walkthrough.'}
                    </p>

                    {post && (
                      <div className="nm-ep-actions">
                        <Link to={`/blog/${post.slug}`} className="nm-ep-read-link">
                          Read Chapter {partNum} →
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
