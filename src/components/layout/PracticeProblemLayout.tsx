import { Suspense, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import PracticeWorkspace from '../practice/PracticeWorkspace';
import { getPageByRoute, legacyPracticeRedirect, normalizeRoute } from '../../lib/contentTree';
import { getPracticeProblem } from '../../lib/practiceProblem';
import { useDocumentTitle } from '../../lib/useDocumentTitle';
import { useDocumentMeta } from '../../lib/useDocumentMeta';
import { isCurated } from '../../data/practiceCatalog';

/**
 * PracticeProblemLayout handles practice problem routes (/practice/:slug).
 * For migrated structured practice problems (such as /practice/dot-product),
 * it renders the full-screen IDE workspace (PracticeWorkspace).
 */
export default function PracticeProblemLayout() {
  const location = useLocation();
  const route = normalizeRoute(location.pathname);
  const page = getPageByRoute(route);

  const movedTo = legacyPracticeRedirect(route);

  useDocumentTitle(page ? page.title : 'Practice Problem');
  useDocumentMeta(page?.title, page?.description);

  // Problems outside the curated catalogue keep working URLs but must not be
  // indexed (they're also not prerendered, so they serve with a 404 status).
  const hidden = !movedTo && page?.problemId !== undefined && !isCurated(page.problemId);
  useEffect(() => {
    if (!hidden) return undefined;
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex,follow';
    document.head.appendChild(meta);
    return () => meta.remove();
  }, [hidden]);

  if (movedTo) return <Navigate to={movedTo} replace />;

  if (!page) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--nm-bg, #090d16)' }}>
        <Navbar />
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--nm-text-primary, #f8fafc)' }}>
          <h1>Page not found</h1>
        </div>
      </div>
    );
  }

  const problemId = page.problemId ?? route.replace(/^\/practice\//, '').replace(/\/$/, '');
  const structuredProblem = getPracticeProblem(problemId);
  const { Component } = page;

  if (structuredProblem) {
    return (
      <PracticeWorkspace
        problemId={problemId}
        mdxContent={
          Component ? (
            <Suspense fallback={<div style={{ padding: '2rem 0', color: '#94a3b8' }}>Loading worked intuition…</div>}>
              <Component />
            </Suspense>
          ) : null
        }
      />
    );
  }

  // Fallback for unmigrated MDX pages
  return (
    <div style={{ minHeight: '100vh', background: 'var(--nm-bg, #090d16)' }}>
      <Navbar />
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: 24 }}>
        {Component && (
          <Suspense fallback={<div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>Loading…</div>}>
            <Component />
          </Suspense>
        )}
      </div>
    </div>
  );
}

