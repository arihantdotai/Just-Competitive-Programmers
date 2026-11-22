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
import type { Chapter, RenderOptions, RenderResult, RenderTarget } from './types'
import { escapeAttr, escapeHtml, isExternalUrl, slugify } from './util'

interface RenderEnv {
  chapter: Chapter
  target: RenderTarget
  resolveImage: (src: string) => string
  artifacts: boolean
  chapterHref?: (slug: string, anchor?: string) => string
  pinHref?: (pin: string) => string
  figureOnly?: boolean
}

const ADD_MARK = /^%%\s*add:\s?(.*)$/
const ADD_BEGIN = /^%%\s*add\s+begin\b/
const ADD_END = /^%%\s*add\s+end\b/
const ARTIFACT_MARK = /^%%\s*artifact:\s*([\w.-]+)\s*\|\s*(.*)$/
const LINK_MARK = /^%%\s*link:\s*(.+?)\s*->\s*(.+?)\s*$/
const TODO_MARK = /^%%\s*todo:\s?(.*)$/
const ASK_MARK = /^%%\s*ask:\s?(.*)$/
const FENCE_MARK = /^\s*(```|~~~)/

let shikiPlugin: Promise<(md: MarkdownIt) => void> | undefined

function getShiki(): Promise<(md: MarkdownIt) => void> {
  shikiPlugin ??= Shiki({
    themes: { light: 'vitesse-light', dark: 'vitesse-dark' },
    defaultColor: 'light',
  }) as unknown as Promise<(md: MarkdownIt) => void>
  return shikiPlugin
}

export async function renderChapter(
  chapter: Chapter,
  config: BookConfig,
  options: RenderOptions,
): Promise<RenderResult> {
  const extracted = await extractTikz(chapter.content, chapter, config)
  const pinPrefix = chapterPinPrefix(chapter)

  const md = new MarkdownIt({
    html: true,
    linkify: true,
    typographer: true,
  })

  md.use(mathPlugin, {
    output: options.mathOutput,
    macros: config.math.macros,
    idPrefix: pinPrefix,
  })

  md.use(anchor, {
    level: [2, 3, 4],
    slugify: (value: string) => `${chapter.slug}-${slugify(value)}`,
  })

  md.use(footnote)
  md.use(deflist)
  md.use(attrs as unknown as (md: MarkdownIt) => void)
  md.use(calloutsPlugin, { pinPrefix })
  md.use(await getShiki())

  // Author marks (`%% …`) are commands, not content. Apply the ones this
  // renderer can satisfy — `add`, `artifact`, `link`, `todo`, `ask` — and
  // remove the rest before the block parser runs, so no target ever shows a
  // raw mark.
  md.core.ruler.before('normalize', 'book_author_marks', (state) => {
    state.src = applyAuthorMarks(state.src, state.env as RenderEnv)
    return true
  })

  // Number top-level sections per chapter and give every heading a pinpoint
  // id. The number is inserted as inline HTML so it survives the HTML, PDF,
  // and EPUB targets without relying on CSS counters.
  md.core.ruler.after('anchor', 'book_section_numbers', (state) => {
    const prefix = chapterPinPrefix((state.env as RenderEnv).chapter)
    let section = 0
    let subsection = 0
    let subsubsection = 0

    for (let index = 0; index < state.tokens.length; index += 1) {
      const token = state.tokens[index]
      if (token.type !== 'heading_open') continue

      if (token.tag === 'h2') {
        section += 1
        subsection = 0
        subsubsection = 0
        token.attrSet('data-pin', `${prefix}-sec-${section}`)

        const inline = state.tokens[index + 1]
        if (inline?.type !== 'inline') continue

        inline.children ??= []
        inline.children.unshift({
          type: 'html_inline',
          content: `<span class="section-number">${section}.</span> `,
        } as Token)
        continue
      }

      if (token.tag === 'h3') {
        subsection += 1
        subsubsection = 0
        token.attrSet('data-pin', `${prefix}-sec-${section}-${subsection}`)
        continue
      }

      if (token.tag === 'h4') {
        subsubsection += 1
        token.attrSet('data-pin', `${prefix}-sec-${section}-${subsection}-${subsubsection}`)
      }
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

  // `wide` and `single-column` remain accepted for compatibility. In the
  // single-column book they have no layout effect beyond the page modifier.
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
      token.attrSet('href', chapterHref(slug, anchorName, renderEnv))
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
    artifacts: options.artifacts ?? false,
    chapterHref: options.chapterHref,
    pinHref: options.pinHref,
  }

  const rendered = md.render(extracted.markdown, env)
  const html = options.target === 'epub' ? rendered : inlineTikz(rendered, extracted.figures)

  return { html: numberFigures(html, chapter), figures: extracted.figures }
}

/**
 * Apply the author's marks (`%% …`) to the Markdown source.
 *
 * Satisfied here: `add` (verbatim insertion), `artifact` (a hydratable figure
 * on the website), `link` (a generated cross-reference line), `todo` and
 * `ask` (visible markers). `scribe` and `qr` are consumed by the LaTeX
 * conversion agent, and anything unknown is surfaced rather than dropped.
 */
function applyAuthorMarks(source: string, env: RenderEnv): string {
  const lines = source.split('\n')
  const output: string[] = []
  let pendingAdd: string[] = []
  let fence: string | null = null

  const flushAdd = (): void => {
    if (pendingAdd.length === 0) return

    const text = pendingAdd.join(' ').replace(/\s+/g, ' ').trim()
    pendingAdd = []
    if (text) output.push(text, '')
  }

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    const fenceMatch = line.match(FENCE_MARK)

    if (fenceMatch) {
      fence = fence === null ? fenceMatch[1] : fence === fenceMatch[1] ? null : fence
      flushAdd()
      output.push(line)
      continue
    }

    if (fence !== null) {
      output.push(line)
      continue
    }

    const add = line.match(ADD_MARK)
    if (add) {
      pendingAdd.push(add[1].trim())
      continue
    }
    flushAdd()

    if (ADD_BEGIN.test(line)) {
      const block: string[] = []
      let end = index + 1
      while (end < lines.length && !ADD_END.test(lines[end])) {
        block.push(lines[end])
        end += 1
      }

      const text = block.join('\n').replace(/^\n+|\n+$/g, '')
      if (text.trim()) output.push(text, '')
      index = end
      continue
    }

    const artifact = line.match(ARTIFACT_MARK)
    if (artifact) {
      const id = artifact[1]
      const caption = artifact[2].trim()
      const description: string[] = []
      let end = index + 1

      while (end < lines.length) {
        const next = lines[end]
        if (next.trim() === '') {
          const after = lines[end + 1]
          if (after !== undefined && /^(\t| {4,})/.test(after)) {
            description.push('')
            end += 1
            continue
          }
          break
        }
        if (!/^(\t| {4,})/.test(next)) break
        description.push(next.trim())
        end += 1
      }

      if (env.artifacts) {
        output.push(renderArtifact(id, caption, description.join('\n'), env), '')
      }
      index = end - 1
      continue
    }

    const link = line.match(LINK_MARK)
    if (link) {
      output.push(renderLinkMark(link[1].trim(), link[2].trim(), env), '')
      continue
    }

    const todo = line.match(TODO_MARK)
    if (todo) {
      output.push(renderTodo('TODO', todo[1], 'book-todo'), '')
      continue
    }

    const ask = line.match(ASK_MARK)
    if (ask) {
      output.push(renderTodo('Author question', ask[1], 'book-todo book-todo--ask'), '')
      continue
    }

    // `%% scribe:` and `%% qr:` are executed by the LaTeX conversion agent
    // and the print build; they have no rendering here.
    if (/^%%\s*(scribe|qr):/.test(line)) continue

    if (/^%%/.test(line)) {
      output.push(renderUnhandledMark(line), '')
      continue
    }

    output.push(line)
  }

  flushAdd()
  return output.join('\n')
}

function renderArtifact(
  id: string,
  caption: string,
  description: string,
  env: RenderEnv,
): string {
  const pin = `${chapterPinPrefix(env.chapter)}-art-${id}`
  const fallback = description.match(/^fallback:\s*(\S+)$/m)?.[1]
  let preview = ''

  if (fallback) {
    try {
      const src = env.resolveImage(fallback)
      preview = `<img src="${escapeAttr(src)}" alt="${escapeAttr(caption)}">`
    } catch {
      preview = ''
    }
  }

  if (!preview) {
    preview = `<p class="artifact__fallback-text">Interactive artifact · requires JavaScript</p>`
  }

  return [
    `<figure class="book-figure book-figure--artifact" id="${pin}" data-pin="${pin}" data-artifact="${escapeAttr(id)}" data-caption="${escapeAttr(caption)}">`,
    `<div class="artifact" data-artifact-host="${escapeAttr(id)}">`,
    `<div class="artifact__fallback">${preview}</div>`,
    `</div>`,
    `<figcaption>${escapeHtml(caption)}</figcaption>`,
    `</figure>`,
  ].join('\n')
}

function renderLinkMark(text: string, target: string, env: RenderEnv): string {
  const markdownLink = text.match(/^\[(.+)\]\((.+)\)$/)
  const label = markdownLink ? markdownLink[1] : text
  const href = resolveMarkTarget(target, env)
  const external = isExternalUrl(href)
  const linkAttrs = external ? ' target="_blank" rel="noopener noreferrer"' : ''

  return (
    `<p class="book-seealso"><a href="${escapeAttr(href)}"${linkAttrs}>` +
    `${escapeHtml(label)}</a></p>`
  )
}

function resolveMarkTarget(target: string, env: RenderEnv): string {
  if (target.startsWith('chapter:')) {
    const [slug, anchorName] = target.slice('chapter:'.length).split('#')
    return chapterHref(slug, anchorName, env)
  }

  if (target.startsWith('pin:')) {
    return pinHref(target.slice('pin:'.length), env)
  }

  return target
}

function renderTodo(label: string, text: string, className: string): string {
  return (
    `<aside class="${className}" role="note">` +
    `<span class="book-todo__label">${escapeHtml(label)}</span> ` +
    `<span class="book-todo__text">${escapeHtml(text.trim())}</span>` +
    `</aside>`
  )
}

function renderUnhandledMark(line: string): string {
  return (
    `<aside class="book-todo book-todo--mark" role="note">` +
    `<span class="book-todo__label">Unhandled mark</span> ` +
    `<code>${escapeHtml(line.trim())}</code>` +
    `</aside>`
  )
}

function chapterHref(slug: string, anchorName: string | undefined, env: RenderEnv): string {
  if (env.chapterHref) return env.chapterHref(slug, anchorName)
  if (env.target === 'epub') {
    return `${slug}.xhtml${anchorName ? `#${slug}-${anchorName}` : ''}`
  }
  return anchorName ? `#${slug}-${anchorName}` : `#ch-${slug}`
}

