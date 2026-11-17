import { Component, type ErrorInfo, type ReactNode } from 'react';
import { reportClientError } from './home/LiveStats';

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode | ((props: { error: Error; reset: () => void }) => ReactNode);
  level?: 'root' | 'route';
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.props.onError?.(error, errorInfo);
    try {
      reportClientError(`[ErrorBoundary:${this.props.level ?? 'route'}] ${error?.message || String(error)}`);
    } catch {
      // Ignore reporting errors
    }
  }

  reset = (): void => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  handleReload = (): void => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  render(): ReactNode {
    const { hasError, error } = this.state;
    const { children, fallback, level = 'route' } = this.props;

    if (!hasError || !error) {
      return children;
    }

    if (fallback) {
      if (typeof fallback === 'function') {
        return fallback({ error, reset: this.reset });
      }
      return fallback;
    }

    const isRoot = level === 'root';
    const heading = isRoot ? 'Something went wrong' : 'Could not load this page';
    const message =
      'A new version of the site may have been published, or your connection was interrupted. Please reload the page to continue.';

    const cardContent = (
      <div
        role="alert"
        aria-live="assertive"
        style={{
          maxWidth: 520,
          width: '100%',
          margin: '0 auto',
          padding: isRoot ? '2.5rem 2rem' : '2.5rem 1.5rem',
          textAlign: 'center',
          background: 'var(--nm-surface, #ffffff)',
          border: '1px solid var(--nm-border, #e5e7eb)',
          borderRadius: 12,
          boxShadow: isRoot ? '0 10px 25px -5px rgba(0, 0, 0, 0.05)' : 'none',
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: 'var(--nm-amber-surface, #fef3c7)',
            color: 'var(--nm-amber-ink, #b45309)',
            marginBottom: '1rem',
            fontSize: 22,
          }}
          aria-hidden="true"
        >
          !
        </div>
        <h2
          style={{
            margin: '0 0 0.5rem',
            fontSize: isRoot ? 24 : 20,
            fontWeight: 700,
            color: 'var(--nm-text-primary, #111827)',
            fontFamily: 'var(--nm-font-note, inherit)',
          }}
        >
          {heading}
        </h2>
        <p
          style={{
            margin: '0 0 1.5rem',
            fontSize: 14,
            lineHeight: 1.6,
            color: 'var(--nm-text-secondary, #4b5563)',
          }}
        >
          {message}
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={this.handleReload}
            className="nm-button nm-button-primary"
            style={{
              padding: '0.6rem 1.25rem',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              borderRadius: 6,
            }}
          >
            Reload page
          </button>
          <button
            type="button"
            onClick={this.reset}
            style={{
              padding: '0.6rem 1.25rem',
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer',
              background: 'transparent',
              border: '1px solid var(--nm-border, #d1d5db)',
              borderRadius: 6,
              color: 'var(--nm-text-primary, #374151)',
            }}
          >
            Try again
          </button>
        </div>
      </div>
    );

    if (isRoot) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--nm-bg, #f9fafb)',
            padding: '2rem 1rem',
          }}
        >
          {cardContent}
        </div>
      );
    }

    return (
      <div style={{ padding: '2rem 1rem', display: 'flex', justifyContent: 'center' }}>
        {cardContent}
      </div>
    );
  }
}

export default ErrorBoundary;
