import { useEffect, useRef } from 'react';

const FOCUSABLE = 'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * In-app replacement for window.confirm(), which blocks the whole tab,
 * can't be styled, and is treated as a dated/broken pattern by browser
 * automation and users alike (audit finding C10). Same focus-trap +
 * Escape-to-close + backdrop-click pattern as SearchModal/MobileNavDrawer
 * so keyboard behavior is consistent with the rest of the app's overlays.
 */
export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = true,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) {
      const id = requestAnimationFrame(() => confirmBtnRef.current?.focus());
      return () => cancelAnimationFrame(id);
    }
    return undefined;
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onCancel();
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
  }, [open, onCancel]);

  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return (
    <>
      <div
        aria-hidden="true"
        onClick={onCancel}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.5)', zIndex: 1000 }}
      />
      <div
        ref={panelRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-description"
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 1001,
          width: 'min(420px, calc(100vw - 32px))',
          background: 'var(--nm-surface)',
          border: '1px solid var(--nm-border)',
          borderRadius: 12,
          padding: '1.25rem',
          boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
        }}
      >
        <h2 id="confirm-dialog-title" style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--nm-text-primary)' }}>
          {title}
        </h2>
        <p id="confirm-dialog-description" style={{ margin: '0.6rem 0 1rem', fontSize: 13.5, lineHeight: 1.5, color: 'var(--nm-text-secondary)' }}>
          {description}
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--nm-text-secondary)',
              background: 'transparent',
              border: '1px solid var(--nm-border)',
              borderRadius: 8,
              padding: '0.5rem 1rem',
              cursor: 'pointer',
            }}
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmBtnRef}
            type="button"
            onClick={onConfirm}
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: danger ? '#fff' : 'var(--nm-bg, #fff)',
              background: danger ? 'var(--nm-accent-danger)' : 'var(--nm-accent-primary)',
              border: 'none',
              borderRadius: 8,
              padding: '0.5rem 1rem',
              cursor: 'pointer',
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </>
  );
}