function pinHref(pin: string, env: RenderEnv): string {
  return env.pinHref ? env.pinHref(pin) : `#${pin}`
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

/** Pinpoint prefix derived from the printed chapter number, e.g. `ch-01`. */
function chapterPinPrefix(chapter: Chapter): string {
  const number = figureChapterNumber(chapter)
  return `ch-${/^\d+$/.test(number) ? number.padStart(2, '0') : number}`
}

/**
 * Add chapter-based numbers to every figure and artifact. Numbering happens
 * after Markdown rendering so image figures and TikZ figures share one
 * sequence. Every numbered element is also a pinpoint target.
 */
function numberFigures(html: string, chapter: Chapter): string {
  const chapterNumber = figureChapterNumber(chapter)
  const prefix = chapterPinPrefix(chapter)
  let figure = 0
  let artifact = 0

  return html.replace(
    /<figure class="book-figure([^"]*)"([^>]*)>([\s\S]*?)<\/figure>/g,
    (_match, classes: string, attributes: string, inner: string) => {
      const isArtifact = /\bdata-artifact=/.test(attributes)
      const sequence = isArtifact ? (artifact += 1) : (figure += 1)
      const kind = isArtifact ? 'Artifact' : 'Figure'
      const pin = `${prefix}-${isArtifact ? 'art' : 'fig'}-${sequence}`
      const labelClass = isArtifact ? 'artifact-number' : 'figure-number'
      const label = `<span class="${labelClass}">${kind} ${chapterNumber}-${sequence}.</span>`
      const caption = inner.match(/<figcaption>([\s\S]*?)<\/figcaption>/)
      const body = caption
        ? inner.replace(caption[0], `<figcaption>${label} ${caption[1]}</figcaption>`)
        : `${inner}\n<figcaption>${label}</figcaption>`
      const pinAttrs = /\bid=/.test(attributes) ? '' : ` id="${pin}" data-pin="${pin}"`

      return `<figure class="book-figure${classes}"${attributes}${pinAttrs}>${body}</figure>`
    },
  )
}
