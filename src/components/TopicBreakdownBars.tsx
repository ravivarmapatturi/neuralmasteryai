import { topicBreakdown, type AwardEvent } from '../lib/gamification';
import { DomainIcon } from './icons/DomainIcons';

/**
 * Where a user's points actually came from, by top-level learning-path
 * group -- same icon/color/bar-list visual convention as ProgressPage's
 * "By learning-path group" section (completionFor), just driven by
 * topicBreakdown()'s real point totals instead of page-completion %.
 */
export default function TopicBreakdownBars({ events }: { events: AwardEvent[] }) {
  const breakdown = topicBreakdown(events);

  if (breakdown.length === 0) {
    return (
      <p style={{ margin: 0, padding: '1rem 1.25rem', fontSize: 13, color: 'var(--nm-text-muted)', lineHeight: 1.6 }}>
        No points earned yet -- mark a page understood or complete a practice problem to see where your effort is going.
      </p>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {breakdown.map((entry) => (
        <div
          key={entry.groupKey}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '0.65rem 0.9rem',
            borderRadius: 10,
            border: '1px solid var(--nm-border)',
            background: 'var(--nm-surface)',
          }}
        >
          <DomainIcon groupKey={entry.groupKey} color={entry.color} size={18} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--nm-text-primary)', marginBottom: 4 }}>{entry.label}</div>
            <div style={{ height: 5, borderRadius: 3, background: 'var(--nm-border)', overflow: 'hidden' }}>
              <div style={{ width: `${entry.pct * 100}%`, height: '100%', background: entry.color, transition: 'width 200ms ease' }} />
            </div>
          </div>
          <span style={{ fontSize: 12, color: 'var(--nm-text-muted)', flexShrink: 0 }}>
            {entry.points} pt{entry.points === 1 ? '' : 's'} · {Math.round(entry.pct * 100)}%
          </span>
        </div>
      ))}
    </div>
  );
}
