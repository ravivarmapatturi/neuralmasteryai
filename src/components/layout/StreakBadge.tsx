import { Link } from 'react-router-dom';
import { useGamification } from '../../contexts/GamificationContext';

/**
 * Always-visible streak indicator, not buried on one page -- the same
 * "tracked locally in this browser, syncs once signed in" data
 * ProgressPage's own Points/Streak panel reads, just surfaced everywhere
 * instead of only where a visitor happens to navigate. Renders nothing at
 * all for a genuine 0 streak (a brand-new or inactive visitor) -- an
 * empty/zero badge sitting in the nav permanently is clutter, not signal.
 */
export default function StreakBadge() {
  const { streak } = useGamification();
  if (streak === 0) return null;

  return (
    <Link
      to="/profile"
      title={`${streak} day streak`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        fontSize: 13,
        fontWeight: 700,
        color: 'var(--nm-text-primary)',
        textDecoration: 'none',
        padding: '0.3rem 0.55rem',
        borderRadius: 8,
        border: '1px solid var(--nm-border)',
        background: 'color-mix(in srgb, var(--nm-accent-warn) 10%, transparent)',
      }}
    >
      {streak}-day streak
    </Link>
  );
}
