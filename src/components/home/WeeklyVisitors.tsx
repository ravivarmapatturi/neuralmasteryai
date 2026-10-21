import { useEffect, useState } from 'react';

/** The visit-stats Worker (workers/visit-stats/worker.js): last 7 days of
 * Cloudflare Web Analytics visits, cached for 15 minutes. */
export const VISIT_STATS_URL = 'https://visit-stats.ravivarmapatturi.workers.dev/';

/** The line shows from the first visit (the owner's call, 2026-10-21). */
export const MIN_WEEKLY_VISITS = 1;

/** One plain line, "312 people visited this week". Renders nothing while
 * loading, on any error, or below MIN_WEEKLY_VISITS. */
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
