import { describe, expect, test } from 'bun:test'
import config from '../book.config'
import { renderChapter } from '../scripts/lib/markdown'
import type { Chapter, RenderOptions } from '../scripts/lib/types'

const chapter: Chapter = {
  file: '/tmp/chapter.md',
  relPath: 'part-1/chapter/index.md',
  dir: '/tmp',
  slug: 'test-chapter',
  title: 'Test Chapter',
  part: 'Part One',
  partOrder: 1,
  order: 1,
  number: 1,
  kind: 'chapter',
  layout: 'two-column',
  topics: [],
  summary: '',
  status: 'draft',
  content: '',
  data: { title: 'Test Chapter' },
}

function options(overrides: Partial<RenderOptions> = {}): RenderOptions {
  return {
    mathOutput: 'html',
    target: 'html',
    assetBase: '',
    resolveImage: (src) => `/resolved/${src}`,
    ...overrides,
  }
}

const source = `## A section

Inline math $x^2$ and a macro $\\bigO(n)$.

$$
\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}.
$$

::: theorem Range sums
Any range sum can be answered in $\\bigO(1)$ time.
:::

![An array.](figures/array.svg "An array of five integers.")

See [the dummy chapter](chapter:dummy#the-array-model) and [the preface](chapter:preface).

| Operation | Cost |
| --- | --- |
| Query | $\\bigO(1)$ |

A footnote reference.[^note]

[^note]: The footnote body.

\`\`\`cpp
int main() { return 0; }
\`\`\`
`

describe('renderChapter (HTML)', () => {
  const rendered = renderChapter({ ...chapter, content: source }, config, options())

  test('renders headings with chapter-prefixed anchors', async () => {
    const { html } = await rendered
    expect(html).toContain('<h2 id="test-chapter-a-section"')
  })

  test('renders inline and display math with KaTeX', async () => {
    const { html } = await rendered
    expect(html).toContain('class="math-inline"')
    expect(html).toContain('class="math-display"')
    expect(html).toContain('class="katex"')
    expect(html).not.toContain('<math')
  })

  test('renders callouts with their labels', async () => {
    const { html } = await rendered
    expect(html).toContain('class="callout callout--theorem"')
    expect(html).toContain('Range sums')
  })

  test('renders a figure without a paragraph wrapper', async () => {
    const { html } = await rendered
    expect(html).toContain('<figure class="book-figure book-figure--image">')
    expect(html).toContain('/resolved/figures/array.svg')
    expect(html).toContain('<figcaption>An array of five integers.</figcaption>')
    expect(html).not.toContain('<p><figure')
  })

  test('keeps inline images inline', async () => {
    const { html } = await renderChapter(
      {
        ...chapter,
        content: 'An inline icon ![icon](figures/icon.svg) in a sentence.',
      },
      config,
      options(),
    )

    expect(html).toContain('<p>An inline icon <img')
    expect(html).not.toContain('<figure')
  })

  test('rewrites chapter links for the HTML target', async () => {
    const { html } = await rendered
    expect(html).toContain('href="#dummy-the-array-model"')
    expect(html).toContain('href="#ch-preface"')
  })

  test('wraps tables for horizontal scrolling', async () => {
    const { html } = await rendered
    expect(html).toContain('<div class="table-wrap">')
  })

  test('renders footnotes', async () => {
    const { html } = await rendered
    expect(html).toContain('footnote-ref')
    expect(html).toContain('footnote-backref')
  })

  test('highlights fenced code with Shiki', async () => {
    const { html } = await rendered
    expect(html).toContain('class="shiki')
    expect(html).toContain('int')
  })

  test('reports no TikZ figures when the chapter has none', async () => {
    const { figures } = await rendered
    expect(figures).toEqual([])
  })

  test('wraps ::: wide blocks in a full-width container', async () => {
    const { html } = await renderChapter(
      { ...chapter, content: '::: wide\nA wide block.\n:::\n' },
      config,
      options(),
    )

    expect(html).toContain('<div class="book-wide">')
    expect(html).toContain('A wide block.')
  })

  test('accepts ::: single-column as an alias for wide blocks', async () => {
    const { html } = await renderChapter(
      { ...chapter, content: '::: single-column\nA wide block.\n:::\n' },
      config,
      options(),
    )

    expect(html).toContain('<div class="book-wide">')
  })
})

describe('renderChapter (EPUB)', () => {
  const rendered = renderChapter(
    { ...chapter, content: source },
    config,
    options({ mathOutput: 'mathml', target: 'epub' }),
  )

  test('renders MathML instead of KaTeX HTML', async () => {
    const { html } = await rendered
    expect(html).toContain('<math xmlns="http://www.w3.org/1998/Math/MathML"')
    expect(html).toContain('annotation encoding="application/x-tex"')
  })

  test('rewrites chapter links for the EPUB target', async () => {
    const { html } = await rendered
    expect(html).toContain('href="dummy.xhtml#dummy-the-array-model"')
    expect(html).toContain('href="preface.xhtml"')
  })

  test('keeps external links but marks them safe', async () => {
    const { html } = await renderChapter(
      {
        ...chapter,
        content: '[Example](https://example.com)',
      },
      config,
      options({ target: 'epub', mathOutput: 'mathml' }),
    )

    expect(html).toContain('target="_blank"')
    expect(html).toContain('rel="noopener noreferrer"')
  })
})
