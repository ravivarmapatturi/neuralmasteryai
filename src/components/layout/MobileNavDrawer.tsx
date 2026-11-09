import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import Sidebar from './Sidebar';
import TableOfContents from './TableOfContents';
import FocusMusicControl from '../focus-music/FocusMusicControl';
import FocusTimerControl from '../focus-timer/FocusTimerControl';

const FOCUSABLE = 'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * The tablet/mobile navigation overlay -- backdrop + slide-in panel,
 * reusing Sidebar and TableOfContents as-is (variant="mobile") so the
 * content-tree data and active-page/section highlighting are identical to
 * desktop, never a second hardcoded structure. Docked desktop Sidebar/TOC
 * are hidden below 900px via CSS (.nm-sidebar/.nm-toc); this is what
 * replaces them at that breakpoint.
 */
export default function MobileNavDrawer({
  open,
  onClose,
  contentRef,
  triggerRef,
}: {
  open: boolean;
  onClose: () => void;
  contentRef: RefObject<HTMLElement | null>;
  triggerRef: RefObject<HTMLButtonElement | null>;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Focus the panel on open, restore focus to the hamburger button on close.
  useEffect(() => {
    if (open) {
      panelRef.current?.focus();
    } else {
      triggerRef.current?.focus();
    }
  }, [open, triggerRef]);

  // Escape closes; Tab/Shift+Tab is trapped inside the panel while open.
  useEffect(() => {
    if (!open) return undefined;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !panelRef.current) return;
      const focusable = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  // Prevent background scroll while the drawer is open.
  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <div
        aria-hidden="true"
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.45)',
          opacity: open ? 1 : 0,
          visibility: open ? 'visible' : 'hidden',
          pointerEvents: open ? 'auto' : 'none',
          transition: `opacity 200ms ease, visibility 0ms linear ${open ? '0ms' : '200ms'}`,
          zIndex: 300,
        }}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Site navigation"
        aria-hidden={!open}
        tabIndex={-1}
        style={{
          position: 'fixed',
          top: 0,
          bottom: 0,
          left: 0,
          width: 'min(320px, 86vw)',
          background: 'var(--nm-surface)',
          borderRight: '1px solid var(--nm-border)',
          boxShadow: '0 0 24px rgba(0,0,0,0.25)',
          transform: open ? 'translateX(0)' : 'translateX(-100%)',
          visibility: open ? 'visible' : 'hidden',
          transition: `transform 220ms ease, visibility 0ms linear ${open ? '0ms' : '220ms'}`,
          zIndex: 301,
          overflowY: 'auto',
          padding: '1.25rem 1rem',
          outline: 'none',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--nm-text-primary)' }}>Navigate</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              border: '1px solid var(--nm-border)',
              background: 'transparent',
              color: 'var(--nm-text-primary)',
              cursor: 'pointer',
              fontSize: 16,
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        <Sidebar variant="mobile" onNavigate={onClose} />

        <div style={{ borderTop: '1px solid var(--nm-border)', marginTop: '1rem', paddingTop: '1rem' }}>
          <TableOfContents contentRef={contentRef} variant="mobile" onNavigate={onClose} />
        </div>

        <div style={{ borderTop: '1px solid var(--nm-border)', marginTop: '1rem', paddingTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <FocusTimerControl />
          <FocusMusicControl />
        </div>
      </div>
    </>
  );
}
