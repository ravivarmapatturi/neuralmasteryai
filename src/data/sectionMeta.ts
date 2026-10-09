// Hand-curated metadata for the 7 top-level sidebar groups, keyed by the
// group's generated-index page href. Time estimates are an honest range
// derived from page count x a realistic 15-25 min/page for this site's
// technical density -- not a false-precision single number, and not a
// fixed weekly cohort pace (this isn't a scheduled course). `subsections`
// labels come directly from each folder's own category metadata, not
// re-typed by hand.

export interface Subsection {
  dir: string;
  label: string;
  landing?: string;
}

export interface SectionMetaEntry {
  label: string;
  icon: string;
  color: string;
  description: string;
  pageCount: number;
  difficulty: string;
  prerequisites: string;
  leadsTo: string;
  subsections: Subsection[];
  folders?: string[];
}

export const SECTION_META: Record<string, SectionMetaEntry> = {
  '/docs/category/foundations': {
    label: 'Foundations',
    icon: '🧱',
    color: '#3DDC97',
    description: 'Systems, Python, and math fundamentals — before any AI-specific content.',
    pageCount: 19,
    difficulty: 'Beginner',
    prerequisites: 'None — this is the entry point.',
    leadsTo: 'Models',
    subsections: [
      // Real, explicit landing page -- unlike every other subsection here,
      // this folder has no roadmap.mdx (just intro.mdx), so the usual
      // `landing || /docs/<dir>/roadmap` fallback 404s without this.
      { dir: 'getting-started', label: 'Getting Started', landing: '/docs/getting-started/intro' },
      { dir: 'cs-fundamentals', label: 'CS Fundamentals for AI Engineers' },
      { dir: 'python-engineering', label: 'Python Engineering for AI' },
      { dir: 'mathematics-for-ai', label: 'Mathematics for AI' },
    ],
  },
  '/docs/category/models': {
    label: 'Models',
    icon: '🧠',
    color: '#5B8CFF',
    description: 'Classical ML through modern LLMs — every model family covered in depth.',
    pageCount: 83,
    difficulty: 'Intermediate → Advanced',
    prerequisites: 'Foundations',
    leadsTo: 'Agents & Applications',
    subsections: [
      { dir: 'machine-learning', label: 'Machine Learning' },
      { dir: 'deep-learning', label: 'Deep Learning' },
      { dir: 'computer-vision', label: 'Computer Vision' },
      { dir: 'nlp', label: 'NLP' },
      { dir: 'speech-audio', label: 'Speech & Audio AI' },
      { dir: 'llms-genai', label: 'LLMs & GenAI' },
      { dir: 'graph-ml', label: 'Graph ML' },
      { dir: 'reinforcement-learning', label: 'Reinforcement Learning' },
    ],
  },
  '/docs/category/agents--applications': {
    label: 'Agents & Applications',
    icon: '🤖',
    color: '#F4B942',
    description: 'Agentic systems, and where AI meets specific domains — science, healthcare, and beyond.',
    pageCount: 25,
    difficulty: 'Advanced',
    prerequisites: 'Models — especially LLMs & GenAI',
    leadsTo: 'Systems & Infrastructure',
    subsections: [
      { dir: 'agents', label: 'Agents' },
      { dir: 'ai-for-science', label: 'AI for Science' },
      { dir: 'domain-applications', label: 'Domain AI Applications' },
    ],
  },
  '/docs/category/systems--infrastructure': {
    label: 'Systems & Infrastructure',
    icon: '🏗️',
    color: '#F45B5B',
    description: 'Designing, building, and running production ML/AI systems at scale.',
    pageCount: 58,
    difficulty: 'Advanced',
    prerequisites: 'Agents & Applications',
    leadsTo: 'Safety & Evaluation',
    subsections: [
      { dir: 'ml-system-design', label: 'ML System Design' },
      { dir: 'mlops', label: 'MLOps' },
      { dir: 'databases', label: 'Databases' },
      { dir: 'frameworks', label: 'Frameworks' },
      { dir: 'cli-reference', label: 'CLI Reference' },
    ],
  },
  '/docs/category/safety--evaluation': {
    label: 'Safety & Evaluation',
    icon: '🛡️',
    color: '#B15BFF',
    description: 'Knowing whether a system is good, secure, and safe — not just whether it runs.',
    pageCount: 18,
    difficulty: 'Advanced',
    prerequisites: 'Systems & Infrastructure',
    leadsTo: 'Research & Build',
    subsections: [
      { dir: 'ai-evaluation', label: 'AI Evaluation' },
      { dir: 'ai-security', label: 'AI Security' },
      { dir: 'ai-safety', label: 'AI Safety & Alignment' },
      { dir: 'interpretability', label: 'Interpretability' },
    ],
  },
  '/docs/category/research--build': {
    label: 'Research & Build',
    icon: '🔬',
    color: '#31C4D9',
    description: 'Reading the literature, and building real things — from scratch, and as full projects.',
    // 77 originally included Practice Problems' own page count; those 54
    // pages moved to the real top-level /practice destination (see the
    // Learn/Practice IA split) and are no longer part of this group's own
    // docs-sidebar completion tracking -- see the pageCount note on the
    // 'practice-problems' subsection below for why the dir itself stays
    // listed here anyway.
    pageCount: 23,
    difficulty: 'Advanced',
    prerequisites: 'Safety & Evaluation',
    leadsTo: 'Career',
    subsections: [
      { dir: 'research-engineering', label: 'Research Engineering' },
      { dir: 'build-from-scratch', label: 'Build From Scratch' },
      { dir: 'projects', label: 'Projects' },
      { dir: 'visual-lab', label: 'Visual Lab' },
      // Deliberately still listed even though its pages no longer live in
      // the docs sidebar (see contentTree.ts's getSidebar() exclusion and
      // the matching allowlist in sectionMeta.test.ts) -- keeping the dir
      // here lets topicBreakdown()/getGroupForSubsection() keep bucketing
      // practice-problem points into a real group instead of silently
      // dropping them once their permalinks moved to /practice/<slug>.
      { dir: 'practice-problems', label: 'Practice Problems', landing: '/practice' },
    ],
  },
  '/docs/category/career': {
    label: 'Career',
    icon: '🎯',
    color: '#FF7A45',
    description: 'Tying everything together into a learning path and interview readiness.',
    pageCount: 12,
    difficulty: 'All levels',
    prerequisites: 'Whatever you have covered so far',
    leadsTo: '— you are interview-ready.',
    subsections: [
      { dir: 'interview-prep', label: 'Interview Prep' },
      { dir: 'roadmaps', label: 'Roadmaps', landing: '/docs/roadmaps/overview' },
      { dir: 'resources', label: 'Resources', landing: '/docs/resources/open-source-ai-resources' },
    ],
  },
};

