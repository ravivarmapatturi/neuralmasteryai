import { Link, useLocation } from 'react-router-dom';

/**
 * Real, basic site-legitimacy infrastructure -- copyright, and links to
 * the actual Privacy Policy / Terms / About pages. Mounted once in
 * App.tsx alongside <Routes>, not per-page, so it appears on every route
 * without each page component needing to render it itself.
 */
/** A practice problem's workspace fills the viewport with its own
 * scrolling panes (like an IDE), so a footer below it only adds a second,
 * page-level scrollbar. Track pages (/practice/track/...) keep it. */
const WORKSPACE_ROUTE = /^\/practice\/(?!track\/)[^/]+\/?$/;

export default function Footer() {
  const { pathname } = useLocation();
  const year = new Date().getFullYear();
  if (WORKSPACE_ROUTE.test(pathname)) return null;
  return (
    <footer
      data-pagefind-ignore
      style={{
        borderTop: '1px solid var(--nm-border)',
        padding: '1.5rem 1.5rem',
        marginTop: 'auto',
      }}
    >
      <div
        style={{
          maxWidth: 1100,
          margin: '0 auto',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.75rem 1.5rem',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: 13,
          color: 'var(--nm-text-muted)',
        }}
      >
        <span>© {year} Neural Mastery</span>
        <nav style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }} aria-label="Footer">
          <Link to="/about" style={{ color: 'inherit' }}>
            About
          </Link>
          <Link to="/privacy" style={{ color: 'inherit' }}>
            Privacy Policy
          </Link>
          <Link to="/terms" style={{ color: 'inherit' }}>
            Terms of Service
          </Link>
          <a
            href="https://x.com/NeuralMastery"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'inherit' }}
          >
            Questions? Reach out on X
          </a>
        </nav>
      </div>
    </footer>
  );
}
