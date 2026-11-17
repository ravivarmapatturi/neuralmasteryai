import { Suspense, useEffect, useRef, useState, type CSSProperties } from 'react';
import { useLocation } from 'react-router-dom';
import ErrorBoundary from '../ErrorBoundary';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import TableOfContents from './TableOfContents';
import MobileNavDrawer from './MobileNavDrawer';
import PrevNext from './PrevNext';
import MarkUnderstoodButton from './MarkUnderstoodButton';
import RoadmapProgressBanner from './RoadmapProgressBanner';
import PageFeedback from './PageFeedback';
import ThemeSkinPicker from '../ThemeSkinPicker';
import { getPageByRoute } from '../../lib/contentTree';
import { useDocumentTitle } from '../../lib/useDocumentTitle';
import { useDocumentMeta } from '../../lib/useDocumentMeta';
import { sectionBreadcrumb } from '../../data/sectionMeta';

const SIDEBAR_COLLAPSE_KEY = 'neural-mastery-sidebar-collapsed';
const TOC_COLLAPSE_KEY = 'neural-mastery-toc-collapsed';

function readCollapsed(key: string): boolean {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(key) === 'true';
}

function formatDiaryDate(isoOrDate?: string): string {
  if (!isoOrDate) return '17 November 2026';
  try {
    const d = new Date(isoOrDate.includes('T') ? isoOrDate : `${isoOrDate}T00:00:00Z`);
    if (isNaN(d.getTime())) return '17 November 2026';
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  } catch {
    return '17 November 2026';
  }
}

// Side panel tabs look like coloured index tabs stuck to the notebook's edge,
// with the panel's name written on them, so it is obvious they open something.
const panelToggleStyle: CSSProperties = {
  position: 'sticky',
  top: '50vh',
  transform: 'translateY(-50%)',
  width: 30,
  minHeight: 112,
  padding: '10px 0',
  cursor: 'pointer',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  fontFamily: "'Kalam', cursive",
  fontSize: 15,
  fontWeight: 700,
  zIndex: 5,
  boxShadow: '0 4px 12px rgba(30,41,90,0.12)',
};

function tabColors(open: boolean, hue: 1 | 2): CSSProperties {
  return open
    ? { background: 'var(--nm-surface)', color: 'var(--nm-text-secondary)', border: '1.5px solid var(--nm-border)' }
    : { background: `var(--nm-hl-${hue})`, color: `var(--nm-hl-${hue}-ink)`, border: `1.5px solid var(--nm-hl-${hue}-ink)` };
}

export default function DocLayout() {
  const location = useLocation();
  const page = getPageByRoute(location.pathname);
  const contentRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const [navOpen, setNavOpen] = useState(false);
  // Desktop-only: collapse the docked sidebar/TOC to give visualizations
  // the full column width on demand -- persisted so the choice sticks.
  // Mobile already replaces both with the MobileNavDrawer overlay, so this
  // is purely a >900px affordance (see the .nm-panel-toggle media rule).
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => readCollapsed(SIDEBAR_COLLAPSE_KEY));
  const [tocCollapsed, setTocCollapsed] = useState(() => readCollapsed(TOC_COLLAPSE_KEY));

  useEffect(() => {
    setNavOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    window.localStorage.setItem(SIDEBAR_COLLAPSE_KEY, String(sidebarCollapsed));
  }, [sidebarCollapsed]);
  useEffect(() => {
    window.localStorage.setItem(TOC_COLLAPSE_KEY, String(tocCollapsed));
  }, [tocCollapsed]);

  useDocumentTitle(page ? page.title : 'Page Not Found');
  const crumb = page ? sectionBreadcrumb(page.section) : undefined;
  useDocumentMeta(page?.title, page?.description, crumb ? [{ label: 'Home', href: '/' }, crumb] : undefined);

  if (!page) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center' }}>
        <h1>Page not found</h1>
      </div>
    );
  }

  const { Component } = page;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--nm-bg)' }}>
      <Navbar onMenuClick={() => setNavOpen(true)} menuButtonRef={menuButtonRef} />
      <div className="nm-doc-row" style={{ display: 'flex', maxWidth: 1800, margin: '0 auto' }}>
        <div className="nm-sidebar-wrap" style={{ position: 'relative', flexShrink: 0 }}>
          {!sidebarCollapsed && <Sidebar />}
          <div style={{ position: 'absolute', top: 0, bottom: 0, right: -30, width: 30 }}>
            <button
              type="button"
              className="nm-panel-toggle"
              onClick={() => setSidebarCollapsed((v) => !v)}
              aria-label={sidebarCollapsed ? 'Show sidebar' : 'Hide sidebar'}
              title={sidebarCollapsed ? 'Show the list of topics' : 'Hide the list of topics'}
              style={{ ...panelToggleStyle, ...tabColors(!sidebarCollapsed, 1), borderLeft: 'none', borderRadius: '0 10px 10px 0' }}
            >
              <span aria-hidden="true">{sidebarCollapsed ? '›' : '‹'}</span>
              <span style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>{sidebarCollapsed ? 'Topics' : 'Hide'}</span>
            </button>
          </div>
        </div>
        <main className="nm-doc-main nm-notebook-sheet" style={{ flex: 1, padding: '2rem 3rem', minWidth: 0 }} ref={contentRef}>
          <header className="nm-diary-header" aria-label="Notebook diary header">
            <span>Neural Mastery</span>
            <span aria-hidden="true">·</span>
            <span>{formatDiaryDate(page.lastUpdated)}</span>
          </header>
          <article className="prose">
            {page.route.endsWith('/roadmap') && <RoadmapProgressBanner section={page.section} />}
            <ErrorBoundary level="route">
              <Suspense fallback={<div style={{ padding: '3rem 0', textAlign: 'center', color: 'var(--nm-text-muted)', fontSize: 14 }}>Loading…</div>}>
                <Component />
              </Suspense>
            </ErrorBoundary>
          </article>
          <PageFeedback page={page} />
          <MarkUnderstoodButton />
          <PrevNext route={page.route} />
        </main>
        <div className="nm-toc-wrap" style={{ position: 'relative', flexShrink: 0 }}>
          <div style={{ position: 'absolute', top: 0, bottom: 0, left: -30, width: 30 }}>
            <button
              type="button"
              className="nm-panel-toggle"
              onClick={() => setTocCollapsed((v) => !v)}
              aria-label={tocCollapsed ? 'Show table of contents' : 'Hide table of contents'}
              title={tocCollapsed ? 'Show the sections on this page' : 'Hide the sections on this page'}
              style={{ ...panelToggleStyle, ...tabColors(!tocCollapsed, 2), borderRight: 'none', borderRadius: '10px 0 0 10px' }}
            >
              <span aria-hidden="true">{tocCollapsed ? '‹' : '›'}</span>
              <span style={{ writingMode: 'vertical-rl' }}>{tocCollapsed ? 'On this page' : 'Hide'}</span>
            </button>
          </div>
          {!tocCollapsed && <TableOfContents contentRef={contentRef} />}
        </div>
      </div>
      <MobileNavDrawer open={navOpen} onClose={() => setNavOpen(false)} contentRef={contentRef} triggerRef={menuButtonRef} />
      <ThemeSkinPicker />
    </div>
  );
}
