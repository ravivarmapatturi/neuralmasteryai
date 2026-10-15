import practiceSlugs from '../data/practiceSlugs.generated.json';
import { SECTION_META, SECTION_ORDER, getGroupForSubsection } from '../data/sectionMeta';

// Pure, React-free gamification logic -- points, streaks, and weekly totals
// are all DERIVED from a real per-award event log, never independently
// incremented/decremented counters. That's a deliberate correctness
// choice, not just style: an independently-mutated "points" number or
// "current streak" counter can desync from real activity (double-award on
// a retry, drift after a merge across two devices) in ways that are hard
// to notice and harder to fix after the fact. A pure function of "what
// award events actually happened" can't drift -- recomputing it from
// scratch always gives the same, correct answer, and merging two devices'
// histories is a plain, safe set union (see mergeEvents) instead of a
// bespoke reconciliation for a mutable counter.

export type AwardKind = 'mark' | 'complete' | 'design' | 'flashcard' | 'signin' | 'review' | 'depth' | 'architecture';

export interface AwardEvent {
  permalink: string;
  kind: AwardKind;
  /** Local calendar date (YYYY-MM-DD) the award happened on -- used for
   * both the weekly-points window and the streak, and stored (not
   * recomputed from a raw timestamp) so a later change to how "today" is
   * computed can never rewrite history. */
  date: string;
  /** Points value at award time, stored (not looked up from the current
   * constants below) so a future point-value tuning never retroactively
   * changes a user's already-earned history. */
  points: number;
  /** Whether hints were viewed prior to solving. If false, user solved independently (gold tier).
   * If true or undefined (legacy awards), treated as bronze tier. */
  hintUsed?: boolean;
}

export const MARK_UNDERSTOOD_POINTS = 10;
// Real, per-problem difficulty is now a structured frontmatter field (see
// contentTree.ts's DocPage.difficulty), not just prose -- these scale a
// solved problem's award by how hard it actually was, instead of every
// problem (a 5-line easy warmup or a real GQA/RoPE implementation) paying
// out the same flat value. `easy`/`hard` deliberately widen away from
// PROBLEM_COMPLETED_POINTS_DEFAULT (the old flat value) rather than
// splitting the difference narrowly, so the scaling is a real signal, not
// a token gesture. Kept as three named constants (not a formula) so the
// exact values stay easy to see and tune without touching call sites.
export const PROBLEM_COMPLETED_POINTS_EASY = 25;
export const PROBLEM_COMPLETED_POINTS_MEDIUM = 50;
export const PROBLEM_COMPLETED_POINTS_HARD = 100;
// Fallback for the handful of problems with no difficulty frontmatter at
// all (there shouldn't be any among real practice problems -- this exists
// so an award never silently computes NaN/undefined points if one is ever
// missing) -- same value as the medium tier, a reasonable, non-punitive default.
export const PROBLEM_COMPLETED_POINTS_DEFAULT = PROBLEM_COMPLETED_POINTS_MEDIUM;

/** Real difficulty-scaled point value for completing a practice problem.
 * Not used for system-design challenges -- those keep their own separate,
 * larger flat value (SYSTEM_DESIGN_CHALLENGE_POINTS below), since their
 * frontmatter deliberately has no difficulty field at all (see
 * meta_descriptions/Phase 2 frontmatter tagging -- a design challenge
 * isn't easy/medium/hard the way a coding problem is). */
export function pointsForDifficulty(difficulty: string | undefined): number {
  if (difficulty === 'easy') return PROBLEM_COMPLETED_POINTS_EASY;
  if (difficulty === 'hard') return PROBLEM_COMPLETED_POINTS_HARD;
  if (difficulty === 'medium') return PROBLEM_COMPLETED_POINTS_MEDIUM;
  return PROBLEM_COMPLETED_POINTS_DEFAULT;
}

