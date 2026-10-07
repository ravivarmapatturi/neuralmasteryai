import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import Navbar from './layout/Navbar';
import RankBadge from './RankBadge';
import { useAuth } from '../contexts/AuthContext';
import { useGamification } from '../contexts/GamificationContext';
import { useLeaderboard, type LeaderboardEntry } from '../lib/useLeaderboard';
import { levelForPoints } from '../lib/gamification';
import { rankForLevel, RANK_TIERS, type RankTier } from '../lib/rankTiers';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import { useDocumentMeta } from '../lib/useDocumentMeta';

export default function LeaderboardPage() {
  useDocumentTitle('Leaderboard');
  useDocumentMeta(
    'Leaderboard',
    'Global Neural Mastery Leaderboard -- see how your AI engineering points, level, and problem-solving streak stack up against learners worldwide.',
  );

  const { user, loading: authLoading, signInWithGoogle } = useAuth();
  const { points, weeklyPoints, displayName: userDisplayName } = useGamification();
  const [tab, setTab] = useState<'allTime' | 'weekly'>('allTime');
  const [tierFilter, setTierFilter] = useState<string>('all');
  const { entries: remoteEntries, loading } = useLeaderboard(tab, 50);

  const currentPoints = tab === 'allTime' ? points : weeklyPoints;
  const userUid = user?.uid ?? 'local-visitor';

  // Combine remote entries with current user's local entry if not already present
  const allEntries = useMemo(() => {
    const list: LeaderboardEntry[] = [...remoteEntries];
    const userInList = list.some((e) => e.uid === userUid || (user && e.displayName === userDisplayName));

    if (!userInList && currentPoints > 0) {
      list.push({
        uid: userUid,
        displayName: userDisplayName,
        points: currentPoints,
        allTimePoints: points,
      });
      list.sort((a, b) => b.points - a.points);
    }
    return list;
  }, [remoteEntries, userUid, user, userDisplayName, currentPoints, points]);

  const userRankIndex = allEntries.findIndex((e) => e.uid === userUid || (user && e.displayName === userDisplayName));
  const userRank = userRankIndex !== -1 ? userRankIndex + 1 : null;

  // Filter entries by tier if filter is set
  const filteredEntries = useMemo(() => {
    if (tierFilter === 'all') return allEntries;
    return allEntries.filter((entry) => {
      const entryLvl = levelForPoints(entry.allTimePoints ?? entry.points).level;
      const entryTier = rankForLevel(entryLvl);
      return entryTier.id === tierFilter;
    });
  }, [allEntries, tierFilter]);

  // Top 3 Podium entries from all-entries (unfiltered)
  const top3 = allEntries.slice(0, 3);
  const userLevel = levelForPoints(points).level;
  const userTier = rankForLevel(userLevel);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--nm-bg, #090d16)', color: 'var(--nm-text-primary, #f8fafc)' }}>
      <Navbar />

      <main style={{ maxWidth: 1320, margin: '0 auto', padding: '2.5rem 2rem 3rem' }}>
        {/* --- Hero Header --- */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              padding: '4px 14px',
              borderRadius: 20,
              background: 'rgba(99, 102, 241, 0.14)',
              color: '#818cf8',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              marginBottom: 12,
            }}
          >
            🏆 Global Rankings & Progression
          </div>
          <h1 style={{ fontSize: 'clamp(1.9rem, 4.2vw, 2.8rem)', fontWeight: 900, margin: '0 0 10px', letterSpacing: '-0.02em' }}>
            AI Engineering Leaderboard
          </h1>
          <p style={{ fontSize: 15, color: 'var(--nm-text-muted, #94a3b8)', maxWidth: 640, margin: '0 auto 1.75rem', lineHeight: 1.6 }}>
            Track rank standings, ladder tier distribution, and learning velocity against engineers building foundational AI systems.
          </p>

          {/* Timeframe Toggle Tabs (All-Time vs Weekly) */}
          <div
            role="tablist"
            aria-label="Leaderboard timeframe"
            style={{
              display: 'inline-flex',
              background: 'var(--nm-surface)',
              padding: 4,
              borderRadius: 12,
              border: '1px solid var(--nm-border)',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
            }}
          >
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'allTime'}
              onClick={() => setTab('allTime')}
              style={{
                padding: '8px 24px',
                borderRadius: 9,
                fontSize: 13,
                fontWeight: 700,
                border: 'none',
                background: tab === 'allTime' ? 'var(--nm-accent-primary, #6366f1)' : 'transparent',
                color: tab === 'allTime' ? '#fff' : 'var(--nm-text-muted)',
                cursor: 'pointer',
                transition: 'all 0.18s ease',
              }}
            >
              🌐 All-Time
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'weekly'}
              onClick={() => setTab('weekly')}
              style={{
                padding: '8px 24px',
                borderRadius: 9,
                fontSize: 13,
                fontWeight: 700,
                border: 'none',
                background: tab === 'weekly' ? 'var(--nm-accent-primary, #6366f1)' : 'transparent',
                color: tab === 'weekly' ? '#fff' : 'var(--nm-text-muted)',
                cursor: 'pointer',
                transition: 'all 0.18s ease',
              }}
            >
              ⚡ This Week
            </button>
          </div>
        </div>

        {/* --- Guest / Sign-in Banner --- */}
        {/* Gated on !authLoading too: Firebase's auth check is async, and
            without this a returning signed-in visitor sees this exact
            "Sign in with Google" banner flash before the real state
            resolves (audit finding C5). */}
        {!authLoading && !user && (
          <div
            style={{
              padding: '1.25rem 1.5rem',
              borderRadius: 14,
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(168, 85, 247, 0.12) 100%)',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              marginBottom: '2rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <div>
              <h3 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 800 }}>Want your name on the leaderboard?</h3>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--nm-text-muted)' }}>
                Sign in with Google to sync your points across devices and claim your public rank.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void signInWithGoogle()}
              className="nm-button nm-button-primary"
              style={{ padding: '0.45rem 1.1rem', fontSize: 13, fontWeight: 700 }}
            >
              Sign In with Google →
            </button>
          </div>
        )}

        {/* --- Current User Stats Bar --- */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
            gap: 14,
            marginBottom: '2.5rem',
          }}
        >
          {/* Current Rank */}
          <div style={{ padding: '1rem 1.25rem', borderRadius: 12, background: 'var(--nm-surface)', border: '1px solid var(--nm-border)' }}>
            <div style={{ fontSize: 12, color: 'var(--nm-text-muted)', marginBottom: 4 }}>Your Standings</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: userRank ? '#38bdf8' : 'var(--nm-text-muted)' }}>
              {userRank ? `#${userRank}` : 'Unranked'}
            </div>
          </div>

          {/* Points */}
          <div style={{ padding: '1rem 1.25rem', borderRadius: 12, background: 'var(--nm-surface)', border: '1px solid var(--nm-border)' }}>
            <div style={{ fontSize: 12, color: 'var(--nm-text-muted)', marginBottom: 4 }}>
              Your {tab === 'allTime' ? 'Total XP' : 'Weekly XP'}
            </div>
            <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--nm-accent-primary, #818cf8)' }}>
              {currentPoints} <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--nm-text-muted)' }}>pts</span>
            </div>
          </div>

          {/* Level & Ladder Tier */}
          <div style={{ padding: '1rem 1.25rem', borderRadius: 12, background: 'var(--nm-surface)', border: '1px solid var(--nm-border)', display: 'flex', alignItems: 'center', gap: 12 }}>
            <RankBadge tier={userTier} size={42} />
            <div>
              <div style={{ fontSize: 11.5, color: 'var(--nm-text-muted)' }}>Rank Tier & Level</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: userTier.color }}>
                {userTier.label} <span style={{ fontSize: 12, color: 'var(--nm-text-muted)' }}>(Lvl {userLevel})</span>
              </div>
            </div>
          </div>
        </div>

        {/* --- Top 3 Visual Podium --- */}
        {top3.length > 0 && (
          <section aria-label="Top 3 Podium" style={{ marginBottom: '3rem' }}>
            <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
              <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--nm-text-muted)' }}>
                Podium Leaders
              </span>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: top3.length >= 3 ? '1fr 1.12fr 1fr' : 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 16,
                alignItems: 'end',
                maxWidth: 860,
                margin: '0 auto',
              }}
            >
              {/* Rank 2: Silver (Left) */}
              {top3[1] && (
                <PodiumCard
                  entry={top3[1]}
                  rank={2}
                  medal="🥈"
                  color="#cbd5e1"
                  bgGradient="linear-gradient(180deg, rgba(203, 213, 225, 0.12) 0%, var(--nm-surface) 100%)"
                  borderColor="rgba(203, 213, 225, 0.35)"
                  isSelf={top3[1].uid === userUid}
                  height={220}
                />
              )}

              {/* Rank 1: Gold (Center, Taller) */}
              {top3[0] && (
                <PodiumCard
                  entry={top3[0]}
                  rank={1}
                  medal="🥇"
                  color="#fbbf24"
                  bgGradient="linear-gradient(180deg, rgba(251, 191, 36, 0.18) 0%, var(--nm-surface) 100%)"
                  borderColor="rgba(251, 191, 36, 0.5)"
                  isSelf={top3[0].uid === userUid}
                  isFirst
                  height={260}
                />
              )}

              {/* Rank 3: Bronze (Right) */}
              {top3[2] && (
                <PodiumCard
                  entry={top3[2]}
                  rank={3}
                  medal="🥉"
                  color="#f97316"
                  bgGradient="linear-gradient(180deg, rgba(249, 115, 22, 0.12) 0%, var(--nm-surface) 100%)"
                  borderColor="rgba(249, 115, 22, 0.35)"
                  isSelf={top3[2].uid === userUid}
                  height={200}
                />
              )}
            </div>
          </section>
        )}

        {/* --- Standings Table with Tier Segmentation --- */}
        <section
          aria-label="Full Standings"
          style={{
            borderRadius: 16,
            border: '1px solid var(--nm-border)',
            background: 'var(--nm-surface)',
            overflow: 'hidden',
          }}
        >
          {/* Controls Bar: Title + Tier Segmentation Filter */}
          <div
            style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid var(--nm-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12,
              background: 'color-mix(in srgb, var(--nm-surface) 90%, var(--nm-bg))',
            }}
          >
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 800, margin: 0, color: 'var(--nm-text-primary)' }}>
                Standings ({filteredEntries.length})
              </h2>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--nm-text-muted)' }}>
                {tab === 'allTime' ? 'All-time cumulative score' : 'Velocity during current week'}
              </p>
            </div>

            {/* Tier Segmentation Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <label htmlFor="tier-filter" style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--nm-text-muted)' }}>
                Filter Tier:
              </label>
              <select
                id="tier-filter"
                value={tierFilter}
                onChange={(e) => setTierFilter(e.target.value)}
                style={{
                  background: 'var(--nm-bg)',
                  color: 'var(--nm-text-primary)',
                  border: '1px solid var(--nm-border)',
                  borderRadius: 8,
                  padding: '6px 12px',
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <option value="all">All Tiers (10 Ranks)</option>
                {RANK_TIERS.map((tier) => (
                  <option key={tier.id} value={tier.id}>
                    {tier.label}
                  </option>
                ))}
              </select>

              <Link to="/profile" style={{ fontSize: 13, color: 'var(--nm-accent-primary)', textDecoration: 'none', fontWeight: 600, marginLeft: 8 }}>
                Your Profile →
              </Link>
            </div>
          </div>

          {/* Table Body */}
          {loading ? (
            <div style={{ padding: '3.5rem', textAlign: 'center', color: 'var(--nm-text-muted)' }}>
              Loading leaderboard rankings…
            </div>
          ) : filteredEntries.length === 0 ? (
            <div style={{ padding: '3.5rem', textAlign: 'center', color: 'var(--nm-text-muted)' }}>
              {tierFilter !== 'all'
                ? `No learners found in the ${RANK_TIERS.find((t) => t.id === tierFilter)?.label ?? ''} tier yet.`
                : tab === 'allTime'
                  ? 'No points on the leaderboard yet. Solve a practice problem to claim #1!'
                  : 'No points recorded this week yet. Solve a problem to take the top spot!'}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {filteredEntries.map((entry, idx) => {
                const overallRank = allEntries.findIndex((e) => e.uid === entry.uid && e.displayName === entry.displayName) + 1;
                const isSelf = entry.uid === userUid || (user && entry.displayName === userDisplayName);
                const entryLevel = levelForPoints(entry.allTimePoints ?? entry.points).level;
                const entryTier: RankTier = rankForLevel(entryLevel);

                return (
                  <div
                    key={entry.uid || idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 14,
                      padding: '0.9rem 1.5rem',
                      borderBottom: idx === filteredEntries.length - 1 ? 'none' : '1px solid var(--nm-border)',
                      background: isSelf ? 'color-mix(in srgb, var(--nm-accent-primary) 10%, transparent)' : 'transparent',
                      transition: 'background 0.15s ease',
                    }}
                  >
                    {/* Overall Rank Medal / Number */}
                    <div
                      style={{
                        width: 34,
                        textAlign: 'center',
                        fontSize: 14,
                        fontWeight: 900,
                        color: overallRank === 1 ? '#fbbf24' : overallRank === 2 ? '#cbd5e1' : overallRank === 3 ? '#f97316' : 'var(--nm-text-muted)',
                        flexShrink: 0,
                      }}
                    >
                      {overallRank === 1 ? '🥇' : overallRank === 2 ? '🥈' : overallRank === 3 ? '🥉' : `#${overallRank}`}
                    </div>

                    {/* Avatar Initial */}
                    <div
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: '50%',
                        background: isSelf ? 'var(--nm-accent-primary)' : 'color-mix(in srgb, var(--nm-surface) 60%, var(--nm-border))',
                        color: isSelf ? '#fff' : 'var(--nm-text-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 13,
                        fontWeight: 800,
                        flexShrink: 0,
                        border: `1px solid ${isSelf ? 'var(--nm-accent-primary)' : 'var(--nm-border)'}`,
                      }}
                    >
                      {entry.displayName.charAt(0).toUpperCase()}
                    </div>

                    {/* Learner Name + Tier Badge */}
                    <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <span
                        style={{
                          fontWeight: isSelf ? 800 : 600,
                          fontSize: 14,
                          color: isSelf ? 'var(--nm-accent-primary)' : 'var(--nm-text-primary)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {entry.displayName}
                      </span>
                      {isSelf && (
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 800,
                            padding: '1px 6px',
                            borderRadius: 4,
                            background: 'rgba(99, 102, 241, 0.2)',
                            color: '#818cf8',
                            border: '1px solid rgba(99, 102, 241, 0.4)',
                          }}
                        >
                          YOU
                        </span>
                      )}

                      {/* Rank Tier Badge / Pill (Tier Segmentation) */}
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          fontSize: 11,
                          fontWeight: 700,
                          padding: '1px 7px',
                          borderRadius: 12,
                          background: `color-mix(in srgb, ${entryTier.color} 14%, transparent)`,
                          color: entryTier.color,
                          border: `1px solid color-mix(in srgb, ${entryTier.color} 30%, transparent)`,
                        }}
                      >
                        <RankBadge tier={entryTier} size={14} />
                        {entryTier.label}
                      </span>
                    </div>

                    {/* Level */}
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--nm-text-muted)', flexShrink: 0 }}>
                      Lvl {entryLevel}
                    </div>

                    {/* Points */}
                    <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--nm-accent-primary, #818cf8)', flexShrink: 0 }}>
                      {entry.points} <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--nm-text-muted)' }}>pts</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

