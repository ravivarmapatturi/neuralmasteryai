import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { BlogSeries } from '../data/blogSeries';
import type { BlogPost } from '../lib/blog';
import BlogCover from './BlogCover';

interface NetflixSeriesCarouselProps {
  series: BlogSeries;
  parts: BlogPost[];
}

export default function NetflixSeriesCarousel({ series, parts }: NetflixSeriesCarouselProps) {
  // Select landmark chapters for high-signal 5s Netflix rotation
  const landmarkPartNums = [1, 4, 7, 10, 13, 18];
  const slides = landmarkPartNums
    .map((num) => parts.find((p) => p.part === num))
    .filter((p): p is BlogPost => Boolean(p));

  // Fallback to first 6 parts if landmark numbers aren't matching
  const activeSlides = slides.length >= 3 ? slides : parts.slice(0, 6);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused || activeSlides.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % activeSlides.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [isPaused, activeSlides.length, currentIndex]);

  if (activeSlides.length === 0) return null;

  const currentSlide = activeSlides[currentIndex];

  return (
    <section
      className="nm-netflix-carousel"
      aria-label={`${series.title} Featured Series Carousel`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setIsPaused(false)}
    >
      {/* Netflix Top Bar: Kicker + Segmented Progress Bars (- - - - -) */}
      <div className="nm-netflix-top">
        <div className="nm-netflix-kicker-group">
          <span className="nm-netflix-pill">SERIES SPOTLIGHT</span>
          <span className="nm-netflix-counter-label">
            Part {currentSlide.part ?? currentIndex + 1} of {series.plannedParts.length}
          </span>
          {isPaused && <span className="nm-netflix-paused-badge">PAUSED</span>}
        </div>

        {/* The Netflix-style Segmented Progress Indicator */}
        <div className="nm-netflix-dashes" role="tablist" aria-label="Carousel progress navigation">
          {activeSlides.map((slide, idx) => {
            const isCurrent = idx === currentIndex;
            const isPassed = idx < currentIndex;
            return (
              <button
                key={slide.slug}
                type="button"
                role="tab"
                aria-selected={isCurrent}
                aria-label={`Go to slide ${idx + 1}: Chapter ${slide.part}`}
                className={`nm-netflix-dash ${isCurrent ? 'is-active' : ''} ${isPassed ? 'is-passed' : ''}`}
                onClick={() => setCurrentIndex(idx)}
              >
                <div className="nm-netflix-dash-track">
                  <div
                    key={`${slide.slug}-${currentIndex}-${isPaused ? 'paused' : 'running'}`}
                    className="nm-netflix-dash-fill"
                    style={{
                      animationPlayState: isPaused ? 'paused' : 'running',
                    }}
                  />
                </div>
                <span className="nm-netflix-dash-num">Pt {slide.part}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Slide Card */}
      <div className="nm-netflix-hero">
        <div className="nm-netflix-hero-body">
          <p className="nm-netflix-subtitle">
            <Link to={`/blog/series/${series.slug}`} style={{ color: 'inherit', textDecoration: 'none' }}>
              SERIES: {series.title} (Dedicated Course Hub ↗)
            </Link>
          </p>
          <h2 className="nm-netflix-title">
            <Link to={`/blog/${currentSlide.slug}`}>{currentSlide.title}</Link>
          </h2>
          <p className="nm-netflix-desc">{currentSlide.description}</p>

          <div className="nm-netflix-actions">
            <Link to={`/blog/${currentSlide.slug}`} className="nm-button nm-button-primary">
              Read Chapter {currentSlide.part} <span aria-hidden="true">→</span>
            </Link>
            <div className="nm-netflix-meta">
              <span>⏱️ {currentSlide.readingMinutes} min read</span>
              <span className="nm-netflix-dot" aria-hidden="true">·</span>
              <span>18-Part Architectural Series</span>
            </div>
          </div>
        </div>

        <div className="nm-netflix-hero-visual">
          <Link to={`/blog/${currentSlide.slug}`} tabIndex={-1} aria-hidden="true">
            <BlogCover slug={currentSlide.slug} series={series.slug} className="nm-netflix-cover-art" />
          </Link>
        </div>
      </div>

      {/* Footer Navigation Bar */}
      <div className="nm-netflix-footer">
        <div className="nm-netflix-arrows">
          <button
            type="button"
            className="nm-netflix-nav-btn"
            onClick={() => setCurrentIndex((prev) => (prev - 1 + activeSlides.length) % activeSlides.length)}
            aria-label="Previous series slide"
          >
            ← Prev
          </button>
          <span className="nm-netflix-pager">
            {currentIndex + 1} / {activeSlides.length}
          </span>
          <button
            type="button"
            className="nm-netflix-nav-btn"
            onClick={() => setCurrentIndex((prev) => (prev + 1) % activeSlides.length)}
            aria-label="Next series slide"
          >
            Next →
          </button>
        </div>

        <div className="nm-netflix-footer-guide">
          <span>Explore complete guide: </span>
          <Link to={`/blog/series/${series.slug}`}>View 18-Part Visual Course Page →</Link>
        </div>
      </div>
    </section>
  );
}
