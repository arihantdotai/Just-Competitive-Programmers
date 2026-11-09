import Shiki from '@shikijs/markdown-it'
import MarkdownIt from 'markdown-it'
import anchor from 'markdown-it-anchor'
import attrs from 'markdown-it-attrs'
import container from 'markdown-it-container'
import deflist from 'markdown-it-deflist'
import footnote from 'markdown-it-footnote'
import type Token from 'markdown-it/lib/token.mjs'
import type { BookConfig } from '../../book.config'
import { calloutsPlugin } from './callouts'
import { mathPlugin } from './math'
import { extractTikz, inlineTikz } from './tikz'
import type { Chapter, RenderOptions, RenderResult } from './types'
import { escapeAttr, escapeHtml, isExternalUrl, slugify } from './util'

interface RenderEnv {
  chapter: Chapter
  target: RenderOptions['target']
  resolveImage: (src: string) => string
  figureOnly?: boolean
}

let shikiPlugin: Promise<(md: MarkdownIt) => void> | undefined

function getShiki(): Promise<(md: MarkdownIt) => void> {
  shikiPlugin ??= Shiki({ theme: 'vitesse-light' }) as unknown as Promise<
    (md: MarkdownIt) => void
  >
  return shikiPlugin
}

export async function renderChapter(
  chapter: Chapter,
  config: BookConfig,
  options: RenderOptions,
): Promise<RenderResult> {
  const extracted = await extractTikz(chapter.content, chapter, config)

  const md = new MarkdownIt({
    html: true,
    linkify: true,
    typographer: true,
  })

  md.use(mathPlugin, {
    output: options.mathOutput,
    macros: config.math.macros,
    idPrefix: chapter.slug,
  })

  md.use(anchor, {
    level: [2, 3, 4],
    slugify: (value: string) => `${chapter.slug}-${slugify(value)}`,
  })

  md.use(footnote)
  md.use(deflist)
  md.use(attrs as unknown as (md: MarkdownIt) => void)
  md.use(calloutsPlugin)
  md.use(await getShiki())

  // Number top-level sections per chapter. Subsection headings stay
  // unnumbered. The number is inserted as inline HTML so it survives the
  // HTML, PDF, and EPUB targets without relying on CSS counters.
  md.core.ruler.after('anchor', 'book_section_numbers', (state) => {
    let section = 0

    for (let index = 0; index < state.tokens.length; index += 1) {
      const token = state.tokens[index]
      if (token.type !== 'heading_open' || token.tag !== 'h2') continue

      section += 1
      const inline = state.tokens[index + 1]
      if (inline?.type !== 'inline') continue

      inline.children ??= []
      inline.children.unshift({
        type: 'html_inline',
        content: `<span class="section-number">${section}.</span> `,
      } as Token)
    }

    return true
  })

  // Paged.js needs the note body at the call site so it can float it to the
  // bottom of the page. markdown-it-footnote keeps definitions in a block at
  // the end of the chapter, so copy each definition onto its reference before
  // rendering. The end-of-chapter list is kept for screen readers and EPUB.
  md.core.ruler.after('footnote_tail', 'book_page_footnotes', (state) => {
    const definitions = new Map<number, Token[]>()

    for (let index = 0; index < state.tokens.length; index += 1) {
      const token = state.tokens[index]
      if (token.type !== 'footnote_open') continue

      const id = Number(token.meta.id)
      let end = index + 1
      while (end < state.tokens.length && state.tokens[end].type !== 'footnote_close') {
        end += 1
      }
      definitions.set(id, state.tokens.slice(index + 1, end))
    }

    const references: Token[] = []
    for (const token of state.tokens) {
      if (token.type === 'footnote_ref') references.push(token)
      if (token.type !== 'inline') continue
      for (const child of token.children ?? []) {
        if (child.type === 'footnote_ref') references.push(child)
      }
    }

    for (const token of references) {
      const definition = definitions.get(Number(token.meta.id))
      if (!definition) continue
      token.meta.pageFootnote = renderFootnoteInline(definition, md, state.env)
    }

    return true
  })

  md.renderer.rules.footnote_caption = (tokens, index) => {
    let number = String(Number(tokens[index].meta.id) + 1)
    if (tokens[index].meta.subId > 0) number += `:${tokens[index].meta.subId}`
    return number
  }

  md.renderer.rules.footnote_ref = (tokens, index, renderOptions, env, self) => {
    const token = tokens[index]
    const id = self.rules.footnote_anchor_name!(tokens, index, renderOptions, env, self)
    const caption = self.rules.footnote_caption!(tokens, index, renderOptions, env, self)
    const subId = token.meta.subId > 0 ? `:${token.meta.subId}` : ''
    const refid = `${id}${subId}`
    const isEpub = (env as RenderEnv).target === 'epub'
    const noteref = isEpub ? ' epub:type="noteref"' : ' role="doc-noteref"'
    const call =
      `<sup class="footnote-ref"><a href="#fn${id}" id="fnref${refid}"${noteref}>` +
      `${caption}</a></sup>`
    const page = token.meta.pageFootnote as string | undefined

    if (!page) return call

    return (
      `${call}<span class="page-footnote" role="doc-footnote">` +
      `<span class="page-footnote__marker" aria-hidden="true">${caption}.</span> ` +
      `${page}</span>`
    )
  }

  md.renderer.rules.footnote_block_open = (_tokens, _index, _options, env) => {
    const isEpub = (env as RenderEnv).target === 'epub'
    const attrs = isEpub
      ? ' epub:type="endnotes" xmlns:epub="http://www.idpf.org/2007/ops"'
      : ' role="doc-endnotes"'

    return (
      '<hr class="footnotes-sep">\n' +
      `<aside class="footnotes"${attrs}>\n` +
      '<h2 class="footnotes__title">Notes</h2>\n' +
      '<ol class="footnotes-list">\n'
    )
  }

  md.renderer.rules.footnote_open = (tokens, index, renderOptions, env, self) => {
    let id = self.rules.footnote_anchor_name!(tokens, index, renderOptions, env, self)
    if (tokens[index].meta.subId > 0) id += `:${tokens[index].meta.subId}`
    const isEpub = (env as RenderEnv).target === 'epub'
    const attrs = isEpub ? ' epub:type="endnote"' : ' role="doc-endnote"'
    return `<li id="fn${id}" class="footnote-item"${attrs}>`
  }

  md.renderer.rules.footnote_block_close = () => '</ol>\n</aside>\n'

  // A two-column chapter can opt a block out of the columns. This is useful
  // for wide diagrams, large tables, and code that would be cramped in a
  // single column. `single-column` is an alias for the same behavior. The
  // `page` modifier additionally forces a page break around the block.
  for (const name of ['wide', 'single-column']) {
    md.use(container, name, {
      render(tokens: Token[], index: number) {
        if (tokens[index].nesting === -1) return '</div>\n'

        const info = tokens[index].info.trim()
        const page = name === 'wide' && /\bpage\b/.test(info)
        return `<div class="book-wide${page ? ' book-wide--page' : ''}">\n`
      },
    })
  }

  md.renderer.rules.image = (tokens, index, _options, env) => {
    const token = tokens[index]
    const src = token.attrGet('src') ?? ''
    const alt = token.content ?? ''
    const title = token.attrGet('title') ?? ''
    const caption = title || alt
    const resolved = (env as RenderEnv).resolveImage(src)
    const image = `<img src="${escapeAttr(resolved)}" alt="${escapeAttr(alt)}">`

    if (!(env as RenderEnv).figureOnly) return image

    return (
      `<figure class="book-figure book-figure--image">\n` +
      `<div class="book-figure__body">${image}</div>\n` +
      `${caption ? `<figcaption>${escapeHtml(caption)}</figcaption>\n` : ''}` +
      `</figure>`
    )
  }

  // A figure is a block element, so drop the paragraph wrapper when a
  // paragraph contains nothing but a single image.
  const defaultParagraphOpen =
    md.renderer.rules.paragraph_open ??
    ((tokens, index, renderOptions, env, self) => self.renderToken(tokens, index, renderOptions))
  const defaultParagraphClose =
    md.renderer.rules.paragraph_close ??
    ((tokens, index, renderOptions, env, self) => self.renderToken(tokens, index, renderOptions))

  md.renderer.rules.paragraph_open = (tokens, index, renderOptions, env, self) => {
    const inline = tokens[index + 1]
    const children = inline?.children?.filter(
      (child) => child.type !== 'text' || child.content.trim() !== '',
    )

    if (
      inline?.type === 'inline' &&
      children?.length === 1 &&
      children[0].type === 'image'
    ) {
      ;(env as RenderEnv).figureOnly = true
      return ''
    }

    return defaultParagraphOpen(tokens, index, renderOptions, env, self)
  }

  md.renderer.rules.paragraph_close = (tokens, index, renderOptions, env, self) => {
    if ((env as RenderEnv).figureOnly) {
      delete (env as RenderEnv).figureOnly
      return ''
    }

    return defaultParagraphClose(tokens, index, renderOptions, env, self)
  }

  const defaultTableOpen =
    md.renderer.rules.table_open ??
    ((tokens, index, renderOptions, env, self) => self.renderToken(tokens, index, renderOptions))
  const defaultTableClose =
    md.renderer.rules.table_close ??
    ((tokens, index, renderOptions, env, self) => self.renderToken(tokens, index, renderOptions))

  md.renderer.rules.table_open = (tokens, index, renderOptions, env, self) =>
    `<div class="table-wrap">\n${defaultTableOpen(tokens, index, renderOptions, env, self)}`

  md.renderer.rules.table_close = (tokens, index, renderOptions, env, self) =>
    `${defaultTableClose(tokens, index, renderOptions, env, self)}\n</div>`

  const defaultLinkOpen =
    md.renderer.rules.link_open ??
    ((tokens, index, renderOptions, env, self) => self.renderToken(tokens, index, renderOptions))

  md.renderer.rules.link_open = (tokens, index, renderOptions, env, self) => {
    const token = tokens[index]
    const href = token.attrGet('href') ?? ''
    const renderEnv = env as RenderEnv

    if (href.startsWith('chapter:')) {
      const [slug, anchorName] = href.slice('chapter:'.length).split('#')
      const target =
        renderEnv.target === 'epub'
          ? `${slug}.xhtml${anchorName ? `#${slug}-${anchorName}` : ''}`
          : `${anchorName ? `#${slug}-${anchorName}` : `#ch-${slug}`}`
      token.attrSet('href', target)
    } else if (href.startsWith('#') && href.length > 1) {
      const anchorName = href.slice(1)
      if (!anchorName.startsWith(`${chapter.slug}-`)) {
        token.attrSet('href', `#${chapter.slug}-${anchorName}`)
      }
    } else if (isExternalUrl(href)) {
      token.attrSet('target', '_blank')
      token.attrSet('rel', 'noopener noreferrer')
    }

    return defaultLinkOpen(tokens, index, renderOptions, env, self)
  }

  const env: RenderEnv = {
    chapter,
    target: options.target,
    resolveImage: options.resolveImage,
  }

  const rendered = md.render(extracted.markdown, env)
  const html = options.target === 'epub' ? rendered : inlineTikz(rendered, extracted.figures)

  return { html: numberFigures(html, chapter), figures: extracted.figures }
}

