import { useEffect } from 'react';

const SITE_NAME = 'Neural Mastery AI';

/** Sets the browser tab title per route. index.html's static <title> (used
 * for the initial paint before React hydrates, and inherited verbatim by
 * 404.html) stays a sane fallback -- this is what actually varies per page
 * once the app is running, instead of every route sharing one static title. */
export function useDocumentTitle(pageTitle?: string): void {
  useEffect(() => {
    document.title = pageTitle ? `${pageTitle} — ${SITE_NAME}` : SITE_NAME;
  }, [pageTitle]);
}
