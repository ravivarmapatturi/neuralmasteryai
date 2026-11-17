import { Link } from 'react-router-dom';
import { useGamification } from '../../contexts/GamificationContext';
import { useEffect, useState } from 'react';

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
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    const counter = document.getElementById('nm-xp-streak-counter');
    if (!counter) return undefined;
    if (counter.classList.contains('nm-xp-pulse')) setPulse(true);
    const observer = new MutationObserver(() => {
      if (counter.classList.contains('nm-xp-pulse')) setPulse(true);
    });
    observer.observe(counter, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, [streak]);

  useEffect(() => {
    if (!pulse) return undefined;
    const timeout = window.setTimeout(() => setPulse(false), 700);
    return () => window.clearTimeout(timeout);
  }, [pulse]);

  if (streak === 0) return null;

  return (
    <Link
      id="nm-xp-streak-counter"
      to="/profile"
      title={`${streak} day streak`}
      aria-label={`${streak} day streak`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        fontSize: 14,
        fontWeight: 700,
        color: 'var(--nm-text-primary)',
        textDecoration: 'none',
        padding: '0.3rem 0.55rem',
        borderRadius: 8,
        border: '1px solid var(--nm-border)',
        background: 'color-mix(in srgb, var(--nm-accent-warn) 10%, transparent)',
      }}
      className={`nm-xp-streak-counter${pulse ? ' nm-xp-pulse' : ''}`}
    >
      <span aria-hidden="true">🔥</span>
      {streak}
      <style>{`
        .nm-xp-pulse { animation: nm-xp-counter-pulse 650ms ease-out; }
        @keyframes nm-xp-counter-pulse { 50% { transform: scale(1.12); box-shadow: 0 0 0 5px color-mix(in srgb, var(--nm-accent-warn) 28%, transparent); } }
        @media (prefers-reduced-motion: reduce) { .nm-xp-pulse { animation: none; } }
      `}</style>
    </Link>
  );
}