function renderFootnoteInline(tokens: Token[], md: MarkdownIt, env: unknown): string {
  const parts: string[] = []

  for (const token of tokens) {
    if (token.type === 'inline') {
      parts.push(md.renderer.renderInline(token.children ?? [], md.options, env))
    } else if (token.type === 'text') {
      parts.push(escapeHtml(token.content))
    }
  }

  return parts.join(' ')
}

function figureChapterNumber(chapter: Chapter): string {
  const number = chapter.number ?? chapter.order
  if (chapter.kind === 'appendix') {
    return String.fromCharCode(64 + Math.max(1, number))
  }
  return String(number)
}

/**
 * Add chapter-based numbers to every figure. Numbering happens after Markdown
 * rendering so image figures and TikZ figures share one sequence.
 */
function numberFigures(html: string, chapter: Chapter): string {
  const chapterNumber = figureChapterNumber(chapter)
  let figure = 0

  return html.replace(
    /<figure class="book-figure([^"]*)"([^>]*)>([\s\S]*?)<\/figure>/g,
    (_match, classes: string, attrs: string, inner: string) => {
      figure += 1
      const label = `<span class="figure-number">Figure ${chapterNumber}.${figure}.</span>`
      const caption = inner.match(/<figcaption>([\s\S]*?)<\/figcaption>/)
      const body = caption
        ? inner.replace(caption[0], `<figcaption>${label} ${caption[1]}</figcaption>`)
        : `${inner}\n<figcaption>${label}</figcaption>`

      return `<figure class="book-figure${classes}"${attrs}>${body}</figure>`
    },
  )
}
