import type { BookConfig } from '../../book.config'
import { chapterLabel, isTocEntry } from './chapters'
import type { Chapter, Part, RenderResult, RenderTarget } from './types'
import { escapeAttr, escapeHtml } from './util'

export interface BookRenderOptions {
  target: RenderTarget
  renderChapter: (chapter: Chapter) => Promise<RenderResult>
}

export async function renderBook(
  chapters: Chapter[],
  parts: Part[],
  config: BookConfig,
  options: BookRenderOptions,
): Promise<string> {
  const rendered = new Map<string, RenderResult>()

  for (const chapter of chapters) {
    rendered.set(chapter.slug, await options.renderChapter(chapter))
  }

  const titleChapter = chapters.find((chapter) => chapter.kind === 'title')
  const copyrightChapter = chapters.find((chapter) => chapter.kind === 'copyright')

  const body = [
    renderCover(config),
    renderTitlePage(config, titleChapter, rendered),
    renderCopyright(copyrightChapter, rendered),
    renderToc(parts),
    ...renderParts(parts, rendered),
  ].join('\n')

  return `<!doctype html>
<html lang="${escapeAttr(config.language)}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(config.title)}</title>
  <meta name="author" content="${escapeAttr(config.author)}">
  <meta name="description" content="${escapeAttr(config.description)}">
  <link rel="stylesheet" href="assets/katex.min.css">
  <link rel="stylesheet" href="assets/tokens.css">
  <link rel="stylesheet" href="assets/book.css">
  <link rel="stylesheet" href="assets/print.css" media="print">
</head>
<body class="book">
${body}
</body>
</html>
`
}

function renderCover(config: BookConfig): string {
  return `<section class="book-cover" id="cover" aria-label="Cover">
  <p class="book-cover__eyebrow">${escapeHtml(config.edition)}</p>
  <h1 class="book-cover__title">${escapeHtml(config.title)}</h1>
  <p class="book-cover__subtitle">${escapeHtml(config.subtitle)}</p>
  <div class="book-cover__rule" aria-hidden="true"></div>
  <p class="book-cover__author">${escapeHtml(config.author)}</p>
  <p class="book-cover__edition">${escapeHtml(config.publisher)}</p>
</section>`
}

function renderTitlePage(
  config: BookConfig,
  chapter: Chapter | undefined,
  rendered: Map<string, RenderResult>,
): string {
  const content = chapter ? (rendered.get(chapter.slug)?.html ?? '') : ''

  return `<section class="book-titlepage" id="ch-title">
  <h1>${escapeHtml(config.title)}</h1>
  <p>${escapeHtml(config.subtitle)}</p>
  <p>${escapeHtml(config.author)}</p>
  <p>${escapeHtml(config.edition)} · ${escapeHtml(config.publisher)}</p>
  ${content}
</section>`
}

function renderCopyright(
  chapter: Chapter | undefined,
  rendered: Map<string, RenderResult>,
): string {
  if (!chapter) return ''

  return `<section class="book-copyright" id="ch-copyright">
  ${rendered.get(chapter.slug)?.html ?? ''}
</section>`
}

function renderToc(parts: Part[]): string {
  const entries = parts
    .map((part) => {
      const items = part.chapters.filter(isTocEntry)
      if (items.length === 0) return ''

      const partHeading =
        part.order > 0
          ? `<li class="toc-part">${escapeHtml(part.title)}</li>`
          : ''

      const list = items
        .map((chapter) => {
          const number =
            chapter.kind === 'chapter' && chapter.number ? `${chapter.number}.` : ''
          return `<li class="toc-entry">
  <a href="#ch-${escapeAttr(chapter.slug)}">
    <span class="toc-number">${escapeHtml(number)}</span>
    <span class="toc-title">${escapeHtml(chapter.title)}</span>
    <span class="toc-leader" aria-hidden="true"></span>
    <span class="toc-page" data-target="#ch-${escapeAttr(chapter.slug)}"></span>
  </a>
</li>`
        })
        .join('\n')

      return `${partHeading}\n${list}`
    })
    .filter(Boolean)
    .join('\n')

  return `<nav class="book-toc" id="toc" aria-label="Table of contents">
  <h1>Contents</h1>
  <ol class="toc-list">
${entries}
  </ol>
</nav>`
}

function renderParts(parts: Part[], rendered: Map<string, RenderResult>): string[] {
  const output: string[] = []

  for (const part of parts) {
    const chapters = part.chapters.filter(
      (chapter) => chapter.kind !== 'title' && chapter.kind !== 'copyright',
    )

    if (chapters.length === 0) continue

    if (part.order > 0) {
      output.push(`<section class="book-part" id="part-${part.order}">
  <p class="book-part__eyebrow">Part ${roman(part.order)}</p>
  <h1>${escapeHtml(part.title)}</h1>
</section>`)
    }

    for (const chapter of chapters) {
      output.push(renderChapterSection(chapter, rendered.get(chapter.slug)))
    }
  }

  return output
}

function renderChapterSection(chapter: Chapter, result: RenderResult | undefined): string {
  const label = chapterLabel(chapter)
  const html = result?.html ?? ''

  return `<section class="book-chapter" id="ch-${escapeAttr(chapter.slug)}" data-chapter="${escapeAttr(chapter.slug)}">
  ${label ? `<p class="chapter-label">${escapeHtml(label)}</p>` : ''}
  <h1 class="chapter-title">${escapeHtml(chapter.title)}</h1>
  ${chapter.summary ? `<p class="chapter-summary">${escapeHtml(chapter.summary)}</p>` : ''}
${html}
</section>`
}

function roman(value: number): string {
  const numerals: Array<[number, string]> = [
    [1000, 'M'],
    [900, 'CM'],
    [500, 'D'],
    [400, 'CD'],
    [100, 'C'],
    [90, 'XC'],
    [50, 'L'],
    [40, 'XL'],
    [10, 'X'],
    [9, 'IX'],
    [5, 'V'],
    [4, 'IV'],
    [1, 'I'],
  ]

  let remaining = value
  let output = ''

  for (const [amount, numeral] of numerals) {
    while (remaining >= amount) {
      output += numeral
      remaining -= amount
    }
  }

  return output
}
