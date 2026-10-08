import { describe, expect, it } from 'vitest'
import { getSidebar } from '../lib/contentTree'
import { completionFor, getGroupForSubsection, groupLandingRoute, sectionBreadcrumb, SECTION_META, SECTION_ORDER, timeEstimate, TOTAL_PAGES } from './sectionMeta'
import { getPageByRoute } from '../lib/contentTree'
import { DOMAIN_ICON_BY_GROUP_KEY } from '../components/icons/DomainIcons'

// Sections that are intentionally outside the 7-domain taxonomy --
// top-level navigational/onboarding pages (the homepage's "Start
// Learning" CTA target, the getting-started intro), not content-domain
// pages, so they legitimately have no SECTION_META group, icon, or
// color. Verified by reading src/content/docs/ directly, not assumed:
// "general" is generate-page-meta.mjs's auto-assigned section for any
// .mdx file living straight under docs/ with no parent folder
// (currently just learning-path.mdx); "getting-started" is its own real
// folder (intro.mdx) that was never meant to carry a domain color either.
// Any OTHER real section missing from SECTION_META is a genuine gap this
// test should still catch -- this allowlist is deliberately narrow.
const KNOWN_UNGROUPED_SECTIONS = new Set(['general', 'getting-started'])

// The opposite direction: a subsection dir SECTION_META still lists (so
// topicBreakdown()/getGroupForSubsection() keep bucketing its points into
// a real group), but that deliberately no longer appears as a real docs
// sidebar section. 'practice-problems' moved to the real top-level
// /practice destination as part of the Learn/Practice IA split (see
// contentTree.ts's getSidebar(), which now excludes it) -- its pages still
// exist and are still real content, just reachable at /practice/<slug>
// instead of nested under /docs/.
const KNOWN_SUBSECTIONS_OUTSIDE_DOCS_SIDEBAR = new Set(['practice-problems'])

describe('sectionMeta completeness against the real content tree', () => {
  it('every REAL sidebar section (excluding known top-level nav pages) resolves to a SECTION_META group -- the exact bug class this guards: a new content folder added without a sectionMeta update silently renders with no icon/color', () => {
    const realSectionIds = getSidebar()
      .map((s) => s.id)
      .filter((id) => !KNOWN_UNGROUPED_SECTIONS.has(id))
    const missing = realSectionIds.filter((id) => getGroupForSubsection(id) === undefined)
    expect(missing).toEqual([])
  })

  it('every subsection dir listed in SECTION_META corresponds to a real, currently-existing sidebar section (or a documented exception) -- catches a stale/renamed folder entry left behind in sectionMeta.ts', () => {
    const realSectionIds = new Set(getSidebar().map((s) => s.id))
    const staleDirs: string[] = []
    for (const key of SECTION_ORDER) {
      for (const sub of SECTION_META[key].subsections) {
        if (!realSectionIds.has(sub.dir) && !KNOWN_SUBSECTIONS_OUTSIDE_DOCS_SIDEBAR.has(sub.dir)) staleDirs.push(`${key} -> ${sub.dir}`)
      }
    }
    expect(staleDirs).toEqual([])
  })

  it('no subsection dir is claimed by more than one top-level group', () => {
    const seen = new Map<string, string>()
    const duplicates: string[] = []
    for (const key of SECTION_ORDER) {
      for (const sub of SECTION_META[key].subsections) {
        const owner = seen.get(sub.dir)
        if (owner) duplicates.push(`${sub.dir} claimed by both ${owner} and ${key}`)
        else seen.set(sub.dir, key)
      }
    }
    expect(duplicates).toEqual([])
  })

  it('every SECTION_ORDER key has a real DomainIcon mapping (icon), not just a color', () => {
    // A group missing from DOMAIN_ICON_BY_GROUP_KEY still "works" (DomainIcon
    // falls back to a plain dot), but that's exactly the degraded, easy-to-
    // miss-in-review state a completeness check should catch loudly instead.
    const missing = SECTION_ORDER.filter((key) => !(key in DOMAIN_ICON_BY_GROUP_KEY))
    expect(missing).toEqual([])
  })

  it('DOMAIN_ICON_BY_GROUP_KEY has no entries for a group key that no longer exists in SECTION_META', () => {
    const validKeys = new Set(SECTION_ORDER)
    const orphaned = Object.keys(DOMAIN_ICON_BY_GROUP_KEY).filter((k) => !validKeys.has(k))
    expect(orphaned).toEqual([])
  })
})

