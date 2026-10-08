import { Suspense, useEffect, useRef, useState, type CSSProperties } from 'react';
import { useLocation } from 'react-router-dom';
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

const panelToggleStyle: CSSProperties = {
  position: 'sticky',
  top: '50vh',
  transform: 'translateY(-50%)',
  width: 22,
  height: 44,
  border: '1px solid var(--nm-border)',
  background: 'var(--nm-surface)',
  color: 'var(--nm-text-secondary)',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 13,
  zIndex: 5,
  padding: 0,
};

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
          <div style={{ position: 'absolute', top: 0, bottom: 0, right: -22, width: 22 }}>
            <button
              type="button"
              className="nm-panel-toggle"
              onClick={() => setSidebarCollapsed((v) => !v)}
              aria-label={sidebarCollapsed ? 'Show sidebar' : 'Hide sidebar'}
              title={sidebarCollapsed ? 'Show sidebar' : 'Hide sidebar'}
              style={{ ...panelToggleStyle, borderTopRightRadius: 6, borderBottomRightRadius: 6, borderLeft: 'none' }}
            >
              {sidebarCollapsed ? '›' : '‹'}
            </button>
          </div>
        </div>
        <main className="nm-doc-main" style={{ flex: 1, padding: '2rem 3rem', minWidth: 0 }} ref={contentRef}>
          <article className="prose">
            {page.route.endsWith('/roadmap') && <RoadmapProgressBanner section={page.section} />}
            <Suspense fallback={<div style={{ padding: '3rem 0', textAlign: 'center', color: 'var(--nm-text-muted)', fontSize: 14 }}>Loading…</div>}>
              <Component />
            </Suspense>
          </article>
          <PageFeedback page={page} />
          <MarkUnderstoodButton />
          <PrevNext route={page.route} />
        </main>
        <div className="nm-toc-wrap" style={{ position: 'relative', flexShrink: 0 }}>
          <div style={{ position: 'absolute', top: 0, bottom: 0, left: -22, width: 22 }}>
            <button
              type="button"
              className="nm-panel-toggle"
              onClick={() => setTocCollapsed((v) => !v)}
              aria-label={tocCollapsed ? 'Show table of contents' : 'Hide table of contents'}
              title={tocCollapsed ? 'Show table of contents' : 'Hide table of contents'}
              style={{ ...panelToggleStyle, borderTopLeftRadius: 6, borderBottomLeftRadius: 6, borderRight: 'none' }}
            >
              {tocCollapsed ? '‹' : '›'}
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
