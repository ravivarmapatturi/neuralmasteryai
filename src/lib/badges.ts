import type { DocPage } from './contentTree';
import type { AwardEvent } from './gamification';
import { isSolved } from './mastery';

export type BadgeCategory = 'learning' | 'practice' | 'difficulty' | 'consistency' | 'mastery';
export type BadgeRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic';

export interface RarityConfig {
  label: string;
  color: string;
  bgTint: string;
  borderColor: string;
  glowColor?: string;
}

export const RARITY_CONFIGS: Record<BadgeRarity, RarityConfig> = {
  common: {
    label: 'Common',
    color: '#94A3B8',
    bgTint: 'rgba(148, 163, 184, 0.08)',
    borderColor: 'rgba(148, 163, 184, 0.3)',
  },
  uncommon: {
    label: 'Uncommon',
    color: '#10B981',
    bgTint: 'rgba(16, 185, 129, 0.08)',
    borderColor: 'rgba(16, 185, 129, 0.35)',
    glowColor: 'rgba(16, 185, 129, 0.25)',
  },
  rare: {
    label: 'Rare',
    color: '#38BDF8',
    bgTint: 'rgba(56, 189, 248, 0.08)',
    borderColor: 'rgba(56, 189, 248, 0.4)',
    glowColor: 'rgba(56, 189, 248, 0.3)',
  },
  epic: {
    label: 'Epic',
    color: '#A855F7',
    bgTint: 'rgba(168, 85, 247, 0.08)',
    borderColor: 'rgba(168, 85, 247, 0.45)',
    glowColor: 'rgba(168, 85, 247, 0.4)',
  },
  legendary: {
    label: 'Legendary',
    color: '#F59E0B',
    bgTint: 'rgba(245, 158, 11, 0.1)',
    borderColor: 'rgba(245, 158, 11, 0.55)',
    glowColor: 'rgba(245, 158, 11, 0.45)',
  },
  mythic: {
    label: 'Mythic',
    color: '#F43F5E',
    bgTint: 'rgba(244, 63, 94, 0.12)',
    borderColor: 'rgba(244, 63, 94, 0.65)',
    glowColor: 'rgba(244, 63, 94, 0.55)',
  },
};

export interface BadgeStats {
  totalXP: number;
  streak: number;
  pagesUnderstood: number;
  problemsSolved: number;
  systemDesignSolved: number;
  isSignedIn: boolean;
  easySolved?: number;
  mediumSolved?: number;
  hardSolved?: number;
  independentSolves?: number;
  reviewsCompleted?: number;
  depthRevealed?: number;
  dailySignIns?: number;
}

export interface BadgeProgress {
  current: number;
  target: number;
  unit: string;
}

export interface Badge {
  id: string;
  title: string;
  icon: string;
  description: string;
  category: BadgeCategory;
  rarity: BadgeRarity;
  requirementText: string;
  checkUnlocked: (stats: BadgeStats) => boolean;
  getProgress: (stats: BadgeStats) => BadgeProgress;
}

