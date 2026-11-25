import { Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { lazyWithRetry } from '../../lib/lazyWithRetry';
import './playgroundShowcase.css';

/**
 * Home hero: four real Playground tools, each running live, rotating every
 * few seconds. The tools are the real components (not screenshots), scaled to
 * fit one fixed-height stage so the page never jumps when the slide changes.
 */
const SLIDES = [
  {
    slug: 'attention-step-through',
    kicker: 'Attention',
    hook: 'See which words each word pays attention to, and by how much.',
    Comp: lazyWithRetry(() => import('../../viz/AttentionStepThrough')),
  },
  {
    slug: 'kv-cache-explorer',
    kicker: 'KV cache',
    hook: 'See why an LLM stops recomputing the past.',
    props: { compact: true },
    Comp: lazyWithRetry(() => import('../../viz/diagrams/KvCacheDiagram')),
  },
  {
    slug: 'embedding-similarity-search',
    kicker: 'Vector search',
    hook: 'A query finds its nearest meaning in embedding space.',
    props: { compact: true },
    Comp: lazyWithRetry(() => import('../../viz/diagrams/EmbeddingSimilaritySearchDiagram')),
  },
  {
    slug: 'gradient-descent-explorer',
    kicker: 'Gradient descent',
    hook: 'Watch optimizers race downhill to the lowest loss.',
    props: { compact: true },
    Comp: lazyWithRetry(() => import('../../viz/GradientDescentExplorer')),
  },
] as const;

const SLIDE_MS = 3000;

// Start fetching the first slide as soon as the home chunk loads, so the stage is never blank for long.
if (typeof window !== 'undefined') void import('../../viz/AttentionStepThrough');

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const m = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!m) return undefined;
    const update = () => setReduced(m.matches);
    update();
    m.addEventListener('change', update);
    return () => m.removeEventListener('change', update);
  }, []);
  return reduced;
}

/**
 * Renders a tool at a fixed design width, then fits the WHOLE tool (width and height) into the stage.
 * Uses CSS zoom, not transform: scale, so text is re-laid out crisply instead of blurred.
 */
function ScaledSlide({ children, active }: { children: React.ReactNode; active: boolean }) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const zoomRef = useRef(1);
  // Tallest height the tool has reached: sizing to it means the zoom never pumps as steps change.
  const maxNatural = useRef(0);
  const [zoom, setZoom] = useState(1);
  const [design, setDesign] = useState(760);
  useLayoutEffect(() => {
    const el = outer.current;
    const box = inner.current;
    if (!el || !box) return undefined;
    const host = (el.closest('.nm-pgs-stage') as HTMLElement | null) ?? el;
    const fit = () => {
      const w = host.clientWidth - 24;
      const h = host.clientHeight - 24;
      if (w <= 0 || h <= 0 || !active) return; // hidden slide: keep the last good size
      const d = w < 560 ? 560 : 760;
      // offsetHeight is the natural (unzoomed) height of the tool.
      maxNatural.current = Math.max(maxNatural.current, box.offsetHeight);
      const natural = maxNatural.current;
      const z = Math.min(1.3, w / d, natural > 0 ? h / natural : 1);
      if (Math.abs(z - zoomRef.current) < 0.01 && d === design) return; // ignore tiny changes: no jitter
      zoomRef.current = z;
      setDesign(d);
      setZoom(Math.round(z * 100) / 100);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(host);
    ro.observe(box);
    return () => ro.disconnect();
  }, [active]);
  return (
    <div ref={outer} className="nm-pgs-scale" aria-hidden={!active}>
      <div ref={inner} className="nm-pgs-zoom" style={{ width: design, zoom }}>{children}</div>
    </div>
  );
}

export default function PlaygroundShowcase() {
  const reduced = usePrefersReducedMotion();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [mounted, setMounted] = useState<Set<number>>(() => new Set([0]));
  const [inView, setInView] = useState(true);
  const root = useRef<HTMLElement>(null);

  const go = useCallback((i: number) => {
    const n = (i + SLIDES.length) % SLIDES.length;
    setIndex(n);
    setMounted((m) => (m.has(n) ? m : new Set(m).add(n)));
  }, []);

  useEffect(() => {
    const el = root.current;
    if (!el || !('IntersectionObserver' in window)) return undefined;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Pre-mount the next slide shortly before it shows, so it is already animating.
  useEffect(() => {
    const next = (index + 1) % SLIDES.length;
    const t = window.setTimeout(() => setMounted((m) => (m.has(next) ? m : new Set(m).add(next))), 800);
    return () => window.clearTimeout(t);
  }, [index]);

  const running = !paused && !reduced && inView;
  useEffect(() => {
    if (!running) return undefined;
    const t = window.setTimeout(() => go(index + 1), SLIDE_MS);
    return () => window.clearTimeout(t);
  }, [running, index, go]);

  const slide = SLIDES[index];

  return (
    <section
      ref={root}
      className="nm-pgs"
      aria-roledescription="carousel"
      aria-label="Live playground tools"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <header className="nm-pgs-head">
        <div className="nm-pgs-titles" aria-live="polite">
          <span className="nm-pgs-kicker" key={`k${index}`}>Live playground · {slide.kicker}</span>
          <p className="nm-pgs-hook" key={`h${index}`}>{slide.hook}</p>
        </div>
        <Link to={`/playground/${slide.slug}`} className="nm-pgs-open">
          Try it yourself →
        </Link>
      </header>

      <div className="nm-pgs-stage">
        {SLIDES.map((s, i) => {
          if (!mounted.has(i)) return null;
          const active = i === index;
          const { Comp } = s;
          return (
            <div
              key={s.slug}
              className={`nm-pgs-slide${active ? ' is-active' : ''}`}
              // Inactive slides are display:none so their animations pause (IntersectionObserver).
              style={{ display: active ? 'block' : 'none' }}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${SLIDES.length}: ${s.kicker}`}
            >
              <ScaledSlide active={active}>
                <Suspense fallback={<div className="nm-pgs-loading" role="status"><span className="nm-pgs-sketch" aria-hidden="true"><i /><i /><i /></span>Drawing the {s.kicker.toLowerCase()} playground…</div>}>
                  <Comp {...('props' in s ? (s.props as object) : {})} />
                </Suspense>
              </ScaledSlide>
            </div>
          );
        })}
        <div className="nm-pgs-fade" aria-hidden="true" />
      </div>

      <nav className="nm-pgs-nav" aria-label="Choose a playground">
        <button type="button" className="nm-pgs-arrow" onClick={() => go(index - 1)} aria-label="Previous playground">‹</button>
        {SLIDES.map((s, i) => (
          <button
            key={s.slug}
            type="button"
            className={`nm-pgs-tab${i === index ? ' is-active' : ''}`}
            aria-current={i === index}
            onClick={() => go(i)}
          >
            <span>{s.kicker}</span>
            <i aria-hidden="true">
              <b key={`${index}-${running}`} style={{ animationDuration: `${SLIDE_MS}ms`, animationPlayState: running && i === index ? 'running' : 'paused' }} />
            </i>
          </button>
        ))}
        <button type="button" className="nm-pgs-arrow" onClick={() => go(index + 1)} aria-label="Next playground">›</button>
      </nav>
    </section>
  );
}
