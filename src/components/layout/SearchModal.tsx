import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { searchDocs, toRoute, type PagefindResultData } from '../../lib/pagefind';
import { searchInterviewQuestions, interviewQuestionRoute, type InterviewHit } from '../../lib/interviewSearch';

const FOCUSABLE = 'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';
const DEBOUNCE_MS = 200;

type Status = 'idle' | 'loading' | 'ready' | 'unavailable' | 'empty';

/**
 * Site-wide search, backed by Pagefind's build-time index (see
 * src/lib/pagefind.ts). Controlled by the parent (Navbar owns `open` so both
 * the search icon and the global Cmd/Ctrl+K shortcut can trigger it) --
 * mirrors MobileNavDrawer's backdrop + focus-trap + Escape-to-close pattern
 * so keyboard behavior is consistent with the rest of the app's overlays.
 */
export default function SearchModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PagefindResultData[]>([]);
  const [questions, setQuestions] = useState<InterviewHit[]>([]);
  const [status, setStatus] = useState<Status>('idle');
  const [activeIndex, setActiveIndex] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const requestIdRef = useRef(0);
  const navigate = useNavigate();

  useEffect(() => {
    if (open) {
      setQuery('');
      setResults([]);
      setStatus('idle');
      setActiveIndex(0);
      // Wait a frame so the panel is actually visible before focusing.
      const id = requestAnimationFrame(() => inputRef.current?.focus());
      return () => cancelAnimationFrame(id);
    }
    return undefined;
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    if (!query.trim()) {
      setResults([]);
      setQuestions([]);
      setStatus('idle');
      return undefined;
    }
    setStatus('loading');
    const requestId = ++requestIdRef.current;
    const timer = window.setTimeout(async () => {
      searchInterviewQuestions(query)
        .then((hits) => { if (requestIdRef.current === requestId) setQuestions(hits); })
        .catch(() => setQuestions([]));
      try {
        const data = await searchDocs(query);
        if (requestIdRef.current !== requestId) return; // a newer keystroke superseded this search
        setResults(data);
        setStatus(data.length === 0 ? 'empty' : 'ready');
        setActiveIndex(0);
      } catch {
        if (requestIdRef.current !== requestId) return;
        // Most common cause: pagefind/pagefind.js doesn't exist (vite dev
        // server, or a build that hasn't run `npm run pagefind` yet).
        setResults([]);
        setStatus('unavailable');
      }
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [query, open]);

  function go(result: PagefindResultData) {
    navigate(toRoute(result.url));
    onClose();
  }

  useEffect(() => {
    if (!open) return undefined;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key === 'ArrowDown' && results.length > 0) {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, results.length - 1));
        return;
      }
      if (e.key === 'ArrowUp' && results.length > 0) {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === 'Enter' && results[activeIndex]) {
        e.preventDefault();
        go(results[activeIndex]);
        return;
      }
      if (e.key !== 'Tab' || !panelRef.current) return;
      const focusable = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, onClose, results, activeIndex]);

  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <div
        aria-hidden="true"
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.45)',
          opacity: open ? 1 : 0,
          visibility: open ? 'visible' : 'hidden',
          pointerEvents: open ? 'auto' : 'none',
          transition: `opacity 180ms ease, visibility 0ms linear ${open ? '0ms' : '180ms'}`,
          zIndex: 400,
        }}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Search documentation"
        aria-hidden={!open}
        style={{
          position: 'fixed',
          top: '10vh',
          left: '50%',
          transform: open ? 'translate(-50%, 0)' : 'translate(-50%, -12px)',
          width: 'min(640px, 92vw)',
          maxHeight: '70vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--nm-surface)',
          border: '1px solid var(--nm-border)',
          borderRadius: 12,
          boxShadow: '0 24px 64px rgba(0,0,0,0.35)',
          opacity: open ? 1 : 0,
          visibility: open ? 'visible' : 'hidden',
          transition: `opacity 180ms ease, transform 180ms ease, visibility 0ms linear ${open ? '0ms' : '180ms'}`,
          zIndex: 401,
          overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.9rem 1rem', borderBottom: '1px solid var(--nm-border)' }}>
          <span aria-hidden="true" style={{ color: 'var(--nm-text-muted)', fontSize: 16 }}>
            ⌕
          </span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pages and interview questions…"
            aria-label="Search query"
            autoComplete="off"
            spellCheck={false}
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              background: 'transparent',
              color: 'var(--nm-text-primary)',
              fontSize: 15,
            }}
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close search"
            style={{
              border: '1px solid var(--nm-border)',
              borderRadius: 6,
              background: 'transparent',
              color: 'var(--nm-text-muted)',
              fontSize: 11,
              padding: '3px 7px',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            Esc
          </button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1 }}>
          {status === 'idle' && (
            <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--nm-text-muted)', fontSize: 13.5 }}>
              Type to search across all pages.
            </div>
          )}
          {status === 'loading' && (
            <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--nm-text-muted)', fontSize: 13.5 }}>Searching…</div>
          )}
          {questions.length > 0 && status !== 'idle' && (
            <section aria-label="Interview questions" style={{ padding: '0.4rem 0.4rem 0', borderBottom: '1px solid var(--nm-border)' }}>
              <h2 style={{ margin: '0.3rem 0.7rem 0.3rem', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--nm-text-muted)' }}>Interview questions</h2>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {questions.map((q) => (
                  <li key={q.id}>
                    <Link
                      to={interviewQuestionRoute(q.id)}
                      onClick={onClose}
                      style={{ display: 'block', borderRadius: 8, color: 'var(--nm-text-primary)', textDecoration: 'none', padding: '0.5rem 0.7rem', marginBottom: 2 }}
                    >
                      <div style={{ fontWeight: 600, fontSize: 13.5 }}>{q.title}</div>
                      <div style={{ fontSize: 12, color: 'var(--nm-text-secondary)' }}>{q.area}</div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {status === 'empty' && questions.length === 0 && (
            <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--nm-text-muted)', fontSize: 13.5 }}>
              No results for &ldquo;{query}&rdquo;.
            </div>
          )}
          {status === 'unavailable' && questions.length === 0 && (
            <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--nm-text-muted)', fontSize: 13.5 }}>
              Search isn&rsquo;t available in this environment (it needs a production build). Try the sidebar navigation instead.
            </div>
          )}
          {status === 'ready' && (
            <ul style={{ listStyle: 'none', margin: 0, padding: '0.4rem' }}>
              {results.map((r, i) => (
                <li key={`${r.url}-${i}`}>
                  <button
                    type="button"
                    onClick={() => go(r)}
                    onMouseEnter={() => setActiveIndex(i)}
                    style={{
                      display: 'block',
                      width: '100%',
                      textAlign: 'left',
                      border: 'none',
                      borderRadius: 8,
                      background: i === activeIndex ? 'var(--nm-surface-alt)' : 'transparent',
                      color: 'var(--nm-text-primary)',
                      padding: '0.6rem 0.7rem',
                      cursor: 'pointer',
                      marginBottom: 2,
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: 13.5, marginBottom: 3 }}>{r.meta.title ?? toRoute(r.url)}</div>
                    <div
                      className="nm-search-excerpt"
                      style={{ fontSize: 12.5, color: 'var(--nm-text-secondary)', lineHeight: 1.4 }}
                      // Pagefind generates this excerpt HTML itself (from our
                      // own already-published doc content) purely to wrap
                      // matched terms in <mark> -- not user-supplied input.
                      dangerouslySetInnerHTML={{ __html: r.excerpt }}
                    />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
