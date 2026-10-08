import { renderHook } from '@testing-library/react'
import { describe, expect, it, afterEach } from 'vitest'
import { useDocumentMeta, SITE_URL } from './useDocumentMeta'

function getJsonLd(): Record<string, unknown> | null {
  const el = document.getElementById('nm-breadcrumb-jsonld')
  if (!el) return null
  return JSON.parse(el.textContent ?? '{}')
}

describe('useDocumentMeta BreadcrumbList structured data (audit: "No structured data")', () => {
  afterEach(() => {
    document.getElementById('nm-breadcrumb-jsonld')?.remove()
  })

  it('writes no script tag at all when no breadcrumb is passed (non-docs pages)', () => {
    renderHook(() => useDocumentMeta('About', 'desc'))
    expect(getJsonLd()).toBeNull()
  })

  it('writes a real, schema.org-valid BreadcrumbList for a docs page', () => {
    renderHook(() =>
      useDocumentMeta('Attention & Transformers', 'desc', [
        { label: 'Home', href: '/' },
        { label: 'Deep Learning', href: '/docs/deep-learning/roadmap' },
      ]),
    )
    const json = getJsonLd()
    expect(json).not.toBeNull()
    expect(json!['@context']).toBe('https://schema.org')
    expect(json!['@type']).toBe('BreadcrumbList')

    const items = json!.itemListElement as Array<Record<string, unknown>>
    expect(items).toHaveLength(3)

    // Every position is sequential starting at 1, every item is a real
    // ListItem with a real absolute URL under this site's own domain --
    // not an invented label or a relative/malformed item URL.
    items.forEach((item, i) => {
      expect(item['@type']).toBe('ListItem')
      expect(item.position).toBe(i + 1)
      expect(typeof item.name).toBe('string')
      expect(item.item as string).toMatch(new RegExp(`^${SITE_URL.replace(/\/$/, '')}`))
    })

    expect(items[0].name).toBe('Home')
    expect(items[0].item).toBe('https://neuralmasteryai.com/')
    expect(items[1].name).toBe('Deep Learning')
    expect(items[1].item).toBe('https://neuralmasteryai.com/docs/deep-learning/roadmap')
    expect(items[2].name).toBe('Attention & Transformers')
  })

  it('removes the script tag on navigating from a docs page to one with no breadcrumb', () => {
    const { rerender } = renderHook(
      ({ crumb }: { crumb?: Array<{ label: string; href: string }> }) => useDocumentMeta('Page', 'desc', crumb),
      { initialProps: { crumb: [{ label: 'Home', href: '/' }] } },
    )
    expect(getJsonLd()).not.toBeNull()
    rerender({ crumb: undefined })
    expect(getJsonLd()).toBeNull()
  })
})