export const BADGES: Badge[] = [
  // --- Learning category ---
  {
    id: 'first-step',
    title: 'Curious Mind',
    icon: '🌱',
    description: 'Began your journey by marking your first curriculum lesson understood.',
    category: 'learning',
    rarity: 'common',
    requirementText: 'Mark 1 lesson understood',
    checkUnlocked: (s) => s.pagesUnderstood >= 1 || s.totalXP > 0,
    getProgress: (s) => ({ current: Math.min(s.pagesUnderstood > 0 ? s.pagesUnderstood : (s.totalXP > 0 ? 1 : 0), 1), target: 1, unit: 'lesson' }),
  },
  {
    id: 'deep-reader',
    title: 'Deep Reader',
    icon: '📚',
    description: 'Marked 10 core lesson pages as thoroughly understood.',
    category: 'learning',
    rarity: 'uncommon',
    requirementText: 'Mark 10 lessons understood',
    checkUnlocked: (s) => s.pagesUnderstood >= 10,
    getProgress: (s) => ({ current: Math.min(s.pagesUnderstood, 10), target: 10, unit: 'lessons' }),
  },
  {
    id: 'scholar',
    title: 'Neural Scholar',
    icon: '🎓',
    description: 'Marked 50 curriculum lessons understood across modern AI.',
    category: 'learning',
    rarity: 'rare',
    requirementText: 'Mark 50 lessons understood',
    checkUnlocked: (s) => s.pagesUnderstood >= 50,
    getProgress: (s) => ({ current: Math.min(s.pagesUnderstood, 50), target: 50, unit: 'lessons' }),
  },
  {
    id: 'polymath',
    title: 'AI Polymath',
    icon: '🏛️',
    description: 'Marked 150 lessons understood covering foundations, models, and systems.',
    category: 'learning',
    rarity: 'epic',
    requirementText: 'Mark 150 lessons understood',
    checkUnlocked: (s) => s.pagesUnderstood >= 150,
    getProgress: (s) => ({ current: Math.min(s.pagesUnderstood, 150), target: 150, unit: 'lessons' }),
  },
  {
    id: 'deep-diver',
    title: 'Deep Explorer',
    icon: '🔍',
    description: 'Expanded 5 deep-dive concept breakdowns to master theoretical nuances.',
    category: 'learning',
    rarity: 'uncommon',
    requirementText: 'Expand 5 deep-dive blocks',
    checkUnlocked: (s) => (s.depthRevealed ?? 0) >= 5,
    getProgress: (s) => ({ current: Math.min(s.depthRevealed ?? 0, 5), target: 5, unit: 'deep-dives' }),
  },
  {
    id: 'spaced-memory',
    title: 'Active Recall',
    icon: '🔄',
    description: 'Completed 5 scheduled spaced-repetition reviews.',
    category: 'learning',
    rarity: 'rare',
    requirementText: 'Complete 5 reviews',
    checkUnlocked: (s) => (s.reviewsCompleted ?? 0) >= 5,
    getProgress: (s) => ({ current: Math.min(s.reviewsCompleted ?? 0, 5), target: 5, unit: 'reviews' }),
  },

  // --- Practice category ---
  {
    id: 'first-code',
    title: 'First Code',
    icon: '💻',
    description: 'Successfully solved your first hands-on practice problem.',
    category: 'practice',
    rarity: 'common',
    requirementText: 'Solve 1 practice problem',
    checkUnlocked: (s) => s.problemsSolved >= 1,
    getProgress: (s) => ({ current: Math.min(s.problemsSolved, 1), target: 1, unit: 'problem' }),
  },
  {
    id: 'problem-solver',
    title: 'Code Ninja',
    icon: '⚡',
    description: 'Successfully implemented 5 hands-on practice problems from scratch.',
    category: 'practice',
    rarity: 'uncommon',
    requirementText: 'Solve 5 practice problems',
    checkUnlocked: (s) => s.problemsSolved >= 5,
    getProgress: (s) => ({ current: Math.min(s.problemsSolved, 5), target: 5, unit: 'problems' }),
  },
  {
    id: 'problem-veteran',
    title: 'Algorithmic Builder',
    icon: '🛠️',
    description: 'Solved 25 interactive practice problems.',
    category: 'practice',
    rarity: 'rare',
    requirementText: 'Solve 25 practice problems',
    checkUnlocked: (s) => s.problemsSolved >= 25,
    getProgress: (s) => ({ current: Math.min(s.problemsSolved, 25), target: 25, unit: 'problems' }),
  },
  {
    id: 'century-solver',
    title: 'Century Solver',
    icon: '💯',
    description: 'Solved 100 hands-on practice problems across core AI architectures.',
    category: 'practice',
    rarity: 'epic',
    requirementText: 'Solve 100 practice problems',
    checkUnlocked: (s) => s.problemsSolved >= 100,
    getProgress: (s) => ({ current: Math.min(s.problemsSolved, 100), target: 100, unit: 'problems' }),
  },
  {
    id: 'legend-solver',
    title: 'Legendary Implementer',
    icon: '👑',
    description: 'Solved 250 problems spanning LLMs, classical ML, and agent systems.',
    category: 'practice',
    rarity: 'legendary',
    requirementText: 'Solve 250 practice problems',
    checkUnlocked: (s) => s.problemsSolved >= 250,
    getProgress: (s) => ({ current: Math.min(s.problemsSolved, 250), target: 250, unit: 'problems' }),
  },
  {
    id: 'system-architect',
    title: 'System Architect',
    icon: '🏗️',
    description: 'Completed a full end-to-end ML system design challenge.',
    category: 'practice',
    rarity: 'rare',
    requirementText: 'Complete 1 system design challenge',
    checkUnlocked: (s) => s.systemDesignSolved >= 1,
    getProgress: (s) => ({ current: Math.min(s.systemDesignSolved, 1), target: 1, unit: 'challenge' }),
  },
  {
    id: 'principal-architect',
    title: 'Principal Architect',
    icon: '🏢',
    description: 'Completed 5 production-scale ML system design challenges.',
    category: 'practice',
    rarity: 'epic',
    requirementText: 'Complete 5 system design challenges',
    checkUnlocked: (s) => s.systemDesignSolved >= 5,
    getProgress: (s) => ({ current: Math.min(s.systemDesignSolved, 5), target: 5, unit: 'challenges' }),
  },

  // --- Difficulty category ---
  {
    id: 'clean-coder',
    title: 'Independent Thinker',
    icon: '💡',
    description: 'Solved 5 practice problems completely independently without opening hints.',
    category: 'difficulty',
    rarity: 'uncommon',
    requirementText: 'Solve 5 problems with zero hints',
    checkUnlocked: (s) => (s.independentSolves ?? 0) >= 5,
    getProgress: (s) => ({ current: Math.min(s.independentSolves ?? 0, 5), target: 5, unit: 'hint-free' }),
  },
  {
    id: 'iron-mind',
    title: 'Zero Hint Master',
    icon: '🛡️',
    description: 'Solved 20 practice problems with zero hints used.',
    category: 'difficulty',
    rarity: 'rare',
    requirementText: 'Solve 20 problems with zero hints',
    checkUnlocked: (s) => (s.independentSolves ?? 0) >= 20,
    getProgress: (s) => ({ current: Math.min(s.independentSolves ?? 0, 20), target: 20, unit: 'hint-free' }),
  },
  {
    id: 'hard-first',
    title: 'Hard Problem Conqueror',
    icon: '⚔️',
    description: 'Solved your first Hard-difficulty algorithmic or architecture challenge.',
    category: 'difficulty',
    rarity: 'rare',
    requirementText: 'Solve 1 Hard problem',
    checkUnlocked: (s) => (s.hardSolved ?? 0) >= 1,
    getProgress: (s) => ({ current: Math.min(s.hardSolved ?? 0, 1), target: 1, unit: 'hard problem' }),
  },
  {
    id: 'hard-ten',
    title: 'Titan of Complexity',
    icon: '🌋',
    description: 'Solved 10 Hard-difficulty challenges from scratch.',
    category: 'difficulty',
    rarity: 'epic',
    requirementText: 'Solve 10 Hard problems',
    checkUnlocked: (s) => (s.hardSolved ?? 0) >= 10,
    getProgress: (s) => ({ current: Math.min(s.hardSolved ?? 0, 10), target: 10, unit: 'hard problems' }),
  },
  {
    id: 'hard-thirty',
    title: 'Grand Complexity Master',
    icon: '🌌',
    description: 'Solved 30 Hard-difficulty challenges across transformers, kernels, and distributed AI.',
    category: 'difficulty',
    rarity: 'legendary',
    requirementText: 'Solve 30 Hard problems',
    checkUnlocked: (s) => (s.hardSolved ?? 0) >= 30,
    getProgress: (s) => ({ current: Math.min(s.hardSolved ?? 0, 30), target: 30, unit: 'hard problems' }),
  },

  // --- Consistency category ---
  {
    id: 'streak-3',
    title: '3-Day Spark',
    icon: '🔥',
    description: 'Maintained a consistent learning streak for 3 consecutive days.',
    category: 'consistency',
    rarity: 'common',
    requirementText: '3-day active streak',
    checkUnlocked: (s) => s.streak >= 3,
    getProgress: (s) => ({ current: Math.min(s.streak, 3), target: 3, unit: 'days' }),
  },
  {
    id: 'streak-7',
    title: '7-Day Titan',
    icon: '⚡',
    description: 'Demonstrated dedication with a full 7-day learning streak.',
    category: 'consistency',
    rarity: 'uncommon',
    requirementText: '7-day active streak',
    checkUnlocked: (s) => s.streak >= 7,
    getProgress: (s) => ({ current: Math.min(s.streak, 7), target: 7, unit: 'days' }),
  },
  {
    id: 'streak-14',
    title: 'Fortnight Flame',
    icon: '🌟',
    description: 'Maintained a continuous daily learning streak for 14 straight days.',
    category: 'consistency',
    rarity: 'rare',
    requirementText: '14-day active streak',
    checkUnlocked: (s) => s.streak >= 14,
    getProgress: (s) => ({ current: Math.min(s.streak, 14), target: 14, unit: 'days' }),
  },
  {
    id: 'streak-30',
    title: 'Monthly Marathon',
    icon: '🏆',
    description: 'Achieved an unbroken 30-day streak of daily AI practice.',
    category: 'consistency',
    rarity: 'epic',
    requirementText: '30-day active streak',
    checkUnlocked: (s) => s.streak >= 30,
    getProgress: (s) => ({ current: Math.min(s.streak, 30), target: 30, unit: 'days' }),
  },
  {
    id: 'streak-100',
    title: 'Centurion of Focus',
    icon: '✨',
    description: 'Demonstrated world-class consistency with a 100-day unbroken streak.',
    category: 'consistency',
    rarity: 'mythic',
    requirementText: '100-day active streak',
    checkUnlocked: (s) => s.streak >= 100,
    getProgress: (s) => ({ current: Math.min(s.streak, 100), target: 100, unit: 'days' }),
  },
  {
    id: 'welcome',
    title: 'Welcome Aboard',
    icon: '👋',
    description: 'Signed in for the first time and synced your progress across devices.',
    category: 'consistency',
    rarity: 'common',
    requirementText: 'Sign in with an account',
    checkUnlocked: (s) => s.isSignedIn,
    getProgress: (s) => ({ current: s.isSignedIn ? 1 : 0, target: 1, unit: 'sign-in' }),
  },

  // --- Mastery category ---
  {
    id: 'xp-novice',
    title: 'Neural Novice',
    icon: '🧠',
    description: 'Built core foundations across deep learning concepts.',
    category: 'mastery',
    rarity: 'common',
    requirementText: 'Reach 100 total XP',
    checkUnlocked: (s) => s.totalXP >= 100,
    getProgress: (s) => ({ current: Math.min(s.totalXP, 100), target: 100, unit: 'XP' }),
  },
  {
    id: 'xp-apprentice',
    title: 'Transformer Apprentice',
    icon: '🚀',
    description: 'Gained momentum with deep conceptual understanding.',
    category: 'mastery',
    rarity: 'uncommon',
    requirementText: 'Reach 250 total XP',
    checkUnlocked: (s) => s.totalXP >= 250,
    getProgress: (s) => ({ current: Math.min(s.totalXP, 250), target: 250, unit: 'XP' }),
  },
  {
    id: 'xp-architect',
    title: 'Attention Architect',
    icon: '🔮',
    description: 'Mastered multi-head attention and transformer mechanics.',
    category: 'mastery',
    rarity: 'rare',
    requirementText: 'Reach 500 total XP',
    checkUnlocked: (s) => s.totalXP >= 500,
    getProgress: (s) => ({ current: Math.min(s.totalXP, 500), target: 500, unit: 'XP' }),
  },
  {
    id: 'xp-master',
    title: 'Neural Master',
    icon: '👑',
    description: 'Reached elite mastery status in AI & Machine Learning.',
    category: 'mastery',
    rarity: 'epic',
    requirementText: 'Reach 1000 total XP',
    checkUnlocked: (s) => s.totalXP >= 1000,
    getProgress: (s) => ({ current: Math.min(s.totalXP, 1000), target: 1000, unit: 'XP' }),
  },
  {
    id: 'xp-grandmaster',
    title: 'Grandmaster of AI',
    icon: '🪐',
    description: 'Surpassed 5,000 XP in comprehensive AI engineering.',
    category: 'mastery',
    rarity: 'legendary',
    requirementText: 'Reach 5000 total XP',
    checkUnlocked: (s) => s.totalXP >= 5000,
    getProgress: (s) => ({ current: Math.min(s.totalXP, 5000), target: 5000, unit: 'XP' }),
  },
  {
    id: 'neural-luminary',
    title: 'Neural Luminary',
    icon: '💠',
    description: 'Crossed 15,000 XP — true mastery of theory, practice, and systems.',
    category: 'mastery',
    rarity: 'mythic',
    requirementText: 'Reach 15000 total XP',
    checkUnlocked: (s) => s.totalXP >= 15000,
    getProgress: (s) => ({ current: Math.min(s.totalXP, 15000), target: 15000, unit: 'XP' }),
  },
];

