/**
 * One flat index over the curated Practice catalogue, for the Problems hub on
 * /labs and the "related problems" and "daily problem" blocks.
 *
 * Topic is the catalogue track a problem sits in. Framework comes from the
 * runtime the judge loads for the problem: plain Python, NumPy or PyTorch.
 */
import { CATALOG, type CatalogTrack } from '../data/practiceCatalog';
import { getPracticeProblems, type DocPage } from './contentTree';
import { getPracticeProblem } from './practiceProblem';
import { pointsForDifficulty } from './gamification';

export type Framework = 'Python' | 'NumPy' | 'PyTorch';
export const FRAMEWORKS: Framework[] = ['Python', 'NumPy', 'PyTorch'];

export interface ProblemRow {
  page: DocPage;
  track: CatalogTrack;
  framework: Framework;
  points: number;
}

let cache: ProblemRow[] | null = null;

export function frameworkFor(problemId: string | undefined): Framework {
  const caps = (problemId && getPracticeProblem(problemId)?.runtime?.capabilities) || [];
  if (caps.includes('pytorch')) return 'PyTorch';
  if (caps.includes('numpy')) return 'NumPy';
  return 'Python';
}

/** Every curated problem, in catalogue order (track by track, easiest first). */
export function getProblemRows(): ProblemRow[] {
  if (cache) return cache;
  const byId = new Map(getPracticeProblems().map((p) => [p.problemId, p]));
  const seen = new Set<string>();
  cache = CATALOG.flatMap((track) =>
    track.problems.flatMap((id) => {
      const page = byId.get(id);
      if (!page || seen.has(page.route)) return [];
      seen.add(page.route);
      return [{ page, track, framework: frameworkFor(id), points: pointsForDifficulty(page.difficulty) }];
    }),
  );
  return cache;
}

/** Days since 1970-01-01 in UTC, so everyone sees the same problem on the same day. */
export function dayNumber(date: Date): number {
  return Math.floor(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / 86_400_000);
}

/** Today's problem. A fixed stride walks the list so consecutive days move between tracks. */
export function dailyProblem(rows: ProblemRow[], date: Date): ProblemRow | undefined {
  if (!rows.length) return undefined;
  return rows[(dayNumber(date) * 37) % rows.length];
}

/** Up to `limit` problems to try next: the rest of the same track first (next ones before earlier ones), then the same topic tag elsewhere. */
export function relatedProblems(route: string, limit = 4): ProblemRow[] {
  const rows = getProblemRows();
  const idx = rows.findIndex((r) => r.page.route === route);
  if (idx < 0) return [];
  const self = rows[idx];
  const sameTrack = rows.filter((r) => r.track.slug === self.track.slug && r !== self);
  const after = sameTrack.filter((r) => rows.indexOf(r) > idx);
  const before = sameTrack.filter((r) => rows.indexOf(r) < idx).reverse();
  const sameTopic = rows.filter((r) => r.track.slug !== self.track.slug && self.page.topic && r.page.topic === self.page.topic);
  return [...after, ...before, ...sameTopic].slice(0, limit);
}

export function relatedProblemsById(problemId: string, limit = 4): ProblemRow[] {
  const row = getProblemRows().find((r) => r.page.problemId === problemId);
  return row ? relatedProblems(row.page.route, limit) : [];
}
