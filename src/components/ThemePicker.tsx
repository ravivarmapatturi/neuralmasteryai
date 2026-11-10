import { useEffect, useRef, useState } from 'react';
import { useColorMode } from '../theme/ThemeProvider';
import { THEME_LIST, getThemeMeta, type ThemeId } from '../theme/themes';

function SunIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

export default function ThemePicker() {
  const { theme, setTheme, toggleColorMode, isDark } = useColorMode();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentMeta = getThemeMeta(theme);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const selectTheme = (id: ThemeId) => {
    setTheme(id);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="nm-theme-picker-container" style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      <div
        className="nm-theme-toggle-pill"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          border: '1px solid var(--nm-border)',
          borderRadius: '999px',
          background: 'var(--nm-surface)',
          padding: '2px',
          gap: '2px',
        }}
      >
        <button
          type="button"
          className="nm-theme-quick-toggle"
          onClick={toggleColorMode}
          aria-label="Toggle color mode"
          title={`Quick toggle: ${isDark ? 'Switch to light' : 'Switch to dark'}`}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 28,
            height: 28,
            borderRadius: '50%',
            border: 'none',
            background: 'transparent',
            color: 'var(--nm-text-primary)',
            cursor: 'pointer',
          }}
        >
          {isDark ? <SunIcon /> : <MoonIcon />}
        </button>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label="Theme picker"
          aria-haspopup="listbox"
          aria-expanded={open}
          title="Choose from 5 background themes"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            height: 28,
            padding: '0 6px 0 3px',
            borderRadius: '999px',
            border: 'none',
            background: 'var(--nm-surface-alt)',
            cursor: 'pointer',
            fontSize: '11px',
            fontWeight: 600,
            color: 'var(--nm-text-secondary)',
          }}
        >
          <span
            style={{
              width: 12,
              height: 12,
              borderRadius: '50%',
              background: currentMeta.swatch,
              border: `1.5px solid ${currentMeta.border || 'var(--nm-border)'}`,
              display: 'inline-block',
              flexShrink: 0,
            }}
          />
          <span className="nm-theme-caret" aria-hidden="true" style={{ fontSize: '9px', opacity: 0.7 }}>
            ▼
          </span>
        </button>
      </div>

      {open && (
        <div
          role="listbox"
          aria-label="Theme backgrounds"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            right: 0,
            zIndex: 300,
            minWidth: 190,
            background: 'var(--nm-surface)',
            border: '1px solid var(--nm-border)',
            borderRadius: 10,
            boxShadow: '0 8px 24px rgba(0,0,0,0.22)',
            padding: '6px',
            display: 'flex',
            flexDirection: 'column',
            gap: '3px',
          }}
        >
          <div style={{ padding: '4px 8px 6px', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--nm-text-muted)', fontWeight: 700 }}>
            Background Theme
          </div>
          {THEME_LIST.map((t) => {
            const isSelected = theme === t.id;
            return (
              <button
                key={t.id}
                role="option"
                aria-selected={isSelected}
                aria-label={t.name}
                onClick={() => selectTheme(t.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '7px 10px',
                  borderRadius: 6,
                  border: isSelected ? '1px solid var(--nm-accent-primary)' : '1px solid transparent',
                  background: isSelected ? 'var(--nm-surface-alt)' : 'transparent',
                  color: 'var(--nm-text-primary)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: '13px',
                  fontWeight: isSelected ? 600 : 400,
                }}
              >
                <span
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    background: t.swatch,
                    border: `1.5px solid ${t.border || 'rgba(0,0,0,0.2)'}`,
                    flexShrink: 0,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  }}
                />
                <span style={{ flex: 1 }}>{t.name}</span>
                {isSelected && (
                  <span aria-hidden="true" style={{ fontSize: '12px', color: 'var(--nm-accent-primary)' }}>
                    ✓
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function MobileThemeList() {
  const { theme, setTheme } = useColorMode();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
      <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--nm-text-muted)', fontWeight: 700 }}>
        Theme Background
      </span>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px' }}>
        {THEME_LIST.map((t) => {
          const isSelected = theme === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTheme(t.id)}
              aria-label={`Select ${t.name}`}
              title={t.name}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                padding: '6px 4px',
                borderRadius: '8px',
                border: isSelected ? '2px solid var(--nm-accent-primary)' : '1px solid var(--nm-border)',
                background: 'var(--nm-surface-alt)',
                cursor: 'pointer',
              }}
            >
              <span
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  background: t.swatch,
                  border: `1.5px solid ${t.border || 'rgba(0,0,0,0.2)'}`,
                }}
              />
              <span style={{ fontSize: '9px', color: 'var(--nm-text-secondary)', fontWeight: isSelected ? 700 : 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
                {t.shortLabel}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
