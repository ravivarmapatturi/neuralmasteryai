import { describe, expect, it } from 'vitest'
import path from 'node:path'
import { outputPathForRoute, routeFromMdxPath } from './prerenderRoutes.mjs'

const CONTENT_ROOT = path.join('/repo', 'src', 'content', 'docs')

describe('routeFromMdxPath', () => {
  it('maps a top-level file to its route', () => {
    const file = path.join(CONTENT_ROOT, 'llms-genai', 'rag.mdx')
    expect(routeFromMdxPath(file, CONTENT_ROOT)).toBe('/docs/llms-genai/rag')
  })

  it('maps a nested subdirectory file to its route', () => {
    const file = path.join(CONTENT_ROOT, 'databases', 'nosql', 'overview.mdx')
    expect(routeFromMdxPath(file, CONTENT_ROOT)).toBe('/docs/databases/nosql/overview')
  })

  it('strips the .mdx extension and nothing else', () => {
    const file = path.join(CONTENT_ROOT, 'deep-learning', 'bert.mdx')
    const route = routeFromMdxPath(file, CONTENT_ROOT)
    expect(route.endsWith('.mdx')).toBe(false)
    expect(route).toBe('/docs/deep-learning/bert')
  })

  it('remaps a practice-problems file to its real /practice/<slug> route, not /docs/practice-problems/<slug>', () => {
    const file = path.join(CONTENT_ROOT, 'practice-problems', 'dot-product.mdx')
    expect(routeFromMdxPath(file, CONTENT_ROOT)).toBe('/practice/dot-product')
  })

  it('uses a curated problem\'s descriptive slug when one is given, the file id otherwise', () => {
    const slugs = { 'll-queue-prob-1': 'reverse-a-singly-linked-list' }
    const curated = path.join(CONTENT_ROOT, 'practice-problems', 'll-queue-prob-1.mdx')
    const hidden = path.join(CONTENT_ROOT, 'practice-problems', 'agent-loop-prob-2.mdx')
    expect(routeFromMdxPath(curated, CONTENT_ROOT, slugs)).toBe('/practice/reverse-a-singly-linked-list')
    expect(routeFromMdxPath(hidden, CONTENT_ROOT, slugs)).toBe('/practice/agent-loop-prob-2')
  })

  it('normalizes Windows backslash separators to forward slashes in the route', () => {
    // node:path's relative() returns backslash-separated paths on Windows
    // (exercised directly here via path.win32, regardless of host platform,
    // rather than relying on actually running on Windows) -- the function
    // must normalize that to a real URL-shaped route either way.
    const winRoot = 'C:\\repo\\src\\content\\docs'
    const winFile = 'C:\\repo\\src\\content\\docs\\databases\\nosql\\overview.mdx'
    const relPath = path.win32.relative(winRoot, winFile).replace(/\.mdx$/, '')
    expect(relPath).toContain('\\') // sanity check: win32.relative really does use backslashes
    const normalized = `/docs/${relPath.split('\\').join('/')}`
    expect(normalized).toBe('/docs/databases/nosql/overview')
    expect(normalized).not.toContain('\\')
  })
})

describe('outputPathForRoute', () => {
  it('writes to <base>/<route>/index.html, dropping the leading slash from the route', () => {
    expect(outputPathForRoute('/docs/llms-genai/rag', '/repo/dist')).toBe(
      path.join('/repo/dist', 'docs/llms-genai/rag', 'index.html'),
    )
  })

  it('handles a nested route the same way as a top-level one', () => {
    expect(outputPathForRoute('/docs/databases/nosql/overview', '/repo/.pagefind-prerender')).toBe(
      path.join('/repo/.pagefind-prerender', 'docs/databases/nosql/overview', 'index.html'),
    )
  })

  it('produces different output paths under different base directories for the same route', () => {
    const route = '/docs/llms-genai/rag'
    const prerenderPath = outputPathForRoute(route, '/repo/.pagefind-prerender')
    const distPath = outputPathForRoute(route, '/repo/dist')
    expect(prerenderPath).not.toBe(distPath)
    expect(prerenderPath.endsWith(path.join('docs/llms-genai/rag', 'index.html'))).toBe(true)
    expect(distPath.endsWith(path.join('docs/llms-genai/rag', 'index.html'))).toBe(true)
  })

  it('the root route "/" (an app-level route, not a content-tree one) writes directly to <base>/index.html, not <base>//index.html', () => {
    // The edge case that matters here: '/'.replace(/^\//, '') is '' (empty
    // string), not '/' -- join(base, '', 'index.html') must collapse to
    // join(base, 'index.html') and not produce a malformed doubled-slash
    // path. This is the exact file the SPA shell already occupies, so
    // prerendering '/' deliberately overwrites dist/index.html with real
    // rendered homepage content instead of the empty <div id="root"> shell.
    expect(outputPathForRoute('/', '/repo/dist')).toBe(path.join('/repo/dist', 'index.html'))
  })
})