/** Derives full BadgeStats from raw event history and context state */
export function computeBadgeStats(
  events: AwardEvent[],
  totalXP: number,
  streak: number,
  isSignedIn: boolean,
  problems: DocPage[],
): BadgeStats {
  const pagesUnderstood = events.filter((e) => e.kind === 'mark').length;
  // Deduplicated against the CURRENT problem catalogue via isSolved, the
  // same source of truth practiceStats() uses for "Practice Solved" on
  // the Progress page -- not a raw events.filter(...).length. A stale
  // 'complete' event whose permalink no longer matches any current
  // problem (route renamed/removed since it was solved) would otherwise
  // inflate this count forever while the catalogue-filtered count
  // correctly drops it, which is exactly the real counter-disagreement
  // bug this site's own audit found (badge said "3/5", Progress said 2).
  const problemsSolved = problems.filter((p) => p.difficulty && isSolved(p, events)).length;
  const systemDesignSolved = problems.filter((p) => !p.difficulty && isSolved(p, events)).length;
  const reviewsCompleted = events.filter((e) => e.kind === 'review').length;
  const depthRevealed = events.filter((e) => e.kind === 'depth').length;
  const dailySignIns = events.filter((e) => e.kind === 'signin').length;
  const independentSolves = events.filter((e) => e.kind === 'complete' && e.hintUsed === false).length;

  const solvedRoutes = new Set(events.filter((e) => e.kind === 'complete').map((e) => e.permalink));
  let easySolved = 0;
  let mediumSolved = 0;
  let hardSolved = 0;
  for (const p of problems) {
    if (solvedRoutes.has(p.route)) {
      if (p.difficulty === 'easy') easySolved++;
      else if (p.difficulty === 'hard') hardSolved++;
      else if (p.difficulty === 'medium') mediumSolved++;
    }
  }

  return {
    totalXP,
    streak,
    pagesUnderstood,
    problemsSolved,
    systemDesignSolved,
    isSignedIn,
    easySolved,
    mediumSolved,
    hardSolved,
    independentSolves,
    reviewsCompleted,
    depthRevealed,
    dailySignIns,
  };
}

export function getUnlockedBadges(stats: BadgeStats): Badge[] {
  return BADGES.filter((b) => b.checkUnlocked(stats));
}

