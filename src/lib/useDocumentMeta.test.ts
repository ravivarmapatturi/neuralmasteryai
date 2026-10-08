import { renderHook } from '@testing-library/react'
import { describe, expect, it, afterEach } from 'vitest'
import { useDocumentMeta, SITE_URL } from './useDocumentMeta'

function getJsonLd(): Record<string, unknown> | null {
  const el = document.getElementById('nm-breadcrumb-jsonld')
  if (!el) return null
  return JSON.parse(el.textContent ?? '{}')
}

describe('useDocumentMeta OG/Twitter image tags (audit: "0 of 248 pages have og:image")', () => {
  afterEach(() => {
    document.getElementById('nm-breadcrumb-jsonld')?.remove()
  })

  it('sets a real, correctly-dimensioned og:image and the matching large-image twitter card', () => {
    renderHook(() => useDocumentMeta('Some Page', 'desc'))
    const ogImage = document.head.querySelector('meta[property="og:image"]')?.getAttribute('content')
    const ogWidth = document.head.querySelector('meta[property="og:image:width"]')?.getAttribute('content')
    const ogHeight = document.head.querySelector('meta[property="og:image:height"]')?.getAttribute('content')
    const twitterCard = document.head.querySelector('meta[name="twitter:card"]')?.getAttribute('content')
    const twitterImage = document.head.querySelector('meta[name="twitter:image"]')?.getAttribute('content')

    expect(ogImage).toBe(`${SITE_URL.replace(/\/$/, '')}/og-image.png`)
    expect(ogWidth).toBe('1200')
    expect(ogHeight).toBe('630')
    // summary_large_image, not summary -- summary renders a small square
    // thumbnail, which would crop/misrepresent a 1200x630 landscape image.
    expect(twitterCard).toBe('summary_large_image')
    expect(twitterImage).toBe(ogImage)
  })
})

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
