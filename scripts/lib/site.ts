import { copyFile, mkdir, readdir, rm } from 'node:fs/promises'
import path from 'node:path'
import type { BookConfig } from '../../book.config'
import { chapterLabel, isTocEntry, renderEpigraph, tocEntries } from './chapters'
import type { Chapter, Part, RenderResult } from './types'
import { escapeAttr, escapeHtml } from './util'

export interface SiteRenderOptions {
  renderChapter: (chapter: Chapter) => Promise<RenderResult>
}

interface Heading {
  level: 2 | 3
  id: string
  pin?: string
  text: string
}

interface ShellOptions {
  config: BookConfig
  title: string
  description: string
  /** `''` at the site root, `'../'` on a chapter page. */
  base: string
  sidebar: string
  crumb: string
  content: string
}

const HEADING_PATTERN = /<h([23])([^>]*)>([\s\S]*?)<\/h\1>/g

const THEME_BOOTSTRAP = `(function(){try{var k="book-theme";var s=localStorage.getItem(k);var t=s==="dark"||s==="light"?s:(window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");document.documentElement.setAttribute("data-theme",t)}catch(e){}})();`

/**
 * Build the reading website: one page per chapter under `dist/site/<slug>/`,
 * plus a cover and table of contents at `dist/site/index.html`. The site is
 * plain HTML with one column of text; JavaScript only adds dark mode, hover
 * pins, pinpoint navigation, and artifact hydration.
 */
export async function buildSite(
  chapters: Chapter[],
  parts: Part[],
  config: BookConfig,
  options: SiteRenderOptions,
): Promise<string> {
  const siteDir = path.join(config.distDir, 'site')
  await rm(siteDir, { recursive: true, force: true })
  await mkdir(siteDir, { recursive: true })

  await copyDirectory(path.join(config.distDir, 'assets'), path.join(siteDir, 'assets'))
  await copyDirectory(path.resolve('site'), path.join(siteDir, 'assets', 'site'))
  await copyFile(
    path.join(config.designDir, 'css', 'site.css'),
    path.join(siteDir, 'assets', 'site.css'),
  )

  const entries = tocEntries(parts)
  const rendered = new Map<string, RenderResult>()

  for (const chapter of entries) {
    rendered.set(chapter.slug, await options.renderChapter(chapter))
  }

  await Bun.write(
    path.join(siteDir, 'index.html'),
    renderIndex(config, parts, entries),
  )

  for (const [index, chapter] of entries.entries()) {
    const html = rendered.get(chapter.slug)?.html ?? ''
    const headings = extractHeadings(html)
    const directory = path.join(siteDir, chapter.slug)
    await mkdir(directory, { recursive: true })
    await Bun.write(
      path.join(directory, 'index.html'),
      renderChapterPage(config, parts, entries, chapter, index, headings, html),
    )
  }

  return siteDir
}

function renderIndex(config: BookConfig, parts: Part[], entries: Chapter[]): string {
  const first = entries[0]
  const sidebar = renderSidebar(config, parts, undefined, [], '')

  const toc = parts
    .map((part) => renderTocPart(part))
    .filter(Boolean)
    .join('\n')

  const content = `<article class="site-cover">
  <p class="site-cover__eyebrow">${escapeHtml(config.edition)}</p>
  <h1 class="site-cover__title">${escapeHtml(config.title)}</h1>
  <p class="site-cover__subtitle">${escapeHtml(config.subtitle)}</p>
  <p class="site-cover__author">${escapeHtml(config.author)}</p>
  <p class="site-cover__meta">${escapeHtml(config.publisher)}</p>
  ${first ? `<p class="site-cover__actions"><a class="site-button" href="${escapeAttr(first.slug)}/">Start reading</a></p>` : ''}
</article>
<section class="site-toc" aria-labelledby="site-toc-title">
  <h2 class="site-toc__title" id="site-toc-title">Contents</h2>
${toc}
</section>`

  return renderShell({
    config,
    title: config.title,
    description: config.description,
    base: '',
    sidebar,
    crumb: '<span aria-current="page">Contents</span>',
    content,
  })
}

function renderTocPart(part: Part): string {
  const entries = part.chapters.filter(isTocEntry)
  if (entries.length === 0) return ''

  const items = entries
    .map((chapter) => {
      const number = chapter.kind === 'chapter' && chapter.number ? String(chapter.number) : ''
      return `<li class="site-toc__entry">
  <a href="${escapeAttr(chapter.slug)}/">
    <span class="site-toc__num" aria-hidden="true">${escapeHtml(number)}</span>
    <span class="site-toc__text">
      <span class="site-toc__name">${escapeHtml(chapter.title)}</span>
      ${chapter.summary ? `<span class="site-toc__summary">${escapeHtml(chapter.summary)}</span>` : ''}
    </span>
  </a>
</li>`
    })
    .join('\n')

  return `<div class="site-toc__part">
  <p class="site-toc__part-title">${escapeHtml(part.title)}</p>
  <ol class="site-toc__list">
${items}
  </ol>
</div>`
}

