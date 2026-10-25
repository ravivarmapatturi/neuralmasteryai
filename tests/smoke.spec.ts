import { test, expect } from '@playwright/test';
import { collectConsoleErrors } from './helpers';

// Fast critical-path smoke suite, run on every PR and push to main. Not the
// full 14-component regression pass (see .verify-scripts/verify.cjs and
// CI_CD.md for how to run that separately). Runs against the real
// production build (dist/) via scripts/static-server.cjs -- not vite dev,
// not vite preview -- so it exercises GitHub Pages' actual base-path and
// 404-fallback behavior, not a more forgiving dev-server approximation.
//
// Targets real content pages, not dev-scaffolding fixtures -- the last
// scaffold page these tests depended on (deep-learning/attention-demo.mdx,
// "Phase 1 Acceptance Test") was deleted because it was pure QA scaffolding
// with no reader value; its two embedded components already have real,
// permanent homes elsewhere (or a proper successor), which is where these
// tests point now.

test.describe('Core application', () => {
  test('homepage loads with real content and a working topic link', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await page.goto('');
    // The homepage ("/") is a real Learn/Practice chooser now, not the Learn
    // content directly (see src/components/ChooserPage.tsx) -- Learn's own
    // rich hero + topic grid moved to /learn (src/components/Home.tsx).
    // Targets a real docs link by its href PREFIX rather than position/copy
    // -- the homepage's exact layout/copy is expected to keep evolving
    // (see git history), but "some real link into /docs/ content actually
    // works" is the durable invariant this test should keep checking.
    await expect(page).toHaveURL('http://localhost:4173/');
    await expect(page.locator('h1')).toBeVisible();
    const firstDocsLink = page.locator('a[href^="/docs/"]').first();
    await firstDocsLink.click();
    await expect(page).toHaveURL(/\/docs\//);
    await expect(page.locator('article.prose h1').first()).toBeVisible();
    expect(errors.errors()).toEqual([]);
  });

  test('representative documentation page loads', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await page.goto('docs/deep-learning/attention-transformers');
    await expect(page.locator('h1')).toHaveText('Attention and Transformers, In Full Depth');
    expect(errors.errors()).toEqual([]);
  });

  test('desktop sidebar navigation works', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    const errors = collectConsoleErrors(page);
    await page.goto('docs/getting-started/intro');
    // "Deep Learning" collapses by default when it's not the active section
    // (see Sidebar.tsx) -- expand it before its link is clickable.
    await page.locator('.nm-sidebar button', { hasText: 'Deep Learning' }).click();
    await page.locator('.nm-sidebar a', { hasText: 'Attention and Transformers' }).click();
    await expect(page).toHaveURL(/attention-transformers/);
    await expect(page.locator('h1')).toHaveText('Attention and Transformers, In Full Depth');
    expect(errors.errors()).toEqual([]);
  });

  test('mobile navigation works: open, navigate, closes', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    const errors = collectConsoleErrors(page);
    await page.goto('docs/getting-started/intro');

    await expect(page.locator('.nm-sidebar').first()).toBeHidden();
    const hamburger = page.getByRole('button', { name: 'Open navigation menu' });
    await expect(hamburger).toBeVisible();
    await hamburger.click();

    const dialog = page.getByRole('dialog', { name: 'Site navigation' });
    await expect(dialog).toBeVisible();
    // Same collapsed-section behavior as the desktop sidebar -- expand
    // "Deep Learning" before its link is clickable.
    await dialog.getByRole('button', { name: 'Deep Learning' }).click();
    await dialog.getByRole('link', { name: 'Attention and Transformers' }).click();

    await expect(page).toHaveURL(/attention-transformers/);
    await expect(dialog).toBeHidden();

    const overflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 4);
    expect(errors.errors()).toEqual([]);
  });

  test('directly opening a deep link works (prerendered static page)', async ({ page }) => {
    // Simulates a user pasting/refreshing a deep URL rather than navigating
    // via the app. scripts/prerender-for-pagefind.mjs now writes a real
    // dist/<route>/index.html per route, so GitHub Pages serves a genuine
    // 200 with real content here (confirmed: no bare-path/no-slash form
    // exists as a literal file, so the server 301s to the trailing-slash
    // form where the prerendered index.html actually lives -- Playwright's
    // response, like a browser's, reflects the final response after
    // following that redirect). This replaced the old GitHub Pages
    // 404-fallback-then-client-render behavior, which real crawlers/bots
    // that don't execute JS couldn't see past -- see the header comment on
    // prerender-for-pagefind.mjs for the full story.
    const errors = collectConsoleErrors(page);
    const response = await page.goto('docs/deep-learning/attention-transformers');
    expect(response?.status()).toBe(200);
    await expect(page.locator('h1')).toHaveText('Attention and Transformers, In Full Depth');
    await page.reload();
    await expect(page.locator('h1')).toHaveText('Attention and Transformers, In Full Depth');
    expect(errors.errors()).toEqual([]);
  });
});

