import { describe, expect, it } from 'vitest';
import { getPageByRoute } from '../lib/contentTree';
import {
  COMING_SOON_TOOLS,
  PLAYGROUND_COMPONENTS,
  PLAYGROUND_SECTIONS,
  PLAYGROUND_TOOLS,
  getPlaygroundToolBySlug,
  resolvePlaygroundComponent,
} from './playgroundCatalog';

describe('playgroundCatalog', () => {
  it('registers at least 30 live EXISTS tools with unique slugs and valid sections', () => {
    expect(PLAYGROUND_TOOLS.length).toBeGreaterThanOrEqual(30);

    const sectionIds = new Set(PLAYGROUND_SECTIONS.map((section) => section.id));
    const slugs = new Set<string>();

    for (const tool of PLAYGROUND_TOOLS) {
      expect(tool.slug).toMatch(/^[a-z0-9-]+$/);
      expect(slugs.has(tool.slug)).toBe(false);
      slugs.add(tool.slug);

      expect(sectionIds.has(tool.section)).toBe(true);
      expect(tool.whatYouTry.trim().length).toBeGreaterThan(10);
      expect(tool.whatYouChange.trim().length).toBeGreaterThan(3);
      expect(tool.whatYouSee.trim().length).toBeGreaterThan(3);
      expect(tool.ideaTaught.trim().length).toBeGreaterThan(10);
      expect(tool.tryThis).toHaveLength(3);
      for (const step of tool.tryThis) {
        expect(step.prompt.trim().length).toBeGreaterThan(10);
        expect(step.check.trim().length).toBeGreaterThan(10);
      }

      expect(getPlaygroundToolBySlug(tool.slug)).toBe(tool);
    }

    expect(Object.keys(PLAYGROUND_COMPONENTS).sort()).toEqual([...slugs].sort());
  });

  it('links every live and coming-soon entry to a real Learn route', () => {
    for (const tool of PLAYGROUND_TOOLS) {
      const page = getPageByRoute(tool.learnPath);
      expect(page, `Missing Learn page for ${tool.slug}: ${tool.learnPath}`).toBeDefined();
    }

    for (const item of COMING_SOON_TOOLS) {
      const page = getPageByRoute(item.learnPath);
      expect(page, `Missing Learn page for coming soon tool ${item.title}: ${item.learnPath}`).toBeDefined();
      expect('slug' in item).toBe(false);
    }
  });

  it('resolves every registered tool slug to a lazily importable default React component', async () => {
    const entries = Object.entries(PLAYGROUND_COMPONENTS);
    expect(entries.length).toBe(PLAYGROUND_TOOLS.length);

    for (const [slug, loader] of entries) {
      expect(resolvePlaygroundComponent(slug)).toBe(loader);
      const mod = await loader();
      expect(typeof mod.default).toBe('function');
    }
  });
});
