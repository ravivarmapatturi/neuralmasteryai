import { useEffect, useRef, useState } from 'react';
import { useVizTokens, FONT_FAMILY } from '../../theme/vizTokens';

/**
 * SectionSteps: turns the page's own ## sections into steps (Sources is not a step).
 * A slim strip sticks under the navbar: back / "Step N of M · name" / next,
 * a thin progress line along its bottom edge, and the name opens a list of
 * all steps to jump to. Each heading gets a small "Step N" label.
 */
interface Sec { id: string; title: string; el: HTMLElement }
const NOT_STEPS = /^(sources|next|references|further reading)$/i;

export default function SectionSteps() {
  const t = useVizTokens();
  const [secs, setSecs] = useState<Sec[]>([]);
  const [cur, setCur] = useState(0);
  const [open, setOpen] = useState(false);
  const [paper, setPaper] = useState<string>('transparent');
  const boxRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const article = document.querySelector('article.prose');
    if (!article) return;
    // Pages load lazily, so (re)scan the headings whenever the article's content changes.
    let hs: HTMLElement[] = [];
    const onScroll = () => {
      const line = Math.max(window.innerHeight * 0.3, 200);
      let idx = 0;
      hs.forEach((h, i) => { if (h.getBoundingClientRect().top <= line) idx = i; });
      setCur(idx);
    };
    const scan = () => {
      const next = Array.from(article.querySelectorAll<HTMLElement>(':scope > h2'))
        .filter((h) => !NOT_STEPS.test((h.textContent ?? '').trim()));
      if (next.length === hs.length && next.every((h, i) => h === hs[i])) return;
      hs.forEach((h) => h.removeAttribute('data-step'));
      hs = next;
      hs.forEach((h, i) => h.setAttribute('data-step', String(i + 1)));
      setSecs(hs.map((h) => ({ id: h.id, title: (h.textContent ?? '').trim(), el: h })));
      onScroll();
    };
    article.classList.add('nm-steps-on');
    // the strip behind the bar uses the sheet's own colour, so text never shows through around it
    let el: HTMLElement | null = article as HTMLElement;
    while (el) { const bg = getComputedStyle(el).backgroundColor; if (bg && bg !== 'transparent' && !bg.endsWith(', 0)')) { setPaper(bg); break; } el = el.parentElement; }
    scan();
    let pending = 0;
    const mo = new MutationObserver(() => { if (!pending) pending = window.setTimeout(() => { pending = 0; scan(); }, 150); });
    mo.observe(article, { childList: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      mo.disconnect();
      window.clearTimeout(pending);
      window.removeEventListener('scroll', onScroll);
      article.classList.remove('nm-steps-on');
      hs.forEach((h) => h.removeAttribute('data-step'));
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', close); };
  }, [open]);

  if (secs.length < 2) return null;
  const n = secs.length;
  const go = (i: number) => {
    setOpen(false);
    secs[Math.max(0, Math.min(n - 1, i))].el.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  };
  const arrow = (dis: boolean) => ({
    fontFamily: FONT_FAMILY, fontSize: 20, lineHeight: 1, width: 34, height: 34, flex: 'none', cursor: dis ? 'default' : 'pointer',
    color: t.textPrimary, background: 'transparent', border: `1.8px solid ${t.textPrimary}`, borderRadius: '50% 45% 52% 47%', opacity: dis ? 0.3 : 1,
  } as const);
  const pct = ((cur + 1) / n) * 100;

  return (
    <nav ref={boxRef} aria-label="Page steps" className="nm-section-steps not-prose"
      style={{ position: 'sticky', top: 56, zIndex: 20, margin: '0 0 28px', padding: '10px 0 14px', width: '100%', maxWidth: 'none',
        background: paper, boxShadow: `0 -12px 0 ${paper}`, fontFamily: FONT_FAMILY, color: t.textPrimary }}>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 10, padding: '6px 10px 9px', background: t.surface, maxWidth: 940, margin: '0 auto',
        border: `1.8px solid ${t.textPrimary}`, borderRadius: '14px 9px 15px 10px', overflow: 'hidden',
        boxShadow: t.mode === 'dark' ? '0 6px 16px rgba(0,0,0,.35)' : '0 6px 16px rgba(30,41,90,.10)' }}>
        <button type="button" aria-label="Previous step" disabled={cur === 0} onClick={() => go(cur - 1)} style={arrow(cur === 0)}>‹</button>
        <button type="button" aria-expanded={open} aria-haspopup="listbox" onClick={() => setOpen((o) => !o)}
          style={{ all: 'unset', cursor: 'pointer', flex: 1, minWidth: 0, display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <span style={{ fontSize: 15, color: t.accentPrimary, fontWeight: 700, whiteSpace: 'nowrap' }}>Step {cur + 1} of {n}</span>
          <span style={{ fontSize: 17, fontWeight: 700, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{secs[cur].title}</span>
          <span aria-hidden style={{ fontSize: 14, color: t.textSecondary, marginLeft: 'auto', whiteSpace: 'nowrap' }}>{open ? 'close ▴' : 'all steps ▾'}</span>
        </button>
        <button type="button" aria-label="Next step" disabled={cur === n - 1} onClick={() => go(cur + 1)} style={arrow(cur === n - 1)}>›</button>
        <span aria-hidden style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 4, background: t.surfaceAlt }} />
        <span aria-hidden style={{ position: 'absolute', left: 0, bottom: 0, height: 4, width: `${pct}%`, background: t.accentPrimary, transition: 'width .35s ease' }} />
      </div>

      {open && (
        <ol role="listbox" aria-label="All steps" style={{ maxWidth: 940, marginLeft: 'auto', marginRight: 'auto', listStyle: 'none', marginTop: 6, marginBottom: 0, padding: 8, background: t.surface,
          border: `1.8px solid ${t.textPrimary}`, borderRadius: '12px 8px 13px 9px', maxHeight: '60vh', overflowY: 'auto',
          boxShadow: t.mode === 'dark' ? '0 10px 24px rgba(0,0,0,.45)' : '0 10px 24px rgba(30,41,90,.14)' }}>
          {secs.map((s, i) => {
            const done = i < cur; const now = i === cur;
            return (
              <li key={s.id || i}>
                <button type="button" role="option" aria-selected={now} onClick={() => go(i)}
                  style={{ all: 'unset', cursor: 'pointer', boxSizing: 'border-box', width: '100%', display: 'flex', gap: 10, alignItems: 'center',
                    padding: '4px 8px', borderRadius: 8, fontSize: 16, background: now ? t.surfaceAlt : 'transparent',
                    color: done || now ? t.textPrimary : t.textSecondary, fontWeight: now ? 700 : 400 }}>
                  <span style={{ width: 24, height: 24, flex: 'none', display: 'grid', placeItems: 'center', fontSize: 14, borderRadius: '50% 45% 52% 47%',
                    border: `1.6px solid ${done || now ? t.accentPrimary : t.textMuted}`, color: done ? t.surface : t.accentPrimary,
                    background: done ? t.accentPrimary : 'transparent' }}>{done ? '✓' : i + 1}</span>
                  {s.title}
                </button>
              </li>
            );
          })}
        </ol>
      )}

      <style>{`
        article.nm-steps-on h2[data-step] { scroll-margin-top: 150px; }
        article.nm-steps-on h2[data-step]::before {
          content: "Step " attr(data-step);
          display: block; width: fit-content; margin-bottom: 2px;
          font-size: 15px; font-weight: 700; letter-spacing: .04em;
          color: ${t.accentPrimary};
        }
      `}</style>
    </nav>
  );
}