// The biggest award in the system, deliberately -- a system-design
// challenge (write a real end-to-end design for a real problem, then
// self-assess against a rubric + the site's own real case-study
// walkthrough) is the deepest engagement this site can currently measure,
// genuinely more than a single practice problem's narrower scope.
export const SYSTEM_DESIGN_CHALLENGE_POINTS = 100;

/** Real difficulty-scaled point value for correctly wiring a production agent architecture.
 * Matches medium difficulty practice reward, awarded via 'architecture' kind. */
export const ARCHITECTURE_COMPLETED_POINTS = 50;

/** Tiny, first-reveal-only award for the homepage's "Test yourself"
 * interview-question flashcards (see Home.tsx) -- deliberately much
 * smaller than a real solved practice problem, since revealing an answer
 * is a much lighter action than writing and passing real code. */
export const FLASHCARD_REVEAL_POINTS = 1;

/** A small, once-per-real-calendar-day reward just for showing up
 * signed in -- a real, well-known retention mechanic (see
 * GamificationContext's awardDailySignIn). Deliberately modest: this
 * complements the streak mechanic (computeStreak below), it doesn't
 * compete with or replace it -- a learner who does real work every day
 * still earns far more from marking pages/solving problems than from
 * this alone. Gating uses the SAME `hasAward` de-dupe every other award
 * kind already relies on (see awardDailySignIn's synthetic
 * `signin:<date>` permalink), not a second, parallel date-boundary
 * implementation. */
export const DAILY_SIGNIN_POINTS = 15;

/** Real reward-gap audit finding: completing a scheduled spaced-repetition
 * review (ProgressContext's markReviewed) previously earned nothing, even
 * though it's a genuine, real learning action -- and unlike most awards,
 * it's naturally time-gated already (a page only becomes due again after
 * its real interval elapses, see REVIEW_INTERVALS_DAYS), so there's no
 * risk of spamming this for free points. Awarded per real stage
 * transition (see awardReviewCompleted's synthetic `review:<permalink>:
 * <stage>` permalink), so a page's full review lifecycle (up to
 * REVIEW_INTERVALS_DAYS.length transitions) can earn this multiple real
 * times, never more than once per actual transition. */
export const REVIEW_COMPLETED_POINTS = 10;

/** Real reward-gap audit finding: expanding an ELI5/Deep-Dive block
 * (ExpandableDepth.tsx) is a genuine extra-effort action (a reader
 * choosing to go deeper on a concept) that previously earned nothing.
 * Kept at the same modest scale as FLASHCARD_REVEAL_POINTS (one click,
 * no recall effort -- an even lighter action than revealing a flashcard
 * answer) rather than a real practice/mark award's scale.
 * First-expansion-only per block, same no-double-award contract as every
 * other award kind. */
export const DEPTH_REVEAL_POINTS = 2;

/** Local (not UTC) calendar date as YYYY-MM-DD -- deliberately built from
 * Date's local getters, not toISOString() (which is UTC-based and would
 * flip to the next day for anyone west of UTC in their own evening) or a
 * locale-string parse (fragile/locale-dependent format). This is what
 * makes the streak reset at the user's real local midnight, not UTC
 * midnight. */
