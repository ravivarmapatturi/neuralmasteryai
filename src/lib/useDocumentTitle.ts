import { useEffect } from 'react';

import { documentTitle } from './documentTitle';

/** Sets the browser tab title per route. index.html's static <title> (used
 * for the initial paint before React hydrates, and inherited verbatim by
 * 404.html) stays a sane fallback -- this is what actually varies per page
 * once the app is running, instead of every route sharing one static title. */
export function useDocumentTitle(pageTitle?: string): void {
  useEffect(() => {
    document.title = documentTitle(pageTitle);
  }, [pageTitle]);
}
