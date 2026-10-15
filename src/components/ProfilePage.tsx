import { useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from './layout/Navbar';
import ActivityHeatmap from './ActivityHeatmap';
import TopicBreakdownBars from './TopicBreakdownBars';
import BadgeShowcase from './layout/BadgeShowcase';
import Pseudo3DAvatar from './Pseudo3DAvatar';
import RankBadge from './RankBadge';
import { useAuth } from '../contexts/AuthContext';
import { useGamification } from '../contexts/GamificationContext';
import { useLeaderboard } from '../lib/useLeaderboard';
import { levelForPoints } from '../lib/gamification';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import { useDocumentMeta } from '../lib/useDocumentMeta';
import { getFlatPages, getAllPracticeProblems } from '../lib/contentTree';
import { useProgress } from '../contexts/ProgressContext';
import { practiceStats } from '../lib/mastery';
import { rankForLevel, nextRankTier } from '../lib/rankTiers';
import { computeBadgeStats, BADGES } from '../lib/badges';
import { computeLearnerTitle } from '../lib/learnerIdentity';

/**
 * The site's one real "this is you" identity page -- player card hero with
 * a layered pseudo-3D cybernetic avatar, rank badge, data-derived learner title,
 * level/XP progress, real stats, activity calendar, badges, topic breakdown, and leaderboard.
 */
export default function ProfilePage() {
  useDocumentTitle('Your Profile');
  useDocumentMeta('Your Profile', 'Your Neural Mastery identity -- level, XP, streak, topic breakdown, activity calendar, and the leaderboard.');

  const { user } = useAuth();
  const { points, streak, events, displayName, updateDisplayName } = useGamification();
  const { countWithin } = useProgress();
  const [leaderboardTab, setLeaderboardTab] = useState<'allTime' | 'weekly'>('allTime');
  const { entries: leaderboardEntries, loading: leaderboardLoading } = useLeaderboard(leaderboardTab);

  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(displayName);

  const { level, xpIntoLevel, xpForNextLevel } = levelForPoints(points);
  const rank = rankForLevel(level);
  const nextRank = nextRankTier(rank);
  const levelPct = xpForNextLevel === 0 ? 1 : xpIntoLevel / xpForNextLevel;

  const learnPages = getFlatPages();
  const problems = getAllPracticeProblems();
  const lessonsCompleted = countWithin(learnPages.map((page) => page.route));
  const stats = practiceStats(problems, events);
  const badgeStats = computeBadgeStats(events, points, streak, Boolean(user), problems);
  const unlockedBadgesCount = BADGES.filter((b) => b.checkUnlocked(badgeStats)).length;
  const identityInfo = computeLearnerTitle(problems, events);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--nm-bg)' }}>
      <Navbar />

      <main style={{ maxWidth: 1320, margin: '0 auto', padding: '2.5rem 2rem 3rem' }}>
        {/* --- Player Card Hero --- */}
        <section
          aria-label="Player Card"
          style={{
            borderRadius: 16,
            border: '1px solid var(--nm-border)',
            background: 'var(--nm-surface)',
            padding: '2rem',
            marginBottom: '2rem',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 28,
              flexWrap: 'wrap',
              marginBottom: '1.75rem',
            }}
          >
            {/* Pseudo-3D Layered Avatar */}
            <div style={{ flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
              <Pseudo3DAvatar tier={rank} size={130} />
            </div>

            {/* Profile Identity Details */}
            <div style={{ flex: '1 1 300px', minWidth: 0 }}>
              {identityInfo.topTrackLabel && (
                <p style={{ fontSize: 12.5, color: 'var(--nm-text-muted)', margin: '0 0 6px' }}>
                  {identityInfo.title} · most solves in {identityInfo.topTrackLabel}
                </p>
              )}

              {/* Editable Display Name */}
              {editingName ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const trimmed = nameDraft.trim();
                    if (trimmed) updateDisplayName(trimmed);
                    setEditingName(false);
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}
                >
                  <input
                    autoFocus
                    value={nameDraft}
                    onChange={(e) => setNameDraft(e.target.value)}
                    maxLength={40}
                    aria-label="Display name"
                    style={{
                      fontSize: 'clamp(1.2rem, 2.6vw, 1.6rem)',
                      fontWeight: 800,
                      color: 'var(--nm-text-primary)',
                      background: 'var(--nm-surface)',
                      border: '1.5px solid var(--nm-accent-primary)',
                      borderRadius: 8,
                      padding: '0.2rem 0.6rem',
                      minWidth: 0,
                      flex: '1 1 220px',
                    }}
                  />
                  <button type="submit" className="nm-button nm-button-primary" style={{ padding: '0.35rem 0.9rem', fontSize: 12.5 }}>
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNameDraft(displayName);
                      setEditingName(false);
                    }}
                    className="nm-button nm-button-secondary"
                    style={{ padding: '0.35rem 0.9rem', fontSize: 12.5 }}
                  >
                    Cancel
                  </button>
                </form>
              ) : (
                <h1
                  style={{
                    fontSize: 'clamp(1.5rem, 3.2vw, 2.1rem)',
                    fontWeight: 900,
                    color: 'var(--nm-text-primary)',
                    margin: '0 0 6px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    letterSpacing: '-0.02em',
                  }}
                >
                  {displayName}
                  <button
                    type="button"
                    onClick={() => {
                      setNameDraft(displayName);
                      setEditingName(true);
                    }}
                    aria-label="Edit display name"
                    title="Edit display name"
                    style={{
                      fontSize: 12.5,
                      fontWeight: 600,
                      color: 'var(--nm-text-muted)',
                      background: 'var(--nm-surface)',
                      border: '1px solid var(--nm-border)',
                      borderRadius: 6,
                      padding: '0.2rem 0.55rem',
                      cursor: 'pointer',
                      lineHeight: 1.4,
                    }}
                  >
                    ✎ Edit
                  </button>
                </h1>
              )}

              <p style={{ fontSize: 13, color: 'var(--nm-text-muted)', margin: 0 }}>
                {user
                  ? `Synced across your devices (${user.email ?? 'Signed in'})`
                  : 'Not signed in. Your progress is saved in this browser only; sign in to keep it across devices.'}
              </p>
            </div>
          </div>

          {/* --- Rank & Level Progress Row --- */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: 16,
              marginBottom: '1.75rem',
            }}
          >
            {/* Rank Card */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: '1rem 1.25rem',
                borderRadius: 12,
                border: `1px solid color-mix(in srgb, ${rank.color} 35%, var(--nm-border))`,
                background: `color-mix(in srgb, ${rank.color} 8%, var(--nm-bg))`,
              }}
            >
              <RankBadge tier={rank} size={52} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--nm-text-muted)' }}>
                  Rank
                </div>
                <div style={{ fontSize: 18, fontWeight: 800, color: rank.color }}>{rank.label}</div>
              </div>
              {nextRank && (
                <div style={{ fontSize: 12, color: 'var(--nm-text-muted)', textAlign: 'right', flexShrink: 0 }}>
                  {Math.max(0, nextRank.minLevel - level)} level{nextRank.minLevel - level === 1 ? '' : 's'} to
                  <br />
                  <span style={{ fontWeight: 700, color: nextRank.color }}>{nextRank.label}</span>
                </div>
              )}
            </div>

            {/* Level & XP Progress */}
            <div
              style={{
                padding: '1rem 1.25rem',
                borderRadius: 12,
                border: '1px solid var(--nm-border)',
                background: 'color-mix(in srgb, var(--nm-surface) 60%, var(--nm-bg))',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--nm-text-primary)' }}>Level {level}</span>
                <span style={{ fontSize: 12.5, color: 'var(--nm-text-muted)' }}>
                  {xpIntoLevel} / {xpForNextLevel} XP to level {level + 1}
                </span>
              </div>
              <div style={{ height: 8, borderRadius: 4, background: 'var(--nm-border)', overflow: 'hidden' }}>
                <div style={{ width: `${levelPct * 100}%`, height: '100%', background: rank.color, transition: 'width 200ms ease' }} />
              </div>
            </div>
          </div>

          {/* --- Prominent Real Stats Grid --- */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 12,
            }}
          >
            {/* Points */}
            <div
              style={{
                padding: '0.9rem 1.1rem',
                borderRadius: 10,
                border: '1px solid var(--nm-border)',
                background: 'color-mix(in srgb, var(--nm-surface) 80%, var(--nm-bg))',
              }}
            >
              <div style={{ fontSize: 11.5, color: 'var(--nm-text-muted)', marginBottom: 4 }}>Points</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--nm-text-primary)' }}>{points}</div>
            </div>

            {/* Pages Understood */}
            <div
              style={{
                padding: '0.9rem 1.1rem',
                borderRadius: 10,
                border: '1px solid var(--nm-border)',
                background: 'color-mix(in srgb, var(--nm-surface) 80%, var(--nm-bg))',
              }}
            >
              <div style={{ fontSize: 11.5, color: 'var(--nm-text-muted)', marginBottom: 4 }}>Pages understood</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--nm-text-primary)' }}>
                {lessonsCompleted}
                <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--nm-text-muted)', marginLeft: 4 }}>
                  / {learnPages.length}
                </span>
              </div>
            </div>

            {/* Problems Solved */}
            <div
              style={{
                padding: '0.9rem 1.1rem',
                borderRadius: 10,
                border: '1px solid var(--nm-border)',
                background: 'color-mix(in srgb, var(--nm-surface) 80%, var(--nm-bg))',
              }}
            >
              <div style={{ fontSize: 11.5, color: 'var(--nm-text-muted)', marginBottom: 4 }}>Problems solved</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--nm-text-primary)' }}>
                {stats.solved}
              </div>
            </div>

            {/* Streak */}
            <div
              style={{
                padding: '0.9rem 1.1rem',
                borderRadius: 10,
                border: '1px solid var(--nm-border)',
                background: 'color-mix(in srgb, var(--nm-surface) 80%, var(--nm-bg))',
              }}
            >
              <div style={{ fontSize: 11.5, color: 'var(--nm-text-muted)', marginBottom: 4 }}>Streak</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--nm-text-primary)' }}>
                {streak} day{streak === 1 ? '' : 's'}
              </div>
              {streak === 0 && (
                <div style={{ fontSize: 11, color: 'var(--nm-text-muted)', marginTop: 2, lineHeight: 1.3 }}>
                  {events.length === 0
                    ? 'Mark a page understood or solve a practice problem to start your streak.'
                    : 'Streak reset — do that again today to start a new one.'}
                </div>
              )}
            </div>

            {/* Badges Earned */}
            <div
              style={{
                padding: '0.9rem 1.1rem',
                borderRadius: 10,
                border: '1px solid var(--nm-border)',
                background: 'color-mix(in srgb, var(--nm-surface) 80%, var(--nm-bg))',
              }}
            >
              <div style={{ fontSize: 11.5, color: 'var(--nm-text-muted)', marginBottom: 4 }}>Badges</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--nm-accent-primary)' }}>
                {unlockedBadgesCount}
                <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--nm-text-muted)', marginLeft: 4 }}>
                  / {BADGES.length}
                </span>
              </div>
            </div>
          </div>
        </section>

        <p style={{ fontSize: 12.5, color: 'var(--nm-text-muted)', margin: '-0.5rem 0 2rem', lineHeight: 1.6 }}>
          The page-by-page checklist and review queue are on{' '}
          <Link to="/progress" style={{ color: 'var(--nm-accent-primary)' }}>Progress</Link>.
        </p>

        {/* --- Badges Showcase --- */}
        <div style={{ marginBottom: '2.5rem' }}>
          <BadgeShowcase />
        </div>

        {/* --- Activity Heatmap --- */}
        <h2 style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--nm-text-muted)', marginBottom: '0.9rem' }}>
          Activity
        </h2>
        <div style={{ padding: '1rem 1.25rem', borderRadius: 12, border: '1px solid var(--nm-border)', background: 'var(--nm-surface)', marginBottom: '2.5rem' }}>
          <ActivityHeatmap events={events} />
        </div>

        {/* --- Topic Breakdown --- */}
        <h2 style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--nm-text-muted)', marginBottom: '0.9rem' }}>
          Where your points came from
        </h2>
        <div style={{ marginBottom: '2.5rem' }}>
          <TopicBreakdownBars events={events} />
        </div>

        {/* --- Leaderboard Standings Snippet --- */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.9rem' }}>
          <h2 style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--nm-text-muted)', margin: 0 }}>
            Leaderboard
          </h2>
          <Link to="/leaderboard" style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--nm-accent-primary)', textDecoration: 'none' }}>
            Open Full Leaderboard & Podium →
          </Link>
        </div>

        <div style={{ borderRadius: 12, border: '1px solid var(--nm-border)', background: 'var(--nm-surface)', marginBottom: '2rem', overflow: 'hidden' }}>
          {(() => {
            let entries = [...leaderboardEntries];
            const currentPts = leaderboardTab === 'allTime' ? points : (leaderboardEntries.find((e) => e.uid === user?.uid)?.points ?? points);
            const userUid = user?.uid ?? 'local-visitor';
            const userInEntries = entries.some((e) => e.uid === userUid || (user && e.displayName === displayName));
            if (!userInEntries && currentPts > 0) {
              entries.push({
                uid: userUid,
                displayName,
                points: currentPts,
              });
              entries.sort((a, b) => b.points - a.points);
            }

            return (
              <>
                <div style={{ display: 'flex', gap: 6, padding: '0.75rem 1.25rem 0' }}>
                  {(['allTime', 'weekly'] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setLeaderboardTab(tab)}
                      style={{
                        fontSize: 12.5,
                        fontWeight: 600,
                        padding: '0.35rem 0.75rem',
                        borderRadius: 8,
                        border: `1px solid ${leaderboardTab === tab ? 'var(--nm-accent-primary)' : 'var(--nm-border)'}`,
                        background: leaderboardTab === tab ? 'color-mix(in srgb, var(--nm-accent-primary) 12%, transparent)' : 'transparent',
                        color: leaderboardTab === tab ? 'var(--nm-accent-primary)' : 'var(--nm-text-secondary)',
                        cursor: 'pointer',
                      }}
                    >
                      {tab === 'allTime' ? 'All-time' : 'This week'}
                    </button>
                  ))}
                </div>
                <div style={{ padding: '0.5rem 0 0.25rem' }}>
                  {leaderboardLoading ? (
                    <p style={{ margin: 0, padding: '0.75rem 1.25rem', fontSize: 13, color: 'var(--nm-text-muted)' }}>Loading…</p>
                  ) : entries.length === 0 ? (
                    <p style={{ margin: 0, padding: '0.75rem 1.25rem', fontSize: 13, color: 'var(--nm-text-muted)' }}>
                      {leaderboardTab === 'allTime' ? 'No points on the board yet -- be the first.' : 'No points this week yet -- be the first.'}
                    </p>
                  ) : (
                    entries.slice(0, 10).map((entry, i) => {
                      const isSelf = entry.uid === userUid || (user && entry.displayName === displayName);
                      return (
                        <div
                          key={entry.uid || i}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            padding: '0.5rem 1.25rem',
                            borderTop: i === 0 ? 'none' : '1px solid var(--nm-border)',
                            background: isSelf ? 'color-mix(in srgb, var(--nm-accent-primary) 8%, transparent)' : 'transparent',
                          }}
                        >
                          <span style={{ width: 20, fontSize: 12.5, fontWeight: 700, color: 'var(--nm-text-muted)', flexShrink: 0 }}>{i + 1}</span>
                          <span style={{ flex: 1, minWidth: 0, fontSize: 13.5, color: isSelf ? 'var(--nm-accent-primary)' : 'var(--nm-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: isSelf ? 700 : 400 }}>
                            {entry.displayName}
                            {isSelf && <span style={{ color: 'var(--nm-accent-primary)', fontSize: 12 }}> (you)</span>}
                          </span>
                          <span style={{ flexShrink: 0, fontSize: 13, fontWeight: 700, color: 'var(--nm-accent-primary)' }}>{entry.points} pts</span>
                        </div>
                      );
                    })
                  )}
                </div>
              </>
            );
          })()}
        </div>
      </main>
    </div>
  );
}