export function localDateString(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function hasAward(events: AwardEvent[], permalink: string, kind: AwardKind): boolean {
  return events.some((e) => e.permalink === permalink && e.kind === kind);
}

export function getProblemAward(events: AwardEvent[], permalink: string): AwardEvent | undefined {
  return events.find((e) => e.permalink === permalink && (e.kind === 'complete' || e.kind === 'design'));
}

export function getArchitectureAward(events: AwardEvent[], permalink: string): AwardEvent | undefined {
  return events.find((e) => e.permalink === permalink && e.kind === 'architecture');
}

export type MasteryTier = 'gold' | 'bronze';

/** Determines whether a solved problem was achieved independently (gold) or with hints (bronze) */
export function getMasteryTier(award: AwardEvent | undefined): MasteryTier | null {
  if (!award) return null;
  // hintUsed explicitly false means solved independently
  if (award.hintUsed === false) return 'gold';
  // hintUsed true or undefined (legacy award) defaults consistently to bronze
  return 'bronze';
}

export function totalPoints(events: AwardEvent[]): number {
  return events.reduce((sum, e) => sum + e.points, 0);
}

/** Monday-anchored start of the local week containing `d`. Real, stated
 * limitation: this is each user's OWN local week, not one globally
 * synchronized boundary -- two users in different timezones have their
 * "this week" reset at different real moments. For a genuinely-minimal
 * weekly leaderboard that's an acceptable simplification (same category
 * of honest tradeoff as the WebGPU practice problem's single-workgroup
 * scoping), not something hidden. */
export function weekStartDateString(d: Date = new Date()): string {
  const day = d.getDay(); // 0=Sun .. 6=Sat
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMonday);
  return localDateString(monday);
}

/** Sum of points from events dated within the current local week --
 * string comparison against weekStart is valid chronological comparison
 * here specifically because every date is the same YYYY-MM-DD format. */
export function weeklyPoints(events: AwardEvent[], today: Date = new Date()): number {
  const start = weekStartDateString(today);
  return events.filter((e) => e.date >= start).reduce((sum, e) => sum + e.points, 0);
}

/** Consecutive-day streak ending today, counted backward from the most
 * recent active date. If today has no award yet, counts from yesterday
 * instead -- a streak that hasn't actually been broken yet (the user just
 * hasn't acted today) shouldn't show as 0, the same "still alive until
 * midnight" convention every real streak product uses. Purely a function
 * of which LOCAL dates have at least one award -- see the module comment
 * for why this is derived rather than an incremented/reset counter. */