describe('groupLandingRoute', () => {
  it('every real top-level group resolves to an ACTUAL, currently-existing page -- not the bare SECTION_META key, which is a Record identifier, not a route, and 404s', () => {
    for (const key of SECTION_ORDER) {
      const route = groupLandingRoute(key)
      expect(route).not.toBe(key) // the exact bug this guards: `to={key}` used directly as a route
      expect(getPageByRoute(route)).toBeDefined()
    }
  })
})

describe('getGroupForSubsection', () => {
  it('returns undefined for a dir that belongs to no group', () => {
    expect(getGroupForSubsection('not-a-real-directory')).toBeUndefined()
  })

  it('returns the correct group and metadata for a real subsection', () => {
    const result = getGroupForSubsection('llms-genai')
    expect(result?.key).toBe('/docs/category/models')
    expect(result?.meta.label).toBe('Models')
  })
})

describe('TOTAL_PAGES / timeEstimate / completionFor', () => {
  it('TOTAL_PAGES is the sum of every group pageCount', () => {
    const manualSum = SECTION_ORDER.reduce((sum, key) => sum + SECTION_META[key].pageCount, 0)
    expect(TOTAL_PAGES).toBe(manualSum)
  })

  it('timeEstimate never collapses a nonzero page count to a zero-hour range', () => {
    expect(timeEstimate(1)).not.toBe('0-0 hrs (1 pages)')
    const [lo, hi] = timeEstimate(1).match(/\d+/g)!.map(Number)
    expect(lo).toBeGreaterThanOrEqual(1)
    expect(hi).toBeGreaterThanOrEqual(lo)
  })

  it('timeEstimate scales up for a larger page count', () => {
    const small = timeEstimate(5)
    const large = timeEstimate(50)
    const smallLo = Number(small.match(/\d+/)![0])
    const largeLo = Number(large.match(/\d+/)![0])
    expect(largeLo).toBeGreaterThan(smallLo)
  })

  it('completionFor is 0 with no understood pages and caps at 1 even if every page in a group is marked understood plus extras', () => {
    const key = SECTION_ORDER[0]
    expect(completionFor(key, {})).toBe(0)

    const meta = SECTION_META[key]
    const understood: Record<string, boolean> = {}
    for (const sub of meta.subsections) {
      understood[`/docs/${sub.dir}/some-page`] = true
    }
    // Also mark pages from every OTHER group's folders, to confirm they
    // don't leak into this group's completion count.
    for (const otherKey of SECTION_ORDER) {
      if (otherKey === key) continue
      for (const sub of SECTION_META[otherKey].subsections) {
        understood[`/docs/${sub.dir}/other-page`] = true
      }
    }
    expect(completionFor(key, understood)).toBeLessThanOrEqual(1)
    expect(completionFor(key, understood)).toBeGreaterThan(0)
  })
})

describe('sectionBreadcrumb (BreadcrumbList structured data)', () => {
  it('finds a real label and a real, reachable landing href for every real subsection dir', () => {
    for (const group of Object.values(SECTION_META)) {
      for (const sub of group.subsections) {
        const crumb = sectionBreadcrumb(sub.dir)
        expect(crumb).toBeDefined()
        expect(crumb!.label).toBe(sub.label)
        expect(crumb!.href).toBe(sub.landing ?? `/docs/${sub.dir}/roadmap`)
      }
    }
  })

  it('returns undefined for a section dir that matches no subsection', () => {
    expect(sectionBreadcrumb('not-a-real-section')).toBeUndefined()
  })
})
