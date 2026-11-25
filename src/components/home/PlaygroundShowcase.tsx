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
    hook: 'Watch every word look at every other word at once.',
    Comp: lazyWithRetry(() => import('../../viz/diagrams/RnnVsAttentionComparison')),
  },
  {
    slug: 'kv-cache-explorer',
    kicker: 'KV cache',
    hook: 'See why an LLM stops recomputing the past.',
    Comp: lazyWithRetry(() => import('../../viz/diagrams/KvCacheDiagram')),
  },
  {
    slug: 'embedding-similarity-search',
    kicker: 'Vector search',
    hook: 'A query finds its nearest meaning in embedding space.',
    Comp: lazyWithRetry(() => import('../../viz/diagrams/EmbeddingSimilaritySearchDiagram')),
  },
  {
    slug: 'decision-boundary-playground',
    kicker: 'Decision boundary',
    hook: 'A model bends its boundary as it learns.',
    focus: 'canvas',
    Comp: lazyWithRetry(() => import('../../viz/DecisionBoundaryPlayground')),
  },
] as const;

const SLIDE_MS = 3000;

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

/** Renders a tool at a fixed design width, then scales it down to the stage. */
function ScaledSlide({ children, active, focus }: { children: React.ReactNode; active: boolean; focus?: string }) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);
  // Start the slide at its main visual (the first large svg/canvas), not at its form controls.
  useEffect(() => {
    if (!focus || !active) return undefined;
    let tries = 0;
    const t = window.setInterval(() => {
      const box = inner.current;
      const target = box && Array.from(box.querySelectorAll<Element>(focus)).find((e) => e.getBoundingClientRect().height > 100);
      if (box && target) {
        const top = target.getBoundingClientRect().top - box.getBoundingClientRect().top;
        const s = box.getBoundingClientRect().width / box.offsetWidth || 1;
        setOffset(Math.max(0, top / s - 24));
        window.clearInterval(t);
      } else if (++tries > 20) window.clearInterval(t);
    }, 150);
    return () => window.clearInterval(t);
  }, [focus, active]);
  const [scale, setScale] = useState(0.6);
  const [design, setDesign] = useState(980);
  useLayoutEffect(() => {
    const el = outer.current;
    if (!el) return undefined;
    const host = (el.closest('.nm-pgs-stage') as HTMLElement | null) ?? el;
    const fit = () => {
      // Measure the always-visible stage (minus padding), not the slide, which is display:none while waiting.
      const w = host.clientWidth - 19;
      if (w === 0) return; // hidden slide: keep the last good size, no tiny flash
      const d = w < 640 ? 620 : 980;
      setDesign(d);
      setScale(Math.min(1, w / d));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(host);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={outer} className="nm-pgs-scale" aria-hidden={!active}>
      <div ref={inner} style={{ width: design, transform: `scale(${scale}) translateY(${-offset}px)`, transformOrigin: 'top left', transition: 'transform 400ms ease' }}>{children}</div>
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
              <ScaledSlide active={active} focus={'focus' in s ? s.focus : undefined}>
                <Suspense fallback={<div className="nm-pgs-loading" role="status">Loading {s.kicker}…</div>}>
                  <Comp />
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
