// Public routes for study plans, research tracks and project sheets, read
// from src/data/studyPlans.ts with a regex (the .ts file isn't importable
// from plain Node). Shared by the sitemap and the prerender list.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export function studyRoutes() {
  const src = readFileSync(resolve(import.meta.dirname, '..', 'src', 'data', 'studyPlans.ts'), 'utf8');
  const [plans, rest] = src.split('export const RESEARCH_TRACKS');
  const [tracks] = rest.split('export const PROJECT_SHEETS');
  const slugs = (text) => [...text.matchAll(/^    slug: '([a-z0-9-]+)',$/gm)].map((m) => m[1]);
  return [
    '/study-plans',
    ...slugs(plans).map((s) => `/study-plans/${s}`),
    '/research',
    ...slugs(tracks).map((s) => `/research/${s}`),
    '/projects',
  ];
}
