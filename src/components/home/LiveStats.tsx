import { useEffect, useState } from 'react';

/** The visit-stats Worker (workers/visit-stats/worker.js): daily totals in
 * D1, read back as today and the last 7 days, cached for 30 seconds. */
export const VISIT_STATS_URL = 'https://visit-stats.ravivarmapatturi.workers.dev/';

const SESSION_FLAG = 'nm-visit-counted';
const POLL_MS = 30_000;

declare global {
  interface Window {
    /** Test hook: lets a local preview read stats from a mocked URL. */
    __NM_STATS_URL__?: string;
  }
}

function onProductionHost() {
  return typeof window !== 'undefined' && window.location.hostname === 'neuralmasteryai.com';
}

/** Count one page view with the visit-stats Worker, and one visit on the
 * first page of a browser session. Production host only, fire-and-forget:
 * sendBeacon with a text body needs no CORS preflight and never blocks the
 * page. Nothing identifying is sent, just "1" or "0". */
export function countPageView() {
  if (!onProductionHost()) return;
  let isNewVisit = false;
  try {
    isNewVisit = window.sessionStorage.getItem(SESSION_FLAG) === null;
    window.sessionStorage.setItem(SESSION_FLAG, '1');
  } catch {
    // Storage blocked: count the view, not a visit.
  }
  try {
    navigator.sendBeacon(VISIT_STATS_URL + 'hit', isNewVisit ? '1' : '0');
  } catch {
    // Counting must never break the page.
  }
}

export interface SiteStats {
  visits: number;
  pageViews: number;
  todayVisits: number;
  todayViews: number;
}

/** Live stats from the Worker, refreshed every 30 seconds while the tab is
 * visible. null until the first answer arrives, or if the Worker is down
 * (callers render nothing then). Production host only: elsewhere there is
 * no real traffic to show, and a CORS rejection would log a console error. */
export function useSiteStats(): SiteStats | null {
  const [stats, setStats] = useState<SiteStats | null>(null);

  useEffect(() => {
    const url = window.__NM_STATS_URL__ ?? (onProductionHost() ? VISIT_STATS_URL : null);
    if (!url) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function load() {
      if (document.visibilityState === 'visible') {
        try {
          const res = await fetch(url!);
          const data = res.ok ? await res.json() : null;
          if (!cancelled && data && typeof data.visits === 'number') setStats(data);
        } catch {
          // Keep the last numbers we had.
        }
      }
      // A little jitter so open tabs don't all poll in the same second.
      if (!cancelled) timer = setTimeout(load, POLL_MS + Math.random() * 5_000);
    }

    load();
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        clearTimeout(timer);
        load();
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  return stats;
}

function plural(n: number, one: string, many: string) {
  return `${n.toLocaleString('en-US')} ${n === 1 ? one : many}`;
}

/** The moving headline on the homepage: live visitor numbers plus what's on
 * the site, scrolling right to left.
 *
 * - Real numbers only. A stat at zero is left out, not shown.
 * - A visible pause button (WCAG 2.2.2: moving content that runs longer than
 *   five seconds needs one). It also pauses on hover and keyboard focus.
 * - prefers-reduced-motion gets the same items standing still.
 * - Not a live region: screen readers read it once, not every 30 seconds.
 */
export function LiveStatsTicker({ pages, problems }: { pages: number; problems: number }) {
  const stats = useSiteStats();
  const [paused, setPaused] = useState(false);
  if (!stats) return null;

  const items = [
    stats.todayVisits > 0 && plural(stats.todayVisits, 'visit today', 'visits today'),
    stats.visits > 0 && plural(stats.visits, 'person this week', 'people this week'),
    stats.todayViews > 0 && plural(stats.todayViews, 'page read today', 'pages read today'),
    `${pages.toLocaleString('en-US')} lessons`,
    `${problems.toLocaleString('en-US')} practice problems`,
  ].filter(Boolean) as string[];

  const row = (hidden: boolean) => (
    <span className="nm-ticker-row" aria-hidden={hidden || undefined}>
      {items.map((text) => (
        <span key={text} className="nm-ticker-item">
          {text}
        </span>
      ))}
    </span>
  );

  return (
    <section className={`nm-ticker${paused ? ' is-paused' : ''}`} aria-label="Live site stats">
      <span className="nm-ticker-label">
        <span className="nm-ticker-dot" aria-hidden="true" />
        Live
      </span>
      <div className="nm-ticker-window">
        <div className="nm-ticker-track">
          {row(false)}
          {row(true)}
        </div>
      </div>
      <button
        type="button"
        className="nm-ticker-toggle"
        onClick={() => setPaused((p) => !p)}
        aria-pressed={paused}
        aria-label={paused ? 'Resume the moving stats' : 'Pause the moving stats'}
      >
        {paused ? '▶' : '❚❚'}
      </button>
    </section>
  );
}