function renderChapterPage(
  config: BookConfig,
  parts: Part[],
  entries: Chapter[],
  chapter: Chapter,
  index: number,
  headings: Heading[],
  html: string,
): string {
  const sidebar = renderSidebar(config, parts, chapter, headings, '../')
  const label = chapterLabel(chapter)
  const previous = entries[index - 1]
  const next = entries[index + 1]
  const epigraph = renderEpigraph(chapter)
  const crumb = `<a href="../">Contents</a> <span class="site-crumb__sep" aria-hidden="true">/</span> ${
    label
      ? `<span class="site-crumb__label">${escapeHtml(label)}</span> <span class="site-crumb__sep" aria-hidden="true">/</span> `
      : ''
  }<span aria-current="page">${escapeHtml(chapter.runningTitle)}</span>`

  const content = `<article class="book-chapter book-chapter--site" id="${chapterPin(chapter)}" data-pin="${chapterPin(chapter)}" data-chapter="${escapeAttr(chapter.slug)}" data-running-title="${escapeAttr(chapter.runningTitle)}">
  <header class="book-chapter__header">
    ${label ? `<p class="chapter-label">${escapeHtml(label)}</p>` : ''}
    <h1 class="chapter-title">${escapeHtml(chapter.title)}</h1>
    ${chapter.summary ? `<p class="chapter-summary">${escapeHtml(chapter.summary)}</p>` : ''}
    ${epigraph ? `<blockquote class="chapter-epigraph">${epigraph}</blockquote>` : ''}
  </header>
  <div class="book-chapter__body">
${html}
  </div>
</article>
${renderPager(previous, next)}`

  return renderShell({
    config,
    title: `${chapter.title} · ${config.title}`,
    description: chapter.summary || config.description,
    base: '../',
    sidebar,
    crumb,
    content,
  })
}

function renderPager(previous: Chapter | undefined, next: Chapter | undefined): string {
  if (!previous && !next) return ''

  const link = (chapter: Chapter | undefined, direction: 'prev' | 'next'): string => {
    if (!chapter) return '<span class="chapter-pager__slot"></span>'

    return `<a class="chapter-pager__link chapter-pager__link--${direction}" href="../${escapeAttr(chapter.slug)}/" rel="${direction}">
  <span class="chapter-pager__direction">${direction === 'prev' ? 'Previous' : 'Next'}</span>
  <span class="chapter-pager__title">${escapeHtml(chapter.title)}</span>
</a>`
  }

  return `<nav class="chapter-pager" aria-label="Chapter navigation">
${link(previous, 'prev')}
${link(next, 'next')}
</nav>`
}

function renderSidebar(
  config: BookConfig,
  parts: Part[],
  current: Chapter | undefined,
  headings: Heading[],
  base: string,
): string {
  const tree = parts
    .map((part) => {
      const entries = part.chapters.filter(isTocEntry)
      if (entries.length === 0) return ''

      const items = entries
        .map((chapter) => {
          const isCurrent = chapter.slug === current?.slug
          const number =
            chapter.kind === 'chapter' && chapter.number ? String(chapter.number) : ''
          const subsections = isCurrent ? renderSubsections(headings) : ''

          return `<li class="site-nav__item${isCurrent ? ' is-current' : ''}">
  <a class="site-nav__link" href="${escapeAttr(base)}${escapeAttr(chapter.slug)}/"${
    isCurrent ? ' aria-current="page"' : ''
  }>
    <span class="site-nav__num" aria-hidden="true">${escapeHtml(number)}</span>
    <span class="site-nav__text">${escapeHtml(chapter.title)}</span>
  </a>
  ${subsections}
</li>`
        })
        .join('\n')

      return `<div class="site-nav__group">
  <p class="site-nav__part">${escapeHtml(part.title)}</p>
  <ul class="site-nav__list">
${items}
  </ul>
</div>`
    })
    .filter(Boolean)
    .join('\n')

  return `<aside class="site-sidebar" id="site-sidebar" aria-label="Book contents" data-sidebar>
  <div class="site-sidebar__head">
    <a class="site-sidebar__home" href="${escapeAttr(base || './')}">
      <span class="site-sidebar__title">${escapeHtml(config.title)}</span>
      <span class="site-sidebar__subtitle">${escapeHtml(config.subtitle)}</span>
    </a>
  </div>
  <nav class="site-nav" aria-label="Chapters">
${tree}
  </nav>
  <div class="site-sidebar__foot">
    ${themeToggle()}
    <p class="site-sidebar__meta">${escapeHtml(config.author)} · ${escapeHtml(config.edition)}</p>
  </div>
</aside>`
}