test.describe('Visualization', () => {
  test('D3 visualization renders and responds to interaction', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    // GradientDescentExplorer (real d3.scaleLinear-driven canvas) is the
    // permanent successor to the old Phase-1 D3 scaffold component.
    await page.goto('docs/visual-lab/gradient-descent-explorer');
    const container = page.locator('article.prose');
    await container.locator('svg').first().scrollIntoViewIfNeeded();
    await expect(container.locator('svg').first()).toBeVisible();

    const before = await container.locator('text=/^Step \\d/').innerText();
    await container.getByRole('button', { name: 'Step', exact: true }).click();
    const after = await container.locator('text=/^Step \\d/').innerText();
    expect(after).not.toBe(before);
    expect(errors.errors()).toEqual([]);
  });

  test('React Flow visualization renders and responds to interaction', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    // RagPipelineSimulator's permanent home -- same component the old
    // Phase-1 scaffold page also embedded, now a real Visual Lab page.
    await page.goto('docs/visual-lab/rag-pipeline-simulator');
    const container = page.locator('article.prose');
    await expect(container.locator('.react-flow__node').first()).toBeVisible();
    const nodeCount = await container.locator('.react-flow__node').count();
    expect(nodeCount).toBeGreaterThanOrEqual(8);

    const before = await container.locator('text=/chunks indexed/').innerText();
    await container.getByRole('button', { name: '30 words' }).click();
    const after = await container.locator('text=/chunks indexed/').innerText();
    expect(after).not.toBe(before);
    expect(errors.errors()).toEqual([]);
  });

  test('representative interactive ML visualization: state actually changes on interaction', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    // component-porting-check.mdx (the old Phase-1 dev scaffold this test
    // used to target) has since been removed -- visual-lab/linear-regression-studio.mdx
    // hosts the same LinearRegressionStudio component as real, permanent content.
    await page.goto('docs/visual-lab/linear-regression-studio');
    const container = page.locator('article.prose');
    await container.locator('svg').first().scrollIntoViewIfNeeded();
    await expect(container.locator('svg').first()).toBeVisible();

    await container.getByRole('button', { name: 'Gradient Descent Lab' }).click();
    const before = await container.locator('text=/^Step \\d/').innerText();
    await container.getByRole('button', { name: 'Step', exact: true }).click();
    const after = await container.locator('text=/^Step \\d/').innerText();
    expect(after).not.toBe(before);
    expect(errors.errors()).toEqual([]);
  });

  test('KaTeX math renders on a content page', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await page.goto('docs/deep-learning/attention-transformers');
    await expect(page.locator('.katex').first()).toBeVisible();
    expect(errors.errors()).toEqual([]);
  });

  test('Shiki-highlighted code block renders on a content page', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await page.goto('docs/machine-learning/linear-regression');
    const code = page.locator('pre code, pre.shiki, pre');
    await expect(code.first()).toBeVisible();
    // Shiki inlines per-token color styles -- a plain unstyled <pre> would
    // have none of these, so this distinguishes "real syntax highlighting
    // rendered" from "a bare code block". Shiki's highlighter loads async
    // (see VisualizationCode.tsx, which renders raw text as an immediate
    // fallback and re-renders once the highlighter resolves), and pages
    // are now lazy-loaded route chunks on top of that -- so this needs an
    // auto-retrying assertion, not a one-shot .count() read.
    await expect(page.locator('pre span[style*="color"]').first()).toBeVisible();
    expect(errors.errors()).toEqual([]);
  });

  test('practice page playground runs Python in the browser and reports test results', async ({ page }) => {
    test.setTimeout(60000);
    const errors = collectConsoleErrors(page);
    // Stage 1 of Build an Agent runs inline on /practice. Its starter is a
    // stub, so the run reports failures -- what matters is that Pyodide
    // loaded, executed the code and scored every visible case.
    await page.goto('practice');
    const playground = page.locator('.nm-practice-live');
    await playground.scrollIntoViewIfNeeded();
    await expect(playground).toBeVisible();

    await playground.getByRole('button', { name: /Run/i }).click();
    await expect(playground.locator('text=/\\d+\\/\\d+ passed/')).toBeVisible({ timeout: 45000 });
    expect(errors.errors()).toEqual([]);
  });
});