export function computeStreak(activeDates: string[], today: Date = new Date()): number {
  const set = new Set(activeDates);
  const todayStr = localDateString(today);
  const cursor = new Date(today);
  if (!set.has(todayStr)) {
    cursor.setDate(cursor.getDate() - 1);
  }
  let streak = 0;
  while (set.has(localDateString(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/** Union of two devices' event logs, deduped by permalink+kind (the same
 * award can never legitimately happen twice, so the first copy found is
 * kept and the rest are dropped) -- never a raw concatenation, which
 * would double-count points for any page marked/completed on both
 * devices before they ever synced. */
export function mergeEvents(a: AwardEvent[], b: AwardEvent[]): AwardEvent[] {
  const merged = [...a];
  for (const e of b) {
    if (!hasAward(merged, e.permalink, e.kind)) merged.push(e);
  }
  return merged;
}

/** The one place a future leaderboard-identity decision (real name vs.
 * an anonymized handle) gets swapped in -- everything else reads a
 * display name through this function, never `user.displayName` directly. */
export function computeDisplayName(
  user: { displayName?: string | null; email?: string | null; uid?: string } | null | undefined,
): string {
  if (user?.displayName) return user.displayName;
  if (user?.email) {
    const handle = user.email.split('@')[0];
    if (handle) return handle;
  }
  if (user?.uid) return `Learner_${user.uid.slice(0, 6)}`;
  return 'Guest Learner';
}

// --- Level curve ---
//
// A real, stated design choice, not hidden magic: total XP required to
// REACH level N is 50 * (N-1)^2 -- level 1 starts at 0, level 2 at 50,
// level 3 at 200, level 4 at 450, level 5 at 800, and so on. The XP
// needed for the NEXT level grows by a constant 100 each time (50, 150,
// 250, 350, ...), a gentle quadratic curve: early levels come fast (50
// points is one practice problem, or five marked-understood pages), and
// the climb lengthens gradually rather than exploding, so a genuinely
// active user keeps leveling up over weeks/months instead of hitting a
// wall after level 5.

/** Total points needed to REACH a given level (level 1 = 0). */
export function totalXpForLevel(level: number): number {
  return 50 * (level - 1) ** 2;
}

export interface LevelInfo {
  level: number;
  /** Points earned since this level started. */
  xpIntoLevel: number;
  /** Total points this level requires (xpIntoLevel / xpForNextLevel is
   * the real fraction to render as a progress bar). */
  xpForNextLevel: number;
}

export function levelForPoints(points: number): LevelInfo {
  const level = Math.floor(1 + Math.sqrt(points / 50));
  const xpAtLevelStart = totalXpForLevel(level);
  const xpAtNextLevel = totalXpForLevel(level + 1);
  return {
    level,
    xpIntoLevel: points - xpAtLevelStart,
    xpForNextLevel: xpAtNextLevel - xpAtLevelStart,
  };
}

// --- Topic breakdown ---

/** Extracts the top-level content folder from a permalink, e.g.
 * "/docs/deep-learning/attention-transformers" -> "deep-learning". A
 * "/practice/<slug>" permalink (practice problems live at their own
 * top-level route, not nested under /docs/ -- see the Learn/Practice IA
 * split) maps to the fixed "practice-problems" dir directly, so points
 * earned there keep bucketing into a real SECTION_META group (Research &
 * Build) instead of silently disappearing from topicBreakdown(). Null for
 * anything else that doesn't match either shape. */
function sectionDirFromPermalink(permalink: string): string | null {
  if (permalink.startsWith('/practice/')) return 'practice-problems';
  const match = permalink.match(/^\/docs\/([^/]+)\//);
  return match ? match[1] : null;
}

// --- Practice-problem permalink migration ---
//
// Practice problems used to render at /docs/practice-problems/<slug>;
// they now render at /practice/<slug> (see the Learn/Practice IA split in
// contentTree.ts). A NEW completion naturally gets the new-style permalink
// for free (it's just wherever the browser's URL actually is when
// RunnableCode/SystemDesignChallenge award it) -- but an award recorded
// under the OLD URL before this migration, sitting in someone's
// localStorage or Firestore doc, would otherwise look "not yet earned"
// under the new permalink and let the same problem be re-awarded,
// double-counting points for a real returning user. Rewriting old-style
// permalinks to their new-style equivalent wherever an event log is READ
// (see GamificationContext) is what prevents that -- the same
// derived-never-mutated correctness property the rest of this file relies
// on (see the module comment) extends naturally to a URL migration too.
const OLD_PRACTICE_PROBLEMS_PREFIX = '/docs/practice-problems/';

// Second migration (2026-10): curated problems moved from file-id URLs
// ("/practice/dl-nn-prob-1") to descriptive ones ("/practice/dense-layer-
// forward-pass"). Same fix, same place: rewrite on read so an old award
// still counts and can't be earned twice.
const PRACTICE_SLUGS = practiceSlugs as Record<string, string>;

export function normalizePracticeProblemPermalink(permalink: string): string {
  let route = permalink;
  if (route.startsWith(OLD_PRACTICE_PROBLEMS_PREFIX)) {
    const slug = route.slice(OLD_PRACTICE_PROBLEMS_PREFIX.length);
    route = slug === 'overview' ? '/practice' : `/practice/${slug}`;
  }
  if (route.startsWith('/practice/')) {
    const id = route.slice('/practice/'.length).replace(/\/$/, '');
    if (PRACTICE_SLUGS[id]) return `/practice/${PRACTICE_SLUGS[id]}`;
  }
  return route;
}

export interface TopicBreakdownEntry {
  groupKey: string;
  label: string;
  color: string;
  icon: string;
  points: number;
  /** 0..1 fraction of this user's total points. */
  pct: number;
}

/** Real per-topic breakdown of WHERE a user's points came from -- reuses
 * the exact same "which top-level group does this page belong to" match
 * sectionMeta.ts's own completionFor() uses (subsection dir -> parent
 * group), so this view and the progress dashboard's own per-group
 * percentages can never disagree about which group a page counts toward.
 * Sorted by points descending; a group with zero points is omitted
 * entirely (nothing real to show), and the result is empty for a user
 * with no points yet, not a list of zeros. */
export function topicBreakdown(events: AwardEvent[]): TopicBreakdownEntry[] {
  const total = totalPoints(events);
  if (total === 0) return [];

  const byGroup = new Map<string, number>();
  for (const e of events) {
    const dir = sectionDirFromPermalink(e.permalink);
    if (!dir) continue;
    const group = getGroupForSubsection(dir);
    if (!group) continue;
    byGroup.set(group.key, (byGroup.get(group.key) ?? 0) + e.points);
  }

  return SECTION_ORDER.filter((key) => byGroup.has(key))
    .map((key) => {
      const meta = SECTION_META[key];
      const points = byGroup.get(key)!;
      return { groupKey: key, label: meta.label, color: meta.color, icon: meta.icon, points, pct: points / total };
    })
    .sort((a, b) => b.points - a.points);
}

// --- Activity heatmap ---

/** Count of award events per LOCAL calendar date -- the raw data a
 * GitHub-style contribution calendar renders from. Deliberately counts
 * EVENTS, not points, matching the convention every real contribution
 * calendar uses (activity frequency that day, not a weighted value) --
 * the calendar-GRID layout (which weeks/days to show) is a rendering
 * concern, left to the component that reads this map. */
export function activityCounts(events: AwardEvent[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const e of events) {
    counts[e.date] = (counts[e.date] ?? 0) + 1;
  }
  return counts;
}

// --- RL Discounted Return Valuation Model ---

export interface RLValuation {
  /** Immediate reward R_{t+1} for the current action (XP) */
  immediateReward: number;
  /** Estimated long-term value V(s') of milestone progress */
  futureValue: number;
  /** Discount factor gamma (0.85) */
  gamma: number;
  /** Total discounted return G_t = R_immediate + gamma * V_future */
  discountedReturn: number;
  /** Streak bonus multiplier (1.0 + 0.1 * min(streak, 7)) */
  streakBonus: number;
}

/** Computes RL Discounted Return G_t = R_t + gamma * V(s_{t+1}) for human reward weighting */
export function computeRLValuation(
  actionKind: AwardKind,
  difficulty: string | undefined,
  currentEvents: AwardEvent[],
  activeDates: string[],
  today: Date = new Date(),
): RLValuation {
  let immediateReward = MARK_UNDERSTOOD_POINTS;
  if (actionKind === 'complete') immediateReward = pointsForDifficulty(difficulty);
  else if (actionKind === 'design') immediateReward = SYSTEM_DESIGN_CHALLENGE_POINTS;
  else if (actionKind === 'architecture') immediateReward = ARCHITECTURE_COMPLETED_POINTS;
  else if (actionKind === 'flashcard') immediateReward = FLASHCARD_REVEAL_POINTS;

  const streak = computeStreak(activeDates, today);
  const streakBonus = 1.0 + 0.1 * Math.min(streak, 7);

  const points = totalPoints(currentEvents);
  const lvlInfo = levelForPoints(points);
  
  const levelProgressPct = lvlInfo.xpForNextLevel > 0 ? lvlInfo.xpIntoLevel / lvlInfo.xpForNextLevel : 0;
  const estimatedNextLevelReward = 100;
  
  const futureValue = (1 - levelProgressPct) * estimatedNextLevelReward * streakBonus;
  const gamma = 0.85;
  const discountedReturn = immediateReward + gamma * futureValue;

  return {
    immediateReward,
    futureValue: Math.round(futureValue * 10) / 10,
    gamma,
    discountedReturn: Math.round(discountedReturn * 10) / 10,
    streakBonus: Math.round(streakBonus * 100) / 100,
  };
}

