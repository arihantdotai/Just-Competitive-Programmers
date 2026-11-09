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

  // A two-column chapter can opt a block out of the columns. This is useful
  // for wide diagrams, large tables, and code that would be cramped in a
  // single column. `single-column` is an alias for the same behavior.
  for (const name of ['wide', 'single-column']) {
    md.use(container, name, {
      render(tokens: Token[], index: number) {
        return tokens[index].nesting === 1
          ? '<div class="book-wide">\n'
          : '</div>\n'
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

  return { html, figures: extracted.figures }
}
