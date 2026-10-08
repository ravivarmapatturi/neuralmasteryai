import { useEffect } from 'react';

const SITE_NAME = 'Neural Mastery';
export const SITE_URL = 'https://neuralmasteryai.com/';
export const DEFAULT_DESCRIPTION =
  'Learn AI and machine learning through real, computed, interactive visualizations, not static diagrams -- covering machine learning, deep learning, LLMs, and agents.';
// One real, static, branded image for the whole site (audit: "0 of 248
// pages have og:image") -- see scripts/generate-og-image.mjs. Real,
// per-page images are a larger follow-up, deliberately deferred.
const OG_IMAGE_URL = SITE_URL.replace(/\/$/, '') + '/og-image.png';

function upsertMeta(attr: 'name' | 'property', key: string, content: string): void {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertCanonical(href: string): void {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', 'canonical');
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

export interface BreadcrumbItem {
  label: string;
  /** Route relative to the site root, e.g. "/docs/deep-learning/roadmap". */
  href: string;
}

const JSON_LD_ID = 'nm-breadcrumb-jsonld';

/** Real schema.org BreadcrumbList structured data (audit: "No structured
 * data... Add JSON-LD"), built only from crumbs the caller passes in --
 * every `item` URL is a real, currently-reachable route (see
 * sectionBreadcrumb()), never an invented label. Removes the script tag
 * entirely when no crumbs are given, rather than leaving a stale one from
 * a previous route behind. */
function upsertBreadcrumbJsonLd(crumbs: BreadcrumbItem[] | undefined, currentPageName: string, currentPath: string): void {
  const existing = document.getElementById(JSON_LD_ID);
  if (!crumbs || crumbs.length === 0) {
    existing?.remove();
    return;
  }
  const base = SITE_URL.replace(/\/$/, '');
  const itemListElement = [
    ...crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.label,
      item: base + c.href,
    })),
    {
      '@type': 'ListItem',
      position: crumbs.length + 1,
      name: currentPageName,
      item: base + currentPath,
    },
  ];
  const json = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement,
  });
  let el = existing as HTMLScriptElement | null;
  if (!el) {
    el = document.createElement('script');
    el.id = JSON_LD_ID;
    el.type = 'application/ld+json';
    document.head.appendChild(el);
  }
  el.textContent = json;
}

/** Sets <meta name="description"> plus Open Graph / Twitter Card tags and a
 * canonical link, per route -- the SEO surface useDocumentTitle doesn't
 * cover. Falls back to a sitewide description when a page has no
 * frontmatter `description` yet (most don't, as of writing -- authors can
 * add one per page over time; this keeps every route non-empty in the
 * meantime rather than blocking on 200+ pages of hand-written copy).
 *
 * Caveat: this SPA has no SSR/prerendering, so these tags only exist once
 * JS runs. Search engines that execute JS (Googlebot) see them fine; some
 * social-preview crawlers that don't will only see index.html's static
 * fallback tags. */
export function useDocumentMeta(pageTitle: string | undefined, description?: string, breadcrumb?: BreadcrumbItem[]): void {
  useEffect(() => {
    const desc = description ?? DEFAULT_DESCRIPTION;
    const fullTitle = pageTitle ? `${pageTitle} — ${SITE_NAME}` : SITE_NAME;
    // No prefix to strip anymore -- the site serves from the domain's own
    // root now, so location.pathname already matches the route directly.
    const canonical = SITE_URL.replace(/\/$/, '') + window.location.pathname;

    upsertMeta('name', 'description', desc);
    upsertMeta('property', 'og:title', fullTitle);
    upsertMeta('property', 'og:description', desc);
    upsertMeta('property', 'og:type', 'website');
    upsertMeta('property', 'og:url', canonical);
    upsertMeta('property', 'og:site_name', SITE_NAME);
    upsertMeta('property', 'og:image', OG_IMAGE_URL);
    upsertMeta('property', 'og:image:width', '1200');
    upsertMeta('property', 'og:image:height', '630');
    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:image', OG_IMAGE_URL);
    upsertMeta('name', 'twitter:title', fullTitle);
    upsertMeta('name', 'twitter:description', desc);
    upsertCanonical(canonical);
    upsertBreadcrumbJsonLd(breadcrumb, pageTitle ?? SITE_NAME, window.location.pathname);
  }, [pageTitle, description, breadcrumb]);
}