interface PodiumCardProps {
  entry: LeaderboardEntry;
  rank: number;
  medal: string;
  color: string;
  bgGradient: string;
  borderColor: string;
  isSelf: boolean;
  isFirst?: boolean;
  height: number;
}

function PodiumCard({ entry, rank, medal, color, bgGradient, borderColor, isSelf, isFirst, height }: PodiumCardProps) {
  const entryLevel = levelForPoints(entry.allTimePoints ?? entry.points).level;
  const entryTier = rankForLevel(entryLevel);

  return (
    <div
      style={{
        minHeight: height,
        padding: isFirst ? '1.75rem 1.25rem 1.5rem' : '1.25rem 1rem',
        borderRadius: 16,
        background: bgGradient,
        border: `1.5px solid ${borderColor}`,
        textAlign: 'center',
        boxShadow: isFirst ? '0 12px 36px rgba(251, 191, 36, 0.16)' : '0 6px 20px rgba(0, 0, 0, 0.25)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}
    >
      {/* Medal Icon on Pedestal */}
      <div style={{ fontSize: isFirst ? 34 : 26, marginBottom: 4, lineHeight: 1 }}>{medal}</div>
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color, marginBottom: 8 }}>
        Rank #{rank}
      </div>

      {/* Avatar Initial with Rank Badge Halo */}
      <div style={{ position: 'relative', marginBottom: 8 }}>
        <div
          style={{
            width: isFirst ? 54 : 44,
            height: isFirst ? 54 : 44,
            borderRadius: '50%',
            background: color,
            color: '#090d16',
            fontWeight: 900,
            fontSize: isFirst ? 20 : 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `0 0 16px ${color}40`,
          }}
        >
          {entry.displayName.charAt(0).toUpperCase()}
        </div>
        <div style={{ position: 'absolute', bottom: -4, right: -4 }}>
          <RankBadge tier={entryTier} size={isFirst ? 22 : 18} />
        </div>
      </div>

      {/* Name */}
      <div
        style={{
          fontWeight: 800,
          fontSize: isFirst ? 15 : 13.5,
          color: 'var(--nm-text-primary)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          maxWidth: '100%',
        }}
      >
        {entry.displayName} {isSelf && '(You)'}
      </div>

      {/* Tier Label Pill */}
      <div
        style={{
          fontSize: 10.5,
          fontWeight: 700,
          padding: '2px 8px',
          borderRadius: 10,
          background: `color-mix(in srgb, ${entryTier.color} 18%, transparent)`,
          color: entryTier.color,
          border: `1px solid color-mix(in srgb, ${entryTier.color} 35%, transparent)`,
          marginTop: 6,
          marginBottom: 6,
        }}
      >
        {entryTier.label} · Lvl {entryLevel}
      </div>

      {/* Points */}
      <div style={{ fontSize: isFirst ? 18 : 15, fontWeight: 900, color }}>
        {entry.points} <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--nm-text-muted)' }}>pts</span>
      </div>
    </div>
  );
}
