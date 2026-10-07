import { useEffect, useState, type RefObject } from 'react';
import { Link } from 'react-router-dom';
import { useColorMode } from '../../theme/ThemeProvider';
import SearchModal from './SearchModal';
import AuthButton from './AuthButton';
import StreakBadge from './StreakBadge';

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform ?? navigator.userAgent);

export default function Navbar({
  onMenuClick,
  menuButtonRef,
}: {
  onMenuClick?: () => void;
  menuButtonRef?: RefObject<HTMLButtonElement | null>;
}) {
  const { colorMode, toggleColorMode } = useColorMode();
  const [searchOpen, setSearchOpen] = useState(false);
  const [primaryMenuOpen, setPrimaryMenuOpen] = useState(false);

  // Cmd+K (Mac) / Ctrl+K (everywhere else) opens search from anywhere on
  // the page, not just when the navbar button has focus -- the standard
  // convention users expect (docs sites, GitHub, Linear, etc.).
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key.toLowerCase() === 'k' && (isMac ? e.metaKey : e.ctrlKey)) {
        e.preventDefault();
        setSearchOpen(true);
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (!primaryMenuOpen) return undefined;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setPrimaryMenuOpen(false);
    }
    document.addEventListener('keydown', onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [primaryMenuOpen]);

  return (
    <>
      <header
        className="nm-navbar-header"
        data-pagefind-ignore
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.75rem 1.5rem',
          background: 'var(--nm-surface)',
          borderBottom: '1px solid var(--nm-border)',
          gap: '0.75rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {onMenuClick && (
            <button
              ref={menuButtonRef}
              type="button"
              onClick={onMenuClick}
              className="nm-navbar-toggle"
              aria-label="Open navigation menu"
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                border: '1px solid var(--nm-border)',
                background: 'transparent',
                color: 'var(--nm-text-primary)',
                cursor: 'pointer',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 16,
                flexShrink: 0,
              }}
            >
              ☰
            </button>
          )}
          <Link to="/" style={{ fontWeight: 700, fontSize: 17, color: 'var(--nm-text-primary)', textDecoration: 'none' }}>
            Neural Mastery
          </Link>
        </div>
        <nav className="nm-navbar-nav" style={{ display: 'flex', alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => setPrimaryMenuOpen(true)}
            aria-label="Open menu"
            aria-haspopup="true"
            aria-expanded={primaryMenuOpen}
            className="nm-navbar-primary-toggle"
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              border: '1px solid var(--nm-border)',
              background: 'transparent',
              color: 'var(--nm-text-primary)',
              cursor: 'pointer',
              fontSize: 15,
            }}
          >
            ☰
          </button>
          <Link to="/learn" className="nm-navbar-learn-link" style={{ color: 'var(--nm-text-primary)', textDecoration: 'none', fontSize: 14 }}>
            Learn
          </Link>
          <Link
            to="/practice"
            className="nm-practice-link"
            style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--nm-text-primary)', textDecoration: 'none', fontSize: 14 }}
          >
            Practice
            <span
              className="nm-practice-badge"
              style={{
                fontSize: 9.5,
                fontWeight: 800,
                letterSpacing: '0.03em',
                color: 'var(--nm-bg)',
                background: 'var(--nm-accent-primary)',
                borderRadius: 5,
                padding: '0.1rem 0.32rem',
                lineHeight: 1.4,
              }}
            >
              NEW
            </span>
          </Link>
          <Link
            to="/leaderboard"
            className="nm-navbar-leaderboard-link"
            style={{ color: 'var(--nm-text-primary)', textDecoration: 'none', fontSize: 14 }}
          >
            Leaderboard
          </Link>
          <Link
            to="/progress"
            className="nm-navbar-progress-link"
            style={{ color: 'var(--nm-text-primary)', textDecoration: 'none', fontSize: 14 }}
          >
            Progress
          </Link>
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            aria-label="Search documentation"
            title={`Search (${isMac ? 'Cmd' : 'Ctrl'}+K)`}
            className="nm-navbar-search-btn"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              height: 32,
              padding: '0 10px',
              borderRadius: 8,
              border: '1px solid var(--nm-border)',
              background: 'transparent',
              color: 'var(--nm-text-secondary)',
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            <span aria-hidden="true" style={{ fontSize: 14 }}>
              ⌕
            </span>
            <span className="nm-search-kbd-hint" style={{ fontSize: 11, color: 'var(--nm-text-muted)' }}>
              {isMac ? '⌘K' : 'Ctrl+K'}
            </span>
          </button>
          <button
            type="button"
            onClick={toggleColorMode}
            aria-label="Toggle color mode"
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              border: '1px solid var(--nm-border)',
              background: 'transparent',
              color: 'var(--nm-text-primary)',
              cursor: 'pointer',
            }}
          >
            {colorMode === 'dark' ? '☀' : '☾'}
          </button>
          <StreakBadge />
          <AuthButton />
        </nav>
      </header>
      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
      {primaryMenuOpen && (
        <>
          <div
            aria-hidden="true"
            onClick={() => setPrimaryMenuOpen(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.5)', zIndex: 200 }}
          />
          <nav
            aria-label="Primary"
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              bottom: 0,
              width: 'min(280px, 80vw)',
              zIndex: 201,
              background: 'var(--nm-surface)',
              borderRight: '1px solid var(--nm-border)',
              boxShadow: '4px 0 24px rgba(0,0,0,0.25)',
              padding: '1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--nm-text-primary)' }}>Menu</span>
              <button
                type="button"
                onClick={() => setPrimaryMenuOpen(false)}
                aria-label="Close menu"
                style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid var(--nm-border)', background: 'transparent', color: 'var(--nm-text-primary)', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>
            {[
              { to: '/learn', label: 'Learn' },
              { to: '/practice', label: 'Practice' },
              { to: '/leaderboard', label: 'Leaderboard' },
              { to: '/progress', label: 'Progress' },
            ].map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setPrimaryMenuOpen(false)}
                style={{
                  color: 'var(--nm-text-primary)',
                  textDecoration: 'none',
                  fontSize: 15,
                  padding: '0.6rem 0.5rem',
                  borderRadius: 8,
                }}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </>
      )}
    </>
  );
}
