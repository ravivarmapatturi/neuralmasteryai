import { useEffect, useState } from 'react';
import { guestId, setLove, usePageLove } from '../../lib/pageLoves';

const HAND = "'Kalam', 'Comic Sans MS', cursive";
const RED = '#e11d48';

function readFlag(key: string) { try { return localStorage.getItem(key) === '1'; } catch { return false; } }
function writeFlag(key: string) { try { localStorage.setItem(key, '1'); } catch { /* storage blocked: nudge may show again */ } }

/** Heart button with the live count. `size` "sm" for the header, "lg" for the page end. */
export function LoveButton({ route, size = 'sm' }: { route: string; size?: 'sm' | 'lg' }) {
  const { count, loved, setLoved } = usePageLove(route);
  const [pop, setPop] = useState(false);
  const [busy, setBusy] = useState(false);

  const toggle = async () => {
    if (busy) return;
    const next = !loved;
    setBusy(true); setLoved(next); if (next) { setPop(true); window.setTimeout(() => setPop(false), 700); }
    try { await setLove(route, await guestId(), next); writeFlag(`nm-love-asked:${route}`); }
    catch { setLoved(!next); }
    finally { setBusy(false); }
  };

  const lg = size === 'lg';
  return (
    <button type="button" onClick={toggle} aria-pressed={loved}
      aria-label={loved ? 'You love this page. Click to remove your love' : 'Love this page'}
      className={`nm-love-btn${pop ? ' nm-love-pop' : ''}`}
      style={{ fontFamily: HAND, fontSize: lg ? 18 : 15, display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer',
        padding: lg ? '6px 18px' : '1px 12px', borderRadius: '14px 9px 15px 10px', lineHeight: 1.5,
        border: `1.8px solid ${RED}`, color: loved ? '#fff' : RED, background: loved ? RED : 'transparent' }}>
      <span className="nm-love-heart" aria-hidden style={{ fontSize: lg ? 20 : 16 }}>{loved ? '♥' : '♡'}</span>
      <span style={{ fontVariantNumeric: 'tabular-nums' }}>
        {count !== null && count > 0 ? `Loved by ${count.toLocaleString()}` : 'Love this page'}
      </span>
      <style>{`
        .nm-love-pop .nm-love-heart { display: inline-block; animation: nmLovePop .7s ease; }
        @keyframes nmLovePop { 0% { transform: scale(1) } 35% { transform: scale(1.6) } 60% { transform: scale(.9) } 100% { transform: scale(1) } }
        @media (prefers-reduced-motion: reduce) { .nm-love-pop .nm-love-heart { animation: none } }
      `}</style>
    </button>
  );
}

/** Shows once per page when the reader is past halfway and has not loved it yet. */
export function LoveNudge({ route }: { route: string }) {
  const { loved } = usePageLove(route);
  const key = `nm-love-asked:${route}`;
  const [show, setShow] = useState(false);

  useEffect(() => {
    setShow(false);
    if (readFlag(key)) return;
    const onScroll = () => {
      // Show only once the reader has actually scrolled past the middle of the
      // article itself (not the page while it is still loading and short).
      const art = document.querySelector('article.prose');
      if (!art || window.scrollY < 400) return;
      const r = art.getBoundingClientRect();
      if (r.height > window.innerHeight * 2 && r.top + r.height / 2 < window.innerHeight * 0.5) {
        setShow(true); window.removeEventListener('scroll', onScroll);
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [key]);

  if (!show || loved || readFlag(key)) return null;
  const close = () => { writeFlag(key); setShow(false); };

  return (
    <div role="dialog" aria-label="Enjoying this page?" className="nm-love-nudge"
      // a small card in the bottom-right corner, clear of the reading column and diagrams
      style={{ position: 'fixed', zIndex: 60, right: 'calc(76px + env(safe-area-inset-right, 0px))', bottom: 'calc(20px + env(safe-area-inset-bottom, 0px))',
        width: 'min(320px, calc(100vw - 32px))', boxSizing: 'border-box', fontFamily: HAND,
        background: 'var(--nm-surface, #fff)', color: 'var(--nm-text-primary, #1f2937)', border: '2px solid currentColor',
        borderRadius: '16px 10px 18px 12px', padding: '10px 14px', boxShadow: '0 12px 32px rgba(30,41,90,.18)', animation: 'nmNudgeIn .4s ease' }}>
      <div style={{ fontSize: 19, fontWeight: 700 }}>Enjoying this page? <span style={{ color: RED }}>♥</span></div>
      <div style={{ fontSize: 16, margin: '2px 0 10px' }}>If it's helping, send it some love so others find it too.</div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <span onClickCapture={() => writeFlag(key)}><LoveButton route={route} size="lg" /></span>
        <button type="button" onClick={close} style={{ fontFamily: HAND, fontSize: 16, background: 'transparent', color: 'inherit', border: 'none', textDecoration: 'underline', cursor: 'pointer' }}>Not now</button>
      </div>
      <style>{`@keyframes nmNudgeIn { from { opacity: 0; transform: translateY(16px) } to { opacity: 1; transform: none } }
        @media (prefers-reduced-motion: reduce) { .nm-love-nudge { animation: none !important } }`}</style>
    </div>
  );
}
