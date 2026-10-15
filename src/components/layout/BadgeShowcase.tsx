import { useState, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useGamification } from '../../contexts/GamificationContext';
import { BADGES, RARITY_CONFIGS, computeBadgeStats, type BadgeCategory } from '../../lib/badges';
import { getAllPracticeProblems } from '../../lib/contentTree';

const CATEGORIES: { id: BadgeCategory | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'learning', label: 'Learning' },
  { id: 'practice', label: 'Practice' },
  { id: 'difficulty', label: 'Difficulty' },
  { id: 'consistency', label: 'Consistency' },
  { id: 'mastery', label: 'Mastery' },
];

export default function BadgeShowcase() {
  const { events, points: totalXP, streak } = useGamification();
  const { user } = useAuth();
  const isSignedIn = Boolean(user);

  const problems = useMemo(() => getAllPracticeProblems(), []);
  const stats = useMemo(
    () => computeBadgeStats(events, totalXP, streak, isSignedIn, problems),
    [events, totalXP, streak, isSignedIn, problems],
  );

  const [activeCategory, setActiveCategory] = useState<BadgeCategory | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unlocked' | 'locked'>('all');

  const unlockedBadges = useMemo(() => BADGES.filter((b) => b.checkUnlocked(stats)), [stats]);
  const unlockedCount = unlockedBadges.length;

  const filteredBadges = useMemo(() => {
    return BADGES.filter((badge) => {
      if (activeCategory !== 'all' && badge.category !== activeCategory) return false;
      const isUnlocked = badge.checkUnlocked(stats);
      if (statusFilter === 'unlocked' && !isUnlocked) return false;
      if (statusFilter === 'locked' && isUnlocked) return false;
      return true;
    });
  }, [activeCategory, statusFilter, stats]);

  return (
    <div
      style={{
        background: 'var(--nm-surface)',
        borderRadius: 16,
        padding: '1.5rem',
        border: '1px solid var(--nm-border)',
        margin: '24px 0',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--nm-text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>🏆</span> Checkpoint Badges & Milestones
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--nm-text-muted)' }}>
            Unlocked {unlockedCount} of {BADGES.length} checkpoint badges across 5 core progression tracks
          </p>
        </div>

        {/* Progress pill */}
        <div
          style={{
            background: 'color-mix(in srgb, var(--nm-accent-primary) 15%, transparent)',
            border: '1px solid color-mix(in srgb, var(--nm-accent-primary) 30%, transparent)',
            borderRadius: 20,
            padding: '6px 14px',
            fontSize: 12.5,
            fontWeight: 700,
            color: 'var(--nm-accent-primary)',
          }}
        >
          {Math.round((unlockedCount / BADGES.length) * 100)}% Completed
        </div>
      </div>

      {/* Filter and Category Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 18, paddingBottom: 14, borderBottom: '1px solid var(--nm-border)' }}>
        {/* Category tabs */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                style={{
                  padding: '4px 10px',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: isActive ? 700 : 500,
                  border: isActive ? '1px solid var(--nm-accent-primary)' : '1px solid var(--nm-border)',
                  background: isActive ? 'color-mix(in srgb, var(--nm-accent-primary) 14%, transparent)' : 'transparent',
                  color: isActive ? 'var(--nm-accent-primary)' : 'var(--nm-text-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Status filter toggle */}
        <div style={{ display: 'flex', gap: 4, background: 'color-mix(in srgb, var(--nm-bg) 60%, var(--nm-surface))', padding: 2, borderRadius: 6, border: '1px solid var(--nm-border)' }}>
          {(['all', 'unlocked', 'locked'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              style={{
                padding: '3px 8px',
                borderRadius: 4,
                fontSize: 11,
                fontWeight: statusFilter === s ? 700 : 500,
                border: 'none',
                background: statusFilter === s ? 'var(--nm-surface)' : 'transparent',
                color: statusFilter === s ? 'var(--nm-text-primary)' : 'var(--nm-text-muted)',
                cursor: 'pointer',
                textTransform: 'capitalize',
              }}
            >
              {s === 'all' ? `All (${BADGES.length})` : s === 'unlocked' ? `Unlocked (${unlockedCount})` : `Locked (${BADGES.length - unlockedCount})`}
            </button>
          ))}
        </div>
      </div>

      {/* Badges Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: 14,
        }}
      >
        {filteredBadges.length === 0 ? (
          <div
            style={{
              gridColumn: '1 / -1',
              textAlign: 'center',
              padding: '32px 16px',
              color: 'var(--nm-text-muted)',
              fontSize: 13,
            }}
          >
            No badges matching current filter criteria.
          </div>
        ) : (
          filteredBadges.map((badge) => {
            const isUnlocked = badge.checkUnlocked(stats);
            const rarity = RARITY_CONFIGS[badge.rarity];
            const progress = badge.getProgress(stats);
            const progressPct = progress.target > 0 ? Math.min(100, Math.round((progress.current / progress.target) * 100)) : 0;

            const cardBorder = isUnlocked
              ? `1.5px solid ${rarity.borderColor}`
              : '1px solid var(--nm-border)';
            const cardBg = isUnlocked
              ? `color-mix(in srgb, ${rarity.bgTint} 70%, var(--nm-surface))`
              : 'color-mix(in srgb, var(--nm-bg) 30%, var(--nm-surface))';
            const cardShadow = isUnlocked && rarity.glowColor
              ? `0 4px 18px -2px ${rarity.glowColor}`
              : 'none';

            return (
              <div
                key={badge.id}
                style={{
                  background: cardBg,
                  border: cardBorder,
                  borderRadius: 12,
                  padding: 14,
                  display: 'flex',
                  gap: 12,
                  alignItems: 'flex-start',
                  boxShadow: cardShadow,
                  opacity: isUnlocked ? 1 : 0.65,
                  transition: 'all 0.2s ease',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {/* Badge Icon */}
                <div
                  style={{
                    fontSize: 28,
                    lineHeight: 1,
                    filter: isUnlocked ? 'drop-shadow(0 0 6px rgba(255, 255, 255, 0.35))' : 'grayscale(1) opacity(0.4)',
                    flexShrink: 0,
                    marginTop: 2,
                  }}
                >
                  {badge.icon}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: 13.5,
                        color: isUnlocked ? 'var(--nm-text-primary)' : 'var(--nm-text-secondary)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                      title={badge.title}
                    >
                      {badge.title}
                    </div>

                    {/* Status & Rarity Pill */}
                    <span
                      style={{
                        fontSize: 9.5,
                        background: isUnlocked ? `color-mix(in srgb, ${rarity.color} 20%, transparent)` : 'var(--nm-border)',
                        color: isUnlocked ? rarity.color : 'var(--nm-text-muted)',
                        border: isUnlocked ? `1px solid color-mix(in srgb, ${rarity.color} 35%, transparent)` : '1px solid var(--nm-border)',
                        padding: '1px 5px',
                        borderRadius: 4,
                        fontWeight: 700,
                        letterSpacing: '0.04em',
                        textTransform: 'uppercase',
                        flexShrink: 0,
                      }}
                    >
                      {isUnlocked ? `${rarity.label}` : 'LOCKED'}
                    </span>
                  </div>

                  <div style={{ fontSize: 11.5, color: 'var(--nm-text-muted)', lineHeight: 1.35, marginBottom: 8 }}>
                    {badge.description}
                  </div>

                  {/* Unlock progress for locked badges */}
                  {!isUnlocked ? (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: 'var(--nm-text-muted)', marginBottom: 3 }}>
                        <span>Progress:</span>
                        <span style={{ fontWeight: 600, color: 'var(--nm-text-secondary)' }}>
                          {progress.current} / {progress.target} {progress.unit}
                        </span>
                      </div>
                      <div style={{ height: 4, borderRadius: 2, background: 'var(--nm-border)', overflow: 'hidden' }}>
                        <div style={{ width: `${progressPct}%`, height: '100%', background: rarity.color, transition: 'width 200ms ease' }} />
                      </div>
                    </div>
                  ) : (
                    <div style={{ fontSize: 11, color: rarity.color, fontWeight: 600 }}>
                      ✓ {badge.requirementText}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