function renderSubsections(headings: Heading[]): string {
  if (headings.length === 0) return ''

  const tree: Array<{ heading: Heading; children: Heading[] }> = []

  for (const heading of headings) {
    if (heading.level === 2 || tree.length === 0) {
      tree.push({ heading, children: [] })
    } else {
      tree[tree.length - 1].children.push(heading)
    }
  }

  const items = tree
    .map(({ heading, children }) => {
      const nested =
        children.length > 0
          ? `\n<ul class="site-nav__subs site-nav__subs--nested">\n${children
              .map(
                (child) =>
                  `<li><a class="site-nav__sub" href="#${escapeAttr(child.id)}" data-spy="${escapeAttr(child.id)}">${escapeHtml(child.text)}</a></li>`,
              )
              .join('\n')}\n</ul>\n`
          : ''

      return `<li>
  <a class="site-nav__sub" href="#${escapeAttr(heading.id)}" data-spy="${escapeAttr(heading.id)}">${escapeHtml(heading.text)}</a>${nested}
</li>`
    })
    .join('\n')

  return `<ul class="site-nav__subs">
${items}
</ul>`
}

function renderShell(options: ShellOptions): string {
  const { config, title, description, base, sidebar, crumb, content } = options

  return `<!doctype html>
<html lang="${escapeAttr(config.language)}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeAttr(description)}">
  <meta name="author" content="${escapeAttr(config.author)}">
  <meta name="book-base-url" content="${escapeAttr(config.site.baseUrl)}">
  <meta name="color-scheme" content="light dark">
  <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='2' fill='%23161616'/%3E%3Cpath d='M9 7h14v18l-7-3.6L9 25z' fill='%23ffffff'/%3E%3C/svg%3E">
  <link rel="stylesheet" href="${base}assets/katex.min.css">
  <link rel="stylesheet" href="${base}assets/tokens.css">
  <link rel="stylesheet" href="${base}assets/book.css">
  <link rel="stylesheet" href="${base}assets/site.css">
  <script>${THEME_BOOTSTRAP}</script>
</head>
<body class="site">
<a class="site-skip" href="#main">Skip to content</a>
<div class="site-shell">
${sidebar}
  <div class="site-main">
    <header class="site-topbar">
      <button class="site-menu" type="button" data-sidebar-toggle aria-controls="site-sidebar" aria-expanded="false">
        <span class="site-menu__bars" aria-hidden="true"></span>
        <span class="site-menu__text">Contents</span>
      </button>
      <nav class="site-crumb" aria-label="Breadcrumb">${crumb}</nav>
      ${themeToggle('site-topbar__theme')}
    </header>
    <main class="site-content" id="main" tabindex="-1">
${content}
    </main>
  </div>
</div>
<div class="site-scrim" data-sidebar-close hidden></div>
<script type="module" src="${base}assets/site/runtime.js"></script>
</body>
</html>
`
}

function themeToggle(extraClass = ''): string {
  return `<button class="theme-toggle${extraClass ? ` ${extraClass}` : ''}" type="button" data-theme-toggle aria-pressed="false">
  <span class="theme-toggle__icon" aria-hidden="true"></span>
  <span class="theme-toggle__label">Dark mode</span>
</button>`
}

function extractHeadings(html: string): Heading[] {
  const headings: Heading[] = []

  for (const match of html.matchAll(HEADING_PATTERN)) {
    const attributes = match[2]
    const id = attributes.match(/\sid="([^"]*)"/)?.[1]
    if (!id) continue

    headings.push({
      level: Number(match[1]) as 2 | 3,
      id,
      pin: attributes.match(/\sdata-pin="([^"]*)"/)?.[1],
      text: headingText(match[3]),
    })
  }

  return headings
}

function headingText(inner: string): string {
  return decodeEntities(
    inner
      .replace(/<span class="section-number">[\s\S]*?<\/span>/g, '')
      .replace(/<[^>]+>/g, ''),
  )
    .replace(/\s+/g, ' ')
    .trim()
}

function decodeEntities(value: string): string {
  return value
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&nbsp;', ' ')
    .replaceAll('&amp;', '&')
}

function chapterPin(chapter: Chapter): string {
  const number = chapter.number ?? chapter.order
  const value = chapter.kind === 'appendix'
    ? String.fromCharCode(64 + Math.max(1, number))
    : String(number)

  return `ch-${/^\d+$/.test(value) ? value.padStart(2, '0') : value}`
}

async function copyDirectory(source: string, destination: string): Promise<void> {
  await mkdir(destination, { recursive: true })

  for (const entry of await readdir(source, { withFileTypes: true })) {
    const from = path.join(source, entry.name)
    const to = path.join(destination, entry.name)

    if (entry.isDirectory()) {
      await copyDirectory(from, to)
    } else {
      await copyFile(from, to)
    }
  }
}