export const SECTION_ORDER: string[] = Object.keys(SECTION_META);

/** Given a sidebar subsection's folder name (e.g. "deep-learning"), find
 * its parent top-level group -- key + metadata -- the lookup the visual-
 * identity system (sidebar section headers, homepage cards) uses to
 * color/iconify each of the ~30 fine-grained subsections by its ONE
 * parent domain color, rather than needing ~30 separate colors (illegible
 * past a handful). */
export function getGroupForSubsection(dir: string): { key: string; meta: SectionMetaEntry } | undefined {
  const key = SECTION_ORDER.find((k) => SECTION_META[k].subsections.some((s) => s.dir === dir));
  return key ? { key, meta: SECTION_META[key] } : undefined;
}

/** A real, clickable URL for a top-level group -- SECTION_META's own keys
 * (e.g. "/docs/category/foundations") are Record identifiers, not real
 * routes; no page is ever generated at that literal path (confirmed: it
 * 404s). Real landing target is the group's first subsection's own
 * `landing` page if it declares one, else that subsection's roadmap --
 * the same fallback CurriculumBreakdown's per-subsection links already use
 * (`s.landing || /docs/${s.dir}/roadmap`), just applied once for the whole
 * group via its first subsection. */
export function groupLandingRoute(key: string): string {
  const first = SECTION_META[key].subsections[0];
  return first.landing ?? `/docs/${first.dir}/roadmap`;
}

export const TOTAL_PAGES: number = SECTION_ORDER.reduce((sum, key) => sum + SECTION_META[key].pageCount, 0);

/** "4-7 hrs (17 pages)" -- a 15-25 min/page range, not false precision. */
export function timeEstimate(pageCount: number): string {
  const lo = Math.round((pageCount * 15) / 60) || 1;
  const hi = Math.round((pageCount * 25) / 60) || 1;
  return `${lo}-${hi} hrs (${pageCount} pages)`;
}

/** Fraction (0..1) of a top-level group's pages marked understood --
 * matches a page's permalink against the group's folders/subsections, the
 * same "which pages count toward this group" logic LearningPathMap and
 * the progress dashboard both need. Only ever reads the map's KEYS (which
 * permalinks are present at all), never a value, so it accepts whatever
 * shape ProgressContext's understood-map happens to use -- a plain
 * `Record<string, boolean>` in tests, or the real `ProgressEntry` objects
 * in the app -- without needing to know or care which. */
export function completionFor(key: string, understood: Record<string, unknown>): number {
  const meta = SECTION_META[key];
  const done = Object.keys(understood).filter((permalink) =>
    meta.folders ? meta.folders.some((f) => permalink.includes(`/docs/${f}/`)) : meta.subsections.some((s) => permalink.includes(`/docs/${s.dir}/`)),
  ).length;
  return Math.min(1, done / meta.pageCount);
}

/** Looks up a DocPage's `section` (its top-level content folder, e.g.
 * "deep-learning") against every group's `subsections` to find its real,
 * human-readable label and a real, navigable landing page -- the same
 * `landing || /docs/<dir>/roadmap` convention used everywhere else this
 * data drives navigation. Used for BreadcrumbList structured data
 * (useDocumentMeta), so every breadcrumb is a real, currently-reachable
 * page, not an invented label with no corresponding link. */
export function sectionBreadcrumb(section: string): { label: string; href: string } | undefined {
  for (const group of Object.values(SECTION_META)) {
    const sub = group.subsections.find((s) => s.dir === section);
    if (sub) return { label: sub.label, href: sub.landing ?? `/docs/${sub.dir}/roadmap` };
  }
  return undefined;
}
