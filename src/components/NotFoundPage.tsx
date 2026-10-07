import { Link } from 'react-router-dom';
import Navbar from './layout/Navbar';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import { useDocumentMeta } from '../lib/useDocumentMeta';

/**
 * Real catch-all for any route that matches nothing in App.tsx's <Route>
 * list -- previously there was none at all, so an unmatched URL (a typo'd
 * link, an old bookmark to a page that got renamed/removed) rendered
 * nothing: React Router has no implicit fallback UI, just a blank page
 * where content should be. Keeps Navbar mounted so search (Ctrl/Cmd+K)
 * and the primary nav drawer are both real, working ways out of here, not
 * just a dead end with one link back to Home.
 */
export default function NotFoundPage() {
  useDocumentTitle('Page Not Found');
  useDocumentMeta('Page Not Found', "The page you're looking for doesn't exist or has moved.");

  return (
    <div style={{ minHeight: '100%', background: 'var(--nm-bg)' }}>
      <Navbar />
      <main>
        <section
          style={{
            maxWidth: 560,
            margin: '0 auto',
            padding: '5rem 1.5rem 4rem',
            textAlign: 'center',
          }}
        >
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--nm-text-muted)', marginBottom: '0.75rem' }}>
            404
          </div>
          <h1 style={{ fontSize: 'clamp(1.6rem, 4vw, 2.2rem)', fontWeight: 800, color: 'var(--nm-text-primary)', marginBottom: '0.75rem' }}>
            This page doesn't exist
          </h1>
          <p style={{ fontSize: 15, lineHeight: 1.6, color: 'var(--nm-text-secondary)', marginBottom: '2rem' }}>
            The link that brought you here is broken, or the page moved. Try searching for what you were looking for, or head back to one of these:
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
            <Link
              to="/"
              className="nm-button nm-button-primary"
              style={{ padding: '0.6rem 1.25rem', fontSize: 14, fontWeight: 700, textDecoration: 'none' }}
            >
              Go Home
            </Link>
            <Link
              to="/learn"
              style={{
                padding: '0.6rem 1.25rem',
                fontSize: 14,
                fontWeight: 700,
                textDecoration: 'none',
                color: 'var(--nm-text-primary)',
                border: '1px solid var(--nm-border)',
                borderRadius: 8,
              }}
            >
              Browse Lessons
            </Link>
            <Link
              to="/practice"
              style={{
                padding: '0.6rem 1.25rem',
                fontSize: 14,
                fontWeight: 700,
                textDecoration: 'none',
                color: 'var(--nm-text-primary)',
                border: '1px solid var(--nm-border)',
                borderRadius: 8,
              }}
            >
              Practice Problems
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
