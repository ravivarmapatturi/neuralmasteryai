import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import Markdown from './Markdown'
import { ThemeProvider } from '../../theme/ThemeProvider'

function renderMd(source: string) {
  return render(
    <ThemeProvider>
      <MemoryRouter>
        <Markdown source={source} />
      </MemoryRouter>
    </ThemeProvider>,
  )
}

describe('Markdown (editor-written blog posts)', () => {
  it('renders headings, emphasis, tables and links like an MDX page', () => {
    renderMd('## Why it works\n\nSome **bold** text and a [lesson](/docs/deep-learning/cnns).\n\n| a | b |\n|---|---|\n| 1 | 2 |')
    expect(screen.getByRole('heading', { level: 2, name: 'Why it works' })).toBeInTheDocument()
    expect(screen.getByText('bold').tagName).toBe('STRONG')
    expect(screen.getByRole('link', { name: 'lesson' })).toHaveAttribute('href', '/docs/deep-learning/cnns')
    expect(screen.getByRole('table')).toBeInTheDocument()
  })

  it('drops raw HTML, so a post cannot inject markup or scripts', () => {
    const { container } = renderMd('Hello <script>alert(1)</script> <img src=x onerror="alert(1)"> world')
    expect(container.querySelector('script')).toBeNull()
    expect(container.querySelector('img')).toBeNull()
    expect(container.textContent).toContain('Hello')
  })
})
