import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { countPageView } from './home/LiveStats';

/**
 * Fires a real GA4 page_view on every client-side route change -- Firebase
 * Analytics only auto-logs one page_view on initial script load, since it
 * has no way to know this is an SPA where almost every navigation never
 * reloads the page. Mounted once at the app root (a sibling of <Routes>,
 * not inside any one page), so it sees every route change regardless of
 * which page is showing.
 *
 * The short delay before reading document.title is deliberate, not
 * arbitrary: each page's own title (see useDocumentTitle) is set by an
 * effect inside that page's own lazily-loaded component, which may not
 * have mounted and run yet in the same tick the route itself changes --
 * without the delay, a page_view could occasionally report the PREVIOUS
 * page's title for the new path. This is the same timing quirk every
 * real GA4-in-SPA integration guide flags, not a bug specific to this
 * app -- a short delay is the standard, documented mitigation.
 *
 * Renders nothing -- this is a side-effect-only component.
 */
export default function AnalyticsTracker() {
  const location = useLocation();

  useEffect(() => {
    countPageView();
    const timer = setTimeout(() => {
      import('../lib/firebase').then(({ trackPageView, trackFeatureEvent }) => {
        trackPageView(location.pathname, document.title);
        // Real per-feature engagement events, distinct from the generic
        // page_view above -- GA4's own real acquisition/engagement
        // reports can't segment "Learn vs Practice vs Playground usage"
        // out of a single page_view event type on its own; a named,
        // distinct event per feature area is what actually makes that
        // possible. Playground has no single top-level route of its own
        // (it's embedded per-page, not a route) -- see PracticeWorkspace
        // for its own attempt/solve events instead.
        if (location.pathname.startsWith('/docs/')) {
          trackFeatureEvent('learn_page_view', { page_path: location.pathname });
        } else if (location.pathname.startsWith('/practice')) {
          trackFeatureEvent('practice_page_view', { page_path: location.pathname });
        }
      });
    }, 100);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  return null;
}
