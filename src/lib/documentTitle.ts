export const SITE_NAME = 'Neural Mastery AI';

/** Preserve an already branded title; add the site name to other pages. */
export function documentTitle(pageTitle?: string): string {
  if (!pageTitle) return SITE_NAME;
  return /\bNeural Mastery(?: AI)?\b/i.test(pageTitle)
    ? pageTitle
    : `${pageTitle} — ${SITE_NAME}`;
}
