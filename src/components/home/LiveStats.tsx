import { useEffect, useState } from 'react';

/** The visit-stats Worker (workers/visit-stats/worker.js): daily totals in
 * D1, read back as the last 7 days and cached for 5 minutes. */
export const VISIT_STATS_URL = 'https://visit-stats.ravivarmapatturi.workers.dev/';

/** The line shows from the first visit (the owner's call, 2026-10-21). */
export const MIN_WEEKLY_VISITS = 1;

/** One plain line, "312 people visited this week". Renders nothing while
 * loading, on any error, or below MIN_WEEKLY_VISITS. */
const SESSION_FLAG = 'nm-visit-counted';

/** Count one page view with the visit-stats Worker, and one visit on the
 * first page of a browser session. Production host only, fire-and-forget:
 * sendBeacon with a text body needs no CORS preflight and never blocks the
 * page. Nothing identifying is sent, just "1" or "0". */
export function countPageView() {
  if (typeof window === 'undefined' || window.location.hostname !== 'neuralmasteryai.com') return;
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

export default function WeeklyVisitors() {
  const [visits, setVisits] = useState<number | null>(null);

  useEffect(() => {
    // Production only, like the beacon in index.html: there are no real
    // visits to show on localhost or in CI, and a failed fetch there would
    // surface as a console error in the smoke tests.
    if (window.location.hostname !== 'neuralmasteryai.com') return;
    const controller = new AbortController();
    fetch(VISIT_STATS_URL, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { visits?: unknown } | null) => {
        if (data && typeof data.visits === 'number') setVisits(data.visits);
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);

  if (visits === null || visits < MIN_WEEKLY_VISITS) return null;
  return <>{visits.toLocaleString('en-US')} {visits === 1 ? 'person' : 'people'} visited this week.</>;
}
